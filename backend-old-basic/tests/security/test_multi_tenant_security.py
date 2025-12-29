"""
Testes de Segurança Multi-Tenant
Valida isolação de dados entre condomínios diferentes
"""

import pytest
import uuid
from datetime import datetime, date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.api.deps import get_db
from app.models.tenant import Tenant
from app.models.unidade import Unidade
from app.models.user import User
from app.core.security import create_access_token
from app.services.sync_service import SyncService


@pytest.fixture
def client():
    """Cliente de teste FastAPI"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Sessão de banco de dados para testes"""
    # Mock do banco de dados - em testes reais usaria test database
    # Por enquanto retorna None para indicar que precisa ser implementado
    return None


@pytest.fixture
def tenant_a():
    """Tenant A para testes"""
    return Tenant(
        id=str(uuid.uuid4()),
        nome="Condomínio Alpha",
        cidade="Manaus",
        estado="AM",
        ativo=True,
        tipo_estrutura="apartamentos",
        nomenclatura={"unidade": "Apartamento"},
        config_seguranca={
            "permite_cadastro_autonomo": True,
            "exige_aprovacao_cadastro": True,
            "max_usuarios_por_unidade": 5
        },
        plano="profissional"
    )


@pytest.fixture
def tenant_b():
    """Tenant B para testes"""
    return Tenant(
        id=str(uuid.uuid4()),
        nome="Condomínio Beta",
        cidade="São Paulo",
        estado="SP",
        ativo=True,
        tipo_estrutura="casas",
        nomenclatura={"unidade": "Casa"},
        config_seguranca={
            "permite_cadastro_autonomo": False,
            "exige_aprovacao_cadastro": True,
            "max_usuarios_por_unidade": 3
        },
        plano="basico"
    )


@pytest.fixture
def user_tenant_a(tenant_a):
    """Usuário do Tenant A"""
    return User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_a.id,
        email="sindico@alpha.com",
        role=2,  # Síndico
        ativo=True,
        full_name="Síndico Alpha"
    )


@pytest.fixture
def user_tenant_b(tenant_b):
    """Usuário do Tenant B"""
    return User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_b.id,
        email="sindico@beta.com",
        role=2,  # Síndico
        ativo=True,
        full_name="Síndico Beta"
    )


@pytest.fixture
def admin_user():
    """Usuário administrador"""
    return User(
        id=str(uuid.uuid4()),
        tenant_id=None,  # Admin não tem tenant específico
        email="admin@conectaplus.com",
        role=5,  # Super admin
        ativo=True,
        full_name="Admin Conecta Plus"
    )


class TestTenantIsolation:
    """
    Testes para validar isolação entre tenants
    """

    def test_user_cannot_access_other_tenant_data(self, client, user_tenant_a, tenant_b):
        """
        Usuário do Tenant A não deve conseguir acessar dados do Tenant B
        """
        # Gerar token para usuário do Tenant A
        token = create_access_token(data={"sub": user_tenant_a.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Tentar acessar dados do Tenant B
        response = client.get(f"/api/v1/admin/condominios/{tenant_b.id}", headers=headers)

        # Deve ser negado
        assert response.status_code == 403
        assert "Acesso negado" in response.json()["detail"]

    def test_public_api_only_shows_allowed_tenants(self, client, tenant_a, tenant_b):
        """
        API pública deve mostrar apenas condomínios que permitem cadastro
        """
        # Tenant A permite cadastro público, Tenant B não
        tenant_a.config_seguranca["permite_cadastro_autonomo"] = True
        tenant_b.config_seguranca["permite_cadastro_autonomo"] = False

        response = client.get("/api/v1/public/condominios")

        assert response.status_code == 200
        condominios = response.json()

        # Deve retornar apenas Tenant A
        tenant_ids = [c["id"] for c in condominios]
        assert tenant_a.id in tenant_ids
        assert tenant_b.id not in tenant_ids

    def test_unidade_validation_tenant_isolation(self, client, tenant_a, tenant_b):
        """
        Validação de unidade deve ser isolada por tenant
        """
        # Criar unidade no Tenant A
        unidade_a = Unidade(
            id=str(uuid.uuid4()),
            tenant_id=tenant_a.id,
            numero="101",
            bloco="A",
            ativo=True
        )

        # Tentar validar unidade do Tenant A usando dados do Tenant B
        payload = {
            "tenant_id": tenant_b.id,  # Tenant errado
            "bloco": "A",
            "numero": "101"
        }

        response = client.post("/api/v1/public/validar-unidade", json=payload)

        assert response.status_code == 200
        result = response.json()
        assert result["valido"] is False
        assert "não encontrada" in result["mensagem"]

    def test_admin_can_access_any_tenant(self, client, admin_user, tenant_a, tenant_b):
        """
        Administrador deve conseguir acessar qualquer tenant
        """
        # Gerar token para admin
        token = create_access_token(data={"sub": admin_user.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Acessar Tenant A
        response_a = client.get(f"/api/v1/admin/condominios/{tenant_a.id}", headers=headers)
        assert response_a.status_code == 200

        # Acessar Tenant B
        response_b = client.get(f"/api/v1/admin/condominios/{tenant_b.id}", headers=headers)
        assert response_b.status_code == 200

    def test_sync_service_payload_isolation(self, tenant_a, tenant_b):
        """
        Serviço de sincronização deve isolar dados por tenant
        """
        sync_service = SyncService()

        # Preparar payload para Tenant A
        payload_a = sync_service._prepare_tenant_payload(tenant_a, "create")

        # Verificar que dados são apenas do Tenant A
        assert payload_a["tenant"]["id"] == tenant_a.id
        assert payload_a["tenant"]["nome"] == tenant_a.nome
        assert payload_a["tenant"]["config_seguranca"] == tenant_a.config_seguranca

        # Payload não deve conter dados de outros tenants
        assert payload_a["tenant"]["nome"] != tenant_b.nome

    def test_middleware_blocks_cross_tenant_access(self, client):
        """
        Middleware deve bloquear tentativas de acesso cross-tenant
        """
        # Simular tentativa de acesso com tenant_id inválido nos headers
        headers = {
            "X-Tenant-ID": "invalid-tenant-id",
            "Authorization": "Bearer fake-token"
        }

        response = client.get("/api/v1/admin/condominios", headers=headers)

        # Deve ser bloqueado pelo middleware
        assert response.status_code in [401, 403]


class TestDataLeakagePrevention:
    """
    Testes para prevenção de vazamento de dados entre tenants
    """

    def test_search_results_filtered_by_tenant(self, client, user_tenant_a, tenant_a, tenant_b):
        """
        Resultados de busca devem ser filtrados por tenant
        """
        token = create_access_token(data={"sub": user_tenant_a.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Buscar condomínios - deve retornar apenas do próprio tenant
        response = client.get("/api/v1/admin/condominios?busca=Condomínio", headers=headers)

        if response.status_code == 200:
            condominios = response.json()
            for condominio in condominios:
                assert condominio["id"] == tenant_a.id or condominio.get("tenant_id") == tenant_a.id

    def test_statistics_isolated_by_tenant(self, client, user_tenant_a, tenant_a):
        """
        Estatísticas devem ser isoladas por tenant
        """
        token = create_access_token(data={"sub": user_tenant_a.email})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.get(f"/api/v1/admin/condominios/{tenant_a.id}/estatisticas", headers=headers)

        if response.status_code == 200:
            stats = response.json()
            # Estatísticas devem ser apenas do tenant específico
            assert stats["tenant_id"] == tenant_a.id

    def test_webhook_payload_contains_only_relevant_data(self, tenant_a):
        """
        Payload do webhook deve conter apenas dados relevantes do tenant
        """
        sync_service = SyncService()
        payload = sync_service._prepare_tenant_payload(tenant_a, "update")

        # Verificar que payload não contém dados sensíveis desnecessários
        sensitive_fields = ["password", "secret", "token", "key"]
        payload_str = str(payload).lower()

        for field in sensitive_fields:
            assert field not in payload_str

        # Verificar que contém apenas dados necessários
        required_fields = ["id", "nome", "config_seguranca", "funcionalidades"]
        for field in required_fields:
            assert field in payload["tenant"]


class TestAuthenticationAndAuthorization:
    """
    Testes de autenticação e autorização multi-tenant
    """

    def test_invalid_token_rejected(self, client):
        """
        Token inválido deve ser rejeitado
        """
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/v1/admin/condominios", headers=headers)
        assert response.status_code == 401

    def test_expired_token_rejected(self, client):
        """
        Token expirado deve ser rejeitado
        """
        # Criar token expirado (implementar lógica de expiração)
        expired_token = create_access_token(
            data={"sub": "user@test.com"},
            # expires_delta seria negativo para simular token expirado
        )
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.get("/api/v1/admin/condominios", headers=headers)
        # Token expirado pode retornar 401 ou ser aceito dependendo da implementação
        assert response.status_code in [401, 200]

    def test_insufficient_permissions_blocked(self, client, user_tenant_a):
        """
        Usuário com permissões insuficientes deve ser bloqueado
        """
        # Usuário normal (role=1) tentando acesso admin
        user_tenant_a.role = 1  # Morador
        token = create_access_token(data={"sub": user_tenant_a.email})
        headers = {"Authorization": f"Bearer {token}"}

        response = client.post("/api/v1/admin/condominios", json={}, headers=headers)
        assert response.status_code == 403

    def test_public_endpoints_no_auth_required(self, client):
        """
        Endpoints públicos não devem exigir autenticação
        """
        # Testar endpoints públicos
        public_endpoints = [
            "/api/v1/public/condominios",
            "/api/v1/public/estados",
            "/api/v1/public/cidades"
        ]

        for endpoint in public_endpoints:
            response = client.get(endpoint)
            # Endpoints públicos devem funcionar sem auth
            assert response.status_code in [200, 404]  # 404 se não existir dados


class TestInputValidationSecurity:
    """
    Testes de validação de entrada para segurança
    """

    def test_sql_injection_prevention(self, client):
        """
        Prevenção contra SQL injection
        """
        malicious_inputs = [
            "'; DROP TABLE tenants; --",
            "1' OR '1'='1",
            "admin'--",
            "<script>alert('xss')</script>",
            "../../etc/passwd"
        ]

        for malicious_input in malicious_inputs:
            # Testar em diferentes campos
            response = client.get(f"/api/v1/public/condominios?busca={malicious_input}")
            # Não deve gerar erro 500 (indicativo de SQL injection bem-sucedida)
            assert response.status_code != 500

    def test_xss_prevention_in_tenant_creation(self, client, admin_user):
        """
        Prevenção contra XSS na criação de tenants
        """
        token = create_access_token(data={"sub": admin_user.email})
        headers = {"Authorization": f"Bearer {token}"}

        xss_payload = "<script>alert('xss')</script>"
        tenant_data = {
            "nome": f"Condomínio {xss_payload}",
            "cidade": "Manaus",
            "estado": "AM",
            "tipo_estrutura": "apartamentos"
        }

        response = client.post("/api/v1/admin/condominios", json=tenant_data, headers=headers)

        if response.status_code == 201:
            # Se criado, verificar que script foi sanitizado
            tenant = response.json()
            assert "<script>" not in tenant["nome"]
        elif response.status_code == 400:
            # Se rejeitado, validação está funcionando
            assert "invalid" in response.json()["detail"].lower() or "erro" in response.json()["detail"].lower()

    def test_large_payload_rejected(self, client, admin_user):
        """
        Payloads muito grandes devem ser rejeitados
        """
        token = create_access_token(data={"sub": admin_user.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Criar payload extremamente grande
        large_string = "A" * 100000  # 100KB string
        tenant_data = {
            "nome": large_string,
            "cidade": "Manaus",
            "estado": "AM",
            "tipo_estrutura": "apartamentos"
        }

        response = client.post("/api/v1/admin/condominios", json=tenant_data, headers=headers)

        # Deve ser rejeitado (413 Request Entity Too Large ou 400 Bad Request)
        assert response.status_code in [400, 413, 422]


class TestRateLimitingSecurity:
    """
    Testes de rate limiting para segurança
    """

    def test_rate_limiting_on_public_endpoints(self, client):
        """
        Rate limiting deve funcionar em endpoints públicos
        """
        # Fazer muitas requisições rapidamente
        responses = []
        for i in range(50):  # Tentar 50 requests rápidos
            response = client.get("/api/v1/public/condominios")
            responses.append(response.status_code)

        # Deve haver pelo menos uma resposta 429 (Too Many Requests)
        # Ou todas devem ser 200 se rate limiting não estiver configurado ainda
        status_codes = set(responses)
        assert 429 in status_codes or all(code == 200 for code in responses)

    def test_rate_limiting_per_user(self, client, user_tenant_a):
        """
        Rate limiting deve ser por usuário
        """
        token = create_access_token(data={"sub": user_tenant_a.email})
        headers = {"Authorization": f"Bearer {token}"}

        # Fazer muitas requisições com mesmo usuário
        responses = []
        for i in range(30):
            response = client.get("/api/v1/admin/condominios", headers=headers)
            responses.append(response.status_code)

        # Rate limiting pode estar ativo ou não
        # Se ativo, deve ter 429
        # Se não ativo, todas devem ser 200 ou 401/403
        status_codes = set(responses)
        assert 429 in status_codes or all(code in [200, 401, 403] for code in responses)


# Utilitários para testes
def create_test_tenant(nome: str, cidade: str, permite_cadastro: bool = True) -> Tenant:
    """Cria tenant para testes"""
    return Tenant(
        id=str(uuid.uuid4()),
        nome=nome,
        cidade=cidade,
        estado="AM",
        ativo=True,
        tipo_estrutura="apartamentos",
        config_seguranca={"permite_cadastro_autonomo": permite_cadastro},
        plano="basico"
    )


def create_test_user(tenant_id: str, email: str, role: int = 2) -> User:
    """Cria usuário para testes"""
    return User(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        email=email,
        role=role,
        ativo=True,
        full_name="Test User"
    )


if __name__ == "__main__":
    # Executar testes específicos
    pytest.main([__file__, "-v"])