# -*- coding: utf-8 -*-
"""
Agente Técnico - Conecta Plus
=============================

Módulo de inteligência técnica para portaria remota e controle de acesso.

Responsabilidades:
- Gerar topologias e soluções técnicas
- Criar checklists e documentação
- Produzir JobTemplates para o Conecta Fielder
- Auxiliar em troubleshooting
- Gerar esquemas de ligação
"""

__version__ = "2.0.0"

from .schemas import (
    CondominioContext,
    Acesso,
    TipoAmbiente,
    TipoAcesso,
    Equipamento,
    TopologiaSugestao,
    DocumentoTecnico,
    ResultadoLLM,
    Checklist,
    ChecklistItem,
)
from .llm_client import (
    BaseLLMClient,
    DummyLLMClient,
    OpenAILLMClient,
    ClaudeLLMClient,
    create_llm_client,
)
from .agent import AgentTecnico
from .api import router

__all__ = [
    # Schemas
    "CondominioContext",
    "Acesso",
    "TipoAmbiente",
    "TipoAcesso",
    "Equipamento",
    "TopologiaSugestao",
    "DocumentoTecnico",
    "ResultadoLLM",
    "Checklist",
    "ChecklistItem",
    # LLM
    "BaseLLMClient",
    "DummyLLMClient",
    "OpenAILLMClient",
    "ClaudeLLMClient",
    "create_llm_client",
    # Core
    "AgentTecnico",
    "router",
]
