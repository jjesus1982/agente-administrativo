"""
WebSocket Endpoints para notificacoes em tempo real
"""

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.config import settings
from app.core.logger import get_logger
from app.services.websocket import NotificationType, create_notification, manager

logger = get_logger(__name__)

router = APIRouter()


async def get_user_from_token(token: str) -> dict:
    """Valida token JWT e retorna dados do usuario"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        tenant_id = payload.get("tenant_id")

        if user_id is None or tenant_id is None:
            return None

        return {
            "user_id": int(user_id),
            "tenant_id": int(tenant_id),
        }
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    Endpoint WebSocket para notificacoes em tempo real.

    Conectar: ws://host/api/v1/ws?token=JWT_TOKEN

    Mensagens recebidas (JSON):
    - { "type": "notification_type", "title": "...", "message": "...", "data": {...} }
    """
    # Validar token
    user_data = await get_user_from_token(token)

    if not user_data:
        await websocket.close(code=4001, reason="Token invalido")
        return

    user_id = user_data["user_id"]
    tenant_id = user_data["tenant_id"]

    # Conectar
    await manager.connect(websocket, tenant_id, user_id)

    # Enviar mensagem de boas-vindas
    await websocket.send_json(
        create_notification(
            NotificationType.INFO,
            "Conectado",
            "Voce esta conectado ao sistema de notificacoes.",
        )
    )

    try:
        while True:
            # Manter conexao aberta e processar mensagens do cliente
            data = await websocket.receive_text()

            # Processar comandos do cliente se necessario
            # Por enquanto, apenas log
            logger.debug(
                "websocket_message_received",
                user_id=user_id,
                data=data[:100],  # Limitar log
            )

    except WebSocketDisconnect:
        await manager.disconnect(websocket, tenant_id, user_id)


# Funcoes helper para enviar notificacoes
async def notify_user(
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
):
    """Envia notificacao para um usuario especifico"""
    await manager.send_to_user(
        user_id,
        create_notification(notification_type, title, message, data),
    )


async def notify_tenant(
    tenant_id: int,
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
):
    """Envia notificacao para todos os usuarios de um tenant"""
    await manager.send_to_tenant(
        tenant_id,
        create_notification(notification_type, title, message, data),
    )


async def notify_users(
    user_ids: list,
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
):
    """Envia notificacao para uma lista de usuarios"""
    await manager.send_to_users(
        user_ids,
        create_notification(notification_type, title, message, data),
    )
