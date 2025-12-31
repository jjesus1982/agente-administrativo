"""
Lifecycle Types - Definições de tipos para gerenciamento de ciclo de vida dos agentes
"""

import uuid
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from enum import Enum
from pydantic import BaseModel, Field


class AgentState(str, Enum):
    """Estados do ciclo de vida do agente"""
    # Estados básicos
    CREATED = "created"
    INITIALIZING = "initializing"
    STARTING = "starting"
    RUNNING = "running"
    IDLE = "idle"
    BUSY = "busy"
    PAUSING = "pausing"
    PAUSED = "paused"
    RESUMING = "resuming"
    STOPPING = "stopping"
    STOPPED = "stopped"
    TERMINATING = "terminating"
    TERMINATED = "terminated"

    # Estados de erro
    ERROR = "error"
    CRASHED = "crashed"
    UNHEALTHY = "unhealthy"
    TIMEOUT = "timeout"

    # Estados de manutenção
    MAINTENANCE = "maintenance"
    UPGRADING = "upgrading"
    SCALING = "scaling"


class LifecycleEvent(str, Enum):
    """Eventos do ciclo de vida"""
    # Comandos
    CREATE = "create"
    START = "start"
    STOP = "stop"
    PAUSE = "pause"
    RESUME = "resume"
    RESTART = "restart"
    TERMINATE = "terminate"
    UPGRADE = "upgrade"
    SCALE = "scale"

    # Eventos automáticos
    HEALTH_CHECK_FAILED = "health_check_failed"
    HEALTH_CHECK_PASSED = "health_check_passed"
    RESOURCE_THRESHOLD_EXCEEDED = "resource_threshold_exceeded"
    TASK_COMPLETED = "task_completed"
    ERROR_DETECTED = "error_detected"
    RECOVERY_STARTED = "recovery_started"
    RECOVERY_COMPLETED = "recovery_completed"


class ResourceType(str, Enum):
    """Tipos de recursos monitorados"""
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"
    CONNECTIONS = "connections"
    TASKS = "tasks"
    THREADS = "threads"


class HealthStatus(str, Enum):
    """Status de saúde do agente"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class ResourceUsage(BaseModel):
    """Uso de recursos de um agente"""
    agent_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Recursos de sistema
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    memory_percent: float = 0.0
    disk_mb: float = 0.0
    disk_percent: float = 0.0

    # Recursos de rede
    network_bytes_sent: int = 0
    network_bytes_recv: int = 0
    connections_count: int = 0

    # Recursos de aplicação
    active_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0
    thread_count: int = 0

    # Performance
    response_time_ms: float = 0.0
    error_rate: float = 0.0
    throughput: float = 0.0


class ResourceLimits(BaseModel):
    """Limites de recursos para um agente"""
    max_cpu_percent: float = 80.0
    max_memory_mb: float = 1024.0
    max_memory_percent: float = 80.0
    max_disk_mb: float = 2048.0
    max_connections: int = 100
    max_active_tasks: int = 10
    max_threads: int = 20
    max_response_time_ms: float = 5000.0
    max_error_rate: float = 0.05  # 5%


class HealthCheck(BaseModel):
    """Resultado de verificação de saúde"""
    agent_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: HealthStatus
    overall_score: float  # 0.0 to 1.0

    # Detalhes dos checks
    checks: Dict[str, Any] = {}

    # Mensagens e alertas
    messages: List[str] = []
    alerts: List[str] = []

    # Recursos
    resource_usage: Optional[ResourceUsage] = None

    # Tempo de resposta
    response_time_ms: float = 0.0


class AgentConfig(BaseModel):
    """Configuração de um agente"""
    agent_id: str
    agent_type: str
    name: str
    description: str

    # Configuração de recursos
    resource_limits: ResourceLimits = Field(default_factory=ResourceLimits)

    # Configuração de saúde
    health_check_interval: int = 30  # segundos
    health_check_timeout: int = 10   # segundos
    health_check_retries: int = 3
    unhealthy_threshold: int = 3     # falhas consecutivas

    # Configuração de restart
    restart_policy: str = "on-failure"  # "never", "on-failure", "always"
    max_restart_attempts: int = 5
    restart_backoff_seconds: int = 5

    # Configuração de scaling
    min_instances: int = 1
    max_instances: int = 3
    scale_up_threshold: float = 0.8   # CPU/Memory threshold para scale up
    scale_down_threshold: float = 0.3  # CPU/Memory threshold para scale down

    # Timeouts
    startup_timeout: int = 120        # segundos
    shutdown_timeout: int = 60        # segundos

    # Dependências
    depends_on: List[str] = []        # IDs de outros agentes
    required_services: List[str] = []  # Serviços externos necessários

    # Environment
    environment: Dict[str, str] = {}
    volumes: Dict[str, str] = {}


class AgentMetrics(BaseModel):
    """Métricas de um agente"""
    agent_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Estados
    current_state: AgentState
    uptime_seconds: int = 0
    state_duration_seconds: int = 0

    # Contadores
    restart_count: int = 0
    error_count: int = 0
    task_count: int = 0
    task_success_count: int = 0
    task_failure_count: int = 0

    # Performance
    avg_response_time_ms: float = 0.0
    avg_cpu_percent: float = 0.0
    avg_memory_percent: float = 0.0
    peak_memory_mb: float = 0.0

    # Disponibilidade
    availability_percent: float = 100.0
    last_health_check: Optional[datetime] = None
    health_score: float = 1.0


class LifecycleTransition(BaseModel):
    """Transição de estado no ciclo de vida"""
    transition_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    from_state: AgentState
    to_state: AgentState
    event: LifecycleEvent
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Contexto da transição
    triggered_by: str  # user, system, health_check, etc.
    reason: str = ""
    metadata: Dict[str, Any] = {}

    # Resultado
    success: bool = True
    error_message: Optional[str] = None
    duration_ms: Optional[float] = None


class RecoveryStrategy(BaseModel):
    """Estratégia de recuperação para problemas"""
    strategy_id: str
    name: str
    description: str

    # Condições de ativação
    trigger_conditions: List[str] = []
    trigger_states: List[AgentState] = []

    # Ações de recuperação
    actions: List[str] = []  # restart, scale, migrate, etc.
    max_attempts: int = 3
    backoff_multiplier: float = 2.0
    base_delay_seconds: int = 5

    # Timeouts
    action_timeout_seconds: int = 300
    overall_timeout_seconds: int = 1800


class AgentDeploymentSpec(BaseModel):
    """Especificação de deployment de agente"""
    agent_id: str
    config: AgentConfig
    recovery_strategies: List[RecoveryStrategy] = []

    # Deployment info
    deployment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deployed_at: Optional[datetime] = None
    deployed_by: Optional[str] = None
    deployment_version: str = "1.0.0"

    # Runtime info
    process_id: Optional[int] = None
    container_id: Optional[str] = None
    node_id: Optional[str] = None
    namespace: str = "default"


class LifecyclePolicy(BaseModel):
    """Política de ciclo de vida para tipos de agente"""
    policy_id: str
    agent_types: List[str]  # Tipos de agente aos quais se aplica
    name: str
    description: str

    # Políticas de estado
    max_idle_time_minutes: int = 30
    max_runtime_hours: int = 24
    auto_scale_enabled: bool = True
    auto_restart_enabled: bool = True

    # Políticas de recursos
    resource_monitoring_enabled: bool = True
    resource_alerts_enabled: bool = True
    resource_auto_scaling_enabled: bool = True

    # Políticas de saúde
    health_monitoring_enabled: bool = True
    health_auto_recovery_enabled: bool = True

    # Horários
    maintenance_windows: List[Dict[str, str]] = []
    off_hours: List[Dict[str, str]] = []


class SystemEvent(BaseModel):
    """Evento do sistema de lifecycle"""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str
    agent_id: Optional[str] = None
    severity: str = "info"  # debug, info, warning, error, critical

    # Dados do evento
    title: str
    message: str
    details: Dict[str, Any] = {}

    # Contexto
    source: str = "lifecycle_manager"
    correlation_id: Optional[str] = None
    tags: List[str] = []


class ClusterStatus(BaseModel):
    """Status do cluster de agentes"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Contadores gerais
    total_agents: int = 0
    running_agents: int = 0
    unhealthy_agents: int = 0
    error_agents: int = 0

    # Por tipo
    agents_by_type: Dict[str, int] = {}
    agents_by_state: Dict[str, int] = {}

    # Recursos do cluster
    total_cpu_usage: float = 0.0
    total_memory_usage_mb: float = 0.0
    total_active_tasks: int = 0

    # Performance
    average_health_score: float = 1.0
    average_response_time_ms: float = 0.0
    cluster_availability: float = 100.0

    # Alertas
    active_alerts: int = 0
    critical_alerts: int = 0