"""
Context Sharing System - Sistema de compartilhamento de contexto entre agentes
"""

from .database import ContextDatabase
from .memory import SharedMemory, MemoryType, MemoryEntry
from .vector_store import VectorStore, VectorSearchResult
from .types import ContextType, Context, ContextQuery, ContextMetadata

__all__ = [
    "ContextDatabase",
    "SharedMemory",
    "MemoryType",
    "MemoryEntry",
    "VectorStore",
    "VectorSearchResult",
    "ContextType",
    "Context",
    "ContextQuery",
    "ContextMetadata"
]