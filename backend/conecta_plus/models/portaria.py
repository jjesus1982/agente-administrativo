"""
Models do Módulo Controle de Portaria
"""

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from conecta_plus.database import Base
from conecta_plus.models.base import AuditMixin, TenantMixin, TimestampMixin


class GrupoAcesso(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Grupos de permissão de acesso"""

    __tablename__ = "grupos_acesso"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    codigo = Column(String(50), nullable=False)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)

    # Permissões por tipo de pessoa
    permite_morador = Column(Boolean, default=True)
    permite_visitante = Column(Boolean, default=True)
    permite_prestador = Column(Boolean, default=True)
    permite_entregador = Column(Boolean, default=True)

    # Restrições de blocos/áreas (null = todos)
    blocos_permitidos = Column(ARRAY(String), nullable=True)

    # Restrições de horário
    horario_inicio = Column(Time, nullable=True)
    horario_fim = Column(Time, nullable=True)
    dias_semana = Column(ARRAY(Integer), nullable=True)  # 0=dom, 1=seg, ..., 6=sab

    # Status
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant")
    pontos_acesso = relationship("GrupoAcessoPonto", back_populates="grupo")
    pre_autorizacoes = relationship("PreAutorizacao", back_populates="grupo_acesso")

    __table_args__ = (
        Index("ix_grupos_acesso_tenant", "tenant_id"),
        Index("ix_grupos_acesso_codigo", "tenant_id", "codigo"),
    )

    def __repr__(self):
        return f"<GrupoAcesso(id={self.id}, codigo='{self.codigo}', nome='{self.nome}')>"


class PontoAcesso(Base, TenantMixin, TimestampMixin):
    """Pontos de entrada/saída (portas, catracas, eclusas, garagens)"""

    __tablename__ = "pontos_acesso"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    codigo = Column(String(50), nullable=False)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)

    # Tipo de ponto
    tipo = Column(String(50), nullable=False, default="porta_social")
    """
    Tipos:
    - porta_social: Entrada social principal
    - porta_servico: Entrada de serviço
    - garagem_entrada: Entrada de veículos
    - garagem_saida: Saída de veículos
    - eclusa_entrada: Primeira porta da eclusa
    - eclusa_saida: Segunda porta da eclusa
    - catraca: Catraca de pedestres
    - portao_pedestre: Portão de pedestres
    """

    # Configuração de hardware
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    ip_address = Column(String(50))
    porta = Column(Integer)
    rele_id = Column(String(100))  # ID do relé para acionamento
    sensor_id = Column(String(100))  # ID do sensor para monitoramento

    # Configuração de eclusa/intertravamento
    is_eclusa = Column(Boolean, default=False)
    eclusa_pair_id = Column(Integer, ForeignKey("pontos_acesso.id"), nullable=True)
    eclusa_delay = Column(Integer, default=5)  # Segundos de delay entre portas

    # Interfone
    interfone_ramal = Column(String(20))
    interfone_ip = Column(String(50))

    # Status
    status = Column(String(30), default="offline")  # online, offline, manutencao, erro
    last_ping_at = Column(DateTime)

    # Visualização
    ordem = Column(Integer, default=0)
    visivel = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant")
    device = relationship("Device")
    eclusa_pair = relationship("PontoAcesso", remote_side=[id])
    grupos = relationship("GrupoAcessoPonto", back_populates="ponto")

    __table_args__ = (
        Index("ix_pontos_acesso_tenant", "tenant_id"),
        Index("ix_pontos_acesso_codigo", "tenant_id", "codigo"),
        Index("ix_pontos_acesso_tipo", "tenant_id", "tipo"),
    )

    def __repr__(self):
        return f"<PontoAcesso(id={self.id}, codigo='{self.codigo}', tipo='{self.tipo}')>"


class GrupoAcessoPonto(Base):
    """Relacionamento N:N entre Grupos de Acesso e Pontos de Acesso"""

    __tablename__ = "grupos_acesso_pontos"

    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_acesso.id", ondelete="CASCADE"), nullable=False)
    ponto_id = Column(Integer, ForeignKey("pontos_acesso.id", ondelete="CASCADE"), nullable=False)

    # Permissões específicas para este ponto
    permite_entrada = Column(Boolean, default=True)
    permite_saida = Column(Boolean, default=True)

    # Relacionamentos
    grupo = relationship("GrupoAcesso", back_populates="pontos_acesso")
    ponto = relationship("PontoAcesso", back_populates="grupos")

    __table_args__ = (Index("ix_grupo_ponto_unique", "grupo_id", "ponto_id", unique=True),)


class PreAutorizacao(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Pré-autorizações de acesso com QR Code"""

    __tablename__ = "pre_autorizacoes"

    id = Column(Integer, primary_key=True, index=True)

    # Unidade destino
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    morador_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Dados do visitante
    visitante_nome = Column(String(255), nullable=False)
    visitante_documento = Column(String(20))
    visitante_telefone = Column(String(20))
    visitante_email = Column(String(255))
    visitante_tipo = Column(String(30), default="visitante")  # visitante, prestador, entregador

    # Dados do veículo (opcional)
    veiculo_placa = Column(String(10))
    veiculo_modelo = Column(String(100))
    veiculo_cor = Column(String(50))

    # Validade
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)
    horario_inicio = Column(Time)
    horario_fim = Column(Time)
    dias_semana = Column(ARRAY(Integer))  # null = todos os dias

    # Tipo de autorização
    tipo = Column(String(30), default="unica")  # unica, recorrente
    is_single_use = Column(Boolean, default=True)
    max_usos = Column(Integer, default=1)
    usos_realizados = Column(Integer, default=0)

    # QR Code
    qr_code = Column(String(100), unique=True, nullable=False, index=True)
    qr_code_url = Column(String(500))

    # Grupo de acesso (opcional)
    grupo_acesso_id = Column(Integer, ForeignKey("grupos_acesso.id"), nullable=True)

    # Ponto de acesso específico (opcional, null = todos permitidos)
    ponto_acesso_id = Column(Integer, ForeignKey("pontos_acesso.id"), nullable=True)

    # Status
    status = Column(String(30), default="ativa")  # pendente, ativa, utilizada, expirada, cancelada

    # Observações
    observacoes = Column(Text)

    # Relacionamentos
    tenant = relationship("Tenant")
    unit = relationship("Unit")
    morador = relationship("User", foreign_keys=[morador_id])
    grupo_acesso = relationship("GrupoAcesso", back_populates="pre_autorizacoes")
    ponto_acesso = relationship("PontoAcesso")

    __table_args__ = (
        Index("ix_pre_autorizacoes_tenant", "tenant_id"),
        Index("ix_pre_autorizacoes_unit", "tenant_id", "unit_id"),
        Index("ix_pre_autorizacoes_qr", "qr_code"),
        Index("ix_pre_autorizacoes_status", "tenant_id", "status"),
        Index("ix_pre_autorizacoes_validade", "tenant_id", "data_inicio", "data_fim"),
    )

    def __repr__(self):
        return f"<PreAutorizacao(id={self.id}, visitante='{self.visitante_nome}', status='{self.status}')>"


class TipoOcorrencia(Base, TenantMixin, TimestampMixin):
    """Tipos de ocorrência configuráveis por condomínio"""

    __tablename__ = "tipos_ocorrencia"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    codigo = Column(String(50), nullable=False)
    nome = Column(String(255), nullable=False)
    descricao = Column(Text)

    # Aparência
    icone = Column(String(50))  # Nome do ícone (lucide)
    cor = Column(String(20))  # Cor hex

    # Configurações
    severidade_padrao = Column(String(20), default="media")  # baixa, media, alta, critica
    requer_foto = Column(Boolean, default=False)
    notificar_sindico = Column(Boolean, default=True)
    notificar_administracao = Column(Boolean, default=False)

    # Evento que dispara automaticamente (opcional)
    evento_trigger = Column(String(100))

    # Status
    ordem = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant")

    __table_args__ = (
        Index("ix_tipos_ocorrencia_tenant", "tenant_id"),
        Index("ix_tipos_ocorrencia_codigo", "tenant_id", "codigo"),
    )

    def __repr__(self):
        return f"<TipoOcorrencia(id={self.id}, codigo='{self.codigo}', nome='{self.nome}')>"


class IntegracaoHardware(Base, TenantMixin, TimestampMixin):
    """Configuração de integrações com hardware/parceiros"""

    __tablename__ = "integracoes_hardware"

    id = Column(Integer, primary_key=True, index=True)

    # Parceiro
    parceiro = Column(String(50), nullable=False)
    """
    Parceiros suportados:
    - intelbras: Intelbras (facial, interfone, câmeras)
    - controlid: Control iD (facial, biometria)
    - hikvision: Hikvision (câmeras, NVR)
    - linear: Linear (controle de acesso)
    - nice: Nice (portões)
    - guarita: Guarita IP
    """
    nome_exibicao = Column(String(255))
    logo_url = Column(String(500))

    # Configuração (JSON com credenciais e endpoints)
    config = Column(JSONB, default={})
    """
    Exemplo config:
    {
        "base_url": "http://192.168.1.100",
        "api_key": "xxx",
        "username": "admin",
        "password": "encrypted_password",
        "port": 8080
    }
    """

    # Opções de sincronização
    sync_moradores = Column(Boolean, default=True)
    sync_visitantes = Column(Boolean, default=True)
    sync_veiculos = Column(Boolean, default=False)
    sync_acessos = Column(Boolean, default=True)

    # Status
    status = Column(String(30), default="inativo")  # ativo, inativo, erro, configurando
    last_health_check = Column(DateTime)
    last_sync_at = Column(DateTime)
    last_error = Column(Text)

    # Ativo
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant")
    sincronizacoes = relationship("SincronizacaoLog", back_populates="integracao")

    __table_args__ = (
        Index("ix_integracoes_tenant", "tenant_id"),
        Index("ix_integracoes_parceiro", "tenant_id", "parceiro"),
    )

    def __repr__(self):
        return f"<IntegracaoHardware(id={self.id}, parceiro='{self.parceiro}', status='{self.status}')>"


class SincronizacaoLog(Base, TimestampMixin):
    """Log de sincronizações com integrações"""

    __tablename__ = "sincronizacoes_log"

    id = Column(Integer, primary_key=True, index=True)
    integracao_id = Column(Integer, ForeignKey("integracoes_hardware.id", ondelete="CASCADE"), nullable=False)

    # Tipo de sincronização
    tipo_sync = Column(String(50), nullable=False)  # moradores, visitantes, acessos, dispositivos
    direcao = Column(String(20), default="push")  # push (enviar), pull (receber)

    # Resultado
    status = Column(String(30), default="pendente")  # pendente, processando, sucesso, erro, parcial
    registros_total = Column(Integer, default=0)
    registros_sucesso = Column(Integer, default=0)
    registros_erro = Column(Integer, default=0)

    # Detalhes
    erro_mensagem = Column(Text)
    detalhes = Column(JSONB)  # IDs processados, erros específicos

    # Timing
    iniciado_em = Column(DateTime)
    finalizado_em = Column(DateTime)
    duracao_ms = Column(Integer)

    # Relacionamentos
    integracao = relationship("IntegracaoHardware", back_populates="sincronizacoes")

    __table_args__ = (
        Index("ix_sync_integracao", "integracao_id"),
        Index("ix_sync_status", "integracao_id", "status"),
    )

    def __repr__(self):
        return f"<SincronizacaoLog(id={self.id}, tipo='{self.tipo_sync}', status='{self.status}')>"


class VagaGaragem(Base, TenantMixin, TimestampMixin):
    """Extensão visual das vagas de estacionamento para mapa"""

    __tablename__ = "vagas_garagem"

    id = Column(Integer, primary_key=True, index=True)

    # Referência à vaga original (opcional, pode ser vaga nova)
    parking_spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=True)

    # Identificação
    numero = Column(String(20), nullable=False)
    bloco = Column(String(50))
    andar = Column(String(20))

    # Tipo de vaga
    tipo = Column(String(30), default="fixa")  # fixa, rotativa, visitante, pcd, idoso, moto

    # Unidade associada (para vagas fixas)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)

    # Posição no mapa visual (coordenadas)
    posicao_x = Column(Float, default=0)
    posicao_y = Column(Float, default=0)
    largura = Column(Float, default=50)
    altura = Column(Float, default=100)
    rotacao = Column(Float, default=0)  # Graus de rotação

    # Mapa/Andar
    mapa_id = Column(String(50))  # Identificador do mapa/andar

    # Status de ocupação
    status = Column(String(30), default="livre")  # livre, ocupada, reservada, manutencao
    ocupada_desde = Column(DateTime)
    veiculo_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)

    # Configuração
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant")
    parking_spot = relationship("ParkingSpot")
    unit = relationship("Unit")
    veiculo = relationship("Vehicle")

    __table_args__ = (
        Index("ix_vagas_garagem_tenant", "tenant_id"),
        Index("ix_vagas_garagem_numero", "tenant_id", "numero"),
        Index("ix_vagas_garagem_status", "tenant_id", "status"),
        Index("ix_vagas_garagem_mapa", "tenant_id", "mapa_id"),
    )

    def __repr__(self):
        return f"<VagaGaragem(id={self.id}, numero='{self.numero}', status='{self.status}')>"


class ComunicacaoPortaria(Base, TenantMixin, TimestampMixin):
    """Comunicações entre portaria e moradores"""

    __tablename__ = "comunicacoes_portaria"

    id = Column(Integer, primary_key=True, index=True)

    # Participantes
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    porteiro_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    morador_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Direção
    direcao = Column(String(20), nullable=False)  # para_unidade, para_portaria

    # Conteúdo
    tipo_mensagem = Column(String(30), default="texto")  # texto, imagem, audio, chamada
    conteudo = Column(Text)
    anexo_url = Column(String(500))

    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)

    # Contexto (opcional)
    visita_id = Column(Integer, ForeignKey("visitas.id"), nullable=True)
    pre_autorizacao_id = Column(Integer, ForeignKey("pre_autorizacoes.id"), nullable=True)

    # Relacionamentos
    tenant = relationship("Tenant")
    unit = relationship("Unit")
    porteiro = relationship("User", foreign_keys=[porteiro_id])
    morador = relationship("User", foreign_keys=[morador_id])

    __table_args__ = (
        Index("ix_comunicacoes_tenant", "tenant_id"),
        Index("ix_comunicacoes_unit", "tenant_id", "unit_id"),
        Index("ix_comunicacoes_porteiro", "tenant_id", "porteiro_id"),
    )

    def __repr__(self):
        return f"<ComunicacaoPortaria(id={self.id}, direcao='{self.direcao}')>"


class Visita(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Registro de visitas (entrada/saída de visitantes)"""

    __tablename__ = "visitas"

    id = Column(Integer, primary_key=True, index=True)

    # Visitante
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=True)
    visitante_nome = Column(String(255), nullable=False)  # Cache para consultas rápidas
    visitante_documento = Column(String(20))
    visitante_foto_url = Column(String(500))

    # Destino
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    morador_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Porteiro responsável
    porteiro_entrada_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    porteiro_saida_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Tipo de visita
    tipo = Column(String(30), default="visita")  # visita, prestacao_servico, entrega, airbnb

    # Status e datas
    status = Column(String(30), default="aguardando")  # aguardando, autorizada, negada, em_andamento, finalizada
    data_entrada = Column(DateTime)
    data_saida = Column(DateTime)

    # Autorização
    autorizado_por = Column(String(255))  # Nome de quem autorizou
    metodo_autorizacao = Column(String(30))  # app, interfone, qr_code, porteiro

    # Pré-autorização vinculada (se houver)
    pre_autorizacao_id = Column(Integer, ForeignKey("pre_autorizacoes.id"), nullable=True)

    # Veículo (se houver)
    veiculo_placa = Column(String(10))
    veiculo_modelo = Column(String(100))

    # Ponto de acesso
    ponto_entrada_id = Column(Integer, ForeignKey("pontos_acesso.id"), nullable=True)
    ponto_saida_id = Column(Integer, ForeignKey("pontos_acesso.id"), nullable=True)

    # Observações
    observacoes = Column(Text)
    motivo_negacao = Column(Text)

    # Relacionamentos
    tenant = relationship("Tenant")
    visitor = relationship("Visitor")
    unit = relationship("Unit")
    morador = relationship("User", foreign_keys=[morador_id])
    porteiro_entrada = relationship("User", foreign_keys=[porteiro_entrada_id])
    porteiro_saida = relationship("User", foreign_keys=[porteiro_saida_id])
    pre_autorizacao = relationship("PreAutorizacao")
    ponto_entrada = relationship("PontoAcesso", foreign_keys=[ponto_entrada_id])
    ponto_saida = relationship("PontoAcesso", foreign_keys=[ponto_saida_id])
    comunicacoes = relationship("ComunicacaoPortaria", foreign_keys="ComunicacaoPortaria.visita_id")

    __table_args__ = (
        Index("ix_visitas_tenant", "tenant_id"),
        Index("ix_visitas_unit", "tenant_id", "unit_id"),
        Index("ix_visitas_visitor", "tenant_id", "visitor_id"),
        Index("ix_visitas_status", "tenant_id", "status"),
        Index("ix_visitas_data", "tenant_id", "data_entrada"),
    )

    def __repr__(self):
        return f"<Visita(id={self.id}, visitante='{self.visitante_nome}', status='{self.status}')>"
