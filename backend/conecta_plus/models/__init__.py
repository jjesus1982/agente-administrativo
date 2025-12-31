"""
Models do sistema Conecta Plus
Simplified imports for auth system
"""

# Import models in correct order to avoid circular dependencies
from .base import Base, TimestampMixin, TenantMixin, AuditMixin, SoftDeleteMixin

# Core models (minimal dependencies)
from .tenant import Tenant

# Unit and resident models
from .unit import Unit, UnitResident
from .resident import Dependent

# User model (depends on Tenant, UnitResident, Dependent)
from .user import User

# Models that depend on User/Tenant/Unit
from .visitor import Visitor, VisitorVehicle
from .vehicle import Vehicle, ParkingSpot

# Additional models needed for full functionality
from .access_log import AccessLog
from .device import Device
from .announcement import Announcement, AnnouncementRead, AnnouncementComment
from .occurrence import Occurrence, OccurrenceComment
from .package import Package
from .pet import Pet
from .reservation import Reservation, CommonArea
from .survey import Survey, SurveyOption, SurveyVote
from .financial import BankAccount, Boleto, Payment, FinancialCategory
from .maintenance import MaintenanceTicket, MaintenanceExecution, MaintenanceSchedule, TicketComment
from .audit_log import AuditLog, Key, KeyLog, Logbook, LostFound, Work
from .classificados import ClassificadoAnuncio, ClassificadoImagem, ClassificadoFavorito, ClassificadoRecomendacao
from .acessos import AcessoSolicitacao, AcessoLog
from .portaria import (
    GrupoAcesso, PontoAcesso, GrupoAcessoPonto, PreAutorizacao,
    TipoOcorrencia, IntegracaoHardware, SincronizacaoLog,
    VagaGaragem, ComunicacaoPortaria, Visita
)

__all__ = [
    # Base mixins
    "Base",
    "TimestampMixin",
    "TenantMixin",
    "AuditMixin",
    "SoftDeleteMixin",

    # Core models
    "Tenant",
    "User",
    "Unit",
    "UnitResident",
    "Dependent",

    # Visitor and vehicle
    "Visitor",
    "VisitorVehicle",
    "Vehicle",
    "ParkingSpot",

    # System models
    "AccessLog",
    "Device",
    "Announcement",
    "AnnouncementRead",
    "AnnouncementComment",
    "Occurrence",
    "OccurrenceComment",
    "Package",
    "Pet",
    "Reservation",
    "CommonArea",
    "Survey",
    "SurveyOption",
    "SurveyVote",

    # Financial
    "BankAccount",
    "Boleto",
    "Payment",
    "FinancialCategory",

    # Maintenance
    "MaintenanceTicket",
    "MaintenanceExecution",
    "MaintenanceSchedule",
    "TicketComment",

    # Audit and logs
    "AuditLog",
    "Key",
    "KeyLog",
    "Logbook",
    "LostFound",
    "Work",

    # Classificados
    "ClassificadoAnuncio",
    "ClassificadoImagem",
    "ClassificadoFavorito",
    "ClassificadoRecomendacao",

    # Access control
    "AcessoSolicitacao",
    "AcessoLog",

    # Portaria
    "GrupoAcesso",
    "PontoAcesso",
    "GrupoAcessoPonto",
    "PreAutorizacao",
    "TipoOcorrencia",
    "IntegracaoHardware",
    "SincronizacaoLog",
    "VagaGaragem",
    "ComunicacaoPortaria",
    "Visita",
]