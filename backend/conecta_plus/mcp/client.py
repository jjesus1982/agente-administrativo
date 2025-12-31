"""
MCP Client - Cliente para comunicação com servidores MCP
"""

import json
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import structlog
from ..core.logger import get_logger

from .types import (
    MCPRequest, MCPResponse, MCPError, MCPToolCall, MCPPromptTemplate,
    MCPResourceInfo, MCPAgentInfo, MCPServerInfo, MCPNotification, MCPTask
)

logger = get_logger(__name__)


class MCPClientError(Exception):
    """Exceção para erros do client MCP"""
    pass


class MCPClient:
    """Cliente para comunicação com servidores MCP e agentes"""

    def __init__(self, agent_id: str, timeout: int = 30):
        self.agent_id = agent_id
        self.timeout = timeout
        self.session: Optional[aiohttp.ClientSession] = None
        self.servers: Dict[str, MCPServerInfo] = {}
        self.agents: Dict[str, MCPAgentInfo] = {}
        self._request_cache: Dict[str, MCPResponse] = {}
        self._cache_ttl = 60  # 1 minuto

    async def start(self):
        """Inicializa o cliente MCP"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout),
            headers={
                "Content-Type": "application/json",
                "User-Agent": f"MCPClient/{self.agent_id}"
            }
        )
        logger.info("MCP Client started", agent_id=self.agent_id)

    async def close(self):
        """Fecha o cliente MCP"""
        if self.session:
            await self.session.close()
        logger.info("MCP Client closed", agent_id=self.agent_id)

    async def register_server(self, server_info: MCPServerInfo):
        """Registra um servidor MCP"""
        self.servers[server_info.server_id] = server_info
        logger.info("MCP Server registered",
                   server_id=server_info.server_id,
                   endpoint=server_info.endpoint)

    async def register_agent(self, agent_info: MCPAgentInfo):
        """Registra um agente"""
        self.agents[agent_info.agent_id] = agent_info
        logger.info("Agent registered",
                   agent_id=agent_info.agent_id,
                   capabilities=agent_info.capabilities)

    async def call_tool(self,
                       server_id: str,
                       tool_call: MCPToolCall,
                       target_agent: Optional[str] = None) -> MCPResponse:
        """Chama uma ferramenta em um servidor MCP"""
        server = self.servers.get(server_id)
        if not server:
            raise MCPClientError(f"Servidor {server_id} não encontrado")

        request = MCPRequest(
            method="tools/call",
            params={
                "name": tool_call.tool_name,
                "arguments": tool_call.arguments
            },
            source_agent=self.agent_id,
            target_agent=target_agent
        )

        return await self._send_request(server.endpoint, request)

    async def get_prompt(self,
                        server_id: str,
                        prompt_name: str,
                        variables: Dict[str, Any] = None) -> MCPResponse:
        """Obtém um prompt de um servidor MCP"""
        server = self.servers.get(server_id)
        if not server:
            raise MCPClientError(f"Servidor {server_id} não encontrado")

        request = MCPRequest(
            method="prompts/get",
            params={
                "name": prompt_name,
                "arguments": variables or {}
            },
            source_agent=self.agent_id
        )

        return await self._send_request(server.endpoint, request)

    async def get_resource(self,
                          server_id: str,
                          resource_uri: str) -> MCPResponse:
        """Obtém um recurso de um servidor MCP"""
        server = self.servers.get(server_id)
        if not server:
            raise MCPClientError(f"Servidor {server_id} não encontrado")

        request = MCPRequest(
            method="resources/read",
            params={"uri": resource_uri},
            source_agent=self.agent_id
        )

        return await self._send_request(server.endpoint, request)

    async def list_tools(self, server_id: str) -> List[str]:
        """Lista ferramentas disponíveis em um servidor"""
        server = self.servers.get(server_id)
        if not server:
            raise MCPClientError(f"Servidor {server_id} não encontrado")

        request = MCPRequest(
            method="tools/list",
            source_agent=self.agent_id
        )

        response = await self._send_request(server.endpoint, request)
        if response.success and response.result:
            return response.result.get("tools", [])
        return []

    async def list_prompts(self, server_id: str) -> List[MCPPromptTemplate]:
        """Lista prompts disponíveis em um servidor"""
        server = self.servers.get(server_id)
        if not server:
            raise MCPClientError(f"Servidor {server_id} não encontrado")

        request = MCPRequest(
            method="prompts/list",
            source_agent=self.agent_id
        )

        response = await self._send_request(server.endpoint, request)
        if response.success and response.result:
            prompts_data = response.result.get("prompts", [])
            return [MCPPromptTemplate(**p) for p in prompts_data]
        return []

    async def list_resources(self, server_id: str) -> List[MCPResourceInfo]:
        """Lista recursos disponíveis em um servidor"""
        server = self.servers.get(server_id)
        if not server:
            raise MCPClientError(f"Servidor {server_id} não encontrado")

        request = MCPRequest(
            method="resources/list",
            source_agent=self.agent_id
        )

        response = await self._send_request(server.endpoint, request)
        if response.success and response.result:
            resources_data = response.result.get("resources", [])
            return [MCPResourceInfo(**r) for r in resources_data]
        return []

    async def send_notification(self,
                               target_agent: str,
                               method: str,
                               params: Dict[str, Any] = None):
        """Envia notificação para outro agente"""
        notification = MCPNotification(
            method=method,
            params=params or {},
            source_agent=self.agent_id,
            target_agent=target_agent
        )

        # Em uma implementação real, isso seria enviado via message queue
        logger.info("Notification sent",
                   target_agent=target_agent,
                   method=method,
                   params=params)

    async def delegate_task(self,
                           task: MCPTask,
                           target_agent: Optional[str] = None) -> str:
        """Delega uma tarefa para outro agente"""
        if target_agent:
            task.assigned_agent = target_agent

        # Em uma implementação real, isso seria enviado via task queue
        logger.info("Task delegated",
                   task_id=task.task_id,
                   task_type=task.task_type,
                   target_agent=target_agent)

        return task.task_id

    async def get_task_status(self, task_id: str) -> Optional[MCPTask]:
        """Obtém o status de uma tarefa"""
        # Em uma implementação real, isso consultaria um task queue/DB
        return None

    async def _send_request(self, endpoint: str, request: MCPRequest) -> MCPResponse:
        """Envia uma requisição para um endpoint MCP"""
        if not self.session:
            await self.start()

        # Verifica cache
        cache_key = f"{endpoint}:{request.method}:{hash(str(request.params))}"
        if cache_key in self._request_cache:
            cached_response = self._request_cache[cache_key]
            if (datetime.utcnow() - cached_response.timestamp).seconds < self._cache_ttl:
                return cached_response

        try:
            async with self.session.post(endpoint, json=request.dict()) as response:
                response_data = await response.json()

                mcp_response = MCPResponse(
                    request_id=request.id,
                    success=response.status == 200,
                    result=response_data if response.status == 200 else None,
                    error=response_data.get("error") if response.status != 200 else None,
                    source_agent=self.agent_id
                )

                # Cache response se sucesso
                if mcp_response.success:
                    self._request_cache[cache_key] = mcp_response

                logger.info("MCP request sent",
                           endpoint=endpoint,
                           method=request.method,
                           status=response.status,
                           success=mcp_response.success)

                return mcp_response

        except Exception as e:
            error_response = MCPResponse(
                request_id=request.id,
                success=False,
                error=str(e),
                source_agent=self.agent_id
            )

            logger.error("MCP request failed",
                        endpoint=endpoint,
                        method=request.method,
                        error=str(e))

            return error_response

    def clear_cache(self):
        """Limpa o cache de requisições"""
        self._request_cache.clear()
        logger.info("MCP cache cleared", agent_id=self.agent_id)


# Context manager para facilitar uso
class MCPClientContext:
    """Context manager para MCPClient"""

    def __init__(self, agent_id: str, timeout: int = 30):
        self.client = MCPClient(agent_id, timeout)

    async def __aenter__(self):
        await self.client.start()
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.close()