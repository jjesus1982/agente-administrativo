"""
Models do sistema Conecta Plus
"""

from app.models.access_log import AccessLog
from app.models.announcement import Announcement, AnnouncementComment, AnnouncementRead
from app.models.audit_log import AuditLog, Key, KeyLog, Logbook, LostFound, Work
from app.models.base import AuditMixin, Base, SoftDeleteMixin, TenantMixin, TimestampMixin
from app.models.device import Device, DeviceRequest
from app.models.financial import BankAccount, Boleto, FinancialCategory, Payment
from app.models.maintenance import MaintenanceExecution, MaintenanceSchedule, MaintenanceTicket, TicketComment
from app.models.occurrence import Occurrence, OccurrenceComment
from app.models.package import Package
from app.models.pet import Pet
from app.models.reservation import CommonArea, Reservation
from app.models.resident import Dependent
from app.models.survey import Survey, SurveyOption, SurveyVote
from app.models.tenant import Tenant
from app.models.unit import Unit, UnitResident
from app.models.user import User
from app.models.vehicle import ParkingSpot, Vehicle
from app.models.visitor import Visitor, VisitorVehicle
from app.models.portaria import (
    ComunicacaoPortaria,
    GrupoAcesso,
    GrupoAcessoPonto,
    IntegracaoHardware,
    PontoAcesso,
    PreAutorizacao,
    SincronizacaoLog,
    TipoOcorrencia,
    VagaGaragem,
    Visita,
)

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "TenantMixin",
    "AuditMixin",
    "SoftDeleteMixin",
    # Core
    "Tenant",
    "User",
    "Unit",
    "UnitResident",
    "Dependent",
    # Visitors
    "Visitor",
    "VisitorVehicle",
    # Vehicles
    "Vehicle",
    "ParkingSpot",
    # Access
    "AccessLog",
    "Device",
    "DeviceRequest",
    # Maintenance
    "MaintenanceTicket",
    "TicketComment",
    "MaintenanceSchedule",
    "MaintenanceExecution",
    # Reservations
    "CommonArea",
    "Reservation",
    # Occurrences
    "Occurrence",
    "OccurrenceComment",
    # Packages
    "Package",
    # Announcements
    "Announcement",
    "AnnouncementComment",
    "AnnouncementRead",
    # Surveys
    "Survey",
    "SurveyOption",
    "SurveyVote",
    # Pets
    "Pet",
    # Audit
    "AuditLog",
    "Logbook",
    "LostFound",
    "Key",
    "KeyLog",
    "Work",
    # Financial
    "BankAccount",
    "Boleto",
    "Payment",
    "FinancialCategory",
    # Portaria
    "GrupoAcesso",
    "GrupoAcessoPonto",
    "PontoAcesso",
    "PreAutorizacao",
    "TipoOcorrencia",
    "IntegracaoHardware",
    "SincronizacaoLog",
    "VagaGaragem",
    "ComunicacaoPortaria",
    "Visita",
]
