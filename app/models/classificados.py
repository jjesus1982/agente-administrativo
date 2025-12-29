from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class ClassificadoAnuncio(Base):
    __tablename__ = "classificados_anuncios"

    id = Column(Integer, primary_key=True, index=True)
    morador_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    titulo = Column(String(150), nullable=False)
    descricao = Column(Text)
    preco = Column(Numeric(10, 2))
    categoria = Column(String(50), nullable=False)
    condicao = Column(String(20), nullable=False, default="usado")
    status = Column(String(20), nullable=False, default="disponivel")
    visualizacoes = Column(Integer, default=0)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime)

    morador = relationship("User", backref="anuncios")
    imagens = relationship("ClassificadoImagem", back_populates="anuncio", cascade="all, delete-orphan")
    favoritos = relationship("ClassificadoFavorito", back_populates="anuncio", cascade="all, delete-orphan")


class ClassificadoImagem(Base):
    __tablename__ = "classificados_imagens"

    id = Column(Integer, primary_key=True, index=True)
    anuncio_id = Column(Integer, ForeignKey("classificados_anuncios.id", ondelete="CASCADE"), nullable=False)
    url = Column(String(500), nullable=False)
    ordem = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    anuncio = relationship("ClassificadoAnuncio", back_populates="imagens")


class ClassificadoFavorito(Base):
    __tablename__ = "classificados_favoritos"

    id = Column(Integer, primary_key=True, index=True)
    anuncio_id = Column(Integer, ForeignKey("classificados_anuncios.id", ondelete="CASCADE"), nullable=False)
    morador_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("anuncio_id", "morador_id", name="uq_favorito_anuncio_morador"),)

    anuncio = relationship("ClassificadoAnuncio", back_populates="favoritos")
    morador = relationship("User", backref="favoritos_classificados")


class ClassificadoRecomendacao(Base):
    __tablename__ = "classificados_recomendacoes"

    id = Column(Integer, primary_key=True, index=True)
    avaliador_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    avaliado_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anuncio_id = Column(Integer, ForeignKey("classificados_anuncios.id", ondelete="SET NULL"))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("avaliador_id", "avaliado_id", "anuncio_id", name="uq_recomendacao"),)

    avaliador = relationship("User", foreign_keys=[avaliador_id], backref="recomendacoes_feitas")
    avaliado = relationship("User", foreign_keys=[avaliado_id], backref="recomendacoes_recebidas")
