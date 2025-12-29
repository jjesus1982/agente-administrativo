"""Models de dispositivos"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TenantMixin, TimestampMixin


class Device(Base, TimestampMixin, TenantMixin):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    visitor_id = Column(Integer, ForeignKey("visitors.id"), nullable=True)
    device_type = Column(String(30), nullable=False)
    serial_number = Column(String(100), index=True)
    wiegand_code = Column(String(50))
    description = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_lost = Column(Boolean, default=False)

    # Relacionamentos explicitos para resolver ambiguidade dos Mixins
    user = relationship("User", foreign_keys=[user_id])
    unit = relationship("Unit", foreign_keys=[unit_id])
    visitor = relationship("Visitor", foreign_keys=[visitor_id])


class DeviceRequest(Base, TimestampMixin, TenantMixin):
    __tablename__ = "device_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    device_type = Column(String(30), nullable=False)
    status = Column(String(20), default="pending")

    # Relacionamento explicito
    user = relationship("User", foreign_keys=[user_id])
