# -*- coding: utf-8 -*-
"""
Device Clients
==============

Clientes para comunicação com dispositivos de rede.
"""

from .base import (
    BaseDeviceClient,
    ConnectionStatus,
    DeviceInfo,
    BackupResult,
    OperationResult,
)
from .mikrotik_client import MikrotikClient
from .intelbras_client import IntelbrasClient
from .hikvision_client import HikvisionClient
from .generic_client import (
    GenericDeviceClient,
    get_device_client,
    auto_detect_and_connect,
)

__all__ = [
    # Base
    "BaseDeviceClient",
    "ConnectionStatus",
    "DeviceInfo",
    "BackupResult",
    "OperationResult",
    # Clientes
    "MikrotikClient",
    "IntelbrasClient",
    "HikvisionClient",
    "GenericDeviceClient",
    # Factory
    "get_device_client",
    "auto_detect_and_connect",
]
