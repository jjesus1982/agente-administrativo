"""
Model Package - Encomendas recebidas na portaria
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TenantMixin, TimestampMixin


class Package(Base, TenantMixin, TimestampMixin):
    """Encomenda recebida na portaria"""

    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    protocol = Column(String(20), unique=True, nullable=False, index=True)

    # Destino
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    recipient_name = Column(String(255))  # Nome do destinatário (pode ser diferente do morador)

    # Recebimento
    received_at = Column(DateTime, nullable=False)
    received_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Descrição
    description = Column(String(500))
    sender = Column(String(255))  # Remetente/Transportadora
    tracking_code = Column(String(100))

    # Tipo
    package_type = Column(String(30), default="package")
    """
    Tipos:
    - package: Pacote
    - envelope: Envelope
    - box: Caixa
    - furniture: Móvel/Grande porte
    - food: Alimentação
    - other: Outro
    """

    # Tamanho
    size = Column(String(20), default="medium")  # small, medium, large, extra_large

    # Status
    status = Column(String(20), default="pending", nullable=False)
    """
    Status:
    - pending: Aguardando retirada
    - notified: Morador notificado
    - picked_up: Retirado
    - returned: Devolvido ao remetente
    """

    # Notificação
    notified_at = Column(DateTime)
    notification_count = Column(Integer, default=0)

    # Retirada
    picked_up_at = Column(DateTime)
    picked_up_by_id = Column(Integer, ForeignKey("users.id"))
    picked_up_by_name = Column(String(255))  # Nome de quem retirou
    signature_url = Column(String(500))  # Assinatura digital

    # Observações
    notes = Column(Text)

    # Foto
    photo_url = Column(String(500))

    # Relacionamentos
    unit = relationship("Unit")
    received_by = relationship("User", foreign_keys=[received_by_id])
    picked_up_by = relationship("User", foreign_keys=[picked_up_by_id])

    def __repr__(self):
        return f"<Package(protocol='{self.protocol}', unit={self.unit_id}, status='{self.status}')>"
