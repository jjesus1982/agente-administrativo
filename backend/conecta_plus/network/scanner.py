# -*- coding: utf-8 -*-
"""
Network Scanner
===============

Scanner de rede usando nmap para descoberta de dispositivos.
Identifica IP, MAC, vendor, hostname e portas abertas.
"""

from __future__ import annotations
import asyncio
import logging
import re
from typing import List, Optional, Dict
from datetime import datetime

from .schemas import (
    DiscoveredDevice,
    DeviceType,
    NetworkScanRequest,
    NetworkScanResult,
)

logger = logging.getLogger(__name__)


# =============================================================================
# BANCO DE OUI (Fabricantes por MAC)
# =============================================================================

OUI_DATABASE: Dict[str, str] = {
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
    "E0:AB:FE": "Hikvision",
    
    # Dahua
    "3C:EF:8C": "Dahua",
    "4C:11:BF": "Dahua",
    "90:02:A9": "Dahua",
    "E0:50:8B": "Dahua",
    "A0:BD:1D": "Dahua",
    
    # Control iD
    "00:17:61": "Control iD",
    "00:04:A3": "Control iD",
    
    # Mikrotik
    "00:0C:42": "Mikrotik",
    "48:8F:5A": "Mikrotik",
    "64:D1:54": "Mikrotik",
    "CC:2D:E0": "Mikrotik",
    "E4:8D:8C": "Mikrotik",
    "74:4D:28": "Mikrotik",
    "D4:01:C3": "Mikrotik",
    "2C:C8:1B": "Mikrotik",
    "B8:69:F4": "Mikrotik",
    
    # Ubiquiti
    "00:27:22": "Ubiquiti",
    "04:18:D6": "Ubiquiti",
    "24:A4:3C": "Ubiquiti",
    "44:D9:E7": "Ubiquiti",
    "68:72:51": "Ubiquiti",
    "80:2A:A8": "Ubiquiti",
    "F0:9F:C2": "Ubiquiti",
    "FC:EC:DA": "Ubiquiti",
    
    # TP-Link
    "00:31:92": "TP-Link",
    "14:CC:20": "TP-Link",
    "50:C7:BF": "TP-Link",
    "64:70:02": "TP-Link",
    "98:DA:C4": "TP-Link",
    "B0:BE:76": "TP-Link",
    
    # Cisco
    "00:00:0C": "Cisco",
    "00:1B:D4": "Cisco",
    "00:26:0B": "Cisco",
    "00:1A:A1": "Cisco",
    
    # Linear/Nice
    "00:1E:C0": "Linear",
    "00:1B:C5": "Nice",
    
    # PPA/Garen
    "00:80:A3": "PPA",
    
    # Axis
    "00:40:8C": "Axis",
    "AC:CC:8E": "Axis",
    
    # Bosch
    "00:07:5F": "Bosch",
    "00:04:64": "Bosch",
    
    # Samsung/Hanwha
    "00:09:18": "Samsung",
    "00:16:6C": "Samsung",
    "F0:25:B7": "Samsung",
    
    # Vivotek
    "00:02:D1": "Vivotek",
    
    # ZKTeco
    "00:17:61": "ZKTeco",
    "E0:37:17": "ZKTeco",
}


# Portas típicas por tipo de dispositivo
DEVICE_PORT_SIGNATURES: Dict[str, List[int]] = {
    "nvr": [80, 443, 8000, 37777, 554],
    "camera": [80, 443, 554, 8080],
    "access_controller": [80, 443, 4370, 5000, 5005],
    "router": [80, 443, 8291, 8728, 22],
    "switch": [80, 443, 22, 23],
    "intercom": [80, 443, 5060, 5061],
}


class NetworkScanner:
    """
    Scanner de rede para descoberta de dispositivos.
    
    Usa nmap quando disponível, com fallback para ping/ARP.
    """
    
    def __init__(self, timeout: float = 2.0, max_concurrent: int = 50):
        self.timeout = timeout
        self.max_concurrent = max_concurrent
        self._nmap_available = self._check_nmap()
    
    def _check_nmap(self) -> bool:
        """Verifica se nmap está disponível."""
        import shutil
        return shutil.which("nmap") is not None
    
    async def scan(self, request: NetworkScanRequest) -> NetworkScanResult:
        """
        Executa scan de rede.
        
        Args:
            request: Parâmetros do scan.
        
        Returns:
            NetworkScanResult com dispositivos encontrados.
        """
        result = NetworkScanResult(
            condominio_nome=request.condominio_nome,
            subnets=request.subnets,
            started_at=datetime.now()
        )
        
        logger.info(f"Iniciando scan para {request.condominio_nome}: {request.subnets}")
        
        all_devices: List[DiscoveredDevice] = []
        total_hosts = 0
        
        for subnet in request.subnets:
            try:
                if self._nmap_available:
                    devices, hosts = await self._scan_with_nmap(
                        subnet, 
                        request.scan_ports,
                        request.port_list
                    )
                else:
                    devices, hosts = await self._scan_with_ping(subnet)
                
                all_devices.extend(devices)
                total_hosts += hosts
                
            except Exception as e:
                logger.error(f"Erro ao escanear {subnet}: {e}")
                result.notes = f"Erro em {subnet}: {e}"
        
        result.devices = all_devices
        result.total_hosts_scanned = total_hosts
        result.total_devices_found = len(all_devices)
        result.finished_at = datetime.now()
        result.duration_seconds = (result.finished_at - result.started_at).total_seconds()
        
        logger.info(
            f"Scan concluído: {result.total_devices_found} dispositivos "
            f"em {result.duration_seconds:.1f}s"
        )
        
        return result
    
    async def _scan_with_nmap(
        self, 
        subnet: str, 
        scan_ports: bool,
        port_list: List[int]
    ) -> tuple[List[DiscoveredDevice], int]:
        """Scan usando nmap."""
        devices: List[DiscoveredDevice] = []
        
        # Comando nmap
        if scan_ports:
            ports_str = ",".join(map(str, port_list))
            cmd = f"nmap -sn -PS{ports_str} --open -oX - {subnet}"
        else:
            cmd = f"nmap -sn -oX - {subnet}"
        
        logger.debug(f"Executando: {cmd}")
        
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await proc.communicate()
        
        if proc.returncode != 0:
            logger.warning(f"nmap retornou {proc.returncode}: {stderr.decode()}")
        
        # Parse XML do nmap
        xml_output = stdout.decode()
        devices = self._parse_nmap_xml(xml_output)
        
        # Conta hosts escaneados
        import ipaddress
        try:
            network = ipaddress.ip_network(subnet, strict=False)
            total_hosts = network.num_addresses - 2  # Remove network e broadcast
        except:
            total_hosts = 254
        
        return devices, total_hosts
    
    def _parse_nmap_xml(self, xml_output: str) -> List[DiscoveredDevice]:
        """Parse do XML do nmap."""
        import xml.etree.ElementTree as ET
        
        devices: List[DiscoveredDevice] = []
        
        try:
            root = ET.fromstring(xml_output)
            
            for host in root.findall(".//host"):
                status = host.find("status")
                if status is None or status.get("state") != "up":
                    continue
                
                # IP
                addr_elem = host.find("address[@addrtype='ipv4']")
                if addr_elem is None:
                    continue
                ip = addr_elem.get("addr", "")
                
                # MAC
                mac_elem = host.find("address[@addrtype='mac']")
                mac = mac_elem.get("addr", "") if mac_elem is not None else ""
                vendor = mac_elem.get("vendor", "") if mac_elem is not None else ""
                
                # Se não tiver vendor do nmap, busca no OUI
                if not vendor and mac:
                    vendor = self._get_vendor_from_oui(mac)
                
                # Hostname
                hostname = ""
                hostname_elem = host.find(".//hostname")
                if hostname_elem is not None:
                    hostname = hostname_elem.get("name", "")
                
                # Portas
                open_ports: List[int] = []
                for port in host.findall(".//port"):
                    state = port.find("state")
                    if state is not None and state.get("state") == "open":
                        port_id = port.get("portid")
                        if port_id:
                            open_ports.append(int(port_id))
                
                # Identifica tipo
                device_type = self._guess_device_type(vendor, open_ports)
                
                device = DiscoveredDevice(
                    ip_address=ip,
                    mac_address=mac.upper() if mac else None,
                    vendor=vendor or None,
                    hostname=hostname or None,
                    open_ports=open_ports,
                    device_type=device_type,
                    discovered_at=datetime.now()
                )
                
                devices.append(device)
                
        except ET.ParseError as e:
            logger.error(f"Erro ao parsear XML do nmap: {e}")
        
        return devices
    
    async def _scan_with_ping(self, subnet: str) -> tuple[List[DiscoveredDevice], int]:
        """Scan usando ping (fallback quando nmap não disponível)."""
        import ipaddress
        
        devices: List[DiscoveredDevice] = []
        
        try:
            network = ipaddress.ip_network(subnet, strict=False)
            ips = [str(ip) for ip in network.hosts()]
        except ValueError as e:
            logger.error(f"Subnet inválida: {e}")
            return [], 0
        
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def scan_host(ip: str) -> Optional[DiscoveredDevice]:
            async with semaphore:
                return await self._ping_host(ip)
        
        tasks = [scan_host(ip) for ip in ips]
        results = await asyncio.gather(*tasks)
        
        devices = [d for d in results if d is not None]
        
        return devices, len(ips)
    
    async def _ping_host(self, ip: str) -> Optional[DiscoveredDevice]:
        """Ping em um host específico."""
        try:
            start = asyncio.get_event_loop().time()
            
            proc = await asyncio.create_subprocess_exec(
                "ping", "-c", "1", "-W", "1", ip,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL
            )
            await asyncio.wait_for(proc.wait(), timeout=self.timeout)
            
            if proc.returncode != 0:
                return None
            
            latency = (asyncio.get_event_loop().time() - start) * 1000
            
            # Obtém MAC via ARP
            mac = await self._get_mac_from_arp(ip)
            vendor = self._get_vendor_from_oui(mac) if mac else None
            
            # Scan de portas rápido
            open_ports = await self._quick_port_scan(ip)
            
            device_type = self._guess_device_type(vendor, open_ports)
            
            return DiscoveredDevice(
                ip_address=ip,
                mac_address=mac,
                vendor=vendor,
                open_ports=open_ports,
                device_type=device_type,
                response_time_ms=latency,
                discovered_at=datetime.now()
            )
            
        except asyncio.TimeoutError:
            return None
        except Exception:
            return None
    
    async def _get_mac_from_arp(self, ip: str) -> Optional[str]:
        """Obtém MAC address via ARP."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "arp", "-n", ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            stdout, _ = await proc.communicate()
            
            output = stdout.decode()
            mac_match = re.search(r'([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}', output)
            
            if mac_match:
                return mac_match.group().upper().replace("-", ":")
                
        except Exception:
            pass
        
        return None
    
    async def _quick_port_scan(
        self, 
        ip: str, 
        ports: List[int] = None
    ) -> List[int]:
        """Scan rápido de portas."""
        if ports is None:
            ports = [22, 80, 443, 554, 8000, 8080, 8291]
        
        open_ports: List[int] = []
        
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
    
    def _get_vendor_from_oui(self, mac: Optional[str]) -> Optional[str]:
        """Identifica fabricante pelo OUI do MAC."""
        if not mac:
            return None
        
        # Pega os 3 primeiros octetos (OUI)
        oui = mac[:8].upper()
        return OUI_DATABASE.get(oui)
    
    def _guess_device_type(
        self, 
        vendor: Optional[str], 
        open_ports: List[int]
    ) -> DeviceType:
        """Identifica tipo do dispositivo."""
        
        if vendor:
            v = vendor.lower()
            
            # Mikrotik é sempre router
            if "mikrotik" in v:
                return DeviceType.MIKROTIK
            
            # Ubiquiti geralmente é router/switch
            if "ubiquiti" in v:
                return DeviceType.ROUTER
            
            # Control iD / ZKTeco é controladora
            if "control" in v or "zkteco" in v:
                return DeviceType.ACCESS_CONTROLLER
            
            # Linear/Nice/PPA é controladora ou intercom
            if any(x in v for x in ["linear", "nice", "ppa", "garen"]):
                return DeviceType.ACCESS_CONTROLLER
        
        # Por portas
        if 37777 in open_ports or 8000 in open_ports:
            if 554 in open_ports:
                return DeviceType.NVR
        
        if 554 in open_ports and 80 in open_ports:
            if 37777 not in open_ports and 8000 not in open_ports:
                return DeviceType.CAMERA
        
        if 4370 in open_ports or 5000 in open_ports:
            return DeviceType.ACCESS_CONTROLLER
        
        if 8291 in open_ports or 8728 in open_ports:
            return DeviceType.MIKROTIK
        
        if 5060 in open_ports or 5061 in open_ports:
            return DeviceType.INTERCOM
        
        return DeviceType.UNKNOWN
    
    async def identify_device(
        self, 
        ip: str, 
        username: str = "admin",
        password: str = "admin"
    ) -> Optional[DiscoveredDevice]:
        """
        Identifica um dispositivo específico em detalhe.
        
        Args:
            ip: IP do dispositivo.
            username: Usuário para autenticação.
            password: Senha para autenticação.
        
        Returns:
            DiscoveredDevice com detalhes ou None.
        """
        # Primeiro faz ping
        device = await self._ping_host(ip)
        if not device:
            return None
        
        # Tenta identificar modelo conectando no dispositivo
        try:
            if device.vendor:
                v = device.vendor.lower()
                
                if "intelbras" in v or "dahua" in v:
                    info = await self._identify_intelbras(ip, username, password)
                    if info:
                        device.hostname = info.get("modelo")
                        
                elif "hikvision" in v:
                    info = await self._identify_hikvision(ip, username, password)
                    if info:
                        device.hostname = info.get("modelo")
                        
        except Exception as e:
            logger.debug(f"Erro ao identificar {ip}: {e}")
        
        return device
    
    async def _identify_intelbras(
        self, 
        ip: str, 
        user: str, 
        pwd: str
    ) -> Optional[Dict]:
        """Identifica dispositivo Intelbras/Dahua."""
        import aiohttp
        
        try:
            auth = aiohttp.BasicAuth(user, pwd)
            url = f"http://{ip}/cgi-bin/magicBox.cgi?action=getSystemInfo"
            
            async with aiohttp.ClientSession(auth=auth) as session:
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
        
        return None
    
    async def _identify_hikvision(
        self, 
        ip: str, 
        user: str, 
        pwd: str
    ) -> Optional[Dict]:
        """Identifica dispositivo Hikvision."""
        import aiohttp
        
        try:
            # Hikvision usa Digest Auth
            url = f"http://{ip}/ISAPI/System/deviceInfo"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, 
                    auth=aiohttp.BasicAuth(user, pwd),
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        text = await resp.text()
                        
                        modelo = re.search(r'<model>(.+?)</model>', text)
                        firmware = re.search(r'<firmwareVersion>(.+?)</firmwareVersion>', text)
                        
                        return {
                            "modelo": modelo.group(1) if modelo else "",
                            "firmware": firmware.group(1) if firmware else "",
                        }
        except:
            pass
        
        return None
