from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


# === TICKETS ===
class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str = "normal"
    unit_id: Optional[int] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    resolution: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None


class TicketResponse(BaseModel):
    id: int
    protocol: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    unit_id: Optional[int] = None
    requester_id: int
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    resolution: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    actual_cost: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    items: List[TicketResponse]
    total: int
    page: int


# === SCHEDULES ===
class ScheduleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    recurrence_type: str = "monthly"
    recurrence_interval: int = 1
    recurrence_day: Optional[int] = None
    next_execution: Optional[datetime] = None
    assigned_to: Optional[str] = None


class ScheduleResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    category: str
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    next_execution: Optional[datetime] = None
    last_execution: Optional[datetime] = None
    assigned_to: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class ScheduleListResponse(BaseModel):
    items: List[ScheduleResponse]
    total: int


# === EXECUTIONS ===
class ExecutionCreate(BaseModel):
    schedule_id: int
    executed_at: datetime
    executed_by_name: Optional[str] = None
    status: str = "concluida"
    notes: Optional[str] = None
    cost: Optional[Decimal] = None


class ExecutionResponse(BaseModel):
    id: int
    schedule_id: Optional[int] = None
    executed_at: datetime
    executed_by_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    cost: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True
