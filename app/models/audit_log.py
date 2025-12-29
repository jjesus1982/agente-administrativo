"""
Model AuditLog - Log de auditoria do sistema
"""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.base import TenantMixin


class AuditLog(Base, TenantMixin):
    """Log de auditoria de todas as ações do sistema"""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Usuário que executou a ação
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String(255))  # Cache do nome
    user_email = Column(String(255))  # Cache do email

    # Ação
    action = Column(String(50), nullable=False)
    """
    Ações:
    - create: Criação
    - update: Atualização
    - delete: Exclusão
    - login: Login
    - logout: Logout
    - access_grant: Liberação de acesso
    - access_deny: Negação de acesso
    - export: Exportação de dados
    - import: Importação de dados
    - config_change: Alteração de configuração
    """

    # Entidade afetada
    entity_type = Column(String(50))  # user, visitor, vehicle, etc
    entity_id = Column(Integer)
    entity_name = Column(String(255))  # Cache do nome/identificador

    # Detalhes
    description = Column(Text)
    old_values = Column(JSONB)  # Valores anteriores (para updates)
    new_values = Column(JSONB)  # Novos valores

    # Contexto
    ip_address = Column(String(50))
    user_agent = Column(String(500))
    request_id = Column(String(50))

    # Timestamp
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relacionamentos
    user = relationship("User")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', entity='{self.entity_type}')>"


class Logbook(Base, TenantMixin):
    """Livro de ocorrências da portaria"""

    __tablename__ = "logbook"

    id = Column(Integer, primary_key=True, index=True)

    # Autor
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Conteúdo
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50))

    # Turno
    shift = Column(String(20))  # morning, afternoon, night

    # Timestamp
    registered_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Relacionamentos
    user = relationship("User")


class LostFound(Base, TenantMixin):
    """Achados e perdidos"""

    __tablename__ = "lost_found"

    id = Column(Integer, primary_key=True, index=True)

    # Descrição
    description = Column(String(500), nullable=False)
    category = Column(String(50))
    location_found = Column(String(255))

    # Foto
    photo_url = Column(String(500))

    # Status
    status = Column(String(20), default="found")
    """
    Status:
    - found: Encontrado (aguardando dono)
    - claimed: Reclamado
    - returned: Devolvido
    - donated: Doado
    - discarded: Descartado
    """

    # Registro
    found_at = Column(DateTime, nullable=False)
    found_by_id = Column(Integer, ForeignKey("users.id"))
    found_by_name = Column(String(255))

    # Devolução
    claimed_at = Column(DateTime)
    claimed_by_id = Column(Integer, ForeignKey("users.id"))
    claimed_by_name = Column(String(255))

    # Observações
    notes = Column(Text)

    # Relacionamentos
    found_by = relationship("User", foreign_keys=[found_by_id])
    claimed_by = relationship("User", foreign_keys=[claimed_by_id])


class Key(Base, TenantMixin):
    """Controle de chaves"""

    __tablename__ = "keys"

    id = Column(Integer, primary_key=True, index=True)

    # Identificação
    name = Column(String(100), nullable=False)
    code = Column(String(50))
    description = Column(String(255))
    location = Column(String(100))  # Onde a chave abre

    # Status atual
    status = Column(String(20), default="available")  # available, in_use, lost

    # Último uso
    last_taken_at = Column(DateTime)
    last_taken_by_id = Column(Integer, ForeignKey("users.id"))
    last_returned_at = Column(DateTime)

    # Relacionamentos
    last_taken_by = relationship("User")
    logs = relationship("KeyLog", back_populates="key")


class KeyLog(Base):
    """Log de retirada/devolução de chaves"""

    __tablename__ = "key_logs"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(Integer, ForeignKey("keys.id"), nullable=False)

    # Ação
    action = Column(String(20), nullable=False)  # take, return

    # Quem
    user_id = Column(Integer, ForeignKey("users.id"))
    user_name = Column(String(255))

    # Quando
    action_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Registrado por (porteiro)
    registered_by_id = Column(Integer, ForeignKey("users.id"))

    # Observações
    notes = Column(Text)

    # Relacionamentos
    key = relationship("Key", back_populates="logs")
    user = relationship("User", foreign_keys=[user_id])
    registered_by = relationship("User", foreign_keys=[registered_by_id])


class Work(Base, TenantMixin):
    """Obras no condomínio"""

    __tablename__ = "works"

    id = Column(Integer, primary_key=True, index=True)

    # Descrição
    title = Column(String(255), nullable=False)
    description = Column(Text)
    location = Column(String(255))

    # Responsável
    unit_id = Column(Integer, ForeignKey("units.id"))
    contractor = Column(String(255))
    contractor_phone = Column(String(20))

    # Período
    start_date = Column(DateTime)
    end_date = Column(DateTime)

    # Horário permitido
    allowed_start_time = Column(String(5))  # HH:MM
    allowed_end_time = Column(String(5))
    allowed_days = Column(String(20))  # 12345 = Seg a Sex

    # Status
    status = Column(String(20), default="scheduled")
    """
    Status:
    - scheduled: Agendada
    - in_progress: Em andamento
    - completed: Concluída
    - cancelled: Cancelada
    - suspended: Suspensa
    """

    # Aprovação
    approved_by_id = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)

    # Observações
    notes = Column(Text)

    # Relacionamentos
    unit = relationship("Unit")
    approved_by = relationship("User")
