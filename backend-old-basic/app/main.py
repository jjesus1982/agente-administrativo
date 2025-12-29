"""
Conecta Plus - API Backend
Portal de Gestao Condominial
"""

import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1.router import api_router
from app.config import settings
from app.core.logger import get_logger
from app.database import check_db_connection, close_db_connections, init_db
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.tenant_security import TenantSecurityMiddleware
from app.services.cache import cache

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events - startup and shutdown"""
    # Startup
    logger.info(
        "application_starting",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )

    await init_db()
    await cache.connect()

    logger.info("application_started", message="Conecta Plus API started successfully!")

    yield

    # Shutdown
    logger.info("application_stopping")
    await cache.disconnect()
    await close_db_connections()
    logger.info("application_stopped", message="Conecta Plus API shutdown complete!")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="""
## Conecta Plus API

API do Portal de Gestao Condominial Conecta Plus.

### Funcionalidades
- Gestao de condominios (multi-tenant)
- Gestao de moradores e unidades
- Controle de visitantes e acesso
- Reserva de areas comuns
- Manutencao e chamados
- Comunicados e enquetes
- Gestao financeira (boletos e pagamentos)
- Relatorios e dashboard

### Autenticacao
A API usa autenticacao JWT. Obtenha um token via `/api/v1/auth/login`.
    """,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    lifespan=lifespan,
    license_info={
        "name": "Proprietary",
    },
)

# =============================================================================
# MIDDLEWARES (ordem importa - ultimo adicionado = primeiro executado)
# =============================================================================

# GZip compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Trusted hosts (proteção contra host header attacks)
if settings.is_production:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.TRUSTED_HOSTS,
    )

# CORS - configuracao mais restritiva
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Cache-Control",
        "X-File-Name",
        "Idempotency-Key"
    ],
    max_age=settings.CORS_MAX_AGE,
)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Tenant security (multi-tenant isolation)
app.add_middleware(TenantSecurityMiddleware, log_security_events=True)

# Rate limiting
app.add_middleware(RateLimitMiddleware)

# Logging (primeiro a executar, ultimo a ser adicionado)
app.add_middleware(LoggingMiddleware)


# =============================================================================
# EXCEPTION HANDLERS
# =============================================================================


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handler global para exceções não tratadas"""
    request_id = getattr(request.state, "request_id", "unknown")

    logger.error(
        "unhandled_exception",
        request_id=request_id,
        path=request.url.path,
        method=request.method,
        error=str(exc),
        error_type=type(exc).__name__,
    )

    # Em desenvolvimento, retorna detalhes do erro
    if settings.is_development:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Erro interno do servidor",
                "error": str(exc),
                "type": type(exc).__name__,
                "request_id": request_id,
            },
        )

    # Em producao, retorna mensagem generica
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Erro interno do servidor",
            "request_id": request_id,
        },
    )


# =============================================================================
# STATIC FILES
# =============================================================================

# Servir arquivos de upload
from app.config import UPLOAD_BASE_DIR

os.makedirs(UPLOAD_BASE_DIR, exist_ok=True)
if os.path.exists(UPLOAD_BASE_DIR):
    app.mount("/uploads", StaticFiles(directory=UPLOAD_BASE_DIR), name="uploads")


# =============================================================================
# ROUTERS
# =============================================================================

app.include_router(api_router, prefix=settings.API_PREFIX)


# =============================================================================
# HEALTH CHECK ENDPOINTS
# =============================================================================


@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check basico.
    Retorna status da aplicacao.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/health/ready", tags=["Health"])
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check - verifica se a aplicacao esta pronta para receber trafego.
    Inclui verificacao de conexao com banco de dados.
    """
    db_healthy = await check_db_connection()

    if not db_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "checks": {
                    "database": "unhealthy",
                },
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    return {
        "status": "healthy",
        "checks": {
            "database": "healthy",
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/health/live", tags=["Health"])
async def liveness_check() -> Dict[str, Any]:
    """
    Liveness check - verifica se a aplicacao esta viva.
    Usado por Kubernetes para decidir se deve reiniciar o container.
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["Root"])
async def root() -> Dict[str, str]:
    """Endpoint raiz com informacoes basicas da API"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.is_development else "disabled",
        "health": "/health",
    }


# =============================================================================
# PROMETHEUS METRICS
# =============================================================================

# Instrumentador Prometheus com metricas customizadas
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/health", "/health/ready", "/health/live", "/metrics"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="http_requests_inprogress",
    inprogress_labels=True,
)

# Instrumenta a aplicacao e expoe endpoint /metrics
instrumentator.instrument(app).expose(app, include_in_schema=False)
