"""
Model AccessLog - Registro de acessos (entrada/saída)
"""

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.base import TenantMixin


class AccessLog(Base, TenantMixin):
    """Registro de todos os acessos (entrada/saída)"""

    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Quem acessou (um dos dois será preenchido)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), index=True)

    # Destino
    unit_id = Column(Integer, ForeignKey("units.id"), index=True)

    # Tipo de acesso
    access_type = Column(String(10), nullable=False)  # entry, exit
    access_method = Column(String(30), nullable=False)
    """
    Métodos:
    - facial: Reconhecimento facial
    - tag: Tag RFID
    - remote: Controle remoto
    - qrcode: QR Code
    - biometric: Biometria digital
    - manual: Liberação manual pelo porteiro
    - app: Liberação pelo app do morador
    - intercom: Interfone
    """

    # Local de acesso
    access_point = Column(String(100))  # Portaria Principal, Garagem, etc

    # Veículo (se aplicável)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    vehicle_plate = Column(String(10))  # Redundância para histórico

    # Quem liberou/registrou
    released_by_id = Column(Integer, ForeignKey("users.id"))
    registered_by_id = Column(Integer, ForeignKey("users.id"))

    # Dispositivo usado
    device_id = Column(Integer, ForeignKey("devices.id"))
    device_serial = Column(String(100))

    # Timestamps
    registered_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Observações
    observations = Column(Text)

    # Foto capturada no momento
    photo_url = Column(String(500))

    # Relacionamentos
    user = relationship("User", foreign_keys=[user_id])
    visitor = relationship("Visitor", back_populates="access_logs")
    unit = relationship("Unit")
    vehicle = relationship("Vehicle", back_populates="access_logs")
    released_by = relationship("User", foreign_keys=[released_by_id])
    registered_by = relationship("User", foreign_keys=[registered_by_id])
    device = relationship("Device")

    # Índices para queries de relatório
    __table_args__ = (
        Index("ix_access_logs_tenant_date", "tenant_id", "registered_at"),
        Index("ix_access_logs_tenant_unit", "tenant_id", "unit_id"),
        Index("ix_access_logs_tenant_type", "tenant_id", "access_type"),
        Index("ix_access_logs_tenant_method", "tenant_id", "access_method"),
    )

    def __repr__(self):
        return f"<AccessLog(id={self.id}, type='{self.access_type}', at='{self.registered_at}')>"
