# -*- coding: utf-8 -*-
"""
Mikrotik Device Client
======================

Cliente para roteadores Mikrotik via SSH e API RouterOS.
Suporta operações de rede, backup e configuração.
"""

from __future__ import annotations
import asyncio
import logging
from typing import Optional, List
from datetime import datetime

from .base import (
    BaseDeviceClient,
    ConnectionStatus,
    DeviceInfo,
    BackupResult,
    OperationResult,
)
from ..schemas import NetworkConfig

logger = logging.getLogger(__name__)


class MikrotikClient(BaseDeviceClient):
    """
    Cliente para Mikrotik RouterOS.
    
    Suporta conexão via:
    - SSH (porta 22)
    - API RouterOS (porta 8728)
    """
    
    def __init__(
        self,
        ip: str,
        username: str = "admin",
        password: str = "",
        ssh_port: int = 22,
        api_port: int = 8728,
        timeout: float = 10.0,
        use_api: bool = True
    ):
        super().__init__(ip, username, password, ssh_port, timeout)
        self.ssh_port = ssh_port
        self.api_port = api_port
        self.use_api = use_api
        self._ssh_client = None
        self._api_reader = None
        self._api_writer = None
    
    # === Conexão ===
    
    async def connect(self) -> ConnectionStatus:
        """Estabelece conexão."""
        try:
            if self.use_api:
                return await self._connect_api()
            else:
                return await self._connect_ssh()
        except Exception as e:
            logger.error(f"Erro ao conectar em {self.ip}: {e}")
            return ConnectionStatus.ERROR
    
    async def _connect_api(self) -> ConnectionStatus:
        """Conecta via API RouterOS."""
        try:
            self._api_reader, self._api_writer = await asyncio.wait_for(
                asyncio.open_connection(self.ip, self.api_port),
                timeout=self.timeout
            )
            
            # Login na API
            login_result = await self._api_login()
            
            if login_result:
                self._connected = True
                logger.info(f"Conectado ao Mikrotik {self.ip} via API")
                return ConnectionStatus.CONNECTED
            else:
                return ConnectionStatus.AUTH_FAILED
                
        except asyncio.TimeoutError:
            return ConnectionStatus.TIMEOUT
        except Exception as e:
            logger.error(f"Erro na API: {e}")
            return ConnectionStatus.ERROR
    
    async def _api_login(self) -> bool:
        """Login na API RouterOS."""
        try:
            # Envia comando de login
            login_cmd = f"/login\n=name={self.username}\n=password={self.password}\n"
            
            self._api_writer.write(self._encode_word(login_cmd))
            await self._api_writer.drain()
            
            # Lê resposta
            response = await asyncio.wait_for(
                self._api_reader.read(1024),
                timeout=5
            )
            
            return b"!done" in response
            
        except Exception as e:
            logger.error(f"Erro no login: {e}")
            return False
    
    def _encode_word(self, word: str) -> bytes:
        """Codifica palavra para API RouterOS."""
        # Simplificado - em produção usar protocolo completo
        return word.encode('utf-8')
    
    async def _connect_ssh(self) -> ConnectionStatus:
        """Conecta via SSH."""
        try:
            import paramiko
            
            self._ssh_client = paramiko.SSHClient()
            self._ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            self._ssh_client.connect(
                self.ip,
                port=self.ssh_port,
                username=self.username,
                password=self.password,
                timeout=self.timeout
            )
            
            self._connected = True
            logger.info(f"Conectado ao Mikrotik {self.ip} via SSH")
            return ConnectionStatus.CONNECTED
            
        except Exception as e:
            logger.error(f"Erro SSH: {e}")
            if "Authentication" in str(e):
                return ConnectionStatus.AUTH_FAILED
            return ConnectionStatus.ERROR
    
    async def disconnect(self) -> None:
        """Encerra conexão."""
        if self._api_writer:
            self._api_writer.close()
            try:
                await self._api_writer.wait_closed()
            except:
                pass
            self._api_writer = None
            self._api_reader = None
        
        if self._ssh_client:
            self._ssh_client.close()
            self._ssh_client = None
        
        self._connected = False
    
    async def test_connection(self) -> ConnectionStatus:
        """Testa conexão."""
        if not self._connected:
            return ConnectionStatus.DISCONNECTED
        
        try:
            # Executa comando simples
            result = await self._run_command("/system identity print")
            return ConnectionStatus.CONNECTED if result else ConnectionStatus.ERROR
        except:
            return ConnectionStatus.ERROR
    
    # === Comandos ===
    
    async def _run_command(self, command: str) -> str:
        """Executa comando no Mikrotik."""
        if self.use_api and self._api_writer:
            return await self._run_api_command(command)
        elif self._ssh_client:
            return await self._run_ssh_command(command)
        else:
            raise Exception("Não conectado")
    
    async def _run_api_command(self, command: str) -> str:
        """Executa comando via API."""
        try:
            self._api_writer.write(self._encode_word(command + "\n"))
            await self._api_writer.drain()
            
            response = await asyncio.wait_for(
                self._api_reader.read(4096),
                timeout=self.timeout
            )
            
            return response.decode('utf-8', errors='ignore')
            
        except Exception as e:
            logger.error(f"Erro no comando API: {e}")
            return ""
    
    async def _run_ssh_command(self, command: str) -> str:
        """Executa comando via SSH."""
        try:
            stdin, stdout, stderr = self._ssh_client.exec_command(command)
            output = stdout.read().decode('utf-8', errors='ignore')
            return output
        except Exception as e:
            logger.error(f"Erro no comando SSH: {e}")
            return ""
    
    # === Informações ===
    
    async def get_device_info(self) -> DeviceInfo:
        """Obtém informações do Mikrotik."""
        try:
            identity = await self._run_command("/system identity print")
            resource = await self._run_command("/system resource print")
            routerboard = await self._run_command("/system routerboard print")
            
            # Parse básico
            info = DeviceInfo(
                hostname=self._parse_value(identity, "name"),
                modelo=self._parse_value(routerboard, "model"),
                firmware=self._parse_value(resource, "version"),
                uptime=self._parse_value(resource, "uptime"),
            )
            
            return info
            
        except Exception as e:
            logger.error(f"Erro ao obter info: {e}")
            return DeviceInfo()
    
    def _parse_value(self, output: str, key: str) -> str:
        """Extrai valor de saída do RouterOS."""
        for line in output.split('\n'):
            if key in line.lower():
                parts = line.split(':', 1)
                if len(parts) == 2:
                    return parts[1].strip()
                parts = line.split('=', 1)
                if len(parts) == 2:
                    return parts[1].strip()
        return ""
    
    # === Configuração de Rede ===
    
    async def get_network_config(self) -> NetworkConfig:
        """Obtém configuração de rede."""
        try:
            # Obtém IPs
            ip_output = await self._run_command("/ip address print detail")
            
            # Obtém rotas
            route_output = await self._run_command("/ip route print where dst-address=0.0.0.0/0")
            
            # Obtém DNS
            dns_output = await self._run_command("/ip dns print")
            
            # Parse
            config = NetworkConfig()
            
            # Parse IP (pega o primeiro)
            for line in ip_output.split('\n'):
                if 'address=' in line:
                    addr = self._parse_value(line, 'address')
                    if '/' in addr:
                        ip, cidr = addr.split('/')
                        config.ip_address = ip
                        # Converte CIDR para netmask
                        config.netmask = self._cidr_to_netmask(int(cidr))
                    break
            
            # Parse gateway
            for line in route_output.split('\n'):
                if 'gateway=' in line:
                    config.gateway = self._parse_value(line, 'gateway')
                    break
            
            # Parse DNS
            for line in dns_output.split('\n'):
                if 'servers=' in line:
                    servers = self._parse_value(line, 'servers')
                    config.dns_servers = [s.strip() for s in servers.split(',')]
                    break
            
            return config
            
        except Exception as e:
            logger.error(f"Erro ao obter config: {e}")
            return NetworkConfig()
    
    def _cidr_to_netmask(self, cidr: int) -> str:
        """Converte CIDR para netmask."""
        masks = {
            8: "255.0.0.0",
            16: "255.255.0.0",
            20: "255.255.240.0",
            21: "255.255.248.0",
            22: "255.255.252.0",
            23: "255.255.254.0",
            24: "255.255.255.0",
            25: "255.255.255.128",
            26: "255.255.255.192",
            27: "255.255.255.224",
            28: "255.255.255.240",
            29: "255.255.255.248",
            30: "255.255.255.252",
        }
        return masks.get(cidr, "255.255.255.0")
    
    async def set_network_config(self, config: NetworkConfig) -> OperationResult:
        """Aplica configuração de rede."""
        try:
            commands = []
            
            # Adiciona IP
            if config.ip_address and config.netmask:
                cidr = self._netmask_to_cidr(config.netmask)
                commands.append(
                    f"/ip address add address={config.ip_address}/{cidr} interface=bridge"
                )
            
            # Adiciona rota padrão
            if config.gateway:
                commands.append(
                    f"/ip route add dst-address=0.0.0.0/0 gateway={config.gateway}"
                )
            
            # Configura DNS
            if config.dns_servers:
                dns_list = ",".join(config.dns_servers)
                commands.append(f"/ip dns set servers={dns_list}")
            
            # Cria VLAN se especificado
            if config.vlan_id:
                commands.append(
                    f"/interface vlan add name=vlan{config.vlan_id} vlan-id={config.vlan_id} interface=ether1"
                )
            
            # Executa comandos
            for cmd in commands:
                result = await self._run_command(cmd)
                logger.debug(f"Comando: {cmd} -> {result}")
            
            return OperationResult(
                success=True,
                message=f"Configuração aplicada: {len(commands)} comandos"
            )
            
        except Exception as e:
            return OperationResult(
                success=False,
                error=str(e)
            )
    
    def _netmask_to_cidr(self, netmask: str) -> int:
        """Converte netmask para CIDR."""
        masks = {
            "255.0.0.0": 8,
            "255.255.0.0": 16,
            "255.255.240.0": 20,
            "255.255.248.0": 21,
            "255.255.252.0": 22,
            "255.255.254.0": 23,
            "255.255.255.0": 24,
            "255.255.255.128": 25,
            "255.255.255.192": 26,
            "255.255.255.224": 27,
            "255.255.255.240": 28,
            "255.255.255.248": 29,
            "255.255.255.252": 30,
        }
        return masks.get(netmask, 24)
    
    # === Backup ===
    
    async def backup_config(self) -> BackupResult:
        """Realiza backup da configuração."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"conectaplus_{timestamp}"
            
            # Cria backup
            result = await self._run_command(f'/system backup save name="{backup_name}"')
            
            # Também exporta config em texto
            export_result = await self._run_command("/export")
            
            return BackupResult(
                success=True,
                backup_id=backup_name,
                backup_path=f"{backup_name}.backup",
                backup_data=export_result.encode('utf-8')
            )
            
        except Exception as e:
            return BackupResult(
                success=False,
                error=str(e)
            )
    
    async def restore_config(self, backup_id: str) -> OperationResult:
        """Restaura configuração."""
        try:
            result = await self._run_command(f'/system backup load name="{backup_id}"')
            
            return OperationResult(
                success=True,
                message=f"Backup {backup_id} restaurado"
            )
            
        except Exception as e:
            return OperationResult(
                success=False,
                error=str(e)
            )
    
    # === Operações ===
    
    async def reboot(self) -> OperationResult:
        """Reinicia o Mikrotik."""
        try:
            await self._run_command("/system reboot")
            return OperationResult(success=True, message="Reboot iniciado")
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    # === Operações específicas Mikrotik ===
    
    async def create_vlan(self, vlan_id: int, name: str, interface: str = "ether1") -> OperationResult:
        """Cria uma VLAN."""
        try:
            cmd = f"/interface vlan add name={name} vlan-id={vlan_id} interface={interface}"
            await self._run_command(cmd)
            return OperationResult(success=True, message=f"VLAN {vlan_id} criada")
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    async def add_firewall_rule(
        self, 
        chain: str, 
        action: str, 
        src_address: str = None,
        dst_port: int = None,
        protocol: str = None,
        comment: str = ""
    ) -> OperationResult:
        """Adiciona regra de firewall."""
        try:
            cmd = f"/ip firewall filter add chain={chain} action={action}"
            
            if src_address:
                cmd += f" src-address={src_address}"
            if dst_port:
                cmd += f" dst-port={dst_port}"
            if protocol:
                cmd += f" protocol={protocol}"
            if comment:
                cmd += f' comment="{comment}"'
            
            await self._run_command(cmd)
            return OperationResult(success=True, message="Regra adicionada")
            
        except Exception as e:
            return OperationResult(success=False, error=str(e))
    
    async def get_interfaces(self) -> List[dict]:
        """Lista interfaces."""
        try:
            output = await self._run_command("/interface print")
            # Parse simplificado
            interfaces = []
            for line in output.split('\n'):
                if 'ether' in line or 'bridge' in line or 'vlan' in line:
                    interfaces.append({"name": line.strip()})
            return interfaces
        except:
            return []
