"""
Model Unit - Unidade do condomínio
"""

from sqlalchemy import Boolean, Column, Date, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TenantMixin, TimestampMixin


class Unit(Base, TenantMixin, TimestampMixin):
    """Unidade do condomínio (apartamento, casa, sala)"""

    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    block = Column(String(10))
    number = Column(String(20), nullable=False)
    floor = Column(Integer)

    # Características
    unit_type = Column(String(50), default="apartment")  # apartment, house, store
    area = Column(Numeric(10, 2))
    bedrooms = Column(Integer)
    bathrooms = Column(Integer)
    parking_spots = Column(Integer, default=1)

    # Fração ideal (para votações)
    ideal_fraction = Column(Numeric(10, 6))

    # Proprietário
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Locação
    is_rented = Column(Boolean, default=False)
    tenant_user_id = Column(Integer, ForeignKey("users.id"))
    contract_start = Column(Date)
    contract_end = Column(Date)

    # Status
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    tenant = relationship("Tenant", back_populates="units")
    owner = relationship("User", foreign_keys=[owner_id])
    tenant_user = relationship("User", foreign_keys=[tenant_user_id])
    residents = relationship("UnitResident", back_populates="unit")
    vehicles = relationship("Vehicle", back_populates="unit")

    # Índice composto para busca rápida
    __table_args__ = (Index("ix_units_tenant_block_number", "tenant_id", "block", "number"),)

    @property
    def full_identifier(self) -> str:
        """Retorna identificador completo (ex: 'Bloco A - 101')"""
        if self.block:
            return f"{self.block} {self.number}"
        return self.number

    def __repr__(self):
        return f"<Unit(id={self.id}, identifier='{self.full_identifier}')>"


class UnitResident(Base, TimestampMixin):
    """Relação entre unidade e morador"""

    __tablename__ = "unit_residents"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    relationship_type = Column(String(50), default="resident")  # owner, tenant, resident
    is_primary = Column(Boolean, default=False)
    move_in_date = Column(Date)
    move_out_date = Column(Date)

    is_active = Column(Boolean, default=True)

    # Relacionamentos
    unit = relationship("Unit", back_populates="residents")
    user = relationship("User", back_populates="units")
