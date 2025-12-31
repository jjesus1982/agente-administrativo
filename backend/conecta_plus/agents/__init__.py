"""
Multi-Agent System - Sistema de 36 agentes especializados
Cada agente tem responsabilidades específicas no ecossistema Conecta Plus
"""

from .orchestrator import AgentOrchestrator
from .registry import AgentRegistry
from .base import BaseAgent, AgentCapability, AgentType
from .specialized_agents import *

__all__ = [
    "AgentOrchestrator",
    "AgentRegistry",
    "BaseAgent",
    "AgentCapability",
    "AgentType"
]