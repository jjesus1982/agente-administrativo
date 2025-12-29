# -*- coding: utf-8 -*-
"""
Schemas do Agente Técnico
=========================

Modelos de dados para o Agente Técnico do Conecta Plus.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# =============================================================================
# ENUMS
# =============================================================================

class TipoAmbiente(str, Enum):
    RESIDENCIAL = "residencial"
    COMERCIAL = "comercial"
    MISTO = "misto"


class TipoAcesso(str, Enum):
    PEDESTRE = "pedestre"
    VEICULAR = "veicular"
    SERVICO = "servico"
    OUTRO = "outro"


class EtapaProjeto(str, Enum):
    PRE_INSTALACAO = "pre_instalacao"
    BANCADA = "bancada"
    CAMPO = "campo"
    POS_INSTALACAO = "pos_instalacao"


class NivelUrgencia(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    CRITICA = "critica"


class CategoriaTroubleshooting(str, Enum):
    HARDWARE = "hardware"
    SOFTWARE = "software"
    REDE = "rede"
    ENERGIA = "energia"
    CONFIGURACAO = "configuracao"
    INTEGRACAO = "integracao"


class Fabricante(str, Enum):
    INTELBRAS = "Intelbras"
    HIKVISION = "Hikvision"
    CONTROL_ID = "Control iD"
    PPA = "PPA"
    GAREN = "Garen"
    NICE = "Nice"
    CISCO = "Cisco"
    UBIQUITI = "Ubiquiti"
    MIKROTIK = "Mikrotik"
    DAHUA = "Dahua"
    LINEAR = "Linear"
    AUTOMATIZA = "Automatiza"
    OUTROS = "Outros"


# =============================================================================
# MODELOS BASE
# =============================================================================

class Acesso(BaseModel):
    """Representa um ponto de acesso físico (portão, porta, etc.)."""
    nome: str = Field(..., description="Ex: Portão Pedestre Principal")
    tipo: TipoAcesso
    possui_catraca: bool = False
    possui_leitor_facial: bool = False
    possui_leitor_biometrico: bool = False
    possui_cancela: bool = False
    possui_interfone: bool = False
    observacoes: Optional[str] = None


class CondominioContext(BaseModel):
    """
    Descreve o contexto de um condomínio do ponto de vista técnico.
    É a base para o Agente Técnico gerar topologias, templates e documentos.
    """
    nome: str
    tipo_ambiente: TipoAmbiente
    cidade: str
    estado: str = "SP"
    numero_torres: int = 1
    quantidade_unidades: int
    acessos: List[Acesso]
    possui_guarita_fisica: bool = True
    possui_cftv_existente: bool = False
    possui_controle_acesso_existente: bool = False
    observacoes: Optional[str] = None


class Equipamento(BaseModel):
    """Representa um equipamento sugerido ou existente."""
    fabricante: str
    modelo: str
    funcao: str = Field(..., description="Ex: NVR, Câmera, Controladora de Acesso")
    quantidade: int = 1
    preco_unitario_estimado: Optional[float] = None
    observacoes: Optional[str] = None


# =============================================================================
# MODELOS DE TOPOLOGIA
# =============================================================================

class RedeLogica(BaseModel):
    """Representa uma rede/VLAN sugerida."""
    nome: str
    vlan_id: Optional[int] = None
    faixa_ip: str
    mascara: str = "255.255.255.0"
    gateway: Optional[str] = None
    descricao: Optional[str] = None


class TopologiaSugestao(BaseModel):
    """Sugestão de topologia de rede."""
    descricao_geral: str
    redes_logicas: List[RedeLogica] = []
    faixa_ip_cftv: Optional[str] = None
    faixa_ip_controle_acesso: Optional[str] = None
    faixa_ip_dispositivos_iot: Optional[str] = None
    aponta_uso_vlan: bool = True
    equipamentos_rede: List[Equipamento] = []
    observacoes: Optional[str] = None


# =============================================================================
# MODELOS DE CHECKLIST
# =============================================================================

class ChecklistItem(BaseModel):
    """Item de checklist."""
    codigo: str = Field(..., description="Ex: PRE-001, BAN-001, CAM-001")
    descricao: str
    obrigatorio: bool = True
    categoria: Optional[str] = None
    ai_hint: Optional[str] = Field(None, description="Dica de IA para validar este item")


class Checklist(BaseModel):
    """Checklist completo de uma etapa."""
    nome: str
    etapa: EtapaProjeto
    itens: List[ChecklistItem]


# =============================================================================
# MODELOS DE DOCUMENTAÇÃO
# =============================================================================

class DocumentoTecnico(BaseModel):
    """Documento técnico gerado pelo agente."""
    titulo: str
    versao: str = "1.0.0"
    conteudo_markdown: str
    metadata: Optional[Dict[str, Any]] = None


class ResultadoLLM(BaseModel):
    """Resultado de uma geração via LLM."""
    texto_bruto: str
    resumo_executivo: Optional[str] = None
    tokens_utilizados: Optional[int] = None
    modelo_utilizado: Optional[str] = None
    tempo_processamento_ms: Optional[int] = None


# =============================================================================
# MODELOS DE TROUBLESHOOTING
# =============================================================================

class PassoTroubleshooting(BaseModel):
    """Passo de diagnóstico/resolução."""
    ordem: int
    titulo: str
    descricao: str
    acao: str
    resultado_esperado: str
    se_falhar: Optional[str] = None


class TroubleshootingGuia(BaseModel):
    """Guia completo de troubleshooting."""
    titulo: str
    categoria: CategoriaTroubleshooting
    fabricante: Optional[str] = None
    sintoma: str
    causas_provaveis: List[str]
    passos: List[PassoTroubleshooting]
    solucao_rapida: Optional[str] = None
    quando_escalar: Optional[str] = None


# =============================================================================
# MODELOS DE ESQUEMA DE BORNES
# =============================================================================

class ConexaoBorne(BaseModel):
    """Conexão entre bornes de equipamentos."""
    equipamento_origem: str
    borne_origem: str
    equipamento_destino: str
    borne_destino: str
    tipo_cabo: str = "UTP"
    cor_sugerida: Optional[str] = None
    observacao: Optional[str] = None


class EsquemaBornes(BaseModel):
    """Esquema completo de ligação de bornes."""
    titulo: str
    fabricante: str
    equipamentos: List[str]
    conexoes: List[ConexaoBorne]
    alimentacao: Optional[str] = None
    alertas: List[str] = []
    diagrama_ascii: Optional[str] = None


# =============================================================================
# MODELOS DE FLUXO DE INSTALAÇÃO
# =============================================================================

class PassoInstalacao(BaseModel):
    """Passo de instalação em campo."""
    ordem: int
    titulo: str
    descricao: str
    tempo_estimado_min: int = 15
    requer_foto: bool = False
    requer_teste: bool = False
    equipamentos_envolvidos: List[str] = []
    dica_tecnico: Optional[str] = None


class FluxoInstalacao(BaseModel):
    """Fluxo completo de instalação."""
    titulo: str
    acesso: str
    passos: List[PassoInstalacao]
    tempo_total_estimado_min: int
    materiais_necessarios: List[str] = []
    ferramentas_necessarias: List[str] = []
