"""
Agent Orchestrator - Coordenador inteligente para 36 agentes especializados
"""

import asyncio
import uuid
from typing import Dict, List, Optional, Any, Set, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, deque
import networkx as nx
from dataclasses import dataclass
import structlog

from ..core.logger import get_logger
from ..mcp.types import MCPTask, MCPAgentInfo
from ..mcp.registry import MCPRegistry
from ..services.cache import RedisCache
from .base import BaseAgent, AgentType, AgentCapability, AgentTask, AgentMessage, AgentPriority, AgentStatus

logger = get_logger(__name__)


@dataclass
class TaskDependency:
    """Dependência entre tarefas"""
    task_id: str
    depends_on: str
    dependency_type: str  # "sequential", "parallel", "conditional"


@dataclass
class WorkflowStep:
    """Passo de um workflow"""
    step_id: str
    agent_type: AgentType
    required_capabilities: List[AgentCapability]
    task_type: str
    parameters: Dict[str, Any]
    dependencies: List[str] = None
    timeout: int = 300


@dataclass
class Workflow:
    """Definição de um workflow"""
    workflow_id: str
    name: str
    description: str
    steps: List[WorkflowStep]
    priority: AgentPriority = AgentPriority.NORMAL


class TaskRouter:
    """Roteador inteligente de tarefas"""

    def __init__(self, registry: MCPRegistry):
        self.registry = registry
        self.routing_cache: Dict[str, str] = {}  # task_signature -> agent_id
        self.agent_loads: Dict[str, float] = defaultdict(float)

    async def find_best_agent(self,
                             task: AgentTask,
                             required_capabilities: List[AgentCapability] = None) -> Optional[str]:
        """Encontra o melhor agente para uma tarefa"""

        # Signature da tarefa para cache
        task_signature = f"{task.task_type}:{':'.join([c.value for c in required_capabilities or []])}"

        # Verifica cache primeiro
        if task_signature in self.routing_cache:
            cached_agent_id = self.routing_cache[task_signature]
            agent = await self.registry.get_agent(cached_agent_id)
            if agent and agent.status == "online":
                return cached_agent_id

        # Busca agentes disponíveis
        available_agents = await self.registry.list_agents(status="online")

        if not available_agents:
            return None

        # Filtra por capacidades
        if required_capabilities:
            capable_agents = []
            for agent in available_agents:
                agent_caps = set(agent.capabilities)
                required_caps = set([c.value for c in required_capabilities])
                if required_caps.issubset(agent_caps):
                    capable_agents.append(agent)
            available_agents = capable_agents

        if not available_agents:
            return None

        # Calcula score para cada agente
        best_agent = None
        best_score = -1

        for agent in available_agents:
            score = await self._calculate_agent_score(agent, task, required_capabilities)

            if score > best_score:
                best_score = score
                best_agent = agent

        if best_agent:
            # Atualiza cache
            self.routing_cache[task_signature] = best_agent.agent_id
            return best_agent.agent_id

        return None

    async def _calculate_agent_score(self,
                                   agent: MCPAgentInfo,
                                   task: AgentTask,
                                   required_capabilities: List[AgentCapability] = None) -> float:
        """Calcula score de um agente para uma tarefa"""
        score = 0.0

        # Score base por capacidades
        if required_capabilities:
            agent_caps = set(agent.capabilities)
            required_caps = set([c.value for c in required_capabilities])
            capability_match = len(required_caps.intersection(agent_caps)) / len(required_caps)
            score += capability_match * 40  # 40 pontos max

        # Score por especialização (agentes específicos para tarefas específicas)
        specialization_bonus = {
            "network_scan": ["network_analyst", "security_specialist"],
            "device_config": ["config_generator", "device_manager"],
            "install_equipment": ["installer_coordinator", "field_technician"],
            "create_documentation": ["technical_writer", "as_built_specialist"],
            "troubleshoot": ["troubleshooter", "help_desk"],
        }

        for task_pattern, specialist_types in specialization_bonus.items():
            if task_pattern in task.task_type and agent.metadata.get("agent_type") in specialist_types:
                score += 20  # Bonus por especialização

        # Penaliza por carga atual
        current_load = self.agent_loads.get(agent.agent_id, 0)
        load_penalty = current_load * 10  # 10 pontos por tarefa atual
        score -= load_penalty

        # Bonus por performance histórica
        performance = agent.metadata.get("performance_metrics", {})
        success_rate = performance.get("success_rate", 100)
        score += (success_rate / 100) * 20  # 20 pontos max por success rate

        avg_time = performance.get("avg_execution_time", 60)
        if avg_time < 30:  # Execução rápida
            score += 10
        elif avg_time > 120:  # Execução lenta
            score -= 10

        # Penaliza se agente está ocupado
        if agent.status == "busy":
            score -= 15

        return max(0, score)


class WorkflowEngine:
    """Motor de execução de workflows complexos"""

    def __init__(self, orchestrator: 'AgentOrchestrator'):
        self.orchestrator = orchestrator
        self.active_workflows: Dict[str, Dict] = {}
        self.workflow_templates: Dict[str, Workflow] = {}
        self._load_default_workflows()

    def _load_default_workflows(self):
        """Carrega workflows padrão do sistema"""

        # Workflow: Instalação Completa CCTV
        cctv_install = Workflow(
            workflow_id="cctv_install",
            name="Instalação Completa CCTV",
            description="Workflow completo para instalação de sistema CCTV",
            priority=AgentPriority.HIGH,
            steps=[
                WorkflowStep(
                    step_id="site_survey",
                    agent_type=AgentType.FIELD_TECHNICIAN,
                    required_capabilities=[AgentCapability.SITE_SURVEY],
                    task_type="site_survey",
                    parameters={"location": "{location}", "requirements": "{requirements}"}
                ),
                WorkflowStep(
                    step_id="network_design",
                    agent_type=AgentType.NETWORK_ANALYST,
                    required_capabilities=[AgentCapability.NETWORK_SCANNING],
                    task_type="network_design",
                    parameters={"survey_data": "{site_survey.result}"},
                    dependencies=["site_survey"]
                ),
                WorkflowStep(
                    step_id="equipment_config",
                    agent_type=AgentType.CONFIG_GENERATOR,
                    required_capabilities=[AgentCapability.DEVICE_CONFIG],
                    task_type="generate_configs",
                    parameters={"network_design": "{network_design.result}"},
                    dependencies=["network_design"]
                ),
                WorkflowStep(
                    step_id="install_equipment",
                    agent_type=AgentType.INSTALLER_COORDINATOR,
                    required_capabilities=[AgentCapability.EQUIPMENT_INSTALL],
                    task_type="install_devices",
                    parameters={"configs": "{equipment_config.result}"},
                    dependencies=["equipment_config"]
                ),
                WorkflowStep(
                    step_id="system_test",
                    agent_type=AgentType.TESTER,
                    required_capabilities=[AgentCapability.TESTING_VALIDATION],
                    task_type="system_test",
                    parameters={"installation": "{install_equipment.result}"},
                    dependencies=["install_equipment"]
                ),
                WorkflowStep(
                    step_id="create_documentation",
                    agent_type=AgentType.AS_BUILT_SPECIALIST,
                    required_capabilities=[AgentCapability.TECHNICAL_WRITING],
                    task_type="create_as_built",
                    parameters={"test_results": "{system_test.result}"},
                    dependencies=["system_test"]
                )
            ]
        )
        self.workflow_templates["cctv_install"] = cctv_install

        # Workflow: Troubleshooting Avançado
        troubleshoot_workflow = Workflow(
            workflow_id="troubleshoot_advanced",
            name="Troubleshooting Avançado",
            description="Workflow para resolução complexa de problemas",
            steps=[
                WorkflowStep(
                    step_id="problem_analysis",
                    agent_type=AgentType.TROUBLESHOOTER,
                    required_capabilities=[AgentCapability.ANOMALY_DETECTION],
                    task_type="analyze_problem",
                    parameters={"issue_description": "{issue_description}"}
                ),
                WorkflowStep(
                    step_id="collect_diagnostics",
                    agent_type=AgentType.PERFORMANCE_MONITOR,
                    required_capabilities=[AgentCapability.PERFORMANCE_ANALYSIS],
                    task_type="collect_diagnostics",
                    parameters={"target_systems": "{problem_analysis.affected_systems}"},
                    dependencies=["problem_analysis"]
                ),
                WorkflowStep(
                    step_id="generate_solution",
                    agent_type=AgentType.TROUBLESHOOTER,
                    required_capabilities=[AgentCapability.TICKET_RESOLUTION],
                    task_type="generate_solution",
                    parameters={
                        "problem": "{problem_analysis.result}",
                        "diagnostics": "{collect_diagnostics.result}"
                    },
                    dependencies=["collect_diagnostics"]
                ),
                WorkflowStep(
                    step_id="validate_solution",
                    agent_type=AgentType.TESTER,
                    required_capabilities=[AgentCapability.TESTING_VALIDATION],
                    task_type="validate_fix",
                    parameters={"solution": "{generate_solution.result}"},
                    dependencies=["generate_solution"]
                ),
                WorkflowStep(
                    step_id="update_knowledge_base",
                    agent_type=AgentType.TECHNICAL_WRITER,
                    required_capabilities=[AgentCapability.TECHNICAL_WRITING],
                    task_type="document_solution",
                    parameters={
                        "problem": "{problem_analysis.result}",
                        "solution": "{generate_solution.result}",
                        "validation": "{validate_solution.result}"
                    },
                    dependencies=["validate_solution"]
                )
            ]
        )
        self.workflow_templates["troubleshoot_advanced"] = troubleshoot_workflow

    async def execute_workflow(self,
                              workflow_id: str,
                              parameters: Dict[str, Any]) -> str:
        """Executa um workflow"""
        if workflow_id not in self.workflow_templates:
            raise ValueError(f"Workflow {workflow_id} not found")

        workflow = self.workflow_templates[workflow_id]
        execution_id = str(uuid.uuid4())

        # Cria grafo de dependências
        dependency_graph = nx.DiGraph()
        for step in workflow.steps:
            dependency_graph.add_node(step.step_id, step=step)
            if step.dependencies:
                for dep in step.dependencies:
                    dependency_graph.add_edge(dep, step.step_id)

        # Estado da execução
        execution_state = {
            "workflow_id": workflow_id,
            "execution_id": execution_id,
            "status": "running",
            "parameters": parameters,
            "step_results": {},
            "step_status": {},
            "started_at": datetime.utcnow(),
            "dependency_graph": dependency_graph
        }

        self.active_workflows[execution_id] = execution_state

        # Executa workflow assincronamente
        asyncio.create_task(self._execute_workflow_steps(execution_id))

        logger.info("Workflow execution started",
                   workflow_id=workflow_id,
                   execution_id=execution_id)

        return execution_id

    async def _execute_workflow_steps(self, execution_id: str):
        """Executa os passos do workflow respeitando dependências"""
        execution = self.active_workflows[execution_id]
        graph = execution["dependency_graph"]

        try:
            # Executa passos em ordem topológica
            for step_id in nx.topological_sort(graph):
                step = graph.nodes[step_id]["step"]

                # Aguarda dependências
                await self._wait_for_dependencies(execution_id, step.dependencies or [])

                # Executa passo
                await self._execute_workflow_step(execution_id, step)

            execution["status"] = "completed"
            execution["completed_at"] = datetime.utcnow()

            logger.info("Workflow execution completed",
                       execution_id=execution_id)

        except Exception as e:
            execution["status"] = "failed"
            execution["error"] = str(e)
            execution["failed_at"] = datetime.utcnow()

            logger.error("Workflow execution failed",
                        execution_id=execution_id,
                        error=str(e))

    async def _execute_workflow_step(self, execution_id: str, step: WorkflowStep):
        """Executa um passo específico do workflow"""
        execution = self.active_workflows[execution_id]

        # Resolve parâmetros com resultados anteriores
        resolved_params = await self._resolve_parameters(execution, step.parameters)

        # Cria tarefa
        task = AgentTask(
            task_id=str(uuid.uuid4()),
            agent_id="",  # Será atribuído pelo roteador
            task_type=step.task_type,
            description=f"Workflow step: {step.step_id}",
            parameters=resolved_params,
            priority=AgentPriority.HIGH,
            assigned_at=datetime.utcnow()
        )

        # Encontra agente adequado
        agent_id = await self.orchestrator.router.find_best_agent(task, step.required_capabilities)

        if not agent_id:
            raise Exception(f"No suitable agent found for step {step.step_id}")

        task.agent_id = agent_id

        # Executa tarefa
        execution["step_status"][step.step_id] = "running"
        result = await self.orchestrator.delegate_task_to_agent(agent_id, task)

        execution["step_results"][step.step_id] = result.result
        execution["step_status"][step.step_id] = "completed"

        logger.info("Workflow step completed",
                   execution_id=execution_id,
                   step_id=step.step_id,
                   agent_id=agent_id)

    async def _wait_for_dependencies(self, execution_id: str, dependencies: List[str]):
        """Aguarda conclusão das dependências"""
        if not dependencies:
            return

        execution = self.active_workflows[execution_id]

        while True:
            all_completed = True
            for dep in dependencies:
                if execution["step_status"].get(dep) != "completed":
                    all_completed = False
                    break

            if all_completed:
                break

            await asyncio.sleep(1)  # Aguarda 1 segundo

    async def _resolve_parameters(self,
                                execution: Dict,
                                parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve parâmetros com resultados de passos anteriores"""
        resolved = {}

        for key, value in parameters.items():
            if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
                # Resolve referência a resultado anterior
                ref_path = value[1:-1]  # Remove {}

                if "." in ref_path:
                    step_id, result_key = ref_path.split(".", 1)
                    step_result = execution["step_results"].get(step_id, {})
                    resolved[key] = step_result.get(result_key)
                else:
                    # Referência a parâmetro global
                    resolved[key] = execution["parameters"].get(ref_path, value)
            else:
                resolved[key] = value

        return resolved


class AgentOrchestrator:
    """Orquestrador principal do sistema multi-agente"""

    def __init__(self, registry: MCPRegistry, cache: RedisCache):
        self.registry = registry
        self.cache = cache
        self.router = TaskRouter(registry)
        self.workflow_engine = WorkflowEngine(self)

        # Estado do orquestrador
        self.agents: Dict[str, BaseAgent] = {}
        self.task_queue: deque = deque()
        self.message_bus: Dict[str, List[AgentMessage]] = defaultdict(list)
        self.performance_stats = {
            "tasks_processed": 0,
            "workflows_executed": 0,
            "avg_task_time": 0,
            "agent_utilization": {}
        }

        # Configuração
        self.max_queue_size = 1000
        self.task_timeout = 600  # 10 minutos
        self.health_check_interval = 60  # 1 minuto

        self.logger = get_logger("orchestrator")

    async def start(self):
        """Inicia o orquestrador"""
        try:
            self.logger.info("Agent Orchestrator starting")

            # Inicia tasks de background
            asyncio.create_task(self._process_task_queue())
            asyncio.create_task(self._process_message_bus())
            asyncio.create_task(self._health_check_loop())
            asyncio.create_task(self._update_statistics())

            self.logger.info("Agent Orchestrator started successfully")

        except Exception as e:
            self.logger.error("Failed to start orchestrator", error=str(e))
            raise

    async def register_agent(self, agent: BaseAgent):
        """Registra um agente"""
        await agent.initialize()
        self.agents[agent.agent_id] = agent

        # Registra no registry
        agent_info = await agent.get_info()
        await self.registry.register_agent(agent_info)

        self.logger.info("Agent registered",
                        agent_id=agent.agent_id,
                        agent_type=agent.agent_type.value)

    async def unregister_agent(self, agent_id: str):
        """Remove um agente"""
        if agent_id in self.agents:
            agent = self.agents[agent_id]
            await agent.shutdown()
            del self.agents[agent_id]

            await self.registry.unregister_agent(agent_id)

            self.logger.info("Agent unregistered", agent_id=agent_id)

    async def submit_task(self, task: AgentTask) -> str:
        """Submete uma tarefa para execução"""
        if len(self.task_queue) >= self.max_queue_size:
            raise Exception("Task queue is full")

        self.task_queue.append(task)

        self.logger.info("Task submitted",
                        task_id=task.task_id,
                        task_type=task.task_type)

        return task.task_id

    async def delegate_task_to_agent(self, agent_id: str, task: AgentTask) -> AgentTask:
        """Delega uma tarefa específica para um agente"""
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")

        agent = self.agents[agent_id]
        result = await agent.execute_task(task)

        # Atualiza estatísticas
        self.performance_stats["tasks_processed"] += 1

        return result

    async def execute_workflow(self, workflow_id: str, parameters: Dict[str, Any]) -> str:
        """Executa um workflow"""
        execution_id = await self.workflow_engine.execute_workflow(workflow_id, parameters)
        self.performance_stats["workflows_executed"] += 1
        return execution_id

    async def send_message_to_agent(self, message: AgentMessage):
        """Envia mensagem para um agente"""
        self.message_bus[message.to_agent].append(message)

    async def broadcast_message(self, message: AgentMessage, agent_filter: Optional[Dict] = None):
        """Broadcast mensagem para múltiplos agentes"""
        agents = await self.registry.list_agents()

        for agent in agents:
            # Aplica filtros se especificados
            if agent_filter:
                if "agent_type" in agent_filter and agent.metadata.get("agent_type") != agent_filter["agent_type"]:
                    continue
                if "capabilities" in agent_filter:
                    required_caps = set(agent_filter["capabilities"])
                    agent_caps = set(agent.capabilities)
                    if not required_caps.intersection(agent_caps):
                        continue

            # Cria mensagem específica para o agente
            agent_message = AgentMessage(
                message_id=str(uuid.uuid4()),
                from_agent=message.from_agent,
                to_agent=agent.agent_id,
                message_type=message.message_type,
                content=message.content,
                priority=message.priority,
                timestamp=datetime.utcnow()
            )

            self.message_bus[agent.agent_id].append(agent_message)

    async def get_orchestrator_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas do orquestrador"""
        agent_count = len(self.agents)
        queue_size = len(self.task_queue)

        # Calcula utilização dos agentes
        agent_utilization = {}
        for agent_id, agent in self.agents.items():
            utilization = len(agent.current_tasks) / agent.max_concurrent_tasks * 100
            agent_utilization[agent_id] = utilization

        return {
            **self.performance_stats,
            "agent_count": agent_count,
            "queue_size": queue_size,
            "agent_utilization": agent_utilization,
            "timestamp": datetime.utcnow().isoformat()
        }

    # Tasks em background
    async def _process_task_queue(self):
        """Processa fila de tarefas"""
        while True:
            try:
                if self.task_queue:
                    task = self.task_queue.popleft()

                    # Encontra agente adequado
                    agent_id = await self.router.find_best_agent(task)

                    if agent_id:
                        task.agent_id = agent_id
                        # Executa em background
                        asyncio.create_task(self._execute_task_with_timeout(task))
                    else:
                        # Recoloca na fila se não encontrou agente
                        self.task_queue.appendleft(task)

                await asyncio.sleep(1)

            except Exception as e:
                self.logger.error("Error processing task queue", error=str(e))
                await asyncio.sleep(5)

    async def _process_message_bus(self):
        """Processa bus de mensagens"""
        while True:
            try:
                for agent_id, messages in self.message_bus.items():
                    if messages and agent_id in self.agents:
                        message = messages.pop(0)
                        agent = self.agents[agent_id]
                        await agent.receive_message(message)

                await asyncio.sleep(0.1)

            except Exception as e:
                self.logger.error("Error processing message bus", error=str(e))
                await asyncio.sleep(1)

    async def _health_check_loop(self):
        """Loop de verificação de saúde dos agentes"""
        while True:
            try:
                await self._check_agent_health()
                await self.registry.cleanup_stale_agents()
                await asyncio.sleep(self.health_check_interval)

            except Exception as e:
                self.logger.error("Error in health check", error=str(e))
                await asyncio.sleep(self.health_check_interval)

    async def _check_agent_health(self):
        """Verifica saúde dos agentes"""
        for agent_id, agent in self.agents.items():
            try:
                # Atualiza informações do agente no registry
                agent_info = await agent.get_info()
                await self.registry.register_agent(agent_info)

                # Verifica se agente não está responsivo
                if agent.status == AgentStatus.ERROR:
                    self.logger.warning("Agent in error state",
                                      agent_id=agent_id)

            except Exception as e:
                self.logger.error("Error checking agent health",
                                agent_id=agent_id,
                                error=str(e))

    async def _update_statistics(self):
        """Atualiza estatísticas periodicamente"""
        while True:
            try:
                # Atualiza router loads
                for agent_id, agent in self.agents.items():
                    self.router.agent_loads[agent_id] = len(agent.current_tasks)

                await asyncio.sleep(30)  # Atualiza a cada 30 segundos

            except Exception as e:
                self.logger.error("Error updating statistics", error=str(e))
                await asyncio.sleep(30)

    async def _execute_task_with_timeout(self, task: AgentTask):
        """Executa tarefa com timeout"""
        try:
            await asyncio.wait_for(
                self.delegate_task_to_agent(task.agent_id, task),
                timeout=self.task_timeout
            )
        except asyncio.TimeoutError:
            self.logger.error("Task execution timeout",
                            task_id=task.task_id,
                            agent_id=task.agent_id)
        except Exception as e:
            self.logger.error("Task execution failed",
                            task_id=task.task_id,
                            error=str(e))