"""
Middleware de Segurança Multi-Tenant
Garante isolamento total entre condomínios
"""

import re
import time
from typing import Callable, Optional

from fastapi import Request, Response, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_token as decode_jwt
from app.core.logger import get_logger

logger = get_logger(__name__)


class TenantSecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware que garante isolamento total entre condomínios.
    Executa em TODA requisição autenticada.

    Funcionalidades:
    1. Extrai e valida JWT token
    2. Injeta tenant_id no request state
    3. Verifica tentativas de acesso cruzado entre tenants
    4. Loga eventos de segurança
    5. Bloqueia acessos não autorizados
    """

    def __init__(self, app, log_security_events: bool = True):
        super().__init__(app)
        self.log_security_events = log_security_events

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Processa cada requisição verificando segurança multi-tenant"""

        # 1. Rotas públicas não passam por verificação
        if self._is_public_route(request.url.path):
            return await call_next(request)

        # 2. Extrair e validar token
        token = self._extract_token(request)
        if not token:
            raise HTTPException(401, "Token de autenticação não fornecido")

        try:
            payload = decode_jwt(token)
        except Exception as e:
            logger.warning(f"Token inválido: {str(e)}", extra={
                "ip": self._get_client_ip(request),
                "path": request.url.path
            })
            raise HTTPException(401, "Token de autenticação inválido")

        # 3. Injetar dados do usuário no request state
        user_tenant_id = payload.get("tenant_id")
        if not user_tenant_id:
            logger.error("Usuário sem tenant associado", extra={
                "user_id": payload.get("user_id"),
                "ip": self._get_client_ip(request)
            })
            raise HTTPException(403, "Usuário sem condomínio associado")

        # Injetar dados no state para uso nos endpoints
        request.state.tenant_id = user_tenant_id
        request.state.user_id = payload.get("user_id")
        request.state.user_role = payload.get("role")
        request.state.user_email = payload.get("email")

        # 4. Verificar tentativa de acesso a outro tenant
        path_tenant = self._extract_tenant_from_path(request.url.path)
        if path_tenant and path_tenant != user_tenant_id:
            # 🚨 ALERTA DE SEGURANÇA CRÍTICO
            await self._log_security_violation(
                event_type="CROSS_TENANT_ACCESS_ATTEMPT",
                user_id=payload.get("user_id"),
                user_email=payload.get("email"),
                user_tenant=user_tenant_id,
                attempted_tenant=path_tenant,
                path=request.url.path,
                ip=self._get_client_ip(request),
                user_agent=request.headers.get("user-agent", "")
            )
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "ACESSO_NEGADO",
                    "message": "Acesso negado a este condomínio",
                    "code": "CROSS_TENANT_ACCESS"
                }
            )

        # 5. Verificar se tenant está ativo
        # TODO: Implementar cache de tenants ativos para performance
        # if not await self._is_tenant_active(user_tenant_id):
        #     raise HTTPException(403, "Condomínio inativo ou expirado")

        # 6. Continuar com a requisição
        start_time = time.time()

        try:
            response = await call_next(request)

            # Log de requisição bem-sucedida
            if self.log_security_events:
                process_time = time.time() - start_time
                logger.info("tenant_request_success", extra={
                    "tenant_id": user_tenant_id,
                    "user_id": payload.get("user_id"),
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "process_time": f"{process_time:.4f}s",
                    "ip": self._get_client_ip(request)
                })

            return response

        except Exception as e:
            # Log de erro durante processamento
            process_time = time.time() - start_time
            logger.error("tenant_request_error", extra={
                "tenant_id": user_tenant_id,
                "user_id": payload.get("user_id"),
                "method": request.method,
                "path": request.url.path,
                "error": str(e),
                "process_time": f"{process_time:.4f}s",
                "ip": self._get_client_ip(request)
            })
            raise

    def _is_public_route(self, path: str) -> bool:
        """Verifica se a rota é pública (não requer autenticação)"""
        public_routes = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/api/v1/auth/forgot-password",
            "/api/v1/public/",
            "/health",
            "/health/ready",
            "/health/live",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/metrics",
            "/favicon.ico"
        ]

        return any(path.startswith(route) for route in public_routes)

    def _extract_token(self, request: Request) -> Optional[str]:
        """Extrai token JWT do header Authorization"""
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            return auth_header.replace("Bearer ", "")

        return None

    def _extract_tenant_from_path(self, path: str) -> Optional[str]:
        """
        Extrai tenant_id da URL se presente.
        Formato esperado: /api/v1/tenant/{tenant_id}/...
        """
        match = re.search(r'/tenant/([a-f0-9-]{36})/', path)
        return match.group(1) if match else None

    def _get_client_ip(self, request: Request) -> str:
        """Obtém IP real do cliente considerando proxies"""
        # Verificar headers de proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback para IP direto
        if request.client:
            return request.client.host

        return "unknown"

    async def _log_security_violation(self, event_type: str, **details):
        """
        Loga violações de segurança para análise e alertas.
        Em produção, deve integrar com SIEM ou sistema de alertas.
        """
        if not self.log_security_events:
            return

        security_event = {
            "event_type": event_type,
            "timestamp": time.time(),
            "severity": "CRITICAL" if "CROSS_TENANT" in event_type else "HIGH",
            **details
        }

        # Log crítico para monitoramento
        logger.critical(f"SECURITY_VIOLATION: {event_type}", extra=security_event)

        # TODO: Em produção, enviar para:
        # - Sistema de alertas em tempo real
        # - SIEM/Security monitoring
        # - Webhook para Slack/Discord
        # - Email para equipe de segurança

    # Métodos auxiliares para verificações futuras

    async def _is_tenant_active(self, tenant_id: str) -> bool:
        """
        Verifica se tenant está ativo e não expirado.
        TODO: Implementar cache Redis para performance.
        """
        # TODO: Implementar verificação cached
        return True

    def _is_rate_limited(self, user_id: str, tenant_id: str) -> bool:
        """
        Verifica rate limiting por usuário/tenant.
        TODO: Implementar com Redis.
        """
        # TODO: Implementar rate limiting específico
        return False

    def _should_audit_request(self, path: str, method: str) -> bool:
        """Determina se deve auditar esta requisição"""
        # Audita operações críticas
        critical_paths = [
            "/users/",
            "/tenant/",
            "/admin/",
            "/financeiro/"
        ]

        return any(critical_path in path for critical_path in critical_paths)


# Função helper para uso em endpoints
def get_current_tenant_id(request: Request) -> str:
    """
    Helper function para obter tenant_id do request state.
    Uso nos endpoints: tenant_id = get_current_tenant_id(request)
    """
    if not hasattr(request.state, 'tenant_id'):
        raise HTTPException(500, "Tenant ID não encontrado no request state")

    return request.state.tenant_id


def get_current_user_context(request: Request) -> dict:
    """
    Helper function para obter contexto completo do usuário.
    Retorna: {tenant_id, user_id, user_role, user_email}
    """
    state = request.state

    if not hasattr(state, 'tenant_id'):
        raise HTTPException(500, "Contexto de usuário não encontrado")

    return {
        "tenant_id": state.tenant_id,
        "user_id": getattr(state, 'user_id', None),
        "user_role": getattr(state, 'user_role', None),
        "user_email": getattr(state, 'user_email', None)
    }


def require_tenant_permission(allowed_roles: list = None):
    """
    Decorator para endpoints que requerem permissões específicas.
    Uso: @require_tenant_permission(['admin', 'sindico'])
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # TODO: Implementar verificação de permissões
            return func(*args, **kwargs)
        return wrapper
    return decorator