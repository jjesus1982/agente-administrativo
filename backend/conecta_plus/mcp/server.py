"""
MCP Server - Servidor para expor tools, prompts e recursos via MCP
"""

import json
import asyncio
from typing import Dict, List, Optional, Any, Callable, Union
from datetime import datetime
import structlog
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import inspect

from ..core.logger import get_logger
from .types import (
    MCPRequest, MCPResponse, MCPError, MCPCapability, MCPToolCall,
    MCPPromptTemplate, MCPResourceInfo, MCPServerInfo
)

logger = get_logger(__name__)


class MCPTool:
    """Definição de uma ferramenta MCP"""

    def __init__(self,
                 name: str,
                 description: str,
                 handler: Callable,
                 input_schema: Dict[str, Any] = None,
                 output_schema: Dict[str, Any] = None):
        self.name = name
        self.description = description
        self.handler = handler
        self.input_schema = input_schema or self._generate_input_schema()
        self.output_schema = output_schema or {"type": "object"}

    def _generate_input_schema(self) -> Dict[str, Any]:
        """Gera schema de input baseado na assinatura da função"""
        sig = inspect.signature(self.handler)
        properties = {}

        for param_name, param in sig.parameters.items():
            if param_name in ['self', 'request', 'context']:
                continue

            param_type = "string"
            if param.annotation != param.empty:
                if param.annotation == int:
                    param_type = "integer"
                elif param.annotation == float:
                    param_type = "number"
                elif param.annotation == bool:
                    param_type = "boolean"
                elif param.annotation == list:
                    param_type = "array"
                elif param.annotation == dict:
                    param_type = "object"

            properties[param_name] = {
                "type": param_type,
                "description": f"Parameter {param_name}"
            }

        return {
            "type": "object",
            "properties": properties,
            "required": [p for p in properties.keys()]
        }


class MCPPrompt:
    """Definição de um prompt MCP"""

    def __init__(self,
                 name: str,
                 description: str,
                 template: str,
                 variables: List[str] = None,
                 examples: List[Dict[str, str]] = None):
        self.name = name
        self.description = description
        self.template = template
        self.variables = variables or []
        self.examples = examples or []

    def render(self, variables: Dict[str, Any]) -> str:
        """Renderiza o prompt com as variáveis"""
        try:
            return self.template.format(**variables)
        except KeyError as e:
            raise ValueError(f"Variável obrigatória ausente: {e}")


class MCPResource:
    """Definição de um recurso MCP"""

    def __init__(self,
                 uri: str,
                 mime_type: str,
                 description: str,
                 handler: Callable,
                 size: Optional[int] = None,
                 metadata: Dict[str, Any] = None):
        self.uri = uri
        self.mime_type = mime_type
        self.description = description
        self.handler = handler
        self.size = size
        self.metadata = metadata or {}


class MCPServer:
    """Servidor MCP para expor tools, prompts e recursos"""

    def __init__(self,
                 server_id: str,
                 name: str,
                 description: str,
                 version: str = "1.0.0"):
        self.server_id = server_id
        self.name = name
        self.description = description
        self.version = version
        self.tools: Dict[str, MCPTool] = {}
        self.prompts: Dict[str, MCPPrompt] = {}
        self.resources: Dict[str, MCPResource] = {}
        self.app = FastAPI(title=name, description=description, version=version)
        self._setup_routes()

    def _setup_routes(self):
        """Configura as rotas do servidor MCP"""

        @self.app.post("/mcp/tools/call")
        async def call_tool(request: MCPRequest):
            return await self._handle_tool_call(request)

        @self.app.get("/mcp/tools/list")
        async def list_tools():
            return await self._handle_list_tools()

        @self.app.post("/mcp/prompts/get")
        async def get_prompt(request: MCPRequest):
            return await self._handle_get_prompt(request)

        @self.app.get("/mcp/prompts/list")
        async def list_prompts():
            return await self._handle_list_prompts()

        @self.app.post("/mcp/resources/read")
        async def read_resource(request: MCPRequest):
            return await self._handle_read_resource(request)

        @self.app.get("/mcp/resources/list")
        async def list_resources():
            return await self._handle_list_resources()

        @self.app.get("/mcp/info")
        async def server_info():
            return self._get_server_info()

        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.utcnow()}

    def register_tool(self, tool: MCPTool):
        """Registra uma ferramenta"""
        self.tools[tool.name] = tool
        logger.info("Tool registered",
                   server_id=self.server_id,
                   tool_name=tool.name)

    def register_prompt(self, prompt: MCPPrompt):
        """Registra um prompt"""
        self.prompts[prompt.name] = prompt
        logger.info("Prompt registered",
                   server_id=self.server_id,
                   prompt_name=prompt.name)

    def register_resource(self, resource: MCPResource):
        """Registra um recurso"""
        self.resources[resource.uri] = resource
        logger.info("Resource registered",
                   server_id=self.server_id,
                   resource_uri=resource.uri)

    def tool(self,
             name: str,
             description: str,
             input_schema: Dict[str, Any] = None,
             output_schema: Dict[str, Any] = None):
        """Decorator para registrar ferramentas"""
        def decorator(func):
            tool = MCPTool(name, description, func, input_schema, output_schema)
            self.register_tool(tool)
            return func
        return decorator

    def prompt(self,
               name: str,
               description: str,
               variables: List[str] = None,
               examples: List[Dict[str, str]] = None):
        """Decorator para registrar prompts"""
        def decorator(func):
            # Extrai template do docstring ou primeiro return
            template = func.__doc__ or ""
            prompt = MCPPrompt(name, description, template, variables, examples)
            self.register_prompt(prompt)
            return func
        return decorator

    def resource(self,
                uri: str,
                mime_type: str,
                description: str,
                size: Optional[int] = None,
                metadata: Dict[str, Any] = None):
        """Decorator para registrar recursos"""
        def decorator(func):
            resource = MCPResource(uri, mime_type, description, func, size, metadata)
            self.register_resource(resource)
            return func
        return decorator

    async def _handle_tool_call(self, request: MCPRequest) -> MCPResponse:
        """Processa chamada de ferramenta"""
        try:
            tool_name = request.params.get("name")
            arguments = request.params.get("arguments", {})

            if tool_name not in self.tools:
                raise ValueError(f"Ferramenta '{tool_name}' não encontrada")

            tool = self.tools[tool_name]

            # Executa a ferramenta
            if asyncio.iscoroutinefunction(tool.handler):
                result = await tool.handler(**arguments)
            else:
                result = tool.handler(**arguments)

            return MCPResponse(
                request_id=request.id,
                success=True,
                result={"output": result},
                metadata={
                    "tool_name": tool_name,
                    "execution_time": datetime.utcnow().isoformat()
                }
            )

        except Exception as e:
            logger.error("Tool call failed",
                        tool_name=tool_name,
                        error=str(e))

            return MCPResponse(
                request_id=request.id,
                success=False,
                error=str(e)
            )

    async def _handle_list_tools(self) -> Dict[str, Any]:
        """Lista todas as ferramentas disponíveis"""
        tools_list = []
        for tool in self.tools.values():
            tools_list.append({
                "name": tool.name,
                "description": tool.description,
                "inputSchema": tool.input_schema,
                "outputSchema": tool.output_schema
            })

        return {"tools": tools_list}

    async def _handle_get_prompt(self, request: MCPRequest) -> MCPResponse:
        """Obtém e renderiza um prompt"""
        try:
            prompt_name = request.params.get("name")
            arguments = request.params.get("arguments", {})

            if prompt_name not in self.prompts:
                raise ValueError(f"Prompt '{prompt_name}' não encontrado")

            prompt = self.prompts[prompt_name]
            rendered = prompt.render(arguments)

            return MCPResponse(
                request_id=request.id,
                success=True,
                result={
                    "prompt": rendered,
                    "name": prompt.name,
                    "description": prompt.description
                }
            )

        except Exception as e:
            return MCPResponse(
                request_id=request.id,
                success=False,
                error=str(e)
            )

    async def _handle_list_prompts(self) -> Dict[str, Any]:
        """Lista todos os prompts disponíveis"""
        prompts_list = []
        for prompt in self.prompts.values():
            prompts_list.append({
                "name": prompt.name,
                "description": prompt.description,
                "variables": prompt.variables,
                "examples": prompt.examples
            })

        return {"prompts": prompts_list}

    async def _handle_read_resource(self, request: MCPRequest) -> MCPResponse:
        """Lê um recurso"""
        try:
            resource_uri = request.params.get("uri")

            if resource_uri not in self.resources:
                raise ValueError(f"Recurso '{resource_uri}' não encontrado")

            resource = self.resources[resource_uri]

            if asyncio.iscoroutinefunction(resource.handler):
                content = await resource.handler()
            else:
                content = resource.handler()

            return MCPResponse(
                request_id=request.id,
                success=True,
                result={
                    "uri": resource.uri,
                    "mimeType": resource.mime_type,
                    "content": content,
                    "metadata": resource.metadata
                }
            )

        except Exception as e:
            return MCPResponse(
                request_id=request.id,
                success=False,
                error=str(e)
            )

    async def _handle_list_resources(self) -> Dict[str, Any]:
        """Lista todos os recursos disponíveis"""
        resources_list = []
        for resource in self.resources.values():
            resources_list.append({
                "uri": resource.uri,
                "mimeType": resource.mime_type,
                "description": resource.description,
                "size": resource.size,
                "metadata": resource.metadata
            })

        return {"resources": resources_list}

    def _get_server_info(self) -> MCPServerInfo:
        """Retorna informações do servidor"""
        capabilities = []
        for tool in self.tools.values():
            capabilities.append(MCPCapability(
                name=tool.name,
                description=tool.description,
                input_schema=tool.input_schema,
                output_schema=tool.output_schema
            ))

        return MCPServerInfo(
            server_id=self.server_id,
            name=self.name,
            description=self.description,
            endpoint=f"http://localhost:8000",  # Will be updated
            version=self.version,
            capabilities=capabilities,
            tools=list(self.tools.keys()),
            prompts=list(self.prompts.keys()),
            resources=list(self.resources.keys())
        )