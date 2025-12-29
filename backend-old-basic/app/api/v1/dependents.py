"""
Endpoints de dependentes
"""

from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter(prefix="/dependents", tags=["Dependentes"])


class DependentCreate(BaseModel):
    responsible_id: int
    unit_id: Optional[int] = None
    name: str
    cpf: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    relationship_type: Optional[str] = None
    can_access_alone: Optional[bool] = True
    has_special_needs: Optional[bool] = False
    special_needs_description: Optional[str] = None


class DependentUpdate(BaseModel):
    responsible_id: Optional[int] = None
    unit_id: Optional[int] = None
    name: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    relationship_type: Optional[str] = None
    can_access_alone: Optional[bool] = None
    has_special_needs: Optional[bool] = None
    special_needs_description: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_dependents(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    relationship: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """Lista dependentes com paginação"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["d.tenant_id = :tid"]

    if search:
        where_clauses.append("(d.name ILIKE :search OR d.cpf ILIKE :search OR responsible.name ILIKE :search)")
        params["search"] = f"%{search}%"

    if relationship:
        where_clauses.append("d.relationship_type = :relationship")
        params["relationship"] = relationship

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(
        text(
            f"SELECT COUNT(*) FROM dependents d LEFT JOIN users responsible ON responsible.id = d.responsible_id WHERE {where_sql}"
        ),
        params,
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT d.*, 
            responsible.name as responsible_name,
            u.block, u.number as unit_number,
            EXTRACT(YEAR FROM AGE(NOW(), d.birth_date))::int as age
        FROM dependents d
        LEFT JOIN users responsible ON responsible.id = d.responsible_id
        LEFT JOIN units u ON u.id = d.unit_id
        WHERE {where_sql}
        ORDER BY d.name
        LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": total, "page": page}


@router.get("/{dependent_id}")
async def get_dependent(
    dependent_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Obtém um dependente pelo ID"""
    result = await db.execute(
        text(
            """
        SELECT d.*, responsible.name as responsible_name, u.block, u.number as unit_number
        FROM dependents d
        LEFT JOIN users responsible ON responsible.id = d.responsible_id
        LEFT JOIN units u ON u.id = d.unit_id
        WHERE d.id = :id AND d.tenant_id = :tid
    """
        ),
        {"id": dependent_id, "tid": tenant_id},
    )

    dependent = result.fetchone()
    if not dependent:
        raise HTTPException(status_code=404, detail="Dependente não encontrado")

    return dict(dependent._mapping)


@router.post("/")
async def create_dependent(
    data: DependentCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Cria um novo dependente"""
    result = await db.execute(
        text(
            """
        INSERT INTO dependents (responsible_id, unit_id, name, cpf, rg, birth_date, gender, phone, email, relationship_type, can_access_alone, has_special_needs, special_needs_description, is_active, tenant_id, created_at)
        VALUES (:responsible_id, :unit_id, :name, :cpf, :rg, :birth_date, :gender, :phone, :email, :relationship_type, :can_access_alone, :has_special_needs, :special_needs_description, true, :tid, NOW())
        RETURNING id
    """
        ),
        {
            "responsible_id": data.responsible_id,
            "unit_id": data.unit_id,
            "name": data.name,
            "cpf": data.cpf,
            "rg": data.rg,
            "birth_date": data.birth_date,
            "gender": data.gender,
            "phone": data.phone,
            "email": data.email,
            "relationship_type": data.relationship_type,
            "can_access_alone": data.can_access_alone,
            "has_special_needs": data.has_special_needs,
            "special_needs_description": data.special_needs_description,
            "tid": tenant_id,
        },
    )
    await db.commit()
    new_id = result.scalar()
    return {"id": new_id, "message": "Dependente criado com sucesso"}


@router.put("/{dependent_id}")
async def update_dependent(
    dependent_id: int,
    data: DependentUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza um dependente"""
    updates = []
    params = {"id": dependent_id, "tid": tenant_id}

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
        UPDATE dependents SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        params,
    )
    await db.commit()

    return {"message": "Dependente atualizado com sucesso"}


@router.delete("/{dependent_id}")
async def delete_dependent(
    dependent_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Remove um dependente"""
    await db.execute(
        text(
            """
        UPDATE dependents SET is_active = false, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": dependent_id, "tid": tenant_id},
    )
    await db.commit()
    return {"message": "Dependente removido com sucesso"}
