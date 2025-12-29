"""
Model Tenant - Condomínio (Multi-tenant)
"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Tenant(Base, TimestampMixin):
    """Representa um condomínio no sistema multi-tenant"""

    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)

    # Dados básicos
    name = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, index=True)

    # Endereço
    address = Column(String(500))
    neighborhood = Column(String(100))
    city = Column(String(100))
    state = Column(String(2))
    zip_code = Column(String(10))

    # Contato
    phone = Column(String(20))
    email = Column(String(255))

    # Configurações
    logo_url = Column(String(500))
    settings = Column(JSONB, default={})
    """
    Exemplo de settings:
    {
        "timezone": "America/Manaus",
        "language": "pt-BR",
        "features": {
            "facial_recognition": true,
            "vehicle_speed_control": false,
            "airbnb_mode": true
        },
        "access_rules": {
            "visitor_max_hours": 12,
            "require_photo": true
        }
    }
    """

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    subscription_plan = Column(String(50), default="basic")
    subscription_expires_at = Column(DateTime)

    # Relacionamentos
    users = relationship("User", back_populates="tenant", lazy="dynamic")
    units = relationship("Unit", back_populates="tenant", lazy="dynamic")
    visitors = relationship("Visitor", back_populates="tenant", lazy="dynamic")
    vehicles = relationship("Vehicle", back_populates="tenant", lazy="dynamic")

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}')>"
