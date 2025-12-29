# -*- coding: utf-8 -*-
"""
Hikvision Device Client
=======================

Cliente para dispositivos Hikvision via ISAPI.
Suporta NVRs, DVRs e câmeras IP.
"""

from __future__ import annotations
import asyncio
import logging
import re
import aiohttp
from typing import Optional
from xml.etree import ElementTree as ET

from .base import (
    BaseDeviceClient,
    ConnectionStatus,
    DeviceInfo,
    BackupResult,
    OperationResult,
)
from ..schemas import NetworkConfig

logger = logging.getLogger(__name__)


class HikvisionClient(BaseDeviceClient):
    """
    Cliente para dispositivos Hikvision.
    
    Usa ISAPI (IP Surveillance API) via HTTP/HTTPS.
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
        """Estabelece conexão."""
        try:
            # Hikvision usa Digest Auth, mas Basic também funciona em muitos casos
            auth = aiohttp.BasicAuth(self.username, self.password)
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            self._session = aiohttp.ClientSession(
                auth=auth,
                timeout=timeout
            )
            
            # Testa conexão
            url = f"{self.base_url}/ISAPI/System/deviceInfo"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    self._connected = True
                    logger.info(f"Conectado ao Hikvision {self.ip}")
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
            url = f"{self.base_url}/ISAPI/System/deviceInfo"
            async with self._session.get(url) as resp:
                return ConnectionStatus.CONNECTED if resp.status == 200 else ConnectionStatus.ERROR
        except:
            return ConnectionStatus.ERROR
    
    # === XML Helpers ===
    
    def _parse_xml(self, text: str) -> dict:
        """Parse XML para dict."""
        result = {}
        try:
            root = ET.fromstring(text)
            for child in root:
                # Remove namespace
                tag = child.tag.split('}')[-1] if '}' in child.tag else child.tag
                result[tag] = child.text
        except:
            pass
        return result
    
    def _extract_xml_value(self, text: str, tag: str) -> str:
        """Extrai valor de um tag XML."""
        match = re.search(f'<{tag}>(.+?)</{tag}>', text, re.IGNORECASE)
        return match.group(1) if match else ""
    
    # === Informações ===
    
    async def get_device_info(self) -> DeviceInfo:
        """Obtém informações do dispositivo."""
        try:
            url = f"{self.base_url}/ISAPI/System/deviceInfo"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    
                    return DeviceInfo(
                        modelo=self._extract_xml_value(text, "model"),
                        firmware=self._extract_xml_value(text, "firmwareVersion"),
                        serial=self._extract_xml_value(text, "serialNumber"),
                        hostname=self._extract_xml_value(text, "deviceName"),
                        extra={
                            "macAddress": self._extract_xml_value(text, "macAddress"),
                            "encoderVersion": self._extract_xml_value(text, "encoderVersion"),
                        }
                    )
                    
        except Exception as e:
            logger.error(f"Erro ao obter info: {e}")
        
        return DeviceInfo()
    
    # === Configuração de Rede ===
    
    async def get_network_config(self) -> NetworkConfig:
        """Obtém configuração de rede."""
        try:
            url = f"{self.base_url}/ISAPI/System/Network/interfaces/1"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    
                    config = NetworkConfig()
                    config.ip_address = self._extract_xml_value(text, "ipAddress")
                    config.netmask = self._extract_xml_value(text, "subnetMask")
                    config.gateway = self._extract_xml_value(text, "DefaultGateway") or \
                                    self._extract_xml_value(text, "ipAddress").rsplit('.', 1)[0] + ".1"
                    
                    dhcp = self._extract_xml_value(text, "addressingType")
                    config.dhcp_enabled = dhcp.lower() == "dynamic"
                    
                    return config
                    
        except Exception as e:
            logger.error(f"Erro ao obter config: {e}")
        
        return NetworkConfig()
    
    async def set_network_config(self, config: NetworkConfig) -> OperationResult:
        """Aplica configuração de rede."""
        try:
            url = f"{self.base_url}/ISAPI/System/Network/interfaces/1"
            
            xml_config = f"""<?xml version="1.0" encoding="UTF-8"?>
<NetworkInterface>
    <IPAddress>
        <ipVersion>v4</ipVersion>
        <addressingType>{"dynamic" if config.dhcp_enabled else "static"}</addressingType>
        <ipAddress>{config.ip_address or ""}</ipAddress>
        <subnetMask>{config.netmask or "255.255.255.0"}</subnetMask>
        <DefaultGateway>
            <ipAddress>{config.gateway or ""}</ipAddress>
        </DefaultGateway>
    </IPAddress>
</NetworkInterface>"""
            
            headers = {"Content-Type": "application/xml"}
            
            async with self._session.put(url, data=xml_config, headers=headers) as resp:
                if resp.status == 200:
                    return OperationResult(
                        success=True,
                        message="Configuração aplicada com sucesso"
                    )
                
                return OperationResult(
                    success=False,
                    error=f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    # === Operações ===
    
    async def reboot(self) -> OperationResult:
        """Reinicia o dispositivo."""
        try:
            url = f"{self.base_url}/ISAPI/System/reboot"
            
            async with self._session.put(url) as resp:
                return OperationResult(
                    success=resp.status == 200,
                    message="Reboot iniciado" if resp.status == 200 else f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    async def factory_reset(self) -> OperationResult:
        """Reset de fábrica."""
        try:
            url = f"{self.base_url}/ISAPI/System/factoryReset"
            
            async with self._session.put(url) as resp:
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
            url = f"{self.base_url}/ISAPI/System/Video/inputs/channels"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    text = await resp.text()
                    channels = []
                    
                    # Parse XML
                    for match in re.finditer(r'<id>(\d+)</id>.*?<name>(.+?)</name>', text, re.DOTALL):
                        channels.append({
                            "id": match.group(1),
                            "name": match.group(2)
                        })
                    
                    return channels
                    
        except Exception as e:
            logger.error(f"Erro ao listar canais: {e}")
        
        return []
    
    async def capture_snapshot(self, channel: int = 1) -> bytes:
        """Captura snapshot de um canal."""
        try:
            url = f"{self.base_url}/ISAPI/Streaming/channels/{channel}01/picture"
            
            async with self._session.get(url) as resp:
                if resp.status == 200:
                    return await resp.read()
                    
        except Exception as e:
            logger.error(f"Erro ao capturar snapshot: {e}")
        
        return b""
    
    async def set_ntp(self, server: str = "pool.ntp.org") -> OperationResult:
        """Configura NTP."""
        try:
            url = f"{self.base_url}/ISAPI/System/time/ntpServers/1"
            
            xml_config = f"""<?xml version="1.0" encoding="UTF-8"?>
<NTPServer>
    <id>1</id>
    <addressingFormatType>hostname</addressingFormatType>
    <hostName>{server}</hostName>
    <portNo>123</portNo>
    <synchronizeInterval>60</synchronizeInterval>
</NTPServer>"""
            
            headers = {"Content-Type": "application/xml"}
            
            async with self._session.put(url, data=xml_config, headers=headers) as resp:
                return OperationResult(
                    success=resp.status == 200,
                    message="NTP configurado" if resp.status == 200 else f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    async def set_timezone(self, timezone: str = "CST-3") -> OperationResult:
        """Configura timezone."""
        try:
            url = f"{self.base_url}/ISAPI/System/time"
            
            xml_config = f"""<?xml version="1.0" encoding="UTF-8"?>
<Time>
    <timeMode>NTP</timeMode>
    <timeZone>{timezone}</timeZone>
</Time>"""
            
            headers = {"Content-Type": "application/xml"}
            
            async with self._session.put(url, data=xml_config, headers=headers) as resp:
                return OperationResult(
                    success=resp.status == 200,
                    message="Timezone configurado" if resp.status == 200 else f"HTTP {resp.status}"
                )
                
        except Exception as e:
            return OperationResult(success=False, error=str(e))
