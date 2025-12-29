"""
Schemas de autenticação
"""

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.common import BaseSchema


class LoginRequest(BaseModel):
    """Request de login"""

    email: EmailStr
    password: str = Field(..., min_length=6)


class TokenResponse(BaseSchema):
    """Response com tokens"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # segundos


class RefreshTokenRequest(BaseModel):
    """Request para refresh token"""

    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Request para reset de senha"""

    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Confirmação de reset de senha"""

    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("Senha deve conter ao menos uma letra maiúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("Senha deve conter ao menos uma letra minúscula")
        if not re.search(r"\d", v):
            raise ValueError("Senha deve conter ao menos um número")
        return v


class ChangePasswordRequest(BaseModel):
    """Request para troca de senha"""

    current_password: str
    new_password: str = Field(..., min_length=8)


class UserMeResponse(BaseSchema):
    """Response com dados do usuário logado"""

    id: int
    name: str
    email: str
    cpf: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    role: int
    role_name: str
    tenant_id: int
    tenant_name: str
    last_login: Optional[datetime] = None


class TokenPayload(BaseModel):
    """Payload do token JWT"""

    sub: int  # user_id
    tenant_id: int
    role: int
    exp: datetime
    type: str  # access ou refresh
