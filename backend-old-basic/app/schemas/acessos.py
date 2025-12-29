"""
Schemas Pydantic para Solicitações de Acesso
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TipoAcesso(str, Enum):
    facial = "facial"
    veicular = "veicular"
    tag = "tag"


class StatusAcesso(str, Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    recusado = "recusado"


# === Morador Resumido ===
class MoradorAcessoResumo(BaseModel):
    id: int
    nome: str
    foto_perfil: Optional[str] = None
    bloco: Optional[str] = None
    apartamento: Optional[str] = None
    telefone: Optional[str] = None
    inadimplente: bool = False
    restricoes: Optional[str] = None

    class Config:
        from_attributes = True


# === Solicitação ===
class SolicitacaoBase(BaseModel):
    tipo: TipoAcesso
    imagem_url: Optional[str] = None
    placa_veiculo: Optional[str] = None
    modelo_veiculo: Optional[str] = None
    cor_veiculo: Optional[str] = None
    numero_tag: Optional[str] = None


class SolicitacaoCreate(SolicitacaoBase):
    pass


class SolicitacaoResponse(SolicitacaoBase):
    id: int
    morador_id: int
    status: StatusAcesso
    motivo_recusa: Optional[str] = None
    tentativa_numero: int
    validacao_ia_resultado: Optional[str] = None
    validacao_ia_motivo: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    morador: Optional[MoradorAcessoResumo] = None

    class Config:
        from_attributes = True


class SolicitacaoDetalhe(SolicitacaoResponse):
    logs: List["LogResponse"] = []


# === Ações ===
class AprovarRequest(BaseModel):
    observacao: Optional[str] = None


class RecusarRequest(BaseModel):
    motivo: str = Field(..., min_length=3, max_length=255)
    observacao: Optional[str] = None


# === Log ===
class LogResponse(BaseModel):
    id: int
    acao: str
    usuario_admin_id: Optional[int] = None
    observacao: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# === Listagem com Paginação ===
class SolicitacaoListResponse(BaseModel):
    items: List[SolicitacaoResponse]
    total: int
    page: int
    pages: int
    pendentes: int
    aprovados: int
    recusados: int


# === Agrupamento por Morador ===
class MoradorAgrupado(BaseModel):
    morador: MoradorAcessoResumo
    total_solicitacoes: int
    total_recusadas: int
    solicitacoes: List[SolicitacaoResponse]


# === Motivos Padrão de Recusa ===
MOTIVOS_RECUSA_PADRAO = [
    "Foto escura ou com baixa iluminação",
    "Documento ilegível",
    "Imagem não corresponde ao morador",
    "Uso de boné, óculos ou acessórios",
    "Baixa resolução ou imagem pixelada",
    "Placa do veículo não visível",
    "Dados do veículo incorretos",
    "Tag já cadastrada para outro morador",
    "Morador com restrição ativa",
    "Outro motivo",
]
