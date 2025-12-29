"""
API de Avaliações de Locais
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

router = APIRouter(prefix="/avaliacoes", tags=["Avaliações"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "avaliacoes")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class LocalBase(BaseModel):
    nome: str
    descricao: Optional[str] = None


class LocalCreate(LocalBase):
    pass


class LocalResponse(LocalBase):
    id: int
    foto_url: Optional[str] = None
    ativo: bool
    media_notas: float = 0
    total_avaliacoes: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class AvaliacaoBase(BaseModel):
    nota: int
    comentario: Optional[str] = None


class AvaliacaoCreate(AvaliacaoBase):
    local_id: int


class AvaliacaoResponse(AvaliacaoBase):
    id: int
    local_id: int
    user_id: int
    user_nome: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LocalListResponse(BaseModel):
    items: List[LocalResponse]
    total: int


class AvaliacaoListResponse(BaseModel):
    items: List[AvaliacaoResponse]
    total: int


@router.get("/locais", response_model=LocalListResponse)
async def listar_locais(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    query = text(
        """
        SELECT l.*, 
            COALESCE(AVG(a.nota), 0) as media_notas,
            COUNT(a.id) as total_avaliacoes
        FROM avaliacoes_locais l
        LEFT JOIN avaliacoes a ON a.local_id = l.id
        WHERE l.tenant_id = :tenant_id
        GROUP BY l.id
        ORDER BY l.nome
    """
    )
    result = await db.execute(query, {"tenant_id": tenant_id})
    rows = result.fetchall()
    items = [
        LocalResponse(
            id=r.id,
            nome=r.nome,
            descricao=r.descricao,
            foto_url=r.foto_url,
            ativo=r.ativo,
            media_notas=float(r.media_notas),
            total_avaliacoes=r.total_avaliacoes,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return LocalListResponse(items=items, total=len(items))


@router.post("/locais", response_model=LocalResponse, status_code=status.HTTP_201_CREATED)
async def criar_local(
    dados: LocalCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text(
        """
        INSERT INTO avaliacoes_locais (nome, descricao, tenant_id, created_at)
        VALUES (:nome, :descricao, :tenant_id, NOW()) RETURNING *
    """
    )
    result = await db.execute(query, {"nome": dados.nome, "descricao": dados.descricao, "tenant_id": tenant_id})
    await db.commit()
    r = result.fetchone()
    return LocalResponse(
        id=r.id,
        nome=r.nome,
        descricao=r.descricao,
        foto_url=r.foto_url,
        ativo=r.ativo,
        media_notas=0,
        total_avaliacoes=0,
        created_at=r.created_at,
    )


@router.post("/locais/{id}/imagem")
async def upload_imagem_local(id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/uploads/avaliacoes/{filename}"
    await db.execute(text("UPDATE avaliacoes_locais SET foto_url = :url WHERE id = :id"), {"url": url, "id": id})
    await db.commit()
    return {"url": url}


@router.delete("/locais/{id}")
async def excluir_local(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM avaliacoes_locais WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}


@router.get("/locais/{local_id}/avaliacoes", response_model=AvaliacaoListResponse)
async def listar_avaliacoes(
    local_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text(
        """
        SELECT a.*, u.name as user_nome FROM avaliacoes a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.local_id = :local_id ORDER BY a.created_at DESC
    """
    )
    result = await db.execute(query, {"local_id": local_id})
    rows = result.fetchall()
    items = [
        AvaliacaoResponse(
            id=r.id,
            local_id=r.local_id,
            user_id=r.user_id,
            nota=r.nota,
            comentario=r.comentario,
            user_nome=r.user_nome,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return AvaliacaoListResponse(items=items, total=len(items))


@router.post("", response_model=AvaliacaoResponse, status_code=status.HTTP_201_CREATED)
async def criar_avaliacao(
    dados: AvaliacaoCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    if dados.nota < 1 or dados.nota > 5:
        raise HTTPException(status_code=400, detail="Nota deve ser entre 1 e 5")
    query = text(
        """
        INSERT INTO avaliacoes (local_id, user_id, nota, comentario, tenant_id, created_at)
        VALUES (:local_id, :user_id, :nota, :comentario, :tenant_id, NOW()) RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "local_id": dados.local_id,
            "user_id": user_id,
            "nota": dados.nota,
            "comentario": dados.comentario,
            "tenant_id": tenant_id,
        },
    )
    await db.commit()
    r = result.fetchone()
    return AvaliacaoResponse(
        id=r.id,
        local_id=r.local_id,
        user_id=r.user_id,
        nota=r.nota,
        comentario=r.comentario,
        user_nome=None,
        created_at=r.created_at,
    )


@router.delete("/{id}")
async def excluir_avaliacao(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM avaliacoes WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}
