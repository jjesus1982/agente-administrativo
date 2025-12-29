"""
API de Anúncios/Comunicados
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/anuncios", tags=["Anúncios e Comunicados"])


class AnuncioBase(BaseModel):
    title: str
    content: str
    summary: Optional[str] = None
    category: Optional[str] = None
    priority: str = "normal"
    is_pinned: bool = False
    target_audience: str = "todos"
    send_push: bool = False
    send_email: bool = False
    allow_comments: bool = True


class AnuncioCreate(AnuncioBase):
    pass


class AnuncioResponse(AnuncioBase):
    id: int
    status: Optional[str] = None
    published_at: Optional[datetime] = None
    views_count: int = 0
    created_at: datetime
    created_by_nome: Optional[str] = None
    total_comentarios: int = 0

    class Config:
        from_attributes = True


class ComentarioBase(BaseModel):
    content: str


class ComentarioResponse(ComentarioBase):
    id: int
    user_id: int
    user_nome: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnuncioListResponse(BaseModel):
    items: List[AnuncioResponse]
    total: int


class ComentarioListResponse(BaseModel):
    items: List[ComentarioResponse]
    total: int


@router.get("", response_model=AnuncioListResponse)
async def listar_anuncios(
    tenant_id: int = Query(1, description="ID do condomínio"),
    status: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = text(
        """
        SELECT a.*, u.name as created_by_nome,
            (SELECT COUNT(*) FROM announcement_comments WHERE announcement_id = a.id) as total_comentarios
        FROM announcements a
        LEFT JOIN users u ON u.id = a.created_by_id
        WHERE a.tenant_id = :tenant_id
        ORDER BY a.is_pinned DESC, a.created_at DESC
        LIMIT :limit OFFSET :offset
    """
    )
    result = await db.execute(query, {"tenant_id": tenant_id, "limit": limit, "offset": (page - 1) * limit})
    rows = result.fetchall()

    count_result = await db.execute(
        text("SELECT COUNT(*) FROM announcements WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id}
    )
    total = count_result.scalar() or 0

    items = [
        AnuncioResponse(
            id=r.id,
            title=r.title,
            content=r.content,
            summary=r.summary,
            category=r.category,
            priority=r.priority,
            is_pinned=r.is_pinned,
            target_audience=r.target_audience,
            send_push=r.send_push,
            send_email=r.send_email,
            allow_comments=r.allow_comments,
            status=r.status,
            published_at=r.published_at,
            views_count=r.views_count or 0,
            created_at=r.created_at,
            created_by_nome=r.created_by_nome,
            total_comentarios=r.total_comentarios,
        )
        for r in rows
    ]
    return AnuncioListResponse(items=items, total=total)


@router.get("/{id}", response_model=AnuncioResponse)
async def obter_anuncio(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(
        text("UPDATE announcements SET views_count = COALESCE(views_count, 0) + 1 WHERE id = :id"), {"id": id}
    )
    await db.commit()

    query = text(
        """
        SELECT a.*, u.name as created_by_nome,
            (SELECT COUNT(*) FROM announcement_comments WHERE announcement_id = a.id) as total_comentarios
        FROM announcements a
        LEFT JOIN users u ON u.id = a.created_by_id
        WHERE a.id = :id
    """
    )
    result = await db.execute(query, {"id": id})
    r = result.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail="Anúncio não encontrado")
    return AnuncioResponse(
        id=r.id,
        title=r.title,
        content=r.content,
        summary=r.summary,
        category=r.category,
        priority=r.priority,
        is_pinned=r.is_pinned,
        target_audience=r.target_audience,
        send_push=r.send_push,
        send_email=r.send_email,
        allow_comments=r.allow_comments,
        status=r.status,
        published_at=r.published_at,
        views_count=r.views_count or 0,
        created_at=r.created_at,
        created_by_nome=r.created_by_nome,
        total_comentarios=r.total_comentarios,
    )


@router.post("", response_model=AnuncioResponse, status_code=status.HTTP_201_CREATED)
async def criar_anuncio(
    dados: AnuncioCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    query = text(
        """
        INSERT INTO announcements (title, content, summary, category, priority, is_pinned, target_audience,
            send_push, send_email, allow_comments, status, published_at, tenant_id, created_by_id, created_at, updated_at)
        VALUES (:title, :content, :summary, :category, :priority, :is_pinned, :target_audience,
            :send_push, :send_email, :allow_comments, 'publicado', NOW(), :tenant_id, :user_id, NOW(), NOW()) RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "title": dados.title,
            "content": dados.content,
            "summary": dados.summary,
            "category": dados.category,
            "priority": dados.priority,
            "is_pinned": dados.is_pinned,
            "target_audience": dados.target_audience,
            "send_push": dados.send_push,
            "send_email": dados.send_email,
            "allow_comments": dados.allow_comments,
            "tenant_id": tenant_id,
            "user_id": user_id,
        },
    )
    await db.commit()
    r = result.fetchone()
    return AnuncioResponse(
        id=r.id,
        title=r.title,
        content=r.content,
        summary=r.summary,
        category=r.category,
        priority=r.priority,
        is_pinned=r.is_pinned,
        target_audience=r.target_audience,
        send_push=r.send_push,
        send_email=r.send_email,
        allow_comments=r.allow_comments,
        status=r.status,
        published_at=r.published_at,
        views_count=r.views_count or 0,
        created_at=r.created_at,
        created_by_nome=None,
        total_comentarios=0,
    )


@router.put("/{id}/fixar")
async def fixar_anuncio(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("UPDATE announcements SET is_pinned = NOT is_pinned WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Status de fixação atualizado"}


@router.delete("/{id}")
async def excluir_anuncio(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM announcements WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}


@router.get("/{id}/comentarios", response_model=ComentarioListResponse)
async def listar_comentarios(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    query = text(
        """
        SELECT c.*, u.name as user_nome FROM announcement_comments c
        LEFT JOIN users u ON u.id = c.user_id
        WHERE c.announcement_id = :id ORDER BY c.created_at DESC
    """
    )
    result = await db.execute(query, {"id": id})
    rows = result.fetchall()
    items = [
        ComentarioResponse(
            id=r.id, content=r.content, user_id=r.user_id, user_nome=r.user_nome, created_at=r.created_at
        )
        for r in rows
    ]
    return ComentarioListResponse(items=items, total=len(items))


@router.post("/{id}/comentarios", response_model=ComentarioResponse, status_code=status.HTTP_201_CREATED)
async def criar_comentario(
    id: int,
    dados: ComentarioBase,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    query = text(
        """
        INSERT INTO announcement_comments (announcement_id, user_id, content, created_at)
        VALUES (:announcement_id, :user_id, :content, NOW()) RETURNING *
    """
    )
    result = await db.execute(query, {"announcement_id": id, "user_id": user_id, "content": dados.content})
    await db.commit()
    r = result.fetchone()
    return ComentarioResponse(id=r.id, content=r.content, user_id=r.user_id, user_nome=None, created_at=r.created_at)
