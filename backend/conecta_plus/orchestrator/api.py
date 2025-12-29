# -*- coding: utf-8 -*-
"""
API do Orquestrador de Instalação
=================================

Endpoints REST para o orquestrador de instalação automatizada.
"""

from __future__ import annotations
from typing import Dict, List, Optional, Any
import asyncio
import logging

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from .orchestrator import OrquestradorInstalacao, ProjetoInstalacao, FaseInstalacao
from .scanner import TipoDispositivo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orchestrator", tags=["Orquestrador de Instalação"])

# Instância do orquestrador
orquestrador = OrquestradorInstalacao()


# =============================================================================
# MODELOS DE REQUEST
# =============================================================================

class CriarProjetoRequest(BaseModel):
    """Request para criar projeto de instalação."""
    nome: str = Field(..., description="Nome do projeto")
    condominio: str = Field(..., description="Nome do condomínio")
    range_scan: str = Field(..., description="Range IP para scan (CIDR)", example="192.168.1.0/24")
    
    # Credenciais
    usuario: str = Field("admin", description="Usuário dos dispositivos")
    senha: str = Field("admin", description="Senha dos dispositivos")
    
    # Configuração de rede (opcional)
    rede_cftv: Optional[str] = Field(None, description="Rede destino CFTV", example="192.168.10.0/24")
    rede_controle: Optional[str] = Field(None, description="Rede destino controle", example="192.168.20.0/24")
    gateway: Optional[str] = Field(None, description="Gateway padrão")
    
    # VPN
    criar_vpn: bool = Field(True, description="Criar VPN para acesso remoto")
    vpn_tipo: str = Field("wireguard", description="Tipo de VPN: wireguard, l2tp, ipsec")
    vpn_clientes: int = Field(5, description="Número de clientes VPN")


class AtualizarCredenciaisRequest(BaseModel):
    """Request para atualizar credenciais."""
    usuario: str
    senha: str


# =============================================================================
# ENDPOINTS - PROJETOS
# =============================================================================

@router.post("/projetos", response_model=Dict)
def criar_projeto(request: CriarProjetoRequest) -> Dict:
    """
    Cria um novo projeto de instalação.
    
    O projeto é criado mas não executado automaticamente.
    Use os endpoints de execução para iniciar as fases.
    """
    projeto = orquestrador.criar_projeto(
        nome=request.nome,
        condominio=request.condominio,
        range_scan=request.range_scan,
        credenciais={
            "usuario": request.usuario,
            "senha": request.senha
        },
        rede_cftv=request.rede_cftv or "",
        rede_controle=request.rede_controle or "",
        gateway=request.gateway or "",
        criar_vpn=request.criar_vpn,
        vpn_tipo=request.vpn_tipo,
        vpn_clientes=request.vpn_clientes
    )
    
    return {
        "id": projeto.id,
        "nome": projeto.nome,
        "condominio": projeto.condominio,
        "status": projeto.fase.value,
        "mensagem": "Projeto criado. Use /scan para iniciar descoberta de dispositivos."
    }


@router.get("/projetos")
def listar_projetos() -> List[Dict]:
    """Lista todos os projetos."""
    return [
        {
            "id": p.id,
            "nome": p.nome,
            "condominio": p.condominio,
            "fase": p.fase.value,
            "progresso": p.progresso,
            "dispositivos": len(p.dispositivos_encontrados),
            "criado_em": p.criado_em.isoformat()
        }
        for p in orquestrador.projetos.values()
    ]


@router.get("/projetos/{projeto_id}")
def obter_projeto(projeto_id: str) -> Dict:
    """Obtém detalhes de um projeto."""
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    return {
        "id": projeto.id,
        "nome": projeto.nome,
        "condominio": projeto.condominio,
        "fase": projeto.fase.value,
        "progresso": projeto.progresso,
        "range_scan": projeto.range_scan,
        "dispositivos_encontrados": len(projeto.dispositivos_encontrados),
        "criar_vpn": projeto.criar_vpn,
        "vpn_tipo": projeto.vpn_tipo.value,
        "logs": projeto.logs[-10:]
    }


@router.get("/projetos/{projeto_id}/dispositivos")
def listar_dispositivos_projeto(projeto_id: str) -> List[Dict]:
    """Lista dispositivos encontrados em um projeto."""
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    return [
        {
            "ip": d.ip,
            "mac": d.mac,
            "fabricante": d.fabricante,
            "tipo": d.tipo.value,
            "modelo": d.modelo,
            "portas_abertas": d.portas_abertas,
            "online": d.online,
            "resposta_ms": d.resposta_ms
        }
        for d in projeto.dispositivos_encontrados
    ]


@router.get("/projetos/{projeto_id}/logs")
def obter_logs_projeto(projeto_id: str, limit: int = 50) -> List[Dict]:
    """Obtém logs de um projeto."""
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    return projeto.logs[-limit:]


@router.get("/projetos/{projeto_id}/relatorio")
def gerar_relatorio_projeto(projeto_id: str) -> Dict:
    """Gera relatório completo do projeto."""
    try:
        return orquestrador.gerar_relatorio(projeto_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# =============================================================================
# ENDPOINTS - EXECUÇÃO PASSO A PASSO
# =============================================================================

@router.post("/projetos/{projeto_id}/scan")
async def executar_scan(projeto_id: str, background_tasks: BackgroundTasks) -> Dict:
    """
    Fase 1: Escaneia a rede e descobre dispositivos.
    
    Executa em background e retorna imediatamente.
    Use GET /projetos/{id} para acompanhar o progresso.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    if projeto.fase not in (FaseInstalacao.INICIANDO, FaseInstalacao.ERRO):
        raise HTTPException(400, f"Projeto já está na fase {projeto.fase.value}")
    
    # Executa em background
    background_tasks.add_task(orquestrador.escanear_rede, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Scan iniciado em background",
        "projeto_id": projeto_id
    }


@router.post("/projetos/{projeto_id}/identificar")
async def executar_identificacao(projeto_id: str, background_tasks: BackgroundTasks) -> Dict:
    """
    Fase 2: Identifica detalhes dos dispositivos (modelo, firmware).
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    if not projeto.dispositivos_encontrados:
        raise HTTPException(400, "Execute o scan primeiro")
    
    background_tasks.add_task(orquestrador.identificar_dispositivos, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Identificação iniciada",
        "projeto_id": projeto_id
    }


@router.post("/projetos/{projeto_id}/plano")
def gerar_plano(projeto_id: str) -> Dict:
    """
    Fase 3: Gera plano de provisionamento.
    
    Retorna o plano para revisão antes de executar.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    plano = orquestrador.gerar_plano_provisionamento(projeto_id)
    
    return {
        "plano_id": plano.id,
        "nome_projeto": plano.nome_projeto,
        "condominio": plano.condominio,
        "dispositivos": [
            {
                "ip_atual": r.dispositivo.ip,
                "ip_novo": r.configuracao.ip_novo,
                "fabricante": r.dispositivo.fabricante,
                "tipo": r.dispositivo.tipo.value,
                "vlan": r.configuracao.vlan_id
            }
            for r in plano.dispositivos
        ],
        "total": len(plano.dispositivos),
        "mensagem": "Revise o plano. Use /provisionar para executar."
    }


@router.post("/projetos/{projeto_id}/provisionar")
async def executar_provisionamento(projeto_id: str, background_tasks: BackgroundTasks) -> Dict:
    """
    Fase 4: Executa o provisionamento dos dispositivos.
    
    Aplica as configurações de IP, VLAN, etc.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    if not projeto.plano_provisionamento:
        raise HTTPException(400, "Gere o plano primeiro com /plano")
    
    background_tasks.add_task(orquestrador.executar_provisionamento, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Provisionamento iniciado",
        "projeto_id": projeto_id
    }


@router.post("/projetos/{projeto_id}/vpn")
async def executar_vpn(projeto_id: str, background_tasks: BackgroundTasks) -> Dict:
    """
    Fase 5: Configura VPN para acesso remoto.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    background_tasks.add_task(orquestrador.configurar_vpn, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Configuração de VPN iniciada",
        "projeto_id": projeto_id
    }


@router.post("/projetos/{projeto_id}/integrar")
async def executar_integracao(projeto_id: str, background_tasks: BackgroundTasks) -> Dict:
    """
    Fase 6: Integra câmeras no NVR, registra na nuvem.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    background_tasks.add_task(orquestrador.integrar_sistemas, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Integração iniciada",
        "projeto_id": projeto_id
    }


@router.post("/projetos/{projeto_id}/testar")
async def executar_testes(projeto_id: str, background_tasks: BackgroundTasks) -> Dict:
    """
    Fase 7: Testa comunicação com todos os dispositivos.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    background_tasks.add_task(orquestrador.testar_sistema, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Testes iniciados",
        "projeto_id": projeto_id
    }


# =============================================================================
# ENDPOINT - INSTALAÇÃO COMPLETA
# =============================================================================

@router.post("/projetos/{projeto_id}/instalar")
async def executar_instalacao_completa(
    projeto_id: str,
    background_tasks: BackgroundTasks
) -> Dict:
    """
    Executa todo o processo de instalação automaticamente.
    
    Fases:
    1. Scan de rede
    2. Identificação de dispositivos
    3. Geração do plano
    4. Provisionamento
    5. Configuração de VPN
    6. Integração de sistemas
    7. Testes finais
    
    Use GET /projetos/{id} para acompanhar o progresso.
    """
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    if projeto.fase not in (FaseInstalacao.INICIANDO, FaseInstalacao.ERRO, FaseInstalacao.AGUARDANDO_CONFIRMACAO):
        raise HTTPException(400, f"Projeto já está na fase {projeto.fase.value}")
    
    # Executa em background
    background_tasks.add_task(orquestrador.executar_instalacao_completa, projeto_id)
    
    return {
        "status": "iniciando",
        "mensagem": "Instalação completa iniciada em background",
        "projeto_id": projeto_id,
        "acompanhar": f"/api/orchestrator/projetos/{projeto_id}"
    }


# =============================================================================
# ENDPOINTS - SCAN AVULSO
# =============================================================================

@router.post("/scan")
async def scan_avulso(
    range_ip: str,
    usuario: str = "admin",
    senha: str = "admin"
) -> Dict:
    """
    Executa scan de rede avulso (sem criar projeto).
    
    Útil para descoberta rápida de dispositivos.
    """
    from .scanner import NetworkScanner
    
    scanner = NetworkScanner()
    dispositivos = await scanner.scan_range(range_ip)
    
    # Agrupa por tipo
    por_tipo = {}
    for d in dispositivos:
        tipo = d.tipo.value
        if tipo not in por_tipo:
            por_tipo[tipo] = []
        por_tipo[tipo].append({
            "ip": d.ip,
            "mac": d.mac,
            "fabricante": d.fabricante,
            "portas_abertas": d.portas_abertas
        })
    
    return {
        "range": range_ip,
        "total": len(dispositivos),
        "por_tipo": por_tipo
    }


# =============================================================================
# ENDPOINTS - VPN
# =============================================================================

@router.get("/projetos/{projeto_id}/vpn/clientes")
def listar_clientes_vpn(projeto_id: str) -> List[Dict]:
    """Lista configurações dos clientes VPN."""
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    if not projeto.resultado_vpn:
        raise HTTPException(400, "VPN não configurada")
    
    return [
        {
            "id": c.id,
            "nome": c.nome,
            "ip": c.ip,
            "config_file": c.config_file,
            "criado_em": c.criado_em.isoformat()
        }
        for c in projeto.resultado_vpn.clientes
    ]


@router.get("/projetos/{projeto_id}/vpn/cliente/{cliente_id}/config")
def obter_config_cliente_vpn(projeto_id: str, cliente_id: str) -> Dict:
    """Obtém arquivo de configuração de um cliente VPN."""
    projeto = orquestrador.projetos.get(projeto_id)
    if not projeto:
        raise HTTPException(404, "Projeto não encontrado")
    
    if not projeto.resultado_vpn:
        raise HTTPException(400, "VPN não configurada")
    
    cliente = next(
        (c for c in projeto.resultado_vpn.clientes if c.id == cliente_id),
        None
    )
    
    if not cliente:
        raise HTTPException(404, "Cliente não encontrado")
    
    return {
        "cliente_id": cliente.id,
        "nome": cliente.nome,
        "config": cliente.config_file
    }
