"""
Models para Solicitações de Acesso (Facial, Veicular, Tag)
"""

from datetime import datetime

from sqlalchemy import CheckConstraint, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class AcessoSolicitacao(Base):
    """Solicitação de acesso (facial, veicular ou tag)"""

    __tablename__ = "acessos_solicitacoes"

    id = Column(Integer, primary_key=True, index=True)
    morador_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)  # facial, veicular, tag
    imagem_url = Column(String(500))

    # Dados veiculares
    placa_veiculo = Column(String(10))
    modelo_veiculo = Column(String(100))
    cor_veiculo = Column(String(50))

    # Dados tag
    numero_tag = Column(String(50))

    # Status e decisão
    status = Column(String(20), nullable=False, default="pendente")  # pendente, aprovado, recusado
    motivo_recusa = Column(String(255))
    tentativa_numero = Column(Integer, default=1)

    # Validação IA
    validacao_ia_resultado = Column(String(50))
    validacao_ia_motivo = Column(String(255))

    tenant_id = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relacionamentos
    morador = relationship("User", backref="solicitacoes_acesso")
    logs = relationship("AcessoLog", back_populates="solicitacao", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("tipo IN ('facial', 'veicular', 'tag')", name="check_tipo_acesso"),
        CheckConstraint("status IN ('pendente', 'aprovado', 'recusado')", name="check_status_acesso"),
    )


class AcessoLog(Base):
    """Log de ações nas solicitações de acesso"""

    __tablename__ = "acessos_logs"

    id = Column(Integer, primary_key=True, index=True)
    solicitacao_id = Column(Integer, ForeignKey("acessos_solicitacoes.id", ondelete="CASCADE"), nullable=False)
    acao = Column(String(20), nullable=False)  # aprovado, recusado, criado
    usuario_admin_id = Column(Integer, ForeignKey("users.id"))
    observacao = Column(Text)
    created_at = Column(DateTime, default=datetime.now)

    # Relacionamentos
    solicitacao = relationship("AcessoSolicitacao", back_populates="logs")
    usuario_admin = relationship("User", foreign_keys=[usuario_admin_id])

    __table_args__ = (CheckConstraint("acao IN ('aprovado', 'recusado', 'criado')", name="check_acao_log"),)
