"""
Event Handlers - Sistema de handlers de eventos com decorators
"""

import asyncio
from typing import Dict, List, Callable, Any, Type, Optional
from abc import ABC, abstractmethod
import structlog

from ..core.logger import get_logger
from .types import Event, EventType, EventFilter, EventPattern, EventPriority

logger = get_logger(__name__)


class EventHandler(ABC):
    """Base class para handlers de eventos"""

    def __init__(self, name: str = None):
        self.name = name or self.__class__.__name__
        self.event_types: List[EventType] = []
        self.priority: EventPriority = EventPriority.NORMAL
        self.is_async = True

    @abstractmethod
    async def handle(self, event: Event) -> Any:
        """Processa um evento"""
        pass

    def can_handle(self, event: Event) -> bool:
        """Verifica se pode processar um evento"""
        return event.event_type in self.event_types

    async def pre_handle(self, event: Event):
        """Hook executado antes do handle"""
        pass

    async def post_handle(self, event: Event, result: Any):
        """Hook executado após o handle"""
        pass

    async def on_error(self, event: Event, error: Exception):
        """Hook executado em caso de erro"""
        logger.error("Event handler error",
                    handler=self.name,
                    event_id=event.event_id,
                    error=str(error))


class HandlerRegistry:
    """Registry de handlers de eventos"""

    def __init__(self):
        self.handlers: Dict[EventType, List[EventHandler]] = {}
        self._decorated_handlers: List[Callable] = []

    def register(self, handler: EventHandler, event_types: List[EventType] = None):
        """Registra um handler"""
        if event_types:
            handler.event_types = event_types

        for event_type in handler.event_types:
            if event_type not in self.handlers:
                self.handlers[event_type] = []
            self.handlers[event_type].append(handler)

        logger.info("Event handler registered",
                   handler=handler.name,
                   event_types=[et.value for et in handler.event_types])

    def register_decorated(self, func: Callable, event_types: List[EventType], priority: EventPriority = EventPriority.NORMAL):
        """Registra uma função decorada como handler"""
        handler = DecoratedHandler(func, event_types, priority)
        self.register(handler)

    def get_handlers(self, event_type: EventType) -> List[EventHandler]:
        """Obtém handlers para um tipo de evento"""
        return self.handlers.get(event_type, [])

    async def process_event(self, event: Event):
        """Processa um evento com todos os handlers aplicáveis"""
        handlers = self.get_handlers(event.event_type)

        if not handlers:
            logger.debug("No handlers found for event",
                        event_type=event.event_type.value,
                        event_id=event.event_id)
            return

        # Ordena handlers por prioridade
        handlers.sort(key=lambda h: h.priority.value, reverse=True)

        # Executa handlers
        tasks = []
        for handler in handlers:
            if handler.can_handle(event):
                task = self._execute_handler(handler, event)
                tasks.append(task)

        # Aguarda todos os handlers
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _execute_handler(self, handler: EventHandler, event: Event):
        """Executa um handler específico"""
        try:
            await handler.pre_handle(event)
            result = await handler.handle(event)
            await handler.post_handle(event, result)

        except Exception as e:
            await handler.on_error(event, e)


class DecoratedHandler(EventHandler):
    """Handler wrapper para funções decoradas"""

    def __init__(self, func: Callable, event_types: List[EventType], priority: EventPriority):
        super().__init__(func.__name__)
        self.func = func
        self.event_types = event_types
        self.priority = priority
        self.is_async = asyncio.iscoroutinefunction(func)

    async def handle(self, event: Event) -> Any:
        if self.is_async:
            return await self.func(event)
        else:
            return self.func(event)


# Registry global
_handler_registry = HandlerRegistry()


def event_handler(event_types: List[EventType], priority: EventPriority = EventPriority.NORMAL):
    """Decorator para registrar handlers de eventos"""
    def decorator(func):
        _handler_registry.register_decorated(func, event_types, priority)
        return func
    return decorator


def get_handler_registry() -> HandlerRegistry:
    """Obtém o registry global de handlers"""
    return _handler_registry


# Handlers padrão do sistema
class SystemEventHandler(EventHandler):
    """Handler para eventos de sistema"""

    def __init__(self):
        super().__init__("SystemEventHandler")
        self.event_types = [
            EventType.SYSTEM_ALERT,
            EventType.SYSTEM_WARNING,
            EventType.SYSTEM_INFO,
            EventType.PERFORMANCE_THRESHOLD,
            EventType.RESOURCE_THRESHOLD
        ]
        self.priority = EventPriority.HIGH

    async def handle(self, event: Event) -> Any:
        """Processa eventos de sistema"""
        logger.info("System event received",
                   event_type=event.event_type.value,
                   event_data=event.data)

        # Lógica específica por tipo de evento
        if event.event_type == EventType.SYSTEM_ALERT:
            await self._handle_alert(event)
        elif event.event_type == EventType.PERFORMANCE_THRESHOLD:
            await self._handle_performance_threshold(event)
        elif event.event_type == EventType.RESOURCE_THRESHOLD:
            await self._handle_resource_threshold(event)

    async def _handle_alert(self, event: Event):
        """Processa alertas de sistema"""
        alert_level = event.data.get("level", "medium")
        message = event.data.get("message", "System alert")

        logger.warning("System alert",
                      level=alert_level,
                      message=message,
                      source=event.source_agent)

        # Aqui poderia notificar administradores, enviar emails, etc.

    async def _handle_performance_threshold(self, event: Event):
        """Processa alertas de performance"""
        metric = event.data.get("metric")
        value = event.data.get("value")
        threshold = event.data.get("threshold")

        logger.warning("Performance threshold exceeded",
                      metric=metric,
                      value=value,
                      threshold=threshold,
                      source=event.source_agent)

    async def _handle_resource_threshold(self, event: Event):
        """Processa alertas de recursos"""
        resource = event.data.get("resource")
        usage = event.data.get("usage")
        limit = event.data.get("limit")

        logger.warning("Resource threshold exceeded",
                      resource=resource,
                      usage=usage,
                      limit=limit,
                      source=event.source_agent)


class AgentEventHandler(EventHandler):
    """Handler para eventos de agentes"""

    def __init__(self):
        super().__init__("AgentEventHandler")
        self.event_types = [
            EventType.AGENT_STARTED,
            EventType.AGENT_STOPPED,
            EventType.AGENT_ERROR,
            EventType.AGENT_STATUS_CHANGED
        ]

    async def handle(self, event: Event) -> Any:
        """Processa eventos de agentes"""
        agent_id = event.source_agent

        if event.event_type == EventType.AGENT_STARTED:
            logger.info("Agent started", agent_id=agent_id)

        elif event.event_type == EventType.AGENT_STOPPED:
            logger.info("Agent stopped", agent_id=agent_id)

        elif event.event_type == EventType.AGENT_ERROR:
            error_msg = event.data.get("error", "Unknown error")
            logger.error("Agent error", agent_id=agent_id, error=error_msg)

        elif event.event_type == EventType.AGENT_STATUS_CHANGED:
            old_status = event.data.get("old_status")
            new_status = event.data.get("new_status")
            logger.info("Agent status changed",
                       agent_id=agent_id,
                       old_status=old_status,
                       new_status=new_status)


class TaskEventHandler(EventHandler):
    """Handler para eventos de tarefas"""

    def __init__(self):
        super().__init__("TaskEventHandler")
        self.event_types = [
            EventType.TASK_CREATED,
            EventType.TASK_ASSIGNED,
            EventType.TASK_STARTED,
            EventType.TASK_COMPLETED,
            EventType.TASK_FAILED,
            EventType.TASK_TIMEOUT,
            EventType.TASK_CANCELLED
        ]

    async def handle(self, event: Event) -> Any:
        """Processa eventos de tarefas"""
        task_id = event.data.get("task_id")
        task_type = event.data.get("task_type")

        if event.event_type == EventType.TASK_CREATED:
            logger.info("Task created",
                       task_id=task_id,
                       task_type=task_type)

        elif event.event_type == EventType.TASK_ASSIGNED:
            agent_id = event.data.get("agent_id")
            logger.info("Task assigned",
                       task_id=task_id,
                       agent_id=agent_id)

        elif event.event_type == EventType.TASK_COMPLETED:
            execution_time = event.data.get("execution_time")
            logger.info("Task completed",
                       task_id=task_id,
                       execution_time=execution_time)

        elif event.event_type == EventType.TASK_FAILED:
            error = event.data.get("error")
            logger.error("Task failed",
                        task_id=task_id,
                        error=error)

        elif event.event_type == EventType.TASK_TIMEOUT:
            logger.warning("Task timeout",
                          task_id=task_id)


class WorkflowEventHandler(EventHandler):
    """Handler para eventos de workflows"""

    def __init__(self):
        super().__init__("WorkflowEventHandler")
        self.event_types = [
            EventType.WORKFLOW_STARTED,
            EventType.WORKFLOW_STEP_COMPLETED,
            EventType.WORKFLOW_COMPLETED,
            EventType.WORKFLOW_FAILED
        ]

    async def handle(self, event: Event) -> Any:
        """Processa eventos de workflows"""
        workflow_id = event.data.get("workflow_id")
        execution_id = event.data.get("execution_id")

        if event.event_type == EventType.WORKFLOW_STARTED:
            logger.info("Workflow started",
                       workflow_id=workflow_id,
                       execution_id=execution_id)

        elif event.event_type == EventType.WORKFLOW_STEP_COMPLETED:
            step_id = event.data.get("step_id")
            logger.info("Workflow step completed",
                       workflow_id=workflow_id,
                       step_id=step_id)

        elif event.event_type == EventType.WORKFLOW_COMPLETED:
            logger.info("Workflow completed",
                       workflow_id=workflow_id,
                       execution_id=execution_id)

        elif event.event_type == EventType.WORKFLOW_FAILED:
            error = event.data.get("error")
            logger.error("Workflow failed",
                        workflow_id=workflow_id,
                        error=error)


# Registra handlers padrão
def register_default_handlers():
    """Registra handlers padrão do sistema"""
    registry = get_handler_registry()

    registry.register(SystemEventHandler())
    registry.register(AgentEventHandler())
    registry.register(TaskEventHandler())
    registry.register(WorkflowEventHandler())

    logger.info("Default event handlers registered")


# Exemplos de uso com decorators
@event_handler([EventType.DEVICE_DISCOVERED], EventPriority.HIGH)
async def handle_device_discovered(event: Event):
    """Handler para dispositivos descobertos"""
    device_ip = event.data.get("device_ip")
    device_type = event.data.get("device_type")

    logger.info("New device discovered",
               device_ip=device_ip,
               device_type=device_type)


@event_handler([EventType.VPN_CONNECTION_LOST], EventPriority.CRITICAL)
async def handle_vpn_connection_lost(event: Event):
    """Handler para perda de conexão VPN"""
    vpn_id = event.data.get("vpn_id")
    reason = event.data.get("reason")

    logger.critical("VPN connection lost",
                   vpn_id=vpn_id,
                   reason=reason)

    # Poderia tentar reconectar automaticamente
    # await reconnect_vpn(vpn_id)


@event_handler([EventType.INSTALLATION_COMPLETED], EventPriority.NORMAL)
async def handle_installation_completed(event: Event):
    """Handler para instalações concluídas"""
    installation_id = event.data.get("installation_id")
    location = event.data.get("location")

    logger.info("Installation completed",
               installation_id=installation_id,
               location=location)

    # Poderia enviar notificação para o cliente
    # await notify_installation_complete(installation_id)