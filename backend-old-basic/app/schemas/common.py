"""
Schemas comuns reutilizáveis
"""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Schema base com configurações comuns"""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, str_strip_whitespace=True)


class TimestampSchema(BaseSchema):
    """Schema com timestamps"""

    created_at: datetime
    updated_at: Optional[datetime] = None


class PaginationParams(BaseModel):
    """Parâmetros de paginação"""

    page: int = Field(1, ge=1, description="Número da página")
    page_size: int = Field(15, ge=1, le=100, description="Itens por página")
    sort_by: Optional[str] = Field(None, description="Campo para ordenação")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class PaginatedResponse(BaseSchema, Generic[T]):
    """Resposta paginada genérica"""

    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


class MessageResponse(BaseSchema):
    """Resposta simples com mensagem"""

    message: str
    success: bool = True


class ErrorResponse(BaseSchema):
    """Resposta de erro"""

    detail: str
    code: Optional[str] = None
    field: Optional[str] = None


class FilterParams(BaseModel):
    """Parâmetros de filtro comuns"""

    search: Optional[str] = Field(None, description="Busca textual")
    start_date: Optional[datetime] = Field(None, description="Data início")
    end_date: Optional[datetime] = Field(None, description="Data fim")
    is_active: Optional[bool] = Field(None, description="Status ativo")


class IDResponse(BaseSchema):
    """Resposta com ID"""

    id: int


class CountResponse(BaseSchema):
    """Resposta com contagem"""

    count: int
