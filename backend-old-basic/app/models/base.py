"""
Models base e mixins reutilizáveis
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import declared_attr, relationship, Session

from app.database import Base


class TimestampMixin:
    """Mixin para timestamps automáticos"""

    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TenantMixin:
    """
    Mixin para multi-tenancy com métodos de query seguros.
    TODA tabela que contém dados de condomínio deve usar este mixin.
    """

    @declared_attr
    def tenant_id(cls):
        return Column(
            Integer,  # CORRIGIDO: Integer ao invés de String(36)
            ForeignKey("tenants.id", ondelete="CASCADE"),
            nullable=False,
            index=True
        )

    @classmethod
    def for_tenant(cls, db: Session, tenant_id: int):
        """
        Retorna query já filtrada pelo tenant.
        SEMPRE use este método em vez de db.query() direto.
        """
        return db.query(cls).filter(cls.tenant_id == tenant_id)

    @classmethod
    def get_by_id_for_tenant(cls, db: Session, id: str, tenant_id: int):
        """
        Busca registro por ID garantindo que pertence ao tenant.
        Retorna None se não encontrar ou se for de outro tenant.
        """
        return db.query(cls).filter(
            cls.id == id,
            cls.tenant_id == tenant_id
        ).first()

    @classmethod
    def count_for_tenant(cls, db: Session, tenant_id: int) -> int:
        """Conta registros do tenant"""
        return cls.for_tenant(db, tenant_id).count()

    @classmethod
    def exists_for_tenant(cls, db: Session, tenant_id: int, **filters) -> bool:
        """Verifica se existe registro com os filtros no tenant"""
        query = cls.for_tenant(db, tenant_id)

        for field, value in filters.items():
            if hasattr(cls, field):
                query = query.filter(getattr(cls, field) == value)

        return query.first() is not None


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
