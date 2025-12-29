from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field


class ImagemBase(BaseModel):
    url: str
    ordem: Optional[int] = 0


class ImagemResponse(ImagemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class MoradorResumo(BaseModel):
    id: int
    nome: str
    foto_perfil: Optional[str] = None
    bloco: Optional[str] = None
    apartamento: Optional[str] = None
    verificado: bool = False
    recomendacoes: int = 0

    class Config:
        from_attributes = True


class AnuncioBase(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=150)
    descricao: Optional[str] = None
    preco: Optional[Decimal] = None
    categoria: str
    condicao: str = "usado"


class AnuncioCreate(AnuncioBase):
    pass


class AnuncioUpdate(BaseModel):
    titulo: Optional[str] = Field(None, min_length=3, max_length=150)
    descricao: Optional[str] = None
    preco: Optional[Decimal] = None
    categoria: Optional[str] = None
    condicao: Optional[str] = None
    status: Optional[str] = None


class AnuncioResponse(AnuncioBase):
    id: int
    morador_id: int
    status: str
    visualizacoes: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    imagens: List[ImagemResponse] = []
    is_favorito: bool = False

    class Config:
        from_attributes = True


class AnuncioDetalhe(AnuncioResponse):
    vendedor: MoradorResumo


class AnuncioListResponse(BaseModel):
    items: List[AnuncioResponse]
    total: int
    page: int
    pages: int


class FavoritoResponse(BaseModel):
    id: int
    anuncio_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RecomendacaoCreate(BaseModel):
    avaliado_id: int
    anuncio_id: Optional[int] = None


class RecomendacaoResponse(BaseModel):
    id: int
    avaliador_id: int
    avaliado_id: int
    anuncio_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VendedorPerfil(MoradorResumo):
    anuncios_ativos: int = 0
    total_vendas: int = 0
    membro_desde: datetime
