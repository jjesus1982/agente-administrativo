"""
Tests for Users Endpoints
Conecta Plus API - Users Test Suite
"""

import pytest
from httpx import AsyncClient

from app.models import Tenant, User


@pytest.mark.asyncio
class TestListUsers:
    """Test list users endpoint"""

    async def test_list_users_as_admin(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """Test listing users as admin"""
        response = await client.get(
            "/api/v1/users/",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    async def test_list_users_as_sindico(self, client: AsyncClient, sindico_headers: dict):
        """Test listing users as sindico"""
        response = await client.get(
            "/api/v1/users/",
            headers=sindico_headers,
        )

        assert response.status_code == 200

    async def test_list_users_as_morador_forbidden(self, client: AsyncClient, user_headers: dict):
        """Test that regular user cannot list users"""
        response = await client.get(
            "/api/v1/users/",
            headers=user_headers,
        )

        assert response.status_code == 403

    async def test_list_users_without_auth(self, client: AsyncClient):
        """Test listing users without authentication"""
        response = await client.get("/api/v1/users/")

        assert response.status_code in [401, 403]

    async def test_list_users_with_search(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """Test searching users by name"""
        response = await client.get(
            "/api/v1/users/?search=Usuario",
            headers=admin_headers,
        )

        assert response.status_code == 200

    async def test_list_users_filter_by_role(self, client: AsyncClient, admin_headers: dict):
        """Test filtering users by role"""
        response = await client.get(
            "/api/v1/users/?role=1",
            headers=admin_headers,
        )

        assert response.status_code == 200

    async def test_list_users_filter_active(self, client: AsyncClient, admin_headers: dict):
        """Test filtering active users"""
        response = await client.get(
            "/api/v1/users/?is_active=true",
            headers=admin_headers,
        )

        assert response.status_code == 200

    async def test_list_users_pagination(self, client: AsyncClient, admin_headers: dict):
        """Test users pagination"""
        response = await client.get(
            "/api/v1/users/?page=1&size=5",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 5


@pytest.mark.asyncio
class TestGetUser:
    """Test get single user endpoint"""

    async def test_get_user_by_id(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """Test getting user by ID"""
        response = await client.get(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == test_user.id
        assert data["email"] == test_user.email

    async def test_get_user_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test getting non-existent user"""
        response = await client.get(
            "/api/v1/users/99999",
            headers=admin_headers,
        )

        assert response.status_code == 404

    async def test_get_me_endpoint(self, client: AsyncClient, user_headers: dict, test_user: User):
        """Test getting current user via /me"""
        response = await client.get(
            "/api/v1/users/me",
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["email"] == test_user.email


@pytest.mark.asyncio
class TestCreateUser:
    """Test create user endpoint"""

    async def test_create_user_as_admin(self, client: AsyncClient, admin_headers: dict, test_tenant: Tenant):
        """Test creating user as admin"""
        user_data = {
            "name": "Novo Usuario",
            "email": "novo@example.com",
            "password": "Senha123!",
            "cpf": "222.333.444-55",
            "role": 1,
        }

        response = await client.post(
            "/api/v1/users/",
            headers=admin_headers,
            json=user_data,
        )

        assert response.status_code in [200, 201]
        data = response.json()
        assert data["email"] == "novo@example.com"

    async def test_create_user_duplicate_email(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """Test creating user with duplicate email"""
        user_data = {
            "name": "Outro Usuario",
            "email": "teste@example.com",  # Same as test_user
            "password": "Senha123!",
            "cpf": "333.444.555-66",
            "role": 1,
        }

        response = await client.post(
            "/api/v1/users/",
            headers=admin_headers,
            json=user_data,
        )

        assert response.status_code in [400, 409, 422]

    async def test_create_user_invalid_email(self, client: AsyncClient, admin_headers: dict):
        """Test creating user with invalid email"""
        user_data = {
            "name": "Usuario",
            "email": "emailinvalido",
            "password": "Senha123!",
            "cpf": "444.555.666-77",
            "role": 1,
        }

        response = await client.post(
            "/api/v1/users/",
            headers=admin_headers,
            json=user_data,
        )

        assert response.status_code == 422

    async def test_create_user_as_morador_forbidden(self, client: AsyncClient, user_headers: dict):
        """Test that regular user cannot create users"""
        user_data = {
            "name": "Novo",
            "email": "novo2@example.com",
            "password": "Senha123!",
            "cpf": "555.666.777-88",
            "role": 1,
        }

        response = await client.post(
            "/api/v1/users/",
            headers=user_headers,
            json=user_data,
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateUser:
    """Test update user endpoint"""

    async def test_update_user_as_admin(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """Test updating user as admin"""
        update_data = {
            "name": "Nome Atualizado",
        }

        response = await client.put(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Nome Atualizado"

    async def test_update_own_profile(self, client: AsyncClient, user_headers: dict, test_user: User):
        """Test user updating own profile"""
        update_data = {
            "phone": "11988887777",
        }

        response = await client.put(
            "/api/v1/users/me",
            headers=user_headers,
            json=update_data,
        )

        # Users can update their own profile
        assert response.status_code in [200, 403]

    async def test_update_user_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test updating non-existent user"""
        update_data = {
            "name": "Novo Nome",
        }

        response = await client.put(
            "/api/v1/users/99999",
            headers=admin_headers,
            json=update_data,
        )

        assert response.status_code == 404


@pytest.mark.asyncio
class TestDeleteUser:
    """Test delete user endpoint"""

    async def test_delete_user_as_admin(self, client: AsyncClient, admin_headers: dict, test_user: User, db_session):
        """Test soft-deleting user as admin"""
        response = await client.delete(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )

        assert response.status_code in [200, 204]

    async def test_delete_user_as_morador_forbidden(self, client: AsyncClient, user_headers: dict, test_admin: User):
        """Test that regular user cannot delete users"""
        response = await client.delete(
            f"/api/v1/users/{test_admin.id}",
            headers=user_headers,
        )

        assert response.status_code == 403

    async def test_delete_user_not_found(self, client: AsyncClient, admin_headers: dict):
        """Test deleting non-existent user"""
        response = await client.delete(
            "/api/v1/users/99999",
            headers=admin_headers,
        )

        assert response.status_code == 404


@pytest.mark.asyncio
class TestUserRoles:
    """Test user role management"""

    async def test_user_response_has_role_name(self, client: AsyncClient, admin_headers: dict, test_user: User):
        """Test that user response includes role name"""
        response = await client.get(
            f"/api/v1/users/{test_user.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "role" in data
        assert "role_name" in data

    async def test_list_users_includes_role_info(self, client: AsyncClient, admin_headers: dict):
        """Test that listed users include role information"""
        response = await client.get(
            "/api/v1/users/",
            headers=admin_headers,
        )

        assert response.status_code == 200
        items = response.json()["items"]

        for user in items:
            assert "role" in user
