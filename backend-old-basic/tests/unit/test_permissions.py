"""
Testes unitários para app/core/permissions.py
"""

from unittest.mock import Mock

import pytest
from fastapi import HTTPException

from app.core.permissions import (
    ROLE_NAMES,
    Role,
    check_permission,
    check_resource_ownership,
    get_role_name,
    require_permission,
    require_role,
)


class TestRoleEnum:
    """Testes para o enum Role"""

    def test_role_values(self):
        """Test que os valores do enum Role estão corretos"""
        assert Role.RESIDENT == 1
        assert Role.SYNDIC == 2
        assert Role.DOORMAN == 3
        assert Role.ADMIN == 4
        assert Role.SUPER_ADMIN == 5

    def test_role_ordering(self):
        """Test que as roles podem ser comparadas"""
        assert Role.RESIDENT < Role.SYNDIC
        assert Role.SYNDIC < Role.DOORMAN
        assert Role.DOORMAN < Role.ADMIN
        assert Role.ADMIN < Role.SUPER_ADMIN

    def test_role_equality(self):
        """Test igualdade entre roles"""
        assert Role.RESIDENT == 1
        assert Role.ADMIN == 4
        assert Role.RESIDENT != Role.ADMIN

    def test_all_roles_in_names(self):
        """Test que todos os roles têm nomes definidos"""
        for role in Role:
            assert role in ROLE_NAMES
            assert isinstance(ROLE_NAMES[role], str)
            assert len(ROLE_NAMES[role]) > 0


class TestGetRoleName:
    """Testes para a função get_role_name"""

    def test_get_role_name_resident(self):
        """Test nome do role RESIDENT"""
        assert get_role_name(Role.RESIDENT) == "Morador"

    def test_get_role_name_syndic(self):
        """Test nome do role SYNDIC"""
        assert get_role_name(Role.SYNDIC) == "Síndico"

    def test_get_role_name_doorman(self):
        """Test nome do role DOORMAN"""
        assert get_role_name(Role.DOORMAN) == "Porteiro"

    def test_get_role_name_admin(self):
        """Test nome do role ADMIN"""
        assert get_role_name(Role.ADMIN) == "Administrador"

    def test_get_role_name_super_admin(self):
        """Test nome do role SUPER_ADMIN"""
        assert get_role_name(Role.SUPER_ADMIN) == "Super Admin"

    def test_get_role_name_invalid(self):
        """Test nome para role inválido"""
        assert get_role_name(999) == "Desconhecido"
        assert get_role_name(0) == "Desconhecido"
        assert get_role_name(-1) == "Desconhecido"

    def test_get_role_name_with_int(self):
        """Test get_role_name com valores int"""
        assert get_role_name(1) == "Morador"
        assert get_role_name(2) == "Síndico"
        assert get_role_name(4) == "Administrador"


class TestCheckPermission:
    """Testes para verificação de permissões"""

    def test_check_permission_users_list_syndic(self):
        """Test permissão de listar usuários - Síndico"""
        assert check_permission(Role.SYNDIC, "users", "list") is True

    def test_check_permission_users_list_resident(self):
        """Test permissão de listar usuários - Morador (negado)"""
        assert check_permission(Role.RESIDENT, "users", "list") is False

    def test_check_permission_users_delete_admin(self):
        """Test permissão de deletar usuários - Admin (negado)"""
        assert check_permission(Role.ADMIN, "users", "delete") is False

    def test_check_permission_users_delete_super_admin(self):
        """Test permissão de deletar usuários - Super Admin"""
        assert check_permission(Role.SUPER_ADMIN, "users", "delete") is True

    def test_check_permission_visitors_entry_doorman(self):
        """Test permissão de registrar entrada de visitante - Porteiro"""
        assert check_permission(Role.DOORMAN, "visitors", "entry") is True

    def test_check_permission_visitors_entry_resident(self):
        """Test permissão de registrar entrada de visitante - Morador (negado)"""
        assert check_permission(Role.RESIDENT, "visitors", "entry") is False

    def test_check_permission_visitors_block_syndic(self):
        """Test permissão de bloquear visitante - Síndico"""
        assert check_permission(Role.SYNDIC, "visitors", "block") is True

    def test_check_permission_vehicles_create_resident(self):
        """Test permissão de criar veículo - Morador"""
        assert check_permission(Role.RESIDENT, "vehicles", "create") is True

    def test_check_permission_vehicles_delete_resident(self):
        """Test permissão de deletar veículo - Morador (negado)"""
        assert check_permission(Role.RESIDENT, "vehicles", "delete") is False

    def test_check_permission_vehicles_delete_admin(self):
        """Test permissão de deletar veículo - Admin"""
        assert check_permission(Role.ADMIN, "vehicles", "delete") is True

    def test_check_permission_maintenance_assign_syndic(self):
        """Test permissão de atribuir manutenção - Síndico"""
        assert check_permission(Role.SYNDIC, "maintenance", "assign") is True

    def test_check_permission_maintenance_assign_resident(self):
        """Test permissão de atribuir manutenção - Morador (negado)"""
        assert check_permission(Role.RESIDENT, "maintenance", "assign") is False

    def test_check_permission_invalid_module(self):
        """Test permissão para módulo inválido"""
        assert check_permission(Role.ADMIN, "invalid_module", "list") is False

    def test_check_permission_invalid_action(self):
        """Test permissão para ação inválida"""
        assert check_permission(Role.ADMIN, "users", "invalid_action") is False

    def test_check_permission_reports_view_doorman(self):
        """Test permissão de visualizar relatórios - Porteiro"""
        assert check_permission(Role.DOORMAN, "reports", "view") is True

    def test_check_permission_reports_view_resident(self):
        """Test permissão de visualizar relatórios - Morador (negado)"""
        assert check_permission(Role.RESIDENT, "reports", "view") is False

    def test_check_permission_audit_view_admin(self):
        """Test permissão de visualizar auditoria - Admin"""
        assert check_permission(Role.ADMIN, "audit", "view") is True

    def test_check_permission_audit_view_syndic(self):
        """Test permissão de visualizar auditoria - Síndico (negado)"""
        assert check_permission(Role.SYNDIC, "audit", "view") is False


class TestCheckResourceOwnership:
    """Testes para verificação de propriedade de recursos"""

    def test_check_ownership_owner(self):
        """Test que dono do recurso tem acesso"""
        user = Mock()
        user.id = 123
        user.role = Role.RESIDENT

        resource = Mock()
        resource.user_id = 123

        assert check_resource_ownership(user, resource) is True

    def test_check_ownership_not_owner(self):
        """Test que não-dono não tem acesso"""
        user = Mock()
        user.id = 123
        user.role = Role.RESIDENT

        resource = Mock()
        resource.user_id = 456

        assert check_resource_ownership(user, resource) is False

    def test_check_ownership_admin_not_owner(self):
        """Test que admin tem acesso mesmo sem ser dono"""
        user = Mock()
        user.id = 123
        user.role = Role.ADMIN

        resource = Mock()
        resource.user_id = 456

        assert check_resource_ownership(user, resource) is True

    def test_check_ownership_super_admin_not_owner(self):
        """Test que super admin tem acesso mesmo sem ser dono"""
        user = Mock()
        user.id = 123
        user.role = Role.SUPER_ADMIN

        resource = Mock()
        resource.user_id = 999

        assert check_resource_ownership(user, resource) is True

    def test_check_ownership_custom_field(self):
        """Test verificação com campo customizado"""
        user = Mock()
        user.id = 789
        user.role = Role.RESIDENT

        resource = Mock()
        resource.owner_id = 789

        assert check_resource_ownership(user, resource, owner_field="owner_id") is True

    def test_check_ownership_custom_field_not_owner(self):
        """Test verificação com campo customizado - não é dono"""
        user = Mock()
        user.id = 111
        user.role = Role.SYNDIC

        resource = Mock()
        resource.creator_id = 222

        assert check_resource_ownership(user, resource, owner_field="creator_id") is False

    def test_check_ownership_missing_field(self):
        """Test verificação quando campo não existe no recurso"""
        user = Mock()
        user.id = 123
        user.role = Role.RESIDENT

        resource = Mock()
        # resource não tem user_id

        assert check_resource_ownership(user, resource) is False


class TestRequireRoleDecorator:
    """Testes para o decorator require_role"""

    @pytest.mark.asyncio
    async def test_require_role_sufficient(self):
        """Test que usuário com role suficiente pode acessar"""

        @require_role(Role.SYNDIC)
        async def protected_function(current_user):
            return {"success": True}

        user = Mock()
        user.role = Role.ADMIN  # Admin > Syndic

        result = await protected_function(current_user=user)
        assert result == {"success": True}

    @pytest.mark.asyncio
    async def test_require_role_exact(self):
        """Test que usuário com role exata pode acessar"""

        @require_role(Role.SYNDIC)
        async def protected_function(current_user):
            return {"success": True}

        user = Mock()
        user.role = Role.SYNDIC

        result = await protected_function(current_user=user)
        assert result == {"success": True}

    @pytest.mark.asyncio
    async def test_require_role_insufficient(self):
        """Test que usuário com role insuficiente é bloqueado"""

        @require_role(Role.ADMIN)
        async def protected_function(current_user):
            return {"success": True}

        user = Mock()
        user.role = Role.RESIDENT

        with pytest.raises(HTTPException) as exc_info:
            await protected_function(current_user=user)

        assert exc_info.value.status_code == 403
        assert "Permissão insuficiente" in exc_info.value.detail


class TestRequirePermissionDecorator:
    """Testes para o decorator require_permission"""

    @pytest.mark.asyncio
    async def test_require_permission_allowed(self):
        """Test que usuário com permissão pode acessar"""

        @require_permission("users", "list")
        async def protected_function(current_user):
            return {"users": []}

        user = Mock()
        user.role = Role.SYNDIC  # Syndic pode listar usuários

        result = await protected_function(current_user=user)
        assert result == {"users": []}

    @pytest.mark.asyncio
    async def test_require_permission_denied(self):
        """Test que usuário sem permissão é bloqueado"""

        @require_permission("users", "delete")
        async def protected_function(current_user):
            return {"deleted": True}

        user = Mock()
        user.role = Role.ADMIN  # Admin não pode deletar usuários

        with pytest.raises(HTTPException) as exc_info:
            await protected_function(current_user=user)

        assert exc_info.value.status_code == 403
        assert "Sem permissão" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_require_permission_super_admin(self):
        """Test que super admin tem acesso à ação restrita"""

        @require_permission("users", "delete")
        async def protected_function(current_user):
            return {"deleted": True}

        user = Mock()
        user.role = Role.SUPER_ADMIN

        result = await protected_function(current_user=user)
        assert result == {"deleted": True}
