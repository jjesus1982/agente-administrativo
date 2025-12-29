"""
Endpoints de veículos
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter(prefix="/vehicles", tags=["Veículos"])


class VehicleCreate(BaseModel):
    owner_id: int
    unit_id: Optional[int] = None
    plate: str
    model: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[str] = "carro"
    tag_number: Optional[str] = None
    remote_number: Optional[str] = None


class VehicleUpdate(BaseModel):
    owner_id: Optional[int] = None
    unit_id: Optional[int] = None
    plate: Optional[str] = None
    model: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[str] = None
    tag_number: Optional[str] = None
    remote_number: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_vehicles(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista veículos com paginação"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["v.tenant_id = :tid"]

    if search:
        where_clauses.append("(v.plate ILIKE :search OR v.model ILIKE :search OR owner.name ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM vehicles v LEFT JOIN users owner ON owner.id = v.owner_id WHERE {where_sql}"),
        params,
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT v.*, 
            owner.name as owner_name,
            owner.phone as owner_phone,
            u.block, u.number as unit_number
        FROM vehicles v
        LEFT JOIN users owner ON owner.id = v.owner_id
        LEFT JOIN units u ON u.id = v.unit_id
        WHERE {where_sql}
        ORDER BY v.plate
        LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": total, "page": page}


@router.get("/{vehicle_id}")
async def get_vehicle(
    vehicle_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Obtém um veículo pelo ID"""
    result = await db.execute(
        text(
            """
        SELECT v.*, owner.name as owner_name, u.block, u.number as unit_number
        FROM vehicles v
        LEFT JOIN users owner ON owner.id = v.owner_id
        LEFT JOIN units u ON u.id = v.unit_id
        WHERE v.id = :id AND v.tenant_id = :tid
    """
        ),
        {"id": vehicle_id, "tid": tenant_id},
    )

    vehicle = result.fetchone()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    return dict(vehicle._mapping)


@router.post("/")
async def create_vehicle(
    data: VehicleCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Cria um novo veículo"""
    # Verificar se placa já existe
    existing = await db.execute(
        text(
            """
        SELECT id FROM vehicles WHERE plate = :plate AND tenant_id = :tid
    """
        ),
        {"plate": data.plate.upper(), "tid": tenant_id},
    )
    if existing.fetchone():
        raise HTTPException(status_code=400, detail="Placa já cadastrada")

    result = await db.execute(
        text(
            """
        INSERT INTO vehicles (owner_id, unit_id, plate, model, brand, color, year, vehicle_type, tag_number, remote_number, is_active, tenant_id, created_at)
        VALUES (:owner_id, :unit_id, :plate, :model, :brand, :color, :year, :vehicle_type, :tag_number, :remote_number, true, :tid, NOW())
        RETURNING id
    """
        ),
        {
            "owner_id": data.owner_id,
            "unit_id": data.unit_id,
            "plate": data.plate.upper(),
            "model": data.model,
            "brand": data.brand,
            "color": data.color,
            "year": data.year,
            "vehicle_type": data.vehicle_type,
            "tag_number": data.tag_number,
            "remote_number": data.remote_number,
            "tid": tenant_id,
        },
    )
    await db.commit()
    new_id = result.scalar()
    return {"id": new_id, "message": "Veículo criado com sucesso"}


@router.put("/{vehicle_id}")
async def update_vehicle(
    vehicle_id: int,
    data: VehicleUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza um veículo"""
    updates = []
    params = {"id": vehicle_id, "tid": tenant_id}

    for field, value in data.dict(exclude_unset=True).items():
        if value is not None:
            if field == "plate":
                value = value.upper()
            updates.append(f"{field} = :{field}")
            params[field] = value

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates.append("updated_at = NOW()")

    await db.execute(
        text(
            f"""
        UPDATE vehicles SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        params,
    )
    await db.commit()

    return {"message": "Veículo atualizado com sucesso"}


@router.delete("/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Remove um veículo"""
    await db.execute(
        text(
            """
        UPDATE vehicles SET is_active = false, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": vehicle_id, "tid": tenant_id},
    )
    await db.commit()
    return {"message": "Veículo removido com sucesso"}
