# -*- coding: utf-8 -*-
"""
Generic Device Client & Factory
================================

Cliente genérico para dispositivos não suportados e
factory para criar o cliente correto baseado no tipo/fabricante.
"""

from __future__ import annotations
import asyncio
import logging
import aiohttp
from typing import Optional, Type

from .base import (
    BaseDeviceClient,
    ConnectionStatus,
    DeviceInfo,
    OperationResult,
)
from ..schemas import NetworkConfig, DeviceType

logger = logging.getLogger(__name__)


class GenericDeviceClient(BaseDeviceClient):
    """
    Cliente genérico para dispositivos não suportados.
    
    Tenta operações básicas via HTTP.
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
        super().__init__(ip, username, password, port, timeout, use_ssl)
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def connect(self) -> ConnectionStatus:
        """Tenta conexão HTTP."""
        try:
            auth = aiohttp.BasicAuth(self.username, self.password)
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            self._session = aiohttp.ClientSession(
                auth=auth,
                timeout=timeout
            )
            
            # Tenta acessar a raiz
            async with self._session.get(self.base_url) as resp:
                if resp.status in (200, 401, 403):
                    self._connected = True
                    return ConnectionStatus.CONNECTED
                else:
                    return ConnectionStatus.ERROR
                    
        except asyncio.TimeoutError:
            return ConnectionStatus.TIMEOUT
        except Exception as e:
            logger.error(f"Erro ao conectar: {e}")
            return ConnectionStatus.ERROR
    
    async def disconnect(self) -> None:
        """Encerra sessão."""
        if self._session:
            await self._session.close()
            self._session = None
        self._connected = False
    
    async def test_connection(self) -> ConnectionStatus:
        """Testa conexão."""
        if not self._session:
            return ConnectionStatus.DISCONNECTED
        
        try:
            async with self._session.get(self.base_url) as resp:
                return ConnectionStatus.CONNECTED if resp.status in (200, 401, 403) else ConnectionStatus.ERROR
        except:
            return ConnectionStatus.ERROR
    
    async def get_device_info(self) -> DeviceInfo:
        """Retorna info mínima."""
        return DeviceInfo(
            hostname=self.ip,
            extra={"note": "Dispositivo genérico - informações limitadas"}
        )
    
    async def get_network_config(self) -> NetworkConfig:
        """Retorna config básica."""
        return NetworkConfig(
            ip_address=self.ip,
            dhcp_enabled=True
        )
    
    async def set_network_config(self, config: NetworkConfig) -> OperationResult:
        """Não suportado em cliente genérico."""
        return OperationResult(
            success=False,
            error="Configuração de rede não suportada para este dispositivo"
        )


# =============================================================================
# DEVICE CLIENT FACTORY
# =============================================================================

def get_device_client(
    ip: str,
    device_type: DeviceType = None,
    fabricante: str = None,
    username: str = "admin",
    password: str = "admin",
    port: int = None,
    **kwargs
) -> BaseDeviceClient:
    """
    Factory para criar o cliente correto.
    
    Args:
        ip: IP do dispositivo.
        device_type: Tipo do dispositivo.
        fabricante: Nome do fabricante.
        username: Usuário.
        password: Senha.
        port: Porta (auto-detect se None).
        **kwargs: Argumentos adicionais.
    
    Returns:
        Cliente apropriado para o dispositivo.
    """
    from .mikrotik_client import MikrotikClient
    from .intelbras_client import IntelbrasClient
    from .hikvision_client import HikvisionClient
    
    fab = (fabricante or "").lower()
    
    # Mikrotik
    if device_type == DeviceType.MIKROTIK or "mikrotik" in fab:
        return MikrotikClient(
            ip=ip,
            username=username,
            password=password,
            ssh_port=kwargs.get("ssh_port", 22),
            api_port=kwargs.get("api_port", 8728),
            use_api=kwargs.get("use_api", True)
        )
    
    # Intelbras/Dahua
    if any(x in fab for x in ["intelbras", "dahua"]):
        return IntelbrasClient(
            ip=ip,
            username=username,
            password=password,
            port=port or 80
        )
    
    # Hikvision
    if "hikvision" in fab:
        return HikvisionClient(
            ip=ip,
            username=username,
            password=password,
            port=port or 80
        )
    
    # Por tipo de dispositivo
    if device_type in (DeviceType.NVR, DeviceType.DVR, DeviceType.CAMERA):
        # Tenta Intelbras por padrão
        return IntelbrasClient(
            ip=ip,
            username=username,
            password=password,
            port=port or 80
        )
    
    if device_type == DeviceType.ROUTER:
        # Tenta Mikrotik por padrão
        return MikrotikClient(
            ip=ip,
            username=username,
            password=password
        )
    
    # Genérico
    return GenericDeviceClient(
        ip=ip,
        username=username,
        password=password,
        port=port or 80
    )


async def auto_detect_and_connect(
    ip: str,
    username: str = "admin",
    password: str = "admin"
) -> Optional[BaseDeviceClient]:
    """
    Detecta automaticamente o tipo e conecta.
    
    Tenta diferentes clientes até encontrar um que funcione.
    """
    from .mikrotik_client import MikrotikClient
    from .intelbras_client import IntelbrasClient
    from .hikvision_client import HikvisionClient
    
    clients_to_try = [
        IntelbrasClient(ip, username, password),
        HikvisionClient(ip, username, password),
        MikrotikClient(ip, username, password),
        GenericDeviceClient(ip, username, password),
    ]
    
    for client in clients_to_try:
        try:
            status = await client.connect()
            if status == ConnectionStatus.CONNECTED:
                logger.info(f"Conectado a {ip} usando {client.__class__.__name__}")
                return client
            await client.disconnect()
        except:
            continue
    
    return None
