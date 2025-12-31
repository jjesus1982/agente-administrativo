"""
MCP Registry - Registro centralizado de agentes e servidores MCP
"""

import asyncio
import aioredis
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import structlog
from ..core.logger import get_logger
from ..services.cache import RedisCache

from .types import MCPAgentInfo, MCPServerInfo, MCPTask, MCPContext

logger = get_logger(__name__)


class MCPRegistry:
    """Registry centralizado para agentes e servidores MCP"""

    def __init__(self, redis_cache: RedisCache):
        self.cache = redis_cache
        self._heartbeat_interval = 30  # 30 segundos
        self._heartbeat_timeout = 90   # 90 segundos
        self._heartbeat_tasks: Dict[str, asyncio.Task] = {}

    # =================================================================
    # AGENT MANAGEMENT
    # =================================================================

    async def register_agent(self, agent_info: MCPAgentInfo) -> bool:
        """Registra um agente no registry"""
        try:
            key = f"agent:{agent_info.agent_id}"
            await self.cache.set(key, agent_info.dict(), ttl=self._heartbeat_timeout)

            # Inicia heartbeat automático
            await self._start_agent_heartbeat(agent_info.agent_id)

            logger.info("Agent registered",
                       agent_id=agent_info.agent_id,
                       capabilities=agent_info.capabilities)
            return True

        except Exception as e:
            logger.error("Failed to register agent",
                        agent_id=agent_info.agent_id,
                        error=str(e))
            return False

    async def unregister_agent(self, agent_id: str) -> bool:
        """Remove um agente do registry"""
        try:
            key = f"agent:{agent_id}"
            await self.cache.delete(key)

            # Para heartbeat
            await self._stop_agent_heartbeat(agent_id)

            logger.info("Agent unregistered", agent_id=agent_id)
            return True

        except Exception as e:
            logger.error("Failed to unregister agent",
                        agent_id=agent_id,
                        error=str(e))
            return False

    async def get_agent(self, agent_id: str) -> Optional[MCPAgentInfo]:
        """Obtém informações de um agente"""
        try:
            key = f"agent:{agent_id}"
            data = await self.cache.get(key)
            if data:
                return MCPAgentInfo(**data)
            return None

        except Exception as e:
            logger.error("Failed to get agent",
                        agent_id=agent_id,
                        error=str(e))
            return None

    async def list_agents(self,
                         status: Optional[str] = None,
                         capabilities: Optional[List[str]] = None) -> List[MCPAgentInfo]:
        """Lista agentes com filtros opcionais"""
        try:
            pattern = "agent:*"
            keys = await self.cache.redis.keys(pattern)

            agents = []
            for key in keys:
                data = await self.cache.get(key.decode())
                if data:
                    agent = MCPAgentInfo(**data)

                    # Filtros
                    if status and agent.status != status:
                        continue
                    if capabilities and not any(cap in agent.capabilities for cap in capabilities):
                        continue

                    agents.append(agent)

            return sorted(agents, key=lambda x: x.name)

        except Exception as e:
            logger.error("Failed to list agents", error=str(e))
            return []

    async def find_best_agent(self,
                             task_type: str,
                             required_capabilities: List[str] = None) -> Optional[MCPAgentInfo]:
        """Encontra o melhor agente para uma tarefa"""
        agents = await self.list_agents(status="online")

        if required_capabilities:
            # Filtra por capacidades obrigatórias
            agents = [a for a in agents if all(cap in a.capabilities for cap in required_capabilities)]

        if not agents:
            return None

        # Score baseado em capacidades e carga
        best_agent = None
        best_score = -1

        for agent in agents:
            # Score baseado no número de capacidades que match
            score = len([cap for cap in agent.capabilities if task_type in cap])

            # Penaliza agentes ocupados
            if agent.status == "busy":
                score -= 2

            if score > best_score:
                best_score = score
                best_agent = agent

        return best_agent

    async def update_agent_status(self, agent_id: str, status: str) -> bool:
        """Atualiza o status de um agente"""
        try:
            agent = await self.get_agent(agent_id)
            if agent:
                agent.status = status
                agent.last_heartbeat = datetime.utcnow()

                key = f"agent:{agent_id}"
                await self.cache.set(key, agent.dict(), ttl=self._heartbeat_timeout)

                logger.info("Agent status updated",
                           agent_id=agent_id,
                           status=status)
                return True
            return False

        except Exception as e:
            logger.error("Failed to update agent status",
                        agent_id=agent_id,
                        error=str(e))
            return False

    # =================================================================
    # SERVER MANAGEMENT
    # =================================================================

    async def register_server(self, server_info: MCPServerInfo) -> bool:
        """Registra um servidor MCP"""
        try:
            key = f"server:{server_info.server_id}"
            await self.cache.set(key, server_info.dict(), ttl=3600)  # 1 hora

            logger.info("MCP Server registered",
                       server_id=server_info.server_id,
                       endpoint=server_info.endpoint)
            return True

        except Exception as e:
            logger.error("Failed to register server",
                        server_id=server_info.server_id,
                        error=str(e))
            return False

    async def unregister_server(self, server_id: str) -> bool:
        """Remove um servidor MCP"""
        try:
            key = f"server:{server_id}"
            await self.cache.delete(key)

            logger.info("MCP Server unregistered", server_id=server_id)
            return True

        except Exception as e:
            logger.error("Failed to unregister server",
                        server_id=server_id,
                        error=str(e))
            return False

    async def get_server(self, server_id: str) -> Optional[MCPServerInfo]:
        """Obtém informações de um servidor"""
        try:
            key = f"server:{server_id}"
            data = await self.cache.get(key)
            if data:
                return MCPServerInfo(**data)
            return None

        except Exception as e:
            logger.error("Failed to get server",
                        server_id=server_id,
                        error=str(e))
            return None

    async def list_servers(self, status: Optional[str] = None) -> List[MCPServerInfo]:
        """Lista servidores MCP"""
        try:
            pattern = "server:*"
            keys = await self.cache.redis.keys(pattern)

            servers = []
            for key in keys:
                data = await self.cache.get(key.decode())
                if data:
                    server = MCPServerInfo(**data)
                    if not status or server.status == status:
                        servers.append(server)

            return sorted(servers, key=lambda x: x.name)

        except Exception as e:
            logger.error("Failed to list servers", error=str(e))
            return []

    # =================================================================
    # TASK MANAGEMENT
    # =================================================================

    async def create_task(self, task: MCPTask) -> bool:
        """Cria uma nova tarefa"""
        try:
            key = f"task:{task.task_id}"
            await self.cache.set(key, task.dict(), ttl=86400)  # 24 horas

            # Adiciona à lista de tarefas pendentes
            await self.cache.redis.lpush("tasks:pending", task.task_id)

            logger.info("Task created",
                       task_id=task.task_id,
                       task_type=task.task_type)
            return True

        except Exception as e:
            logger.error("Failed to create task",
                        task_id=task.task_id,
                        error=str(e))
            return False

    async def update_task(self, task: MCPTask) -> bool:
        """Atualiza uma tarefa"""
        try:
            key = f"task:{task.task_id}"
            await self.cache.set(key, task.dict(), ttl=86400)

            # Move entre filas conforme status
            if task.status == "running":
                await self.cache.redis.lrem("tasks:pending", 1, task.task_id)
                await self.cache.redis.lpush("tasks:running", task.task_id)
            elif task.status in ["completed", "failed", "cancelled"]:
                await self.cache.redis.lrem("tasks:running", 1, task.task_id)
                await self.cache.redis.lpush("tasks:completed", task.task_id)

            logger.info("Task updated",
                       task_id=task.task_id,
                       status=task.status)
            return True

        except Exception as e:
            logger.error("Failed to update task",
                        task_id=task.task_id,
                        error=str(e))
            return False

    async def get_task(self, task_id: str) -> Optional[MCPTask]:
        """Obtém uma tarefa"""
        try:
            key = f"task:{task_id}"
            data = await self.cache.get(key)
            if data:
                return MCPTask(**data)
            return None

        except Exception as e:
            logger.error("Failed to get task",
                        task_id=task_id,
                        error=str(e))
            return None

    async def get_pending_tasks(self, limit: int = 10) -> List[MCPTask]:
        """Obtém tarefas pendentes"""
        try:
            task_ids = await self.cache.redis.lrange("tasks:pending", 0, limit - 1)
            tasks = []

            for task_id in task_ids:
                task = await self.get_task(task_id.decode())
                if task:
                    tasks.append(task)

            return tasks

        except Exception as e:
            logger.error("Failed to get pending tasks", error=str(e))
            return []

    # =================================================================
    # CONTEXT SHARING
    # =================================================================

    async def store_context(self, context: MCPContext) -> bool:
        """Armazena contexto compartilhado"""
        try:
            key = f"context:{context.context_id}"
            ttl = 3600  # 1 hora padrão

            if context.expires_at:
                ttl = int((context.expires_at - datetime.utcnow()).total_seconds())

            await self.cache.set(key, context.dict(), ttl=ttl)

            # Indexa por tipo e agente
            await self.cache.redis.sadd(f"context:type:{context.context_type}", context.context_id)
            await self.cache.redis.sadd(f"context:agent:{context.agent_id}", context.context_id)

            logger.info("Context stored",
                       context_id=context.context_id,
                       context_type=context.context_type)
            return True

        except Exception as e:
            logger.error("Failed to store context",
                        context_id=context.context_id,
                        error=str(e))
            return False

    async def get_context(self, context_id: str) -> Optional[MCPContext]:
        """Obtém contexto por ID"""
        try:
            key = f"context:{context_id}"
            data = await self.cache.get(key)
            if data:
                return MCPContext(**data)
            return None

        except Exception as e:
            logger.error("Failed to get context",
                        context_id=context_id,
                        error=str(e))
            return None

    async def find_contexts(self,
                           context_type: Optional[str] = None,
                           agent_id: Optional[str] = None,
                           tags: Optional[List[str]] = None) -> List[MCPContext]:
        """Encontra contextos com filtros"""
        try:
            context_ids = set()

            if context_type:
                ids = await self.cache.redis.smembers(f"context:type:{context_type}")
                context_ids.update(ids)
            elif agent_id:
                ids = await self.cache.redis.smembers(f"context:agent:{agent_id}")
                context_ids.update(ids)
            else:
                # Busca todos contextos
                keys = await self.cache.redis.keys("context:*")
                context_ids = {k.decode().split(":")[-1] for k in keys if k.decode().count(":") == 1}

            contexts = []
            for context_id in context_ids:
                context = await self.get_context(context_id.decode() if hasattr(context_id, 'decode') else context_id)
                if context:
                    # Filtro por tags
                    if tags and not any(tag in context.tags for tag in tags):
                        continue
                    contexts.append(context)

            return sorted(contexts, key=lambda x: x.created_at, reverse=True)

        except Exception as e:
            logger.error("Failed to find contexts", error=str(e))
            return []

    # =================================================================
    # HEARTBEAT MANAGEMENT
    # =================================================================

    async def _start_agent_heartbeat(self, agent_id: str):
        """Inicia heartbeat automático para um agente"""
        if agent_id in self._heartbeat_tasks:
            self._heartbeat_tasks[agent_id].cancel()

        task = asyncio.create_task(self._heartbeat_loop(agent_id))
        self._heartbeat_tasks[agent_id] = task

    async def _stop_agent_heartbeat(self, agent_id: str):
        """Para heartbeat de um agente"""
        if agent_id in self._heartbeat_tasks:
            self._heartbeat_tasks[agent_id].cancel()
            del self._heartbeat_tasks[agent_id]

    async def _heartbeat_loop(self, agent_id: str):
        """Loop de heartbeat para um agente"""
        try:
            while True:
                await asyncio.sleep(self._heartbeat_interval)

                agent = await self.get_agent(agent_id)
                if agent:
                    agent.last_heartbeat = datetime.utcnow()
                    key = f"agent:{agent_id}"
                    await self.cache.set(key, agent.dict(), ttl=self._heartbeat_timeout)
                else:
                    break

        except asyncio.CancelledError:
            logger.info("Heartbeat stopped", agent_id=agent_id)
        except Exception as e:
            logger.error("Heartbeat error",
                        agent_id=agent_id,
                        error=str(e))

    async def cleanup_stale_agents(self):
        """Remove agentes inativos"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(seconds=self._heartbeat_timeout)
            agents = await self.list_agents()

            for agent in agents:
                if agent.last_heartbeat < cutoff_time:
                    await self.unregister_agent(agent.agent_id)
                    logger.warning("Stale agent removed",
                                  agent_id=agent.agent_id,
                                  last_heartbeat=agent.last_heartbeat)

        except Exception as e:
            logger.error("Failed to cleanup stale agents", error=str(e))

    # =================================================================
    # STATS & MONITORING
    # =================================================================

    async def get_registry_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas do registry"""
        try:
            agents = await self.list_agents()
            servers = await self.list_servers()

            # Contadores por status
            agent_status_counts = {}
            for agent in agents:
                agent_status_counts[agent.status] = agent_status_counts.get(agent.status, 0) + 1

            server_status_counts = {}
            for server in servers:
                server_status_counts[server.status] = server_status_counts.get(server.status, 0) + 1

            # Tarefas por status
            pending_tasks = await self.cache.redis.llen("tasks:pending")
            running_tasks = await self.cache.redis.llen("tasks:running")
            completed_tasks = await self.cache.redis.llen("tasks:completed")

            return {
                "agents": {
                    "total": len(agents),
                    "by_status": agent_status_counts
                },
                "servers": {
                    "total": len(servers),
                    "by_status": server_status_counts
                },
                "tasks": {
                    "pending": pending_tasks,
                    "running": running_tasks,
                    "completed": completed_tasks
                },
                "timestamp": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error("Failed to get registry stats", error=str(e))
            return {}