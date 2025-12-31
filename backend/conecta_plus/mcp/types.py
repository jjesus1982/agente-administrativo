"""
MCP Types - Estruturas de dados padronizadas para comunicação entre agentes
"""

from typing import Dict, List, Optional, Union, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class MCPMessage(BaseModel):
    """Mensagem base do protocolo MCP"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["request", "response", "notification"] = "request"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    source_agent: Optional[str] = None
    target_agent: Optional[str] = None
    tenant_id: Optional[int] = None


class MCPRequest(MCPMessage):
    """Requisição MCP para tools, prompts ou recursos"""
    type: Literal["request"] = "request"
    method: str
    params: Dict[str, Any] = {}

    class Config:
        schema_extra = {
            "example": {
                "id": "req-123",
                "method": "tools/call",
                "params": {
                    "tool_name": "network_scanner",
                    "arguments": {"subnet": "192.168.1.0/24"}
                },
                "source_agent": "orchestrator",
                "target_agent": "network_agent"
            }
        }


class MCPResponse(MCPMessage):
    """Resposta MCP para requisições"""
    type: Literal["response"] = "response"
    request_id: str
    success: bool = True
    result: Optional[Any] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = {}


class MCPError(BaseModel):
    """Erro padronizado MCP"""
    code: int
    message: str
    data: Optional[Dict[str, Any]] = None


class MCPCapability(BaseModel):
    """Capacidade de um agente ou MCP server"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    examples: List[Dict[str, Any]] = []


class MCPToolCall(BaseModel):
    """Chamada de ferramenta MCP"""
    tool_name: str
    arguments: Dict[str, Any]
    timeout: Optional[int] = 30
    priority: int = 1  # 1=baixa, 5=alta


class MCPPromptTemplate(BaseModel):
    """Template de prompt MCP"""
    name: str
    description: str
    template: str
    variables: List[str]
    examples: List[Dict[str, str]] = []


class MCPResourceInfo(BaseModel):
    """Informação de recurso MCP"""
    uri: str
    mime_type: str
    size: Optional[int] = None
    description: str
    metadata: Dict[str, Any] = {}


class MCPAgentInfo(BaseModel):
    """Informações de um agente"""
    agent_id: str
    name: str
    description: str
    capabilities: List[str]
    tools: List[str]
    prompts: List[str]
    resources: List[str]
    status: Literal["online", "offline", "busy", "error"] = "online"
    last_heartbeat: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}


class MCPServerInfo(BaseModel):
    """Informações de um servidor MCP"""
    server_id: str
    name: str
    description: str
    endpoint: str
    version: str = "1.0.0"
    capabilities: List[MCPCapability]
    tools: List[str]
    prompts: List[str]
    resources: List[str]
    status: Literal["online", "offline", "error"] = "online"
    registered_at: datetime = Field(default_factory=datetime.utcnow)


class MCPNotification(MCPMessage):
    """Notificação assíncrona MCP"""
    type: Literal["notification"] = "notification"
    method: str
    params: Dict[str, Any] = {}


class MCPTask(BaseModel):
    """Tarefa distribuída entre agentes"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_type: str
    description: str
    priority: int = 1
    assigned_agent: Optional[str] = None
    status: Literal["pending", "running", "completed", "failed", "cancelled"] = "pending"
    input_data: Dict[str, Any] = {}
    output_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    timeout: Optional[int] = None
    retry_count: int = 0
    max_retries: int = 3
    metadata: Dict[str, Any] = {}


class MCPContext(BaseModel):
    """Contexto compartilhado entre agentes"""
    context_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    context_type: str
    agent_id: str
    data: Dict[str, Any]
    expires_at: Optional[datetime] = None
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)