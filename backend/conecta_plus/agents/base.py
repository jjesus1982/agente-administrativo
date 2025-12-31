"""
Base Agent - Classe base para todos os agentes especializados
"""

import asyncio
import uuid
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum
from pydantic import BaseModel
import structlog

from ..core.logger import get_logger
from ..mcp.types import MCPTask, MCPContext, MCPAgentInfo
from ..mcp.client import MCPClient

logger = get_logger(__name__)


class AgentType(str, Enum):
    """Tipos de agentes especializados"""
    # Agentes de Infraestrutura de Rede
    NETWORK_ANALYST = "network_analyst"
    SECURITY_SPECIALIST = "security_specialist"
    CONFIG_GENERATOR = "config_generator"
    DEVICE_MANAGER = "device_manager"
    VPN_SPECIALIST = "vpn_specialist"

    # Agentes de Instalação e Campo
    INSTALLER_COORDINATOR = "installer_coordinator"
    FIELD_TECHNICIAN = "field_technician"
    QUALITY_INSPECTOR = "quality_inspector"
    TROUBLESHOOTER = "troubleshooter"
    TESTER = "tester"

    # Agentes de Documentação
    TECHNICAL_WRITER = "technical_writer"
    DIAGRAM_GENERATOR = "diagram_generator"
    MANUAL_CREATOR = "manual_creator"
    AS_BUILT_SPECIALIST = "as_built_specialist"
    ITIL_DOCUMENTER = "itil_documenter"

    # Agentes de Automação
    WORKFLOW_AUTOMATOR = "workflow_automator"
    SCHEDULER = "scheduler"
    NOTIFICATION_MANAGER = "notification_manager"
    INTEGRATION_MANAGER = "integration_manager"
    BACKUP_MANAGER = "backup_manager"

    # Agentes de Análise e BI
    DATA_ANALYST = "data_analyst"
    PERFORMANCE_MONITOR = "performance_monitor"
    PREDICTIVE_ANALYST = "predictive_analyst"
    REPORT_GENERATOR = "report_generator"
    KPI_TRACKER = "kpi_tracker"

    # Agentes de Suporte
    HELP_DESK = "help_desk"
    TRAINING_SPECIALIST = "training_specialist"
    CUSTOMER_SUCCESS = "customer_success"
    ESCALATION_MANAGER = "escalation_manager"
    FEEDBACK_COLLECTOR = "feedback_collector"

    # Agentes de Gestão
    PROJECT_MANAGER = "project_manager"
    RESOURCE_ALLOCATOR = "resource_allocator"
    COST_OPTIMIZER = "cost_optimizer"
    COMPLIANCE_CHECKER = "compliance_checker"
    RISK_ASSESSOR = "risk_assessor"

    # Agente Mestre
    MASTER_ORCHESTRATOR = "master_orchestrator"


class AgentCapability(str, Enum):
    """Capacidades específicas dos agentes"""
    # Capacidades Técnicas
    NETWORK_SCANNING = "network_scanning"
    DEVICE_CONFIG = "device_config"
    VPN_SETUP = "vpn_setup"
    SECURITY_AUDIT = "security_audit"
    PERFORMANCE_ANALYSIS = "performance_analysis"

    # Capacidades de Instalação
    SITE_SURVEY = "site_survey"
    EQUIPMENT_INSTALL = "equipment_install"
    CABLE_ROUTING = "cable_routing"
    TESTING_VALIDATION = "testing_validation"
    COMMISSIONING = "commissioning"

    # Capacidades de Documentação
    TECHNICAL_WRITING = "technical_writing"
    DIAGRAM_CREATION = "diagram_creation"
    VIDEO_CREATION = "video_creation"
    MANUAL_GENERATION = "manual_generation"
    CHANGE_DOCUMENTATION = "change_documentation"

    # Capacidades de Automação
    WORKFLOW_DESIGN = "workflow_design"
    TASK_SCHEDULING = "task_scheduling"
    EVENT_HANDLING = "event_handling"
    INTEGRATION_API = "integration_api"
    BACKUP_RESTORE = "backup_restore"

    # Capacidades de Análise
    DATA_MINING = "data_mining"
    PREDICTIVE_MODELING = "predictive_modeling"
    REPORT_BUILDING = "report_building"
    DASHBOARD_CREATION = "dashboard_creation"
    ANOMALY_DETECTION = "anomaly_detection"

    # Capacidades de Suporte
    TICKET_RESOLUTION = "ticket_resolution"
    USER_TRAINING = "user_training"
    CUSTOMER_COMMUNICATION = "customer_communication"
    ESCALATION_HANDLING = "escalation_handling"
    FEEDBACK_ANALYSIS = "feedback_analysis"


class AgentPriority(int, Enum):
    """Prioridade dos agentes"""
    CRITICAL = 5
    HIGH = 4
    NORMAL = 3
    LOW = 2
    BACKGROUND = 1


class AgentStatus(str, Enum):
    """Status dos agentes"""
    INITIALIZING = "initializing"
    ONLINE = "online"
    BUSY = "busy"
    IDLE = "idle"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    OFFLINE = "offline"


class AgentMessage(BaseModel):
    """Mensagem entre agentes"""
    message_id: str
    from_agent: str
    to_agent: str
    message_type: str
    content: Dict[str, Any]
    priority: AgentPriority = AgentPriority.NORMAL
    timestamp: datetime
    requires_response: bool = False
    parent_message_id: Optional[str] = None


class AgentTask(BaseModel):
    """Tarefa específica de um agente"""
    task_id: str
    agent_id: str
    task_type: str
    description: str
    parameters: Dict[str, Any]
    priority: AgentPriority = AgentPriority.NORMAL
    status: str = "pending"
    assigned_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    parent_task_id: Optional[str] = None
    child_tasks: List[str] = []


class BaseAgent(ABC):
    """Classe base para todos os agentes especializados"""

    def __init__(self,
                 agent_id: str,
                 agent_type: AgentType,
                 capabilities: List[AgentCapability],
                 name: str,
                 description: str,
                 mcp_client: Optional[MCPClient] = None):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.capabilities = capabilities
        self.name = name
        self.description = description
        self.status = AgentStatus.INITIALIZING
        self.mcp_client = mcp_client

        # Estado interno
        self.current_tasks: Dict[str, AgentTask] = {}
        self.message_queue: List[AgentMessage] = []
        self.context_cache: Dict[str, Any] = {}
        self.performance_metrics: Dict[str, float] = {
            "tasks_completed": 0,
            "avg_execution_time": 0,
            "success_rate": 100,
            "load_factor": 0
        }

        # Configuração
        self.max_concurrent_tasks = 5
        self.task_timeout = 300  # 5 minutos
        self.heartbeat_interval = 30  # 30 segundos

        self.logger = get_logger(f"agent.{agent_type.value}")

    async def initialize(self):
        """Inicializa o agente"""
        try:
            self.logger.info("Agent initializing",
                           agent_id=self.agent_id,
                           agent_type=self.agent_type.value)

            # Configura MCP client se disponível
            if self.mcp_client:
                await self.mcp_client.start()
                await self._register_with_mcp()

            # Inicialização específica do agente
            await self._initialize_agent()

            self.status = AgentStatus.ONLINE
            self.logger.info("Agent initialized successfully",
                           agent_id=self.agent_id)

        except Exception as e:
            self.status = AgentStatus.ERROR
            self.logger.error("Agent initialization failed",
                            agent_id=self.agent_id,
                            error=str(e))
            raise

    async def shutdown(self):
        """Finaliza o agente"""
        try:
            self.status = AgentStatus.OFFLINE

            # Finaliza tarefas pendentes
            await self._cleanup_tasks()

            # Finalização específica do agente
            await self._shutdown_agent()

            # Fecha MCP client
            if self.mcp_client:
                await self.mcp_client.close()

            self.logger.info("Agent shutdown completed",
                           agent_id=self.agent_id)

        except Exception as e:
            self.logger.error("Agent shutdown failed",
                            agent_id=self.agent_id,
                            error=str(e))

    async def execute_task(self, task: AgentTask) -> AgentTask:
        """Executa uma tarefa"""
        if len(self.current_tasks) >= self.max_concurrent_tasks:
            raise ValueError("Agent at maximum capacity")

        task.started_at = datetime.utcnow()
        task.status = "running"
        self.current_tasks[task.task_id] = task
        self.status = AgentStatus.BUSY

        self.logger.info("Task started",
                        agent_id=self.agent_id,
                        task_id=task.task_id,
                        task_type=task.task_type)

        try:
            # Executa a tarefa específica do agente
            result = await self._execute_task_implementation(task)

            task.completed_at = datetime.utcnow()
            task.status = "completed"
            task.result = result

            # Atualiza métricas
            await self._update_performance_metrics(task, success=True)

            self.logger.info("Task completed",
                            agent_id=self.agent_id,
                            task_id=task.task_id,
                            execution_time=(task.completed_at - task.started_at).total_seconds())

        except Exception as e:
            task.status = "failed"
            task.error = str(e)

            # Atualiza métricas
            await self._update_performance_metrics(task, success=False)

            self.logger.error("Task failed",
                             agent_id=self.agent_id,
                             task_id=task.task_id,
                             error=str(e))

        finally:
            del self.current_tasks[task.task_id]

            # Atualiza status
            if not self.current_tasks:
                self.status = AgentStatus.IDLE

        return task

    async def send_message(self, message: AgentMessage):
        """Envia mensagem para outro agente"""
        # Em implementação real, isso seria enviado via message bus
        self.logger.info("Message sent",
                        from_agent=self.agent_id,
                        to_agent=message.to_agent,
                        message_type=message.message_type)

    async def receive_message(self, message: AgentMessage):
        """Recebe mensagem de outro agente"""
        self.message_queue.append(message)
        await self._process_message(message)

    async def get_info(self) -> MCPAgentInfo:
        """Retorna informações do agente"""
        return MCPAgentInfo(
            agent_id=self.agent_id,
            name=self.name,
            description=self.description,
            capabilities=[cap.value for cap in self.capabilities],
            tools=await self._get_available_tools(),
            prompts=await self._get_available_prompts(),
            resources=await self._get_available_resources(),
            status=self.status.value,
            metadata={
                "agent_type": self.agent_type.value,
                "performance_metrics": self.performance_metrics,
                "current_tasks": len(self.current_tasks),
                "max_concurrent_tasks": self.max_concurrent_tasks
            }
        )

    # Métodos abstratos que devem ser implementados pelos agentes específicos
    @abstractmethod
    async def _initialize_agent(self):
        """Inicialização específica do agente"""
        pass

    @abstractmethod
    async def _shutdown_agent(self):
        """Finalização específica do agente"""
        pass

    @abstractmethod
    async def _execute_task_implementation(self, task: AgentTask) -> Dict[str, Any]:
        """Implementação específica da execução de tarefa"""
        pass

    @abstractmethod
    async def _process_message(self, message: AgentMessage):
        """Processamento específico de mensagens"""
        pass

    # Métodos auxiliares
    async def _register_with_mcp(self):
        """Registra o agente no sistema MCP"""
        if self.mcp_client:
            agent_info = await self.get_info()
            await self.mcp_client.register_agent(agent_info)

    async def _cleanup_tasks(self):
        """Limpa tarefas pendentes"""
        for task in self.current_tasks.values():
            task.status = "cancelled"
            task.error = "Agent shutdown"
        self.current_tasks.clear()

    async def _update_performance_metrics(self, task: AgentTask, success: bool):
        """Atualiza métricas de performance"""
        self.performance_metrics["tasks_completed"] += 1

        if task.started_at and task.completed_at:
            execution_time = (task.completed_at - task.started_at).total_seconds()
            current_avg = self.performance_metrics["avg_execution_time"]
            task_count = self.performance_metrics["tasks_completed"]

            new_avg = ((current_avg * (task_count - 1)) + execution_time) / task_count
            self.performance_metrics["avg_execution_time"] = new_avg

        # Atualiza taxa de sucesso
        if success:
            current_rate = self.performance_metrics["success_rate"]
            task_count = self.performance_metrics["tasks_completed"]

            new_rate = ((current_rate * (task_count - 1)) + 100) / task_count
            self.performance_metrics["success_rate"] = new_rate
        else:
            current_rate = self.performance_metrics["success_rate"]
            task_count = self.performance_metrics["tasks_completed"]

            new_rate = ((current_rate * (task_count - 1)) + 0) / task_count
            self.performance_metrics["success_rate"] = new_rate

        # Atualiza fator de carga
        self.performance_metrics["load_factor"] = len(self.current_tasks) / self.max_concurrent_tasks * 100

    async def _get_available_tools(self) -> List[str]:
        """Retorna ferramentas disponíveis"""
        return []

    async def _get_available_prompts(self) -> List[str]:
        """Retorna prompts disponíveis"""
        return []

    async def _get_available_resources(self) -> List[str]:
        """Retorna recursos disponíveis"""
        return []


# Decorator para marcar métodos como capacidades
def agent_capability(capability: AgentCapability):
    """Decorator para marcar métodos como capacidades do agente"""
    def decorator(func):
        func._agent_capability = capability
        return func
    return decorator


# Decorator para marcar métodos como handlers de mensagem
def message_handler(message_type: str):
    """Decorator para marcar métodos como handlers de mensagem"""
    def decorator(func):
        func._message_type = message_type
        return func
    return decorator