"""
API de Achados e Perdidos
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import UPLOAD_BASE_DIR
from app.database import get_db

router = APIRouter(prefix="/achados-perdidos", tags=["Achados e Perdidos"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "achados")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# Schemas
class AchadoBase(BaseModel):
    description: str
    category: Optional[str] = None
    location_found: Optional[str] = None
    notes: Optional[str] = None


class AchadoCreate(AchadoBase):
    found_by_name: Optional[str] = None


class AchadoResponse(AchadoBase):
    id: int
    photo_url: Optional[str] = None
    status: Optional[str] = None
    found_at: datetime
    found_by_id: Optional[int] = None
    found_by_name: Optional[str] = None
    claimed_at: Optional[datetime] = None
    claimed_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class AchadoListResponse(BaseModel):
    items: List[AchadoResponse]
    total: int


@router.get("", response_model=AchadoListResponse)
async def listar_achados(
    status: Optional[str] = None,
    category: Optional[str] = None,
    busca: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text

    query = text(
        """
        SELECT * FROM lost_found 
        WHERE tenant_id = :tenant_id
        ORDER BY found_at DESC
        LIMIT :limit OFFSET :offset
    """
    )
    result = await db.execute(query, {"tenant_id": tenant_id, "limit": limit, "offset": (page - 1) * limit})
    rows = result.fetchall()

    count_result = await db.execute(
        text("SELECT COUNT(*) FROM lost_found WHERE tenant_id = :tenant_id"), {"tenant_id": tenant_id}
    )
    total = count_result.scalar() or 0

    items = [
        AchadoResponse(
            id=r.id,
            description=r.description,
            category=r.category,
            location_found=r.location_found,
            photo_url=r.photo_url,
            status=r.status,
            found_at=r.found_at,
            found_by_id=r.found_by_id,
            found_by_name=r.found_by_name,
            claimed_at=r.claimed_at,
            claimed_by_name=r.claimed_by_name,
            notes=r.notes,
        )
        for r in rows
    ]

    return AchadoListResponse(items=items, total=total)


@router.post("", response_model=AchadoResponse, status_code=status.HTTP_201_CREATED)
async def criar_achado(
    dados: AchadoCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text

    query = text(
        """
        INSERT INTO lost_found (description, category, location_found, notes, found_by_name, found_by_id, found_at, status, tenant_id)
        VALUES (:description, :category, :location_found, :notes, :found_by_name, :found_by_id, NOW(), 'encontrado', :tenant_id)
        RETURNING *
    """
    )
    result = await db.execute(
        query,
        {
            "description": dados.description,
            "category": dados.category,
            "location_found": dados.location_found,
            "notes": dados.notes,
            "found_by_name": dados.found_by_name,
            "found_by_id": user_id,
            "tenant_id": tenant_id,
        },
    )
    await db.commit()
    r = result.fetchone()
    return AchadoResponse(
        id=r.id,
        description=r.description,
        category=r.category,
        location_found=r.location_found,
        photo_url=r.photo_url,
        status=r.status,
        found_at=r.found_at,
        found_by_id=r.found_by_id,
        found_by_name=r.found_by_name,
        claimed_at=r.claimed_at,
        claimed_by_name=r.claimed_by_name,
        notes=r.notes,
    )


@router.post("/{id}/imagem")
async def upload_imagem(id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    url = f"/uploads/achados/{filename}"
    await db.execute(text("UPDATE lost_found SET photo_url = :url WHERE id = :id"), {"url": url, "id": id})
    await db.commit()
    return {"url": url}


@router.post("/{id}/encerrar")
async def encerrar_achado(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import text

    await db.execute(text("UPDATE lost_found SET status = 'encerrado', claimed_at = NOW() WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Encerrado com sucesso"}


@router.delete("/{id}")
async def excluir_achado(
    id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import text

    await db.execute(text("DELETE FROM lost_found WHERE id = :id"), {"id": id})
    await db.commit()
    return {"message": "Excluído com sucesso"}
