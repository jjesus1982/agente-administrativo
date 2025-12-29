"""
Centro de Comando de Eventos - Notificações Inteligentes
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db

router = APIRouter(prefix="/notifications", tags=["Notificações"])


class NotificationAction(BaseModel):
    notification_id: int
    action: str


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    priority INTEGER DEFAULT 3,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    actions JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_actioned BOOLEAN DEFAULT FALSE,
    actioned_at TIMESTAMP,
    snoozed_until TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, is_read, is_dismissed);
"""


@router.get("/setup")
async def setup_notifications(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(text(CREATE_TABLE_SQL))
    await db.commit()

    result = await db.execute(text("SELECT COUNT(*) FROM notifications WHERE tenant_id = :tid"), {"tid": tenant_id})
    count = result.scalar()

    if count == 0:
        samples = [
            (
                "access",
                "urgent",
                1,
                "Acesso não autorizado",
                "Tentativa de acesso Bloco B às 03:42",
                "shield-alert",
                "#ef4444",
                '[{"label":"Ver câmeras","action":"view","style":"primary"}]',
            ),
            (
                "maintenance",
                "urgent",
                1,
                "Vazamento - Bloco A",
                "Apt 301 reportou vazamento no teto",
                "droplets",
                "#3b82f6",
                '[{"label":"Acionar equipe","action":"dispatch","style":"danger"}]',
            ),
            (
                "delivery",
                "action_required",
                2,
                "Encomenda aguardando",
                "Pacote para Unidade 204 há 3 dias",
                "package",
                "#f59e0b",
                '[{"label":"Notificar","action":"notify","style":"primary"}]',
            ),
            (
                "reservation",
                "action_required",
                2,
                "Reserva pendente",
                "Salão de Festas - João Silva - Sábado",
                "calendar-check",
                "#8b5cf6",
                '[{"label":"Aprovar","action":"approve","style":"success"},{"label":"Recusar","action":"reject","style":"danger"}]',
            ),
            (
                "announcement",
                "info",
                3,
                "Manutenção elevadores",
                "Manutenção preventiva amanhã 8h-12h",
                "megaphone",
                "#3b82f6",
                '[{"label":"Ler","action":"view","style":"secondary"}]',
            ),
            (
                "survey",
                "info",
                3,
                "Nova pesquisa",
                "Pesquisa de satisfação disponível",
                "clipboard-list",
                "#22c55e",
                '[{"label":"Responder","action":"answer","style":"primary"}]',
            ),
            (
                "social",
                "social",
                4,
                "Novo no Entre Vizinhos",
                "Sofá 3 lugares - R$ 800",
                "shopping-bag",
                "#ec4899",
                '[{"label":"Ver","action":"view","style":"secondary"}]',
            ),
        ]
        for s in samples:
            await db.execute(
                text(
                    """
                INSERT INTO notifications (tenant_id, user_id, type, category, priority, title, message, icon, color, actions)
                VALUES (:tid, :uid, :type, :cat, :pri, :title, :msg, :icon, :color, :actions::jsonb)
            """
                ),
                {
                    "tid": tenant_id,
                    "uid": user_id,
                    "type": s[0],
                    "cat": s[1],
                    "pri": s[2],
                    "title": s[3],
                    "msg": s[4],
                    "icon": s[5],
                    "color": s[6],
                    "actions": s[7],
                },
            )
        await db.commit()
        return {"message": f"Tabela criada com {len(samples)} notificações de exemplo"}
    return {"message": "Tabela existe", "count": count}


@router.get("")
async def get_notifications(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    category: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    query = "SELECT * FROM notifications WHERE user_id = :uid AND tenant_id = :tid AND is_dismissed = FALSE"
    params = {"uid": user_id, "tid": tenant_id}
    if category:
        query += " AND category = :category"
        params["category"] = category
    if is_read is not None:
        query += " AND is_read = :is_read"
        params["is_read"] = is_read
    query += " ORDER BY priority ASC, created_at DESC LIMIT :limit"
    params["limit"] = limit

    result = await db.execute(text(query), params)
    notifications = [dict(row._mapping) for row in result.fetchall()]

    stats = await db.execute(
        text(
            """
        SELECT
            COUNT(*) FILTER (WHERE NOT is_read AND NOT is_dismissed) as unread,
            COUNT(*) FILTER (WHERE category = 'urgent' AND NOT is_dismissed) as urgent,
            COUNT(*) FILTER (WHERE category = 'action_required' AND NOT is_actioned AND NOT is_dismissed) as action_required,
            COUNT(*) FILTER (WHERE NOT is_dismissed) as total
        FROM notifications WHERE user_id = :uid AND tenant_id = :tid
    """
        ),
        {"uid": user_id, "tid": tenant_id},
    )

    return {"notifications": notifications, "stats": dict(stats.fetchone()._mapping)}


@router.post("/{notification_id}/action")
async def perform_action(
    notification_id: int,
    data: NotificationAction,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    updates = {
        "mark_read": "is_read = TRUE",
        "dismiss": "is_dismissed = TRUE",
        "snooze": "snoozed_until = NOW() + INTERVAL '1 hour'",
        "archive": "is_dismissed = TRUE, is_read = TRUE",
    }
    if data.action in ["approve", "reject"]:
        sql = "UPDATE notifications SET is_actioned = TRUE, actioned_at = NOW(), is_read = TRUE WHERE id = :id"
    else:
        sql = f"UPDATE notifications SET {updates.get(data.action, 'is_read = TRUE')} WHERE id = :id"
    await db.execute(text(sql), {"id": notification_id})
    await db.commit()
    return {"success": True}


@router.post("/mark-all-read")
async def mark_all_read(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("UPDATE notifications SET is_read = TRUE WHERE user_id = :uid AND tenant_id = :tid AND NOT is_read"),
        {"uid": user_id, "tid": tenant_id},
    )
    await db.commit()
    return {"success": True}


from app.services.notification_hooks import (
    AnnouncementNotifications,
    MaintenanceNotifications,
    OccurrenceNotifications,
    ReservationNotifications,
    VotingNotifications,
)

# ========== ENDPOINTS DE TESTE ==========
from app.services.notification_service import NotificationService


@router.post("/test/reservation")
async def test_reservation(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await ReservationNotifications.on_create(
        db,
        tenant_id,
        {
            "id": 999,
            "area_name": "Salão de Festas",
            "user_name": "João Silva",
            "unit": "Apt 302",
            "date": "25/12/2025",
            "user_id": 999,
        },
    )
    return {"message": "Notificação de reserva enviada"}


@router.post("/test/maintenance")
async def test_maintenance(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    await MaintenanceNotifications.on_create(
        db,
        tenant_id,
        {"id": 999, "title": "Vazamento no banheiro", "category": "Hidráulica", "location": "Apt 405", "user_id": 999},
    )
    return {"message": "Notificação de manutenção enviada"}


@router.post("/test/voting")
async def test_voting(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    count = await VotingNotifications.on_create(
        db, tenant_id, {"id": 999, "title": "Instalação de academia", "end_date": "30/12/2025"}, 999
    )
    return {"message": f"Notificação enviada para {count} moradores"}


@router.post("/test/announcement")
async def test_announcement(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    count = await AnnouncementNotifications.on_create(
        db,
        tenant_id,
        {
            "id": 999,
            "title": "Manutenção dos elevadores",
            "summary": "Elevadores em manutenção segunda-feira",
            "content": "Texto completo...",
        },
        999,
    )
    return {"message": f"Comunicado enviado para {count} moradores"}


@router.delete("/clear-test")
async def clear_test(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("DELETE FROM notifications WHERE reference_id = 999"))
    await db.commit()
    return {"message": f"{result.rowcount} removidas"}
