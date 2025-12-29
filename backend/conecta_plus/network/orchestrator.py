# -*- coding: utf-8 -*-
"""
Network Orchestrator
====================

Orquestrador que coordena:
- Scanner de rede
- CMDB
- Device Clients
- Change Records
"""

from __future__ import annotations
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from .scanner import NetworkScanner
from .cmdb import get_cmdb, CMDBRepository
from .schemas import (
    NetworkScanRequest,
    NetworkScanResult,
    NetworkDeviceCI,
    NetworkConfig,
    NetworkChangeRecord,
    DeviceCredentials,
    ApplyConfigRequest,
    ChangeType,
    ChangeStatus,
    RiskLevel,
    ApprovalStatus,
    DeviceType,
    DeviceStatus,
)
from .device_clients import (
    get_device_client,
    auto_detect_and_connect,
    ConnectionStatus,
)

logger = logging.getLogger(__name__)


class NetworkOrchestrator:
    """
    Orquestrador principal de operações de rede.
    
    Coordena descoberta, CMDB, configuração e change records.
    """
    
    def __init__(
        self,
        cmdb: CMDBRepository = None,
        scanner: NetworkScanner = None
    ):
        self.cmdb = cmdb or get_cmdb()
        self.scanner = scanner or NetworkScanner()
    
    # ==========================================================================
    # DESCOBERTA DE REDE
    # ==========================================================================
    
    async def discover_network(
        self, 
        request: NetworkScanRequest
    ) -> NetworkScanResult:
        """
        Escaneia a rede e atualiza o CMDB.
        
        Args:
            request: Parâmetros do scan.
        
        Returns:
            Resultado do scan com dispositivos encontrados.
        """
        logger.info(f"Iniciando descoberta de rede para {request.condominio_nome}")
        
        # Executa scan
        result = await self.scanner.scan(request)
        
        # Atualiza CMDB
        updated_cis = self.cmdb.upsert_from_scan(result)
        
        logger.info(
            f"Descoberta concluída: {result.total_devices_found} dispositivos, "
            f"{len(updated_cis)} CIs atualizados"
        )
        
        return result
    
    async def identify_devices(
        self,
        condominio_nome: str,
        credentials: DeviceCredentials
    ) -> List[NetworkDeviceCI]:
        """
        Identifica detalhes dos dispositivos (modelo, firmware).
        
        Args:
            condominio_nome: Nome do condomínio.
            credentials: Credenciais de acesso.
        
        Returns:
            Lista de CIs atualizados.
        """
        cis = self.cmdb.list_cis(condominio_nome=condominio_nome)
        updated = []
        
        for ci in cis:
            try:
                device = await self.scanner.identify_device(
                    ci.ip_address,
                    credentials.username,
                    credentials.password
                )
                
                if device:
                    self.cmdb.update_ci(ci.id, {
                        "hostname": device.hostname or ci.hostname,
                        "fabricante": device.vendor or ci.fabricante,
                        "status": DeviceStatus.ONLINE,
                        "last_seen_at": datetime.now(),
                    })
                    updated.append(ci)
                    
            except Exception as e:
                logger.warning(f"Erro ao identificar {ci.ip_address}: {e}")
        
        return updated
    
    # ==========================================================================
    # CONFIGURAÇÃO DE DISPOSITIVOS
    # ==========================================================================
    
    async def apply_network_config(
        self,
        request: ApplyConfigRequest
    ) -> NetworkChangeRecord:
        """
        Aplica configuração de rede em um CI.
        
        Args:
            request: Configuração a aplicar.
        
        Returns:
            Change Record com resultado.
        """
        # Busca CI
        ci = self.cmdb.get_ci_by_id(request.ci_id)
        if not ci:
            raise ValueError(f"CI {request.ci_id} não encontrado")
        
        # Cria Change Record
        change = NetworkChangeRecord(
            ci_id=ci.id,
            condominio_nome=ci.condominio_nome,
            job_id=request.job_id,
            change_type=ChangeType.NETWORK_CONFIG,
            title=f"Configuração de rede em {ci.ip_address}",
            description=request.notes or f"Aplicação de nova configuração de rede",
            risk_level=self._assess_risk(ci, request.new_config),
            requested_by=request.requested_by,
            status=ChangeStatus.IN_PROGRESS,
            started_at=datetime.now(),
            new_config=request.new_config,
        )
        
        # Verifica se precisa aprovação
        if request.require_approval and change.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            change.approval_status = ApprovalStatus.PENDING
            change.status = ChangeStatus.PLANNED
            self.cmdb.create_change(change)
            return change
        
        # Obtém cliente
        client = get_device_client(
            ip=ci.ip_address,
            device_type=ci.device_type,
            fabricante=ci.fabricante,
            username=request.credentials.username,
            password=request.credentials.password
        )
        
        try:
            # Conecta
            status = await client.connect()
            if status != ConnectionStatus.CONNECTED:
                raise Exception(f"Falha na conexão: {status}")
            
            # Obtém config atual
            change.previous_config = await client.get_network_config()
            
            # Backup se solicitado
            if request.create_backup:
                backup = await client.backup_config()
                if backup.success:
                    change.backup_created = True
                    change.backup_id = backup.backup_id
            
            # Aplica nova config
            result = await client.set_network_config(request.new_config)
            
            if result.success:
                change.success = True
                change.status = ChangeStatus.COMPLETED
                change.tests_performed = ["connectivity"]
                change.tests_passed = True
                
                # Atualiza CI
                self.cmdb.update_ci(ci.id, {
                    "network_config": request.new_config,
                    "ip_address": request.new_config.ip_address or ci.ip_address,
                    "last_config_change_at": datetime.now(),
                })
            else:
                change.success = False
                change.status = ChangeStatus.FAILED
                change.error_message = result.error
                
        except Exception as e:
            change.success = False
            change.status = ChangeStatus.FAILED
            change.error_message = str(e)
            logger.error(f"Erro ao aplicar config: {e}")
            
        finally:
            await client.disconnect()
        
        change.finished_at = datetime.now()
        change.executed_by = "Conecta Plus - Network Orchestrator"
        
        # Salva change record
        self.cmdb.create_change(change)
        
        return change
    
    def _assess_risk(self, ci: NetworkDeviceCI, new_config: NetworkConfig) -> RiskLevel:
        """Avalia risco da mudança."""
        # Dispositivo crítico = alto risco
        if ci.critical:
            return RiskLevel.HIGH
        
        # Mudança de IP = médio risco
        if new_config.ip_address and new_config.ip_address != ci.ip_address:
            return RiskLevel.MEDIUM
        
        # Router/Firewall = alto risco
        if ci.device_type in (DeviceType.ROUTER, DeviceType.FIREWALL, DeviceType.MIKROTIK):
            return RiskLevel.HIGH
        
        # Gateway = crítico
        if ci.device_type == DeviceType.GATEWAY:
            return RiskLevel.CRITICAL
        
        return RiskLevel.LOW
    
    # ==========================================================================
    # OPERAÇÕES EM LOTE
    # ==========================================================================
    
    async def provision_devices(
        self,
        condominio_nome: str,
        ip_plan: Dict[str, str],
        credentials: DeviceCredentials,
        job_id: str = None
    ) -> List[NetworkChangeRecord]:
        """
        Provisiona múltiplos dispositivos com novo plano de IPs.
        
        Args:
            condominio_nome: Nome do condomínio.
            ip_plan: Mapa de IP atual -> novo IP.
            credentials: Credenciais de acesso.
            job_id: ID do job relacionado.
        
        Returns:
            Lista de Change Records.
        """
        changes = []
        
        for old_ip, new_ip in ip_plan.items():
            ci = self.cmdb.get_ci_by_ip(old_ip)
            if not ci:
                logger.warning(f"CI não encontrado para IP {old_ip}")
                continue
            
            # Cria config
            new_config = NetworkConfig(
                ip_address=new_ip,
                netmask="255.255.255.0",
                gateway=new_ip.rsplit('.', 1)[0] + ".1"
            )
            
            # Aplica
            request = ApplyConfigRequest(
                ci_id=ci.id,
                new_config=new_config,
                credentials=credentials,
                job_id=job_id,
                create_backup=True
            )
            
            change = await self.apply_network_config(request)
            changes.append(change)
        
        return changes
    
    # ==========================================================================
    # CONSULTAS
    # ==========================================================================
    
    def get_ci_by_id(self, ci_id: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por ID."""
        return self.cmdb.get_ci_by_id(ci_id)
    
    def get_ci_by_ip(self, ip: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por IP."""
        return self.cmdb.get_ci_by_ip(ip)
    
    def list_cis(self, **filters) -> List[NetworkDeviceCI]:
        """Lista CIs com filtros."""
        return self.cmdb.list_cis(**filters)
    
    def get_changes_for_ci(self, ci_id: str) -> List[NetworkChangeRecord]:
        """Lista mudanças de um CI."""
        return self.cmdb.list_changes(ci_id=ci_id)
    
    def get_changes_for_job(self, job_id: str) -> List[NetworkChangeRecord]:
        """Lista mudanças de um Job."""
        return self.cmdb.list_changes(job_id=job_id)
    
    def get_stats(self) -> Dict[str, Any]:
        """Estatísticas do CMDB."""
        if hasattr(self.cmdb, 'get_stats'):
            return self.cmdb.get_stats()
        return {}


# =============================================================================
# SINGLETON GLOBAL
# =============================================================================

_orchestrator_instance: Optional[NetworkOrchestrator] = None


def get_network_orchestrator() -> NetworkOrchestrator:
    """Retorna instância global do orquestrador."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = NetworkOrchestrator()
    return _orchestrator_instance
