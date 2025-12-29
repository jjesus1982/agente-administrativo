# -*- coding: utf-8 -*-
"""
CMDB Repository
===============

Repositório para Configuration Items (CIs) e Change Records.
Implementação em memória com interface para substituição por banco de dados.
"""

from __future__ import annotations
from typing import Dict, List, Optional, Protocol
from datetime import datetime
from abc import ABC, abstractmethod

from .schemas import (
    NetworkDeviceCI,
    NetworkChangeRecord,
    DiscoveredDevice,
    NetworkScanResult,
    DeviceType,
    DeviceStatus,
    ChangeStatus,
    CICreateRequest,
    CIUpdateRequest,
)


# =============================================================================
# INTERFACE ABSTRATA
# =============================================================================

class CMDBRepository(ABC):
    """Interface abstrata para o repositório CMDB."""
    
    # === CIs ===
    
    @abstractmethod
    def create_ci(self, ci: NetworkDeviceCI) -> NetworkDeviceCI:
        """Cria um novo CI."""
        pass
    
    @abstractmethod
    def get_ci_by_id(self, ci_id: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por ID."""
        pass
    
    @abstractmethod
    def get_ci_by_ip(self, ip_address: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por IP."""
        pass
    
    @abstractmethod
    def get_ci_by_mac(self, mac_address: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por MAC."""
        pass
    
    @abstractmethod
    def list_cis(
        self, 
        condominio_nome: Optional[str] = None,
        device_type: Optional[DeviceType] = None,
        status: Optional[DeviceStatus] = None,
        managed_only: bool = False,
        critical_only: bool = False,
    ) -> List[NetworkDeviceCI]:
        """Lista CIs com filtros."""
        pass
    
    @abstractmethod
    def update_ci(self, ci_id: str, updates: Dict) -> Optional[NetworkDeviceCI]:
        """Atualiza um CI."""
        pass
    
    @abstractmethod
    def delete_ci(self, ci_id: str) -> bool:
        """Remove um CI."""
        pass
    
    @abstractmethod
    def upsert_from_scan(self, scan: NetworkScanResult) -> List[NetworkDeviceCI]:
        """Atualiza/cria CIs a partir de um scan."""
        pass
    
    # === Change Records ===
    
    @abstractmethod
    def create_change(self, change: NetworkChangeRecord) -> NetworkChangeRecord:
        """Cria um novo Change Record."""
        pass
    
    @abstractmethod
    def get_change_by_id(self, change_id: str) -> Optional[NetworkChangeRecord]:
        """Busca Change Record por ID."""
        pass
    
    @abstractmethod
    def list_changes(
        self,
        ci_id: Optional[str] = None,
        condominio_nome: Optional[str] = None,
        job_id: Optional[str] = None,
        status: Optional[ChangeStatus] = None,
        limit: int = 100,
    ) -> List[NetworkChangeRecord]:
        """Lista Change Records com filtros."""
        pass
    
    @abstractmethod
    def update_change(self, change_id: str, updates: Dict) -> Optional[NetworkChangeRecord]:
        """Atualiza um Change Record."""
        pass


# =============================================================================
# IMPLEMENTAÇÃO EM MEMÓRIA
# =============================================================================

class InMemoryCMDBRepository(CMDBRepository):
    """
    Implementação em memória do CMDB.
    
    Útil para testes e desenvolvimento.
    Em produção, substituir por implementação com banco de dados.
    """
    
    def __init__(self) -> None:
        self._cis_by_id: Dict[str, NetworkDeviceCI] = {}
        self._cis_by_ip: Dict[str, NetworkDeviceCI] = {}
        self._cis_by_mac: Dict[str, NetworkDeviceCI] = {}
        self._changes_by_id: Dict[str, NetworkChangeRecord] = {}
    
    # === CIs ===
    
    def create_ci(self, ci: NetworkDeviceCI) -> NetworkDeviceCI:
        """Cria um novo CI."""
        self._cis_by_id[ci.id] = ci
        self._cis_by_ip[ci.ip_address] = ci
        if ci.mac_address:
            self._cis_by_mac[ci.mac_address.upper()] = ci
        return ci
    
    def get_ci_by_id(self, ci_id: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por ID."""
        return self._cis_by_id.get(ci_id)
    
    def get_ci_by_ip(self, ip_address: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por IP."""
        return self._cis_by_ip.get(ip_address)
    
    def get_ci_by_mac(self, mac_address: str) -> Optional[NetworkDeviceCI]:
        """Busca CI por MAC."""
        return self._cis_by_mac.get(mac_address.upper())
    
    def list_cis(
        self,
        condominio_nome: Optional[str] = None,
        device_type: Optional[DeviceType] = None,
        status: Optional[DeviceStatus] = None,
        managed_only: bool = False,
        critical_only: bool = False,
    ) -> List[NetworkDeviceCI]:
        """Lista CIs com filtros."""
        result = list(self._cis_by_id.values())
        
        if condominio_nome:
            result = [ci for ci in result if ci.condominio_nome == condominio_nome]
        
        if device_type:
            result = [ci for ci in result if ci.device_type == device_type]
        
        if status:
            result = [ci for ci in result if ci.status == status]
        
        if managed_only:
            result = [ci for ci in result if ci.managed_by_conecta]
        
        if critical_only:
            result = [ci for ci in result if ci.critical]
        
        return result
    
    def update_ci(self, ci_id: str, updates: Dict) -> Optional[NetworkDeviceCI]:
        """Atualiza um CI."""
        ci = self._cis_by_id.get(ci_id)
        if not ci:
            return None
        
        # Remove de índices antigos se IP/MAC mudou
        old_ip = ci.ip_address
        old_mac = ci.mac_address
        
        # Aplica atualizações
        for key, value in updates.items():
            if hasattr(ci, key) and value is not None:
                setattr(ci, key, value)
        
        ci.updated_at = datetime.now()
        
        # Atualiza índices
        if old_ip != ci.ip_address:
            del self._cis_by_ip[old_ip]
            self._cis_by_ip[ci.ip_address] = ci
        
        if old_mac != ci.mac_address:
            if old_mac:
                del self._cis_by_mac[old_mac.upper()]
            if ci.mac_address:
                self._cis_by_mac[ci.mac_address.upper()] = ci
        
        return ci
    
    def delete_ci(self, ci_id: str) -> bool:
        """Remove um CI."""
        ci = self._cis_by_id.get(ci_id)
        if not ci:
            return False
        
        del self._cis_by_id[ci_id]
        del self._cis_by_ip[ci.ip_address]
        if ci.mac_address:
            del self._cis_by_mac[ci.mac_address.upper()]
        
        return True
    
    def upsert_from_scan(self, scan: NetworkScanResult) -> List[NetworkDeviceCI]:
        """
        Atualiza/cria CIs a partir de um scan.
        
        - Se o IP já existe, atualiza
        - Se não existe, cria novo CI
        """
        updated: List[NetworkDeviceCI] = []
        now = datetime.now()
        
        for device in scan.devices:
            # Tenta encontrar CI existente por IP ou MAC
            existing = self._cis_by_ip.get(device.ip_address)
            
            if not existing and device.mac_address:
                existing = self._cis_by_mac.get(device.mac_address.upper())
            
            if existing:
                # Atualiza CI existente
                existing.ip_address = device.ip_address
                existing.mac_address = device.mac_address or existing.mac_address
                existing.hostname = device.hostname or existing.hostname
                existing.fabricante = device.vendor or existing.fabricante
                existing.device_type = device.device_type if device.device_type != DeviceType.UNKNOWN else existing.device_type
                existing.status = DeviceStatus.ONLINE
                existing.last_seen_at = now
                existing.last_response_time_ms = device.response_time_ms
                existing.last_scan_at = now
                existing.updated_at = now
                
                # Atualiza índices
                self._cis_by_ip[existing.ip_address] = existing
                if existing.mac_address:
                    self._cis_by_mac[existing.mac_address.upper()] = existing
                
                updated.append(existing)
            else:
                # Cria novo CI
                ci = NetworkDeviceCI(
                    condominio_nome=scan.condominio_nome,
                    ip_address=device.ip_address,
                    mac_address=device.mac_address,
                    hostname=device.hostname,
                    fabricante=device.vendor,
                    device_type=device.device_type,
                    status=DeviceStatus.ONLINE,
                    last_seen_at=now,
                    last_response_time_ms=device.response_time_ms,
                    last_scan_at=now,
                    created_at=now,
                    updated_at=now,
                )
                
                self._cis_by_id[ci.id] = ci
                self._cis_by_ip[ci.ip_address] = ci
                if ci.mac_address:
                    self._cis_by_mac[ci.mac_address.upper()] = ci
                
                updated.append(ci)
        
        return updated
    
    # === Change Records ===
    
    def create_change(self, change: NetworkChangeRecord) -> NetworkChangeRecord:
        """Cria um novo Change Record."""
        self._changes_by_id[change.id] = change
        return change
    
    def get_change_by_id(self, change_id: str) -> Optional[NetworkChangeRecord]:
        """Busca Change Record por ID."""
        return self._changes_by_id.get(change_id)
    
    def list_changes(
        self,
        ci_id: Optional[str] = None,
        condominio_nome: Optional[str] = None,
        job_id: Optional[str] = None,
        status: Optional[ChangeStatus] = None,
        limit: int = 100,
    ) -> List[NetworkChangeRecord]:
        """Lista Change Records com filtros."""
        result = list(self._changes_by_id.values())
        
        if ci_id:
            result = [c for c in result if c.ci_id == ci_id]
        
        if condominio_nome:
            result = [c for c in result if c.condominio_nome == condominio_nome]
        
        if job_id:
            result = [c for c in result if c.job_id == job_id]
        
        if status:
            result = [c for c in result if c.status == status]
        
        # Ordena por data de criação (mais recente primeiro)
        result.sort(key=lambda c: c.created_at, reverse=True)
        
        return result[:limit]
    
    def update_change(self, change_id: str, updates: Dict) -> Optional[NetworkChangeRecord]:
        """Atualiza um Change Record."""
        change = self._changes_by_id.get(change_id)
        if not change:
            return None
        
        for key, value in updates.items():
            if hasattr(change, key) and value is not None:
                setattr(change, key, value)
        
        change.updated_at = datetime.now()
        
        return change
    
    # === Estatísticas ===
    
    def get_stats(self) -> Dict:
        """Retorna estatísticas do CMDB."""
        cis = list(self._cis_by_id.values())
        changes = list(self._changes_by_id.values())
        
        # Contagem por tipo
        by_type: Dict[str, int] = {}
        for ci in cis:
            tipo = ci.device_type.value
            by_type[tipo] = by_type.get(tipo, 0) + 1
        
        # Contagem por status
        by_status: Dict[str, int] = {}
        for ci in cis:
            status = ci.status.value
            by_status[status] = by_status.get(status, 0) + 1
        
        # Contagem por condomínio
        by_condominio: Dict[str, int] = {}
        for ci in cis:
            cond = ci.condominio_nome
            by_condominio[cond] = by_condominio.get(cond, 0) + 1
        
        return {
            "total_cis": len(cis),
            "total_changes": len(changes),
            "cis_by_type": by_type,
            "cis_by_status": by_status,
            "cis_by_condominio": by_condominio,
            "managed_cis": sum(1 for ci in cis if ci.managed_by_conecta),
            "critical_cis": sum(1 for ci in cis if ci.critical),
        }


# =============================================================================
# SINGLETON GLOBAL
# =============================================================================

# Instância global do CMDB (pode ser substituída por implementação com DB)
_cmdb_instance: Optional[CMDBRepository] = None


def get_cmdb() -> CMDBRepository:
    """Retorna a instância global do CMDB."""
    global _cmdb_instance
    if _cmdb_instance is None:
        _cmdb_instance = InMemoryCMDBRepository()
    return _cmdb_instance


def set_cmdb(cmdb: CMDBRepository) -> None:
    """Define a instância global do CMDB."""
    global _cmdb_instance
    _cmdb_instance = cmdb
