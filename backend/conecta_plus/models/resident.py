"""
Model Resident e Dependent - Moradores e Dependentes
"""

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from conecta_plus.database import Base
from conecta_plus.models.base import AuditMixin, TenantMixin, TimestampMixin


class Dependent(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Dependente de um morador"""

    __tablename__ = "dependents"

    id = Column(Integer, primary_key=True, index=True)

    # Responsável
    responsible_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)

    # Dados pessoais
    name = Column(String(255), nullable=False)
    cpf = Column(String(14))
    rg = Column(String(20))
    birth_date = Column(Date)
    gender = Column(String(1))
    photo_url = Column(String(500))

    # Contato
    phone = Column(String(20))
    email = Column(String(255))

    # Relacionamento
    relationship_type = Column(String(50))  # filho, cônjuge, pai, mãe, outro

    # Necessidades especiais
    has_special_needs = Column(Boolean, default=False)
    special_needs_description = Column(String(500))

    # Acesso
    can_access_alone = Column(Boolean, default=False)
    access_authorization = Column(Text)

    # Status
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    responsible = relationship("User", back_populates="dependents", foreign_keys=[responsible_id])
    unit = relationship("Unit")

    def __repr__(self):
        return f"<Dependent(id={self.id}, name='{self.name}')>"
