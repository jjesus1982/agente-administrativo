"""
Model Occurrence - Ocorrências do condomínio
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import AuditMixin, TenantMixin, TimestampMixin


class Occurrence(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Ocorrência registrada no condomínio"""

    __tablename__ = "occurrences"

    id = Column(Integer, primary_key=True, index=True)
    protocol = Column(String(20), unique=True, nullable=False, index=True)

    # Origem
    unit_id = Column(Integer, ForeignKey("units.id"))  # Pode ser nulo se for área comum
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Descrição
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255))  # Local específico da ocorrência

    # Categorização
    category = Column(String(50), nullable=False)
    """
    Categorias:
    - noise: Barulho
    - parking: Estacionamento
    - pet: Animais
    - trash: Lixo
    - common_area: Área comum
    - security: Segurança
    - vandalism: Vandalismo
    - leak: Vazamento
    - elevator: Elevador
    - neighbor: Vizinho
    - employee: Funcionário
    - visitor: Visitante
    - other: Outros
    """

    severity = Column(String(20), default="medium")
    """
    Severidade:
    - low: Baixa
    - medium: Média
    - high: Alta
    - critical: Crítica
    """

    # Status
    status = Column(String(20), default="open", nullable=False)
    """
    Status:
    - open: Aberta
    - in_progress: Em análise
    - resolved: Resolvida
    - closed: Fechada
    - cancelled: Cancelada
    """

    # Anexos (fotos, vídeos)
    attachments = Column(JSONB, default=[])

    # Envolvidos
    involved_units = Column(JSONB, default=[])  # Lista de unit_ids
    involved_names = Column(Text)  # Nomes de pessoas envolvidas

    # Testemunhas
    witnesses = Column(Text)

    # Resolução
    resolution = Column(Text)
    resolved_by_id = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime)

    # Ações tomadas
    actions_taken = Column(Text)

    # Notificação
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime)

    # Data/hora da ocorrência (pode ser diferente do registro)
    occurred_at = Column(DateTime)

    # Relacionamentos
    unit = relationship("Unit")
    reporter = relationship("User", foreign_keys=[reporter_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    comments = relationship("OccurrenceComment", back_populates="occurrence", order_by="OccurrenceComment.created_at")

    def __repr__(self):
        return f"<Occurrence(protocol='{self.protocol}', category='{self.category}')>"


class OccurrenceComment(Base, TimestampMixin):
    """Comentários em ocorrências"""

    __tablename__ = "occurrence_comments"

    id = Column(Integer, primary_key=True)
    occurrence_id = Column(Integer, ForeignKey("occurrences.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=False)
    attachments = Column(JSONB, default=[])
    is_internal = Column(Boolean, default=False)

    # Relacionamentos
    occurrence = relationship("Occurrence", back_populates="comments")
    user = relationship("User")
