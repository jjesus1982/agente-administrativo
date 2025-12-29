"""
Schemas Pydantic para Tenant (Condomínio)
Integração Conecta Plus + App Simples
"""

from datetime import date, datetime
from typing import List, Optional, Dict, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator, EmailStr


# ══════════════════════════════════════════════════════════════
# ENUMS
# ══════════════════════════════════════════════════════════════

class TipoEstrutura(str, Enum):
    """Tipos de estrutura de condomínio"""
    CASAS = "casas"
    APARTAMENTOS = "apartamentos"
    APARTAMENTOS_BLOCOS = "apartamentos_blocos"
    APARTAMENTOS_TORRES = "apartamentos_torres"
    APARTAMENTOS_TORRES_BLOCOS = "apartamentos_torres_blocos"


class PlanoCondominio(str, Enum):
    """Planos disponíveis"""
    BASICO = "basico"
    PROFISSIONAL = "profissional"
    ENTERPRISE = "enterprise"


class TipoAgrupador(str, Enum):
    """Tipos de agrupador (bloco, torre, etc.)"""
    BLOCO = "bloco"
    TORRE = "torre"
    QUADRA = "quadra"
    ALA = "ala"
    SETOR = "setor"


# ══════════════════════════════════════════════════════════════
# SCHEMAS DE CONFIGURAÇÃO
# ══════════════════════════════════════════════════════════════

class AgrupadorSchema(BaseModel):
    """Schema para agrupadores (blocos, torres)"""
    tipo: TipoAgrupador
    nome: str = Field(..., min_length=1, max_length=50)
    parent: Optional[str] = Field(None, description="Nome do agrupador pai (para estruturas hierárquicas)")
    ordem: int = Field(1, ge=1, description="Ordem de exibição")

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "tipo": "bloco",
                    "nome": "Bloco A",
                    "parent": None,
                    "ordem": 1
                },
                {
                    "tipo": "bloco",
                    "nome": "Bloco A",
                    "parent": "Torre 1",
                    "ordem": 1
                }
            ]
        }


class NomenclaturaSchema(BaseModel):
    """Schema para nomenclatura customizada"""
    unidade: str = Field("Apartamento", description="Nome da unidade (Apartamento, Casa, Sala)")
    agrupador1: Optional[str] = Field("Bloco", description="Nome do agrupador principal")
    agrupador2: Optional[str] = Field(None, description="Nome do agrupador secundário")
    formato_endereco: Optional[str] = Field(
        None,
        description="Formato customizado do endereço. Ex: '{agrupador1} {numero_agrupador}, {unidade} {numero}'"
    )

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "unidade": "Apartamento",
                    "agrupador1": "Bloco",
                    "agrupador2": None,
                    "formato_endereco": "{agrupador1} {numero_agrupador}, {unidade} {numero}"
                },
                {
                    "unidade": "Casa",
                    "agrupador1": "Quadra",
                    "agrupador2": None,
                    "formato_endereco": "Casa {numero}, {agrupador1} {numero_agrupador}"
                }
            ]
        }


class AreaComumSchema(BaseModel):
    """Schema para área comum"""
    id: str = Field(..., min_length=1, max_length=50, description="ID único da área")
    nome: str = Field(..., min_length=1, max_length=100)
    icone: str = Field("building", description="Ícone Lucide React")
    descricao: Optional[str] = Field(None, max_length=500)
    capacidade: Optional[int] = Field(None, ge=1, description="Capacidade máxima de pessoas")
    regras: Optional[str] = Field(None, max_length=1000, description="Regras de uso")

    # Horário de funcionamento
    horario_inicio: str = Field("00:00", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    horario_fim: str = Field("23:59", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    dias_semana: List[int] = Field([0,1,2,3,4,5,6], description="Dias da semana (0=domingo, 6=sábado)")

    # Reservas
    antecedencia_min_dias: int = Field(0, ge=0, description="Antecedência mínima em dias")
    antecedencia_max_dias: int = Field(30, ge=1, description="Antecedência máxima em dias")
    valor_taxa: Optional[float] = Field(None, ge=0, description="Taxa de uso (null = gratuito)")
    requer_aprovacao: bool = Field(False, description="Requer aprovação do síndico")

    ativo: bool = Field(True)

    @validator('dias_semana')
    def validate_dias_semana(cls, v):
        if not all(0 <= dia <= 6 for dia in v):
            raise ValueError('Dias da semana devem ser entre 0 (domingo) e 6 (sábado)')
        return sorted(list(set(v)))  # Remove duplicatas e ordena

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "id": "churrasqueira",
                    "nome": "Churrasqueira Principal",
                    "icone": "flame",
                    "descricao": "Área coberta com churrasqueira a gás e mesas",
                    "capacidade": 30,
                    "regras": "Máximo 4h de uso. Limpeza obrigatória.",
                    "horario_inicio": "08:00",
                    "horario_fim": "22:00",
                    "dias_semana": [0,1,2,3,4,5,6],
                    "antecedencia_min_dias": 1,
                    "antecedencia_max_dias": 30,
                    "valor_taxa": 100.00,
                    "requer_aprovacao": False,
                    "ativo": True
                }
            ]
        }


class FuncionalidadesSchema(BaseModel):
    """Schema para funcionalidades habilitadas"""
    convites: bool = True
    entregas: bool = True
    reservas: bool = True
    pets: bool = True
    veiculos: bool = True
    ocorrencias: bool = True
    comunicados: bool = True
    ligacoes: bool = True
    classificados: bool = False
    enquetes: bool = True
    financeiro: bool = False
    portaria_remota: bool = True
    reconhecimento_facial: bool = False
    qr_code: bool = True


class ConfigSegurancaSchema(BaseModel):
    """Schema para configurações de segurança"""
    exige_aprovacao_cadastro: bool = True
    aprovador: str = Field("sindico", pattern="^(sindico|porteiro|ambos)$")
    tempo_expiracao_convite_horas: int = Field(24, ge=1, le=168)  # Max 7 dias
    max_visitantes_simultaneos: int = Field(10, ge=1, le=100)
    validacao_facial_obrigatoria: bool = False
    permite_cadastro_autonomo: bool = True
    permite_multiplos_usuarios_unidade: bool = True
    max_usuarios_por_unidade: int = Field(5, ge=1, le=20)


# ══════════════════════════════════════════════════════════════
# SCHEMAS PRINCIPAIS
# ══════════════════════════════════════════════════════════════

class TenantCreateSchema(BaseModel):
    """Schema para criação de novo condomínio"""

    # Dados básicos
    nome: str = Field(..., min_length=3, max_length=255)
    cnpj: Optional[str] = Field(None, pattern=r"^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$")
    endereco: Optional[str] = Field(None, max_length=500)
    bairro: Optional[str] = Field(None, max_length=100)
    cidade: str = Field(..., min_length=2, max_length=100)
    estado: str = Field(..., min_length=2, max_length=2, pattern=r"^[A-Z]{2}$")
    cep: Optional[str] = Field(None, pattern=r"^\d{5}-?\d{3}$")
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    logo_url: Optional[str] = Field(None, max_length=500)

    # Estrutura
    tipo_estrutura: TipoEstrutura
    nomenclatura: NomenclaturaSchema = NomenclaturaSchema()
    agrupadores: List[AgrupadorSchema] = []

    # Configurações
    areas_comuns: List[AreaComumSchema] = []
    funcionalidades: FuncionalidadesSchema = FuncionalidadesSchema()
    config_seguranca: ConfigSegurancaSchema = ConfigSegurancaSchema()

    # Contrato
    plano: PlanoCondominio = PlanoCondominio.BASICO
    data_contrato: Optional[date] = None
    data_expiracao: Optional[date] = None
    ativo: bool = True

    @validator('data_expiracao')
    def validate_data_expiracao(cls, v, values):
        if v and 'data_contrato' in values and values['data_contrato']:
            if v <= values['data_contrato']:
                raise ValueError('Data de expiração deve ser posterior à data do contrato')
        return v

    @validator('agrupadores')
    def validate_agrupadores_structure(cls, v, values):
        """Valida se a estrutura de agrupadores está consistente com o tipo"""
        tipo = values.get('tipo_estrutura')

        if tipo == TipoEstrutura.CASAS:
            if v:
                raise ValueError('Condomínio de casas não deve ter agrupadores')

        elif tipo == TipoEstrutura.APARTAMENTOS:
            if v:
                raise ValueError('Apartamentos simples não devem ter agrupadores')

        elif tipo in [TipoEstrutura.APARTAMENTOS_BLOCOS, TipoEstrutura.APARTAMENTOS_TORRES]:
            if not v:
                raise ValueError(f'Tipo {tipo} requer pelo menos um agrupador')

            # Todos devem ser do mesmo tipo
            tipos_presentes = set(ag.tipo for ag in v)
            if len(tipos_presentes) > 1:
                raise ValueError(f'Tipo {tipo} deve ter agrupadores de um único tipo')

        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "nome": "Residencial Vista Verde",
                    "cnpj": "12.345.678/0001-90",
                    "endereco": "Rua das Flores, 500",
                    "bairro": "Centro",
                    "cidade": "Manaus",
                    "estado": "AM",
                    "cep": "69010-000",
                    "telefone": "(92) 99999-9999",
                    "email": "contato@vistaverde.com.br",
                    "tipo_estrutura": "apartamentos_blocos",
                    "nomenclatura": {
                        "unidade": "Apartamento",
                        "agrupador1": "Bloco"
                    },
                    "agrupadores": [
                        {"tipo": "bloco", "nome": "Bloco A", "ordem": 1},
                        {"tipo": "bloco", "nome": "Bloco B", "ordem": 2}
                    ],
                    "areas_comuns": [
                        {
                            "id": "piscina",
                            "nome": "Piscina",
                            "icone": "waves",
                            "capacidade": 50,
                            "horario_inicio": "06:00",
                            "horario_fim": "22:00",
                            "valor_taxa": None,
                            "ativo": True
                        }
                    ],
                    "plano": "profissional"
                }
            ]
        }


class TenantUpdateSchema(BaseModel):
    """Schema para atualização de condomínio"""

    # Permitir atualização de campos específicos
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    endereco: Optional[str] = Field(None, max_length=500)
    bairro: Optional[str] = Field(None, max_length=100)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    logo_url: Optional[str] = Field(None, max_length=500)

    # Configurações que podem ser alteradas
    areas_comuns: Optional[List[AreaComumSchema]] = None
    funcionalidades: Optional[FuncionalidadesSchema] = None
    config_seguranca: Optional[ConfigSegurancaSchema] = None

    # Status
    ativo: Optional[bool] = None
    data_expiracao: Optional[date] = None

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "nome": "Residencial Vista Verde - Atualizado",
                    "telefone": "(92) 88888-8888",
                    "funcionalidades": {
                        "financeiro": True,
                        "reconhecimento_facial": True
                    }
                }
            ]
        }


class TenantResponseSchema(BaseModel):
    """Schema para resposta de tenant"""

    id: str
    nome: str
    cnpj: Optional[str]
    endereco: Optional[str]
    bairro: Optional[str]
    cidade: str
    estado: str
    cep: Optional[str]
    telefone: Optional[str]
    email: Optional[str]
    logo_url: Optional[str]

    tipo_estrutura: str
    nomenclatura: Dict[str, Any]
    agrupadores: List[Dict[str, Any]]
    areas_comuns: List[Dict[str, Any]]
    funcionalidades: Dict[str, bool]
    config_seguranca: Dict[str, Any]

    ativo: bool
    plano: str
    data_contrato: Optional[date]
    data_expiracao: Optional[date]

    created_at: datetime
    updated_at: Optional[datetime]
    created_by: Optional[str]

    class Config:
        from_attributes = True


class TenantListSchema(BaseModel):
    """Schema para listagem de condomínios"""

    id: str
    nome: str
    cidade: str
    estado: str
    tipo_estrutura: str
    ativo: bool
    plano: str
    total_unidades: int = 0
    total_moradores: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════
# SCHEMAS PARA API PÚBLICA (APP SIMPLES)
# ══════════════════════════════════════════════════════════════

class TenantPublicSchema(BaseModel):
    """Schema público para listagem de condomínios (sem dados sensíveis)"""

    id: str
    nome: str
    endereco: Optional[str]
    bairro: Optional[str]
    cidade: str
    estado: str
    logo_url: Optional[str]

    tipo_estrutura: str
    nomenclatura: Dict[str, str]  # Apenas campos básicos
    agrupadores: List[Dict[str, str]]  # Apenas nome e tipo

    # Configurações públicas para cadastro
    exige_aprovacao: bool
    aprovador: str
    permite_cadastro_autonomo: bool

    class Config:
        from_attributes = True
        json_schema_extra = {
            "examples": [
                {
                    "id": "uuid-here",
                    "nome": "Residencial Vista Verde",
                    "endereco": "Rua das Flores, 500",
                    "cidade": "Manaus",
                    "estado": "AM",
                    "logo_url": "https://example.com/logo.png",
                    "tipo_estrutura": "apartamentos_blocos",
                    "nomenclatura": {
                        "unidade": "Apartamento",
                        "agrupador1": "Bloco"
                    },
                    "agrupadores": [
                        {"tipo": "bloco", "nome": "Bloco A"},
                        {"tipo": "bloco", "nome": "Bloco B"}
                    ],
                    "exige_aprovacao": True,
                    "aprovador": "sindico",
                    "permite_cadastro_autonomo": True
                }
            ]
        }