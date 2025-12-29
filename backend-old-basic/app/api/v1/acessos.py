"""
API de Solicitações de Acesso (Facial, Veicular, Tag)
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import UPLOAD_BASE_DIR
from app.database import get_db
from app.models.acessos import AcessoLog, AcessoSolicitacao
from app.models.unit import Unit, UnitResident
from app.models.user import User
from app.schemas.acessos import (
    MOTIVOS_RECUSA_PADRAO,
    AprovarRequest,
    LogResponse,
    MoradorAcessoResumo,
    MoradorAgrupado,
    RecusarRequest,
    SolicitacaoCreate,
    SolicitacaoDetalhe,
    SolicitacaoListResponse,
    SolicitacaoResponse,
)

router = APIRouter(prefix="/acessos", tags=["Solicitações de Acesso"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "acessos")
os.makedirs(UPLOAD_DIR, exist_ok=True)
USER_ID_TEMP = 1  # Admin temporário


async def get_morador_resumo(db: AsyncSession, user_id: int) -> Optional[MoradorAcessoResumo]:
    """Busca dados resumidos do morador"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None

    # Buscar unidade
    result = await db.execute(
        select(UnitResident).where(UnitResident.user_id == user_id, UnitResident.is_active == True)
    )
    unit_resident = result.scalar_one_or_none()
    bloco, apartamento = None, None
    if unit_resident:
        result = await db.execute(select(Unit).where(Unit.id == unit_resident.unit_id))
        unit = result.scalar_one_or_none()
        if unit:
            bloco = unit.block
            apartamento = unit.number

    return MoradorAcessoResumo(
        id=user.id,
        nome=user.name,
        foto_perfil=user.photo_url,
        bloco=bloco,
        apartamento=apartamento,
        telefone=user.phone,
        inadimplente=False,  # TODO: integrar com financeiro
        restricoes=None,
    )


@router.get("", response_model=SolicitacaoListResponse)
async def listar_solicitacoes(
    status_filtro: Optional[str] = Query(None, alias="status"),
    tipo: Optional[str] = None,
    morador_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Lista solicitações com filtros e contadores por status"""

    # Query base
    query = select(AcessoSolicitacao).where(AcessoSolicitacao.tenant_id == tenant_id)

    # Filtros
    if status_filtro:
        query = query.where(AcessoSolicitacao.status == status_filtro)
    if tipo:
        query = query.where(AcessoSolicitacao.tipo == tipo)
    if morador_id:
        query = query.where(AcessoSolicitacao.morador_id == morador_id)

    # Contadores por status
    pendentes_result = await db.execute(
        select(func.count(AcessoSolicitacao.id)).where(
            AcessoSolicitacao.tenant_id == tenant_id, AcessoSolicitacao.status == "pendente"
        )
    )
    pendentes = pendentes_result.scalar() or 0

    aprovados_result = await db.execute(
        select(func.count(AcessoSolicitacao.id)).where(
            AcessoSolicitacao.tenant_id == tenant_id, AcessoSolicitacao.status == "aprovado"
        )
    )
    aprovados = aprovados_result.scalar() or 0

    recusados_result = await db.execute(
        select(func.count(AcessoSolicitacao.id)).where(
            AcessoSolicitacao.tenant_id == tenant_id, AcessoSolicitacao.status == "recusado"
        )
    )
    recusados = recusados_result.scalar() or 0

    # Total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Ordenação e paginação
    query = query.order_by(AcessoSolicitacao.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    solicitacoes = result.scalars().all()

    # Montar resposta com dados do morador
    items = []
    for sol in solicitacoes:
        morador = await get_morador_resumo(db, sol.morador_id)
        items.append(
            SolicitacaoResponse(
                id=sol.id,
                morador_id=sol.morador_id,
                tipo=sol.tipo,
                imagem_url=sol.imagem_url,
                placa_veiculo=sol.placa_veiculo,
                modelo_veiculo=sol.modelo_veiculo,
                cor_veiculo=sol.cor_veiculo,
                numero_tag=sol.numero_tag,
                status=sol.status,
                motivo_recusa=sol.motivo_recusa,
                tentativa_numero=sol.tentativa_numero,
                validacao_ia_resultado=sol.validacao_ia_resultado,
                validacao_ia_motivo=sol.validacao_ia_motivo,
                created_at=sol.created_at,
                updated_at=sol.updated_at,
                morador=morador,
            )
        )

    pages = (total + limit - 1) // limit if total > 0 else 1

    return SolicitacaoListResponse(
        items=items, total=total, page=page, pages=pages, pendentes=pendentes, aprovados=aprovados, recusados=recusados
    )


@router.get("/motivos-recusa", response_model=List[str])
async def listar_motivos_recusa():
    """Retorna lista de motivos padrão de recusa"""
    return MOTIVOS_RECUSA_PADRAO


@router.get("/agrupados", response_model=List[MoradorAgrupado])
async def listar_agrupados_por_morador(
    status_filtro: Optional[str] = Query("recusado", alias="status"),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Lista solicitações agrupadas por morador (útil para ver tentativas recusadas)"""

    # Buscar moradores com múltiplas solicitações
    query = (
        select(AcessoSolicitacao.morador_id, func.count(AcessoSolicitacao.id).label("total"))
        .where(AcessoSolicitacao.tenant_id == tenant_id, AcessoSolicitacao.status == status_filtro)
        .group_by(AcessoSolicitacao.morador_id)
        .having(func.count(AcessoSolicitacao.id) > 1)
    )

    result = await db.execute(query)
    agrupamentos = result.all()

    items = []
    for morador_id, total in agrupamentos:
        morador = await get_morador_resumo(db, morador_id)
        if not morador:
            continue

        # Buscar solicitações deste morador
        sol_result = await db.execute(
            select(AcessoSolicitacao)
            .where(AcessoSolicitacao.morador_id == morador_id, AcessoSolicitacao.status == status_filtro)
            .order_by(AcessoSolicitacao.created_at.desc())
        )
        solicitacoes = sol_result.scalars().all()

        items.append(
            MoradorAgrupado(
                morador=morador,
                total_solicitacoes=total,
                total_recusadas=total if status_filtro == "recusado" else 0,
                solicitacoes=[
                    SolicitacaoResponse(
                        id=s.id,
                        morador_id=s.morador_id,
                        tipo=s.tipo,
                        imagem_url=s.imagem_url,
                        placa_veiculo=s.placa_veiculo,
                        modelo_veiculo=s.modelo_veiculo,
                        cor_veiculo=s.cor_veiculo,
                        numero_tag=s.numero_tag,
                        status=s.status,
                        motivo_recusa=s.motivo_recusa,
                        tentativa_numero=s.tentativa_numero,
                        validacao_ia_resultado=s.validacao_ia_resultado,
                        validacao_ia_motivo=s.validacao_ia_motivo,
                        created_at=s.created_at,
                        updated_at=s.updated_at,
                        morador=morador,
                    )
                    for s in solicitacoes
                ],
            )
        )

    return items


@router.get("/{solicitacao_id}", response_model=SolicitacaoDetalhe)
async def detalhe_solicitacao(
    solicitacao_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Retorna detalhes de uma solicitação com logs"""

    result = await db.execute(
        select(AcessoSolicitacao)
        .options(selectinload(AcessoSolicitacao.logs))
        .where(AcessoSolicitacao.id == solicitacao_id, AcessoSolicitacao.tenant_id == tenant_id)
    )
    sol = result.scalar_one_or_none()

    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")

    morador = await get_morador_resumo(db, sol.morador_id)
    logs = [
        LogResponse(
            id=log.id,
            acao=log.acao,
            usuario_admin_id=log.usuario_admin_id,
            observacao=log.observacao,
            created_at=log.created_at,
        )
        for log in sol.logs
    ]

    return SolicitacaoDetalhe(
        id=sol.id,
        morador_id=sol.morador_id,
        tipo=sol.tipo,
        imagem_url=sol.imagem_url,
        placa_veiculo=sol.placa_veiculo,
        modelo_veiculo=sol.modelo_veiculo,
        cor_veiculo=sol.cor_veiculo,
        numero_tag=sol.numero_tag,
        status=sol.status,
        motivo_recusa=sol.motivo_recusa,
        tentativa_numero=sol.tentativa_numero,
        validacao_ia_resultado=sol.validacao_ia_resultado,
        validacao_ia_motivo=sol.validacao_ia_motivo,
        created_at=sol.created_at,
        updated_at=sol.updated_at,
        morador=morador,
        logs=logs,
    )


@router.post("", response_model=SolicitacaoResponse, status_code=status.HTTP_201_CREATED)
async def criar_solicitacao(
    dados: SolicitacaoCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Cria nova solicitação de acesso"""

    # Contar tentativas anteriores do mesmo tipo
    tentativas_result = await db.execute(
        select(func.count(AcessoSolicitacao.id)).where(
            AcessoSolicitacao.morador_id == USER_ID_TEMP, AcessoSolicitacao.tipo == dados.tipo
        )
    )
    tentativas = (tentativas_result.scalar() or 0) + 1

    nova = AcessoSolicitacao(
        morador_id=USER_ID_TEMP,
        tenant_id=tenant_id,
        tipo=dados.tipo,
        imagem_url=dados.imagem_url,
        placa_veiculo=dados.placa_veiculo,
        modelo_veiculo=dados.modelo_veiculo,
        cor_veiculo=dados.cor_veiculo,
        numero_tag=dados.numero_tag,
        tentativa_numero=tentativas,
    )

    db.add(nova)
    await db.commit()
    await db.refresh(nova)

    # Log de criação
    log = AcessoLog(solicitacao_id=nova.id, acao="criado", usuario_admin_id=USER_ID_TEMP)
    db.add(log)
    await db.commit()

    morador = await get_morador_resumo(db, nova.morador_id)

    return SolicitacaoResponse(
        id=nova.id,
        morador_id=nova.morador_id,
        tipo=nova.tipo,
        imagem_url=nova.imagem_url,
        placa_veiculo=nova.placa_veiculo,
        modelo_veiculo=nova.modelo_veiculo,
        cor_veiculo=nova.cor_veiculo,
        numero_tag=nova.numero_tag,
        status=nova.status,
        motivo_recusa=nova.motivo_recusa,
        tentativa_numero=nova.tentativa_numero,
        validacao_ia_resultado=nova.validacao_ia_resultado,
        validacao_ia_motivo=nova.validacao_ia_motivo,
        created_at=nova.created_at,
        updated_at=nova.updated_at,
        morador=morador,
    )


@router.post("/{solicitacao_id}/imagem", response_model=dict)
async def upload_imagem(solicitacao_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Upload de imagem para solicitação"""

    result = await db.execute(select(AcessoSolicitacao).where(AcessoSolicitacao.id == solicitacao_id))
    sol = result.scalar_one_or_none()

    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")

    # Validar tipo
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")

    # Salvar arquivo
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Atualizar solicitação
    sol.imagem_url = f"/uploads/acessos/{filename}"
    sol.updated_at = datetime.now()
    await db.commit()

    return {"url": sol.imagem_url, "message": "Imagem enviada com sucesso"}


@router.post("/{solicitacao_id}/aprovar", response_model=SolicitacaoResponse)
async def aprovar_solicitacao(
    solicitacao_id: int,
    dados: AprovarRequest,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Aprova uma solicitação"""

    result = await db.execute(
        select(AcessoSolicitacao).where(
            AcessoSolicitacao.id == solicitacao_id, AcessoSolicitacao.tenant_id == tenant_id
        )
    )
    sol = result.scalar_one_or_none()

    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")

    if sol.status != "pendente":
        raise HTTPException(status_code=400, detail="Solicitação já foi processada")

    # Aprovar
    sol.status = "aprovado"
    sol.updated_at = datetime.now()

    # Log
    log = AcessoLog(solicitacao_id=sol.id, acao="aprovado", usuario_admin_id=USER_ID_TEMP, observacao=dados.observacao)
    db.add(log)
    await db.commit()
    await db.refresh(sol)

    morador = await get_morador_resumo(db, sol.morador_id)

    return SolicitacaoResponse(
        id=sol.id,
        morador_id=sol.morador_id,
        tipo=sol.tipo,
        imagem_url=sol.imagem_url,
        placa_veiculo=sol.placa_veiculo,
        modelo_veiculo=sol.modelo_veiculo,
        cor_veiculo=sol.cor_veiculo,
        numero_tag=sol.numero_tag,
        status=sol.status,
        motivo_recusa=sol.motivo_recusa,
        tentativa_numero=sol.tentativa_numero,
        validacao_ia_resultado=sol.validacao_ia_resultado,
        validacao_ia_motivo=sol.validacao_ia_motivo,
        created_at=sol.created_at,
        updated_at=sol.updated_at,
        morador=morador,
    )


@router.post("/{solicitacao_id}/recusar", response_model=SolicitacaoResponse)
async def recusar_solicitacao(
    solicitacao_id: int,
    dados: RecusarRequest,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Recusa uma solicitação"""

    result = await db.execute(
        select(AcessoSolicitacao).where(
            AcessoSolicitacao.id == solicitacao_id, AcessoSolicitacao.tenant_id == tenant_id
        )
    )
    sol = result.scalar_one_or_none()

    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")

    if sol.status != "pendente":
        raise HTTPException(status_code=400, detail="Solicitação já foi processada")

    # Recusar
    sol.status = "recusado"
    sol.motivo_recusa = dados.motivo
    sol.updated_at = datetime.now()

    # Log
    log = AcessoLog(solicitacao_id=sol.id, acao="recusado", usuario_admin_id=USER_ID_TEMP, observacao=dados.observacao)
    db.add(log)
    await db.commit()
    await db.refresh(sol)

    morador = await get_morador_resumo(db, sol.morador_id)

    return SolicitacaoResponse(
        id=sol.id,
        morador_id=sol.morador_id,
        tipo=sol.tipo,
        imagem_url=sol.imagem_url,
        placa_veiculo=sol.placa_veiculo,
        modelo_veiculo=sol.modelo_veiculo,
        cor_veiculo=sol.cor_veiculo,
        numero_tag=sol.numero_tag,
        status=sol.status,
        motivo_recusa=sol.motivo_recusa,
        tentativa_numero=sol.tentativa_numero,
        validacao_ia_resultado=sol.validacao_ia_resultado,
        validacao_ia_motivo=sol.validacao_ia_motivo,
        created_at=sol.created_at,
        updated_at=sol.updated_at,
        morador=morador,
    )
