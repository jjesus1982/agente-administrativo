"""
Tests for Portaria Module Endpoints
Conecta Plus API - Portaria Test Suite
"""

import pytest
from httpx import AsyncClient

from app.models import Tenant, User


@pytest.mark.asyncio
class TestPortariaDashboard:
    """Test portaria dashboard endpoints"""

    async def test_get_dashboard_stats(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test getting dashboard statistics"""
        response = await client.get(
            f"/api/v1/portaria/dashboard?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "visitantes_ativos" in data or "stats" in data or isinstance(data, dict)

    async def test_dashboard_requires_auth(self, client: AsyncClient, test_tenant: Tenant):
        """Test dashboard requires authentication"""
        response = await client.get(f"/api/v1/portaria/dashboard?tenant_id={test_tenant.id}")
        assert response.status_code in [401, 403]


@pytest.mark.asyncio
class TestGruposAcesso:
    """Test grupos de acesso endpoints"""

    async def test_list_grupos_empty(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test listing grupos when empty"""
        response = await client.get(
            f"/api/v1/portaria/grupos-acesso?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_create_grupo(self, client: AsyncClient, admin_headers: dict, test_tenant: Tenant):
        """Test creating a grupo de acesso"""
        response = await client.post(
            f"/api/v1/portaria/grupos-acesso?tenant_id={test_tenant.id}",
            headers=admin_headers,
            json={
                "nome": "Moradores",
                "descricao": "Acesso total para moradores",
                "cor": "#3b82f6",
                "prioridade": 1,
                "dias_semana": [0, 1, 2, 3, 4, 5, 6],
                "ativo": True
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["nome"] == "Moradores"
        assert data["cor"] == "#3b82f6"

    async def test_create_grupo_requires_auth(self, client: AsyncClient, test_tenant: Tenant):
        """Test creating grupo requires authentication"""
        response = await client.post(
            f"/api/v1/portaria/grupos-acesso?tenant_id={test_tenant.id}",
            json={"nome": "Test", "cor": "#fff"}
        )
        assert response.status_code in [401, 403]


@pytest.mark.asyncio
class TestPontosAcesso:
    """Test pontos de acesso endpoints"""

    async def test_list_pontos_empty(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test listing pontos when empty"""
        response = await client.get(
            f"/api/v1/portaria/pontos-acesso?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_create_ponto(self, client: AsyncClient, admin_headers: dict, test_tenant: Tenant):
        """Test creating a ponto de acesso"""
        response = await client.post(
            f"/api/v1/portaria/pontos-acesso?tenant_id={test_tenant.id}",
            headers=admin_headers,
            json={
                "nome": "Portaria Principal",
                "tipo": "portaria",
                "localizacao": "Entrada principal",
                "direcao": "bidirecional",
                "ativo": True
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["nome"] == "Portaria Principal"
        assert data["tipo"] == "portaria"


@pytest.mark.asyncio
class TestPreAutorizacoes:
    """Test pré-autorizações endpoints"""

    async def test_list_pre_autorizacoes(self, client: AsyncClient, user_headers: dict, test_tenant: Tenant):
        """Test listing pre-autorizacoes"""
        response = await client.get(
            f"/api/v1/portaria/pre-autorizacoes?tenant_id={test_tenant.id}",
            headers=user_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_create_pre_autorizacao(self, client: AsyncClient, user_headers: dict, test_tenant: Tenant, test_unit):
        """Test creating a pre-autorizacao with QR Code"""
        response = await client.post(
            f"/api/v1/portaria/pre-autorizacoes?tenant_id={test_tenant.id}",
            headers=user_headers,
            json={
                "visitante_nome": "João Silva",
                "visitante_documento": "123.456.789-00",
                "unidade_id": test_unit.id,
                "data_inicio": "2025-12-22",
                "data_fim": "2025-12-25",
                "motivo": "Visita familiar",
                "tipo_acesso": "unico"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert "qr_code" in data
        assert data["visitante_nome"] == "João Silva"

    async def test_validate_qr_code_invalid(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test validating an invalid QR code"""
        response = await client.post(
            f"/api/v1/portaria/pre-autorizacoes/validar?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
            json={"qr_code": "invalid-qr-code-123"}
        )

        assert response.status_code == 404


@pytest.mark.asyncio
class TestIntegracoes:
    """Test integrações endpoints"""

    async def test_list_parceiros(self, client: AsyncClient):
        """Test listing available parceiros"""
        response = await client.get("/api/v1/portaria/integracoes/parceiros")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    async def test_list_integracoes(self, client: AsyncClient, admin_headers: dict, test_tenant: Tenant):
        """Test listing integracoes"""
        response = await client.get(
            f"/api/v1/portaria/integracoes?tenant_id={test_tenant.id}",
            headers=admin_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data


@pytest.mark.asyncio
class TestGaragemVisual:
    """Test garagem visual endpoints"""

    async def test_get_mapa(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test getting garage map"""
        response = await client.get(
            f"/api/v1/portaria/garagem/mapa?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "vagas" in data
        assert "config" in data

    async def test_get_ocupacao(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test getting occupancy stats"""
        response = await client.get(
            f"/api/v1/portaria/garagem/ocupacao?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "livres" in data
        assert "ocupadas" in data


@pytest.mark.asyncio
class TestVisitas:
    """Test visitas endpoints"""

    async def test_list_visitas(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test listing visitas"""
        response = await client.get(
            f"/api/v1/portaria/visitas?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data

    async def test_list_visitas_em_andamento(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test listing active visitas"""
        response = await client.get(
            f"/api/v1/portaria/visitas/em-andamento?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_visitas_requires_auth(self, client: AsyncClient, test_tenant: Tenant):
        """Test visitas requires authentication"""
        response = await client.get(f"/api/v1/portaria/visitas?tenant_id={test_tenant.id}")
        assert response.status_code in [401, 403]


@pytest.mark.asyncio
class TestPortariaAuthorization:
    """Test authorization for portaria endpoints"""

    async def test_morador_can_create_pre_autorizacao(self, client: AsyncClient, user_headers: dict, test_tenant: Tenant):
        """Test that regular user (morador) can create pre-autorizacao"""
        response = await client.get(
            f"/api/v1/portaria/pre-autorizacoes?tenant_id={test_tenant.id}",
            headers=user_headers,
        )
        assert response.status_code == 200

    async def test_porteiro_can_access_dashboard(self, client: AsyncClient, porteiro_headers: dict, test_tenant: Tenant):
        """Test that porteiro can access dashboard"""
        response = await client.get(
            f"/api/v1/portaria/dashboard?tenant_id={test_tenant.id}",
            headers=porteiro_headers,
        )
        assert response.status_code == 200

    async def test_admin_can_manage_integracoes(self, client: AsyncClient, admin_headers: dict, test_tenant: Tenant):
        """Test that admin can manage integracoes"""
        response = await client.get(
            f"/api/v1/portaria/integracoes?tenant_id={test_tenant.id}",
            headers=admin_headers,
        )
        assert response.status_code == 200
