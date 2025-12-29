"""
API Endpoints para Monitoramento de Sincronização
Controle e estatísticas da integração App Simples
"""

from typing import Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.services.sync_service import SyncService
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/admin/sync", tags=["Admin - Sincronização"])

# Serviço de sincronização
sync_service = SyncService()


@router.get("/health")
async def verificar_integracao_app(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifica se o App Simples está acessível e funcionando.

    Usado para monitoramento da integração.
    Acesso: Apenas admins
    """

    # Verificar permissões de admin
    if current_user.role < 4:
        raise HTTPException(403, "Acesso negado. Apenas administradores.")

    try:
        # Verificar saúde da integração
        health_result = await sync_service.health_check()

        # Log do check
        logger.info(
            "integration_health_check",
            status=health_result["status"],
            checked_by=current_user.id,
            response_time=health_result.get("response_time_ms", 0)
        )

        return health_result

    except Exception as e:
        logger.error(
            "error_checking_integration_health",
            error=str(e),
            checked_by=current_user.id
        )
        raise HTTPException(500, "Erro ao verificar saúde da integração")


@router.get("/stats")
async def obter_estatisticas_sync(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém estatísticas detalhadas de sincronização.

    Inclui:
    - Configurações atuais
    - Métricas de performance
    - Status da queue (futuro)
    - Histórico de erros (futuro)

    Acesso: Apenas admins
    """

    if current_user.role < 4:
        raise HTTPException(403, "Acesso negado")

    try:
        # Obter estatísticas do sync service
        stats = await sync_service.get_sync_stats()

        # Adicionar metadados
        stats.update({
            "generated_at": datetime.utcnow().isoformat(),
            "generated_by": current_user.email,
            "system_status": "operational"  # TODO: calcular baseado em métricas reais
        })

        logger.info(
            "sync_stats_generated",
            requested_by=current_user.id
        )

        return stats

    except Exception as e:
        logger.error(
            "error_getting_sync_stats",
            error=str(e),
            requested_by=current_user.id
        )
        raise HTTPException(500, "Erro ao obter estatísticas de sincronização")


@router.post("/test-connection")
async def testar_conexao_app(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Testa conectividade com App Simples.

    Envia um payload de teste para verificar se a integração está funcionando.
    Útil para diagnóstico durante configuração inicial ou troubleshooting.

    Acesso: Apenas super admins
    """

    if current_user.role < 5:  # Apenas super admins
        raise HTTPException(403, "Acesso negado. Apenas super administradores.")

    try:
        # Payload de teste
        test_payload = {
            "action": "test",
            "tenant": {
                "id": "test-tenant-id",
                "nome": "Teste de Conectividade",
                "ativo": True
            },
            "timestamp": datetime.utcnow().isoformat(),
            "source": "supersistema-test",
            "test_mode": True
        }

        # Tentar envio
        success = await sync_service._send_webhook_with_retry(
            endpoint="/api/sync/tenant",
            payload=test_payload,
            action="test",
            tenant_id="test-tenant-id"
        )

        result = {
            "test_successful": success,
            "tested_at": datetime.utcnow().isoformat(),
            "tested_by": current_user.email,
            "app_url": sync_service.app_simples_url,
            "payload_sent": test_payload
        }

        if success:
            logger.info(
                "connection_test_successful",
                tested_by=current_user.id,
                app_url=sync_service.app_simples_url
            )
            result["message"] = "Teste de conectividade bem-sucedido! 🎉"
        else:
            logger.warning(
                "connection_test_failed",
                tested_by=current_user.id,
                app_url=sync_service.app_simples_url
            )
            result["message"] = "Teste de conectividade falhou. Verifique configurações. ⚠️"

        return result

    except Exception as e:
        logger.error(
            "error_testing_connection",
            error=str(e),
            tested_by=current_user.id
        )
        raise HTTPException(500, f"Erro durante teste de conectividade: {str(e)}")


@router.get("/config")
async def obter_configuracao_sync(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Obtém configurações atuais de sincronização.

    Retorna configurações não-sensíveis para diagnóstico.
    Acesso: Apenas admins
    """

    if current_user.role < 4:
        raise HTTPException(403, "Acesso negado")

    config = {
        "app_simples_url": sync_service.app_simples_url,
        "timeout_seconds": sync_service.timeout,
        "max_retries": sync_service.max_retries,
        "retry_delay_seconds": sync_service.retry_delay,
        "sync_enabled": True,  # TODO: adicionar flag de enable/disable
        "last_config_check": datetime.utcnow().isoformat()
    }

    # NÃO retornar chave de API por segurança
    # config["sync_api_key"] = "***HIDDEN***"

    return config


@router.put("/config")
async def atualizar_configuracao_sync(
    config_data: Dict[str, Any],
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza configurações de sincronização.

    CUIDADO: Mudanças podem afetar integração ativa.
    Acesso: Apenas super admins
    """

    if current_user.role < 5:
        raise HTTPException(403, "Acesso negado. Apenas super administradores.")

    try:
        # Validar campos permitidos
        allowed_fields = [
            "timeout",
            "max_retries",
            "retry_delay"
        ]

        updates = {}
        for field, value in config_data.items():
            if field in allowed_fields:
                updates[field] = value

        # Aplicar atualizações ao sync service
        if "timeout" in updates:
            sync_service.timeout = float(updates["timeout"])
        if "max_retries" in updates:
            sync_service.max_retries = int(updates["max_retries"])
        if "retry_delay" in updates:
            sync_service.retry_delay = float(updates["retry_delay"])

        logger.warning(
            "sync_config_updated",
            updated_by=current_user.id,
            updated_fields=list(updates.keys()),
            new_values=updates
        )

        return {
            "message": "Configurações atualizadas com sucesso",
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user.email,
            "changes": updates
        }

    except Exception as e:
        logger.error(
            "error_updating_sync_config",
            error=str(e),
            updated_by=current_user.id
        )
        raise HTTPException(500, "Erro ao atualizar configurações")


@router.get("/retry-queue")
async def obter_fila_retry(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Obtém status da fila de retry de sincronizações falhas.

    TODO: Implementar com Redis ou sistema de queue real.
    Por enquanto, retorna mock data.

    Acesso: Apenas admins
    """

    if current_user.role < 4:
        raise HTTPException(403, "Acesso negado")

    # TODO: Implementar fila real
    mock_queue_data = {
        "queue_size": 0,
        "oldest_item_age_minutes": None,
        "failed_items_last_24h": 0,
        "retry_success_rate_pct": 95.5,
        "queue_status": "healthy",
        "last_processed": None,
        "implementation_status": "pending_redis_integration"
    }

    return mock_queue_data