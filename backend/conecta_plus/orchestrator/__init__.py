# -*- coding: utf-8 -*-
"""
Orquestrador de Instalação - Conecta Plus
=========================================

Módulo de automação completa de instalações.

Funcionalidades:
- Scanner de rede (descoberta de dispositivos)
- Provisionador automático (configuração de IPs, VLANs)
- Gerenciador de VPN (WireGuard, L2TP, IPSec)
- Integrador de sistemas (câmeras no NVR, nuvem)
- Orquestrador principal (coordena tudo)
"""

__version__ = "1.0.0"

from .scanner import (
    NetworkScanner,
    DispositivoEncontrado,
    TipoDispositivo,
    OUI_DATABASE,
)
from .provisioner import (
    Provisionador,
    ConfiguracaoDispositivo,
    PlanoProvisionamento,
    ResultadoProvisionamento,
    StatusProvisionamento,
)
from .vpn_manager import (
    VPNManager,
    ConfiguracaoVPN,
    TipoVPN,
    ClienteVPN,
    ResultadoVPN,
)
from .integrator import (
    Integrador,
    IntegracaoNVR,
    IntegracaoNuvem,
    ResultadoIntegracao,
    StatusIntegracao,
)
from .orchestrator import (
    OrquestradorInstalacao,
    ProjetoInstalacao,
    FaseInstalacao,
)
from .api import router

__all__ = [
    # Scanner
    "NetworkScanner",
    "DispositivoEncontrado",
    "TipoDispositivo",
    "OUI_DATABASE",
    # Provisionador
    "Provisionador",
    "ConfiguracaoDispositivo",
    "PlanoProvisionamento",
    "ResultadoProvisionamento",
    "StatusProvisionamento",
    # VPN
    "VPNManager",
    "ConfiguracaoVPN",
    "TipoVPN",
    "ClienteVPN",
    "ResultadoVPN",
    # Integrador
    "Integrador",
    "IntegracaoNVR",
    "IntegracaoNuvem",
    "ResultadoIntegracao",
    "StatusIntegracao",
    # Orquestrador
    "OrquestradorInstalacao",
    "ProjetoInstalacao",
    "FaseInstalacao",
    # API
    "router",
]
