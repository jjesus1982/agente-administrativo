"""
Endpoints de pets
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter(prefix="/pets", tags=["Pets"])


class PetCreate(BaseModel):
    owner_id: int
    unit_id: Optional[int] = None
    name: str
    species: str
    breed: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    microchip: Optional[str] = None
    vaccinated: Optional[bool] = False
    neutered: Optional[bool] = False
    observations: Optional[str] = None


class PetUpdate(BaseModel):
    owner_id: Optional[int] = None
    unit_id: Optional[int] = None
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    microchip: Optional[str] = None
    vaccinated: Optional[bool] = None
    neutered: Optional[bool] = None
    observations: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_pets(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    species: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista pets com paginação"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["p.tenant_id = :tid"]

    if search:
        where_clauses.append("(p.name ILIKE :search OR p.breed ILIKE :search OR owner.name ILIKE :search)")
        params["search"] = f"%{search}%"

    if species:
        where_clauses.append("p.species = :species")
        params["species"] = species

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM pets p LEFT JOIN users owner ON owner.id = p.owner_id WHERE {where_sql}"), params
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT p.*, 
            owner.name as owner_name,
            u.block, u.number as unit_number,
            EXTRACT(YEAR FROM AGE(NOW(), p.birth_date))::int as age
        FROM pets p
        LEFT JOIN users owner ON owner.id = p.owner_id
        LEFT JOIN units u ON u.id = p.unit_id
        WHERE {where_sql}
        ORDER BY p.name
        LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": total, "page": page}


@router.get("/{pet_id}")
async def get_pet(
    pet_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Obtém um pet pelo ID"""
    result = await db.execute(
        text(
            """
        SELECT p.*, owner.name as owner_name, u.block, u.number as unit_number
        FROM pets p
        LEFT JOIN users owner ON owner.id = p.owner_id
        LEFT JOIN units u ON u.id = p.unit_id
        WHERE p.id = :id AND p.tenant_id = :tid
    """
        ),
        {"id": pet_id, "tid": tenant_id},
    )

    pet = result.fetchone()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet não encontrado")

    return dict(pet._mapping)


@router.post("/")
async def create_pet(
    data: PetCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Cria um novo pet"""
    result = await db.execute(
        text(
            """
        INSERT INTO pets (owner_id, unit_id, name, species, breed, color, size, birth_date, gender, microchip, vaccinated, neutered, observations, is_active, tenant_id, created_at)
        VALUES (:owner_id, :unit_id, :name, :species, :breed, :color, :size, :birth_date, :gender, :microchip, :vaccinated, :neutered, :observations, true, :tid, NOW())
        RETURNING id
    """
        ),
        {
            "owner_id": data.owner_id,
            "unit_id": data.unit_id,
            "name": data.name,
            "species": data.species,
            "breed": data.breed,
            "color": data.color,
            "size": data.size,
            "birth_date": data.birth_date,
            "gender": data.gender,
            "microchip": data.microchip,
            "vaccinated": data.vaccinated,
            "neutered": data.neutered,
            "observations": data.observations,
            "tid": tenant_id,
        },
    )
    await db.commit()
    new_id = result.scalar()
    return {"id": new_id, "message": "Pet criado com sucesso"}


@router.put("/{pet_id}")
async def update_pet(
    pet_id: int,
    data: PetUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza um pet"""
    updates = []
    params = {"id": pet_id, "tid": tenant_id}

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
        UPDATE pets SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        params,
    )
    await db.commit()

    return {"message": "Pet atualizado com sucesso"}


@router.delete("/{pet_id}")
async def delete_pet(
    pet_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Remove um pet"""
    await db.execute(
        text(
            """
        UPDATE pets SET is_active = false, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": pet_id, "tid": tenant_id},
    )
    await db.commit()
    return {"message": "Pet removido com sucesso"}
