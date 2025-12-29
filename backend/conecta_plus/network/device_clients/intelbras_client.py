# -*- coding: utf-8 -*-
"""
Intelbras/Dahua Device Client
=============================

Cliente para dispositivos Intelbras (NVR, DVR, câmeras).
Intelbras usa protocolo Dahua internamente.
"""

from __future__ import annotations
import asyncio
import logging
import aiohttp
from typing import Optional

from .base import (
    BaseDeviceClient,
    ConnectionStatus,
    DeviceInfo,
    BackupResult,
    OperationResult,
)
from ..schemas import NetworkConfig

logger = logging.getLogger(__name__)


class IntelbrasClient(BaseDeviceClient):
    """
    Cliente para dispositivos Intelbras/Dahua.
    
    Suporta:
    - NVRs (MHDX, NVD, iNVD)
    - DVRs
    - Câmeras IP (VIP, VHD)
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
    
    # === Conexão ===
    
    async def connect(self) -> ConnectionStatus:
        """Estabelece conexão HTTP."""
        try:
            auth = aiohttp.BasicAuth(self.username, self.password)
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            self._session = aiohttp.ClientSession(
                auth=auth,
                timeout=timeout
            )
            
            # Testa conexão
            url = f"{self.base_url}/cgi-bin/magicBox.cgi?action=getSystemInfo"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    self._connected = True
                    logger.info(f"Conectado ao Intelbras {self.ip}")
                    return ConnectionStatus.CONNECTED
                elif resp.status == 401:
                    return ConnectionStatus.AUTH_FAILED
                else:
                    return ConnectionStatus.ERROR
                    
        except asyncio.TimeoutError:
            return ConnectionStatus.TIMEOUT
        except Exception as e:
            logger.error(f"Erro ao conectar: {e}")
            return ConnectionStatus.ERROR
    
    async def disconnect(self) -> None:
        """Encerra sessão HTTP."""
        if self._session:
            await self._session.close()
            self._session = None
        self._connected = False
    
    async def test_connection(self) -> ConnectionStatus:
        """Testa conexão."""
        if not self._session:
            return ConnectionStatus.DISCONNECTED
        
        try:
            url = f"{self.base_url}/cgi-bin/magicBox.cgi?action=getSystemInfo"
            async with self._session.get(url) as resp:
                return ConnectionStatus.CONNECTED if resp.status == 200 else ConnectionStatus.ERROR
        except:
            return ConnectionStatus.ERROR
    
    # === Informações ===
    
    async def get_device_info(self) -> DeviceInfo:
        """Obtém informações do dispositivo."""
        try:
            url = f"{self.base_url}/cgi-bin/magicBox.cgi?action=getSystemInfo"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    info = self._parse_response(text)
                    
                    return DeviceInfo(
                        modelo=info.get("deviceType", ""),
                        firmware=info.get("softwareVersion", ""),
                        serial=info.get("serialNumber", ""),
                        extra={
                            "hardwareVersion": info.get("hardwareVersion", ""),
                            "macAddress": info.get("macAddress", ""),
                        }
                    )
                    
        except Exception as e:
            logger.error(f"Erro ao obter info: {e}")
        
        return DeviceInfo()
    
    def _parse_response(self, text: str) -> dict:
        """Parse de resposta key=value."""
        result = {}
        for line in text.strip().split('\n'):
            if '=' in line:
                key, value = line.split('=', 1)
                result[key.strip()] = value.strip()
        return result
    
    # === Configuração de Rede ===
    
    async def get_network_config(self) -> NetworkConfig:
        """Obtém configuração de rede."""
        try:
            url = f"{self.base_url}/cgi-bin/configManager.cgi?action=getConfig&name=Network"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    data = self._parse_response(text)
                    
                    config = NetworkConfig()
                    
                    # Busca valores
                    for key, value in data.items():
                        if 'IPAddress' in key and not config.ip_address:
                            config.ip_address = value
                        elif 'SubnetMask' in key and not config.netmask:
                            config.netmask = value
                        elif 'DefaultGateway' in key and not config.gateway:
                            config.gateway = value
                        elif 'DhcpEnable' in key:
                            config.dhcp_enabled = value.lower() == 'true'
                    
                    return config
                    
        except Exception as e:
            logger.error(f"Erro ao obter config: {e}")
        
        return NetworkConfig()
    
    async def set_network_config(self, config: NetworkConfig) -> OperationResult:
        """Aplica configuração de rede."""
        try:
            url = f"{self.base_url}/cgi-bin/configManager.cgi?action=setConfig"
            
            params = {}
            
            if config.ip_address:
                params["Network.eth0.IPAddress"] = config.ip_address
            
            if config.netmask:
                params["Network.eth0.SubnetMask"] = config.netmask
            
            if config.gateway:
                params["Network.eth0.DefaultGateway"] = config.gateway
            
            if config.dns_servers:
                params["Network.eth0.DNS1"] = config.dns_servers[0]
                if len(config.dns_servers) > 1:
                    params["Network.eth0.DNS2"] = config.dns_servers[1]
            
            params["Network.eth0.DhcpEnable"] = str(config.dhcp_enabled).lower()
            
            async with self._session.get(url, params=params) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    if "OK" in text or "ok" in text.lower():
                        return OperationResult(
                            success=True,
                            message="Configuração aplicada com sucesso"
                        )
                
                return OperationResult(
                    success=False,
                    error=f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(
                success=False,
                error=str(e)
            )
    
    # === Operações ===
    
    async def reboot(self) -> OperationResult:
        """Reinicia o dispositivo."""
        try:
            url = f"{self.base_url}/cgi-bin/magicBox.cgi?action=reboot"
            
            async with self._session.get(url) as resp:
                return OperationResult(
                    success=resp.status == 200,
                    message="Reboot iniciado" if resp.status == 200 else f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    async def factory_reset(self) -> OperationResult:
        """Reset de fábrica."""
        try:
            url = f"{self.base_url}/cgi-bin/magicBox.cgi?action=restoreDefault"
            
            async with self._session.get(url) as resp:
                return OperationResult(
                    success=resp.status == 200,
                    message="Factory reset iniciado" if resp.status == 200 else f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    # === Operações específicas CFTV ===
    
    async def get_channels(self) -> list:
        """Lista canais de vídeo."""
        try:
            url = f"{self.base_url}/cgi-bin/configManager.cgi?action=getConfig&name=ChannelTitle"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    data = self._parse_response(text)
                    
                    channels = []
                    for key, value in data.items():
                        if 'Name' in key:
                            channels.append({
                                "key": key,
                                "name": value
                            })
                    
                    return channels
                    
        except Exception as e:
            logger.error(f"Erro ao listar canais: {e}")
        
        return []
    
    async def capture_snapshot(self, channel: int = 1) -> bytes:
        """Captura snapshot de um canal."""
        try:
            url = f"{self.base_url}/cgi-bin/snapshot.cgi?channel={channel}"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    return await resp.read()
                    
        except Exception as e:
            logger.error(f"Erro ao capturar snapshot: {e}")
        
        return b""
    
    async def add_remote_device(
        self,
        channel: int,
        ip: str,
        port: int = 37777,
        username: str = "admin",
        password: str = "admin"
    ) -> OperationResult:
        """Adiciona dispositivo remoto (câmera) ao NVR."""
        try:
            url = f"{self.base_url}/cgi-bin/configManager.cgi?action=setConfig"
            
            params = {
                f"RemoteDevice[{channel-1}].Enable": "true",
                f"RemoteDevice[{channel-1}].Address": ip,
                f"RemoteDevice[{channel-1}].Port": str(port),
                f"RemoteDevice[{channel-1}].UserName": username,
                f"RemoteDevice[{channel-1}].Password": password,
                f"RemoteDevice[{channel-1}].Protocol": "Private",
                f"RemoteDevice[{channel-1}].VideoInputChannels": "1",
            }
            
            async with self._session.get(url, params=params) as resp:
                if resp.status == 200:
                    return OperationResult(
                        success=True,
                        message=f"Câmera {ip} adicionada no canal {channel}"
                    )
                
                return OperationResult(
                    success=False,
                    error=f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    async def set_ntp(self, server: str = "pool.ntp.org") -> OperationResult:
        """Configura NTP."""
        try:
            url = f"{self.base_url}/cgi-bin/configManager.cgi?action=setConfig"
            
            params = {
                "NTP.Enable": "true",
                "NTP.Address": server,
                "NTP.Port": "123",
                "NTP.UpdatePeriod": "60",
            }
            
            async with self._session.get(url, params=params) as resp:
                return OperationResult(
                    success=resp.status == 200,
                    message="NTP configurado" if resp.status == 200 else f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
