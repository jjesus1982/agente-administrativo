"""
Model Pet - Animais de estimação
"""

from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from conecta_plus.database import Base
from conecta_plus.models.base import AuditMixin, TenantMixin, TimestampMixin


class Pet(Base, TenantMixin, TimestampMixin, AuditMixin):
    """Animal de estimação"""

    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)

    # Proprietário
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"))

    # Dados do pet
    name = Column(String(100), nullable=False)
    species = Column(String(50), nullable=False)
    """
    Espécies:
    - dog: Cachorro
    - cat: Gato
    - bird: Pássaro
    - fish: Peixe
    - hamster: Hamster
    - rabbit: Coelho
    - turtle: Tartaruga
    - other: Outro
    """

    breed = Column(String(100))
    color = Column(String(50))
    size = Column(String(20))  # small, medium, large

    birth_date = Column(Date)
    gender = Column(String(1))  # M, F

    # Identificação
    microchip = Column(String(50))
    registration_number = Column(String(50))

    # Vacinação
    vaccinated = Column(Boolean, default=False)
    vaccination_date = Column(Date)
    vaccination_card_url = Column(String(500))

    # Castrado
    neutered = Column(Boolean, default=False)

    # Foto
    photo_url = Column(String(500))

    # Observações
    observations = Column(Text)
    special_needs = Column(Text)

    # Status
    is_active = Column(Boolean, default=True)

    # Relacionamentos
    owner = relationship("User", foreign_keys=[owner_id])
    unit = relationship("Unit")

    def __repr__(self):
        return f"<Pet(id={self.id}, name='{self.name}', species='{self.species}')>"
