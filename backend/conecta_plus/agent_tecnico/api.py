# -*- coding: utf-8 -*-
"""
API do Agente Técnico
=====================

Endpoints REST para o Agente Técnico do Conecta Plus.
"""

from __future__ import annotations
from typing import Optional, List, Dict, Any
import logging

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from .agent import AgentTecnico
from .llm_client import create_llm_client, BaseLLMClient
from .schemas import (
    CondominioContext,
    DocumentoTecnico,
    ResultadoLLM,
    TipoAmbiente,
    TipoAcesso,
    Acesso,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agente-tecnico", tags=["Agente Técnico"])

# Cliente LLM compartilhado
_llm_client: Optional[BaseLLMClient] = None
_agent: Optional[AgentTecnico] = None


def get_agent() -> AgentTecnico:
    """Dependency para obter instância do AgentTecnico."""
    global _llm_client, _agent
    
    if _agent is None:
        _llm_client = create_llm_client()
        _agent = AgentTecnico(llm_client=_llm_client)
    
    return _agent


# =============================================================================
# MODELOS DE REQUEST
# =============================================================================

class TopologiaRequest(BaseModel):
    """Request para geração de topologia."""
    condominio: CondominioContext


class ChecklistsRequest(BaseModel):
    """Request para geração de checklists."""
    condominio: CondominioContext


class TemplateConfigRequest(BaseModel):
    """Request para template de configuração."""
    fabricante: str
    modelo: str
    tipo_equipamento: str
    contexto: Optional[str] = None


class FluxoInstalacaoRequest(BaseModel):
    """Request para fluxo de instalação."""
    condominio: CondominioContext
    acesso_nome: str


class EsquemaBornesRequest(BaseModel):
    """Request para esquema de bornes."""
    fabricante: str
    equipamentos: List[str]
    contexto: Optional[str] = None


class DocumentacaoITILRequest(BaseModel):
    """Request para documentação ITIL."""
    condominio: CondominioContext
    topologia_resumo: str
    redes_logicas: Optional[List[str]] = None
    faixa_ip_cftv: Optional[str] = None
    faixa_ip_controle_acesso: Optional[str] = None


class AsBuiltRequest(BaseModel):
    """Request para template As-Built."""
    condominio: CondominioContext
    topologia_resumo: str


class TroubleshootingRequest(BaseModel):
    """Request para troubleshooting."""
    sintoma: str
    categoria: str = Field(..., description="hardware, software, rede, energia, configuracao, integracao")
    fabricante: Optional[str] = None
    urgencia: str = "media"


class JobTemplateRequest(BaseModel):
    """Request para geração de JobTemplate."""
    condominio: CondominioContext
    tipo_job: str = Field("instalacao", description="instalacao, manutencao, vistoria")
    prioridade: str = Field("media", description="baixa, media, alta, critica")


class ConsultaLivreRequest(BaseModel):
    """Request para consulta livre."""
    pergunta: str


# =============================================================================
# ENDPOINTS - FASE 1: PROJETO
# =============================================================================

@router.post("/topologia", response_model=ResultadoLLM)
def gerar_topologia(
    request: TopologiaRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> ResultadoLLM:
    """
    Gera proposta de topologia e solução de portaria remota.
    
    Inclui: VLANs, IPs, equipamentos, integrações, boas práticas.
    """
    try:
        return agent.gerar_topologia_solucao(request.condominio)
    except Exception as e:
        logger.error(f"Erro ao gerar topologia: {e}")
        raise HTTPException(500, str(e))


@router.post("/lista-materiais", response_model=ResultadoLLM)
def gerar_lista_materiais(
    request: TopologiaRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> ResultadoLLM:
    """
    Gera lista de materiais (Bill of Materials) para o projeto.
    """
    try:
        return agent.gerar_lista_materiais(request.condominio)
    except Exception as e:
        logger.error(f"Erro ao gerar lista de materiais: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# ENDPOINTS - FASE 2: BANCADA
# =============================================================================

@router.post("/checklists", response_model=DocumentoTecnico)
def gerar_checklists(
    request: ChecklistsRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera checklists técnicos (pré-instalação, bancada, campo).
    """
    try:
        return agent.gerar_checklists(request.condominio)
    except Exception as e:
        logger.error(f"Erro ao gerar checklists: {e}")
        raise HTTPException(500, str(e))


@router.post("/template-config", response_model=DocumentoTecnico)
def gerar_template_configuracao(
    request: TemplateConfigRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera template de configuração para equipamento específico.
    """
    try:
        return agent.gerar_template_configuracao(
            request.fabricante,
            request.modelo,
            request.tipo_equipamento,
            request.contexto
        )
    except Exception as e:
        logger.error(f"Erro ao gerar template de config: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# ENDPOINTS - FASE 3: CAMPO
# =============================================================================

@router.post("/fluxo-instalacao", response_model=DocumentoTecnico)
def gerar_fluxo_instalacao(
    request: FluxoInstalacaoRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera roteiro de instalação passo a passo para um acesso.
    """
    try:
        return agent.gerar_fluxo_instalacao(
            request.condominio,
            request.acesso_nome
        )
    except Exception as e:
        logger.error(f"Erro ao gerar fluxo de instalação: {e}")
        raise HTTPException(500, str(e))


@router.post("/esquema-bornes", response_model=DocumentoTecnico)
def gerar_esquema_bornes(
    request: EsquemaBornesRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera esquema de ligação de bornes.
    """
    try:
        return agent.gerar_esquema_bornes(
            request.fabricante,
            request.equipamentos,
            request.contexto
        )
    except Exception as e:
        logger.error(f"Erro ao gerar esquema de bornes: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# ENDPOINTS - FASE 4: PÓS-INSTALAÇÃO
# =============================================================================

@router.post("/documentacao-itil", response_model=DocumentoTecnico)
def gerar_documentacao_itil(
    request: DocumentacaoITILRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera documento de Pacote de Mudança ITIL/COBIT.
    """
    try:
        return agent.gerar_documentacao_itil(
            request.condominio,
            request.topologia_resumo,
            request.redes_logicas,
            request.faixa_ip_cftv,
            request.faixa_ip_controle_acesso
        )
    except Exception as e:
        logger.error(f"Erro ao gerar documentação ITIL: {e}")
        raise HTTPException(500, str(e))


@router.post("/as-built", response_model=DocumentoTecnico)
def gerar_as_built(
    request: AsBuiltRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera template de As-Built para documentar instalação real.
    """
    try:
        return agent.gerar_as_built(
            request.condominio,
            request.topologia_resumo
        )
    except Exception as e:
        logger.error(f"Erro ao gerar as-built: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# ENDPOINTS - SUPORTE
# =============================================================================

@router.post("/troubleshooting", response_model=DocumentoTecnico)
def gerar_troubleshooting(
    request: TroubleshootingRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> DocumentoTecnico:
    """
    Gera guia de troubleshooting para um problema.
    """
    try:
        return agent.gerar_troubleshooting(
            request.sintoma,
            request.categoria,
            request.fabricante,
            request.urgencia
        )
    except Exception as e:
        logger.error(f"Erro ao gerar troubleshooting: {e}")
        raise HTTPException(500, str(e))


@router.post("/consulta")
def processar_consulta(
    request: ConsultaLivreRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> Dict[str, str]:
    """
    Processa uma consulta técnica livre.
    """
    try:
        resposta = agent.processar_consulta_livre(request.pergunta)
        return {"resposta": resposta}
    except Exception as e:
        logger.error(f"Erro ao processar consulta: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# ENDPOINTS - CONECTA FIELDER
# =============================================================================

@router.post("/job-template")
def gerar_job_template(
    request: JobTemplateRequest,
    agent: AgentTecnico = Depends(get_agent)
) -> Dict[str, Any]:
    """
    Gera um JobTemplate completo para o Conecta Fielder.
    
    O JobTemplate define todos os passos, checklists e evidências
    necessárias para execução de um job em campo.
    """
    try:
        return agent.gerar_job_template(
            request.condominio,
            request.tipo_job,
            request.prioridade
        )
    except Exception as e:
        logger.error(f"Erro ao gerar JobTemplate: {e}")
        raise HTTPException(500, str(e))


# =============================================================================
# ENDPOINTS - UTILITÁRIOS
# =============================================================================

@router.get("/categorias-troubleshooting")
def listar_categorias_troubleshooting() -> Dict[str, List[str]]:
    """Lista categorias disponíveis para troubleshooting."""
    return {
        "categorias": [
            "hardware",
            "software",
            "rede",
            "energia",
            "configuracao",
            "integracao"
        ],
        "urgencias": [
            "baixa",
            "media",
            "alta",
            "critica"
        ]
    }


@router.get("/fabricantes")
def listar_fabricantes() -> Dict[str, List[str]]:
    """Lista fabricantes suportados."""
    return {
        "controle_acesso": ["Intelbras", "Hikvision", "Control iD"],
        "cftv": ["Intelbras", "Hikvision", "Dahua"],
        "automacao_portao": ["PPA", "Garen", "Nice"],
        "rede": ["Cisco", "Ubiquiti", "Mikrotik"],
        "interfonia": ["Intelbras", "HDL", "Amelco"]
    }
