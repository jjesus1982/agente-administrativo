"""
Middleware de Rate Limiting com Redis
Suporta múltiplos workers/processos em produção
"""

import time
from typing import Callable, Optional, Tuple

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.core.logger import get_logger
from app.services.cache import cache

logger = get_logger(__name__)


class RedisRateLimiter:
    """Rate limiter usando Redis (produção - suporta múltiplos workers)"""

    async def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        """
        Verifica se a requisição é permitida usando sliding window.

        Args:
            key: Identificador único (ex: "rate:general:192.168.1.1")
            max_requests: Número máximo de requisições permitidas
            window_seconds: Janela de tempo em segundos

        Returns:
            Tuple[is_allowed, remaining, reset_time]
        """
        if not cache.is_connected:
            # Fallback: permitir se Redis não estiver disponível
            logger.warning("rate_limiter_redis_unavailable", key=key)
            return True, max_requests, int(time.time() + window_seconds)

        now = time.time()
        window_start = now - window_seconds
        reset_time = int(now + window_seconds)

        try:
            # Usar pipeline para operações atômicas
            client = cache._client
            pipe = client.pipeline()

            # Remover entradas antigas e contar atuais
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            pipe.zadd(key, {str(now): now})
            pipe.expire(key, window_seconds + 1)

            results = await pipe.execute()
            current_count = results[1]  # zcard result

            remaining = max(0, max_requests - current_count - 1)

            if current_count >= max_requests:
                # Remover a entrada que acabamos de adicionar
                await client.zrem(key, str(now))
                return False, 0, reset_time

            return True, remaining, reset_time

        except Exception as e:
            logger.error("rate_limiter_error", key=key, error=str(e))
            # Em caso de erro, permitir a requisição
            return True, max_requests, reset_time

    async def get_usage(self, key: str, window_seconds: int) -> int:
        """Retorna o número de requisições na janela atual"""
        if not cache.is_connected:
            return 0

        try:
            now = time.time()
            window_start = now - window_seconds
            client = cache._client
            return await client.zcount(key, window_start, now)
        except Exception:
            return 0


class InMemoryRateLimiter:
    """Rate limiter em memória (fallback/desenvolvimento)"""

    def __init__(self):
        self._requests: dict = {}

    async def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int]:
        now = time.time()
        window_start = now - window_seconds

        if key not in self._requests:
            self._requests[key] = []

        # Limpar requisições antigas
        self._requests[key] = [ts for ts in self._requests[key] if ts > window_start]

        current_count = len(self._requests[key])
        remaining = max(0, max_requests - current_count)
        reset_time = int(window_start + window_seconds)

        if current_count >= max_requests:
            return False, 0, reset_time

        self._requests[key].append(now)
        return True, remaining - 1, reset_time


# Instâncias globais
redis_rate_limiter = RedisRateLimiter()
memory_rate_limiter = InMemoryRateLimiter()


async def get_rate_limiter():
    """Retorna o rate limiter apropriado baseado na disponibilidade do Redis"""
    if cache.is_connected:
        return redis_rate_limiter
    return memory_rate_limiter


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware para rate limiting com suporte a Redis"""

    # Paths que requerem limites mais restritos
    AUTH_PATHS = ["/api/v1/auth/login", "/api/v1/auth/token", "/api/v1/auth/register"]

    # Paths que não devem ter rate limit
    EXEMPT_PATHS = [
        "/health",
        "/health/ready",
        "/health/live",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/",
        "/metrics",
        "/favicon.ico",
    ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Verificar se rate limiting está habilitado
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path

        # Paths isentos
        if path in self.EXEMPT_PATHS or path.startswith("/static"):
            return await call_next(request)

        # Obter IP do cliente
        client_ip = self._get_client_ip(request)

        # Determinar limites baseado no path
        if any(path.startswith(auth_path) for auth_path in self.AUTH_PATHS):
            max_requests = settings.RATE_LIMIT_AUTH_REQUESTS
            window_seconds = settings.RATE_LIMIT_AUTH_WINDOW
            key = f"rate:auth:{client_ip}"
        else:
            max_requests = settings.RATE_LIMIT_REQUESTS
            window_seconds = settings.RATE_LIMIT_WINDOW
            key = f"rate:general:{client_ip}"

        # Obter rate limiter apropriado
        limiter = await get_rate_limiter()

        # Verificar rate limit
        is_allowed, remaining, reset_time = await limiter.is_allowed(key, max_requests, window_seconds)

        if not is_allowed:
            retry_after = max(1, reset_time - int(time.time()))
            logger.warning(
                "rate_limit_exceeded",
                client_ip=client_ip,
                path=path,
                key=key,
                limiter_type="redis" if cache.is_connected else "memory",
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Muitas requisições. Tente novamente mais tarde.",
                    "retry_after": retry_after,
                },
                headers={
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(reset_time),
                    "Retry-After": str(retry_after),
                },
            )

        # Processar requisição
        response = await call_next(request)

        # Adicionar headers de rate limit
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Obtém o IP real do cliente, considerando proxies"""
        # Verificar headers de proxy (em ordem de prioridade)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip

        return request.client.host if request.client else "unknown"
