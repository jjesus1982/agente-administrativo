"""
Schemas de usuário
"""

import re
from datetime import date, datetime
from typing import List, Optional

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import BaseSchema, PaginatedResponse, TimestampSchema


class UserBase(BaseSchema):
    """Base para usuário"""

    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    cpf: Optional[str] = Field(None, max_length=14)
    rg: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    phone_secondary: Optional[str] = Field(None, max_length=20)
    birth_date: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=1)
    has_special_needs: bool = False
    special_needs_description: Optional[str] = None

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v):
        if v is None:
            return v
        cpf = re.sub(r"[^\d]", "", v)
        if len(cpf) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        return v


class UserCreate(UserBase):
    """Criação de usuário"""

    password: str = Field(..., min_length=8)
    role: int = Field(1, ge=1, le=5)
    unit_id: Optional[int] = None


class UserUpdate(BaseSchema):
    """Atualização de usuário"""

    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    has_special_needs: Optional[bool] = None
    special_needs_description: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[int] = Field(None, ge=1, le=5)


class UserResponse(UserBase, TimestampSchema):
    """Response de usuário"""

    id: int
    photo_url: Optional[str] = None
    role: int
    role_name: str = ""
    is_active: bool
    is_verified: bool
    last_login: Optional[datetime] = None
    tenant_id: int

    @property
    def role_name(self) -> str:
        roles = {1: "Morador", 2: "Síndico", 3: "Porteiro", 4: "Administrador", 5: "Super Admin"}
        return roles.get(self.role, "Desconhecido")


class UserListResponse(PaginatedResponse[UserResponse]):
    """Lista paginada de usuários"""

    pass


class UserSimple(BaseSchema):
    """Usuário simplificado (para referências)"""

    id: int
    name: str
    email: str
    photo_url: Optional[str] = None
