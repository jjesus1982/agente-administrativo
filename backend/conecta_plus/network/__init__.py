# -*- coding: utf-8 -*-
"""
Network Module
==============

Módulo de rede do Conecta Plus:
- Scanner de rede com identificação de fabricantes
- CMDB (Configuration Management Database)
- Device Clients para configuração remota
- Change Records ITIL
- Relatórios de mudanças

Fabricantes suportados:
- Intelbras/Dahua
- Hikvision
- Mikrotik
- Control iD
- Ubiquiti
- TP-Link
- E outros via cliente genérico
"""

from .schemas import (
    # Enums
    DeviceType,
    DeviceStatus,
    ChangeType,
    ChangeStatus,
    RiskLevel,
    ApprovalStatus,
    # Models
    NetworkConfig,
    DiscoveredDevice,
    NetworkScanRequest,
    NetworkScanResult,
    NetworkDeviceCI,
    NetworkChangeRecord,
    DeviceCredentials,
    ApplyConfigRequest,
    CICreateRequest,
    CIUpdateRequest,
)

from .scanner import NetworkScanner

from .cmdb import (
    CMDBRepository,
    InMemoryCMDBRepository,
    get_cmdb,
    set_cmdb,
)

from .orchestrator import (
    NetworkOrchestrator,
    get_network_orchestrator,
)

from .itil_reporter import (
    gerar_change_record_itil,
    gerar_resumo_cliente,
    gerar_historico_ci,
)

from .api import router as network_router

__all__ = [
    # Enums
    "DeviceType",
    "DeviceStatus",
    "ChangeType",
    "ChangeStatus",
    "RiskLevel",
    "ApprovalStatus",
    # Models
    "NetworkConfig",
    "DiscoveredDevice",
    "NetworkScanRequest",
    "NetworkScanResult",
    "NetworkDeviceCI",
    "NetworkChangeRecord",
    "DeviceCredentials",
    "ApplyConfigRequest",
    "CICreateRequest",
    "CIUpdateRequest",
    # Scanner
    "NetworkScanner",
    # CMDB
    "CMDBRepository",
    "InMemoryCMDBRepository",
    "get_cmdb",
    "set_cmdb",
    # Orchestrator
    "NetworkOrchestrator",
    "get_network_orchestrator",
    # ITIL
    "gerar_change_record_itil",
    "gerar_resumo_cliente",
    "gerar_historico_ci",
    # API
    "network_router",
]
