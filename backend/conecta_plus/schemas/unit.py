"""
Schemas de unidade
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import Field

from conecta_plus.schemas.common import BaseSchema, PaginatedResponse, TimestampSchema


class UnitBase(BaseSchema):
    """Base para unidade"""

    block: Optional[str] = Field(None, max_length=10)
    number: str = Field(..., max_length=20)
    floor: Optional[int] = None
    unit_type: str = Field("apartment", pattern="^(apartment|house|store)$")
    area: Optional[float] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    parking_spots: int = 1


class UnitCreate(UnitBase):
    """Criação de unidade"""

    owner_id: Optional[int] = None
    ideal_fraction: Optional[float] = None


class UnitUpdate(BaseSchema):
    """Atualização de unidade"""

    block: Optional[str] = None
    number: Optional[str] = None
    floor: Optional[int] = None
    owner_id: Optional[int] = None
    is_rented: Optional[bool] = None
    tenant_user_id: Optional[int] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None


class UnitResponse(UnitBase, TimestampSchema):
    """Response de unidade"""

    id: int
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    is_rented: bool
    tenant_user_id: Optional[int] = None
    tenant_name: Optional[str] = None
    contract_start: Optional[date] = None
    contract_end: Optional[date] = None
    ideal_fraction: Optional[float] = None
    is_active: bool
    full_identifier: str = ""
    residents_count: int = 0


class UnitListResponse(PaginatedResponse[UnitResponse]):
    """Lista paginada de unidades"""

    pass


class UnitSimple(BaseSchema):
    """Unidade simplificada"""

    id: int
    block: Optional[str] = None
    number: str
    full_identifier: str = ""


# --- Schemas de Veículo ---


class VehicleBase(BaseSchema):
    """Base para veículo"""

    plate: str = Field(..., max_length=10)
    model: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    year: Optional[int] = None
    vehicle_type: str = Field("car", pattern="^(car|motorcycle|truck|bike|other)$")
    tag_number: Optional[str] = None
    remote_number: Optional[str] = None


class VehicleCreate(VehicleBase):
    """Criação de veículo"""

    owner_id: int
    unit_id: Optional[int] = None
    parking_spot_id: Optional[int] = None


class VehicleUpdate(BaseSchema):
    """Atualização de veículo"""

    model: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[str] = None
    tag_number: Optional[str] = None
    remote_number: Optional[str] = None
    parking_spot_id: Optional[int] = None
    is_active: Optional[bool] = None


class VehicleResponse(VehicleBase, TimestampSchema):
    """Response de veículo"""

    id: int
    owner_id: int
    owner_name: Optional[str] = None
    unit_id: Optional[int] = None
    unit_identifier: Optional[str] = None
    parking_spot_id: Optional[int] = None
    parking_spot_number: Optional[str] = None
    is_active: bool


class VehicleListResponse(PaginatedResponse[VehicleResponse]):
    """Lista paginada de veículos"""

    pass


# --- Schemas de Vaga ---


class ParkingSpotBase(BaseSchema):
    """Base para vaga"""

    number: str = Field(..., max_length=20)
    floor: Optional[str] = None
    section: Optional[str] = None
    spot_type: str = Field("regular", pattern="^(regular|handicapped|elderly|motorcycle|visitor)$")
    description: Optional[str] = None


class ParkingSpotCreate(ParkingSpotBase):
    """Criação de vaga"""

    unit_id: Optional[int] = None


class ParkingSpotResponse(ParkingSpotBase, TimestampSchema):
    """Response de vaga"""

    id: int
    unit_id: Optional[int] = None
    unit_identifier: Optional[str] = None
    is_available: bool
    is_active: bool
    vehicle_plate: Optional[str] = None


class ParkingSpotListResponse(PaginatedResponse[ParkingSpotResponse]):
    """Lista paginada de vagas"""

    pass
