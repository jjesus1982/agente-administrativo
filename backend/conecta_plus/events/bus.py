"""
Event Bus - Bus de eventos centralizado para comunicação inter-agentes
"""

import asyncio
import json
from typing import Dict, List, Optional, Set, Callable, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
import fnmatch
import structlog
from contextlib import asynccontextmanager

from ..core.logger import get_logger
from ..services.cache import RedisCache
from .types import (
    Event, EventType, EventSubscription, EventFilter, EventPattern,
    EventPriority, EventAck, EventMetrics, EventBatch, EventStream,
    EventDeadLetter, EventCallback, AsyncEventCallback
)

logger = get_logger(__name__)


class EventBus:
    """Bus de eventos centralizado com suporte a Redis e processamento assíncrono"""

    def __init__(self, redis_cache: RedisCache):
        self.redis = redis_cache

        # Subscrições locais (in-memory para performance)
        self.subscriptions: Dict[str, EventSubscription] = {}
        self.callbacks: Dict[str, List[Callable]] = defaultdict(list)

        # Buffers e filas
        self.event_buffer: deque = deque(maxlen=10000)
        self.dead_letter_queue: List[EventDeadLetter] = []
        self.batch_queue: Dict[str, EventBatch] = {}

        # Streams ativos
        self.active_streams: Dict[str, EventStream] = {}

        # Métricas
        self.metrics = EventMetrics()
        self._rate_limiters: Dict[str, deque] = defaultdict(lambda: deque())

        # Configuração
        self.batch_size = 10
        self.batch_timeout = 5  # segundos
        self.dead_letter_max_retries = 3
        self.cleanup_interval = 300  # 5 minutos

        # Tasks de background
        self._background_tasks: Set[asyncio.Task] = set()
        self._shutdown_event = asyncio.Event()

    async def start(self):
        """Inicia o Event Bus"""
        logger.info("Starting Event Bus")

        # Carrega subscrições persistidas
        await self._load_subscriptions()

        # Inicia tasks de background
        tasks = [
            self._process_event_queue(),
            self._process_batches(),
            self._cleanup_expired_data(),
            self._update_metrics(),
            self._handle_dead_letters()
        ]

        for coro in tasks:
            task = asyncio.create_task(coro)
            self._background_tasks.add(task)
            task.add_done_callback(self._background_tasks.discard)

        logger.info("Event Bus started successfully")

    async def shutdown(self):
        """Para o Event Bus gracefully"""
        logger.info("Shutting down Event Bus")

        self._shutdown_event.set()

        # Aguarda conclusão das tasks
        if self._background_tasks:
            await asyncio.gather(*self._background_tasks, return_exceptions=True)

        # Persiste estado final
        await self._save_subscriptions()

        logger.info("Event Bus shutdown completed")

    async def publish(self, event: Event, wait_for_ack: bool = False) -> bool:
        """Publica um evento no bus"""
        try:
            # Validação básica
            if not event.event_type:
                raise ValueError("Event type is required")

            # Adiciona ao buffer
            self.event_buffer.append(event)

            # Publica no Redis para distribuição
            await self._publish_to_redis(event)

            # Processa localmente
            await self._process_event_local(event)

            # Atualiza métricas
            self.metrics.total_events += 1
            self.metrics.events_by_type[event.event_type.value] = (
                self.metrics.events_by_type.get(event.event_type.value, 0) + 1
            )
            self.metrics.events_by_priority[event.priority.name] = (
                self.metrics.events_by_priority.get(event.priority.name, 0) + 1
            )

            if event.source_agent:
                self.metrics.events_by_agent[event.source_agent] = (
                    self.metrics.events_by_agent.get(event.source_agent, 0) + 1
                )

            logger.info("Event published",
                       event_id=event.event_id,
                       event_type=event.event_type.value,
                       source_agent=event.source_agent)

            return True

        except Exception as e:
            logger.error("Failed to publish event",
                        event_id=event.event_id,
                        error=str(e))
            return False

    async def subscribe(self,
                       subscriber_id: str,
                       filter: EventFilter,
                       callback: Optional[Callable] = None,
                       callback_url: Optional[str] = None) -> str:
        """Cria uma subscrição a eventos"""

        subscription = EventSubscription(
            subscriber_id=subscriber_id,
            filter=filter,
            callback_url=callback_url
        )

        # Armazena subscrição
        self.subscriptions[subscription.subscription_id] = subscription

        # Registra callback se fornecido
        if callback:
            self.callbacks[subscription.subscription_id].append(callback)

        # Persiste no Redis
        await self._save_subscription(subscription)

        self.metrics.active_subscriptions = len(self.subscriptions)

        logger.info("Event subscription created",
                   subscription_id=subscription.subscription_id,
                   subscriber_id=subscriber_id)

        return subscription.subscription_id

    async def unsubscribe(self, subscription_id: str) -> bool:
        """Remove uma subscrição"""
        try:
            if subscription_id in self.subscriptions:
                del self.subscriptions[subscription_id]

            if subscription_id in self.callbacks:
                del self.callbacks[subscription_id]

            # Remove do Redis
            await self.redis.delete(f"subscription:{subscription_id}")

            self.metrics.active_subscriptions = len(self.subscriptions)

            logger.info("Subscription removed", subscription_id=subscription_id)
            return True

        except Exception as e:
            logger.error("Failed to remove subscription",
                        subscription_id=subscription_id,
                        error=str(e))
            return False

    async def create_stream(self,
                           subscriber_id: str,
                           filter: EventFilter,
                           buffer_size: int = 100) -> str:
        """Cria um stream de eventos para subscrições em tempo real"""

        stream = EventStream(
            subscriber_id=subscriber_id,
            filter=filter,
            buffer_size=buffer_size
        )

        self.active_streams[stream.stream_id] = stream

        logger.info("Event stream created",
                   stream_id=stream.stream_id,
                   subscriber_id=subscriber_id)

        return stream.stream_id

    async def read_stream(self,
                         stream_id: str,
                         max_events: int = 10,
                         timeout: float = 30.0) -> List[Event]:
        """Lê eventos de um stream"""

        if stream_id not in self.active_streams:
            return []

        stream = self.active_streams[stream_id]
        start_time = datetime.utcnow()

        while True:
            if stream.events:
                # Retorna eventos disponíveis
                events = stream.events[:max_events]
                stream.events = stream.events[max_events:]
                stream.last_read_at = datetime.utcnow()
                return events

            # Timeout check
            if (datetime.utcnow() - start_time).total_seconds() > timeout:
                break

            await asyncio.sleep(0.1)

        return []

    async def close_stream(self, stream_id: str) -> bool:
        """Fecha um stream de eventos"""
        try:
            if stream_id in self.active_streams:
                del self.active_streams[stream_id]
                logger.info("Event stream closed", stream_id=stream_id)
                return True
            return False
        except Exception as e:
            logger.error("Failed to close stream",
                        stream_id=stream_id,
                        error=str(e))
            return False

    async def acknowledge_event(self, event_id: str, subscriber_id: str) -> bool:
        """Acknowledgment de processamento de evento"""
        try:
            ack = EventAck(
                event_id=event_id,
                subscriber_id=subscriber_id
            )

            # Armazena ACK no Redis para auditoria
            await self.redis.set(
                f"ack:{event_id}:{subscriber_id}",
                ack.dict(),
                ttl=3600  # 1 hora
            )

            return True

        except Exception as e:
            logger.error("Failed to acknowledge event",
                        event_id=event_id,
                        subscriber_id=subscriber_id,
                        error=str(e))
            return False

    async def get_metrics(self) -> EventMetrics:
        """Retorna métricas do Event Bus"""
        self.metrics.active_subscriptions = len(self.subscriptions)
        self.metrics.timestamp = datetime.utcnow()
        return self.metrics

    async def get_events_by_correlation(self, correlation_id: str) -> List[Event]:
        """Busca eventos por correlation_id"""
        try:
            # Busca no buffer local primeiro
            events = [
                event for event in self.event_buffer
                if event.correlation_id == correlation_id
            ]

            # Busca no Redis se necessário
            if not events:
                keys = await self.redis.redis.keys(f"event:*:correlation:{correlation_id}")
                for key in keys:
                    data = await self.redis.get(key.decode())
                    if data:
                        events.append(Event(**data))

            return sorted(events, key=lambda x: x.timestamp)

        except Exception as e:
            logger.error("Failed to get events by correlation",
                        correlation_id=correlation_id,
                        error=str(e))
            return []

    # Métodos internos
    async def _publish_to_redis(self, event: Event):
        """Publica evento no Redis para distribuição"""
        try:
            # Publica no canal geral
            await self.redis.redis.publish("events", event.json())

            # Armazena evento para busca posterior
            await self.redis.set(
                f"event:{event.event_id}",
                event.dict(),
                ttl=event.ttl or 3600
            )

            # Indexa por correlation_id se disponível
            if event.correlation_id:
                await self.redis.set(
                    f"event:{event.event_id}:correlation:{event.correlation_id}",
                    event.dict(),
                    ttl=3600
                )

        except Exception as e:
            logger.error("Failed to publish to Redis",
                        event_id=event.event_id,
                        error=str(e))

    async def _process_event_local(self, event: Event):
        """Processa evento localmente"""
        try:
            matching_subscriptions = self._find_matching_subscriptions(event)

            for subscription in matching_subscriptions:
                # Rate limiting check
                if not await self._check_rate_limit(subscription, event):
                    continue

                # Adiciona a streams
                await self._add_to_streams(subscription, event)

                # Processa callbacks
                await self._process_callbacks(subscription, event)

                # Atualiza subscrição
                subscription.last_event_at = datetime.utcnow()
                subscription.event_count += 1

        except Exception as e:
            logger.error("Failed to process event locally",
                        event_id=event.event_id,
                        error=str(e))

    def _find_matching_subscriptions(self, event: Event) -> List[EventSubscription]:
        """Encontra subscrições que fazem match com o evento"""
        matching = []

        for subscription in self.subscriptions.values():
            if not subscription.is_active:
                continue

            if self._event_matches_filter(event, subscription.filter):
                matching.append(subscription)

        return matching

    def _event_matches_filter(self, event: Event, filter: EventFilter) -> bool:
        """Verifica se um evento faz match com um filtro"""

        # Verifica prioridade mínima
        if event.priority.value < filter.min_priority.value:
            return False

        # Verifica padrões de exclusão primeiro
        for exclude_pattern in filter.exclude_patterns:
            if self._event_matches_pattern(event, exclude_pattern):
                return False

        # Se não há padrões de inclusão, aceita todos (que não foram excluídos)
        if not filter.patterns:
            return True

        # Verifica padrões de inclusão
        for pattern in filter.patterns:
            if self._event_matches_pattern(event, pattern):
                return True

        return False

    def _event_matches_pattern(self, event: Event, pattern: EventPattern) -> bool:
        """Verifica se um evento faz match com um padrão específico"""

        # Event type pattern (suporta wildcards)
        if pattern.event_type:
            if not fnmatch.fnmatch(event.event_type.value, pattern.event_type):
                return False

        # Source agent
        if pattern.source_agent and event.source_agent != pattern.source_agent:
            return False

        # Target agent
        if pattern.target_agent and event.target_agent != pattern.target_agent:
            return False

        # Tenant ID
        if pattern.tenant_id and event.tenant_id != pattern.tenant_id:
            return False

        # Tags (pelo menos uma tag deve fazer match)
        if pattern.tags:
            if not any(tag in event.tags for tag in pattern.tags):
                return False

        # Prioridade
        if pattern.priority and event.priority != pattern.priority:
            return False

        return True

    async def _check_rate_limit(self, subscription: EventSubscription, event: Event) -> bool:
        """Verifica rate limiting"""
        if not subscription.filter.max_events_per_minute:
            return True

        rate_limiter = self._rate_limiters[subscription.subscription_id]
        now = datetime.utcnow()

        # Remove eventos antigos (older than 1 minute)
        cutoff = now - timedelta(minutes=1)
        while rate_limiter and rate_limiter[0] < cutoff:
            rate_limiter.popleft()

        # Verifica limite
        if len(rate_limiter) >= subscription.filter.max_events_per_minute:
            return False

        # Adiciona timestamp atual
        rate_limiter.append(now)
        return True

    async def _add_to_streams(self, subscription: EventSubscription, event: Event):
        """Adiciona evento a streams relevantes"""
        for stream in self.active_streams.values():
            if (stream.subscriber_id == subscription.subscriber_id and
                self._event_matches_filter(event, stream.filter)):

                stream.events.append(event)

                # Limita buffer size
                if len(stream.events) > stream.buffer_size:
                    stream.events = stream.events[-stream.buffer_size:]

    async def _process_callbacks(self, subscription: EventSubscription, event: Event):
        """Processa callbacks de uma subscrição"""
        callbacks = self.callbacks.get(subscription.subscription_id, [])

        for callback in callbacks:
            try:
                start_time = datetime.utcnow()

                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)

                # Atualiza métricas de tempo de processamento
                processing_time = (datetime.utcnow() - start_time).total_seconds()
                self._update_processing_time(processing_time)

            except Exception as e:
                logger.error("Callback execution failed",
                            subscription_id=subscription.subscription_id,
                            event_id=event.event_id,
                            error=str(e))

                # Adiciona à dead letter queue se necessário
                await self._handle_callback_failure(subscription, event, str(e))

    async def _handle_callback_failure(self, subscription: EventSubscription, event: Event, error: str):
        """Lida com falhas de callback"""
        event.retry_count += 1

        if event.retry_count >= event.max_retries:
            # Move para dead letter queue
            dead_letter = EventDeadLetter(
                original_event=event,
                failure_reason=error,
                attempts=event.retry_count,
                last_error=error
            )
            self.dead_letter_queue.append(dead_letter)
            self.metrics.failed_deliveries += 1

            logger.warning("Event moved to dead letter queue",
                          event_id=event.event_id,
                          subscription_id=subscription.subscription_id)
        else:
            # Reagenda para retry
            await asyncio.sleep(2 ** event.retry_count)  # Exponential backoff
            await self._process_callbacks(subscription, event)

    def _update_processing_time(self, processing_time: float):
        """Atualiza tempo médio de processamento"""
        current_avg = self.metrics.avg_processing_time
        total_events = self.metrics.total_events

        if total_events > 0:
            self.metrics.avg_processing_time = (
                (current_avg * (total_events - 1) + processing_time) / total_events
            )

    async def _load_subscriptions(self):
        """Carrega subscrições persistidas do Redis"""
        try:
            keys = await self.redis.redis.keys("subscription:*")

            for key in keys:
                data = await self.redis.get(key.decode())
                if data:
                    subscription = EventSubscription(**data)
                    self.subscriptions[subscription.subscription_id] = subscription

            logger.info("Subscriptions loaded",
                       count=len(self.subscriptions))

        except Exception as e:
            logger.error("Failed to load subscriptions", error=str(e))

    async def _save_subscription(self, subscription: EventSubscription):
        """Salva uma subscrição no Redis"""
        try:
            await self.redis.set(
                f"subscription:{subscription.subscription_id}",
                subscription.dict(),
                ttl=86400  # 24 horas
            )
        except Exception as e:
            logger.error("Failed to save subscription",
                        subscription_id=subscription.subscription_id,
                        error=str(e))

    async def _save_subscriptions(self):
        """Salva todas as subscrições"""
        for subscription in self.subscriptions.values():
            await self._save_subscription(subscription)

    # Background tasks
    async def _process_event_queue(self):
        """Task que processa a fila de eventos"""
        while not self._shutdown_event.is_set():
            try:
                # Processa eventos em batches se necessário
                await asyncio.sleep(0.1)

            except Exception as e:
                logger.error("Error in event queue processing", error=str(e))
                await asyncio.sleep(1)

    async def _process_batches(self):
        """Task que processa batches de eventos"""
        while not self._shutdown_event.is_set():
            try:
                # Implementa processamento de batches
                await asyncio.sleep(self.batch_timeout)

            except Exception as e:
                logger.error("Error in batch processing", error=str(e))
                await asyncio.sleep(5)

    async def _cleanup_expired_data(self):
        """Task que limpa dados expirados"""
        while not self._shutdown_event.is_set():
            try:
                # Limpa buffer de eventos antigos
                cutoff = datetime.utcnow() - timedelta(hours=1)
                self.event_buffer = deque([
                    event for event in self.event_buffer
                    if event.timestamp > cutoff
                ], maxlen=10000)

                # Limpa streams inativos
                inactive_streams = [
                    stream_id for stream_id, stream in self.active_streams.items()
                    if (stream.last_read_at and
                        (datetime.utcnow() - stream.last_read_at).total_seconds() > 3600)
                ]

                for stream_id in inactive_streams:
                    del self.active_streams[stream_id]

                await asyncio.sleep(self.cleanup_interval)

            except Exception as e:
                logger.error("Error in cleanup task", error=str(e))
                await asyncio.sleep(self.cleanup_interval)

    async def _update_metrics(self):
        """Task que atualiza métricas periodicamente"""
        while not self._shutdown_event.is_set():
            try:
                # Atualiza métricas
                self.metrics.active_subscriptions = len(self.subscriptions)

                await asyncio.sleep(60)  # Atualiza a cada minuto

            except Exception as e:
                logger.error("Error updating metrics", error=str(e))
                await asyncio.sleep(60)

    async def _handle_dead_letters(self):
        """Task que processa dead letter queue"""
        while not self._shutdown_event.is_set():
            try:
                # Processa dead letters (retry logic, notificações, etc)
                if self.dead_letter_queue:
                    logger.info("Dead letter queue size",
                               size=len(self.dead_letter_queue))

                await asyncio.sleep(300)  # Verifica a cada 5 minutos

            except Exception as e:
                logger.error("Error handling dead letters", error=str(e))
                await asyncio.sleep(300)


# Context manager para facilitar uso
@asynccontextmanager
async def event_bus_context(redis_cache: RedisCache):
    """Context manager para Event Bus"""
    bus = EventBus(redis_cache)
    try:
        await bus.start()
        yield bus
    finally:
        await bus.shutdown()