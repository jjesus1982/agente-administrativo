"""
Endpoints de Reservas de Áreas Comuns
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter(prefix="/reservas", tags=["Reservas"])


class ReservaCreate(BaseModel):
    area_id: int
    date: date
    start_time: str
    end_time: str
    event_name: Optional[str] = None
    expected_guests: Optional[int] = None


@router.get("/areas")
async def list_areas(tenant_id: int = Query(1), db: AsyncSession = Depends(get_db)):
    """Lista áreas comuns disponíveis"""
    result = await db.execute(
        text(
            """
        SELECT id, name, description, location, capacity, rules,
               available_from, available_until, available_days,
               reservation_fee, deposit_amount, photos, is_active
        FROM common_areas
        WHERE tenant_id = :tid AND is_active = true
        ORDER BY name
    """
        ),
        {"tid": tenant_id},
    )

    items = [dict(row._mapping) for row in result.fetchall()]
    return {"items": items, "total": len(items)}


@router.get("/calendario/{area_id}")
async def get_calendario(
    area_id: int,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2024),
    tenant_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
):
    """Retorna reservas do mês para uma área"""
    result = await db.execute(
        text(
            """
        SELECT r.id, r.date, r.start_time, r.end_time, r.status, r.event_name,
               u.name as user_name, un.block, un.number as unit_number
        FROM reservations r
        JOIN users u ON u.id = r.user_id
        LEFT JOIN units un ON un.id = r.unit_id
        WHERE r.area_id = :area_id 
          AND r.tenant_id = :tid
          AND EXTRACT(MONTH FROM r.date) = :month
          AND EXTRACT(YEAR FROM r.date) = :year
          AND r.status != 'cancelled'
        ORDER BY r.date, r.start_time
    """
        ),
        {"area_id": area_id, "tid": tenant_id, "month": month, "year": year},
    )

    reservas = [dict(row._mapping) for row in result.fetchall()]

    dias_ocupados = {}
    for r in reservas:
        data_str = str(r["date"])
        if data_str not in dias_ocupados:
            dias_ocupados[data_str] = []
        dias_ocupados[data_str].append(
            {
                "id": r["id"],
                "start_time": str(r["start_time"])[:5],
                "end_time": str(r["end_time"])[:5],
                "user_name": r["user_name"],
                "unit": f"{r['block'] or ''} {r['unit_number'] or ''}".strip(),
                "event_name": r["event_name"],
                "status": r["status"],
            }
        )

    return {"area_id": area_id, "month": month, "year": year, "dias_ocupados": dias_ocupados}


@router.post("/")
async def create_reserva(
    data: ReservaCreate,
    user_id: int = Query(...),
    unit_id: int = Query(...),
    tenant_id: int = Query(1),
    db: AsyncSession = Depends(get_db),
):
    """Cria uma nova reserva"""

    # Verificar se a data já está ocupada
    check = await db.execute(
        text(
            """
        SELECT id FROM reservations 
        WHERE area_id = :area_id AND date = :dt AND status != 'cancelled' AND tenant_id = :tid
    """
        ),
        {"area_id": data.area_id, "dt": data.date, "tid": tenant_id},
    )

    if check.fetchone():
        raise HTTPException(status_code=400, detail="Esta data já está reservada")

    # Verificar se usuário já tem reserva no mesmo mês
    check_user = await db.execute(
        text(
            """
        SELECT id FROM reservations 
        WHERE user_id = :uid AND area_id = :area_id 
          AND EXTRACT(MONTH FROM date) = :month
          AND EXTRACT(YEAR FROM date) = :year
          AND status != 'cancelled'
          AND tenant_id = :tid
    """
        ),
        {"uid": user_id, "area_id": data.area_id, "month": data.date.month, "year": data.date.year, "tid": tenant_id},
    )

    if check_user.fetchone():
        raise HTTPException(status_code=400, detail="Você já tem uma reserva nesta área este mês")

    # Criar reserva - usar CAST para converter string para time
    result = await db.execute(
        text(
            """
        INSERT INTO reservations (area_id, unit_id, user_id, date, start_time, end_time, 
                                  event_name, expected_guests, status, tenant_id, created_at)
        VALUES (:area_id, :unit_id, :user_id, :dt, CAST(:start_time AS time), CAST(:end_time AS time),
                :event_name, :expected_guests, 'confirmed', :tid, NOW())
        RETURNING id
    """
        ),
        {
            "area_id": data.area_id,
            "unit_id": unit_id,
            "user_id": user_id,
            "dt": data.date,
            "start_time": data.start_time,
            "end_time": data.end_time,
            "event_name": data.event_name,
            "expected_guests": data.expected_guests,
            "tid": tenant_id,
        },
    )
    await db.commit()

    new_id = result.scalar()
    return {"id": new_id, "message": "Reserva confirmada com sucesso!"}


@router.get("/minhas")
async def minhas_reservas(user_id: int = Query(...), tenant_id: int = Query(1), db: AsyncSession = Depends(get_db)):
    """Lista reservas do usuário"""
    result = await db.execute(
        text(
            """
        SELECT r.id, r.date, r.start_time, r.end_time, r.status, r.event_name, r.created_at,
               ca.name as area_name
        FROM reservations r
        JOIN common_areas ca ON ca.id = r.area_id
        WHERE r.user_id = :uid AND r.tenant_id = :tid
        ORDER BY r.date DESC
        LIMIT 20
    """
        ),
        {"uid": user_id, "tid": tenant_id},
    )

    items = []
    for row in result.fetchall():
        r = dict(row._mapping)
        r["date"] = str(r["date"])
        r["start_time"] = str(r["start_time"])[:5]
        r["end_time"] = str(r["end_time"])[:5]
        r["created_at"] = str(r["created_at"])
        items.append(r)

    return {"items": items}


@router.delete("/{reserva_id}")
async def cancel_reserva(
    reserva_id: int, user_id: int = Query(...), tenant_id: int = Query(1), db: AsyncSession = Depends(get_db)
):
    """Cancela uma reserva"""
    check = await db.execute(
        text(
            """
        SELECT id, date FROM reservations WHERE id = :id AND user_id = :uid AND tenant_id = :tid
    """
        ),
        {"id": reserva_id, "uid": user_id, "tid": tenant_id},
    )

    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Reserva não encontrada")

    await db.execute(
        text(
            """
        UPDATE reservations SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_id = :uid
        WHERE id = :id
    """
        ),
        {"id": reserva_id, "uid": user_id},
    )
    await db.commit()

    return {"message": "Reserva cancelada"}
