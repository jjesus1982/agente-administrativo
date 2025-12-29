"""
Model Reservation - Reservas de áreas comuns
"""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import AuditMixin, TenantMixin, TimestampMixin


class CommonArea(Base, TenantMixin, TimestampMixin):
    """Área comum disponível para reserva"""

    __tablename__ = "common_areas"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    name = Column(String(100), nullable=False)
    description = Column(Text)
    location = Column(String(255))

    # Capacidade
    capacity = Column(Integer)

    # Regras
    rules = Column(Text)
    min_advance_days = Column(Integer, default=1)  # Dias de antecedência mínima
    max_advance_days = Column(Integer, default=30)  # Dias de antecedência máxima
    max_duration_hours = Column(Integer, default=4)

    # Horários disponíveis
    available_from = Column(Time)
    available_until = Column(Time)
    available_days = Column(String(20), default="0123456")  # 0=Dom, 1=Seg, ..., 6=Sab

    # Valores
    reservation_fee = Column(Numeric(10, 2), default=0)
    deposit_amount = Column(Numeric(10, 2), default=0)

    # Fotos
    photos = Column(JSONB, default=[])

    # Status
    is_active = Column(Boolean, default=True)
    requires_approval = Column(Boolean, default=False)

    # Relacionamentos
    reservations = relationship("Reservation", back_populates="area")

    def __repr__(self):
        return f"<CommonArea(id={self.id}, name='{self.name}')>"


class Reservation(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Reserva de área comum"""

    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)

    # Área e solicitante
    area_id = Column(Integer, ForeignKey("common_areas.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Data e horário
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Evento
    event_name = Column(String(255))
    event_description = Column(Text)
    expected_guests = Column(Integer)

    # Status
    status = Column(String(20), default="pending", nullable=False)
    """
    Status:
    - pending: Pendente
    - approved: Aprovada
    - rejected: Rejeitada
    - cancelled: Cancelada
    - completed: Realizada
    - no_show: Não compareceu
    """

    # Aprovação/Rejeição
    reviewed_by_id = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    review_notes = Column(String(500))

    # Valores
    total_value = Column(Numeric(10, 2), default=0)
    deposit_paid = Column(Boolean, default=False)
    deposit_returned = Column(Boolean, default=False)

    # Cancelamento
    cancelled_at = Column(DateTime)
    cancelled_by_id = Column(Integer, ForeignKey("users.id"))
    cancel_reason = Column(String(500))

    # Relacionamentos
    area = relationship("CommonArea", back_populates="reservations")
    unit = relationship("Unit")
    user = relationship("User", foreign_keys=[user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id])
    cancelled_by = relationship("User", foreign_keys=[cancelled_by_id])

    def __repr__(self):
        return f"<Reservation(id={self.id}, area={self.area_id}, date='{self.date}')>"
