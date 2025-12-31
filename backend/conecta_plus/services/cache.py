"""
Redis Cache Service
"""

import json
from datetime import timedelta
from typing import Any, Optional, Union

import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

from conecta_plus.config import settings
from conecta_plus.core.logger import get_logger

logger = get_logger(__name__)


class RedisCache:
    """Servico de cache usando Redis"""

    def __init__(self):
        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[redis.Redis] = None

    async def connect(self):
        """Conecta ao Redis"""
        if self._client is None:
            try:
                self._pool = ConnectionPool.from_url(
                    settings.REDIS_URL,
                    max_connections=settings.REDIS_MAX_CONNECTIONS,
                    decode_responses=True,
                )
                self._client = redis.Redis(connection_pool=self._pool)

                # Test connection
                await self._client.ping()
                logger.info("redis_connected", url=settings.REDIS_URL)
            except Exception as e:
                logger.error("redis_connection_failed", error=str(e))
                self._client = None

    async def disconnect(self):
        """Desconecta do Redis"""
        if self._client:
            await self._client.close()
            if self._pool:
                await self._pool.disconnect()
            self._client = None
            self._pool = None
            logger.info("redis_disconnected")

    @property
    def is_connected(self) -> bool:
        """Verifica se esta conectado"""
        return self._client is not None

    async def get(self, key: str) -> Optional[Any]:
        """
        Obtem valor do cache.

        Args:
            key: Chave do cache

        Returns:
            Valor deserializado ou None se nao existir
        """
        if not self._client:
            return None

        try:
            value = await self._client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.warning("cache_get_error", key=key, error=str(e))
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[Union[int, timedelta]] = None,
    ) -> bool:
        """
        Define valor no cache.

        Args:
            key: Chave do cache
            value: Valor a ser armazenado (sera serializado como JSON)
            ttl: Tempo de vida em segundos ou timedelta

        Returns:
            True se sucesso, False caso contrario
        """
        if not self._client:
            return False

        try:
            serialized = json.dumps(value, default=str)

            if ttl is None:
                ttl = settings.CACHE_TTL_SECONDS
            elif isinstance(ttl, timedelta):
                ttl = int(ttl.total_seconds())

            await self._client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning("cache_set_error", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """
        Remove valor do cache.

        Args:
            key: Chave do cache

        Returns:
            True se sucesso
        """
        if not self._client:
            return False

        try:
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.warning("cache_delete_error", key=key, error=str(e))
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Remove todas as chaves que correspondem ao pattern.

        Args:
            pattern: Padrao de chave (ex: "user:*")

        Returns:
            Numero de chaves removidas
        """
        if not self._client:
            return 0

        try:
            count = 0
            async for key in self._client.scan_iter(match=pattern):
                await self._client.delete(key)
                count += 1
            return count
        except Exception as e:
            logger.warning("cache_delete_pattern_error", pattern=pattern, error=str(e))
            return 0

    async def exists(self, key: str) -> bool:
        """Verifica se a chave existe"""
        if not self._client:
            return False

        try:
            return await self._client.exists(key) > 0
        except Exception:
            return False

    async def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """Incrementa valor numerico"""
        if not self._client:
            return None

        try:
            return await self._client.incr(key, amount)
        except Exception as e:
            logger.warning("cache_incr_error", key=key, error=str(e))
            return None

    async def expire(self, key: str, ttl: int) -> bool:
        """Define TTL para uma chave existente"""
        if not self._client:
            return False

        try:
            return await self._client.expire(key, ttl)
        except Exception:
            return False


# Singleton instance
cache = RedisCache()


def cache_key(*parts: str) -> str:
    """
    Helper para criar chaves de cache padronizadas.

    Usage:
        key = cache_key("user", str(user_id), "profile")
        # Returns: "conecta:user:123:profile"
    """
    return f"conecta:{':'.join(parts)}"
