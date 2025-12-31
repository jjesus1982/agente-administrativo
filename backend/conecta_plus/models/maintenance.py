from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from conecta_plus.database import Base
from conecta_plus.models.base import TenantMixin, TimestampMixin


class MaintenanceTicket(Base, TenantMixin, TimestampMixin):
    __tablename__ = "maintenance_tickets"

    id = Column(Integer, primary_key=True, index=True)
    protocol = Column(String(20), unique=True, nullable=False, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    priority = Column(String(20), default="normal")
    status = Column(String(20), nullable=False, default="aberto", index=True)
    assigned_to = Column(String(255))
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime)
    scheduled_date = Column(DateTime)
    scheduled_period = Column(String(20))
    resolution = Column(Text)
    resolved_by_id = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime)
    estimated_cost = Column(Numeric(10, 2))
    actual_cost = Column(Numeric(10, 2))
    attachments = Column(JSONB, default=[])
    created_by_id = Column(Integer, ForeignKey("users.id"))
    updated_by_id = Column(Integer, ForeignKey("users.id"))

    comments = relationship("TicketComment", back_populates="ticket")


class TicketComment(Base, TimestampMixin):
    __tablename__ = "ticket_comments"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("maintenance_tickets.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    attachments = Column(JSONB, default=[])

    ticket = relationship("MaintenanceTicket", back_populates="comments")


class MaintenanceSchedule(Base, TenantMixin, TimestampMixin):
    __tablename__ = "maintenance_schedules"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    recurrence_type = Column(String(20))
    recurrence_interval = Column(Integer)
    recurrence_day = Column(Integer)
    next_execution = Column(DateTime)
    last_execution = Column(DateTime)
    assigned_to = Column(String(255))
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    updated_by_id = Column(Integer, ForeignKey("users.id"))

    executions = relationship("MaintenanceExecution", back_populates="schedule")


class MaintenanceExecution(Base, TenantMixin, TimestampMixin):
    __tablename__ = "maintenance_executions"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("maintenance_schedules.id"))
    executed_at = Column(DateTime, nullable=False)
    executed_by_id = Column(Integer, ForeignKey("users.id"))
    executed_by_name = Column(String(255))
    status = Column(String(20))
    notes = Column(Text)
    attachments = Column(JSONB, default=[])
    cost = Column(Numeric(10, 2))

    schedule = relationship("MaintenanceSchedule", back_populates="executions")
