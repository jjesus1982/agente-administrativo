# -*- coding: utf-8 -*-
"""
Orquestrador de Instalação
==========================

Motor principal que coordena todo o processo de instalação:
1. Escaneia a rede
2. Identifica dispositivos
3. Provisiona configurações
4. Cria VPN
5. Integra sistemas
6. Testa tudo
7. Gera relatório
"""

from __future__ import annotations
import asyncio
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum
from uuid import uuid4

from .scanner import NetworkScanner, DispositivoEncontrado, TipoDispositivo
from .provisioner import (
    Provisionador, 
    ConfiguracaoDispositivo, 
    PlanoProvisionamento,
    ResultadoProvisionamento,
    StatusProvisionamento
)
from .vpn_manager import VPNManager, ConfiguracaoVPN, TipoVPN, ResultadoVPN
from .integrator import Integrador, ResultadoIntegracao, StatusIntegracao

logger = logging.getLogger(__name__)


class FaseInstalacao(str, Enum):
    """Fases do processo de instalação."""
    INICIANDO = "iniciando"
    ESCANEANDO = "escaneando"
    IDENTIFICANDO = "identificando"
    AGUARDANDO_CONFIRMACAO = "aguardando_confirmacao"
    PROVISIONANDO = "provisionando"
    CONFIGURANDO_VPN = "configurando_vpn"
    INTEGRANDO = "integrando"
    TESTANDO = "testando"
    CONCLUIDO = "concluido"
    ERRO = "erro"


@dataclass
class ProjetoInstalacao:
    """Projeto de instalação completo."""
    id: str
    nome: str
    condominio: str
    
    # Configuração de rede
    range_scan: str = ""  # Ex: 192.168.1.0/24
    rede_cftv: str = ""  # Ex: 192.168.10.0/24
    rede_controle: str = ""  # Ex: 192.168.20.0/24
    gateway: str = ""
    
    # Credenciais
    credenciais: Dict[str, str] = field(default_factory=lambda: {
        "usuario": "admin",
        "senha": "admin"
    })
    
    # VPN
    criar_vpn: bool = True
    vpn_tipo: TipoVPN = TipoVPN.WIREGUARD
    vpn_clientes: int = 5
    
    # Status
    fase: FaseInstalacao = FaseInstalacao.INICIANDO
    progresso: int = 0
    
    # Resultados
    dispositivos_encontrados: List[DispositivoEncontrado] = field(default_factory=list)
    plano_provisionamento: Optional[PlanoProvisionamento] = None
    resultado_vpn: Optional[ResultadoVPN] = None
    resultado_integracao: Optional[ResultadoIntegracao] = None
    
    # Logs
    logs: List[Dict] = field(default_factory=list)
    
    # Timestamps
    criado_em: datetime = field(default_factory=datetime.now)
    iniciado_em: Optional[datetime] = None
    concluido_em: Optional[datetime] = None
    
    def log(self, mensagem: str, nivel: str = "info"):
        """Adiciona log ao projeto."""
        self.logs.append({
            "timestamp": datetime.now().isoformat(),
            "nivel": nivel,
            "mensagem": mensagem
        })
        logger.log(
            getattr(logging, nivel.upper(), logging.INFO),
            f"[{self.id}] {mensagem}"
        )


class OrquestradorInstalacao:
    """
    Orquestrador principal de instalação.
    
    Coordena todo o processo de instalação automatizada,
    desde o scan de rede até os testes finais.
    """
    
    def __init__(self):
        self.scanner = NetworkScanner()
        self.provisionador = Provisionador()
        self.vpn_manager = VPNManager()
        self.integrador = Integrador()
        
        # Projetos em andamento
        self.projetos: Dict[str, ProjetoInstalacao] = {}
    
    def criar_projeto(
        self,
        nome: str,
        condominio: str,
        range_scan: str,
        credenciais: Dict[str, str],
        rede_cftv: str = "",
        rede_controle: str = "",
        gateway: str = "",
        criar_vpn: bool = True,
        vpn_tipo: str = "wireguard",
        vpn_clientes: int = 5
    ) -> ProjetoInstalacao:
        """
        Cria um novo projeto de instalação.
        
        Args:
            nome: Nome do projeto.
            condominio: Nome do condomínio.
            range_scan: Range de IP para escanear (CIDR).
            credenciais: Usuario e senha dos dispositivos.
            rede_cftv: Rede destino para CFTV.
            rede_controle: Rede destino para controle de acesso.
            gateway: Gateway padrão.
            criar_vpn: Se deve criar VPN.
            vpn_tipo: Tipo de VPN (wireguard, l2tp, ipsec).
            vpn_clientes: Número de clientes VPN.
        
        Returns:
            ProjetoInstalacao criado.
        """
        projeto = ProjetoInstalacao(
            id=f"inst_{uuid4().hex[:8]}",
            nome=nome,
            condominio=condominio,
            range_scan=range_scan,
            rede_cftv=rede_cftv,
            rede_controle=rede_controle,
            gateway=gateway,
            credenciais=credenciais,
            criar_vpn=criar_vpn,
            vpn_tipo=TipoVPN(vpn_tipo),
            vpn_clientes=vpn_clientes
        )
        
        self.projetos[projeto.id] = projeto
        projeto.log(f"Projeto criado: {nome} - {condominio}")
        
        return projeto
    
    async def escanear_rede(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Fase 1: Escaneia a rede e descobre dispositivos.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto atualizado com dispositivos encontrados.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        projeto.fase = FaseInstalacao.ESCANEANDO
        projeto.progresso = 10
        projeto.log(f"Iniciando scan de {projeto.range_scan}...")
        
        try:
            # Escaneia a rede
            dispositivos = await self.scanner.scan_range(projeto.range_scan)
            
            projeto.dispositivos_encontrados = dispositivos
            projeto.progresso = 20
            projeto.log(f"Encontrados {len(dispositivos)} dispositivos")
            
            # Agrupa por tipo
            por_tipo = {}
            for d in dispositivos:
                tipo = d.tipo.value
                por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
            
            for tipo, qtd in por_tipo.items():
                projeto.log(f"  - {tipo}: {qtd}")
            
            projeto.fase = FaseInstalacao.IDENTIFICANDO
            
        except Exception as e:
            projeto.fase = FaseInstalacao.ERRO
            projeto.log(f"Erro no scan: {e}", "error")
            raise
        
        return projeto
    
    async def identificar_dispositivos(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Fase 2: Identifica detalhes dos dispositivos (modelo, firmware).
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto atualizado com detalhes dos dispositivos.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        projeto.log("Identificando dispositivos em detalhe...")
        projeto.progresso = 30
        
        for i, dispositivo in enumerate(projeto.dispositivos_encontrados):
            try:
                # Tenta identificar com credenciais
                identificado = await self.scanner.identify_device(
                    dispositivo.ip,
                    projeto.credenciais
                )
                
                if identificado:
                    dispositivo.modelo = identificado.modelo
                    dispositivo.firmware = identificado.firmware
                    dispositivo.metadata = identificado.metadata
                    
                    projeto.log(f"  {dispositivo.ip}: {dispositivo.fabricante} {dispositivo.modelo}")
                    
            except Exception as e:
                projeto.log(f"  {dispositivo.ip}: Erro ao identificar - {e}", "warning")
            
            projeto.progresso = 30 + int((i / len(projeto.dispositivos_encontrados)) * 10)
        
        projeto.fase = FaseInstalacao.AGUARDANDO_CONFIRMACAO
        projeto.progresso = 40
        projeto.log("Identificação concluída. Aguardando confirmação do plano.")
        
        return projeto
    
    def gerar_plano_provisionamento(self, projeto_id: str) -> PlanoProvisionamento:
        """
        Gera plano de provisionamento baseado nos dispositivos encontrados.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            PlanoProvisionamento gerado.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        resultados = []
        
        # Separa por tipo
        nvrs = [d for d in projeto.dispositivos_encontrados if d.tipo == TipoDispositivo.NVR]
        cameras = [d for d in projeto.dispositivos_encontrados if d.tipo == TipoDispositivo.CAMERA]
        controladoras = [d for d in projeto.dispositivos_encontrados if d.tipo == TipoDispositivo.CONTROLADORA]
        routers = [d for d in projeto.dispositivos_encontrados if d.tipo == TipoDispositivo.ROUTER]
        
        # Calcula IPs para cada tipo
        ip_cftv_base = projeto.rede_cftv.split("/")[0].rsplit(".", 1)[0] if projeto.rede_cftv else ""
        ip_ctrl_base = projeto.rede_controle.split("/")[0].rsplit(".", 1)[0] if projeto.rede_controle else ""
        
        # Configura NVRs (IP .10)
        for i, nvr in enumerate(nvrs):
            ip_novo = f"{ip_cftv_base}.{10 + i}" if ip_cftv_base else None
            config = ConfiguracaoDispositivo(
                ip_atual=nvr.ip,
                ip_novo=ip_novo,
                gateway=projeto.gateway,
                vlan_id=10 if projeto.rede_cftv else None,
                hostname=f"NVR-{i+1}"
            )
            resultados.append(ResultadoProvisionamento(
                dispositivo=nvr,
                configuracao=config
            ))
        
        # Configura câmeras (IPs .20, .21, .22...)
        for i, camera in enumerate(cameras):
            ip_novo = f"{ip_cftv_base}.{20 + i}" if ip_cftv_base else None
            config = ConfiguracaoDispositivo(
                ip_atual=camera.ip,
                ip_novo=ip_novo,
                gateway=projeto.gateway,
                vlan_id=10 if projeto.rede_cftv else None,
                hostname=f"CAM-{i+1}"
            )
            resultados.append(ResultadoProvisionamento(
                dispositivo=camera,
                configuracao=config
            ))
        
        # Configura controladoras (IP .10, .11...)
        for i, ctrl in enumerate(controladoras):
            ip_novo = f"{ip_ctrl_base}.{10 + i}" if ip_ctrl_base else None
            config = ConfiguracaoDispositivo(
                ip_atual=ctrl.ip,
                ip_novo=ip_novo,
                gateway=projeto.gateway,
                vlan_id=20 if projeto.rede_controle else None,
                hostname=f"CTRL-{i+1}"
            )
            resultados.append(ResultadoProvisionamento(
                dispositivo=ctrl,
                configuracao=config
            ))
        
        # Routers não mudam IP (já estão configurados)
        for router in routers:
            config = ConfiguracaoDispositivo(
                ip_atual=router.ip,
                vlan_id=10 if projeto.rede_cftv else None  # Criar VLAN
            )
            resultados.append(ResultadoProvisionamento(
                dispositivo=router,
                configuracao=config
            ))
        
        plano = PlanoProvisionamento(
            id=f"plano_{projeto.id}",
            nome_projeto=projeto.nome,
            condominio=projeto.condominio,
            dispositivos=resultados,
            credenciais=projeto.credenciais
        )
        
        projeto.plano_provisionamento = plano
        projeto.log(f"Plano gerado: {len(resultados)} dispositivos")
        
        return plano
    
    async def executar_provisionamento(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Fase 3: Executa o provisionamento dos dispositivos.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto atualizado.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        if not projeto.plano_provisionamento:
            raise ValueError("Plano de provisionamento não gerado")
        
        projeto.fase = FaseInstalacao.PROVISIONANDO
        projeto.progresso = 50
        projeto.log("Iniciando provisionamento...")
        
        try:
            plano = await self.provisionador.executar_plano(
                projeto.plano_provisionamento
            )
            
            projeto.plano_provisionamento = plano
            
            # Log resultados
            progresso = plano.progresso
            projeto.log(f"Provisionamento: {progresso['sucesso']}/{progresso['total']} OK")
            
            if progresso['erro'] > 0:
                projeto.log(f"  ⚠ {progresso['erro']} erros", "warning")
            
            projeto.progresso = 60
            
        except Exception as e:
            projeto.fase = FaseInstalacao.ERRO
            projeto.log(f"Erro no provisionamento: {e}", "error")
            raise
        
        return projeto
    
    async def configurar_vpn(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Fase 4: Configura VPN para acesso remoto.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto atualizado.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        if not projeto.criar_vpn:
            projeto.log("VPN desabilitada, pulando...")
            return projeto
        
        projeto.fase = FaseInstalacao.CONFIGURANDO_VPN
        projeto.progresso = 70
        projeto.log("Configurando VPN...")
        
        # Encontra o router
        routers = [d for d in projeto.dispositivos_encontrados if d.tipo == TipoDispositivo.ROUTER]
        
        if not routers:
            projeto.log("Nenhum router encontrado para VPN", "warning")
            return projeto
        
        router = routers[0]
        
        try:
            config_vpn = ConfiguracaoVPN(
                nome=projeto.nome.replace(" ", "_").lower(),
                tipo=projeto.vpn_tipo,
                ip_servidor=router.ip,
                rede_remota=projeto.range_scan
            )
            
            resultado = await self.vpn_manager.criar_vpn_mikrotik(
                router.ip,
                projeto.credenciais,
                config_vpn,
                projeto.vpn_clientes
            )
            
            projeto.resultado_vpn = resultado
            
            if resultado.sucesso:
                projeto.log(f"VPN {config_vpn.tipo.value} criada com {len(resultado.clientes)} clientes")
            else:
                projeto.log(f"Erro na VPN: {resultado.mensagem}", "warning")
            
            projeto.progresso = 80
            
        except Exception as e:
            projeto.log(f"Erro ao configurar VPN: {e}", "warning")
        
        return projeto
    
    async def integrar_sistemas(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Fase 5: Integra câmeras no NVR, registra na nuvem.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto atualizado.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        projeto.fase = FaseInstalacao.INTEGRANDO
        projeto.progresso = 85
        projeto.log("Integrando sistemas...")
        
        try:
            resultado = await self.integrador.integrar_tudo(
                projeto.dispositivos_encontrados,
                projeto.credenciais,
                projeto.condominio,
                projeto.id
            )
            
            projeto.resultado_integracao = resultado
            projeto.log(f"Integração: {resultado.status.value}")
            
            projeto.progresso = 90
            
        except Exception as e:
            projeto.log(f"Erro na integração: {e}", "warning")
        
        return projeto
    
    async def testar_sistema(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Fase 6: Testa comunicação com todos os dispositivos.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto atualizado.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        projeto.fase = FaseInstalacao.TESTANDO
        projeto.progresso = 95
        projeto.log("Testando comunicação...")
        
        try:
            testes = await self.integrador.testar_comunicacao(
                projeto.dispositivos_encontrados
            )
            
            online = sum(1 for t in testes if t.get("online"))
            projeto.log(f"Testes: {online}/{len(testes)} dispositivos online")
            
            if projeto.resultado_integracao:
                projeto.resultado_integracao.testes_realizados = testes
            
            projeto.progresso = 100
            projeto.fase = FaseInstalacao.CONCLUIDO
            projeto.concluido_em = datetime.now()
            projeto.log("✅ Instalação concluída com sucesso!")
            
        except Exception as e:
            projeto.log(f"Erro nos testes: {e}", "warning")
        
        return projeto
    
    async def executar_instalacao_completa(self, projeto_id: str) -> ProjetoInstalacao:
        """
        Executa todo o processo de instalação automaticamente.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Projeto com instalação completa.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        projeto.iniciado_em = datetime.now()
        projeto.log("=" * 50)
        projeto.log(f"INICIANDO INSTALAÇÃO: {projeto.nome}")
        projeto.log("=" * 50)
        
        try:
            # Fase 1: Scan
            await self.escanear_rede(projeto_id)
            
            # Fase 2: Identificação
            await self.identificar_dispositivos(projeto_id)
            
            # Fase 3: Gerar plano
            self.gerar_plano_provisionamento(projeto_id)
            
            # Fase 4: Provisionar
            await self.executar_provisionamento(projeto_id)
            
            # Fase 5: VPN
            await self.configurar_vpn(projeto_id)
            
            # Fase 6: Integração
            await self.integrar_sistemas(projeto_id)
            
            # Fase 7: Testes
            await self.testar_sistema(projeto_id)
            
        except Exception as e:
            projeto.fase = FaseInstalacao.ERRO
            projeto.log(f"ERRO FATAL: {e}", "error")
        
        return projeto
    
    def gerar_relatorio(self, projeto_id: str) -> Dict[str, Any]:
        """
        Gera relatório completo da instalação.
        
        Args:
            projeto_id: ID do projeto.
        
        Returns:
            Dict com relatório completo.
        """
        projeto = self.projetos.get(projeto_id)
        if not projeto:
            raise ValueError(f"Projeto {projeto_id} não encontrado")
        
        # Agrupa dispositivos por tipo
        dispositivos_por_tipo = {}
        for d in projeto.dispositivos_encontrados:
            tipo = d.tipo.value
            if tipo not in dispositivos_por_tipo:
                dispositivos_por_tipo[tipo] = []
            dispositivos_por_tipo[tipo].append({
                "ip": d.ip,
                "mac": d.mac,
                "fabricante": d.fabricante,
                "modelo": d.modelo,
                "online": d.online
            })
        
        # Resumo do provisionamento
        provisionamento = None
        if projeto.plano_provisionamento:
            provisionamento = {
                "total": len(projeto.plano_provisionamento.dispositivos),
                "sucesso": projeto.plano_provisionamento.progresso["sucesso"],
                "erros": projeto.plano_provisionamento.progresso["erro"]
            }
        
        # VPN
        vpn = None
        if projeto.resultado_vpn:
            vpn = {
                "tipo": projeto.vpn_tipo.value,
                "sucesso": projeto.resultado_vpn.sucesso,
                "clientes": len(projeto.resultado_vpn.clientes)
            }
        
        # Duracao
        duracao = None
        if projeto.iniciado_em and projeto.concluido_em:
            duracao = (projeto.concluido_em - projeto.iniciado_em).total_seconds()
        
        return {
            "projeto": {
                "id": projeto.id,
                "nome": projeto.nome,
                "condominio": projeto.condominio
            },
            "status": projeto.fase.value,
            "progresso": projeto.progresso,
            "dispositivos": {
                "total": len(projeto.dispositivos_encontrados),
                "por_tipo": dispositivos_por_tipo
            },
            "provisionamento": provisionamento,
            "vpn": vpn,
            "duracao_segundos": duracao,
            "logs": projeto.logs[-20:]  # Últimos 20 logs
        }
