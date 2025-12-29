"""
API de Destaques e Informativos
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import UPLOAD_BASE_DIR
from app.database import get_db

router = APIRouter(prefix="/destaques", tags=["Destaques e Informativos"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "destaques")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class DestaqueBase(BaseModel):
    titulo: str
    link_url: Optional[str] = None
    link_tipo: str = "externo"
    posicao: int = 0
    modo_apresentacao: str = "carrossel"
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    ativo: bool = True


class DestaqueCreate(DestaqueBase):
    pass


class DestaqueResponse(DestaqueBase):
    id: int
    imagem_url: Optional[str] = None
    cliques: int
    created_at: datetime

    class Config:
        from_attributes = True


class DestaqueListResponse(BaseModel):
    items: List[DestaqueResponse]
    total: int


@router.get("", response_model=DestaqueListResponse)
async def listar_destaques(
    tenant_id: int = Query(1, description="ID do condomínio"),
    ativo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    query = text("SELECT * FROM destaques WHERE tenant_id = :tenant_id ORDER BY posicao, created_at DESC")
    result = await db.execute(query, {"tenant_id": tenant_id})
    rows = result.fetchall()
    items = [
        DestaqueResponse(
            id=r.id,
            titulo=r.titulo,
            imagem_url=r.imagem_url,
            link_url=r.link_url,
            link_tipo=r.link_tipo,
            posicao=r.posicao,
            modo_apresentacao=r.modo_apresentacao,
            data_inicio=r.data_inicio,
            data_fim=r.data_fim,
            cliques=r.cliques,
            ativo=r.ativo,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return DestaqueListResponse(items=items, total=len(items))


@router.post("", response_model=DestaqueResponse, status_code=status.HTTP_201_CREATED)
async def criar_destaque(
    dados: DestaqueCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    query = text(
        """
        INSERT INTO destaques (titulo, link_url, link_tipo, posicao, modo_apresentacao, data_inicio, data_fim, ativo, tenant_id, created_by_id, created_at)
        VALUES (:titulo, :link_url, :link_tipo, :posicao, :modo, :data_inicio, :data_fim, :ativo, :tenant_id, :user_id, NOW()) RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "titulo": dados.titulo,
            "link_url": dados.link_url,
            "link_tipo": dados.link_tipo,
            "posicao": dados.posicao,
            "modo": dados.modo_apresentacao,
            "data_inicio": dados.data_inicio,
            "data_fim": dados.data_fim,
            "ativo": dados.ativo,
            "tenant_id": tenant_id,
            "user_id": user_id,
        },
    )
    await db.commit()
    r = result.fetchone()
    return DestaqueResponse(
        id=r.id,
        titulo=r.titulo,
        imagem_url=r.imagem_url,
        link_url=r.link_url,
        link_tipo=r.link_tipo,
        posicao=r.posicao,
        modo_apresentacao=r.modo_apresentacao,
        data_inicio=r.data_inicio,
        data_fim=r.data_fim,
        cliques=r.cliques,
        ativo=r.ativo,
        created_at=r.created_at,
    )


@router.post("/{id}/imagem")
async def upload_imagem(id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/uploads/destaques/{filename}"
    await db.execute(text("UPDATE destaques SET imagem_url = :url WHERE id = :id"), {"url": url, "id": id})
    await db.commit()
    return {"url": url}


@router.put("/{id}/toggle")
async def toggle_destaque(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("UPDATE destaques SET ativo = NOT ativo WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Status atualizado"}


@router.delete("/{id}")
async def excluir_destaque(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM destaques WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}
