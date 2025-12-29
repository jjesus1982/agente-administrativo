"""
Serviço Centralizado de Notificações
"""

import json
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class NotificationService:
    NOTIFICATION_CONFIG = {
        "reservation_pending": {
            "type": "reservation",
            "category": "action_required",
            "priority": 2,
            "icon": "calendar-check",
            "color": "#8b5cf6",
            "actions": [
                {"label": "Aprovar", "action": "approve", "style": "success"},
                {"label": "Recusar", "action": "reject", "style": "danger"},
            ],
        },
        "reservation_approved": {
            "type": "reservation",
            "category": "info",
            "priority": 3,
            "icon": "calendar-check",
            "color": "#22c55e",
            "actions": [{"label": "Ver reserva", "action": "view", "style": "secondary"}],
        },
        "maintenance_new": {
            "type": "maintenance",
            "category": "action_required",
            "priority": 2,
            "icon": "wrench",
            "color": "#f59e0b",
            "actions": [
                {"label": "Atribuir", "action": "assign", "style": "primary"},
                {"label": "Ver", "action": "view", "style": "secondary"},
            ],
        },
        "maintenance_urgent": {
            "type": "maintenance",
            "category": "urgent",
            "priority": 1,
            "icon": "alert-triangle",
            "color": "#ef4444",
            "actions": [{"label": "Acionar equipe", "action": "dispatch", "style": "danger"}],
        },
        "maintenance_completed": {
            "type": "maintenance",
            "category": "info",
            "priority": 4,
            "icon": "check-circle",
            "color": "#22c55e",
            "actions": [{"label": "Avaliar", "action": "rate", "style": "primary"}],
        },
        "voting_new": {
            "type": "voting",
            "category": "action_required",
            "priority": 2,
            "icon": "vote",
            "color": "#8b5cf6",
            "actions": [{"label": "Votar", "action": "vote", "style": "primary"}],
        },
        "voting_ended": {
            "type": "voting",
            "category": "info",
            "priority": 3,
            "icon": "vote",
            "color": "#22c55e",
            "actions": [{"label": "Ver resultado", "action": "view_results", "style": "secondary"}],
        },
        "occurrence_new": {
            "type": "occurrence",
            "category": "action_required",
            "priority": 2,
            "icon": "alert-triangle",
            "color": "#f97316",
            "actions": [{"label": "Analisar", "action": "analyze", "style": "primary"}],
        },
        "delivery_arrived": {
            "type": "delivery",
            "category": "info",
            "priority": 3,
            "icon": "package",
            "color": "#22c55e",
            "actions": [{"label": "Confirmar retirada", "action": "confirm", "style": "primary"}],
        },
        "announcement_new": {
            "type": "announcement",
            "category": "info",
            "priority": 3,
            "icon": "megaphone",
            "color": "#3b82f6",
            "actions": [{"label": "Ler", "action": "view", "style": "secondary"}],
        },
        "classified_new": {
            "type": "social",
            "category": "social",
            "priority": 4,
            "icon": "shopping-bag",
            "color": "#ec4899",
            "actions": [{"label": "Ver anúncio", "action": "view", "style": "secondary"}],
        },
        "survey_new": {
            "type": "survey",
            "category": "action_required",
            "priority": 3,
            "icon": "clipboard-list",
            "color": "#22c55e",
            "actions": [{"label": "Responder", "action": "answer", "style": "primary"}],
        },
        "access_request": {
            "type": "access",
            "category": "action_required",
            "priority": 2,
            "icon": "scan-face",
            "color": "#06b6d4",
            "actions": [{"label": "Aprovar", "action": "approve", "style": "success"}],
        },
        "welcome": {
            "type": "social",
            "category": "social",
            "priority": 4,
            "icon": "home",
            "color": "#22c55e",
            "actions": [{"label": "Boas-vindas", "action": "welcome", "style": "primary"}],
        },
    }

    @classmethod
    async def create(
        cls,
        db: AsyncSession,
        tenant_id: int,
        user_id: int,
        notification_type: str,
        title: str,
        message: str,
        reference_type: str = None,
        reference_id: int = None,
        metadata: Dict = None,
    ) -> int:
        config = cls.NOTIFICATION_CONFIG.get(
            notification_type,
            {"type": "info", "category": "info", "priority": 3, "icon": "bell", "color": "#64748b", "actions": []},
        )

        actions_json = json.dumps(config.get("actions", []))
        metadata_json = json.dumps(metadata or {})

        result = await db.execute(
            text(
                """
            INSERT INTO notifications (tenant_id, user_id, type, category, priority, title, message, icon, color, reference_type, reference_id, actions, metadata)
            VALUES (:tenant_id, :user_id, :type, :category, :priority, :title, :message, :icon, :color, :ref_type, :ref_id, :actions, :metadata)
            RETURNING id
        """
            ),
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "type": config["type"],
                "category": config["category"],
                "priority": config["priority"],
                "title": title,
                "message": message,
                "icon": config["icon"],
                "color": config["color"],
                "ref_type": reference_type,
                "ref_id": reference_id,
                "actions": actions_json,
                "metadata": metadata_json,
            },
        )
        nid = result.scalar()
        await db.commit()
        return nid

    @classmethod
    async def create_for_role(
        cls,
        db: AsyncSession,
        tenant_id: int,
        role: int,
        notification_type: str,
        title: str,
        message: str,
        reference_type: str = None,
        reference_id: int = None,
        exclude_user_id: int = None,
    ) -> List[int]:
        query = "SELECT id FROM users WHERE tenant_id = :tid AND role = :role AND is_active = TRUE"
        params = {"tid": tenant_id, "role": role}
        if exclude_user_id:
            query += " AND id != :exclude"
            params["exclude"] = exclude_user_id
        result = await db.execute(text(query), params)
        user_ids = [row[0] for row in result.fetchall()]
        nids = []
        for uid in user_ids:
            nid = await cls.create(db, tenant_id, uid, notification_type, title, message, reference_type, reference_id)
            nids.append(nid)
        return nids

    @classmethod
    async def create_for_all_residents(
        cls,
        db: AsyncSession,
        tenant_id: int,
        notification_type: str,
        title: str,
        message: str,
        reference_type: str = None,
        reference_id: int = None,
        exclude_user_id: int = None,
    ) -> int:
        query = "SELECT id FROM users WHERE tenant_id = :tid AND is_active = TRUE"
        params = {"tid": tenant_id}
        if exclude_user_id:
            query += " AND id != :exclude"
            params["exclude"] = exclude_user_id
        result = await db.execute(text(query), params)
        count = 0
        for row in result.fetchall():
            await cls.create(db, tenant_id, row[0], notification_type, title, message, reference_type, reference_id)
            count += 1
        return count
