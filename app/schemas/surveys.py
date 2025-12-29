from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# --- Opções ---
class SurveyOptionBase(BaseModel):
    text: str
    order: Optional[int] = 0


class SurveyOptionCreate(SurveyOptionBase):
    pass


class SurveyOptionResponse(SurveyOptionBase):
    id: int
    votes_count: int = 0

    class Config:
        from_attributes = True


# --- Survey ---
class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None
    survey_type: str = "poll"
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_anonymous: bool = False
    allow_multiple: bool = False


class SurveyCreate(SurveyBase):
    options: List[SurveyOptionCreate] = []


class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    ends_at: Optional[datetime] = None


class SurveyResponse(SurveyBase):
    id: int
    status: str
    options: List[SurveyOptionResponse] = []
    total_votes: int = 0
    user_voted: bool = False
    user_vote_option_id: Optional[int] = None

    class Config:
        from_attributes = True


class SurveyListResponse(BaseModel):
    items: List[SurveyResponse]
    total: int
    page: int


# --- Voto ---
class VoteCreate(BaseModel):
    option_id: int


class VoteResponse(BaseModel):
    id: int
    survey_id: int
    option_id: int

    class Config:
        from_attributes = True
