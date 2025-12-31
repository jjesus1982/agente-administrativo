"""
Model User - Usuário do sistema
"""

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from conecta_plus.database import Base
from conecta_plus.models.base import SoftDeleteMixin, TenantMixin, TimestampMixin


class User(Base, TenantMixin, TimestampMixin, SoftDeleteMixin):
    """Usuário do sistema (morador, síndico, porteiro, admin)"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Dados pessoais
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # Documentos
    cpf = Column(String(14), index=True)
    rg = Column(String(20))

    # Contato
    phone = Column(String(20))
    phone_secondary = Column(String(20))

    # Dados pessoais
    birth_date = Column(Date)
    gender = Column(String(1))  # M, F, O
    photo_url = Column(String(500))

    # Permissões
    role = Column(Integer, default=1, nullable=False)
    """
    Roles:
    1 = Morador (resident)
    2 = Síndico (syndic)
    3 = Porteiro (doorman)
    4 = Administrador (admin)
    5 = Super Admin (super_admin)
    """

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)

    # Necessidades especiais
    has_special_needs = Column(Boolean, default=False)
    special_needs_description = Column(String(500))

    # Relacionamentos
    tenant = relationship("Tenant", back_populates="users")
    units = relationship("UnitResident", back_populates="user")
    dependents = relationship("Dependent", back_populates="responsible", foreign_keys="Dependent.responsible_id")
    vehicles = relationship("Vehicle", back_populates="owner", foreign_keys="Vehicle.owner_id")

    # Índices compostos
    __table_args__ = (
        Index("ix_users_tenant_email", "tenant_id", "email"),
        Index("ix_users_tenant_cpf", "tenant_id", "cpf"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
