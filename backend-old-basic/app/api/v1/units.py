"""
Endpoints de unidades
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter(prefix="/units", tags=["Unidades"])


# Schemas
class UnitCreate(BaseModel):
    block: Optional[str] = None
    number: str
    floor: Optional[int] = None
    unit_type: Optional[str] = None
    area: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking_spots: Optional[int] = None
    owner_id: Optional[int] = None
    is_rented: Optional[bool] = False


class UnitUpdate(BaseModel):
    block: Optional[str] = None
    number: Optional[str] = None
    floor: Optional[int] = None
    unit_type: Optional[str] = None
    area: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking_spots: Optional[int] = None
    owner_id: Optional[int] = None
    is_rented: Optional[bool] = None
    is_active: Optional[bool] = None


class UnitResponse(BaseModel):
    id: int
    block: Optional[str]
    number: str
    floor: Optional[int]
    unit_type: Optional[str]
    area: Optional[float]
    bedrooms: Optional[int]
    bathrooms: Optional[int]
    parking_spots: Optional[int]
    owner_id: Optional[int]
    owner_name: Optional[str] = None
    is_rented: Optional[bool]
    is_active: Optional[bool]
    resident_count: Optional[int] = 0
    created_at: Optional[datetime]


@router.get("/")
async def list_units(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista unidades com paginação"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["u.tenant_id = :tid"]

    if search:
        where_clauses.append("(u.block ILIKE :search OR u.number ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM units u WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT u.*, 
            owner.name as owner_name,
            (SELECT COUNT(*) FROM unit_residents ur WHERE ur.unit_id = u.id) as resident_count
        FROM units u
        LEFT JOIN users owner ON owner.id = u.owner_id
        WHERE {where_sql}
        ORDER BY u.block, u.number
        LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": total, "page": page}


@router.get("/{unit_id}")
async def get_unit(
    unit_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Obtém uma unidade pelo ID"""
    result = await db.execute(
        text(
            """
        SELECT u.*, owner.name as owner_name
        FROM units u
        LEFT JOIN users owner ON owner.id = u.owner_id
        WHERE u.id = :id AND u.tenant_id = :tid
    """
        ),
        {"id": unit_id, "tid": tenant_id},
    )

    unit = result.fetchone()
    if not unit:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    return dict(unit._mapping)


@router.post("/")
async def create_unit(
    data: UnitCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Cria uma nova unidade"""
    result = await db.execute(
        text(
            """
        INSERT INTO units (block, number, floor, unit_type, area, bedrooms, bathrooms, parking_spots, owner_id, is_rented, is_active, tenant_id, created_at)
        VALUES (:block, :number, :floor, :unit_type, :area, :bedrooms, :bathrooms, :parking_spots, :owner_id, :is_rented, true, :tid, NOW())
        RETURNING id
    """
        ),
        {
            "block": data.block,
            "number": data.number,
            "floor": data.floor,
            "unit_type": data.unit_type,
            "area": data.area,
            "bedrooms": data.bedrooms,
            "bathrooms": data.bathrooms,
            "parking_spots": data.parking_spots,
            "owner_id": data.owner_id,
            "is_rented": data.is_rented,
            "tid": tenant_id,
        },
    )
    await db.commit()
    new_id = result.scalar()
    return {"id": new_id, "message": "Unidade criada com sucesso"}


@router.put("/{unit_id}")
async def update_unit(
    unit_id: int,
    data: UnitUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza uma unidade"""
    updates = []
    params = {"id": unit_id, "tid": tenant_id}

    for field, value in data.dict(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates.append("updated_at = NOW()")

    await db.execute(
        text(
            f"""
        UPDATE units SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        params,
    )
    await db.commit()

    return {"message": "Unidade atualizada com sucesso"}


@router.delete("/{unit_id}")
async def delete_unit(
    unit_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Remove uma unidade"""
    await db.execute(
        text(
            """
        UPDATE units SET is_active = false, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": unit_id, "tid": tenant_id},
    )
    await db.commit()
    return {"message": "Unidade removida com sucesso"}
