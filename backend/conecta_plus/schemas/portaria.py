"""
Schemas do Módulo Controle de Portaria
"""

from datetime import date, datetime, time
from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator

from conecta_plus.schemas.common import BaseSchema, PaginatedResponse


# =============================================================================
# GRUPOS DE ACESSO
# =============================================================================
class GrupoAcessoBase(BaseSchema):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=255)
    descricao: Optional[str] = None
    permite_morador: bool = True
    permite_visitante: bool = True
    permite_prestador: bool = True
    permite_entregador: bool = True
    blocos_permitidos: Optional[List[str]] = None
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    dias_semana: Optional[List[int]] = None  # 0=dom, 1=seg, ..., 6=sab
    is_default: bool = False
    is_active: bool = True


class GrupoAcessoCreate(GrupoAcessoBase):
    pass


class GrupoAcessoUpdate(BaseSchema):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=255)
    descricao: Optional[str] = None
    permite_morador: Optional[bool] = None
    permite_visitante: Optional[bool] = None
    permite_prestador: Optional[bool] = None
    permite_entregador: Optional[bool] = None
    blocos_permitidos: Optional[List[str]] = None
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    dias_semana: Optional[List[int]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class GrupoAcessoResponse(GrupoAcessoBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class GrupoAcessoListResponse(PaginatedResponse[GrupoAcessoResponse]):
    pass


# =============================================================================
# PONTOS DE ACESSO
# =============================================================================
class PontoAcessoBase(BaseSchema):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=255)
    descricao: Optional[str] = None
    tipo: str = Field("porta_social", max_length=50)
    device_id: Optional[int] = None
    ip_address: Optional[str] = Field(None, max_length=50)
    porta: Optional[int] = None
    rele_id: Optional[str] = Field(None, max_length=100)
    sensor_id: Optional[str] = Field(None, max_length=100)
    is_eclusa: bool = False
    eclusa_pair_id: Optional[int] = None
    eclusa_delay: int = 5
    interfone_ramal: Optional[str] = Field(None, max_length=20)
    interfone_ip: Optional[str] = Field(None, max_length=50)
    ordem: int = 0
    visivel: bool = True
    is_active: bool = True


class PontoAcessoCreate(PontoAcessoBase):
    pass


class PontoAcessoUpdate(BaseSchema):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=255)
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    device_id: Optional[int] = None
    ip_address: Optional[str] = None
    porta: Optional[int] = None
    rele_id: Optional[str] = None
    sensor_id: Optional[str] = None
    is_eclusa: Optional[bool] = None
    eclusa_pair_id: Optional[int] = None
    eclusa_delay: Optional[int] = None
    interfone_ramal: Optional[str] = None
    interfone_ip: Optional[str] = None
    ordem: Optional[int] = None
    visivel: Optional[bool] = None
    is_active: Optional[bool] = None


class PontoAcessoResponse(PontoAcessoBase):
    id: int
    tenant_id: int
    status: str = "offline"
    last_ping_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class PontoAcessoListResponse(PaginatedResponse[PontoAcessoResponse]):
    pass


class PontoAcessoStatusResponse(BaseSchema):
    id: int
    codigo: str
    nome: str
    status: str
    last_ping_at: Optional[datetime] = None
    is_online: bool = False


# =============================================================================
# PRÉ-AUTORIZAÇÕES
# =============================================================================
class PreAutorizacaoBase(BaseSchema):
    unit_id: int
    visitante_nome: str = Field(..., min_length=1, max_length=255)
    visitante_documento: Optional[str] = Field(None, max_length=20)
    visitante_telefone: Optional[str] = Field(None, max_length=20)
    visitante_email: Optional[str] = Field(None, max_length=255)
    visitante_tipo: str = Field("visitante", max_length=30)
    veiculo_placa: Optional[str] = Field(None, max_length=10)
    veiculo_modelo: Optional[str] = Field(None, max_length=100)
    veiculo_cor: Optional[str] = Field(None, max_length=50)
    data_inicio: date
    data_fim: date
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    dias_semana: Optional[List[int]] = None
    tipo: str = Field("unica", max_length=30)
    is_single_use: bool = True
    max_usos: int = Field(1, ge=1)
    grupo_acesso_id: Optional[int] = None
    ponto_acesso_id: Optional[int] = None
    observacoes: Optional[str] = None


class PreAutorizacaoCreate(PreAutorizacaoBase):
    pass


class PreAutorizacaoUpdate(BaseSchema):
    visitante_nome: Optional[str] = Field(None, min_length=1, max_length=255)
    visitante_documento: Optional[str] = None
    visitante_telefone: Optional[str] = None
    visitante_email: Optional[str] = None
    veiculo_placa: Optional[str] = None
    veiculo_modelo: Optional[str] = None
    veiculo_cor: Optional[str] = None
    data_fim: Optional[date] = None
    horario_inicio: Optional[time] = None
    horario_fim: Optional[time] = None
    dias_semana: Optional[List[int]] = None
    max_usos: Optional[int] = None
    observacoes: Optional[str] = None
    status: Optional[str] = None


class PreAutorizacaoResponse(PreAutorizacaoBase):
    id: int
    tenant_id: int
    morador_id: int
    qr_code: str
    qr_code_url: Optional[str] = None
    status: str
    usos_realizados: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Dados adicionais
    unit_number: Optional[str] = None
    unit_block: Optional[str] = None
    morador_nome: Optional[str] = None


class PreAutorizacaoListResponse(PaginatedResponse[PreAutorizacaoResponse]):
    pass


class PreAutorizacaoValidarRequest(BaseSchema):
    qr_code: str
    ponto_acesso_id: Optional[int] = None


class PreAutorizacaoValidarResponse(BaseSchema):
    valido: bool
    mensagem: str
    pre_autorizacao: Optional[PreAutorizacaoResponse] = None


# =============================================================================
# TIPOS DE OCORRÊNCIA
# =============================================================================
class TipoOcorrenciaBase(BaseSchema):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=255)
    descricao: Optional[str] = None
    icone: Optional[str] = Field(None, max_length=50)
    cor: Optional[str] = Field(None, max_length=20)
    severidade_padrao: str = Field("media", max_length=20)
    requer_foto: bool = False
    notificar_sindico: bool = True
    notificar_administracao: bool = False
    evento_trigger: Optional[str] = Field(None, max_length=100)
    ordem: int = 0
    is_active: bool = True


class TipoOcorrenciaCreate(TipoOcorrenciaBase):
    pass


class TipoOcorrenciaUpdate(BaseSchema):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    icone: Optional[str] = None
    cor: Optional[str] = None
    severidade_padrao: Optional[str] = None
    requer_foto: Optional[bool] = None
    notificar_sindico: Optional[bool] = None
    notificar_administracao: Optional[bool] = None
    evento_trigger: Optional[str] = None
    ordem: Optional[int] = None
    is_active: Optional[bool] = None


class TipoOcorrenciaResponse(TipoOcorrenciaBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class TipoOcorrenciaListResponse(PaginatedResponse[TipoOcorrenciaResponse]):
    pass


# =============================================================================
# INTEGRAÇÕES DE HARDWARE
# =============================================================================
class IntegracaoBase(BaseSchema):
    parceiro: str = Field(..., min_length=1, max_length=50)
    nome_exibicao: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    config: Optional[Dict[str, Any]] = None
    sync_moradores: bool = True
    sync_visitantes: bool = True
    sync_veiculos: bool = False
    sync_acessos: bool = True
    is_active: bool = True


class IntegracaoCreate(IntegracaoBase):
    pass


class IntegracaoUpdate(BaseSchema):
    nome_exibicao: Optional[str] = None
    logo_url: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    sync_moradores: Optional[bool] = None
    sync_visitantes: Optional[bool] = None
    sync_veiculos: Optional[bool] = None
    sync_acessos: Optional[bool] = None
    is_active: Optional[bool] = None


class IntegracaoResponse(IntegracaoBase):
    id: int
    tenant_id: int
    status: str
    last_health_check: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class IntegracaoListResponse(PaginatedResponse[IntegracaoResponse]):
    pass


class IntegracaoTesteResponse(BaseSchema):
    sucesso: bool
    mensagem: str
    detalhes: Optional[Dict[str, Any]] = None


class SincronizacaoLogResponse(BaseSchema):
    id: int
    integracao_id: int
    tipo_sync: str
    direcao: str
    status: str
    registros_total: int
    registros_sucesso: int
    registros_erro: int
    erro_mensagem: Optional[str] = None
    iniciado_em: Optional[datetime] = None
    finalizado_em: Optional[datetime] = None
    duracao_ms: Optional[int] = None
    created_at: datetime


# =============================================================================
# VAGAS DE GARAGEM
# =============================================================================
class VagaGaragemBase(BaseSchema):
    numero: str = Field(..., min_length=1, max_length=20)
    bloco: Optional[str] = Field(None, max_length=50)
    andar: Optional[str] = Field(None, max_length=20)
    tipo: str = Field("fixa", max_length=30)
    unit_id: Optional[int] = None
    posicao_x: float = 0
    posicao_y: float = 0
    largura: float = 50
    altura: float = 100
    rotacao: float = 0
    mapa_id: Optional[str] = Field(None, max_length=50)
    is_active: bool = True


class VagaGaragemCreate(VagaGaragemBase):
    parking_spot_id: Optional[int] = None


class VagaGaragemUpdate(BaseSchema):
    numero: Optional[str] = None
    bloco: Optional[str] = None
    andar: Optional[str] = None
    tipo: Optional[str] = None
    unit_id: Optional[int] = None
    posicao_x: Optional[float] = None
    posicao_y: Optional[float] = None
    largura: Optional[float] = None
    altura: Optional[float] = None
    rotacao: Optional[float] = None
    mapa_id: Optional[str] = None
    is_active: Optional[bool] = None


class VagaGaragemResponse(VagaGaragemBase):
    id: int
    tenant_id: int
    parking_spot_id: Optional[int] = None
    status: str = "livre"
    ocupada_desde: Optional[datetime] = None
    veiculo_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Dados adicionais
    unit_number: Optional[str] = None
    unit_block: Optional[str] = None
    veiculo_placa: Optional[str] = None
    veiculo_modelo: Optional[str] = None


class VagaGaragemListResponse(PaginatedResponse[VagaGaragemResponse]):
    pass


class MapaGaragemResponse(BaseSchema):
    mapa_id: str
    nome: str
    vagas: List[VagaGaragemResponse]
    total_vagas: int
    vagas_ocupadas: int
    vagas_livres: int
    ocupacao_percentual: float


class OcupacaoGaragemResponse(BaseSchema):
    total_vagas: int
    vagas_ocupadas: int
    vagas_livres: int
    vagas_reservadas: int
    vagas_manutencao: int
    ocupacao_percentual: float
    por_tipo: Dict[str, int]


# =============================================================================
# VISITAS
# =============================================================================
class VisitaBase(BaseSchema):
    visitor_id: Optional[int] = None
    visitante_nome: str = Field(..., min_length=1, max_length=255)
    visitante_documento: Optional[str] = Field(None, max_length=20)
    visitante_foto_url: Optional[str] = Field(None, max_length=500)
    unit_id: int
    tipo: str = Field("visita", max_length=30)
    veiculo_placa: Optional[str] = Field(None, max_length=10)
    veiculo_modelo: Optional[str] = Field(None, max_length=100)
    observacoes: Optional[str] = None


class VisitaCreate(VisitaBase):
    pre_autorizacao_id: Optional[int] = None
    ponto_entrada_id: Optional[int] = None


class VisitaAutorizar(BaseSchema):
    autorizado_por: Optional[str] = None
    metodo_autorizacao: str = "porteiro"
    ponto_entrada_id: Optional[int] = None


class VisitaNegar(BaseSchema):
    motivo_negacao: str = Field(..., min_length=1)


class VisitaFinalizar(BaseSchema):
    ponto_saida_id: Optional[int] = None
    observacoes: Optional[str] = None


class VisitaResponse(VisitaBase):
    id: int
    tenant_id: int
    morador_id: Optional[int] = None
    porteiro_entrada_id: Optional[int] = None
    porteiro_saida_id: Optional[int] = None
    status: str
    data_entrada: Optional[datetime] = None
    data_saida: Optional[datetime] = None
    autorizado_por: Optional[str] = None
    metodo_autorizacao: Optional[str] = None
    pre_autorizacao_id: Optional[int] = None
    ponto_entrada_id: Optional[int] = None
    ponto_saida_id: Optional[int] = None
    motivo_negacao: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    # Dados adicionais
    unit_number: Optional[str] = None
    unit_block: Optional[str] = None
    morador_nome: Optional[str] = None
    porteiro_entrada_nome: Optional[str] = None


class VisitaListResponse(PaginatedResponse[VisitaResponse]):
    pass


# =============================================================================
# COMUNICAÇÕES PORTARIA
# =============================================================================
class ComunicacaoBase(BaseSchema):
    unit_id: int
    direcao: str  # para_unidade, para_portaria
    tipo_mensagem: str = "texto"
    conteudo: Optional[str] = None
    anexo_url: Optional[str] = None
    visita_id: Optional[int] = None
    pre_autorizacao_id: Optional[int] = None


class ComunicacaoCreate(ComunicacaoBase):
    pass


class ComunicacaoResponse(ComunicacaoBase):
    id: int
    tenant_id: int
    porteiro_id: int
    morador_id: Optional[int] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime
    # Dados adicionais
    porteiro_nome: Optional[str] = None
    morador_nome: Optional[str] = None
    unit_number: Optional[str] = None
    unit_block: Optional[str] = None


class ComunicacaoListResponse(PaginatedResponse[ComunicacaoResponse]):
    pass


# =============================================================================
# DASHBOARD PORTARIA
# =============================================================================
class DashboardPortariaStats(BaseSchema):
    # Visitantes
    visitantes_hoje: int = 0
    visitantes_no_condominio: int = 0
    visitantes_aguardando: int = 0

    # Entregas
    entregas_pendentes: int = 0
    entregas_hoje: int = 0

    # Acessos
    acessos_hoje: int = 0
    acessos_ultima_hora: int = 0

    # Ocorrências
    ocorrencias_abertas: int = 0
    ocorrencias_hoje: int = 0

    # Garagem
    vagas_ocupadas: int = 0
    vagas_livres: int = 0
    ocupacao_percentual: float = 0


class DashboardPortariaResponse(BaseSchema):
    stats: DashboardPortariaStats
    visitantes_ativos: List[VisitaResponse] = []
    ultimos_acessos: List[Dict[str, Any]] = []
    pontos_acesso_status: List[PontoAcessoStatusResponse] = []
    alertas: List[Dict[str, Any]] = []


class TurnoInfo(BaseSchema):
    turno_atual: str  # manha, tarde, noite
    porteiro_id: Optional[int] = None
    porteiro_nome: Optional[str] = None
    inicio_turno: Optional[datetime] = None
    fim_turno: Optional[datetime] = None


class LivroPortariaEntry(BaseSchema):
    titulo: str = Field(..., min_length=1, max_length=255)
    conteudo: str = Field(..., min_length=1)
    categoria: Optional[str] = None


class LivroPortariaResponse(BaseSchema):
    id: int
    tenant_id: int
    user_id: int
    user_nome: Optional[str] = None
    titulo: str
    conteudo: str
    categoria: Optional[str] = None
    shift: Optional[str] = None
    registered_at: datetime
    created_at: datetime


# =============================================================================
# PARCEIROS DE INTEGRAÇÃO
# =============================================================================
class ParceiroIntegracao(BaseSchema):
    codigo: str
    nome: str
    logo_url: Optional[str] = None
    descricao: Optional[str] = None
    tipos_suportados: List[str] = []  # facial, biometria, cameras, portoes, interfone


PARCEIROS_DISPONIVEIS = [
    ParceiroIntegracao(
        codigo="intelbras",
        nome="Intelbras",
        logo_url="/integrations/intelbras.png",
        descricao="Reconhecimento facial, interfones, câmeras",
        tipos_suportados=["facial", "interfone", "cameras"]
    ),
    ParceiroIntegracao(
        codigo="controlid",
        nome="Control iD",
        logo_url="/integrations/controlid.png",
        descricao="Reconhecimento facial e biometria",
        tipos_suportados=["facial", "biometria"]
    ),
    ParceiroIntegracao(
        codigo="hikvision",
        nome="Hikvision",
        logo_url="/integrations/hikvision.png",
        descricao="Câmeras e NVR",
        tipos_suportados=["cameras", "nvr"]
    ),
    ParceiroIntegracao(
        codigo="linear",
        nome="Linear",
        logo_url="/integrations/linear.png",
        descricao="Controle de acesso",
        tipos_suportados=["portoes", "catracas"]
    ),
    ParceiroIntegracao(
        codigo="nice",
        nome="Nice",
        logo_url="/integrations/nice.png",
        descricao="Automatização de portões",
        tipos_suportados=["portoes"]
    ),
]
