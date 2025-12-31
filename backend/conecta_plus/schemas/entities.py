"""
Schemas de manutenção, reserva, ocorrência, etc
"""

from datetime import date, datetime, time
from typing import Any, List, Optional

from pydantic import Field

from conecta_plus.schemas.common import BaseSchema, PaginatedResponse, TimestampSchema

# --- Manutenção ---


class MaintenanceTicketBase(BaseSchema):
    """Base para chamado de manutenção"""

    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: str
    priority: str = Field("normal", pattern="^(low|normal|high|urgent)$")


class MaintenanceTicketCreate(MaintenanceTicketBase):
    """Criação de chamado"""

    unit_id: Optional[int] = None
    attachments: List[str] = []


class MaintenanceTicketUpdate(BaseSchema):
    """Atualização de chamado"""

    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    resolution: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None


class MaintenanceTicketResponse(MaintenanceTicketBase, TimestampSchema):
    """Response de chamado"""

    id: int
    protocol: str
    unit_id: Optional[int] = None
    unit_identifier: Optional[str] = None
    requester_id: int
    requester_name: str
    status: str
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolution: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    attachments: List[Any] = []


class MaintenanceListResponse(PaginatedResponse[MaintenanceTicketResponse]):
    """Lista paginada de chamados"""

    pass


# --- Reservas ---


class ReservationBase(BaseSchema):
    """Base para reserva"""

    area_id: int
    date: date
    start_time: time
    end_time: time
    event_name: Optional[str] = None
    event_description: Optional[str] = None
    expected_guests: Optional[int] = None


class ReservationCreate(ReservationBase):
    """Criação de reserva"""

    unit_id: int


class ReservationResponse(ReservationBase, TimestampSchema):
    """Response de reserva"""

    id: int
    unit_id: int
    unit_identifier: str
    user_id: int
    user_name: str
    area_name: str
    status: str
    total_value: float
    deposit_paid: bool
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class ReservationListResponse(PaginatedResponse[ReservationResponse]):
    """Lista paginada de reservas"""

    pass


# --- Ocorrências ---


class OccurrenceBase(BaseSchema):
    """Base para ocorrência"""

    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    category: str
    severity: str = Field("medium", pattern="^(low|medium|high|critical)$")
    location: Optional[str] = None
    occurred_at: Optional[datetime] = None


class OccurrenceCreate(OccurrenceBase):
    """Criação de ocorrência"""

    unit_id: Optional[int] = None
    involved_units: List[int] = []
    attachments: List[str] = []


class OccurrenceResponse(OccurrenceBase, TimestampSchema):
    """Response de ocorrência"""

    id: int
    protocol: str
    unit_id: Optional[int] = None
    unit_identifier: Optional[str] = None
    reporter_id: int
    reporter_name: str
    status: str
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None
    attachments: List[Any] = []


class OccurrenceListResponse(PaginatedResponse[OccurrenceResponse]):
    """Lista paginada de ocorrências"""

    pass


# --- Encomendas ---


class PackageBase(BaseSchema):
    """Base para encomenda"""

    unit_id: int
    recipient_name: Optional[str] = None
    description: Optional[str] = None
    sender: Optional[str] = None
    tracking_code: Optional[str] = None
    package_type: str = Field("package", pattern="^(package|envelope|box|furniture|food|other)$")
    size: str = Field("medium", pattern="^(small|medium|large|extra_large)$")


class PackageCreate(PackageBase):
    """Criação de encomenda"""

    pass


class PackageResponse(PackageBase, TimestampSchema):
    """Response de encomenda"""

    id: int
    protocol: str
    unit_identifier: str
    received_at: datetime
    received_by_name: str
    status: str
    notified_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    picked_up_by_name: Optional[str] = None
    photo_url: Optional[str] = None


class PackageListResponse(PaginatedResponse[PackageResponse]):
    """Lista paginada de encomendas"""

    pass


class PackagePickupRequest(BaseSchema):
    """Request para retirada de encomenda"""

    picked_up_by_name: str = Field(..., min_length=2)
    signature_url: Optional[str] = None


# --- Comunicados ---


class AnnouncementBase(BaseSchema):
    """Base para comunicado"""

    title: str = Field(..., min_length=5, max_length=255)
    content: str = Field(..., min_length=10)
    summary: Optional[str] = None
    category: str = "general"
    priority: str = "normal"


class AnnouncementCreate(AnnouncementBase):
    """Criação de comunicado"""

    is_pinned: bool = False
    target_audience: str = "all"
    target_units: List[int] = []
    send_push: bool = True
    send_email: bool = False
    allow_comments: bool = True
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class AnnouncementResponse(AnnouncementBase, TimestampSchema):
    """Response de comunicado"""

    id: int
    status: str
    is_pinned: bool
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    views_count: int
    comments_count: int = 0
    created_by_name: str


class AnnouncementListResponse(PaginatedResponse[AnnouncementResponse]):
    """Lista paginada de comunicados"""

    pass


# --- Logs de Acesso ---


class AccessLogBase(BaseSchema):
    """Base para log de acesso"""

    access_type: str  # entry, exit
    access_method: str
    access_point: str = "Portaria Principal"
    observations: Optional[str] = None


class AccessLogCreate(AccessLogBase):
    """Criação de log de acesso"""

    user_id: Optional[int] = None
    visitor_id: Optional[int] = None
    unit_id: Optional[int] = None
    vehicle_id: Optional[int] = None


class AccessLogResponse(AccessLogBase, BaseSchema):
    """Response de log de acesso"""

    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    visitor_id: Optional[int] = None
    visitor_name: Optional[str] = None
    unit_id: Optional[int] = None
    unit_identifier: Optional[str] = None
    vehicle_id: Optional[int] = None
    vehicle_plate: Optional[str] = None
    registered_at: datetime
    registered_by_name: Optional[str] = None
    photo_url: Optional[str] = None


class AccessLogListResponse(PaginatedResponse[AccessLogResponse]):
    """Lista paginada de logs de acesso"""

    pass
