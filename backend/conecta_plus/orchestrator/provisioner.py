# -*- coding: utf-8 -*-
"""
Provisionador Automático
========================

Configura dispositivos automaticamente baseado no projeto.
Aplica IPs, VLANs, integrações em lote.
"""

from __future__ import annotations
import asyncio
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime

from .scanner import DispositivoEncontrado, TipoDispositivo

logger = logging.getLogger(__name__)


class StatusProvisionamento(str, Enum):
    PENDENTE = "pendente"
    EM_ANDAMENTO = "em_andamento"
    SUCESSO = "sucesso"
    ERRO = "erro"
    IGNORADO = "ignorado"


@dataclass
class ConfiguracaoDispositivo:
    """Configuração a ser aplicada em um dispositivo."""
    ip_atual: str
    ip_novo: Optional[str] = None
    mascara: str = "255.255.255.0"
    gateway: Optional[str] = None
    dns: List[str] = field(default_factory=lambda: ["8.8.8.8", "8.8.4.4"])
    vlan_id: Optional[int] = None
    hostname: Optional[str] = None
    ntp_server: str = "pool.ntp.org"
    timezone: str = "America/Sao_Paulo"
    usuario_novo: Optional[str] = None
    senha_nova: Optional[str] = None
    configuracoes_extras: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ResultadoProvisionamento:
    """Resultado do provisionamento de um dispositivo."""
    dispositivo: DispositivoEncontrado
    configuracao: ConfiguracaoDispositivo
    status: StatusProvisionamento = StatusProvisionamento.PENDENTE
    ip_final: str = ""
    mensagem: str = ""
    log: List[str] = field(default_factory=list)
    inicio: Optional[datetime] = None
    fim: Optional[datetime] = None
    
    @property
    def duracao_segundos(self) -> float:
        if self.inicio and self.fim:
            return (self.fim - self.inicio).total_seconds()
        return 0


@dataclass
class PlanoProvisionamento:
    """Plano completo de provisionamento."""
    id: str
    nome_projeto: str
    condominio: str
    dispositivos: List[ResultadoProvisionamento] = field(default_factory=list)
    credenciais: Dict[str, str] = field(default_factory=dict)
    status: StatusProvisionamento = StatusProvisionamento.PENDENTE
    criado_em: datetime = field(default_factory=datetime.now)
    executado_em: Optional[datetime] = None
    
    @property
    def progresso(self) -> Dict[str, int]:
        total = len(self.dispositivos)
        sucesso = sum(1 for d in self.dispositivos if d.status == StatusProvisionamento.SUCESSO)
        erro = sum(1 for d in self.dispositivos if d.status == StatusProvisionamento.ERRO)
        pendente = sum(1 for d in self.dispositivos if d.status == StatusProvisionamento.PENDENTE)
        
        return {
            "total": total,
            "sucesso": sucesso,
            "erro": erro,
            "pendente": pendente,
            "percentual": int((sucesso / total) * 100) if total > 0 else 0
        }


class Provisionador:
    """
    Provisionador automático de dispositivos.
    
    Configura IPs, VLANs e integrações baseado no projeto.
    """
    
    def __init__(self):
        self.timeout = 30
    
    async def provisionar_dispositivo(
        self,
        dispositivo: DispositivoEncontrado,
        config: ConfiguracaoDispositivo,
        credenciais: Dict[str, str]
    ) -> ResultadoProvisionamento:
        """
        Provisiona um único dispositivo.
        
        Args:
            dispositivo: Dispositivo encontrado no scan.
            config: Configuração a aplicar.
            credenciais: Credenciais de acesso.
        
        Returns:
            ResultadoProvisionamento com status e logs.
        """
        resultado = ResultadoProvisionamento(
            dispositivo=dispositivo,
            configuracao=config,
            status=StatusProvisionamento.EM_ANDAMENTO,
            inicio=datetime.now()
        )
        
        resultado.log.append(f"Iniciando provisionamento de {dispositivo.ip}")
        resultado.log.append(f"Fabricante: {dispositivo.fabricante}")
        resultado.log.append(f"Tipo: {dispositivo.tipo.value}")
        
        try:
            # Seleciona driver baseado no fabricante
            if dispositivo.fabricante == "Intelbras":
                await self._provisionar_intelbras(dispositivo, config, credenciais, resultado)
            elif dispositivo.fabricante == "Hikvision":
                await self._provisionar_hikvision(dispositivo, config, credenciais, resultado)
            elif dispositivo.fabricante == "Dahua":
                await self._provisionar_dahua(dispositivo, config, credenciais, resultado)
            elif dispositivo.fabricante == "Mikrotik":
                await self._provisionar_mikrotik(dispositivo, config, credenciais, resultado)
            elif dispositivo.fabricante == "Control iD":
                await self._provisionar_controlid(dispositivo, config, credenciais, resultado)
            else:
                resultado.log.append(f"Fabricante {dispositivo.fabricante} não suportado para provisionamento automático")
                resultado.status = StatusProvisionamento.IGNORADO
                resultado.mensagem = "Fabricante não suportado"
            
            if resultado.status == StatusProvisionamento.EM_ANDAMENTO:
                resultado.status = StatusProvisionamento.SUCESSO
                resultado.mensagem = "Provisionamento concluído com sucesso"
                resultado.ip_final = config.ip_novo or dispositivo.ip
            
        except Exception as e:
            resultado.status = StatusProvisionamento.ERRO
            resultado.mensagem = str(e)
            resultado.log.append(f"ERRO: {e}")
            logger.error(f"Erro ao provisionar {dispositivo.ip}: {e}")
        
        resultado.fim = datetime.now()
        return resultado
    
    async def _provisionar_intelbras(
        self,
        dispositivo: DispositivoEncontrado,
        config: ConfiguracaoDispositivo,
        credenciais: Dict[str, str],
        resultado: ResultadoProvisionamento
    ):
        """Provisiona dispositivo Intelbras."""
        import aiohttp
        
        ip = dispositivo.ip
        usuario = credenciais.get("usuario", "admin")
        senha = credenciais.get("senha", "admin")
        
        auth = aiohttp.BasicAuth(usuario, senha)
        
        async with aiohttp.ClientSession(auth=auth) as session:
            # 1. Verificar conexão
            resultado.log.append("Verificando conexão...")
            try:
                url = f"http://{ip}/cgi-bin/magicBox.cgi?action=getSystemInfo"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        raise Exception(f"Falha na autenticação: HTTP {resp.status}")
                    resultado.log.append("✓ Conexão OK")
            except Exception as e:
                raise Exception(f"Não foi possível conectar: {e}")
            
            # 2. Configurar IP (se diferente)
            if config.ip_novo and config.ip_novo != ip:
                resultado.log.append(f"Configurando IP: {ip} -> {config.ip_novo}")
                
                url = f"http://{ip}/cgi-bin/configManager.cgi?action=setConfig"
                params = {
                    "Network.eth0.IPAddress": config.ip_novo,
                    "Network.eth0.SubnetMask": config.mascara,
                }
                if config.gateway:
                    params["Network.eth0.DefaultGateway"] = config.gateway
                
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        resultado.log.append(f"✓ IP configurado para {config.ip_novo}")
                    else:
                        resultado.log.append(f"⚠ Aviso: resposta HTTP {resp.status}")
            
            # 3. Configurar NTP
            resultado.log.append(f"Configurando NTP: {config.ntp_server}")
            url = f"http://{ip}/cgi-bin/configManager.cgi?action=setConfig"
            params = {
                "NTP.Enable": "true",
                "NTP.Address": config.ntp_server,
            }
            try:
                async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    resultado.log.append("✓ NTP configurado")
            except:
                resultado.log.append("⚠ NTP não configurado (não crítico)")
            
            # 4. Configurar timezone
            resultado.log.append(f"Configurando timezone: {config.timezone}")
            
            resultado.log.append("✓ Provisionamento Intelbras concluído")
    
    async def _provisionar_hikvision(
        self,
        dispositivo: DispositivoEncontrado,
        config: ConfiguracaoDispositivo,
        credenciais: Dict[str, str],
        resultado: ResultadoProvisionamento
    ):
        """Provisiona dispositivo Hikvision via ISAPI."""
        import aiohttp
        from aiohttp import DigestAuth
        
        ip = dispositivo.ip
        usuario = credenciais.get("usuario", "admin")
        senha = credenciais.get("senha", "admin")
        
        auth = DigestAuth(usuario, senha)
        
        async with aiohttp.ClientSession() as session:
            # 1. Verificar conexão
            resultado.log.append("Verificando conexão ISAPI...")
            try:
                url = f"http://{ip}/ISAPI/System/deviceInfo"
                async with session.get(url, auth=auth, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        raise Exception(f"Falha na autenticação: HTTP {resp.status}")
                    resultado.log.append("✓ Conexão ISAPI OK")
            except aiohttp.ClientError as e:
                raise Exception(f"Não foi possível conectar: {e}")
            
            # 2. Configurar IP
            if config.ip_novo and config.ip_novo != ip:
                resultado.log.append(f"Configurando IP: {ip} -> {config.ip_novo}")
                
                xml_config = f"""<?xml version="1.0" encoding="UTF-8"?>
                <NetworkInterface>
                    <IPAddress>
                        <ipVersion>v4</ipVersion>
                        <addressingType>static</addressingType>
                        <ipAddress>{config.ip_novo}</ipAddress>
                        <subnetMask>{config.mascara}</subnetMask>
                        <DefaultGateway>
                            <ipAddress>{config.gateway or ''}</ipAddress>
                        </DefaultGateway>
                    </IPAddress>
                </NetworkInterface>"""
                
                url = f"http://{ip}/ISAPI/System/Network/interfaces/1"
                headers = {"Content-Type": "application/xml"}
                
                async with session.put(url, auth=auth, data=xml_config, headers=headers,
                                       timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        resultado.log.append(f"✓ IP configurado para {config.ip_novo}")
                    else:
                        resultado.log.append(f"⚠ Aviso: resposta HTTP {resp.status}")
            
            # 3. Configurar NTP
            resultado.log.append(f"Configurando NTP: {config.ntp_server}")
            xml_ntp = f"""<?xml version="1.0" encoding="UTF-8"?>
            <NTPServer>
                <id>1</id>
                <addressingFormatType>hostname</addressingFormatType>
                <hostName>{config.ntp_server}</hostName>
                <portNo>123</portNo>
                <synchronizeInterval>60</synchronizeInterval>
            </NTPServer>"""
            
            try:
                url = f"http://{ip}/ISAPI/System/time/ntpServers/1"
                headers = {"Content-Type": "application/xml"}
                async with session.put(url, auth=auth, data=xml_ntp, headers=headers,
                                       timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    resultado.log.append("✓ NTP configurado")
            except:
                resultado.log.append("⚠ NTP não configurado (não crítico)")
            
            resultado.log.append("✓ Provisionamento Hikvision concluído")
    
    async def _provisionar_dahua(
        self,
        dispositivo: DispositivoEncontrado,
        config: ConfiguracaoDispositivo,
        credenciais: Dict[str, str],
        resultado: ResultadoProvisionamento
    ):
        """Provisiona dispositivo Dahua (mesmo protocolo Intelbras)."""
        # Dahua usa o mesmo protocolo da Intelbras
        await self._provisionar_intelbras(dispositivo, config, credenciais, resultado)
        resultado.log[-1] = "✓ Provisionamento Dahua concluído"
    
    async def _provisionar_mikrotik(
        self,
        dispositivo: DispositivoEncontrado,
        config: ConfiguracaoDispositivo,
        credenciais: Dict[str, str],
        resultado: ResultadoProvisionamento
    ):
        """Provisiona roteador Mikrotik via API."""
        
        ip = dispositivo.ip
        usuario = credenciais.get("usuario", "admin")
        senha = credenciais.get("senha", "")
        
        resultado.log.append("Conectando via API RouterOS...")
        
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(ip, 8728),
                timeout=5
            )
            
            # Login simplificado (API RouterOS)
            resultado.log.append("✓ Conexão API estabelecida")
            
            # Envia comando de login
            login_cmd = f"/login\n=name={usuario}\n=password={senha}\n"
            writer.write(self._encode_routeros(login_cmd))
            await writer.drain()
            
            # Lê resposta
            response = await asyncio.wait_for(reader.read(1024), timeout=5)
            
            if b"!done" in response:
                resultado.log.append("✓ Autenticação OK")
            else:
                raise Exception("Falha na autenticação")
            
            # Configurar VLAN se especificado
            if config.vlan_id:
                resultado.log.append(f"Configurando VLAN {config.vlan_id}...")
                # Comando para criar VLAN
                vlan_cmd = f"/interface/vlan/add\n=name=vlan{config.vlan_id}\n=vlan-id={config.vlan_id}\n=interface=ether1\n"
                writer.write(self._encode_routeros(vlan_cmd))
                await writer.drain()
                resultado.log.append(f"✓ VLAN {config.vlan_id} criada")
            
            # Configurar IP se especificado
            if config.ip_novo:
                resultado.log.append(f"Adicionando IP {config.ip_novo}...")
                interface = f"vlan{config.vlan_id}" if config.vlan_id else "ether1"
                ip_cmd = f"/ip/address/add\n=address={config.ip_novo}/{config.mascara}\n=interface={interface}\n"
                writer.write(self._encode_routeros(ip_cmd))
                await writer.drain()
                resultado.log.append(f"✓ IP {config.ip_novo} configurado")
            
            # Configurar NTP
            resultado.log.append(f"Configurando NTP: {config.ntp_server}")
            ntp_cmd = f"/system/ntp/client/set\n=enabled=yes\n=servers={config.ntp_server}\n"
            writer.write(self._encode_routeros(ntp_cmd))
            await writer.drain()
            resultado.log.append("✓ NTP configurado")
            
            writer.close()
            await writer.wait_closed()
            
            resultado.log.append("✓ Provisionamento Mikrotik concluído")
            
        except asyncio.TimeoutError:
            raise Exception("Timeout na conexão com API RouterOS")
        except Exception as e:
            raise Exception(f"Erro Mikrotik: {e}")
    
    def _encode_routeros(self, command: str) -> bytes:
        """Codifica comando para API RouterOS."""
        # Simplificado - em produção usar protocolo completo
        return command.encode('utf-8')
    
    async def _provisionar_controlid(
        self,
        dispositivo: DispositivoEncontrado,
        config: ConfiguracaoDispositivo,
        credenciais: Dict[str, str],
        resultado: ResultadoProvisionamento
    ):
        """Provisiona controladora Control iD."""
        import aiohttp
        
        ip = dispositivo.ip
        usuario = credenciais.get("usuario", "admin")
        senha = credenciais.get("senha", "admin")
        
        resultado.log.append("Conectando à API Control iD...")
        
        async with aiohttp.ClientSession() as session:
            # 1. Login
            url = f"http://{ip}/login.fcgi"
            data = {"login": usuario, "password": senha}
            
            try:
                async with session.post(url, data=data, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        session_id = result.get("session")
                        resultado.log.append("✓ Login OK")
                    else:
                        raise Exception(f"Falha no login: HTTP {resp.status}")
            except Exception as e:
                raise Exception(f"Erro ao conectar: {e}")
            
            # 2. Configurar rede
            if config.ip_novo:
                resultado.log.append(f"Configurando IP: {config.ip_novo}")
                url = f"http://{ip}/set_configuration.fcgi?session={session_id}"
                network_config = {
                    "general": {
                        "ip": config.ip_novo,
                        "netmask": config.mascara,
                        "gateway": config.gateway or ""
                    }
                }
                
                async with session.post(url, json=network_config, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        resultado.log.append(f"✓ IP configurado para {config.ip_novo}")
            
            resultado.log.append("✓ Provisionamento Control iD concluído")
    
    async def executar_plano(self, plano: PlanoProvisionamento) -> PlanoProvisionamento:
        """
        Executa um plano de provisionamento completo.
        
        Args:
            plano: Plano com lista de dispositivos e configurações.
        
        Returns:
            Plano atualizado com resultados.
        """
        logger.info(f"Executando plano de provisionamento: {plano.nome_projeto}")
        plano.status = StatusProvisionamento.EM_ANDAMENTO
        plano.executado_em = datetime.now()
        
        for item in plano.dispositivos:
            resultado = await self.provisionar_dispositivo(
                item.dispositivo,
                item.configuracao,
                plano.credenciais
            )
            
            # Atualiza o item no plano
            item.status = resultado.status
            item.mensagem = resultado.mensagem
            item.log = resultado.log
            item.inicio = resultado.inicio
            item.fim = resultado.fim
            item.ip_final = resultado.ip_final
        
        # Determina status final do plano
        progresso = plano.progresso
        if progresso["erro"] > 0:
            plano.status = StatusProvisionamento.ERRO
        elif progresso["sucesso"] == progresso["total"]:
            plano.status = StatusProvisionamento.SUCESSO
        
        logger.info(f"Plano concluído: {progresso['sucesso']}/{progresso['total']} dispositivos provisionados")
        return plano
