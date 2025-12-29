"""
Middleware de Logging Estruturado
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logger import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware para logging de todas as requisições"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Gerar ID único para a requisição
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id

        # Capturar informações da requisição
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        query = str(request.query_params) if request.query_params else ""

        # Log da requisição
        logger.info(
            "request_started",
            request_id=request_id,
            method=method,
            path=path,
            query=query,
            client_ip=client_ip,
            user_agent=request.headers.get("user-agent", ""),
        )

        # Processar requisição
        try:
            response = await call_next(request)

            # Calcular tempo de processamento
            process_time = time.time() - start_time

            # Adicionar headers de rastreamento
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.4f}"

            # Log da resposta
            logger.info(
                "request_completed",
                request_id=request_id,
                method=method,
                path=path,
                status_code=response.status_code,
                process_time=f"{process_time:.4f}s",
                client_ip=client_ip,
            )

            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                "request_failed",
                request_id=request_id,
                method=method,
                path=path,
                error=str(e),
                process_time=f"{process_time:.4f}s",
                client_ip=client_ip,
            )
            raise
