"""
Hooks de Notificação
"""

from sqlalchemy.ext.asyncio import AsyncSession

from .notification_service import NotificationService

ROLE_MORADOR, ROLE_SINDICO, ROLE_PORTEIRO, ROLE_ADMIN, ROLE_SUPERADMIN = 1, 2, 3, 4, 5


class ReservationNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data):
        await NotificationService.create_for_role(
            db,
            tenant_id,
            ROLE_SINDICO,
            "reservation_pending",
            f"Nova reserva: {data['area_name']}",
            f"{data['user_name']} ({data['unit']}) - {data['date']}",
            "reservation",
            data["id"],
            data.get("user_id"),
        )


class MaintenanceNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data):
        ntype = "maintenance_urgent" if data.get("priority") == "urgent" else "maintenance_new"
        await NotificationService.create_for_role(
            db,
            tenant_id,
            ROLE_SINDICO,
            ntype,
            f"Novo chamado: {data['title']}",
            f"{data['category']} - {data['location']}",
            "ticket",
            data["id"],
            data.get("user_id"),
        )


class VotingNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data, creator_id):
        return await NotificationService.create_for_all_residents(
            db,
            tenant_id,
            "voting_new",
            f"Nova votação: {data['title']}",
            f"Participe até {data['end_date']}",
            "voting",
            data["id"],
            creator_id,
        )


class OccurrenceNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data):
        await NotificationService.create_for_role(
            db,
            tenant_id,
            ROLE_SINDICO,
            "occurrence_new",
            f"Nova ocorrência: {data['title']}",
            f"{data['category']} - {data['reporter_name']} ({data['unit']})",
            "occurrence",
            data["id"],
            data.get("reporter_id"),
        )


class AnnouncementNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data, creator_id):
        return await NotificationService.create_for_all_residents(
            db,
            tenant_id,
            "announcement_new",
            data["title"],
            data.get("summary", data["content"][:100]),
            "announcement",
            data["id"],
            creator_id,
        )


class ClassifiedNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data, creator_id):
        return await NotificationService.create_for_all_residents(
            db,
            tenant_id,
            "classified_new",
            f"Novo: {data['title']}",
            f"{data['category']} - R$ {data['price']}",
            "classified",
            data["id"],
            creator_id,
        )


class SurveyNotifications:
    @staticmethod
    async def on_create(db, tenant_id, data, creator_id):
        return await NotificationService.create_for_all_residents(
            db,
            tenant_id,
            "survey_new",
            f"Nova pesquisa: {data['title']}",
            f"Responda até {data['end_date']}",
            "survey",
            data["id"],
            creator_id,
        )


class DeliveryNotifications:
    @staticmethod
    async def on_arrive(db, tenant_id, data):
        """Notifica moradores da unidade sobre chegada de encomenda"""
        from sqlalchemy import text

        # Buscar usuários da unidade
        result = await db.execute(
            text(
                """
            SELECT u.id FROM users u
            WHERE u.tenant_id = :tid AND u.unit_id = :unit_id AND u.is_active = TRUE
        """
            ),
            {"tid": tenant_id, "unit_id": data["unit_id"]},
        )
        user_ids = [row[0] for row in result.fetchall()]

        nids = []
        for uid in user_ids:
            nid = await NotificationService.create(
                db,
                tenant_id,
                uid,
                "delivery_arrived",
                f"Encomenda chegou!",
                f"{data['carrier']} - {data['recipient_name']} - Retire na portaria",
                "encomenda",
                data["id"],
            )
            nids.append(nid)
        return nids

    @staticmethod
    async def on_notify(db, tenant_id, data):
        """Notifica moradores quando porteiro envia lembrete"""
        from sqlalchemy import text

        result = await db.execute(
            text(
                """
            SELECT u.id FROM users u
            WHERE u.tenant_id = :tid AND u.unit_id = :unit_id AND u.is_active = TRUE
        """
            ),
            {"tid": tenant_id, "unit_id": data["unit_id"]},
        )
        user_ids = [row[0] for row in result.fetchall()]

        nids = []
        for uid in user_ids:
            nid = await NotificationService.create(
                db,
                tenant_id,
                uid,
                "delivery_arrived",
                f"Lembrete: Encomenda aguardando",
                f"{data['carrier']} para {data['recipient_name']} - {data.get('storage_location', 'Portaria')}",
                "encomenda",
                data["id"],
            )
            nids.append(nid)
        return nids
