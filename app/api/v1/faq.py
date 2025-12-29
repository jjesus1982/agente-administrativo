"""
API de Perguntas Frequentes (FAQ)
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/faq", tags=["Perguntas Frequentes"])


class FAQBase(BaseModel):
    pergunta: str
    resposta: str
    categoria: Optional[str] = None


class FAQCreate(FAQBase):
    pass


class FAQResponse(FAQBase):
    id: int
    ordem: int
    ativo: bool
    visualizacoes: int
    created_at: datetime

    class Config:
        from_attributes = True


class FAQListResponse(BaseModel):
    items: List[FAQResponse]
    total: int


@router.get("", response_model=FAQListResponse)
async def listar_faq(
    categoria: Optional[str] = None,
    busca: Optional[str] = None,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    query = text("SELECT * FROM faq WHERE tenant_id = :tenant_id AND ativo = TRUE ORDER BY ordem, created_at DESC")
    result = await db.execute(query, {"tenant_id": tenant_id})
    rows = result.fetchall()

    items = []
    for r in rows:
        items.append(
            FAQResponse(
                id=r.id,
                pergunta=r.pergunta,
                resposta=r.resposta,
                categoria=r.categoria,
                ordem=r.ordem,
                ativo=r.ativo,
                visualizacoes=r.visualizacoes,
                created_at=r.created_at,
            )
        )

    return FAQListResponse(items=items, total=len(items))


@router.post("", response_model=FAQResponse)
async def criar_faq(
    dados: FAQCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text(
            """
        INSERT INTO faq (pergunta, resposta, categoria, tenant_id, ativo, ordem, visualizacoes, created_at)
        VALUES (:pergunta, :resposta, :categoria, :tenant_id, TRUE, 0, 0, NOW())
        RETURNING *
    """
        ),
        {"pergunta": dados.pergunta, "resposta": dados.resposta, "categoria": dados.categoria, "tenant_id": tenant_id},
    )
    await db.commit()
    r = result.fetchone()
    return FAQResponse(
        id=r.id,
        pergunta=r.pergunta,
        resposta=r.resposta,
        categoria=r.categoria,
        ordem=r.ordem,
        ativo=r.ativo,
        visualizacoes=r.visualizacoes,
        created_at=r.created_at,
    )
