"""
Models base e mixins reutilizáveis
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import declared_attr, relationship

from app.database import Base


class TimestampMixin:
    """Mixin para timestamps automáticos"""

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TenantMixin:
    """Mixin para multi-tenancy"""

    @declared_attr
    def tenant_id(cls):
        return Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)


class AuditMixin:
    """Mixin para auditoria de quem criou/atualizou"""

    @declared_attr
    def created_by_id(cls):
        return Column(Integer, ForeignKey("users.id"), nullable=True)

    @declared_attr
    def updated_by_id(cls):
        return Column(Integer, ForeignKey("users.id"), nullable=True)


class SoftDeleteMixin:
    """Mixin para soft delete"""

    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    @declared_attr
    def deleted_by_id(cls):
        return Column(Integer, ForeignKey("users.id"), nullable=True)
