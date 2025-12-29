# -*- coding: utf-8 -*-
"""
Base Device Client
==================

Interface abstrata para clientes de dispositivos IP.
Define operações padrão que cada driver deve implementar.
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

from ..schemas import NetworkConfig


class ConnectionStatus(str, Enum):
    """Status da conexão com dispositivo."""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    TIMEOUT = "timeout"
    AUTH_FAILED = "auth_failed"


@dataclass
class DeviceInfo:
    """Informações do dispositivo."""
    modelo: str = ""
    firmware: str = ""
    serial: str = ""
    uptime: str = ""
    hostname: str = ""
    extra: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.extra is None:
            self.extra = {}


@dataclass
class BackupResult:
    """Resultado de backup."""
    success: bool
    backup_id: str = ""
    backup_path: str = ""
    backup_data: bytes = b""
    error: str = ""


@dataclass 
class OperationResult:
    """Resultado de uma operação no dispositivo."""
    success: bool
    message: str = ""
    data: Dict[str, Any] = None
    error: str = ""
    
    def __post_init__(self):
        if self.data is None:
            self.data = {}


class BaseDeviceClient(ABC):
    """
    Interface base para clientes de dispositivos IP.
    
    Cada fabricante/tipo deve implementar esta interface.
    """
    
    def __init__(
        self, 
        ip: str, 
        username: str = "admin", 
        password: str = "admin",
        port: int = 80,
        timeout: float = 10.0,
        use_ssl: bool = False
    ):
        self.ip = ip
        self.username = username
        self.password = password
        self.port = port
        self.timeout = timeout
        self.use_ssl = use_ssl
        self._connected = False
    
    @property
    def base_url(self) -> str:
        """URL base do dispositivo."""
        protocol = "https" if self.use_ssl else "http"
        return f"{protocol}://{self.ip}:{self.port}"
    
    # === Conexão ===
    
    @abstractmethod
    async def connect(self) -> ConnectionStatus:
        """Estabelece conexão com o dispositivo."""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Encerra conexão com o dispositivo."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> ConnectionStatus:
        """Testa se a conexão está ativa."""
        pass
    
    # === Informações ===
    
    @abstractmethod
    async def get_device_info(self) -> DeviceInfo:
        """Obtém informações do dispositivo."""
        pass
    
    # === Configuração de Rede ===
    
    @abstractmethod
    async def get_network_config(self) -> NetworkConfig:
        """Obtém configuração de rede atual."""
        pass
    
    @abstractmethod
    async def set_network_config(self, config: NetworkConfig) -> OperationResult:
        """Aplica nova configuração de rede."""
        pass
    
    # === Backup ===
    
    async def backup_config(self) -> BackupResult:
        """
        Realiza backup da configuração.
        
        Implementação padrão retorna não suportado.
        Sobrescrever em clientes que suportam backup.
        """
        return BackupResult(
            success=False,
            error="Backup não suportado para este dispositivo"
        )
    
    async def restore_config(self, backup_id: str) -> OperationResult:
        """
        Restaura configuração de um backup.
        
        Implementação padrão retorna não suportado.
        """
        return OperationResult(
            success=False,
            error="Restore não suportado para este dispositivo"
        )
    
    # === Operações ===
    
    async def reboot(self) -> OperationResult:
        """
        Reinicia o dispositivo.
        
        Implementação padrão retorna não suportado.
        """
        return OperationResult(
            success=False,
            error="Reboot não suportado para este dispositivo"
        )
    
    async def factory_reset(self) -> OperationResult:
        """
        Reset de fábrica.
        
        CUIDADO: Operação destrutiva!
        Implementação padrão retorna não suportado.
        """
        return OperationResult(
            success=False,
            error="Factory reset não suportado para este dispositivo"
        )
    
    # === Utilitários ===
    
    def is_connected(self) -> bool:
        """Verifica se está conectado."""
        return self._connected
    
    async def __aenter__(self):
        """Context manager - entrada."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager - saída."""
        await self.disconnect()
