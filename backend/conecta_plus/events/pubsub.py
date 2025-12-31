"""
PubSub Manager - Gerenciador de publish/subscribe usando Redis
"""

import asyncio
import json
from typing import Dict, List, Callable, Any, Optional, Set
from datetime import datetime
import aioredis
import structlog

from ..core.logger import get_logger
from ..services.cache import RedisCache
from .types import Event, EventType

logger = get_logger(__name__)


class PubSubManager:
    """Gerenciador de publish/subscribe usando Redis"""

    def __init__(self, redis_cache: RedisCache):
        self.redis_cache = redis_cache
        self.pubsub = None
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.active_channels: Set[str] = set()
        self._listener_task: Optional[asyncio.Task] = None
        self._shutdown_event = asyncio.Event()

    async def start(self):
        """Inicia o PubSub Manager"""
        try:
            self.pubsub = self.redis_cache.redis.pubsub()
            self._listener_task = asyncio.create_task(self._message_listener())

            logger.info("PubSub Manager started")

        except Exception as e:
            logger.error("Failed to start PubSub Manager", error=str(e))
            raise

    async def stop(self):
        """Para o PubSub Manager"""
        try:
            self._shutdown_event.set()

            if self._listener_task:
                self._listener_task.cancel()
                try:
                    await self._listener_task
                except asyncio.CancelledError:
                    pass

            if self.pubsub:
                await self.pubsub.unsubscribe()
                await self.pubsub.close()

            logger.info("PubSub Manager stopped")

        except Exception as e:
            logger.error("Error stopping PubSub Manager", error=str(e))

    async def subscribe(self, channel: str, callback: Callable[[str, Any], None]):
        """Subscreve a um canal"""
        try:
            if channel not in self.subscriptions:
                self.subscriptions[channel] = []

            self.subscriptions[channel].append(callback)

            # Subscribe no Redis se é um novo canal
            if channel not in self.active_channels:
                await self.pubsub.subscribe(channel)
                self.active_channels.add(channel)

            logger.info("Subscribed to channel", channel=channel)

        except Exception as e:
            logger.error("Failed to subscribe to channel",
                        channel=channel,
                        error=str(e))

    async def unsubscribe(self, channel: str, callback: Optional[Callable] = None):
        """Cancela subscrição de um canal"""
        try:
            if channel not in self.subscriptions:
                return

            if callback:
                # Remove callback específico
                if callback in self.subscriptions[channel]:
                    self.subscriptions[channel].remove(callback)
            else:
                # Remove todos os callbacks
                self.subscriptions[channel].clear()

            # Unsubscribe do Redis se não há mais callbacks
            if not self.subscriptions[channel]:
                await self.pubsub.unsubscribe(channel)
                self.active_channels.discard(channel)
                del self.subscriptions[channel]

            logger.info("Unsubscribed from channel", channel=channel)

        except Exception as e:
            logger.error("Failed to unsubscribe from channel",
                        channel=channel,
                        error=str(e))

    async def publish(self, channel: str, message: Any):
        """Publica uma mensagem em um canal"""
        try:
            # Serializa mensagem
            if isinstance(message, (dict, list)):
                serialized = json.dumps(message)
            elif isinstance(message, Event):
                serialized = message.json()
            else:
                serialized = str(message)

            # Publica no Redis
            await self.redis_cache.redis.publish(channel, serialized)

            logger.debug("Message published",
                        channel=channel,
                        message_size=len(serialized))

        except Exception as e:
            logger.error("Failed to publish message",
                        channel=channel,
                        error=str(e))

    async def publish_event(self, event: Event, channels: Optional[List[str]] = None):
        """Publica um evento em canais específicos ou canal geral"""
        if channels is None:
            channels = ["events"]  # Canal padrão

        for channel in channels:
            await self.publish(channel, event)

    async def subscribe_to_events(self,
                                 callback: Callable[[Event], None],
                                 event_types: Optional[List[EventType]] = None):
        """Subscreve a eventos específicos"""
        if event_types is None:
            # Subscreve ao canal geral de eventos
            await self.subscribe("events", lambda ch, msg: self._handle_event_message(msg, callback))
        else:
            # Subscreve a canais específicos por tipo
            for event_type in event_types:
                channel = f"events.{event_type.value}"
                await self.subscribe(channel, lambda ch, msg: self._handle_event_message(msg, callback))

    def _handle_event_message(self, message: str, callback: Callable[[Event], None]):
        """Processa mensagem de evento"""
        try:
            # Desserializa o evento
            event_data = json.loads(message)
            event = Event(**event_data)

            # Chama callback
            if asyncio.iscoroutinefunction(callback):
                asyncio.create_task(callback(event))
            else:
                callback(event)

        except Exception as e:
            logger.error("Failed to handle event message",
                        message_preview=message[:100],
                        error=str(e))

    async def _message_listener(self):
        """Task que escuta mensagens do Redis"""
        try:
            while not self._shutdown_event.is_set():
                try:
                    message = await self.pubsub.get_message(timeout=1.0)

                    if message is None:
                        continue

                    if message["type"] != "message":
                        continue

                    channel = message["channel"].decode()
                    data = message["data"].decode()

                    # Processa mensagem
                    await self._process_message(channel, data)

                except asyncio.TimeoutError:
                    continue

        except asyncio.CancelledError:
            logger.info("Message listener cancelled")
        except Exception as e:
            logger.error("Error in message listener", error=str(e))

    async def _process_message(self, channel: str, data: str):
        """Processa uma mensagem recebida"""
        try:
            callbacks = self.subscriptions.get(channel, [])

            for callback in callbacks:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(channel, data)
                    else:
                        callback(channel, data)

                except Exception as e:
                    logger.error("Error in message callback",
                                channel=channel,
                                error=str(e))

        except Exception as e:
            logger.error("Error processing message",
                        channel=channel,
                        error=str(e))

    async def get_active_channels(self) -> List[str]:
        """Retorna canais ativos"""
        return list(self.active_channels)

    async def get_subscription_count(self, channel: str) -> int:
        """Retorna número de subscrições para um canal"""
        return len(self.subscriptions.get(channel, []))

    async def broadcast_to_pattern(self, pattern: str, message: Any):
        """Broadcast para canais que fazem match com um padrão"""
        # Esta funcionalidade requer Redis patterns ou implementação customizada
        # Por simplicidade, vamos implementar um broadcast básico
        matching_channels = [
            channel for channel in self.active_channels
            if pattern in channel
        ]

        for channel in matching_channels:
            await self.publish(channel, message)


# Classe utilitária para eventos distribuídos
class DistributedEventManager:
    """Gerenciador de eventos distribuídos usando PubSub"""

    def __init__(self, pubsub_manager: PubSubManager, node_id: str):
        self.pubsub = pubsub_manager
        self.node_id = node_id

    async def start(self):
        """Inicia o gerenciador distribuído"""
        # Subscreve a eventos de outros nós
        await self.pubsub.subscribe("distributed.events", self._handle_distributed_event)
        await self.pubsub.subscribe(f"distributed.events.{self.node_id}", self._handle_targeted_event)

        logger.info("Distributed event manager started", node_id=self.node_id)

    async def publish_distributed_event(self,
                                       event: Event,
                                       target_nodes: Optional[List[str]] = None):
        """Publica evento para outros nós"""
        distributed_event = {
            "source_node": self.node_id,
            "event": event.dict(),
            "timestamp": datetime.utcnow().isoformat(),
            "target_nodes": target_nodes
        }

        if target_nodes:
            # Publica para nós específicos
            for node_id in target_nodes:
                await self.pubsub.publish(f"distributed.events.{node_id}", distributed_event)
        else:
            # Broadcast para todos os nós
            await self.pubsub.publish("distributed.events", distributed_event)

        logger.debug("Distributed event published",
                    event_type=event.event_type.value,
                    target_nodes=target_nodes or "all")

    async def _handle_distributed_event(self, channel: str, message: str):
        """Processa evento distribuído"""
        try:
            data = json.loads(message)
            source_node = data.get("source_node")

            # Ignora eventos do próprio nó
            if source_node == self.node_id:
                return

            # Verifica se é direcionado para este nó
            target_nodes = data.get("target_nodes")
            if target_nodes and self.node_id not in target_nodes:
                return

            # Reconstitui o evento
            event_data = data.get("event")
            if event_data:
                event = Event(**event_data)

                logger.debug("Distributed event received",
                            event_type=event.event_type.value,
                            source_node=source_node)

                # Aqui você pode processar o evento ou encaminhá-lo para o event bus local

        except Exception as e:
            logger.error("Error handling distributed event",
                        message_preview=message[:100],
                        error=str(e))

    async def _handle_targeted_event(self, channel: str, message: str):
        """Processa evento direcionado para este nó"""
        await self._handle_distributed_event(channel, message)


# Exemplo de uso
async def example_usage():
    """Exemplo de como usar o PubSub Manager"""

    # Simula um redis cache
    class MockRedisCache:
        def __init__(self):
            self.redis = aioredis.from_url("redis://localhost")

    redis_cache = MockRedisCache()
    pubsub = PubSubManager(redis_cache)

    try:
        await pubsub.start()

        # Define callbacks
        async def event_handler(channel: str, message: str):
            print(f"Received on {channel}: {message}")

        def sync_handler(channel: str, message: str):
            print(f"Sync handler - {channel}: {message}")

        # Subscreve a canais
        await pubsub.subscribe("test.events", event_handler)
        await pubsub.subscribe("test.sync", sync_handler)

        # Publica mensagens
        await pubsub.publish("test.events", {"type": "test", "data": "hello"})
        await pubsub.publish("test.sync", "Hello World")

        # Publica evento
        event = Event(
            event_type=EventType.TASK_COMPLETED,
            source_agent="test_agent",
            data={"task_id": "123", "result": "success"}
        )
        await pubsub.publish_event(event, ["test.events"])

        await asyncio.sleep(2)

    finally:
        await pubsub.stop()