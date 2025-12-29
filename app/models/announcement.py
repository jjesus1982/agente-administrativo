"""
Model Announcement - Comunicados do condomínio
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import AuditMixin, TenantMixin, TimestampMixin


class Announcement(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Comunicado do condomínio"""

    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)

    # Conteúdo
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(String(500))  # Resumo para preview

    # Categoria
    category = Column(String(50), default="general")
    """
    Categorias:
    - general: Geral
    - maintenance: Manutenção
    - security: Segurança
    - event: Evento
    - meeting: Assembleia
    - financial: Financeiro
    - rules: Regras/Normas
    - emergency: Emergência
    """

    # Prioridade/Destaque
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    is_pinned = Column(Boolean, default=False)

    # Publicação
    status = Column(String(20), default="draft")
    """
    Status:
    - draft: Rascunho
    - scheduled: Agendado
    - published: Publicado
    - archived: Arquivado
    """

    published_at = Column(DateTime)
    scheduled_for = Column(DateTime)
    expires_at = Column(DateTime)

    # Destinatários
    target_audience = Column(String(50), default="all")
    """
    Público-alvo:
    - all: Todos
    - owners: Proprietários
    - tenants: Inquilinos
    - residents: Moradores
    - specific_units: Unidades específicas
    """
    target_units = Column(JSONB, default=[])  # Lista de unit_ids

    # Anexos
    attachments = Column(JSONB, default=[])

    # Notificação
    send_push = Column(Boolean, default=True)
    send_email = Column(Boolean, default=False)
    notification_sent = Column(Boolean, default=False)
    notification_sent_at = Column(DateTime)

    # Estatísticas
    views_count = Column(Integer, default=0)

    # Comentários habilitados
    allow_comments = Column(Boolean, default=True)

    # Relacionamentos
    comments = relationship(
        "AnnouncementComment", back_populates="announcement", order_by="AnnouncementComment.created_at"
    )
    reads = relationship("AnnouncementRead", back_populates="announcement")

    def __repr__(self):
        return f"<Announcement(id={self.id}, title='{self.title[:30]}...')>"


class AnnouncementComment(Base, TimestampMixin):
    """Comentários em comunicados"""

    __tablename__ = "announcement_comments"

    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(Text, nullable=False)

    # Relacionamentos
    announcement = relationship("Announcement", back_populates="comments")
    user = relationship("User")


class AnnouncementRead(Base, TimestampMixin):
    """Registro de leitura de comunicados"""

    __tablename__ = "announcement_reads"

    id = Column(Integer, primary_key=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    read_at = Column(DateTime, nullable=False)

    # Relacionamentos
    announcement = relationship("Announcement", back_populates="reads")
    user = relationship("User")
