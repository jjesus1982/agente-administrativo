"""
Shared Memory - Sistema de memória compartilhada para agentes
"""

import json
import asyncio
from typing import Dict, List, Optional, Any, Set, Tuple
from datetime import datetime, timedelta
import structlog
from collections import defaultdict, deque
import hashlib

from ..core.logger import get_logger
from ..services.cache import RedisCache
from .types import (
    MemoryType, MemoryEntry, MemorySearchQuery, VectorSearchResult
)

logger = get_logger(__name__)


class SharedMemory:
    """Sistema de memória compartilhada entre agentes com busca semântica"""

    def __init__(self, redis_cache: RedisCache, embedding_service=None):
        self.redis = redis_cache
        self.embedding_service = embedding_service

        # Cache local para performance
        self._memory_cache: Dict[str, MemoryEntry] = {}
        self._access_patterns: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))

        # Índices para busca rápida
        self._type_index: Dict[MemoryType, Set[str]] = defaultdict(set)
        self._agent_index: Dict[str, Set[str]] = defaultdict(set)
        self._tag_index: Dict[str, Set[str]] = defaultdict(set)

        # Configuração
        self.cache_size = 1000
        self.default_ttl = 3600  # 1 hora
        self.similarity_threshold = 0.7

        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()
        self._shutdown_event = asyncio.Event()

    async def start(self):
        """Inicia o sistema de memória compartilhada"""
        try:
            logger.info("Starting Shared Memory")

            # Carrega índices
            await self._load_indices()

            # Inicia background tasks
            tasks = [
                self._cleanup_expired_memories(),
                self._update_access_patterns(),
                self._optimize_memory_storage()
            ]

            for coro in tasks:
                task = asyncio.create_task(coro)
                self._background_tasks.add(task)
                task.add_done_callback(self._background_tasks.discard)

            logger.info("Shared Memory started successfully")

        except Exception as e:
            logger.error("Failed to start Shared Memory", error=str(e))
            raise

    async def shutdown(self):
        """Para o sistema de memória compartilhada"""
        try:
            logger.info("Shutting down Shared Memory")

            self._shutdown_event.set()

            # Aguarda conclusão das tasks
            if self._background_tasks:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)

            logger.info("Shared Memory shutdown completed")

        except Exception as e:
            logger.error("Error shutting down Shared Memory", error=str(e))

    async def store_memory(self, memory: MemoryEntry) -> str:
        """Armazena uma memória"""
        try:
            # Gera embedding se necessário
            if not memory.embedding and self.embedding_service:
                memory.embedding = await self._generate_embedding(memory.content)

            # Calcula hash para deduplicação
            content_hash = self._calculate_content_hash(memory.content)

            # Verifica se já existe memória similar
            existing_id = await self._find_duplicate_memory(content_hash, memory.source_agent)
            if existing_id:
                await self._update_memory_access(existing_id)
                return existing_id

            # Armazena no Redis
            await self._store_memory_redis(memory)

            # Atualiza cache local
            self._memory_cache[memory.memory_id] = memory

            # Atualiza índices
            await self._update_memory_indices(memory)

            # Registra hash para deduplicação
            await self.redis.set(
                f"memory_hash:{content_hash}:{memory.source_agent}",
                memory.memory_id,
                ttl=86400
            )

            logger.info("Memory stored",
                       memory_id=memory.memory_id,
                       memory_type=memory.memory_type.value,
                       source_agent=memory.source_agent)

            return memory.memory_id

        except Exception as e:
            logger.error("Failed to store memory",
                        memory_id=memory.memory_id,
                        error=str(e))
            raise

    async def get_memory(self, memory_id: str) -> Optional[MemoryEntry]:
        """Obtém uma memória por ID"""
        try:
            # Verifica cache local
            if memory_id in self._memory_cache:
                memory = self._memory_cache[memory_id]
                await self._update_memory_access(memory_id)
                return memory

            # Busca no Redis
            memory_data = await self.redis.get(f"memory:{memory_id}")
            if not memory_data:
                return None

            memory = MemoryEntry(**memory_data)

            # Atualiza cache
            self._memory_cache[memory_id] = memory

            # Atualiza acesso
            await self._update_memory_access(memory_id)

            return memory

        except Exception as e:
            logger.error("Failed to get memory",
                        memory_id=memory_id,
                        error=str(e))
            return None

    async def search_memories(self, query: MemorySearchQuery) -> List[VectorSearchResult]:
        """Busca memórias usando filtros e similaridade semântica"""
        try:
            results = []

            # Busca por embedding semântico
            if query.query_text and self.embedding_service:
                semantic_results = await self._search_by_embedding(query)
                results.extend(semantic_results)

            # Busca por filtros tradicionais
            filtered_results = await self._search_by_filters(query)
            results.extend(filtered_results)

            # Remove duplicatas
            seen_ids = set()
            unique_results = []
            for result in results:
                if result.memory_id not in seen_ids:
                    seen_ids.add(result.memory_id)
                    unique_results.append(result)

            # Ordena por score de similaridade
            unique_results.sort(key=lambda x: x.similarity_score, reverse=True)

            # Aplica limite
            if query.max_results:
                unique_results = unique_results[:query.max_results]

            logger.info("Memory search completed",
                       query_text=query.query_text[:50] if query.query_text else None,
                       results_count=len(unique_results))

            return unique_results

        except Exception as e:
            logger.error("Failed to search memories", error=str(e))
            return []

    async def get_related_memories(self, memory_id: str, max_results: int = 5) -> List[VectorSearchResult]:
        """Obtém memórias relacionadas"""
        try:
            base_memory = await self.get_memory(memory_id)
            if not base_memory:
                return []

            # Busca por embedding se disponível
            if base_memory.embedding:
                query = MemorySearchQuery(
                    query_embedding=base_memory.embedding,
                    memory_types=base_memory.memory_type,
                    max_results=max_results + 1,  # +1 para excluir a própria memória
                    min_similarity=0.5
                )
                results = await self._search_by_embedding(query)

                # Remove a própria memória dos resultados
                results = [r for r in results if r.memory_id != memory_id]
                return results[:max_results]

            # Fallback: busca por tags e tipo
            related = []
            for tag in base_memory.tags:
                if tag in self._tag_index:
                    for related_id in list(self._tag_index[tag])[:max_results]:
                        if related_id != memory_id:
                            memory = await self.get_memory(related_id)
                            if memory:
                                related.append(VectorSearchResult(
                                    memory_id=related_id,
                                    content=memory.content,
                                    similarity_score=0.6,  # Score base para relacionamento por tag
                                    metadata=memory.dict()
                                ))

            return related[:max_results]

        except Exception as e:
            logger.error("Failed to get related memories",
                        memory_id=memory_id,
                        error=str(e))
            return []

    async def update_memory(self, memory_id: str, updates: Dict[str, Any]) -> bool:
        """Atualiza uma memória existente"""
        try:
            memory = await self.get_memory(memory_id)
            if not memory:
                return False

            # Aplica updates
            if 'content' in updates:
                memory.content = updates['content']
                # Regenera embedding se conteúdo mudou
                if self.embedding_service:
                    memory.embedding = await self._generate_embedding(memory.content)

            if 'tags' in updates:
                # Remove dos índices antigos
                for old_tag in memory.tags:
                    self._tag_index[old_tag].discard(memory_id)

                memory.tags = updates['tags']

                # Adiciona aos novos índices
                for new_tag in memory.tags:
                    self._tag_index[new_tag].add(memory_id)

            if 'confidence' in updates:
                memory.confidence = updates['confidence']

            if 'relevance' in updates:
                memory.relevance = updates['relevance']

            # Atualiza timestamp
            memory.last_accessed_at = datetime.utcnow()

            # Salva no Redis
            await self._store_memory_redis(memory)

            # Atualiza cache
            self._memory_cache[memory_id] = memory

            logger.info("Memory updated", memory_id=memory_id)
            return True

        except Exception as e:
            logger.error("Failed to update memory",
                        memory_id=memory_id,
                        error=str(e))
            return False

    async def delete_memory(self, memory_id: str) -> bool:
        """Deleta uma memória"""
        try:
            memory = await self.get_memory(memory_id)
            if not memory:
                return False

            # Remove do Redis
            await self.redis.delete(f"memory:{memory_id}")

            # Remove do cache
            if memory_id in self._memory_cache:
                del self._memory_cache[memory_id]

            # Remove dos índices
            await self._remove_from_indices(memory)

            logger.info("Memory deleted", memory_id=memory_id)
            return True

        except Exception as e:
            logger.error("Failed to delete memory",
                        memory_id=memory_id,
                        error=str(e))
            return False

    async def get_memory_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas da memória compartilhada"""
        try:
            # Conta memórias por tipo
            type_counts = {}
            for memory_type, memory_ids in self._type_index.items():
                type_counts[memory_type.value] = len(memory_ids)

            # Conta memórias por agente
            agent_counts = {}
            for agent_id, memory_ids in self._agent_index.items():
                agent_counts[agent_id] = len(memory_ids)

            # Calcula tamanho médio das memórias
            total_size = 0
            total_memories = 0
            for memory in self._memory_cache.values():
                total_size += len(memory.content)
                total_memories += 1

            avg_size = total_size / total_memories if total_memories > 0 else 0

            stats = {
                "total_memories": total_memories,
                "memories_by_type": type_counts,
                "memories_by_agent": agent_counts,
                "average_memory_size": avg_size,
                "cache_size": len(self._memory_cache),
                "timestamp": datetime.utcnow().isoformat()
            }

            return stats

        except Exception as e:
            logger.error("Failed to get memory stats", error=str(e))
            return {}

    # Métodos auxiliares
    async def _generate_embedding(self, content: str) -> List[float]:
        """Gera embedding para um conteúdo"""
        if not self.embedding_service:
            return []

        try:
            return await self.embedding_service.embed(content)
        except Exception as e:
            logger.error("Failed to generate embedding", error=str(e))
            return []

    def _calculate_content_hash(self, content: str) -> str:
        """Calcula hash do conteúdo para deduplicação"""
        return hashlib.md5(content.encode()).hexdigest()

    async def _find_duplicate_memory(self, content_hash: str, agent_id: str) -> Optional[str]:
        """Encontra memória duplicada"""
        try:
            existing_id = await self.redis.get(f"memory_hash:{content_hash}:{agent_id}")
            return existing_id
        except:
            return None

    async def _store_memory_redis(self, memory: MemoryEntry):
        """Armazena memória no Redis"""
        ttl = self.default_ttl
        if memory.expires_at:
            ttl = int((memory.expires_at - datetime.utcnow()).total_seconds())

        await self.redis.set(
            f"memory:{memory.memory_id}",
            memory.dict(),
            ttl=max(ttl, 60)
        )

    async def _update_memory_indices(self, memory: MemoryEntry):
        """Atualiza índices de memória"""
        # Índice por tipo
        self._type_index[memory.memory_type].add(memory.memory_id)

        # Índice por agente
        self._agent_index[memory.source_agent].add(memory.memory_id)

        # Índice por tags
        for tag in memory.tags:
            self._tag_index[tag].add(memory.memory_id)

        # Salva índices no Redis para persistência
        await self._persist_indices()

    async def _remove_from_indices(self, memory: MemoryEntry):
        """Remove memória dos índices"""
        self._type_index[memory.memory_type].discard(memory.memory_id)
        self._agent_index[memory.source_agent].discard(memory.memory_id)

        for tag in memory.tags:
            self._tag_index[tag].discard(memory.memory_id)

        await self._persist_indices()

    async def _persist_indices(self):
        """Persiste índices no Redis"""
        try:
            # Persiste índice por tipo
            for memory_type, memory_ids in self._type_index.items():
                await self.redis.set(
                    f"memory_index:type:{memory_type.value}",
                    list(memory_ids),
                    ttl=86400
                )

            # Persiste índice por agente
            for agent_id, memory_ids in self._agent_index.items():
                await self.redis.set(
                    f"memory_index:agent:{agent_id}",
                    list(memory_ids),
                    ttl=86400
                )

        except Exception as e:
            logger.error("Failed to persist indices", error=str(e))

    async def _load_indices(self):
        """Carrega índices do Redis"""
        try:
            # Carrega índices por tipo
            type_keys = await self.redis.redis.keys("memory_index:type:*")
            for key in type_keys:
                key_str = key.decode()
                type_name = key_str.split(":")[-1]
                try:
                    memory_type = MemoryType(type_name)
                    memory_ids = await self.redis.get(key_str)
                    if memory_ids:
                        self._type_index[memory_type] = set(memory_ids)
                except ValueError:
                    continue

            # Carrega índices por agente
            agent_keys = await self.redis.redis.keys("memory_index:agent:*")
            for key in agent_keys:
                key_str = key.decode()
                agent_id = key_str.split(":", 2)[-1]
                memory_ids = await self.redis.get(key_str)
                if memory_ids:
                    self._agent_index[agent_id] = set(memory_ids)

            logger.info("Memory indices loaded")

        except Exception as e:
            logger.error("Failed to load indices", error=str(e))

    async def _search_by_embedding(self, query: MemorySearchQuery) -> List[VectorSearchResult]:
        """Busca usando embeddings"""
        results = []

        if not query.query_embedding:
            return results

        # Busca em todas as memórias do cache
        for memory_id, memory in self._memory_cache.items():
            if not memory.embedding:
                continue

            # Calcula similaridade
            similarity = self._calculate_cosine_similarity(
                query.query_embedding,
                memory.embedding
            )

            if similarity >= query.min_similarity:
                results.append(VectorSearchResult(
                    memory_id=memory_id,
                    content=memory.content,
                    similarity_score=similarity,
                    metadata=memory.dict()
                ))

        return results

    async def _search_by_filters(self, query: MemorySearchQuery) -> List[VectorSearchResult]:
        """Busca usando filtros tradicionais"""
        results = []
        candidate_ids = set()

        # Filtra por tipo
        if query.memory_types:
            for memory_type in query.memory_types:
                candidate_ids.update(self._type_index.get(memory_type, set()))
        else:
            # Se não especificou tipos, pega todos
            for type_set in self._type_index.values():
                candidate_ids.update(type_set)

        # Filtra por agente
        if query.agent_id:
            agent_memories = self._agent_index.get(query.agent_id, set())
            if candidate_ids:
                candidate_ids = candidate_ids.intersection(agent_memories)
            else:
                candidate_ids = agent_memories

        # Filtra por tags
        if query.tags:
            for tag in query.tags:
                tag_memories = self._tag_index.get(tag, set())
                if candidate_ids:
                    candidate_ids = candidate_ids.intersection(tag_memories)
                else:
                    candidate_ids = tag_memories

        # Converte para resultados
        for memory_id in candidate_ids:
            memory = await self.get_memory(memory_id)
            if memory:
                # Aplica filtros temporais
                if query.created_after and memory.created_at < query.created_after:
                    continue
                if query.created_before and memory.created_at > query.created_before:
                    continue

                # Score baseado em relevância e confiança
                score = (memory.relevance + memory.confidence) / 2

                results.append(VectorSearchResult(
                    memory_id=memory_id,
                    content=memory.content,
                    similarity_score=score,
                    metadata=memory.dict()
                ))

        return results

    def _calculate_cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calcula similaridade do cosseno entre dois vetores"""
        if len(vec1) != len(vec2):
            return 0.0

        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)

    async def _update_memory_access(self, memory_id: str):
        """Atualiza estatísticas de acesso"""
        memory = await self.get_memory(memory_id)
        if memory:
            memory.last_accessed_at = datetime.utcnow()
            memory.access_count += 1

            # Registra padrão de acesso
            self._access_patterns[memory_id].append(datetime.utcnow())

            # Atualiza no cache
            self._memory_cache[memory_id] = memory

    # Background tasks
    async def _cleanup_expired_memories(self):
        """Remove memórias expiradas"""
        while not self._shutdown_event.is_set():
            try:
                now = datetime.utcnow()
                expired_memories = []

                for memory_id, memory in self._memory_cache.items():
                    if memory.expires_at and memory.expires_at < now:
                        expired_memories.append(memory_id)

                for memory_id in expired_memories:
                    await self.delete_memory(memory_id)

                await asyncio.sleep(300)  # 5 minutos

            except Exception as e:
                logger.error("Error in memory cleanup task", error=str(e))
                await asyncio.sleep(300)

    async def _update_access_patterns(self):
        """Atualiza padrões de acesso"""
        while not self._shutdown_event.is_set():
            try:
                # Analisa padrões e otimiza cache
                await self._optimize_cache_based_on_access()

                await asyncio.sleep(600)  # 10 minutos

            except Exception as e:
                logger.error("Error updating access patterns", error=str(e))
                await asyncio.sleep(600)

    async def _optimize_memory_storage(self):
        """Otimiza armazenamento de memórias"""
        while not self._shutdown_event.is_set():
            try:
                # Compacta memórias antigas, remove duplicatas, etc.
                await asyncio.sleep(3600)  # 1 hora

            except Exception as e:
                logger.error("Error in memory optimization task", error=str(e))
                await asyncio.sleep(3600)

    async def _optimize_cache_based_on_access(self):
        """Otimiza cache baseado nos padrões de acesso"""
        # Identifica memórias mais acessadas
        access_scores = {}
        for memory_id, accesses in self._access_patterns.items():
            # Score baseado em frequência recente
            recent_accesses = [
                access for access in accesses
                if (datetime.utcnow() - access).total_seconds() < 3600  # Última hora
            ]
            access_scores[memory_id] = len(recent_accesses)

        # Mantém as mais acessadas no cache
        if len(self._memory_cache) > self.cache_size:
            sorted_by_access = sorted(
                access_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )

            # Remove as menos acessadas
            to_remove = sorted_by_access[self.cache_size:]
            for memory_id, _ in to_remove:
                if memory_id in self._memory_cache:
                    del self._memory_cache[memory_id]