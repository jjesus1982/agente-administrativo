"""
Model Tenant - Condomínio (Multi-tenant) com Configuração Dinâmica
Integração Conecta Plus + App Simples
"""

import uuid
from datetime import datetime, date
from sqlalchemy import Boolean, Column, DateTime, Date, Integer, String, Text, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Tenant(Base, TimestampMixin):
    """
    Condomínio - Configuração dinâmica completa para integração
    Suporta estruturas flexíveis: casas, apartamentos, blocos, torres
    """

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # ══════════════════════════════════════════════════════════════
    # DADOS BÁSICOS
    # ══════════════════════════════════════════════════════════════
    nome = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, index=True)
    endereco = Column(String(500))
    bairro = Column(String(100))
    cidade = Column(String(100))
    estado = Column(String(2))
    cep = Column(String(10))
    telefone = Column(String(20))
    email = Column(String(255))
    logo_url = Column(String(500))

    # ══════════════════════════════════════════════════════════════
    # ESTRUTURA DO CONDOMÍNIO
    # ══════════════════════════════════════════════════════════════
    tipo_estrutura = Column(String(50), nullable=False, default="apartamentos")
    """
    Valores possíveis:
    - 'casas'                      -> Apenas casas numeradas
    - 'apartamentos'               -> Apenas apartamentos (sem blocos)
    - 'apartamentos_blocos'        -> Apartamentos divididos por blocos
    - 'apartamentos_torres'        -> Apartamentos divididos por torres
    - 'apartamentos_torres_blocos' -> Torres contendo blocos com apartamentos
    """

    # ══════════════════════════════════════════════════════════════
    # NOMENCLATURA CUSTOMIZADA
    # ══════════════════════════════════════════════════════════════
    nomenclatura = Column(JSONB, default={})
    """
    Exemplo:
    {
        "unidade": "Apartamento",     // ou "Casa", "Sala", "Loja"
        "agrupador1": "Bloco",        // ou "Torre", "Quadra", "Setor"
        "agrupador2": "Ala",          // opcional, para estruturas complexas
        "formato_endereco": "{agrupador1} {numero_agrupador}, {unidade} {numero}"
    }
    """

    # ══════════════════════════════════════════════════════════════
    # LISTA DE BLOCOS/TORRES
    # ══════════════════════════════════════════════════════════════
    agrupadores = Column(JSONB, default=[])
    """
    Exemplo para "apartamentos_torres_blocos":
    [
        {"tipo": "torre", "nome": "Torre 1", "ordem": 1},
        {"tipo": "torre", "nome": "Torre 2", "ordem": 2},
        {"tipo": "bloco", "nome": "Bloco A", "parent": "Torre 1", "ordem": 1},
        {"tipo": "bloco", "nome": "Bloco B", "parent": "Torre 1", "ordem": 2},
        {"tipo": "bloco", "nome": "Bloco A", "parent": "Torre 2", "ordem": 1},
    ]

    Exemplo para "apartamentos_blocos":
    [
        {"tipo": "bloco", "nome": "Bloco A", "ordem": 1},
        {"tipo": "bloco", "nome": "Bloco B", "ordem": 2},
        {"tipo": "bloco", "nome": "Bloco C", "ordem": 3},
    ]

    Exemplo para "casas":
    [] // vazio, casas são apenas numeradas
    """

    # ══════════════════════════════════════════════════════════════
    # ÁREAS COMUNS DISPONÍVEIS
    # ══════════════════════════════════════════════════════════════
    areas_comuns = Column(JSONB, default=[])
    """
    [
        {
            "id": "churrasqueira",
            "nome": "Churrasqueira",
            "icone": "flame",           // ícone do Lucide React
            "descricao": "Área com churrasqueira e mesas",
            "capacidade": 30,
            "regras": "Máximo 4h de uso. Limpeza obrigatória.",
            "horario_inicio": "08:00",
            "horario_fim": "22:00",
            "dias_semana": [0, 1, 2, 3, 4, 5, 6],  // 0=dom, 6=sab
            "antecedencia_min_dias": 1,
            "antecedencia_max_dias": 30,
            "valor_taxa": 100.00,       // null se gratuito
            "requer_aprovacao": false,
            "ativo": true
        },
        {
            "id": "piscina",
            "nome": "Piscina",
            "icone": "waves",
            "capacidade": 50,
            "horario_inicio": "06:00",
            "horario_fim": "22:00",
            "valor_taxa": null,
            "ativo": true
        }
    ]
    """

    # ══════════════════════════════════════════════════════════════
    # FUNCIONALIDADES HABILITADAS
    # ══════════════════════════════════════════════════════════════
    funcionalidades = Column(JSONB, default={})
    """
    {
        "convites": true,              // Convites de visitantes
        "entregas": true,              // Controle de entregas/encomendas
        "reservas": true,              // Reserva de áreas comuns
        "pets": true,                  // Cadastro de pets
        "veiculos": true,              // Cadastro de veículos
        "ocorrencias": true,           // Registro de ocorrências
        "comunicados": true,           // Comunicados do síndico
        "ligacoes": true,              // Interfone virtual/ligações
        "classificados": false,        // Marketplace interno
        "enquetes": true,              // Enquetes e votações
        "financeiro": false,           // Módulo financeiro (boletos)
        "portaria_remota": true,       // Portaria remota com IA
        "reconhecimento_facial": true, // Reconhecimento facial
        "qr_code": true                // Acesso por QR Code
    }
    """

    # ══════════════════════════════════════════════════════════════
    # CONFIGURAÇÕES DE SEGURANÇA
    # ══════════════════════════════════════════════════════════════
    config_seguranca = Column(JSONB, default={})
    """
    {
        "exige_aprovacao_cadastro": true,      // Morador precisa ser aprovado
        "aprovador": "sindico",                // "sindico", "porteiro", "ambos"
        "tempo_expiracao_convite_horas": 24,
        "max_visitantes_simultaneos": 10,
        "validacao_facial_obrigatoria": false,
        "permite_cadastro_autonomo": true,     // Morador pode se cadastrar
        "permite_multiplos_usuarios_unidade": true,
        "max_usuarios_por_unidade": 5
    }
    """

    # ══════════════════════════════════════════════════════════════
    # INTEGRAÇÕES COM HARDWARE/SERVIÇOS
    # ══════════════════════════════════════════════════════════════
    integracoes = Column(JSONB, default={})
    """
    {
        "control_id": {
            "ativo": true,
            "ip": "192.168.1.100",
            "porta": 443,
            "token": "xxx",
            "dispositivos": ["portao_social", "portao_garagem"]
        },
        "hikvision": {
            "ativo": false
        },
        "intelbras": {
            "ativo": false
        },
        "asterisk": {
            "ativo": true,
            "servidor": "192.168.1.50",
            "ramal_portaria": "1000",
            "contexto": "condominioX"
        }
    }
    """

    # ══════════════════════════════════════════════════════════════
    # CONTRATO E PLANO
    # ══════════════════════════════════════════════════════════════
    ativo = Column(Boolean, default=True, nullable=False)
    data_contrato = Column(Date)
    data_expiracao = Column(Date)
    plano = Column(String(50), default="basico")
    """
    Planos:
    - "basico": Funcionalidades essenciais
    - "profissional": + Portaria remota, relatórios
    - "enterprise": + Financeiro, integrações ilimitadas
    """

    # Metadados
    created_by = Column(String(36))  # ID do admin que criou

    # ══════════════════════════════════════════════════════════════
    # RELACIONAMENTOS
    # ══════════════════════════════════════════════════════════════
    users = relationship("User", back_populates="tenant", lazy="dynamic")
    units = relationship("Unit", back_populates="tenant", lazy="dynamic")
    visitors = relationship("Visitor", back_populates="tenant", lazy="dynamic")
    vehicles = relationship("Vehicle", back_populates="tenant", lazy="dynamic")

    def __repr__(self):
        return f"<Tenant(id={self.id}, nome='{self.nome}')>"

    # ══════════════════════════════════════════════════════════════
    # MÉTODOS UTILITÁRIOS
    # ══════════════════════════════════════════════════════════════

    def get_nomenclatura_unidade(self) -> str:
        """Retorna nome da unidade (Apartamento, Casa, etc.)"""
        return self.nomenclatura.get("unidade", "Apartamento")

    def get_nomenclatura_agrupador1(self) -> str:
        """Retorna nome do agrupador1 (Bloco, Torre, etc.)"""
        return self.nomenclatura.get("agrupador1", "Bloco")

    def is_funcionalidade_ativa(self, funcionalidade: str) -> bool:
        """Verifica se uma funcionalidade está habilitada"""
        return self.funcionalidades.get(funcionalidade, False)

    def get_areas_comuns_ativas(self) -> list:
        """Retorna apenas áreas comuns ativas"""
        return [area for area in (self.areas_comuns or []) if area.get("ativo", True)]

    def permite_cadastro_publico(self) -> bool:
        """Verifica se permite cadastro autônomo de moradores"""
        return self.config_seguranca.get("permite_cadastro_autonomo", True)
