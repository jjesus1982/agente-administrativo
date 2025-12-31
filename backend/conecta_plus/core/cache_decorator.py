"""
Cache Decorator for FastAPI Endpoints
Provides easy caching for API responses
"""

import functools
import hashlib
import json
from typing import Callable, Optional, Union

from conecta_plus.core.logger import get_logger
from conecta_plus.services.cache import cache, cache_key

logger = get_logger(__name__)


def cached(
    prefix: str,
    ttl: Optional[int] = 300,
    include_tenant: bool = True,
    include_user: bool = False,
    key_params: Optional[list] = None,
):
    """
    Decorator para cache de endpoints FastAPI.

    Args:
        prefix: Prefixo da chave de cache (ex: "dashboard", "stats")
        ttl: Tempo de vida do cache em segundos (default: 300 = 5 min)
        include_tenant: Se True, inclui tenant_id na chave
        include_user: Se True, inclui user_id na chave (para dados personalizados)
        key_params: Lista de parametros do request para incluir na chave

    Usage:
        @router.get("/dashboard")
        @cached("dashboard", ttl=60)
        async def get_dashboard(
            current_user: User = Depends(get_current_user),
            db: AsyncSession = Depends(get_db)
        ):
            ...

    Note:
        O decorator espera que o endpoint tenha um parametro 'current_user'
        com atributos 'tenant_id' e 'id' quando include_tenant ou include_user
        estao habilitados.
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Tenta buscar do cache
            if not cache.is_connected:
                return await func(*args, **kwargs)

            # Constroi a chave de cache
            key_parts = [prefix]

            # Adiciona tenant se configurado
            current_user = kwargs.get("current_user")
            if include_tenant and current_user:
                tenant_id = getattr(current_user, "tenant_id", None)
                if tenant_id:
                    key_parts.append(f"t:{tenant_id}")

            # Adiciona user se configurado
            if include_user and current_user:
                user_id = getattr(current_user, "id", None)
                if user_id:
                    key_parts.append(f"u:{user_id}")

            # Adiciona parametros especificos
            if key_params:
                for param in key_params:
                    value = kwargs.get(param)
                    if value is not None:
                        if isinstance(value, (dict, list)):
                            value = hashlib.md5(json.dumps(value, sort_keys=True, default=str).encode()).hexdigest()[:8]
                        key_parts.append(f"{param}:{value}")

            final_key = cache_key(*key_parts)

            # Tenta buscar do cache
            try:
                cached_data = await cache.get(final_key)
                if cached_data is not None:
                    logger.debug("cache_hit", key=final_key)
                    return cached_data
            except Exception as e:
                logger.warning("cache_get_failed", key=final_key, error=str(e))

            # Executa a funcao original
            result = await func(*args, **kwargs)

            # Armazena no cache
            try:
                # Converte o resultado para dict se possivel
                if hasattr(result, "model_dump"):
                    cache_value = result.model_dump()
                elif hasattr(result, "dict"):
                    cache_value = result.dict()
                elif isinstance(result, dict):
                    cache_value = result
                elif isinstance(result, list):
                    cache_value = [
                        (
                            item.model_dump()
                            if hasattr(item, "model_dump")
                            else item.dict() if hasattr(item, "dict") else item
                        )
                        for item in result
                    ]
                else:
                    cache_value = result

                await cache.set(final_key, cache_value, ttl=ttl)
                logger.debug("cache_set", key=final_key, ttl=ttl)
            except Exception as e:
                logger.warning("cache_set_failed", key=final_key, error=str(e))

            return result

        return wrapper

    return decorator


async def invalidate_cache(prefix: str, tenant_id: Optional[int] = None):
    """
    Invalida cache por prefixo.

    Args:
        prefix: Prefixo do cache a invalidar
        tenant_id: Se fornecido, invalida apenas para o tenant

    Usage:
        # Invalida todo cache de dashboard
        await invalidate_cache("dashboard")

        # Invalida cache de dashboard de um tenant especifico
        await invalidate_cache("dashboard", tenant_id=123)
    """
    if not cache.is_connected:
        return 0

    if tenant_id:
        pattern = f"conecta:{prefix}:t:{tenant_id}:*"
    else:
        pattern = f"conecta:{prefix}:*"

    count = await cache.delete_pattern(pattern)
    logger.info("cache_invalidated", prefix=prefix, tenant_id=tenant_id, count=count)
    return count


async def invalidate_tenant_cache(tenant_id: int):
    """
    Invalida todo cache de um tenant.

    Args:
        tenant_id: ID do tenant
    """
    if not cache.is_connected:
        return 0

    pattern = f"conecta:*:t:{tenant_id}:*"
    count = await cache.delete_pattern(pattern)
    logger.info("tenant_cache_invalidated", tenant_id=tenant_id, count=count)
    return count
