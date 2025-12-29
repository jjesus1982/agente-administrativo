from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class OccurrenceCreate(BaseModel):
    title: str
    description: str
    category: str
    severity: str = "medium"
    location: Optional[str] = None
    involved_names: Optional[str] = None
    witnesses: Optional[str] = None
    occurred_at: Optional[datetime] = None


class OccurrenceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    resolution: Optional[str] = None
    actions_taken: Optional[str] = None


class OccurrenceResponse(BaseModel):
    id: int
    protocol: str
    title: str
    description: str
    category: str
    severity: str
    status: str
    location: Optional[str] = None
    involved_names: Optional[str] = None
    witnesses: Optional[str] = None
    resolution: Optional[str] = None
    actions_taken: Optional[str] = None
    occurred_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OccurrenceListResponse(BaseModel):
    items: List[OccurrenceResponse]
    total: int
    page: int
