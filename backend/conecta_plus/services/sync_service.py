"""
Serviço de Sincronização com App Simples
Webhook para notificar mudanças de condomínios
"""

import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

import httpx
from fastapi import HTTPException

from app.config import settings
from app.models.tenant import Tenant
from app.core.logger import get_logger

logger = get_logger(__name__)


class SyncService:
    """
    Serviço responsável por sincronizar dados do Supersistema
    com o App Simples via webhooks HTTP.

    Funcionalidades:
    1. Sincronização de condomínios (create, update, delete)
    2. Retry automático em caso de falha
    3. Logs detalhados de todas as operações
    4. Fallback para queue em caso de falha persistente
    """

    def __init__(self):
        self.app_simples_url = getattr(settings, 'APP_SIMPLES_API_URL', 'http://localhost:8002')
        self.sync_api_key = getattr(settings, 'SYNC_API_KEY', 'default-sync-key-change-in-production')
        self.timeout = getattr(settings, 'SYNC_TIMEOUT_SECONDS', 10.0)
        self.max_retries = getattr(settings, 'SYNC_MAX_RETRIES', 3)
        self.retry_delay = getattr(settings, 'SYNC_RETRY_DELAY_SECONDS', 2.0)

    async def sync_tenant_to_app(
        self,
        tenant: Tenant,
        action: str = "create"
    ) -> bool:
        """
        Sincroniza dados de tenant com App Simples.

        Args:
            tenant: Instância do modelo Tenant
            action: Ação realizada ("create", "update", "delete")

        Returns:
            bool: True se sincronização foi bem-sucedida

        Actions disponíveis:
        - create: Novo condomínio criado
        - update: Condomínio atualizado
        - delete: Condomínio desativado
        """

        if action not in ["create", "update", "delete"]:
            logger.error(f"Ação de sincronização inválida: {action}")
            return False

        # Preparar payload
        payload = self._prepare_tenant_payload(tenant, action)

        # Tentar sincronização com retry
        success = await self._send_webhook_with_retry(
            endpoint="/api/sync/tenant",
            payload=payload,
            action=action,
            tenant_id=tenant.id
        )

        if success:
            logger.info(
                f"tenant_sync_success",
                tenant_id=tenant.id,
                tenant_nome=tenant.nome,
                action=action,
                app_url=self.app_simples_url
            )
        else:
            logger.error(
                f"tenant_sync_failed",
                tenant_id=tenant.id,
                tenant_nome=tenant.nome,
                action=action,
                app_url=self.app_simples_url
            )

            # TODO: Em produção, adicionar à queue para retry posterior
            await self._add_to_retry_queue(tenant, action)

        return success

    def _prepare_tenant_payload(self, tenant: Tenant, action: str) -> Dict[str, Any]:
        """
        Prepara payload para sincronização.
        Inclui apenas dados necessários para o App Simples.
        """

        # Para delete, enviar apenas dados mínimos
        if action == "delete":
            return {
                "action": action,
                "tenant": {
                    "id": tenant.id,
                    "nome": tenant.nome,
                    "ativo": False
                },
                "timestamp": datetime.utcnow().isoformat(),
                "source": "supersistema"
            }

        # Para create/update, enviar dados completos
        tenant_data = {
            "id": tenant.id,
            "nome": tenant.nome,
            "endereco": tenant.endereco,
            "bairro": tenant.bairro,
            "cidade": tenant.cidade,
            "estado": tenant.estado,
            "cep": tenant.cep,
            "telefone": tenant.telefone,
            "email": tenant.email,
            "logo_url": tenant.logo_url,

            # Estrutura dinâmica
            "tipo_estrutura": tenant.tipo_estrutura,
            "nomenclatura": tenant.nomenclatura or {},
            "agrupadores": tenant.agrupadores or [],

            # Configurações para o app
            "areas_comuns": tenant.areas_comuns or [],
            "funcionalidades": tenant.funcionalidades or {},
            "config_seguranca": tenant.config_seguranca or {},

            # Status
            "ativo": tenant.ativo,
            "plano": tenant.plano,

            # Metadados
            "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
            "updated_at": tenant.updated_at.isoformat() if tenant.updated_at else None
        }

        return {
            "action": action,
            "tenant": tenant_data,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "supersistema"
        }

    async def _send_webhook_with_retry(
        self,
        endpoint: str,
        payload: Dict[str, Any],
        action: str,
        tenant_id: str
    ) -> bool:
        """
        Envia webhook com retry automático em caso de falha.
        """

        url = f"{self.app_simples_url.rstrip('/')}{endpoint}"
        headers = {
            "X-Sync-Key": self.sync_api_key,
            "Content-Type": "application/json",
            "User-Agent": "ConectaPlus-Supersistema/1.0"
        }

        for attempt in range(1, self.max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        url=url,
                        json=payload,
                        headers=headers,
                        timeout=self.timeout
                    )

                    if response.status_code == 200:
                        logger.info(
                            "webhook_success",
                            tenant_id=tenant_id,
                            action=action,
                            attempt=attempt,
                            status_code=response.status_code,
                            response_time_ms=response.elapsed.total_seconds() * 1000
                        )
                        return True

                    elif response.status_code == 404:
                        # Endpoint não existe - não vale a pena retry
                        logger.error(
                            "webhook_endpoint_not_found",
                            tenant_id=tenant_id,
                            url=url,
                            status_code=response.status_code
                        )
                        return False

                    elif response.status_code == 403:
                        # Chave de API inválida - não vale a pena retry
                        logger.error(
                            "webhook_authentication_failed",
                            tenant_id=tenant_id,
                            status_code=response.status_code
                        )
                        return False

                    else:
                        # Erro temporário - tentar novamente
                        logger.warning(
                            "webhook_temporary_error",
                            tenant_id=tenant_id,
                            action=action,
                            attempt=attempt,
                            status_code=response.status_code,
                            response_text=response.text[:500]  # Primeiros 500 chars
                        )

            except httpx.TimeoutException:
                logger.warning(
                    "webhook_timeout",
                    tenant_id=tenant_id,
                    action=action,
                    attempt=attempt,
                    timeout_seconds=self.timeout,
                    url=url
                )

            except httpx.ConnectError:
                logger.warning(
                    "webhook_connection_error",
                    tenant_id=tenant_id,
                    action=action,
                    attempt=attempt,
                    url=url
                )

            except Exception as e:
                logger.error(
                    "webhook_unexpected_error",
                    tenant_id=tenant_id,
                    action=action,
                    attempt=attempt,
                    error=str(e),
                    error_type=type(e).__name__
                )

            # Aguardar antes da próxima tentativa (exceto na última)
            if attempt < self.max_retries:
                await asyncio.sleep(self.retry_delay * attempt)  # Backoff exponencial

        # Todas as tentativas falharam
        logger.error(
            "webhook_all_attempts_failed",
            tenant_id=tenant_id,
            action=action,
            max_retries=self.max_retries,
            url=url
        )

        return False

    async def _add_to_retry_queue(self, tenant: Tenant, action: str):
        """
        Adiciona operação falha à queue para retry posterior.
        TODO: Implementar com Redis/RabbitMQ/SQS em produção.
        """

        retry_data = {
            "tenant_id": tenant.id,
            "tenant_nome": tenant.nome,
            "action": action,
            "failed_at": datetime.utcnow().isoformat(),
            "attempts": 0,
            "max_attempts": 10,  # Mais tentativas para queue
            "next_retry": datetime.utcnow().isoformat()
        }

        logger.info(
            "sync_added_to_retry_queue",
            **retry_data
        )

        # TODO: Implementar queue real
        # await redis.lpush("sync_retry_queue", json.dumps(retry_data))

    async def health_check(self) -> Dict[str, Any]:
        """
        Verifica se o App Simples está acessível.
        Usado para monitoramento da integração.
        """

        url = f"{self.app_simples_url.rstrip('/')}/health"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url=url,
                    timeout=5.0
                )

                return {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "status_code": response.status_code,
                    "response_time_ms": response.elapsed.total_seconds() * 1000,
                    "app_url": self.app_simples_url,
                    "timestamp": datetime.utcnow().isoformat()
                }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "error_type": type(e).__name__,
                "app_url": self.app_simples_url,
                "timestamp": datetime.utcnow().isoformat()
            }

    async def get_sync_stats(self) -> Dict[str, Any]:
        """
        Retorna estatísticas de sincronização.
        TODO: Implementar com métricas reais.
        """

        return {
            "app_simples_url": self.app_simples_url,
            "timeout_seconds": self.timeout,
            "max_retries": self.max_retries,
            "retry_delay_seconds": self.retry_delay,
            # TODO: Adicionar métricas reais do Redis/Queue
            "total_syncs_today": 0,
            "successful_syncs_today": 0,
            "failed_syncs_today": 0,
            "retry_queue_size": 0
        }


# ══════════════════════════════════════════════════════════════
# ENDPOINT DE RECEBIMENTO PARA APP SIMPLES
# ══════════════════════════════════════════════════════════════

# Este código deve ser implementado no App Simples:

"""
# No App Simples: api_sync.py

from fastapi import APIRouter, Header, HTTPException
import json
import os

router = APIRouter()

SYNC_API_KEY = os.getenv("SYNC_API_KEY", "default-sync-key-change-in-production")

@router.post("/api/sync/tenant")
async def receber_sync_tenant(
    data: dict,
    x_sync_key: str = Header(...)
):
    '''Recebe sincronização de tenant do Supersistema'''

    if x_sync_key != SYNC_API_KEY:
        raise HTTPException(403, "Chave de sincronização inválida")

    action = data.get("action")
    tenant_data = data.get("tenant")
    timestamp = data.get("timestamp")

    print(f"[SYNC] Recebido: {action} para tenant {tenant_data.get('nome')} às {timestamp}")

    if action == "create":
        # Cria/atualiza arquivo JSON do condomínio
        save_condominio(tenant_data)
        print(f"[SYNC] Condomínio {tenant_data['nome']} criado/atualizado")

    elif action == "update":
        # Atualiza arquivo JSON existente
        update_condominio(tenant_data)
        print(f"[SYNC] Condomínio {tenant_data['nome']} atualizado")

    elif action == "delete":
        # Marca como inativo
        deactivate_condominio(tenant_data["id"])
        print(f"[SYNC] Condomínio {tenant_data['nome']} desativado")

    return {"success": True, "message": "Sincronização realizada com sucesso"}

def save_condominio(tenant_data):
    '''Salva dados do condomínio em arquivo JSON'''
    filename = f"data/condominios/{tenant_data['id']}.json"
    os.makedirs(os.path.dirname(filename), exist_ok=True)

    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(tenant_data, f, ensure_ascii=False, indent=2)

def update_condominio(tenant_data):
    '''Atualiza dados existentes'''
    save_condominio(tenant_data)  # Mesmo comportamento para JSON

def deactivate_condominio(tenant_id):
    '''Marca condomínio como inativo'''
    filename = f"data/condominios/{tenant_id}.json"

    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)

        data['ativo'] = False
        data['deactivated_at'] = datetime.utcnow().isoformat()

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
"""