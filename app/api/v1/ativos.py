"""
API de Controle de Ativos
"""

import os
import uuid
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import UPLOAD_BASE_DIR
from app.database import get_db

router = APIRouter(prefix="/ativos", tags=["Controle de Ativos"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "ativos")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CategoriaBase(BaseModel):
    nome: str


class CategoriaResponse(CategoriaBase):
    id: int
    total_ativos: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class AtivoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    codigo: Optional[str] = None
    categoria_id: Optional[int] = None
    localizacao: Optional[str] = None
    estado: str = "bom"
    data_aquisicao: Optional[date] = None
    valor_aquisicao: Optional[float] = None


class AtivoCreate(AtivoBase):
    pass


class AtivoResponse(AtivoBase):
    id: int
    foto_url: Optional[str] = None
    categoria_nome: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CategoriaListResponse(BaseModel):
    items: List[CategoriaResponse]
    total: int


class AtivoListResponse(BaseModel):
    items: List[AtivoResponse]
    total: int


@router.get("/categorias", response_model=CategoriaListResponse)
async def listar_categorias(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text(
        """
        SELECT c.*, COUNT(a.id) as total_ativos
        FROM ativos_categorias c
        LEFT JOIN ativos a ON a.categoria_id = c.id
        WHERE c.tenant_id = :tenant_id
        GROUP BY c.id ORDER BY c.nome
    """
    )
    result = await db.execute(query, {"tenant_id": tenant_id})
    rows = result.fetchall()
    items = [
        CategoriaResponse(id=r.id, nome=r.nome, total_ativos=r.total_ativos, created_at=r.created_at) for r in rows
    ]
    return CategoriaListResponse(items=items, total=len(items))


@router.post("/categorias", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
async def criar_categoria(
    dados: CategoriaBase, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text(
        "INSERT INTO ativos_categorias (nome, tenant_id, created_at) VALUES (:nome, :tenant_id, NOW()) RETURNING *"
    )
    result = await db.execute(query, {"nome": dados.nome, "tenant_id": tenant_id})
    await db.commit()
    r = result.fetchone()
    return CategoriaResponse(id=r.id, nome=r.nome, total_ativos=0, created_at=r.created_at)


@router.post("/categorias/lote", status_code=status.HTTP_201_CREATED)
async def criar_categorias_lote(
    nomes: List[str], tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    criadas = []
    for nome in nomes:
        query = text(
            "INSERT INTO ativos_categorias (nome, tenant_id, created_at) VALUES (:nome, :tenant_id, NOW()) RETURNING id, nome"
        )
        result = await db.execute(query, {"nome": nome, "tenant_id": tenant_id})
        r = result.fetchone()
        criadas.append({"id": r.id, "nome": r.nome})
    await db.commit()
    return {"criadas": criadas, "total": len(criadas)}


@router.delete("/categorias/{id}")
async def excluir_categoria(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM ativos_categorias WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}


@router.get("", response_model=AtivoListResponse)
async def listar_ativos(
    tenant_id: int = Query(1, description="ID do condomínio"),
    categoria_id: Optional[int] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = text(
        """
        SELECT a.*, c.nome as categoria_nome
        FROM ativos a
        LEFT JOIN ativos_categorias c ON c.id = a.categoria_id
        WHERE a.tenant_id = :tenant_id
        ORDER BY a.nome
    """
    )
    result = await db.execute(query, {"tenant_id": tenant_id})
    rows = result.fetchall()
    items = [
        AtivoResponse(
            id=r.id,
            nome=r.nome,
            descricao=r.descricao,
            codigo=r.codigo,
            categoria_id=r.categoria_id,
            categoria_nome=r.categoria_nome,
            localizacao=r.localizacao,
            estado=r.estado,
            data_aquisicao=r.data_aquisicao,
            valor_aquisicao=float(r.valor_aquisicao) if r.valor_aquisicao else None,
            foto_url=r.foto_url,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return AtivoListResponse(items=items, total=len(items))


@router.post("", response_model=AtivoResponse, status_code=status.HTTP_201_CREATED)
async def criar_ativo(
    dados: AtivoCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text(
        """
        INSERT INTO ativos (nome, descricao, codigo, categoria_id, localizacao, estado, data_aquisicao, valor_aquisicao, tenant_id, created_at, updated_at)
        VALUES (:nome, :descricao, :codigo, :categoria_id, :localizacao, :estado, :data_aquisicao, :valor_aquisicao, :tenant_id, NOW(), NOW()) RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "nome": dados.nome,
            "descricao": dados.descricao,
            "codigo": dados.codigo,
            "categoria_id": dados.categoria_id,
            "localizacao": dados.localizacao,
            "estado": dados.estado,
            "data_aquisicao": dados.data_aquisicao,
            "valor_aquisicao": dados.valor_aquisicao,
            "tenant_id": tenant_id,
        },
    )
    await db.commit()
    r = result.fetchone()
    return AtivoResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        codigo=r.codigo,
        categoria_id=r.categoria_id,
        categoria_nome=None,
        localizacao=r.localizacao,
        estado=r.estado,
        data_aquisicao=r.data_aquisicao,
        valor_aquisicao=float(r.valor_aquisicao) if r.valor_aquisicao else None,
        foto_url=r.foto_url,
        created_at=r.created_at,
    )


@router.post("/{id}/imagem")
async def upload_imagem_ativo(id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/uploads/ativos/{filename}"
    await db.execute(text("UPDATE ativos SET foto_url = :url WHERE id = :id"), {"url": url, "id": id})
    await db.commit()
    return {"url": url}


@router.put("/{id}", response_model=AtivoResponse)
async def atualizar_ativo(
    id: int,
    dados: AtivoCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    query = text(
        """
        UPDATE ativos SET nome = :nome, descricao = :descricao, codigo = :codigo, categoria_id = :categoria_id,
        localizacao = :localizacao, estado = :estado, data_aquisicao = :data_aquisicao, valor_aquisicao = :valor_aquisicao, updated_at = NOW()
        WHERE id = :id RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "id": id,
            "nome": dados.nome,
            "descricao": dados.descricao,
            "codigo": dados.codigo,
            "categoria_id": dados.categoria_id,
            "localizacao": dados.localizacao,
            "estado": dados.estado,
            "data_aquisicao": dados.data_aquisicao,
            "valor_aquisicao": dados.valor_aquisicao,
        },
    )
    await db.commit()
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    return AtivoResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        codigo=r.codigo,
        categoria_id=r.categoria_id,
        categoria_nome=None,
        localizacao=r.localizacao,
        estado=r.estado,
        data_aquisicao=r.data_aquisicao,
        valor_aquisicao=float(r.valor_aquisicao) if r.valor_aquisicao else None,
        foto_url=r.foto_url,
        created_at=r.created_at,
    )


@router.delete("/{id}")
async def excluir_ativo(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM ativos WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}
