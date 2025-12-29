"""
Model Visitor - Visitante, Prestador, Entregador
"""

from sqlalchemy import Boolean, Column, Date, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import AuditMixin, TenantMixin, TimestampMixin


class Visitor(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Visitante, prestador de serviço ou entregador"""

    __tablename__ = "visitors"

    id = Column(Integer, primary_key=True, index=True)

    # Dados pessoais
    name = Column(String(255), nullable=False, index=True)
    cpf = Column(String(14), index=True)
    rg = Column(String(20))
    phone = Column(String(20))
    email = Column(String(255))
    birth_date = Column(Date)

    # Foto
    photo_url = Column(String(500))
    facial_id = Column(String(100))  # ID no sistema de reconhecimento facial

    # Tipo de visitante
    visitor_type = Column(String(30), nullable=False, default="visitor")
    """
    Tipos:
    - visitor: Visitante comum
    - provider: Prestador de serviço
    - delivery: Entregador
    - airbnb: Hóspede Airbnb
    - relative: Parente
    - employee: Funcionário terceirizado
    """

    # Empresa (para prestadores/entregadores)
    company = Column(String(255))
    company_cnpj = Column(String(18))
    service = Column(String(255))

    # Necessidades especiais
    has_special_needs = Column(Boolean, default=False)
    special_needs_description = Column(String(500))

    # Observações
    observations = Column(Text)

    # Status
    is_blocked = Column(Boolean, default=False)
    block_reason = Column(String(500))
    blocked_at = Column(Date)
    blocked_by_id = Column(Integer, ForeignKey("users.id"))

    # Relacionamentos
    tenant = relationship("Tenant", back_populates="visitors")
    vehicles = relationship("VisitorVehicle", back_populates="visitor", cascade="all, delete-orphan")
    access_logs = relationship("AccessLog", back_populates="visitor")
    blocked_by = relationship("User", foreign_keys=[blocked_by_id])

    # Índices
    __table_args__ = (
        Index("ix_visitors_tenant_name", "tenant_id", "name"),
        Index("ix_visitors_tenant_cpf", "tenant_id", "cpf"),
        Index("ix_visitors_tenant_type", "tenant_id", "visitor_type"),
    )

    def __repr__(self):
        return f"<Visitor(id={self.id}, name='{self.name}', type='{self.visitor_type}')>"


class VisitorVehicle(Base, TimestampMixin):
    """Veículos de visitantes"""

    __tablename__ = "visitor_vehicles"

    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id", ondelete="CASCADE"), nullable=False)

    plate = Column(String(10), index=True)
    model = Column(String(100))
    brand = Column(String(100))
    color = Column(String(50))
    vehicle_type = Column(String(20), default="car")  # car, motorcycle, truck, bike

    # Relacionamento
    visitor = relationship("Visitor", back_populates="vehicles")

    def __repr__(self):
        return f"<VisitorVehicle(id={self.id}, plate='{self.plate}')>"
