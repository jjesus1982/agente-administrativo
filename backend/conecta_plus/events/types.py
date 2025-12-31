"""
Event Types - Definições de tipos e estruturas para o sistema de eventos
"""

import uuid
from typing import Dict, List, Optional, Any, Union, Callable
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Tipos de eventos do sistema"""
    # Eventos de Agentes
    AGENT_STARTED = "agent.started"
    AGENT_STOPPED = "agent.stopped"
    AGENT_ERROR = "agent.error"
    AGENT_HEARTBEAT = "agent.heartbeat"
    AGENT_STATUS_CHANGED = "agent.status_changed"

    # Eventos de Tarefas
    TASK_CREATED = "task.created"
    TASK_ASSIGNED = "task.assigned"
    TASK_STARTED = "task.started"
    TASK_COMPLETED = "task.completed"
    TASK_FAILED = "task.failed"
    TASK_TIMEOUT = "task.timeout"
    TASK_CANCELLED = "task.cancelled"

    # Eventos de Workflow
    WORKFLOW_STARTED = "workflow.started"
    WORKFLOW_STEP_COMPLETED = "workflow.step_completed"
    WORKFLOW_COMPLETED = "workflow.completed"
    WORKFLOW_FAILED = "workflow.failed"

    # Eventos de Dispositivos/Rede
    DEVICE_DISCOVERED = "device.discovered"
    DEVICE_CONFIGURED = "device.configured"
    DEVICE_ONLINE = "device.online"
    DEVICE_OFFLINE = "device.offline"
    DEVICE_ERROR = "device.error"
    NETWORK_SCAN_COMPLETED = "network.scan_completed"
    VPN_CONNECTION_ESTABLISHED = "vpn.connection_established"
    VPN_CONNECTION_LOST = "vpn.connection_lost"

    # Eventos de Instalação
    INSTALLATION_STARTED = "installation.started"
    INSTALLATION_COMPLETED = "installation.completed"
    INSTALLATION_FAILED = "installation.failed"
    EQUIPMENT_INSTALLED = "equipment.installed"
    COMMISSIONING_COMPLETED = "commissioning.completed"

    # Eventos de Sistema
    SYSTEM_ALERT = "system.alert"
    SYSTEM_WARNING = "system.warning"
    SYSTEM_INFO = "system.info"
    PERFORMANCE_THRESHOLD = "performance.threshold"
    RESOURCE_THRESHOLD = "resource.threshold"

    # Eventos de Usuário/Tenant
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    TENANT_CREATED = "tenant.created"
    TENANT_UPDATED = "tenant.updated"

    # Eventos de Manutenção
    MAINTENANCE_SCHEDULED = "maintenance.scheduled"
    MAINTENANCE_STARTED = "maintenance.started"
    MAINTENANCE_COMPLETED = "maintenance.completed"
    TICKET_CREATED = "ticket.created"
    TICKET_RESOLVED = "ticket.resolved"

    # Eventos de Documentação
    DOCUMENT_GENERATED = "document.generated"
    DIAGRAM_CREATED = "diagram.created"
    AS_BUILT_COMPLETED = "as_built.completed"

    # Eventos de Integração
    MCP_SERVER_REGISTERED = "mcp.server_registered"
    MCP_TOOL_CALLED = "mcp.tool_called"
    API_CALL_MADE = "api.call_made"
    WEBHOOK_RECEIVED = "webhook.received"


class EventPriority(int, Enum):
    """Prioridade dos eventos"""
    CRITICAL = 5
    HIGH = 4
    NORMAL = 3
    LOW = 2
    DEBUG = 1


class EventPattern(BaseModel):
    """Padrão para filtrar eventos"""
    event_type: Optional[str] = None  # Pode usar wildcards: "task.*"
    source_agent: Optional[str] = None
    target_agent: Optional[str] = None
    tenant_id: Optional[int] = None
    tags: List[str] = []
    priority: Optional[EventPriority] = None


class EventFilter(BaseModel):
    """Filtro para subscrições de eventos"""
    patterns: List[EventPattern] = []
    exclude_patterns: List[EventPattern] = []
    min_priority: EventPriority = EventPriority.DEBUG
    max_events_per_minute: Optional[int] = None  # Rate limiting


class Event(BaseModel):
    """Evento base do sistema"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_agent: Optional[str] = None
    target_agent: Optional[str] = None
    tenant_id: Optional[int] = None
    priority: EventPriority = EventPriority.NORMAL

    # Dados do evento
    data: Dict[str, Any] = {}

    # Metadados
    correlation_id: Optional[str] = None  # Para rastrear eventos relacionados
    parent_event_id: Optional[str] = None  # Para eventos hierárquicos
    tags: List[str] = []

    # TTL e reprocessamento
    ttl: Optional[int] = None  # TTL em segundos
    retry_count: int = 0
    max_retries: int = 3

    class Config:
        schema_extra = {
            "example": {
                "event_id": "evt-123",
                "event_type": "task.completed",
                "source_agent": "network_analyst",
                "data": {
                    "task_id": "task-456",
                    "result": {"devices_found": 5},
                    "execution_time": 30.5
                },
                "tags": ["network", "scan"]
            }
        }


class EventSubscription(BaseModel):
    """Subscrição a eventos"""
    subscription_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscriber_id: str  # Agent ID ou Service ID
    filter: EventFilter
    callback_url: Optional[str] = None  # Para webhooks
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_event_at: Optional[datetime] = None
    event_count: int = 0


class EventAck(BaseModel):
    """Acknowledgment de evento"""
    event_id: str
    subscriber_id: str
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    success: bool = True
    error_message: Optional[str] = None
    processing_time: Optional[float] = None  # Em segundos


class EventMetrics(BaseModel):
    """Métricas de eventos"""
    total_events: int = 0
    events_by_type: Dict[str, int] = {}
    events_by_priority: Dict[str, int] = {}
    events_by_agent: Dict[str, int] = {}
    avg_processing_time: float = 0
    failed_deliveries: int = 0
    active_subscriptions: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class EventBatch(BaseModel):
    """Lote de eventos para processamento eficiente"""
    batch_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    events: List[Event]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    subscriber_id: str


class EventStream(BaseModel):
    """Stream de eventos para subscrições em tempo real"""
    stream_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscriber_id: str
    filter: EventFilter
    buffer_size: int = 100
    events: List[Event] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_read_at: Optional[datetime] = None


class EventDeadLetter(BaseModel):
    """Evento que falhou múltiplas vezes"""
    original_event: Event
    failure_reason: str
    failed_at: datetime = Field(default_factory=datetime.utcnow)
    attempts: int = 0
    last_error: Optional[str] = None


# Tipos de callback para handlers
EventCallback = Callable[[Event], Any]
AsyncEventCallback = Callable[[Event], Any]  # async function