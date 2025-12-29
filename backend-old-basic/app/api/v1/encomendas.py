"""
Smart Logistics - Módulo de Encomendas
Dashboard logístico inteligente para portaria
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.services.notification_hooks import DeliveryNotifications

router = APIRouter(prefix="/encomendas", tags=["Encomendas"])

UPLOAD_DIR = os.environ.get(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads", "encomendas"),
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


class EncomendaCreate(BaseModel):
    unit_id: int
    recipient_name: str
    tracking_code: Optional[str] = None
    carrier: str
    description: Optional[str] = None
    storage_location: Optional[str] = None
    is_perishable: bool = False
    is_fragile: bool = False
    notes: Optional[str] = None


class EncomendaDeliver(BaseModel):
    delivered_to: str


class EncomendaUpdate(BaseModel):
    storage_location: Optional[str] = None
    notes: Optional[str] = None
    is_perishable: Optional[bool] = None


@router.get("")
async def list_encomendas(
    tenant_id: int = Query(1, description="ID do condomínio"),
    status: Optional[str] = None,
    search: Optional[str] = None,
    unit_id: Optional[int] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Lista encomendas com filtros"""
    query = """
        SELECT e.*, u.block, u.number as unit_number,
               ur.name as received_by_name
        FROM packages e
        LEFT JOIN units u ON e.unit_id = u.id
        LEFT JOIN users ur ON e.received_by = ur.id
        WHERE e.tenant_id = :tid
    """
    params = {"tid": tenant_id}

    if status:
        if status == "pending_all":
            query += " AND e.status IN ('pending', 'notified')"
        else:
            query += " AND e.status = :status"
            params["status"] = status

    if search:
        query += """ AND (
            e.recipient_name ILIKE :search OR 
            e.tracking_code ILIKE :search OR
            u.number ILIKE :search OR
            e.carrier ILIKE :search
        )"""
        params["search"] = f"%{search}%"

    if unit_id:
        query += " AND e.unit_id = :unit_id"
        params["unit_id"] = unit_id

    query += " ORDER BY e.status ASC, e.received_at DESC LIMIT :limit"
    params["limit"] = limit

    result = await db.execute(text(query), params)
    encomendas = [dict(row._mapping) for row in result.fetchall()]

    # Stats
    stats = await db.execute(
        text(
            """
        SELECT 
            COUNT(*) FILTER (WHERE status IN ('pending', 'notified')) as pending,
            COUNT(*) FILTER (WHERE status = 'pending' AND received_at < NOW() - INTERVAL '3 days') as overdue,
            COUNT(*) FILTER (WHERE is_perishable AND status IN ('pending', 'notified')) as perishable,
            COUNT(*) FILTER (WHERE status = 'delivered' AND delivered_at > NOW() - INTERVAL '24 hours') as delivered_today,
            COUNT(*) as total
        FROM packages WHERE tenant_id = :tid
    """
        ),
        {"tid": tenant_id},
    )

    return {"encomendas": encomendas, "stats": dict(stats.fetchone()._mapping)}


@router.get("/stats")
async def get_stats(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    """Estatísticas do dashboard"""
    result = await db.execute(
        text(
            """
        SELECT 
            COUNT(*) FILTER (WHERE status IN ('pending', 'notified')) as pending,
            COUNT(*) FILTER (WHERE status = 'pending' AND received_at < NOW() - INTERVAL '3 days') as overdue,
            COUNT(*) FILTER (WHERE is_perishable AND status IN ('pending', 'notified')) as perishable,
            COUNT(*) FILTER (WHERE status = 'delivered' AND delivered_at > NOW() - INTERVAL '24 hours') as delivered_today,
            COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
            COUNT(*) as total,
            AVG(EXTRACT(EPOCH FROM (delivered_at - received_at))/3600) FILTER (WHERE status = 'delivered') as avg_hours
        FROM packages WHERE tenant_id = :tid
    """
        ),
        {"tid": tenant_id},
    )

    return dict(result.fetchone()._mapping)


@router.get("/{encomenda_id}")
async def get_encomenda(
    encomenda_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Detalhes de uma encomenda"""
    result = await db.execute(
        text(
            """
        SELECT e.*, u.block, u.number as unit_number,
               ur.name as received_by_name,
               ud.name as delivered_by_name
        FROM packages e
        LEFT JOIN units u ON e.unit_id = u.id
        LEFT JOIN users ur ON e.received_by = ur.id
        LEFT JOIN users ud ON e.delivered_by = ud.id
        WHERE e.id = :id AND e.tenant_id = :tid
    """
        ),
        {"id": encomenda_id, "tid": tenant_id},
    )

    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")

    return dict(row._mapping)


@router.post("")
async def create_encomenda(
    data: EncomendaCreate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Registrar nova encomenda"""
    result = await db.execute(
        text(
            """
        INSERT INTO packages (
            tenant_id, unit_id, recipient_name, tracking_code, carrier,
            description, storage_location, is_perishable, is_fragile, notes, received_by
        ) VALUES (
            :tid, :unit_id, :recipient_name, :tracking_code, :carrier,
            :description, :storage_location, :is_perishable, :is_fragile, :notes, 1
        ) RETURNING id
    """
        ),
        {
            "tid": tenant_id,
            "unit_id": data.unit_id,
            "recipient_name": data.recipient_name,
            "tracking_code": data.tracking_code,
            "carrier": data.carrier,
            "description": data.description,
            "storage_location": data.storage_location,
            "is_perishable": data.is_perishable,
            "is_fragile": data.is_fragile,
            "notes": data.notes,
        },
    )

    encomenda_id = result.scalar()
    await db.commit()

    # Disparar notificação para o morador
    await DeliveryNotifications.on_arrive(
        db,
        tenant_id,
        {"id": encomenda_id, "unit_id": data.unit_id, "carrier": data.carrier, "recipient_name": data.recipient_name},
    )

    return {"id": encomenda_id, "message": "Encomenda registrada com sucesso"}


@router.post("/{encomenda_id}/deliver")
async def deliver_encomenda(
    encomenda_id: int,
    data: EncomendaDeliver,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Marcar encomenda como entregue"""
    await db.execute(
        text(
            """
        UPDATE packages SET 
            status = 'delivered',
            delivered_at = NOW(),
            delivered_to = :delivered_to,
            delivered_by = 1,
            updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": encomenda_id, "delivered_to": data.delivered_to, "tid": tenant_id},
    )

    await db.commit()
    return {"success": True, "message": "Encomenda entregue com sucesso"}


@router.post("/{encomenda_id}/notify")
async def notify_recipient(
    encomenda_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Notificar morador sobre encomenda"""
    # Buscar dados da encomenda para a notificação
    result = await db.execute(
        text(
            """
        SELECT e.unit_id, e.carrier, e.recipient_name, e.storage_location
        FROM packages e WHERE e.id = :id AND e.tenant_id = :tid
    """
        ),
        {"id": encomenda_id, "tid": tenant_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Encomenda não encontrada")

    await db.execute(
        text(
            """
        UPDATE packages SET
            status = 'notified',
            notified_at = NOW(),
            notification_count = notification_count + 1,
            updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": encomenda_id, "tid": tenant_id},
    )

    await db.commit()

    # Enviar notificação para os moradores da unidade
    await DeliveryNotifications.on_notify(
        db,
        tenant_id,
        {
            "id": encomenda_id,
            "unit_id": row.unit_id,
            "carrier": row.carrier,
            "recipient_name": row.recipient_name,
            "storage_location": row.storage_location,
        },
    )

    return {"success": True, "message": "Morador notificado"}


@router.put("/{encomenda_id}")
async def update_encomenda(
    encomenda_id: int,
    data: EncomendaUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualizar informações da encomenda"""
    updates = []
    params = {"id": encomenda_id, "tid": tenant_id}

    if data.storage_location is not None:
        updates.append("storage_location = :storage_location")
        params["storage_location"] = data.storage_location
    if data.notes is not None:
        updates.append("notes = :notes")
        params["notes"] = data.notes
    if data.is_perishable is not None:
        updates.append("is_perishable = :is_perishable")
        params["is_perishable"] = data.is_perishable

    if updates:
        updates.append("updated_at = NOW()")
        await db.execute(
            text(
                f"""
            UPDATE packages SET {', '.join(updates)}
            WHERE id = :id AND tenant_id = :tid
        """
            ),
            params,
        )
        await db.commit()

    return {"success": True}


@router.post("/{encomenda_id}/photo")
async def upload_photo(
    encomenda_id: int,
    file: UploadFile = File(...),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Upload de foto da encomenda"""
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{encomenda_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    photo_url = f"/uploads/encomendas/{filename}"

    await db.execute(
        text(
            """
        UPDATE packages SET photo_url = :photo_url, updated_at = NOW()
        WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"photo_url": photo_url, "id": encomenda_id, "tid": tenant_id},
    )

    await db.commit()
    return {"photo_url": photo_url}


@router.delete("/{encomenda_id}")
async def delete_encomenda(
    encomenda_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Excluir encomenda (soft delete ou hard delete)"""
    await db.execute(
        text(
            """
        DELETE FROM packages WHERE id = :id AND tenant_id = :tid
    """
        ),
        {"id": encomenda_id, "tid": tenant_id},
    )

    await db.commit()
    return {"success": True}
