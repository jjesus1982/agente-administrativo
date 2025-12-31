"""
Context Database - Database para armazenamento e gestão de contextos compartilhados
"""

import json
import asyncio
from typing import Dict, List, Optional, Any, Set, Tuple
from datetime import datetime, timedelta
import structlog
from collections import defaultdict

from ..core.logger import get_logger
from ..services.cache import RedisCache
from .types import (
    Context, ContextType, ContextQuery, ContextUpdate, ContextMetadata,
    ContextScope, ContextAccess, ContextSnapshot, ContextIndex,
    ContextRelation, ContextStats, ContextSearchResult
)

logger = get_logger(__name__)


class ContextDatabase:
    """Database de contextos compartilhados com suporte a Redis e cache inteligente"""

    def __init__(self, redis_cache: RedisCache):
        self.redis = redis_cache

        # Cache local para performance
        self._local_cache: Dict[str, Context] = {}
        self._index_cache: Dict[str, List[str]] = defaultdict(list)
        self._stats_cache: Optional[ContextStats] = None

        # Configuração
        self.cache_size = 1000
        self.default_ttl = 3600  # 1 hora
        self.max_versions = 10
        self.cleanup_interval = 300  # 5 minutos

        # Locks para concorrência
        self._locks: Dict[str, asyncio.Lock] = {}

        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()
        self._shutdown_event = asyncio.Event()

    async def start(self):
        """Inicia o Context Database"""
        try:
            logger.info("Starting Context Database")

            # Carrega índices do Redis
            await self._load_indices()

            # Inicia tasks de background
            tasks = [
                self._cleanup_expired_contexts(),
                self._update_statistics(),
                self._optimize_indices()
            ]

            for coro in tasks:
                task = asyncio.create_task(coro)
                self._background_tasks.add(task)
                task.add_done_callback(self._background_tasks.discard)

            logger.info("Context Database started successfully")

        except Exception as e:
            logger.error("Failed to start Context Database", error=str(e))
            raise

    async def shutdown(self):
        """Para o Context Database"""
        try:
            logger.info("Shutting down Context Database")

            self._shutdown_event.set()

            # Aguarda conclusão das tasks
            if self._background_tasks:
                await asyncio.gather(*self._background_tasks, return_exceptions=True)

            # Persiste cache final
            await self._persist_cache()

            logger.info("Context Database shutdown completed")

        except Exception as e:
            logger.error("Error shutting down Context Database", error=str(e))

    async def create_context(self, context: Context) -> str:
        """Cria um novo contexto"""
        try:
            # Valida contexto
            await self._validate_context(context)

            # Atualiza metadados
            context.metadata.created_at = datetime.utcnow()
            context.metadata.updated_at = datetime.utcnow()

            # Adquire lock
            async with self._get_lock(context.context_id):
                # Armazena no Redis
                await self._store_context(context)

                # Atualiza cache local
                self._local_cache[context.context_id] = context

                # Atualiza índices
                await self._update_indices(context)

                # Cria snapshot inicial
                await self._create_snapshot(context)

                # Registra acesso
                await self._log_access(
                    context.context_id,
                    context.metadata.source_agent,
                    "create"
                )

            logger.info("Context created",
                       context_id=context.context_id,
                       context_type=context.context_type.value,
                       source_agent=context.metadata.source_agent)

            return context.context_id

        except Exception as e:
            logger.error("Failed to create context",
                        context_id=context.context_id,
                        error=str(e))
            raise

    async def get_context(self, context_id: str, agent_id: str = None) -> Optional[Context]:
        """Obtém um contexto por ID"""
        try:
            # Verifica cache local primeiro
            if context_id in self._local_cache:
                context = self._local_cache[context_id]
                await self._check_access_permissions(context, agent_id)
                await self._update_access_stats(context, agent_id)
                return context

            # Busca no Redis
            context_data = await self.redis.get(f"context:{context_id}")
            if not context_data:
                return None

            context = Context(**context_data)

            # Verifica permissões
            await self._check_access_permissions(context, agent_id)

            # Atualiza cache local
            self._local_cache[context_id] = context

            # Atualiza estatísticas de acesso
            await self._update_access_stats(context, agent_id)

            # Registra acesso
            if agent_id:
                await self._log_access(context_id, agent_id, "read")

            return context

        except Exception as e:
            logger.error("Failed to get context",
                        context_id=context_id,
                        error=str(e))
            return None

    async def update_context(self,
                           context_id: str,
                           update: ContextUpdate,
                           agent_id: str) -> bool:
        """Atualiza um contexto existente"""
        try:
            async with self._get_lock(context_id):
                # Obtém contexto atual
                context = await self.get_context(context_id, agent_id)
                if not context:
                    return False

                # Verifica permissões de escrita
                if not await self._can_write_context(context, agent_id):
                    raise PermissionError(f"Agent {agent_id} cannot write to context {context_id}")

                # Cria snapshot antes da atualização
                await self._create_snapshot(context)

                # Aplica atualizações
                if update.data:
                    context.data.update(update.data)

                if update.metadata:
                    # Preserva alguns campos críticos
                    original_created_at = context.metadata.created_at
                    original_source_agent = context.metadata.source_agent

                    context.metadata = update.metadata
                    context.metadata.created_at = original_created_at
                    context.metadata.source_agent = original_source_agent

                context.metadata.updated_at = datetime.utcnow()
                context.version += 1

                # Atualiza tags
                if update.add_tags:
                    context.metadata.tags.extend(update.add_tags)
                if update.remove_tags:
                    context.metadata.tags = [
                        tag for tag in context.metadata.tags
                        if tag not in update.remove_tags
                    ]

                # Atualiza relacionamentos
                if update.add_related_contexts:
                    context.related_context_ids.extend(update.add_related_contexts)
                if update.remove_related_contexts:
                    context.related_context_ids = [
                        rel_id for rel_id in context.related_context_ids
                        if rel_id not in update.remove_related_contexts
                    ]

                # Armazena contexto atualizado
                await self._store_context(context)

                # Atualiza cache
                self._local_cache[context_id] = context

                # Atualiza índices
                await self._update_indices(context)

                # Registra acesso
                await self._log_access(context_id, agent_id, "write")

            logger.info("Context updated",
                       context_id=context_id,
                       version=context.version,
                       updated_by=agent_id)

            return True

        except Exception as e:
            logger.error("Failed to update context",
                        context_id=context_id,
                        error=str(e))
            return False

    async def delete_context(self, context_id: str, agent_id: str) -> bool:
        """Deleta um contexto"""
        try:
            async with self._get_lock(context_id):
                # Obtém contexto
                context = await self.get_context(context_id, agent_id)
                if not context:
                    return False

                # Verifica permissões
                if not await self._can_delete_context(context, agent_id):
                    raise PermissionError(f"Agent {agent_id} cannot delete context {context_id}")

                # Remove do Redis
                await self.redis.delete(f"context:{context_id}")

                # Remove do cache local
                if context_id in self._local_cache:
                    del self._local_cache[context_id]

                # Remove dos índices
                await self._remove_from_indices(context)

                # Remove snapshots
                await self._delete_snapshots(context_id)

                # Registra acesso
                await self._log_access(context_id, agent_id, "delete")

            logger.info("Context deleted",
                       context_id=context_id,
                       deleted_by=agent_id)

            return True

        except Exception as e:
            logger.error("Failed to delete context",
                        context_id=context_id,
                        error=str(e))
            return False

    async def query_contexts(self, query: ContextQuery, agent_id: str = None) -> List[ContextSearchResult]:
        """Busca contextos com base em uma query"""
        try:
            # Constrói filtros
            filters = await self._build_query_filters(query, agent_id)

            # Busca usando índices
            candidate_ids = await self._search_by_indices(filters)

            # Carrega contextos e aplica filtros finais
            results = []
            for context_id in candidate_ids:
                context = await self.get_context(context_id, agent_id)
                if context and await self._matches_query(context, query):
                    relevance_score = await self._calculate_relevance(context, query)
                    match_reasons = await self._get_match_reasons(context, query)

                    results.append(ContextSearchResult(
                        context=context,
                        relevance_score=relevance_score,
                        match_reasons=match_reasons
                    ))

            # Ordena por relevância
            results.sort(key=lambda x: x.relevance_score, reverse=True)

            # Aplica limite
            if query.limit:
                results = results[query.offset:query.offset + query.limit]

            logger.info("Context query executed",
                       query_filters=len(filters),
                       candidates=len(candidate_ids),
                       results=len(results))

            return results

        except Exception as e:
            logger.error("Failed to query contexts", error=str(e))
            return []

    async def get_related_contexts(self,
                                 context_id: str,
                                 relation_types: List[str] = None,
                                 agent_id: str = None) -> List[Context]:
        """Obtém contextos relacionados"""
        try:
            context = await self.get_context(context_id, agent_id)
            if not context:
                return []

            related_contexts = []

            # Busca relacionamentos diretos
            for related_id in context.related_context_ids:
                related_context = await self.get_context(related_id, agent_id)
                if related_context:
                    related_contexts.append(related_context)

            # Busca relacionamentos no Redis
            relation_keys = await self.redis.redis.keys(f"relation:*:{context_id}")
            for key in relation_keys:
                relation_data = await self.redis.get(key.decode())
                if relation_data:
                    relation = ContextRelation(**relation_data)
                    if not relation_types or relation.relation_type in relation_types:
                        target_context = await self.get_context(relation.target_context_id, agent_id)
                        if target_context and target_context not in related_contexts:
                            related_contexts.append(target_context)

            return related_contexts

        except Exception as e:
            logger.error("Failed to get related contexts",
                        context_id=context_id,
                        error=str(e))
            return []

    async def create_relation(self,
                            source_context_id: str,
                            target_context_id: str,
                            relation_type: str,
                            agent_id: str,
                            weight: float = 1.0) -> str:
        """Cria uma relação entre contextos"""
        try:
            relation = ContextRelation(
                source_context_id=source_context_id,
                target_context_id=target_context_id,
                relation_type=relation_type,
                weight=weight,
                created_by=agent_id
            )

            # Armazena relação
            await self.redis.set(
                f"relation:{relation.relation_id}:{source_context_id}",
                relation.dict(),
                ttl=86400  # 24 horas
            )

            logger.info("Context relation created",
                       relation_id=relation.relation_id,
                       source=source_context_id,
                       target=target_context_id,
                       type=relation_type)

            return relation.relation_id

        except Exception as e:
            logger.error("Failed to create context relation",
                        source=source_context_id,
                        target=target_context_id,
                        error=str(e))
            raise

    async def get_context_versions(self, context_id: str, agent_id: str = None) -> List[ContextSnapshot]:
        """Obtém versões de um contexto"""
        try:
            snapshot_keys = await self.redis.redis.keys(f"snapshot:{context_id}:*")
            snapshots = []

            for key in snapshot_keys:
                snapshot_data = await self.redis.get(key.decode())
                if snapshot_data:
                    snapshot = ContextSnapshot(**snapshot_data)
                    snapshots.append(snapshot)

            # Ordena por versão
            snapshots.sort(key=lambda x: x.version, reverse=True)

            return snapshots

        except Exception as e:
            logger.error("Failed to get context versions",
                        context_id=context_id,
                        error=str(e))
            return []

    async def get_statistics(self) -> ContextStats:
        """Obtém estatísticas do sistema de contextos"""
        try:
            if self._stats_cache:
                return self._stats_cache

            stats = ContextStats()

            # Conta contextos por tipo
            context_keys = await self.redis.redis.keys("context:*")
            for key in context_keys:
                context_data = await self.redis.get(key.decode())
                if context_data:
                    context = Context(**context_data)
                    stats.total_contexts += 1
                    stats.contexts_by_type[context.context_type.value] = (
                        stats.contexts_by_type.get(context.context_type.value, 0) + 1
                    )
                    stats.contexts_by_scope[context.metadata.scope.value] = (
                        stats.contexts_by_scope.get(context.metadata.scope.value, 0) + 1
                    )

            # Calcula outras métricas
            stats.average_context_size = self._calculate_average_size()
            stats.cache_hit_rate = self._calculate_cache_hit_rate()

            # Cacheia resultados
            self._stats_cache = stats

            return stats

        except Exception as e:
            logger.error("Failed to get statistics", error=str(e))
            return ContextStats()

    # Métodos auxiliares
    async def _validate_context(self, context: Context):
        """Valida um contexto"""
        if not context.context_type:
            raise ValueError("Context type is required")

        if not context.metadata.source_agent:
            raise ValueError("Source agent is required")

    async def _store_context(self, context: Context):
        """Armazena contexto no Redis"""
        ttl = self.default_ttl
        if context.metadata.expires_at:
            ttl = int((context.metadata.expires_at - datetime.utcnow()).total_seconds())

        await self.redis.set(
            f"context:{context.context_id}",
            context.dict(),
            ttl=max(ttl, 60)  # Mínimo 1 minuto
        )

    async def _update_indices(self, context: Context):
        """Atualiza índices de busca"""
        # Índice por tipo
        type_key = f"index:type:{context.context_type.value}"
        await self.redis.redis.sadd(type_key, context.context_id)

        # Índice por tenant
        if context.tenant_id:
            tenant_key = f"index:tenant:{context.tenant_id}"
            await self.redis.redis.sadd(tenant_key, context.context_id)

        # Índice por tags
        for tag in context.metadata.tags:
            tag_key = f"index:tag:{tag}"
            await self.redis.redis.sadd(tag_key, context.context_id)

        # Índice por agent
        agent_key = f"index:agent:{context.metadata.source_agent}"
        await self.redis.redis.sadd(agent_key, context.context_id)

    async def _remove_from_indices(self, context: Context):
        """Remove contexto dos índices"""
        indices_to_remove = [
            f"index:type:{context.context_type.value}",
            f"index:agent:{context.metadata.source_agent}"
        ]

        if context.tenant_id:
            indices_to_remove.append(f"index:tenant:{context.tenant_id}")

        for tag in context.metadata.tags:
            indices_to_remove.append(f"index:tag:{tag}")

        for index_key in indices_to_remove:
            await self.redis.redis.srem(index_key, context.context_id)

    async def _create_snapshot(self, context: Context):
        """Cria snapshot de um contexto"""
        snapshot = ContextSnapshot(
            context_id=context.context_id,
            version=context.version,
            data=context.data,
            metadata=context.metadata,
            created_by=context.metadata.source_agent
        )

        await self.redis.set(
            f"snapshot:{context.context_id}:{context.version}",
            snapshot.dict(),
            ttl=86400 * 30  # 30 dias
        )

    async def _delete_snapshots(self, context_id: str):
        """Remove snapshots de um contexto"""
        snapshot_keys = await self.redis.redis.keys(f"snapshot:{context_id}:*")
        for key in snapshot_keys:
            await self.redis.delete(key.decode())

    async def _log_access(self, context_id: str, agent_id: str, access_type: str):
        """Registra acesso ao contexto"""
        access = ContextAccess(
            context_id=context_id,
            agent_id=agent_id,
            access_type=access_type
        )

        await self.redis.set(
            f"access:{access.access_id}",
            access.dict(),
            ttl=86400 * 7  # 7 dias
        )

    async def _check_access_permissions(self, context: Context, agent_id: str):
        """Verifica permissões de acesso"""
        if not agent_id:
            return  # Acesso sem agent_id (sistema interno)

        metadata = context.metadata

        # Verifica agentes restritos
        if agent_id in metadata.restricted_agents:
            raise PermissionError(f"Agent {agent_id} is restricted from accessing context {context.context_id}")

        # Verifica escopo
        if metadata.scope == ContextScope.PRIVATE:
            if agent_id != metadata.source_agent:
                raise PermissionError(f"Context {context.context_id} is private")

        elif metadata.scope == ContextScope.AGENT_GROUP:
            if agent_id not in metadata.allowed_agents:
                raise PermissionError(f"Agent {agent_id} not in allowed group for context {context.context_id}")

    async def _can_write_context(self, context: Context, agent_id: str) -> bool:
        """Verifica se agente pode escrever no contexto"""
        metadata = context.metadata

        # Owner sempre pode escrever
        if agent_id == metadata.source_agent:
            return True

        # Verifica agentes permitidos
        return agent_id in metadata.allowed_agents

    async def _can_delete_context(self, context: Context, agent_id: str) -> bool:
        """Verifica se agente pode deletar o contexto"""
        # Apenas o owner pode deletar
        return agent_id == context.metadata.source_agent

    async def _update_access_stats(self, context: Context, agent_id: str):
        """Atualiza estatísticas de acesso"""
        context.metadata.access_count += 1
        context.metadata.last_accessed_at = datetime.utcnow()
        context.metadata.last_accessed_by = agent_id

    def _get_lock(self, context_id: str) -> asyncio.Lock:
        """Obtém lock para um contexto"""
        if context_id not in self._locks:
            self._locks[context_id] = asyncio.Lock()
        return self._locks[context_id]

    async def _build_query_filters(self, query: ContextQuery, agent_id: str) -> Dict[str, Any]:
        """Constrói filtros para query"""
        filters = {}

        if query.context_type:
            filters["context_type"] = query.context_type.value
        if query.tenant_id:
            filters["tenant_id"] = query.tenant_id
        if query.project_id:
            filters["project_id"] = query.project_id
        if query.workflow_id:
            filters["workflow_id"] = query.workflow_id
        if query.tags:
            filters["tags"] = query.tags
        if agent_id:
            filters["agent_id"] = agent_id

        return filters

    async def _search_by_indices(self, filters: Dict[str, Any]) -> List[str]:
        """Busca usando índices"""
        result_sets = []

        # Busca por cada filtro
        if "context_type" in filters:
            type_key = f"index:type:{filters['context_type']}"
            type_ids = await self.redis.redis.smembers(type_key)
            result_sets.append(set(id.decode() for id in type_ids))

        if "tenant_id" in filters:
            tenant_key = f"index:tenant:{filters['tenant_id']}"
            tenant_ids = await self.redis.redis.smembers(tenant_key)
            result_sets.append(set(id.decode() for id in tenant_ids))

        if "tags" in filters:
            for tag in filters["tags"]:
                tag_key = f"index:tag:{tag}"
                tag_ids = await self.redis.redis.smembers(tag_key)
                result_sets.append(set(id.decode() for id in tag_ids))

        # Intersecção dos resultados
        if result_sets:
            final_ids = result_sets[0]
            for result_set in result_sets[1:]:
                final_ids = final_ids.intersection(result_set)
            return list(final_ids)

        # Se não há filtros, retorna todos
        all_keys = await self.redis.redis.keys("context:*")
        return [key.decode().split(":", 1)[1] for key in all_keys]

    async def _matches_query(self, context: Context, query: ContextQuery) -> bool:
        """Verifica se contexto faz match com query"""
        # Implementa lógica detalhada de match
        return True  # Simplificado

    async def _calculate_relevance(self, context: Context, query: ContextQuery) -> float:
        """Calcula score de relevância"""
        score = 1.0

        # Bonus por match exato de tipo
        if query.context_type and context.context_type == query.context_type:
            score += 0.5

        # Bonus por tags
        if query.tags:
            matching_tags = set(query.tags).intersection(set(context.metadata.tags))
            score += len(matching_tags) * 0.1

        # Penaliza por idade
        age_days = (datetime.utcnow() - context.metadata.created_at).days
        if age_days > 30:
            score *= 0.8

        return min(score, 2.0)  # Máximo 2.0

    async def _get_match_reasons(self, context: Context, query: ContextQuery) -> List[str]:
        """Obtém razões para o match"""
        reasons = []

        if query.context_type and context.context_type == query.context_type:
            reasons.append("Type match")

        if query.tags:
            matching_tags = set(query.tags).intersection(set(context.metadata.tags))
            if matching_tags:
                reasons.append(f"Tag match: {', '.join(matching_tags)}")

        return reasons

    def _calculate_average_size(self) -> float:
        """Calcula tamanho médio dos contextos"""
        if not self._local_cache:
            return 0

        total_size = sum(len(json.dumps(ctx.dict())) for ctx in self._local_cache.values())
        return total_size / len(self._local_cache)

    def _calculate_cache_hit_rate(self) -> float:
        """Calcula taxa de cache hit"""
        # Simplificado - em implementação real, trackear hits/misses
        return 0.75

    # Background tasks
    async def _cleanup_expired_contexts(self):
        """Remove contextos expirados"""
        while not self._shutdown_event.is_set():
            try:
                now = datetime.utcnow()
                expired_contexts = []

                for context_id, context in self._local_cache.items():
                    if (context.metadata.expires_at and
                        context.metadata.expires_at < now):
                        expired_contexts.append(context_id)

                for context_id in expired_contexts:
                    await self.delete_context(context_id, "system")

                await asyncio.sleep(self.cleanup_interval)

            except Exception as e:
                logger.error("Error in cleanup task", error=str(e))
                await asyncio.sleep(self.cleanup_interval)

    async def _update_statistics(self):
        """Atualiza estatísticas periodicamente"""
        while not self._shutdown_event.is_set():
            try:
                # Limpa cache de estatísticas
                self._stats_cache = None

                await asyncio.sleep(300)  # 5 minutos

            except Exception as e:
                logger.error("Error updating statistics", error=str(e))
                await asyncio.sleep(300)

    async def _optimize_indices(self):
        """Otimiza índices periodicamente"""
        while not self._shutdown_event.is_set():
            try:
                # Limpa índices órfãos
                await self._cleanup_orphan_indices()

                await asyncio.sleep(3600)  # 1 hora

            except Exception as e:
                logger.error("Error optimizing indices", error=str(e))
                await asyncio.sleep(3600)

    async def _cleanup_orphan_indices(self):
        """Remove índices órfãos"""
        # Implementa limpeza de índices que referenciam contextos inexistentes
        pass

    async def _load_indices(self):
        """Carrega índices do Redis"""
        try:
            # Carrega índices principais
            index_keys = await self.redis.redis.keys("index:*")
            for key in index_keys:
                key_str = key.decode()
                members = await self.redis.redis.smembers(key)
                self._index_cache[key_str] = [m.decode() for m in members]

            logger.info("Indices loaded", count=len(self._index_cache))

        except Exception as e:
            logger.error("Failed to load indices", error=str(e))

    async def _persist_cache(self):
        """Persiste cache local no Redis"""
        try:
            for context_id, context in self._local_cache.items():
                await self._store_context(context)

            logger.info("Local cache persisted", size=len(self._local_cache))

        except Exception as e:
            logger.error("Failed to persist cache", error=str(e))