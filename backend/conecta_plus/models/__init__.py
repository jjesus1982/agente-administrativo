"""
Models do sistema Conecta Plus
Simplified imports for auth system
"""

# Only import essential models for authentication
from .base import Base, TimestampMixin, TenantMixin, AuditMixin, SoftDeleteMixin
from .tenant import Tenant
from .user import User

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "TenantMixin",
    "AuditMixin",
    "SoftDeleteMixin",
    # Core for auth
    "Tenant",
    "User",
]