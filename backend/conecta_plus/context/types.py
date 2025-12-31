"""
Context Types - Definições de tipos para o sistema de contexto compartilhado
"""

import uuid
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class ContextType(str, Enum):
    """Tipos de contexto compartilhado"""
    # Contextos Técnicos
    NETWORK_TOPOLOGY = "network_topology"
    DEVICE_CONFIG = "device_config"
    INSTALLATION_PLAN = "installation_plan"
    TROUBLESHOOTING_SESSION = "troubleshooting_session"
    PERFORMANCE_METRICS = "performance_metrics"

    # Contextos de Projeto
    PROJECT_STATE = "project_state"
    INSTALLATION_PROGRESS = "installation_progress"
    SITE_SURVEY = "site_survey"
    EQUIPMENT_INVENTORY = "equipment_inventory"
    CUSTOMER_REQUIREMENTS = "customer_requirements"

    # Contextos de Conhecimento
    SOLUTION_KNOWLEDGE = "solution_knowledge"
    ERROR_PATTERNS = "error_patterns"
    BEST_PRACTICES = "best_practices"
    LESSONS_LEARNED = "lessons_learned"
    VENDOR_SPECIFICS = "vendor_specifics"

    # Contextos de Workflow
    WORKFLOW_STATE = "workflow_state"
    TASK_DEPENDENCIES = "task_dependencies"
    AGENT_COLLABORATION = "agent_collaboration"
    EXECUTION_HISTORY = "execution_history"

    # Contextos de Cliente/Tenant
    TENANT_PREFERENCES = "tenant_preferences"
    HISTORICAL_DATA = "historical_data"
    CUSTOMER_FEEDBACK = "customer_feedback"
    SERVICE_HISTORY = "service_history"

    # Contextos Temporários
    SESSION_DATA = "session_data"
    WORKING_MEMORY = "working_memory"
    CACHE_DATA = "cache_data"


class ContextScope(str, Enum):
    """Escopo de visibilidade do contexto"""
    GLOBAL = "global"           # Visível para todos os agentes
    TENANT = "tenant"           # Visível apenas para agentes do tenant
    PROJECT = "project"         # Visível apenas para agentes do projeto
    WORKFLOW = "workflow"       # Visível apenas para agentes do workflow
    AGENT_GROUP = "agent_group" # Visível para grupo específico de agentes
    PRIVATE = "private"         # Visível apenas para o agente criador


class ContextPriority(int, Enum):
    """Prioridade do contexto"""
    CRITICAL = 5
    HIGH = 4
    NORMAL = 3
    LOW = 2
    CACHE = 1


class ContextMetadata(BaseModel):
    """Metadados do contexto"""
    source_agent: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: int = 1

    # Controle de acesso
    scope: ContextScope = ContextScope.TENANT
    allowed_agents: List[str] = []
    restricted_agents: List[str] = []

    # TTL e limpeza
    expires_at: Optional[datetime] = None
    auto_cleanup: bool = True

    # Classificação
    tags: List[str] = []
    priority: ContextPriority = ContextPriority.NORMAL

    # Auditoria
    access_count: int = 0
    last_accessed_at: Optional[datetime] = None
    last_accessed_by: Optional[str] = None


class Context(BaseModel):
    """Contexto compartilhado entre agentes"""
    context_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context_type: ContextType
    tenant_id: Optional[int] = None
    project_id: Optional[str] = None
    workflow_id: Optional[str] = None

    # Dados do contexto
    data: Dict[str, Any] = {}

    # Metadados
    metadata: ContextMetadata

    # Relacionamentos
    parent_context_id: Optional[str] = None
    child_context_ids: List[str] = []
    related_context_ids: List[str] = []

    # Versionamento
    version: int = 1
    previous_version_id: Optional[str] = None


class ContextQuery(BaseModel):
    """Query para buscar contextos"""
    context_type: Optional[ContextType] = None
    tenant_id: Optional[int] = None
    project_id: Optional[str] = None
    workflow_id: Optional[str] = None
    agent_id: Optional[str] = None

    # Filtros de metadados
    tags: List[str] = []
    min_priority: ContextPriority = ContextPriority.CACHE
    scope: Optional[ContextScope] = None

    # Filtros temporais
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    updated_after: Optional[datetime] = None
    updated_before: Optional[datetime] = None

    # Filtros de dados (usando dot notation)
    data_filters: Dict[str, Any] = {}

    # Ordenação e paginação
    sort_by: str = "created_at"
    sort_order: str = "desc"  # "asc" or "desc"
    limit: int = 50
    offset: int = 0


class ContextUpdate(BaseModel):
    """Atualização de contexto"""
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[ContextMetadata] = None
    add_tags: List[str] = []
    remove_tags: List[str] = []
    add_related_contexts: List[str] = []
    remove_related_contexts: List[str] = []


class ContextAccess(BaseModel):
    """Log de acesso ao contexto"""
    access_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context_id: str
    agent_id: str
    tenant_id: Optional[int] = None
    access_type: str  # "read", "write", "delete"
    accessed_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ContextSnapshot(BaseModel):
    """Snapshot de um contexto para versionamento"""
    snapshot_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context_id: str
    version: int
    data: Dict[str, Any]
    metadata: ContextMetadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class ContextIndex(BaseModel):
    """Índice para busca eficiente de contextos"""
    index_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context_id: str
    context_type: ContextType
    tenant_id: Optional[int] = None
    project_id: Optional[str] = None
    tags: List[str] = []

    # Dados indexados para busca
    indexed_data: Dict[str, Any] = {}

    # Timestamps para ordenação
    created_at: datetime
    updated_at: datetime

    # Score para relevância
    relevance_score: float = 1.0


class ContextRelation(BaseModel):
    """Relação entre contextos"""
    relation_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_context_id: str
    target_context_id: str
    relation_type: str  # "parent", "child", "reference", "dependency", "similar"
    weight: float = 1.0  # Força da relação
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: str


class ContextStats(BaseModel):
    """Estatísticas do sistema de contexto"""
    total_contexts: int = 0
    contexts_by_type: Dict[str, int] = {}
    contexts_by_scope: Dict[str, int] = {}
    contexts_by_priority: Dict[str, int] = {}

    # Estatísticas de uso
    total_accesses: int = 0
    unique_accessors: int = 0
    most_accessed_contexts: List[str] = []

    # Estatísticas de storage
    total_storage_size: int = 0  # em bytes
    average_context_size: float = 0
    largest_contexts: List[str] = []

    # Estatísticas temporais
    contexts_created_today: int = 0
    contexts_updated_today: int = 0
    contexts_expired_today: int = 0

    # Performance
    average_query_time: float = 0  # em ms
    cache_hit_rate: float = 0

    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MemoryType(str, Enum):
    """Tipos de memória compartilhada"""
    WORKING = "working"           # Memória de trabalho temporária
    EPISODIC = "episodic"         # Memórias de episódios/eventos
    SEMANTIC = "semantic"         # Conhecimento semântico
    PROCEDURAL = "procedural"     # Conhecimento procedural
    DECLARATIVE = "declarative"   # Conhecimento declarativo


class MemoryEntry(BaseModel):
    """Entrada na memória compartilhada"""
    memory_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    memory_type: MemoryType
    content: str

    # Embedding para busca semântica
    embedding: Optional[List[float]] = None

    # Metadados
    source_agent: str
    tenant_id: Optional[int] = None
    tags: List[str] = []
    confidence: float = 1.0
    relevance: float = 1.0

    # Temporal
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed_at: Optional[datetime] = None
    access_count: int = 0

    # TTL
    expires_at: Optional[datetime] = None

    # Relacionamentos
    related_memories: List[str] = []
    context_ids: List[str] = []


class VectorSearchResult(BaseModel):
    """Resultado de busca vetorial"""
    memory_id: str
    content: str
    similarity_score: float
    metadata: Dict[str, Any] = {}


class ContextSearchResult(BaseModel):
    """Resultado de busca de contextos"""
    context: Context
    relevance_score: float
    match_reasons: List[str] = []  # Razões para o match


class MemorySearchQuery(BaseModel):
    """Query para busca na memória compartilhada"""
    query_text: Optional[str] = None
    query_embedding: Optional[List[float]] = None
    memory_types: List[MemoryType] = []
    agent_id: Optional[str] = None
    tenant_id: Optional[int] = None
    tags: List[str] = []

    # Filtros temporais
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None

    # Parâmetros de busca
    max_results: int = 10
    min_similarity: float = 0.5
    include_related: bool = False