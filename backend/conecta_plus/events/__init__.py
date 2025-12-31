"""
Event System - Sistema de eventos para comunicação inter-agentes
"""

from .bus import EventBus, EventSubscription
from .types import Event, EventType, EventPriority, EventFilter
from .handlers import EventHandler, event_handler
from .pubsub import PubSubManager

__all__ = [
    "EventBus",
    "EventSubscription",
    "Event",
    "EventType",
    "EventPriority",
    "EventFilter",
    "EventHandler",
    "event_handler",
    "PubSubManager"
]