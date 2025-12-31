"""
Logger Estruturado com Structlog
"""

import logging
import sys
from typing import Any, Optional

import structlog

from conecta_plus.config import settings


def configure_logging():
    """Configura o logging estruturado"""

    # Nivel de log
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Configurar logging padrao
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    # Processadores compartilhados
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    # Processadores para desenvolvimento
    if settings.is_development:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]
    else:
        # Processadores para producao (JSON)
        processors = shared_processors + [
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]

    # Configurar structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: Optional[str] = None) -> structlog.BoundLogger:
    """Retorna um logger estruturado"""
    return structlog.get_logger(name)


def log_with_context(logger: structlog.BoundLogger, level: str, message: str, **kwargs: Any):
    """Helper para log com contexto"""
    log_method = getattr(logger, level, logger.info)
    log_method(message, **kwargs)


# Configurar na importacao
configure_logging()
