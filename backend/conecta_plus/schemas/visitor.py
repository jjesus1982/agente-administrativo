"""
Schemas de visitante
"""

import re
from datetime import date, datetime
from typing import List, Optional

from pydantic import Field, field_validator

from app.schemas.common import BaseSchema, PaginatedResponse, TimestampSchema


class VisitorVehicleBase(BaseSchema):
    """Base para veículo de visitante"""

    plate: Optional[str] = Field(None, max_length=10)
    model: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    vehicle_type: str = Field("car", pattern="^(car|motorcycle|truck|bike)$")


class VisitorVehicleCreate(VisitorVehicleBase):
    """Criação de veículo"""

    pass


class VisitorVehicleResponse(VisitorVehicleBase):
    """Response de veículo"""

    id: int
    created_at: datetime


class VisitorBase(BaseSchema):
    """Base para visitante"""

    name: str = Field(..., min_length=2, max_length=255)
    cpf: Optional[str] = Field(None, max_length=14)
    rg: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    birth_date: Optional[date] = None

    visitor_type: str = Field("visitor", pattern="^(visitor|provider|delivery|airbnb|relative|employee)$")
    company: Optional[str] = Field(None, max_length=255)
    company_cnpj: Optional[str] = Field(None, max_length=18)
    service: Optional[str] = Field(None, max_length=255)

    has_special_needs: bool = False
    special_needs_description: Optional[str] = Field(None, max_length=500)
    observations: Optional[str] = None

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v):
        if v is None:
            return v
        cpf = re.sub(r"[^\d]", "", v)
        if len(cpf) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        return v


class VisitorCreate(VisitorBase):
    """Criação de visitante"""

    unit_id: Optional[int] = None
    vehicles: List[VisitorVehicleCreate] = []


class VisitorUpdate(BaseSchema):
    """Atualização de visitante"""

    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    email: Optional[str] = None
    visitor_type: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    observations: Optional[str] = None


class VisitorResponse(VisitorBase, TimestampSchema):
    """Response de visitante"""

    id: int
    photo_url: Optional[str] = None
    facial_id: Optional[str] = None
    is_blocked: bool
    block_reason: Optional[str] = None

    vehicles: List[VisitorVehicleResponse] = []

    created_by_id: Optional[int] = None
    created_by_name: Optional[str] = None


class VisitorListResponse(PaginatedResponse[VisitorResponse]):
    """Lista paginada de visitantes"""

    pass


class VisitorEntryRequest(BaseSchema):
    """Request para registrar entrada"""

    unit_id: int
    vehicle_id: Optional[int] = None
    access_point: str = "Portaria Principal"
    observations: Optional[str] = None


class VisitorExitRequest(BaseSchema):
    """Request para registrar saída"""

    access_point: str = "Portaria Principal"
    observations: Optional[str] = None


class ActiveVisitorResponse(BaseSchema):
    """Visitante ativo (no condomínio)"""

    id: int
    name: str
    visitor_type: str
    company: Optional[str] = None
    unit_identifier: str
    vehicle_plate: Optional[str] = None
    entry_time: datetime
    time_inside: str
    released_by: Optional[str] = None
    registered_by: str


class VisitorBlockRequest(BaseSchema):
    """Request para bloquear visitante"""

    reason: str = Field(..., min_length=10, max_length=500)
