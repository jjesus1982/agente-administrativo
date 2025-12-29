"""
WebSocket Manager para notificacoes em tempo real
"""

import asyncio
import json
from typing import Dict, List, Set

from fastapi import WebSocket

from app.core.logger import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Gerenciador de conexoes WebSocket"""

    def __init__(self):
        # Conexoes por tenant
        self.tenant_connections: Dict[int, Set[WebSocket]] = {}
        # Conexoes por usuario
        self.user_connections: Dict[int, Set[WebSocket]] = {}
        # Lock para operacoes thread-safe
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, tenant_id: int, user_id: int):
        """Aceita e registra uma nova conexao"""
        await websocket.accept()

        async with self._lock:
            # Registrar por tenant
            if tenant_id not in self.tenant_connections:
                self.tenant_connections[tenant_id] = set()
            self.tenant_connections[tenant_id].add(websocket)

            # Registrar por usuario
            if user_id not in self.user_connections:
                self.user_connections[user_id] = set()
            self.user_connections[user_id].add(websocket)

        logger.info(
            "websocket_connected",
            tenant_id=tenant_id,
            user_id=user_id,
            total_connections=self._count_connections(),
        )

    async def disconnect(self, websocket: WebSocket, tenant_id: int, user_id: int):
        """Remove uma conexao"""
        async with self._lock:
            # Remover do tenant
            if tenant_id in self.tenant_connections:
                self.tenant_connections[tenant_id].discard(websocket)
                if not self.tenant_connections[tenant_id]:
                    del self.tenant_connections[tenant_id]

            # Remover do usuario
            if user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]

        logger.info(
            "websocket_disconnected",
            tenant_id=tenant_id,
            user_id=user_id,
            total_connections=self._count_connections(),
        )

    async def send_to_user(self, user_id: int, message: dict):
        """Envia mensagem para um usuario especifico"""
        connections = self.user_connections.get(user_id, set())
        await self._broadcast_to_connections(connections, message)

    async def send_to_tenant(self, tenant_id: int, message: dict):
        """Envia mensagem para todos os usuarios de um tenant"""
        connections = self.tenant_connections.get(tenant_id, set())
        await self._broadcast_to_connections(connections, message)

    async def send_to_users(self, user_ids: List[int], message: dict):
        """Envia mensagem para uma lista de usuarios"""
        connections: Set[WebSocket] = set()
        for user_id in user_ids:
            connections.update(self.user_connections.get(user_id, set()))
        await self._broadcast_to_connections(connections, message)

    async def broadcast_all(self, message: dict):
        """Envia mensagem para todos os usuarios conectados"""
        all_connections: Set[WebSocket] = set()
        for connections in self.tenant_connections.values():
            all_connections.update(connections)
        await self._broadcast_to_connections(all_connections, message)

    async def _broadcast_to_connections(self, connections: Set[WebSocket], message: dict):
        """Envia mensagem para um conjunto de conexoes"""
        if not connections:
            return

        json_message = json.dumps(message)
        disconnected: List[WebSocket] = []

        for connection in connections:
            try:
                await connection.send_text(json_message)
            except Exception as e:
                logger.warning("websocket_send_failed", error=str(e))
                disconnected.append(connection)

        # Remover conexoes que falharam
        for connection in disconnected:
            await self._remove_dead_connection(connection)

    async def _remove_dead_connection(self, websocket: WebSocket):
        """Remove uma conexao morta de todas as listas"""
        async with self._lock:
            for connections in self.tenant_connections.values():
                connections.discard(websocket)
            for connections in self.user_connections.values():
                connections.discard(websocket)

    def _count_connections(self) -> int:
        """Conta o total de conexoes unicas"""
        all_connections: Set[WebSocket] = set()
        for connections in self.tenant_connections.values():
            all_connections.update(connections)
        return len(all_connections)


# Instancia singleton
manager = ConnectionManager()


# Tipos de notificacao
class NotificationType:
    """Tipos de notificacao do sistema"""

    # Gerais
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

    # Especificos
    NEW_VISITOR = "new_visitor"
    VISITOR_ARRIVED = "visitor_arrived"
    NEW_PACKAGE = "new_package"
    PACKAGE_PICKED = "package_picked"
    NEW_OCCURRENCE = "new_occurrence"
    OCCURRENCE_UPDATE = "occurrence_update"
    NEW_ANNOUNCEMENT = "new_announcement"
    NEW_RESERVATION = "new_reservation"
    RESERVATION_UPDATE = "reservation_update"
    MAINTENANCE_UPDATE = "maintenance_update"
    NEW_MESSAGE = "new_message"


def create_notification(
    notification_type: str,
    title: str,
    message: str,
    data: dict = None,
) -> dict:
    """Cria uma notificacao padronizada"""
    from datetime import datetime

    return {
        "type": notification_type,
        "title": title,
        "message": message,
        "data": data or {},
        "timestamp": datetime.utcnow().isoformat(),
    }
