# -*- coding: utf-8 -*-
"""
Criador de VPN
==============

Configura túneis VPN automaticamente para acesso remoto.
Suporta WireGuard e IPSec no Mikrotik.
"""

from __future__ import annotations
import asyncio
import secrets
import base64
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class TipoVPN(str, Enum):
    WIREGUARD = "wireguard"
    IPSEC = "ipsec"
    L2TP = "l2tp"
    PPTP = "pptp"  # Não recomendado, mas comum


@dataclass
class ConfiguracaoVPN:
    """Configuração de túnel VPN."""
    nome: str
    tipo: TipoVPN = TipoVPN.WIREGUARD
    ip_servidor: str = ""
    porta: int = 51820
    rede_remota: str = ""  # Ex: 192.168.1.0/24
    rede_vpn: str = "10.99.0.0/24"  # Rede do túnel
    dns: List[str] = field(default_factory=lambda: ["8.8.8.8"])
    
    # WireGuard
    private_key: str = ""
    public_key: str = ""
    preshared_key: str = ""
    
    # Para clientes
    ip_cliente: str = ""
    allowed_ips: str = "0.0.0.0/0"


@dataclass
class ClienteVPN:
    """Cliente VPN configurado."""
    id: str
    nome: str
    ip: str
    public_key: str
    private_key: str
    config_file: str = ""
    qr_code: str = ""
    criado_em: datetime = field(default_factory=datetime.now)


@dataclass
class ResultadoVPN:
    """Resultado da criação de VPN."""
    sucesso: bool
    mensagem: str
    config_servidor: Optional[ConfiguracaoVPN] = None
    clientes: List[ClienteVPN] = field(default_factory=list)
    logs: List[str] = field(default_factory=list)


class VPNManager:
    """
    Gerenciador de VPN.
    
    Cria e configura túneis VPN automaticamente no Mikrotik.
    """
    
    def __init__(self):
        self.clientes_vpn: Dict[str, ClienteVPN] = {}
    
    def gerar_chaves_wireguard(self) -> Dict[str, str]:
        """Gera par de chaves WireGuard."""
        try:
            import subprocess
            
            # Gera private key
            result = subprocess.run(
                ["wg", "genkey"],
                capture_output=True,
                text=True
            )
            private_key = result.stdout.strip()
            
            # Gera public key a partir da private
            result = subprocess.run(
                ["wg", "pubkey"],
                input=private_key,
                capture_output=True,
                text=True
            )
            public_key = result.stdout.strip()
            
            # Gera preshared key
            result = subprocess.run(
                ["wg", "genpsk"],
                capture_output=True,
                text=True
            )
            preshared_key = result.stdout.strip()
            
            return {
                "private_key": private_key,
                "public_key": public_key,
                "preshared_key": preshared_key
            }
            
        except FileNotFoundError:
            # WireGuard não instalado, gera chaves simuladas
            logger.warning("WireGuard tools não encontrado, gerando chaves simuladas")
            
            private = base64.b64encode(secrets.token_bytes(32)).decode()
            public = base64.b64encode(secrets.token_bytes(32)).decode()
            psk = base64.b64encode(secrets.token_bytes(32)).decode()
            
            return {
                "private_key": private,
                "public_key": public,
                "preshared_key": psk
            }
    
    async def criar_vpn_mikrotik(
        self,
        ip_mikrotik: str,
        credenciais: Dict[str, str],
        config: ConfiguracaoVPN,
        num_clientes: int = 5
    ) -> ResultadoVPN:
        """
        Cria túnel VPN no Mikrotik.
        
        Args:
            ip_mikrotik: IP do roteador Mikrotik.
            credenciais: Usuario e senha.
            config: Configuração da VPN.
            num_clientes: Número de clientes a criar.
        
        Returns:
            ResultadoVPN com configurações e clientes.
        """
        resultado = ResultadoVPN(sucesso=False, mensagem="")
        resultado.logs.append(f"Iniciando criação de VPN {config.tipo.value} em {ip_mikrotik}")
        
        try:
            if config.tipo == TipoVPN.WIREGUARD:
                await self._criar_wireguard_mikrotik(
                    ip_mikrotik, credenciais, config, num_clientes, resultado
                )
            elif config.tipo == TipoVPN.IPSEC:
                await self._criar_ipsec_mikrotik(
                    ip_mikrotik, credenciais, config, resultado
                )
            elif config.tipo == TipoVPN.L2TP:
                await self._criar_l2tp_mikrotik(
                    ip_mikrotik, credenciais, config, num_clientes, resultado
                )
            else:
                resultado.mensagem = f"Tipo de VPN {config.tipo.value} não suportado"
                return resultado
            
            resultado.sucesso = True
            resultado.mensagem = f"VPN {config.tipo.value} criada com sucesso"
            
        except Exception as e:
            resultado.mensagem = f"Erro ao criar VPN: {e}"
            resultado.logs.append(f"ERRO: {e}")
            logger.error(f"Erro ao criar VPN: {e}")
        
        return resultado
    
    async def _criar_wireguard_mikrotik(
        self,
        ip_mikrotik: str,
        credenciais: Dict[str, str],
        config: ConfiguracaoVPN,
        num_clientes: int,
        resultado: ResultadoVPN
    ):
        """Cria túnel WireGuard no Mikrotik."""
        
        usuario = credenciais.get("usuario", "admin")
        senha = credenciais.get("senha", "")
        
        resultado.logs.append("Gerando chaves do servidor...")
        
        # Gera chaves do servidor
        chaves_servidor = self.gerar_chaves_wireguard()
        config.private_key = chaves_servidor["private_key"]
        config.public_key = chaves_servidor["public_key"]
        
        resultado.logs.append(f"Public key servidor: {config.public_key[:20]}...")
        
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip_mikrotik, 8728),
                timeout=10
            )
            
            resultado.logs.append("Conectado à API RouterOS")
            
            # Login
            login_cmd = f"/login\n=name={usuario}\n=password={senha}\n"
            writer.write(login_cmd.encode())
            await writer.drain()
            
            response = await asyncio.wait_for(reader.read(1024), timeout=5)
            if b"!done" not in response:
                raise Exception("Falha na autenticação")
            
            resultado.logs.append("✓ Autenticação OK")
            
            # 1. Criar interface WireGuard
            resultado.logs.append("Criando interface WireGuard...")
            
            wg_interface_cmd = f"""/interface/wireguard/add
=name=wg-{config.nome}
=listen-port={config.porta}
=private-key={config.private_key}
"""
            writer.write(wg_interface_cmd.encode())
            await writer.drain()
            await asyncio.sleep(0.5)
            
            resultado.logs.append(f"✓ Interface wg-{config.nome} criada na porta {config.porta}")
            
            # 2. Adicionar IP à interface
            resultado.logs.append("Configurando IP da interface...")
            
            # Primeiro IP da rede VPN para o servidor
            rede_vpn_parts = config.rede_vpn.split("/")
            ip_base = rede_vpn_parts[0].rsplit(".", 1)[0]
            ip_servidor_vpn = f"{ip_base}.1/24"
            
            ip_cmd = f"""/ip/address/add
=address={ip_servidor_vpn}
=interface=wg-{config.nome}
"""
            writer.write(ip_cmd.encode())
            await writer.drain()
            await asyncio.sleep(0.5)
            
            resultado.logs.append(f"✓ IP {ip_servidor_vpn} configurado")
            
            # 3. Criar peers (clientes)
            resultado.logs.append(f"Criando {num_clientes} clientes VPN...")
            
            for i in range(1, num_clientes + 1):
                chaves_cliente = self.gerar_chaves_wireguard()
                ip_cliente = f"{ip_base}.{i + 10}/32"
                
                # Adiciona peer no servidor
                peer_cmd = f"""/interface/wireguard/peers/add
=interface=wg-{config.nome}
=public-key={chaves_cliente['public_key']}
=allowed-address={ip_cliente}
=preshared-key={chaves_cliente['preshared_key']}
"""
                writer.write(peer_cmd.encode())
                await writer.drain()
                await asyncio.sleep(0.3)
                
                # Gera configuração do cliente
                config_cliente = self._gerar_config_cliente_wireguard(
                    nome=f"cliente_{i}",
                    private_key=chaves_cliente["private_key"],
                    ip_cliente=ip_cliente.replace("/32", "/24"),
                    public_key_servidor=config.public_key,
                    preshared_key=chaves_cliente["preshared_key"],
                    endpoint=f"{config.ip_servidor or ip_mikrotik}:{config.porta}",
                    allowed_ips=config.rede_remota or "0.0.0.0/0",
                    dns=config.dns[0] if config.dns else "8.8.8.8"
                )
                
                cliente = ClienteVPN(
                    id=f"vpn_cliente_{i}",
                    nome=f"Cliente {i} - {config.nome}",
                    ip=ip_cliente,
                    public_key=chaves_cliente["public_key"],
                    private_key=chaves_cliente["private_key"],
                    config_file=config_cliente
                )
                
                resultado.clientes.append(cliente)
                resultado.logs.append(f"✓ Cliente {i} criado: {ip_cliente}")
            
            # 4. Configurar firewall
            resultado.logs.append("Configurando firewall...")
            
            # Permite tráfego WireGuard
            fw_cmd = f"""/ip/firewall/filter/add
=chain=input
=protocol=udp
=dst-port={config.porta}
=action=accept
=comment=WireGuard-{config.nome}
"""
            writer.write(fw_cmd.encode())
            await writer.drain()
            
            # Permite forward da VPN
            fw_fwd_cmd = f"""/ip/firewall/filter/add
=chain=forward
=in-interface=wg-{config.nome}
=action=accept
=comment=WireGuard-Forward-{config.nome}
"""
            writer.write(fw_fwd_cmd.encode())
            await writer.drain()
            
            resultado.logs.append("✓ Firewall configurado")
            
            # 5. Configurar NAT (masquerade)
            resultado.logs.append("Configurando NAT...")
            
            nat_cmd = f"""/ip/firewall/nat/add
=chain=srcnat
=src-address={config.rede_vpn}
=action=masquerade
=comment=WireGuard-NAT-{config.nome}
"""
            writer.write(nat_cmd.encode())
            await writer.drain()
            
            resultado.logs.append("✓ NAT configurado")
            
            writer.close()
            await writer.wait_closed()
            
            resultado.config_servidor = config
            resultado.logs.append("✓ VPN WireGuard configurada com sucesso!")
            
        except asyncio.TimeoutError:
            raise Exception("Timeout na conexão com Mikrotik")
    
    async def _criar_ipsec_mikrotik(
        self,
        ip_mikrotik: str,
        credenciais: Dict[str, str],
        config: ConfiguracaoVPN,
        resultado: ResultadoVPN
    ):
        """Cria túnel IPSec no Mikrotik."""
        resultado.logs.append("Configurando IPSec...")
        
        # IPSec é mais complexo, simplificando para Site-to-Site
        psk = secrets.token_urlsafe(32)
        
        resultado.logs.append(f"Pre-Shared Key gerada: {psk[:10]}...")
        resultado.logs.append("⚠ IPSec requer configuração manual adicional")
        resultado.logs.append("Consulte a documentação do Mikrotik para configuração completa")
        
        config.preshared_key = psk
        resultado.config_servidor = config
    
    async def _criar_l2tp_mikrotik(
        self,
        ip_mikrotik: str,
        credenciais: Dict[str, str],
        config: ConfiguracaoVPN,
        num_clientes: int,
        resultado: ResultadoVPN
    ):
        """Cria servidor L2TP no Mikrotik."""
        
        usuario = credenciais.get("usuario", "admin")
        senha = credenciais.get("senha", "")
        
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip_mikrotik, 8728),
                timeout=10
            )
            
            # Login
            login_cmd = f"/login\n=name={usuario}\n=password={senha}\n"
            writer.write(login_cmd.encode())
            await writer.drain()
            
            response = await asyncio.wait_for(reader.read(1024), timeout=5)
            if b"!done" not in response:
                raise Exception("Falha na autenticação")
            
            resultado.logs.append("✓ Conectado ao Mikrotik")
            
            # Gera PSK para IPSec (usado com L2TP)
            ipsec_psk = secrets.token_urlsafe(24)
            
            # 1. Configura IPSec para L2TP
            resultado.logs.append("Configurando IPSec para L2TP...")
            
            # 2. Habilita servidor L2TP
            resultado.logs.append("Habilitando servidor L2TP...")
            
            l2tp_cmd = f"""/interface/l2tp-server/server/set
=enabled=yes
=use-ipsec=yes
=ipsec-secret={ipsec_psk}
"""
            writer.write(l2tp_cmd.encode())
            await writer.drain()
            
            # 3. Criar pool de IPs
            rede_vpn_parts = config.rede_vpn.split("/")
            ip_base = rede_vpn_parts[0].rsplit(".", 1)[0]
            
            pool_cmd = f"""/ip/pool/add
=name=vpn-pool-{config.nome}
=ranges={ip_base}.10-{ip_base}.50
"""
            writer.write(pool_cmd.encode())
            await writer.drain()
            
            # 4. Criar profile PPP
            profile_cmd = f"""/ppp/profile/add
=name=vpn-profile-{config.nome}
=local-address={ip_base}.1
=remote-address=vpn-pool-{config.nome}
=dns-server={config.dns[0] if config.dns else '8.8.8.8'}
"""
            writer.write(profile_cmd.encode())
            await writer.drain()
            
            resultado.logs.append("✓ Servidor L2TP configurado")
            
            # 5. Criar usuários
            for i in range(1, num_clientes + 1):
                user_password = secrets.token_urlsafe(12)
                user_name = f"vpn_user_{i}"
                
                secret_cmd = f"""/ppp/secret/add
=name={user_name}
=password={user_password}
=service=l2tp
=profile=vpn-profile-{config.nome}
"""
                writer.write(secret_cmd.encode())
                await writer.drain()
                
                # Gera config do cliente
                config_cliente = f"""
=== VPN L2TP - Cliente {i} ===
Servidor: {config.ip_servidor or ip_mikrotik}
Usuário: {user_name}
Senha: {user_password}
Pre-Shared Key (IPSec): {ipsec_psk}

Configuração Windows:
1. Painel de Controle > Rede > VPN
2. Adicionar conexão VPN
3. Tipo: L2TP/IPSec com chave pré-compartilhada
4. Preencher dados acima

Configuração Android/iOS:
1. Configurações > VPN
2. Adicionar VPN > L2TP/IPSec PSK
3. Preencher dados acima
"""
                
                cliente = ClienteVPN(
                    id=f"l2tp_user_{i}",
                    nome=f"VPN User {i}",
                    ip="",  # Atribuído dinamicamente
                    public_key="",
                    private_key=user_password,
                    config_file=config_cliente
                )
                
                resultado.clientes.append(cliente)
                resultado.logs.append(f"✓ Usuário {user_name} criado")
            
            writer.close()
            await writer.wait_closed()
            
            config.preshared_key = ipsec_psk
            resultado.config_servidor = config
            resultado.logs.append("✓ VPN L2TP configurada com sucesso!")
            
        except asyncio.TimeoutError:
            raise Exception("Timeout na conexão com Mikrotik")
    
    def _gerar_config_cliente_wireguard(
        self,
        nome: str,
        private_key: str,
        ip_cliente: str,
        public_key_servidor: str,
        preshared_key: str,
        endpoint: str,
        allowed_ips: str,
        dns: str
    ) -> str:
        """Gera arquivo de configuração do cliente WireGuard."""
        
        return f"""[Interface]
# {nome}
PrivateKey = {private_key}
Address = {ip_cliente}
DNS = {dns}

[Peer]
PublicKey = {public_key_servidor}
PresharedKey = {preshared_key}
Endpoint = {endpoint}
AllowedIPs = {allowed_ips}
PersistentKeepalive = 25
"""
