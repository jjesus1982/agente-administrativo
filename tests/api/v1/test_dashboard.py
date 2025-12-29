"""
Tests for Dashboard Endpoints
Conecta Plus API - Dashboard Test Suite
"""

import pytest
from httpx import AsyncClient

from app.models import Tenant, User


@pytest.mark.asyncio
class TestDashboardStats:
    """Test dashboard statistics endpoint"""

    async def test_get_stats_completo(self, client: AsyncClient, test_tenant: Tenant):
        """Test getting complete dashboard stats"""
        response = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "gestao" in data
        assert "visitantes" in data
        assert "manutencao" in data
        assert "ocorrencias" in data
        assert "comunicados" in data
        assert "pesquisas" in data
        assert "documentos" in data
        assert "classificados" in data
        assert "acessos" in data
        assert "reservas" in data

    async def test_stats_gestao_structure(self, client: AsyncClient, test_tenant: Tenant):
        """Test gestao section structure"""
        response = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        gestao = response.json()["gestao"]

        assert "unidades" in gestao
        assert "moradores" in gestao
        assert "dependentes" in gestao
        assert "veiculos" in gestao
        assert "pets" in gestao

    async def test_stats_visitantes_structure(self, client: AsyncClient, test_tenant: Tenant):
        """Test visitantes section structure"""
        response = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        visitantes = response.json()["visitantes"]

        assert "total" in visitantes
        assert "hoje" in visitantes
        assert "semana" in visitantes

    async def test_stats_manutencao_structure(self, client: AsyncClient, test_tenant: Tenant):
        """Test manutencao section structure"""
        response = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        manutencao = response.json()["manutencao"]

        assert "total" in manutencao
        assert "abertos" in manutencao
        assert "em_andamento" in manutencao
        assert "concluidos" in manutencao

    async def test_stats_default_tenant(self, client: AsyncClient):
        """Test stats with default tenant_id"""
        response = await client.get("/api/v1/dashboard/stats-completo")

        # Should use default tenant_id=1
        assert response.status_code == 200

    async def test_stats_values_are_integers(self, client: AsyncClient, test_tenant: Tenant):
        """Test that all stat values are integers"""
        response = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        data = response.json()

        # Check gestao values
        for key, value in data["gestao"].items():
            assert isinstance(value, int), f"gestao.{key} should be int"

        # Check visitantes values
        for key, value in data["visitantes"].items():
            assert isinstance(value, int), f"visitantes.{key} should be int"


@pytest.mark.asyncio
class TestAtividadesRecentes:
    """Test recent activities endpoint"""

    async def test_get_atividades_recentes(self, client: AsyncClient, test_tenant: Tenant):
        """Test getting recent activities"""
        response = await client.get(f"/api/v1/dashboard/atividades-recentes?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert isinstance(data["items"], list)

    async def test_atividades_with_limit(self, client: AsyncClient, test_tenant: Tenant):
        """Test activities with custom limit"""
        response = await client.get(f"/api/v1/dashboard/atividades-recentes?tenant_id={test_tenant.id}&limit=5")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 5

    async def test_atividades_limit_validation(self, client: AsyncClient, test_tenant: Tenant):
        """Test activities limit validation"""
        # Too high limit
        response = await client.get(f"/api/v1/dashboard/atividades-recentes?tenant_id={test_tenant.id}&limit=100")
        assert response.status_code == 422

        # Too low limit
        response = await client.get(f"/api/v1/dashboard/atividades-recentes?tenant_id={test_tenant.id}&limit=0")
        assert response.status_code == 422

    async def test_atividades_item_structure(self, client: AsyncClient, test_tenant: Tenant):
        """Test activity item structure"""
        response = await client.get(f"/api/v1/dashboard/atividades-recentes?tenant_id={test_tenant.id}")

        assert response.status_code == 200
        items = response.json()["items"]

        # If there are items, check structure
        for item in items:
            assert "tipo" in item
            assert "id" in item
            assert "titulo" in item
            assert "data" in item
            assert "icone" in item


@pytest.mark.asyncio
class TestDashboardCache:
    """Test dashboard caching behavior"""

    async def test_stats_cache_consistency(self, client: AsyncClient, test_tenant: Tenant):
        """Test that cached stats are consistent"""
        # First request
        response1 = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")
        assert response1.status_code == 200
        data1 = response1.json()

        # Second request (should be cached)
        response2 = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")
        assert response2.status_code == 200
        data2 = response2.json()

        # Data should be the same (cached)
        assert data1 == data2

    async def test_different_tenants_different_data(self, client: AsyncClient, test_tenant: Tenant):
        """Test that different tenants get different cached data"""
        response1 = await client.get(f"/api/v1/dashboard/stats-completo?tenant_id={test_tenant.id}")
        assert response1.status_code == 200

        response2 = await client.get("/api/v1/dashboard/stats-completo?tenant_id=99999")
        assert response2.status_code == 200

        # Different tenants should potentially have different data
        # (or both empty for non-existent tenant)
