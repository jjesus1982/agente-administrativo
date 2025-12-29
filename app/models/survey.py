"""
Model Survey - Enquetes e Votações
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import AuditMixin, TenantMixin, TimestampMixin


class Survey(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Enquete ou votação"""

    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)

    # Conteúdo
    title = Column(String(255), nullable=False)
    description = Column(Text)

    # Tipo
    survey_type = Column(String(30), default="poll")
    """
    Tipos:
    - poll: Enquete simples
    - voting: Votação (com peso de fração ideal)
    - election: Eleição
    - feedback: Feedback/Satisfação
    """

    # Status
    status = Column(String(20), default="draft")
    """
    Status:
    - draft: Rascunho
    - scheduled: Agendada
    - active: Ativa
    - closed: Encerrada
    - cancelled: Cancelada
    """

    # Período
    starts_at = Column(DateTime)
    ends_at = Column(DateTime)

    # Configurações
    allow_multiple = Column(Boolean, default=False)  # Múltiplas opções
    is_anonymous = Column(Boolean, default=False)
    show_results_during = Column(Boolean, default=False)  # Mostrar resultados durante votação
    show_results_after = Column(Boolean, default=True)

    # Quórum (para votações)
    requires_quorum = Column(Boolean, default=False)
    quorum_percentage = Column(Numeric(5, 2))  # % necessário

    # Peso do voto (para votações por fração ideal)
    use_ideal_fraction = Column(Boolean, default=False)

    # Público-alvo
    target_audience = Column(String(50), default="all")
    target_units = Column(JSONB, default=[])

    # Relacionamentos
    options = relationship("SurveyOption", back_populates="survey", order_by="SurveyOption.order")
    votes = relationship("SurveyVote", back_populates="survey")

    def __repr__(self):
        return f"<Survey(id={self.id}, title='{self.title[:30]}...')>"


class SurveyOption(Base, TimestampMixin):
    """Opção de resposta de enquete"""

    __tablename__ = "survey_options"

    id = Column(Integer, primary_key=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)

    text = Column(String(500), nullable=False)
    description = Column(Text)
    order = Column(Integer, default=0)

    # Contagem (cache)
    votes_count = Column(Integer, default=0)
    votes_percentage = Column(Numeric(5, 2), default=0)

    # Relacionamentos
    survey = relationship("Survey", back_populates="options")
    votes = relationship("SurveyVote", back_populates="option")


class SurveyVote(Base, TimestampMixin):
    """Voto em enquete"""

    __tablename__ = "survey_votes"

    id = Column(Integer, primary_key=True)
    survey_id = Column(Integer, ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(Integer, ForeignKey("survey_options.id", ondelete="CASCADE"), nullable=False)

    # Votante (pode ser anônimo)
    user_id = Column(Integer, ForeignKey("users.id"))
    unit_id = Column(Integer, ForeignKey("units.id"))

    # Peso do voto (se usar fração ideal)
    vote_weight = Column(Numeric(10, 6), default=1)

    # IP e device (para auditoria)
    ip_address = Column(String(50))
    user_agent = Column(String(500))

    # Relacionamentos
    survey = relationship("Survey", back_populates="votes")
    option = relationship("SurveyOption", back_populates="votes")
    user = relationship("User")
    unit = relationship("Unit")
