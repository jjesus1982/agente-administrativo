"""
Model Vehicle - Veículos de moradores
"""

from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import AuditMixin, TenantMixin, TimestampMixin


class Vehicle(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Veículo de morador"""

    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)

    # Proprietário
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"))

    # Dados do veículo
    plate = Column(String(10), nullable=False, index=True)
    model = Column(String(100))
    brand = Column(String(100))
    color = Column(String(50))
    year = Column(Integer)

    vehicle_type = Column(String(20), default="car")
    """
    Tipos:
    - car: Carro
    - motorcycle: Moto
    - truck: Caminhão
    - bike: Bicicleta
    - other: Outro
    """

    # Vaga
    parking_spot_id = Column(Integer, ForeignKey("parking_spots.id"))

    # Tag/Controle
    tag_number = Column(String(50))
    remote_number = Column(String(50))

    # Status
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant", back_populates="vehicles")
    owner = relationship("User", back_populates="vehicles", foreign_keys=[owner_id])
    unit = relationship("Unit", back_populates="vehicles")
    parking_spot = relationship("ParkingSpot", back_populates="vehicle")
    access_logs = relationship("AccessLog", back_populates="vehicle")

    # Índices
    __table_args__ = (
        Index("ix_vehicles_tenant_plate", "tenant_id", "plate"),
        Index("ix_vehicles_tenant_owner", "tenant_id", "owner_id"),
    )

    def __repr__(self):
        return f"<Vehicle(id={self.id}, plate='{self.plate}')>"


class ParkingSpot(Base, TenantMixin, TimestampMixin):
    """Vaga de estacionamento"""

    __tablename__ = "parking_spots"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    number = Column(String(20), nullable=False)
    floor = Column(String(10))
    section = Column(String(50))

    # Tipo
    spot_type = Column(String(30), default="regular")
    """
    Tipos:
    - regular: Normal
    - handicapped: PCD
    - elderly: Idoso
    - motorcycle: Moto
    - visitor: Visitante
    """

    # Vinculação
    unit_id = Column(Integer, ForeignKey("units.id"))

    # Status
    is_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    # Descrição
    description = Column(String(255))

    # Relacionamentos
    unit = relationship("Unit")
    vehicle = relationship("Vehicle", back_populates="parking_spot", uselist=False)

    def __repr__(self):
        return f"<ParkingSpot(id={self.id}, number='{self.number}')>"
