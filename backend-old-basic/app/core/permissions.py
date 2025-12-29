"""
Sistema de permissões RBAC
"""

from enum import IntEnum
from functools import wraps
from typing import Callable, List

from fastapi import HTTPException, status


class Role(IntEnum):
    """Níveis de permissão do sistema"""

    RESIDENT = 1  # Morador - acesso básico
    SYNDIC = 2  # Síndico - gestão do condomínio
    DOORMAN = 3  # Porteiro - controle de acesso
    ADMIN = 4  # Administrador - acesso total ao tenant
    SUPER_ADMIN = 5  # Super Admin - acesso global


# Mapeamento de roles para nomes
ROLE_NAMES = {
    Role.RESIDENT: "Morador",
    Role.SYNDIC: "Síndico",
    Role.DOORMAN: "Porteiro",
    Role.ADMIN: "Administrador",
    Role.SUPER_ADMIN: "Super Admin",
}


def get_role_name(role: int) -> str:
    """Retorna nome do role"""
    return ROLE_NAMES.get(role, "Desconhecido")


# Permissões por módulo
PERMISSIONS = {
    "users": {
        "list": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.ADMIN, Role.SUPER_ADMIN],
        "delete": [Role.SUPER_ADMIN],
    },
    "units": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "delete": [Role.SUPER_ADMIN],
    },
    "visitors": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "entry": [Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "exit": [Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "block": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "vehicles": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "delete": [Role.ADMIN, Role.SUPER_ADMIN],
    },
    "maintenance": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.RESIDENT, Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "assign": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "complete": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "reservations": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.RESIDENT, Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "approve": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "cancel": [Role.RESIDENT, Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "occurrences": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "view": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "resolve": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "packages": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "pickup": [Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "announcements": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "delete": [Role.ADMIN, Role.SUPER_ADMIN],
    },
    "surveys": {
        "list": [Role.RESIDENT, Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "create": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "vote": [Role.RESIDENT, Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "reports": {
        "view": [Role.SYNDIC, Role.DOORMAN, Role.ADMIN, Role.SUPER_ADMIN],
        "export": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
    },
    "audit": {
        "view": [Role.ADMIN, Role.SUPER_ADMIN],
    },
    "settings": {
        "view": [Role.SYNDIC, Role.ADMIN, Role.SUPER_ADMIN],
        "update": [Role.ADMIN, Role.SUPER_ADMIN],
    },
}


def check_permission(user_role: int, module: str, action: str) -> bool:
    """Verifica se o usuário tem permissão"""
    allowed_roles = PERMISSIONS.get(module, {}).get(action, [])
    return user_role in allowed_roles


def require_role(min_role: Role):
    """Decorator para verificar role mínima"""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user, **kwargs):
            if current_user.role < min_role:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permissão insuficiente. Requer: {ROLE_NAMES[min_role]}",
                )
            return await func(*args, current_user=current_user, **kwargs)

        return wrapper

    return decorator


def require_permission(module: str, action: str):
    """Decorator para verificar permissão específica"""

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user, **kwargs):
            if not check_permission(current_user.role, module, action):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, detail=f"Sem permissão para {action} em {module}"
                )
            return await func(*args, current_user=current_user, **kwargs)

        return wrapper

    return decorator


def check_resource_ownership(user, resource, owner_field: str = "user_id") -> bool:
    """Verifica se usuário é dono do recurso ou admin"""
    if user.role >= Role.ADMIN:
        return True

    owner_id = getattr(resource, owner_field, None)
    return owner_id == user.id
