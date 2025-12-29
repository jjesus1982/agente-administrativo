import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import UPLOAD_BASE_DIR
from app.database import get_db
from app.models.classificados import (
    ClassificadoAnuncio,
    ClassificadoFavorito,
    ClassificadoImagem,
    ClassificadoRecomendacao,
)
from app.models.unit import Unit, UnitResident
from app.models.user import User
from app.schemas.classificados import (
    AnuncioCreate,
    AnuncioDetalhe,
    AnuncioListResponse,
    AnuncioResponse,
    AnuncioUpdate,
    ImagemResponse,
    MoradorResumo,
    RecomendacaoCreate,
    RecomendacaoResponse,
    VendedorPerfil,
)

router = APIRouter(prefix="/classificados", tags=["Classificados"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "classificados")
os.makedirs(UPLOAD_DIR, exist_ok=True)
CATEGORIAS_VALIDAS = [
    "moveis",
    "eletronicos",
    "eletrodomesticos",
    "roupas",
    "esportes",
    "livros",
    "brinquedos",
    "veiculos",
    "servicos",
    "outros",
]
CONDICOES_VALIDAS = ["novo", "usado", "reparo"]
STATUS_VALIDOS = ["disponivel", "pausado", "vendido", "arquivado"]

USER_ID_TEMP = 1


async def get_morador_resumo(db: AsyncSession, user_id: int) -> MoradorResumo:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None
    result = await db.execute(
        select(UnitResident).where(UnitResident.user_id == user_id, UnitResident.is_active == True)
    )
    unit_resident = result.scalar_one_or_none()
    bloco = None
    apartamento = None
    if unit_resident:
        result = await db.execute(select(Unit).where(Unit.id == unit_resident.unit_id))
        unit = result.scalar_one_or_none()
        if unit:
            bloco = unit.block
            apartamento = unit.number
    result = await db.execute(
        select(func.count(ClassificadoRecomendacao.id)).where(ClassificadoRecomendacao.avaliado_id == user_id)
    )
    recomendacoes = result.scalar() or 0
    return MoradorResumo(
        id=user.id,
        nome=user.name,
        foto_perfil=user.photo_url,
        bloco=bloco,
        apartamento=apartamento,
        verificado=user.is_verified or False,
        recomendacoes=recomendacoes,
    )


async def check_is_favorito(db: AsyncSession, anuncio_id: int, user_id: int) -> bool:
    result = await db.execute(
        select(ClassificadoFavorito).where(
            ClassificadoFavorito.anuncio_id == anuncio_id, ClassificadoFavorito.morador_id == user_id
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=AnuncioListResponse)
async def listar_anuncios(
    tenant_id: int = Query(1, description="ID do condomínio"),
    categoria: Optional[str] = None,
    condicao: Optional[str] = None,
    estatusfiltro: Optional[str] = Query("disponivel", alias="status"),
    min_preco: Optional[float] = None,
    max_preco: Optional[float] = None,
    busca: Optional[str] = None,
    ordem: Optional[str] = "recentes",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Lista anúncios com ranking inteligente - sem limite por usuário"""
    query = (
        select(ClassificadoAnuncio)
        .options(selectinload(ClassificadoAnuncio.imagens))
        .where(ClassificadoAnuncio.tenant_id == tenant_id, ClassificadoAnuncio.deleted_at.is_(None))
    )

    # Filtros
    if categoria:
        query = query.where(ClassificadoAnuncio.categoria == categoria)
    if condicao:
        query = query.where(ClassificadoAnuncio.condicao == condicao)
    if estatusfiltro:
        query = query.where(ClassificadoAnuncio.status == estatusfiltro)
    if min_preco:
        query = query.where(ClassificadoAnuncio.preco >= min_preco)
    if max_preco:
        query = query.where(ClassificadoAnuncio.preco <= max_preco)
    if busca:
        query = query.where(
            or_(ClassificadoAnuncio.titulo.ilike(f"%{busca}%"), ClassificadoAnuncio.descricao.ilike(f"%{busca}%"))
        )

    # Contagem total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Ordenação inteligente com ranking
    if ordem == "recentes":
        query = query.order_by(ClassificadoAnuncio.created_at.desc())
    elif ordem == "antigos":
        query = query.order_by(ClassificadoAnuncio.created_at.asc())
    elif ordem == "menor_preco":
        query = query.order_by(ClassificadoAnuncio.preco.asc())
    elif ordem == "maior_preco":
        query = query.order_by(ClassificadoAnuncio.preco.desc())
    elif ordem == "populares":
        query = query.order_by(ClassificadoAnuncio.visualizacoes.desc())
    elif ordem == "relevancia":
        # Ranking por relevância: visualizações + recência
        query = query.order_by(ClassificadoAnuncio.visualizacoes.desc(), ClassificadoAnuncio.created_at.desc())
    else:
        query = query.order_by(ClassificadoAnuncio.created_at.desc())

    # Paginação
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    anuncios = result.scalars().all()

    pages = (total + limit - 1) // limit if total > 0 else 1
    items = []
    for anuncio in anuncios:
        imagens = [
            ImagemResponse(id=img.id, url=img.url, ordem=img.ordem, created_at=img.created_at)
            for img in anuncio.imagens
        ]
        is_fav = await check_is_favorito(db, anuncio.id, USER_ID_TEMP)
        items.append(
            AnuncioResponse(
                id=anuncio.id,
                morador_id=anuncio.morador_id,
                titulo=anuncio.titulo,
                descricao=anuncio.descricao,
                preco=anuncio.preco,
                categoria=anuncio.categoria,
                condicao=anuncio.condicao,
                status=anuncio.status,
                visualizacoes=anuncio.visualizacoes,
                created_at=anuncio.created_at,
                updated_at=anuncio.updated_at,
                imagens=imagens,
                is_favorito=is_fav,
            )
        )

    return AnuncioListResponse(items=items, total=total, page=page, pages=pages)


@router.get("/meus/anuncios", response_model=AnuncioListResponse)
async def meus_anuncios(
    estatusfiltro: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos os anúncios do usuário com filtro por status"""
    query = (
        select(ClassificadoAnuncio)
        .options(selectinload(ClassificadoAnuncio.imagens))
        .where(ClassificadoAnuncio.morador_id == USER_ID_TEMP, ClassificadoAnuncio.deleted_at.is_(None))
    )

    if estatusfiltro:
        query = query.where(ClassificadoAnuncio.status == estatusfiltro)

    # Contagem
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(ClassificadoAnuncio.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    anuncios = result.scalars().all()

    pages = (total + limit - 1) // limit if total > 0 else 1
    items = []
    for anuncio in anuncios:
        imagens = [
            ImagemResponse(id=img.id, url=img.url, ordem=img.ordem, created_at=img.created_at)
            for img in anuncio.imagens
        ]
        items.append(
            AnuncioResponse(
                id=anuncio.id,
                morador_id=anuncio.morador_id,
                titulo=anuncio.titulo,
                descricao=anuncio.descricao,
                preco=anuncio.preco,
                categoria=anuncio.categoria,
                condicao=anuncio.condicao,
                status=anuncio.status,
                visualizacoes=anuncio.visualizacoes,
                created_at=anuncio.created_at,
                updated_at=anuncio.updated_at,
                imagens=imagens,
                is_favorito=False,
            )
        )

    return AnuncioListResponse(items=items, total=total, page=page, pages=pages)


@router.get("/meus/estatisticas")
async def minhas_estatisticas(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Estatísticas dos anúncios do usuário"""
    base = select(ClassificadoAnuncio).where(
        ClassificadoAnuncio.morador_id == USER_ID_TEMP, ClassificadoAnuncio.deleted_at.is_(None)
    )

    # Contagem por status
    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0

    ativos_result = await db.execute(
        select(func.count()).where(
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.status == "disponivel",
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    ativos = ativos_result.scalar() or 0

    pausados_result = await db.execute(
        select(func.count()).where(
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.status == "pausado",
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    pausados = pausados_result.scalar() or 0

    vendidos_result = await db.execute(
        select(func.count()).where(
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.status == "vendido",
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    vendidos = vendidos_result.scalar() or 0

    # Total de visualizações
    views_result = await db.execute(
        select(func.sum(ClassificadoAnuncio.visualizacoes)).where(
            ClassificadoAnuncio.morador_id == USER_ID_TEMP, ClassificadoAnuncio.deleted_at.is_(None)
        )
    )
    total_views = views_result.scalar() or 0

    # Total de favoritos recebidos
    favs_result = await db.execute(
        select(func.count(ClassificadoFavorito.id))
        .join(ClassificadoAnuncio, ClassificadoFavorito.anuncio_id == ClassificadoAnuncio.id)
        .where(ClassificadoAnuncio.morador_id == USER_ID_TEMP)
    )
    total_favoritos = favs_result.scalar() or 0

    return {
        "total": total,
        "ativos": ativos,
        "pausados": pausados,
        "vendidos": vendidos,
        "arquivados": total - ativos - pausados - vendidos,
        "total_visualizacoes": total_views,
        "total_favoritos": total_favoritos,
    }


@router.get("/meus/favoritos", response_model=List[AnuncioResponse])
async def meus_favoritos(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    query = select(ClassificadoFavorito).where(ClassificadoFavorito.morador_id == USER_ID_TEMP)
    result = await db.execute(query)
    favoritos = result.scalars().all()
    items = []
    for fav in favoritos:
        anuncio_result = await db.execute(
            select(ClassificadoAnuncio)
            .options(selectinload(ClassificadoAnuncio.imagens))
            .where(ClassificadoAnuncio.id == fav.anuncio_id)
        )
        anuncio = anuncio_result.scalar_one_or_none()
        if anuncio and not anuncio.deleted_at:
            imagens = [
                ImagemResponse(id=img.id, url=img.url, ordem=img.ordem, created_at=img.created_at)
                for img in anuncio.imagens
            ]
            items.append(
                AnuncioResponse(
                    id=anuncio.id,
                    morador_id=anuncio.morador_id,
                    titulo=anuncio.titulo,
                    descricao=anuncio.descricao,
                    preco=anuncio.preco,
                    categoria=anuncio.categoria,
                    condicao=anuncio.condicao,
                    status=anuncio.status,
                    visualizacoes=anuncio.visualizacoes,
                    created_at=anuncio.created_at,
                    updated_at=anuncio.updated_at,
                    imagens=imagens,
                    is_favorito=True,
                )
            )
    return items


@router.get("/vendedor/{vendedor_id}", response_model=VendedorPerfil)
async def perfil_vendedor(
    vendedor_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == vendedor_id, User.tenant_id == tenant_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Vendedor nao encontrado")
    resumo = await get_morador_resumo(db, vendedor_id)
    ativos_result = await db.execute(
        select(func.count(ClassificadoAnuncio.id)).where(
            ClassificadoAnuncio.morador_id == vendedor_id,
            ClassificadoAnuncio.status == "disponivel",
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    ativos = ativos_result.scalar() or 0
    vendas_result = await db.execute(
        select(func.count(ClassificadoAnuncio.id)).where(
            ClassificadoAnuncio.morador_id == vendedor_id, ClassificadoAnuncio.status == "vendido"
        )
    )
    vendas = vendas_result.scalar() or 0
    return VendedorPerfil(
        id=resumo.id,
        nome=resumo.nome,
        foto_perfil=resumo.foto_perfil,
        bloco=resumo.bloco,
        apartamento=resumo.apartamento,
        verificado=resumo.verificado,
        recomendacoes=resumo.recomendacoes,
        anuncios_ativos=ativos,
        total_vendas=vendas,
        membro_desde=user.created_at,
    )


@router.get("/{anuncio_id}", response_model=AnuncioDetalhe)
async def detalhe_anuncio(
    anuncio_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ClassificadoAnuncio)
        .options(selectinload(ClassificadoAnuncio.imagens))
        .where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.tenant_id == tenant_id,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado")
    if anuncio.morador_id != USER_ID_TEMP:
        anuncio.visualizacoes += 1
        await db.commit()
    vendedor = await get_morador_resumo(db, anuncio.morador_id)
    imagens = [
        ImagemResponse(id=img.id, url=img.url, ordem=img.ordem, created_at=img.created_at) for img in anuncio.imagens
    ]
    is_fav = await check_is_favorito(db, anuncio.id, USER_ID_TEMP)
    return AnuncioDetalhe(
        id=anuncio.id,
        morador_id=anuncio.morador_id,
        titulo=anuncio.titulo,
        descricao=anuncio.descricao,
        preco=anuncio.preco,
        categoria=anuncio.categoria,
        condicao=anuncio.condicao,
        status=anuncio.status,
        visualizacoes=anuncio.visualizacoes,
        created_at=anuncio.created_at,
        updated_at=anuncio.updated_at,
        imagens=imagens,
        is_favorito=is_fav,
        vendedor=vendedor,
    )


@router.post("", response_model=AnuncioResponse, status_code=status.HTTP_201_CREATED)
async def criar_anuncio(
    anuncio: AnuncioCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Criar anúncio - SEM LIMITE de quantidade"""
    if anuncio.categoria not in CATEGORIAS_VALIDAS:
        raise HTTPException(status_code=400, detail="Categoria invalida")
    if anuncio.condicao not in CONDICOES_VALIDAS:
        raise HTTPException(status_code=400, detail="Condicao invalida")

    # SEM LIMITE - criação livre
    novo = ClassificadoAnuncio(
        morador_id=USER_ID_TEMP,
        tenant_id=tenant_id,
        titulo=anuncio.titulo,
        descricao=anuncio.descricao,
        preco=anuncio.preco,
        categoria=anuncio.categoria,
        condicao=anuncio.condicao,
        status="disponivel",
    )
    db.add(novo)
    await db.commit()
    await db.refresh(novo)

    return AnuncioResponse(
        id=novo.id,
        morador_id=novo.morador_id,
        titulo=novo.titulo,
        descricao=novo.descricao,
        preco=novo.preco,
        categoria=novo.categoria,
        condicao=novo.condicao,
        status=novo.status,
        visualizacoes=novo.visualizacoes,
        created_at=novo.created_at,
        updated_at=novo.updated_at,
        imagens=[],
        is_favorito=False,
    )


@router.post("/{anuncio_id}/imagens", response_model=ImagemResponse)
async def upload_imagem(anuncio_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ClassificadoAnuncio).where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado ou sem permissao")

    total_result = await db.execute(
        select(func.count(ClassificadoImagem.id)).where(ClassificadoImagem.anuncio_id == anuncio_id)
    )
    total_imgs = total_result.scalar() or 0
    if total_imgs >= 10:
        raise HTTPException(status_code=400, detail="Limite de 10 imagens por anuncio")

    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo nao permitido")

    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/uploads/classificados/{filename}"
    imagem = ClassificadoImagem(anuncio_id=anuncio_id, url=url, ordem=total_imgs)
    db.add(imagem)
    await db.commit()
    await db.refresh(imagem)

    return ImagemResponse(id=imagem.id, url=imagem.url, ordem=imagem.ordem, created_at=imagem.created_at)


@router.put("/{anuncio_id}", response_model=AnuncioResponse)
async def atualizar_anuncio(
    anuncio_id: int,
    dados: AnuncioUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ClassificadoAnuncio)
        .options(selectinload(ClassificadoAnuncio.imagens))
        .where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado ou sem permissao")

    if dados.categoria and dados.categoria not in CATEGORIAS_VALIDAS:
        raise HTTPException(status_code=400, detail="Categoria invalida")
    if dados.condicao and dados.condicao not in CONDICOES_VALIDAS:
        raise HTTPException(status_code=400, detail="Condicao invalida")
    if dados.status and dados.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status invalido")

    update_data = dados.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(anuncio, key, value)
    anuncio.updated_at = datetime.now()
    await db.commit()
    await db.refresh(anuncio)

    imagens = [
        ImagemResponse(id=img.id, url=img.url, ordem=img.ordem, created_at=img.created_at) for img in anuncio.imagens
    ]
    is_fav = await check_is_favorito(db, anuncio.id, USER_ID_TEMP)

    return AnuncioResponse(
        id=anuncio.id,
        morador_id=anuncio.morador_id,
        titulo=anuncio.titulo,
        descricao=anuncio.descricao,
        preco=anuncio.preco,
        categoria=anuncio.categoria,
        condicao=anuncio.condicao,
        status=anuncio.status,
        visualizacoes=anuncio.visualizacoes,
        created_at=anuncio.created_at,
        updated_at=anuncio.updated_at,
        imagens=imagens,
        is_favorito=is_fav,
    )


@router.patch("/{anuncio_id}/status")
async def alterar_status(anuncio_id: int, novo_status: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Alterar status do anúncio (pausar, ativar, marcar vendido, arquivar)"""
    if novo_status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Status invalido. Use: {', '.join(STATUS_VALIDOS)}")

    result = await db.execute(
        select(ClassificadoAnuncio).where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado")

    anuncio.status = novo_status
    anuncio.updated_at = datetime.now()
    await db.commit()

    return {"message": f"Status alterado para {novo_status}", "status": novo_status}


@router.post("/{anuncio_id}/duplicar", response_model=AnuncioResponse)
async def duplicar_anuncio(
    anuncio_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Duplicar um anúncio existente"""
    result = await db.execute(
        select(ClassificadoAnuncio).where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado")

    novo = ClassificadoAnuncio(
        morador_id=USER_ID_TEMP,
        tenant_id=tenant_id,
        titulo=f"{anuncio.titulo} (cópia)",
        descricao=anuncio.descricao,
        preco=anuncio.preco,
        categoria=anuncio.categoria,
        condicao=anuncio.condicao,
        status="disponivel",
    )
    db.add(novo)
    await db.commit()
    await db.refresh(novo)

    return AnuncioResponse(
        id=novo.id,
        morador_id=novo.morador_id,
        titulo=novo.titulo,
        descricao=novo.descricao,
        preco=novo.preco,
        categoria=novo.categoria,
        condicao=novo.condicao,
        status=novo.status,
        visualizacoes=0,
        created_at=novo.created_at,
        updated_at=novo.updated_at,
        imagens=[],
        is_favorito=False,
    )


@router.delete("/{anuncio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_anuncio(
    anuncio_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ClassificadoAnuncio).where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.morador_id == USER_ID_TEMP,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado ou sem permissao")
    anuncio.deleted_at = datetime.now()
    await db.commit()


@router.post("/{anuncio_id}/favorito", response_model=dict)
async def toggle_favorito(
    anuncio_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ClassificadoAnuncio).where(
            ClassificadoAnuncio.id == anuncio_id,
            ClassificadoAnuncio.tenant_id == tenant_id,
            ClassificadoAnuncio.deleted_at.is_(None),
        )
    )
    anuncio = result.scalar_one_or_none()
    if not anuncio:
        raise HTTPException(status_code=404, detail="Anuncio nao encontrado")
    if anuncio.morador_id == USER_ID_TEMP:
        raise HTTPException(status_code=400, detail="Nao pode favoritar proprio anuncio")

    result = await db.execute(
        select(ClassificadoFavorito).where(
            ClassificadoFavorito.anuncio_id == anuncio_id, ClassificadoFavorito.morador_id == USER_ID_TEMP
        )
    )
    favorito = result.scalar_one_or_none()

    if favorito:
        await db.delete(favorito)
        await db.commit()
        return {"favorito": False, "message": "Removido dos favoritos"}
    else:
        novo_fav = ClassificadoFavorito(anuncio_id=anuncio_id, morador_id=USER_ID_TEMP)
        db.add(novo_fav)
        await db.commit()
        return {"favorito": True, "message": "Adicionado aos favoritos"}


@router.post("/recomendar", response_model=RecomendacaoResponse, status_code=status.HTTP_201_CREATED)
async def recomendar_vendedor(
    dados: RecomendacaoCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    if dados.avaliado_id == USER_ID_TEMP:
        raise HTTPException(status_code=400, detail="Nao pode se auto-recomendar")

    result = await db.execute(
        select(ClassificadoRecomendacao).where(
            ClassificadoRecomendacao.avaliador_id == USER_ID_TEMP,
            ClassificadoRecomendacao.avaliado_id == dados.avaliado_id,
            ClassificadoRecomendacao.anuncio_id == dados.anuncio_id,
        )
    )
    existe = result.scalar_one_or_none()
    if existe:
        raise HTTPException(status_code=400, detail="Ja recomendou este vendedor")

    recomendacao = ClassificadoRecomendacao(
        avaliador_id=USER_ID_TEMP, avaliado_id=dados.avaliado_id, anuncio_id=dados.anuncio_id
    )
    db.add(recomendacao)
    await db.commit()
    await db.refresh(recomendacao)

    return RecomendacaoResponse(
        id=recomendacao.id,
        avaliador_id=recomendacao.avaliador_id,
        avaliado_id=recomendacao.avaliado_id,
        anuncio_id=recomendacao.anuncio_id,
        created_at=recomendacao.created_at,
    )
