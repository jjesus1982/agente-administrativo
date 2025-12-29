# -*- coding: utf-8 -*-
"""
Network Schemas - CMDB e Change Records
========================================

Modelos Pydantic para:
- Configuration Items (CIs) do CMDB
- Change Records ITIL
- Network Scan Results
- Configurações de rede
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import uuid4
from datetime import datetime
from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================

class DeviceType(str, Enum):
    """Tipo de dispositivo de rede."""
    UNKNOWN = "unknown"
    MIKROTIK = "mikrotik"
    CAMERA = "camera"
    NVR = "nvr"
    DVR = "dvr"
    INVR = "invr"
    ACCESS_CONTROLLER = "access_controller"
    FACIAL_READER = "facial_reader"
    INTERCOM = "intercom"
    GATEWAY = "gateway"
    SWITCH = "switch"
    ROUTER = "router"
    FIREWALL = "firewall"
    ALARM_PANEL = "alarm_panel"
    OTHER = "other"


class DeviceStatus(str, Enum):
    """Status do dispositivo."""
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"
    MAINTENANCE = "maintenance"
    UNKNOWN = "unknown"


class ChangeType(str, Enum):
    """Tipo de mudança ITIL."""
    NETWORK_CONFIG = "network_config"
    FIRMWARE_UPDATE = "firmware_update"
    BACKUP = "backup"
    RESTORE = "restore"
    REBOOT = "reboot"
    CREDENTIAL_CHANGE = "credential_change"
    VLAN_CONFIG = "vlan_config"
    VPN_CONFIG = "vpn_config"
    FIREWALL_RULE = "firewall_rule"
    INTEGRATION = "integration"
    OTHER = "other"


class ChangeStatus(str, Enum):
    """Status da mudança."""
    PLANNED = "planned"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    CANCELLED = "cancelled"


class RiskLevel(str, Enum):
    """Nível de risco da mudança."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ApprovalStatus(str, Enum):
    """Status de aprovação."""
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# =============================================================================
# NETWORK CONFIG
# =============================================================================

class NetworkConfig(BaseModel):
    """Configuração de rede de um dispositivo."""
    dhcp_enabled: bool = False
    ip_address: Optional[str] = None
    netmask: Optional[str] = None
    gateway: Optional[str] = None
    dns_servers: List[str] = Field(default_factory=lambda: ["8.8.8.8", "8.8.4.4"])
    vlan_id: Optional[int] = None
    mtu: int = 1500
    
    def to_cidr(self) -> str:
        """Retorna IP em formato CIDR."""
        if not self.ip_address or not self.netmask:
            return ""
        # Converte netmask para CIDR
        netmask_to_cidr = {
            "255.255.255.0": "24",
            "255.255.255.128": "25",
            "255.255.255.192": "26",
            "255.255.255.224": "27",
            "255.255.255.240": "28",
            "255.255.255.248": "29",
            "255.255.255.252": "30",
            "255.255.254.0": "23",
            "255.255.252.0": "22",
            "255.255.248.0": "21",
            "255.255.240.0": "20",
            "255.255.0.0": "16",
            "255.0.0.0": "8",
        }
        cidr = netmask_to_cidr.get(self.netmask, "24")
        return f"{self.ip_address}/{cidr}"


# =============================================================================
# DISCOVERED DEVICE (resultado do scan)
# =============================================================================

class DiscoveredDevice(BaseModel):
    """Dispositivo descoberto no scan de rede."""
    ip_address: str
    mac_address: Optional[str] = None
    vendor: Optional[str] = None
    hostname: Optional[str] = None
    open_ports: List[int] = Field(default_factory=list)
    device_type: DeviceType = DeviceType.UNKNOWN
    response_time_ms: float = 0
    discovered_at: datetime = Field(default_factory=datetime.now)


class NetworkScanRequest(BaseModel):
    """Request para scan de rede."""
    condominio_nome: str
    subnets: List[str] = Field(..., description="Lista de subnets CIDR")
    scan_ports: bool = True
    port_list: List[int] = Field(
        default_factory=lambda: [22, 23, 80, 443, 554, 4370, 5000, 8000, 8080, 8291, 8728, 37777]
    )
    timeout_seconds: float = 2.0
    max_concurrent: int = 50


class NetworkScanResult(BaseModel):
    """Resultado do scan de rede."""
    id: str = Field(default_factory=lambda: f"scan_{uuid4().hex[:8]}")
    condominio_nome: str
    subnets: List[str]
    devices: List[DiscoveredDevice] = Field(default_factory=list)
    total_hosts_scanned: int = 0
    total_devices_found: int = 0
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: float = 0
    notes: Optional[str] = None


# =============================================================================
# CMDB - CONFIGURATION ITEM (CI)
# =============================================================================

class NetworkDeviceCI(BaseModel):
    """
    Configuration Item (CI) de um dispositivo de rede.
    Representa um dispositivo no CMDB.
    """
    id: str = Field(default_factory=lambda: f"ci_{uuid4().hex[:8]}")
    
    # Identificação
    condominio_nome: str
    localizacao: Optional[str] = None  # Ex: "Guarita", "Torre 1 - Hall"
    nome_amigavel: Optional[str] = None  # Ex: "Câmera Portão Principal"
    
    # Tipo e fabricante
    device_type: DeviceType = DeviceType.UNKNOWN
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    firmware_version: Optional[str] = None
    serial_number: Optional[str] = None
    
    # Rede
    ip_address: str
    mac_address: Optional[str] = None
    hostname: Optional[str] = None
    network_config: Optional[NetworkConfig] = None
    
    # Status
    status: DeviceStatus = DeviceStatus.UNKNOWN
    last_seen_at: Optional[datetime] = None
    last_response_time_ms: float = 0
    
    # Metadados
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Gestão
    managed_by_conecta: bool = True
    critical: bool = False  # Se é um dispositivo crítico
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_scan_at: Optional[datetime] = None
    last_config_change_at: Optional[datetime] = None
    
    # Relacionamentos
    parent_ci_id: Optional[str] = None  # Ex: câmera filha de um NVR
    related_ci_ids: List[str] = Field(default_factory=list)


class CICreateRequest(BaseModel):
    """Request para criar um CI."""
    condominio_nome: str
    ip_address: str
    device_type: DeviceType = DeviceType.UNKNOWN
    localizacao: Optional[str] = None
    nome_amigavel: Optional[str] = None
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    mac_address: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    managed_by_conecta: bool = True
    critical: bool = False


class CIUpdateRequest(BaseModel):
    """Request para atualizar um CI."""
    localizacao: Optional[str] = None
    nome_amigavel: Optional[str] = None
    device_type: Optional[DeviceType] = None
    fabricante: Optional[str] = None
    modelo: Optional[str] = None
    firmware_version: Optional[str] = None
    tags: Optional[List[str]] = None
    managed_by_conecta: Optional[bool] = None
    critical: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


# =============================================================================
# CHANGE RECORD (ITIL)
# =============================================================================

class NetworkChangeRecord(BaseModel):
    """
    Change Record ITIL.
    Registra cada mudança realizada em um CI.
    """
    id: str = Field(default_factory=lambda: f"chg_{uuid4().hex[:8]}")
    
    # Identificação
    ci_id: str
    condominio_nome: str
    job_id: Optional[str] = None  # Relacionamento com JobInstance do Fielder
    
    # Tipo e descrição
    change_type: ChangeType
    title: str
    description: str
    
    # Risco e aprovação
    risk_level: RiskLevel = RiskLevel.LOW
    approval_status: ApprovalStatus = ApprovalStatus.NOT_REQUIRED
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    
    # Execução
    status: ChangeStatus = ChangeStatus.PLANNED
    requested_by: Optional[str] = None
    executed_by: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    
    # Configurações
    previous_config: Optional[NetworkConfig] = None
    new_config: Optional[NetworkConfig] = None
    
    # Backup
    backup_created: bool = False
    backup_id: Optional[str] = None
    
    # Resultado
    success: bool = False
    error_message: Optional[str] = None
    rollback_performed: bool = False
    
    # Testes
    tests_performed: List[str] = Field(default_factory=list)
    tests_passed: bool = False
    
    # Evidências
    evidence_ids: List[str] = Field(default_factory=list)
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ChangeRequestCreate(BaseModel):
    """Request para criar uma mudança."""
    ci_id: str
    change_type: ChangeType
    title: str
    description: str
    risk_level: RiskLevel = RiskLevel.LOW
    requested_by: Optional[str] = None
    job_id: Optional[str] = None
    new_config: Optional[NetworkConfig] = None
    require_approval: bool = False


# =============================================================================
# CREDENCIAIS (para uso seguro)
# =============================================================================

class DeviceCredentials(BaseModel):
    """Credenciais de acesso a um dispositivo."""
    ci_id: Optional[str] = None
    ip_address: Optional[str] = None
    username: str = "admin"
    password: str = "admin"
    ssh_port: int = 22
    api_port: Optional[int] = None
    use_ssl: bool = False


# =============================================================================
# APPLY CONFIG REQUEST
# =============================================================================

class ApplyConfigRequest(BaseModel):
    """Request para aplicar configuração."""
    ci_id: str
    new_config: NetworkConfig
    credentials: DeviceCredentials
    create_backup: bool = True
    require_approval: bool = False
    requested_by: Optional[str] = None
    job_id: Optional[str] = None
    notes: Optional[str] = None
