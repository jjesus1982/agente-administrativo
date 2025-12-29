"""
Tests for Authentication Endpoints
Conecta Plus API - Auth Test Suite
"""

import pytest
from httpx import AsyncClient

from app.models import Tenant, User


@pytest.mark.asyncio
class TestLogin:
    """Test login endpoint"""

    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login with valid credentials"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "teste@example.com", "password": "Senha123!"},
        )

        assert response.status_code == 200
        data = response.json()

        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert data["expires_in"] > 0

    async def test_login_wrong_email(self, client: AsyncClient, test_user: User):
        """Test login with non-existent email"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "naoexiste@example.com", "password": "Senha123!"},
        )

        assert response.status_code == 401
        assert "incorretos" in response.json()["detail"].lower()

    async def test_login_wrong_password(self, client: AsyncClient, test_user: User):
        """Test login with wrong password"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "teste@example.com", "password": "SenhaErrada123!"},
        )

        assert response.status_code == 401
        assert "incorretos" in response.json()["detail"].lower()

    async def test_login_inactive_user(self, client: AsyncClient, inactive_user: User):
        """Test login with inactive user"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "inativo@example.com", "password": "Senha123!"},
        )

        assert response.status_code == 403
        assert "desativado" in response.json()["detail"].lower()

    async def test_login_deleted_user(self, client: AsyncClient, deleted_user: User):
        """Test login with soft-deleted user"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "deletado@example.com", "password": "Senha123!"},
        )

        assert response.status_code == 403
        assert "removido" in response.json()["detail"].lower()

    async def test_login_invalid_email_format(self, client: AsyncClient):
        """Test login with invalid email format"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "emailinvalido", "password": "Senha123!"},
        )

        assert response.status_code == 422  # Validation error

    async def test_login_empty_password(self, client: AsyncClient):
        """Test login with empty password"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "teste@example.com", "password": ""},
        )

        assert response.status_code == 422

    async def test_login_short_password(self, client: AsyncClient):
        """Test login with too short password"""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "teste@example.com", "password": "123"},
        )

        assert response.status_code == 422


@pytest.mark.asyncio
class TestRefreshToken:
    """Test refresh token endpoint"""

    async def test_refresh_token_success(self, client: AsyncClient, test_user: User):
        """Test successful token refresh"""
        # First login to get tokens
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "teste@example.com", "password": "Senha123!"},
        )
        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        # Now refresh
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_refresh_token_invalid(self, client: AsyncClient):
        """Test refresh with invalid token"""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.token.here"},
        )

        assert response.status_code == 401

    async def test_refresh_token_empty(self, client: AsyncClient):
        """Test refresh with empty token"""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": ""},
        )

        assert response.status_code in [401, 422]


@pytest.mark.asyncio
class TestLogout:
    """Test logout endpoint"""

    async def test_logout_success(self, client: AsyncClient, user_headers: dict):
        """Test successful logout"""
        response = await client.post(
            "/api/v1/auth/logout",
            headers=user_headers,
        )

        assert response.status_code == 200
        assert "sucesso" in response.json()["message"].lower()

    async def test_logout_without_token(self, client: AsyncClient):
        """Test logout without authentication"""
        response = await client.post("/api/v1/auth/logout")

        assert response.status_code in [401, 403]


@pytest.mark.asyncio
class TestGetCurrentUser:
    """Test get current user info endpoint"""

    async def test_get_me_success(self, client: AsyncClient, user_headers: dict, test_user: User):
        """Test getting current user info"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
        assert "role" in data
        assert "tenant_id" in data

    async def test_get_me_admin(self, client: AsyncClient, admin_headers: dict, test_admin: User):
        """Test getting admin user info"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == 4  # Admin role

    async def test_get_me_without_token(self, client: AsyncClient):
        """Test getting user info without authentication"""
        response = await client.get("/api/v1/auth/me")

        assert response.status_code in [401, 403]

    async def test_get_me_invalid_token(self, client: AsyncClient):
        """Test getting user info with invalid token"""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )

        assert response.status_code in [401, 403]


@pytest.mark.asyncio
class TestChangePassword:
    """Test change password endpoint"""

    async def test_change_password_success(self, client: AsyncClient, user_headers: dict, test_user: User):
        """Test successful password change"""
        response = await client.put(
            "/api/v1/auth/me/password",
            headers=user_headers,
            json={
                "current_password": "Senha123!",
                "new_password": "NovaSenha456!",
            },
        )

        assert response.status_code == 200
        assert "sucesso" in response.json()["message"].lower()

        # Verify can login with new password
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "teste@example.com", "password": "NovaSenha456!"},
        )
        assert login_response.status_code == 200

    async def test_change_password_wrong_current(self, client: AsyncClient, user_headers: dict):
        """Test password change with wrong current password"""
        response = await client.put(
            "/api/v1/auth/me/password",
            headers=user_headers,
            json={
                "current_password": "SenhaErrada!",
                "new_password": "NovaSenha456!",
            },
        )

        assert response.status_code == 400
        assert "incorreta" in response.json()["detail"].lower()

    async def test_change_password_too_short(self, client: AsyncClient, user_headers: dict):
        """Test password change with too short new password"""
        response = await client.put(
            "/api/v1/auth/me/password",
            headers=user_headers,
            json={
                "current_password": "Senha123!",
                "new_password": "123",
            },
        )

        assert response.status_code == 422

    async def test_change_password_without_auth(self, client: AsyncClient):
        """Test password change without authentication"""
        response = await client.put(
            "/api/v1/auth/me/password",
            json={
                "current_password": "Senha123!",
                "new_password": "NovaSenha456!",
            },
        )

        assert response.status_code in [401, 403]


@pytest.mark.asyncio
class TestMultiTenant:
    """Test multi-tenant endpoints"""

    async def test_get_my_tenants(self, client: AsyncClient, user_headers: dict, test_tenant: Tenant):
        """Test getting user's tenants"""
        response = await client.get(
            "/api/v1/auth/me/tenants",
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["tenant_id"] == test_tenant.id

    async def test_switch_tenant_own(self, client: AsyncClient, user_headers: dict, test_tenant: Tenant):
        """Test switching to own tenant"""
        response = await client.post(
            f"/api/v1/auth/me/tenants/switch/{test_tenant.id}",
            headers=user_headers,
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

    async def test_switch_tenant_unauthorized(self, client: AsyncClient, user_headers: dict):
        """Test switching to unauthorized tenant"""
        response = await client.post(
            "/api/v1/auth/me/tenants/switch/99999",
            headers=user_headers,
        )

        assert response.status_code == 403


@pytest.mark.asyncio
class TestRoleBasedAccess:
    """Test role-based access control"""

    async def test_user_roles_returned(self, client: AsyncClient, user_headers: dict):
        """Test that user role is returned correctly"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "role" in data
        assert "role_name" in data
        assert data["role"] == 1  # Morador

    async def test_admin_role(self, client: AsyncClient, admin_headers: dict):
        """Test admin role is returned correctly"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == 4  # Admin

    async def test_sindico_role(self, client: AsyncClient, sindico_headers: dict):
        """Test sindico role is returned correctly"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=sindico_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == 2  # Sindico

    async def test_porteiro_role(self, client: AsyncClient, porteiro_headers: dict):
        """Test porteiro role is returned correctly"""
        response = await client.get(
            "/api/v1/auth/me",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == 3  # Porteiro
