# -*- coding: utf-8 -*-
"""
Scanner de Rede
===============

Descobre dispositivos na rede automaticamente.
Identifica fabricante, tipo e status.
"""

from __future__ import annotations
import asyncio
import socket
import struct
import subprocess
import re
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from datetime import datetime
import ipaddress

logger = logging.getLogger(__name__)


# =============================================================================
# BANCO DE OUI (Fabricantes por MAC)
# =============================================================================

OUI_DATABASE = {
    # Intelbras
    "00:1A:3F": "Intelbras",
    "78:C2:C0": "Intelbras",
    "E0:37:17": "Intelbras",
    "38:91:B7": "Intelbras",
    "94:3A:F0": "Intelbras",
    "5C:A1:E0": "Intelbras",
    
    # Hikvision
    "C0:56:E3": "Hikvision",
    "54:C4:15": "Hikvision",
    "BC:AD:28": "Hikvision",
    "44:19:B6": "Hikvision",
    "A4:14:37": "Hikvision",
    "28:57:BE": "Hikvision",
    "C4:2F:90": "Hikvision",
    
    # Dahua
    "3C:EF:8C": "Dahua",
    "4C:11:BF": "Dahua",
    "90:02:A9": "Dahua",
    "E0:50:8B": "Dahua",
    "A0:BD:1D": "Dahua",
    
    # Control iD
    "00:17:61": "Control iD",
    
    # Mikrotik
    "00:0C:42": "Mikrotik",
    "48:8F:5A": "Mikrotik",
    "64:D1:54": "Mikrotik",
    "CC:2D:E0": "Mikrotik",
    "E4:8D:8C": "Mikrotik",
    "74:4D:28": "Mikrotik",
    "D4:01:C3": "Mikrotik",
    
    # Ubiquiti
    "00:27:22": "Ubiquiti",
    "04:18:D6": "Ubiquiti",
    "24:A4:3C": "Ubiquiti",
    "44:D9:E7": "Ubiquiti",
    "68:72:51": "Ubiquiti",
    "80:2A:A8": "Ubiquiti",
    "F0:9F:C2": "Ubiquiti",
    
    # TP-Link
    "00:31:92": "TP-Link",
    "14:CC:20": "TP-Link",
    "50:C7:BF": "TP-Link",
    "64:70:02": "TP-Link",
    "98:DA:C4": "TP-Link",
    
    # Cisco
    "00:00:0C": "Cisco",
    "00:1B:D4": "Cisco",
    "00:26:0B": "Cisco",
    
    # Linear/Nice
    "00:1E:C0": "Linear",
    
    # PPA/Garen
    "00:80:A3": "PPA",
}

# Portas típicas por tipo de dispositivo
DEVICE_PORT_SIGNATURES = {
    "nvr": [80, 443, 8000, 37777, 554],
    "camera": [80, 443, 554, 8080],
    "controladora": [80, 443, 4370, 5000],
    "router": [80, 443, 8291, 8728, 22],
    "switch": [80, 443, 22, 23],
    "intercom": [80, 443, 5060, 5061],
}


class TipoDispositivo(str, Enum):
    NVR = "nvr"
    CAMERA = "camera"
    CONTROLADORA = "controladora"
    ROUTER = "router"
    SWITCH = "switch"
    INTERCOM = "intercom"
    UNKNOWN = "unknown"


@dataclass
class DispositivoEncontrado:
    """Dispositivo encontrado no scan."""
    ip: str
    mac: str = ""
    fabricante: str = "Desconhecido"
    tipo: TipoDispositivo = TipoDispositivo.UNKNOWN
    hostname: str = ""
    portas_abertas: List[int] = field(default_factory=list)
    modelo: str = ""
    firmware: str = ""
    online: bool = True
    resposta_ms: float = 0
    descoberto_em: datetime = field(default_factory=datetime.now)
    metadata: Dict = field(default_factory=dict)


class NetworkScanner:
    """Scanner de rede para descoberta de dispositivos."""
    
    def __init__(self, timeout: float = 2.0, max_concurrent: int = 50):
        self.timeout = timeout
        self.max_concurrent = max_concurrent
    
    async def scan_range(self, cidr: str) -> List[DispositivoEncontrado]:
        """
        Escaneia um range de IPs.
        
        Args:
            cidr: Range em formato CIDR (ex: 192.168.1.0/24)
        
        Returns:
            Lista de dispositivos encontrados.
        """
        logger.info(f"Iniciando scan de {cidr}")
        
        try:
            network = ipaddress.ip_network(cidr, strict=False)
        except ValueError as e:
            logger.error(f"CIDR inválido: {e}")
            return []
        
        # Lista de IPs para escanear
        ips = [str(ip) for ip in network.hosts()]
        logger.info(f"Escaneando {len(ips)} IPs...")
        
        # Scan paralelo com semáforo
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def scan_with_semaphore(ip: str):
            async with semaphore:
                return await self._scan_host(ip)
        
        tasks = [scan_with_semaphore(ip) for ip in ips]
        results = await asyncio.gather(*tasks)
        
        # Filtra apenas dispositivos encontrados
        dispositivos = [d for d in results if d is not None]
        
        logger.info(f"Scan completo: {len(dispositivos)} dispositivos encontrados")
        return dispositivos
    
    async def _scan_host(self, ip: str) -> Optional[DispositivoEncontrado]:
        """Escaneia um host específico."""
        
        # 1. Ping para verificar se está online
        is_online, latency = await self._ping(ip)
        if not is_online:
            return None
        
        # 2. Obtém MAC address
        mac = await self._get_mac(ip)
        
        # 3. Identifica fabricante pelo MAC
        fabricante = self._identificar_fabricante(mac)
        
        # 4. Escaneia portas para identificar tipo
        portas = await self._scan_ports(ip)
        
        # 5. Determina tipo do dispositivo
        tipo = self._identificar_tipo(portas, fabricante)
        
        # 6. Tenta obter hostname
        hostname = await self._get_hostname(ip)
        
        dispositivo = DispositivoEncontrado(
            ip=ip,
            mac=mac,
            fabricante=fabricante,
            tipo=tipo,
            hostname=hostname,
            portas_abertas=portas,
            online=True,
            resposta_ms=latency
        )
        
        logger.debug(f"Encontrado: {ip} - {fabricante} ({tipo.value})")
        return dispositivo
    
    async def _ping(self, ip: str) -> Tuple[bool, float]:
        """Ping no host, retorna (online, latency_ms)."""
        try:
            start = asyncio.get_event_loop().time()
            
            # Usa ping do sistema
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "1", ip,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await asyncio.wait_for(proc.wait(), timeout=self.timeout)
            
            latency = (asyncio.get_event_loop().time() - start) * 1000
            return proc.returncode == 0, latency
            
        except asyncio.TimeoutError:
            return False, 0
        except Exception:
            return False, 0
    
    async def _get_mac(self, ip: str) -> str:
        """Obtém MAC address via ARP."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "arp", "-n", ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            
            # Parse output
            output = stdout.decode()
            mac_match = re.search(r'([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}', output)
            if mac_match:
                return mac_match.group().upper().replace("-", ":")
            
        except Exception:
            pass
        
        return ""
    
    def _identificar_fabricante(self, mac: str) -> str:
        """Identifica fabricante pelo OUI do MAC."""
        if not mac:
            return "Desconhecido"
        
        # Pega os 3 primeiros octetos (OUI)
        oui = mac[:8].upper()
        
        return OUI_DATABASE.get(oui, "Desconhecido")
    
    async def _scan_ports(self, ip: str, ports: List[int] = None) -> List[int]:
        """Escaneia portas comuns."""
        if ports is None:
            ports = [22, 23, 80, 443, 554, 4370, 5000, 5060, 8000, 8080, 8291, 8728, 37777]
        
        open_ports = []
        
        async def check_port(port: int) -> Optional[int]:
            try:
                _, writer = await asyncio.wait_for(
                    asyncio.open_connection(ip, port),
                    timeout=0.5
                )
                writer.close()
                await writer.wait_closed()
                return port
            except:
                return None
        
        tasks = [check_port(p) for p in ports]
        results = await asyncio.gather(*tasks)
        
        return [p for p in results if p is not None]
    
    def _identificar_tipo(self, portas: List[int], fabricante: str) -> TipoDispositivo:
        """Identifica tipo do dispositivo pelas portas e fabricante."""
        
        # Mikrotik é sempre router
        if fabricante == "Mikrotik":
            return TipoDispositivo.ROUTER
        
        # Ubiquiti geralmente é router/switch
        if fabricante == "Ubiquiti":
            return TipoDispositivo.ROUTER
        
        # Control iD é controladora
        if fabricante == "Control iD":
            return TipoDispositivo.CONTROLADORA
        
        # Linear/PPA é controladora ou intercom
        if fabricante in ("Linear", "PPA"):
            return TipoDispositivo.CONTROLADORA
        
        # Por portas
        if 37777 in portas or 8000 in portas:
            # Porta típica de NVR Dahua/Intelbras
            if 554 in portas:
                return TipoDispositivo.NVR
        
        if 554 in portas and 80 in portas:
            # RTSP + HTTP = câmera
            if 37777 not in portas and 8000 not in portas:
                return TipoDispositivo.CAMERA
        
        if 4370 in portas or 5000 in portas:
            # Portas de controladoras
            return TipoDispositivo.CONTROLADORA
        
        if 8291 in portas or 8728 in portas:
            # Winbox/API Mikrotik
            return TipoDispositivo.ROUTER
        
        if 5060 in portas or 5061 in portas:
            # SIP
            return TipoDispositivo.INTERCOM
        
        return TipoDispositivo.UNKNOWN
    
    async def _get_hostname(self, ip: str) -> str:
        """Tenta resolver hostname reverso."""
        try:
            hostname, _, _ = await asyncio.get_event_loop().run_in_executor(
                None, socket.gethostbyaddr, ip
            )
            return hostname
        except:
            return ""
    
    async def identify_device(self, ip: str, credenciais: Dict) -> DispositivoEncontrado:
        """
        Identifica dispositivo em detalhe, conectando nele.
        
        Args:
            ip: IP do dispositivo.
            credenciais: Dict com usuario e senha.
        
        Returns:
            DispositivoEncontrado com detalhes (modelo, firmware).
        """
        # Primeiro faz scan básico
        dispositivo = await self._scan_host(ip)
        if not dispositivo:
            return None
        
        # Tenta identificar modelo e firmware conectando no dispositivo
        try:
            if dispositivo.fabricante == "Intelbras":
                info = await self._identify_intelbras(ip, credenciais)
            elif dispositivo.fabricante == "Hikvision":
                info = await self._identify_hikvision(ip, credenciais)
            elif dispositivo.fabricante == "Mikrotik":
                info = await self._identify_mikrotik(ip, credenciais)
            else:
                info = {}
            
            dispositivo.modelo = info.get("modelo", "")
            dispositivo.firmware = info.get("firmware", "")
            dispositivo.metadata = info
            
        except Exception as e:
            logger.warning(f"Erro ao identificar {ip}: {e}")
        
        return dispositivo
    
    async def _identify_intelbras(self, ip: str, creds: Dict) -> Dict:
        """Identifica dispositivo Intelbras via API."""
        import aiohttp
        
        try:
            auth = aiohttp.BasicAuth(creds.get("usuario", "admin"), creds.get("senha", "admin"))
            
            async with aiohttp.ClientSession(auth=auth) as session:
                # Tenta API Dahua (usada pela Intelbras)
                url = f"http://{ip}/cgi-bin/magicBox.cgi?action=getSystemInfo"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        info = {}
                        for line in text.strip().split('\n'):
                            if '=' in line:
                                k, v = line.split('=', 1)
                                info[k.strip()] = v.strip()
                        
                        return {
                            "modelo": info.get("deviceType", ""),
                            "firmware": info.get("softwareVersion", ""),
                            "serial": info.get("serialNumber", ""),
                        }
        except:
            pass
        
        return {}
    
    async def _identify_hikvision(self, ip: str, creds: Dict) -> Dict:
        """Identifica dispositivo Hikvision via ISAPI."""
        import aiohttp
        from aiohttp import DigestAuth
        
        try:
            auth = DigestAuth(creds.get("usuario", "admin"), creds.get("senha", "admin"))
            
            async with aiohttp.ClientSession() as session:
                url = f"http://{ip}/ISAPI/System/deviceInfo"
                async with session.get(url, auth=auth, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        # Parse XML simplificado
                        modelo = re.search(r'<model>(.+?)</model>', text)
                        firmware = re.search(r'<firmwareVersion>(.+?)</firmwareVersion>', text)
                        serial = re.search(r'<serialNumber>(.+?)</serialNumber>', text)
                        
                        return {
                            "modelo": modelo.group(1) if modelo else "",
                            "firmware": firmware.group(1) if firmware else "",
                            "serial": serial.group(1) if serial else "",
                        }
        except:
            pass
        
        return {}
    
    async def _identify_mikrotik(self, ip: str, creds: Dict) -> Dict:
        """Identifica Mikrotik via API."""
        try:
            # Conexão simples na API
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, 8728),
                timeout=3
            )
            writer.close()
            await writer.wait_closed()
            
            return {
                "modelo": "RouterOS",
                "firmware": "N/A",
                "api_port": 8728
            }
        except:
            pass
        
        return {}
