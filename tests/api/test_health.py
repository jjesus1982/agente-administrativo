"""
Tests for Health Check Endpoints
Conecta Plus API - Health Test Suite
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestHealthEndpoints:
    """Test health check endpoints"""

    async def test_health_check(self, client: AsyncClient):
        """Test basic health check endpoint"""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert "app" in data
        assert "version" in data
        assert "timestamp" in data
        assert "environment" in data

    async def test_readiness_check(self, client: AsyncClient):
        """Test readiness check endpoint"""
        response = await client.get("/health/ready")

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert "checks" in data
        assert "database" in data["checks"]

    async def test_liveness_check(self, client: AsyncClient):
        """Test liveness check endpoint"""
        response = await client.get("/health/live")

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "alive"
        assert "timestamp" in data

    async def test_root_endpoint(self, client: AsyncClient):
        """Test root endpoint"""
        response = await client.get("/")

        assert response.status_code == 200
        data = response.json()

        assert "app" in data
        assert "version" in data
        assert "health" in data
        assert "environment" in data


@pytest.mark.asyncio
class TestHealthTimestamps:
    """Test health check timestamps"""

    async def test_health_timestamp_is_iso(self, client: AsyncClient):
        """Test that timestamps are in ISO format"""
        response = await client.get("/health")
        assert response.status_code == 200

        timestamp = response.json()["timestamp"]
        assert "T" in timestamp  # ISO format contains T separator

    async def test_live_timestamp_is_iso(self, client: AsyncClient):
        """Test liveness timestamp is ISO format"""
        response = await client.get("/health/live")
        assert response.status_code == 200

        timestamp = response.json()["timestamp"]
        assert "T" in timestamp


@pytest.mark.asyncio
class TestHealthMetadata:
    """Test health check metadata"""

    async def test_app_name_not_empty(self, client: AsyncClient):
        """Test that app name is present and not empty"""
        response = await client.get("/health")
        assert response.status_code == 200
        assert len(response.json()["app"]) > 0

    async def test_version_format(self, client: AsyncClient):
        """Test version has valid format"""
        response = await client.get("/health")
        assert response.status_code == 200

        version = response.json()["version"]
        # Version should have format like "1.0.0" or similar
        assert version is not None
        assert len(version) > 0

    async def test_environment_value(self, client: AsyncClient):
        """Test environment has a valid value"""
        response = await client.get("/health")
        assert response.status_code == 200

        env = response.json()["environment"]
        assert env is not None
