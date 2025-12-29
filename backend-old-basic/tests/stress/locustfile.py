"""
Teste de Stress - Módulo Portaria
Conecta Plus API

Uso:
    pip install locust
    locust -f tests/stress/locustfile.py --host=http://localhost:8000

Dashboard: http://localhost:8089
"""

import random
import json
from locust import HttpUser, task, between, events
from datetime import date, timedelta


class PortariaUser(HttpUser):
    """Simula um usuário do sistema de portaria (porteiro)"""

    wait_time = between(1, 3)  # Espera 1-3 segundos entre requests

    def on_start(self):
        """Login ao iniciar"""
        self.tenant_id = 1
        self.token = self.login()
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def login(self):
        """Faz login e retorna o token"""
        response = self.client.post("/api/v1/auth/login", json={
            "email": "porteiro@example.com",
            "password": "Porteiro123!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return "test-token"

    # =========================================================================
    # DASHBOARD - Alta frequência (porteiro olha constantemente)
    # =========================================================================
    @task(10)
    def get_dashboard(self):
        """Carrega o dashboard principal"""
        self.client.get(
            f"/api/v1/portaria/dashboard?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/dashboard"
        )

    @task(5)
    def get_turno(self):
        """Verifica informações do turno"""
        self.client.get(
            f"/api/v1/portaria/turno?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/turno"
        )

    # =========================================================================
    # VISITAS - Frequência média-alta
    # =========================================================================
    @task(8)
    def list_visitas_em_andamento(self):
        """Lista visitas em andamento"""
        self.client.get(
            f"/api/v1/portaria/visitas/em-andamento?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/visitas/em-andamento"
        )

    @task(4)
    def list_visitas(self):
        """Lista todas as visitas"""
        self.client.get(
            f"/api/v1/portaria/visitas?tenant_id={self.tenant_id}&limit=50",
            headers=self.headers,
            name="/portaria/visitas"
        )

    @task(2)
    def create_visita(self):
        """Registra uma nova visita"""
        self.client.post(
            f"/api/v1/portaria/visitas?tenant_id={self.tenant_id}",
            headers=self.headers,
            json={
                "visitante_nome": f"Visitante Teste {random.randint(1, 1000)}",
                "visitante_documento": f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}",
                "unit_id": random.randint(1, 100),
                "tipo": random.choice(["visita", "entrega", "prestador"]),
                "observacoes": "Teste de stress"
            },
            name="/portaria/visitas [POST]"
        )

    # =========================================================================
    # GARAGEM - Frequência média
    # =========================================================================
    @task(6)
    def get_garagem_mapa(self):
        """Carrega mapa da garagem"""
        andar = random.choice(["Subsolo 1", "Subsolo 2", "Térreo"])
        self.client.get(
            f"/api/v1/portaria/garagem/mapa?tenant_id={self.tenant_id}&andar={andar}",
            headers=self.headers,
            name="/portaria/garagem/mapa"
        )

    @task(4)
    def get_garagem_ocupacao(self):
        """Verifica ocupação da garagem"""
        self.client.get(
            f"/api/v1/portaria/garagem/ocupacao?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/garagem/ocupacao"
        )

    # =========================================================================
    # PONTOS DE ACESSO - Frequência média
    # =========================================================================
    @task(5)
    def list_pontos_status(self):
        """Lista status dos pontos de acesso"""
        self.client.get(
            f"/api/v1/portaria/pontos-acesso/status?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/pontos-acesso/status"
        )

    @task(3)
    def list_pontos(self):
        """Lista pontos de acesso"""
        self.client.get(
            f"/api/v1/portaria/pontos-acesso?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/pontos-acesso"
        )

    # =========================================================================
    # PRÉ-AUTORIZAÇÕES - Frequência baixa-média
    # =========================================================================
    @task(3)
    def list_pre_autorizacoes(self):
        """Lista pré-autorizações"""
        self.client.get(
            f"/api/v1/portaria/pre-autorizacoes?tenant_id={self.tenant_id}&status=ativa",
            headers=self.headers,
            name="/portaria/pre-autorizacoes"
        )

    @task(1)
    def validar_qr_code(self):
        """Valida um QR Code (simulado)"""
        self.client.post(
            f"/api/v1/portaria/pre-autorizacoes/validar?tenant_id={self.tenant_id}",
            headers=self.headers,
            json={"qr_code": f"QR-{random.randint(100000, 999999)}"},
            name="/portaria/pre-autorizacoes/validar"
        )

    # =========================================================================
    # GRUPOS E INTEGRAÇÕES - Frequência baixa
    # =========================================================================
    @task(2)
    def list_grupos_acesso(self):
        """Lista grupos de acesso"""
        self.client.get(
            f"/api/v1/portaria/grupos-acesso?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/grupos-acesso"
        )

    @task(1)
    def list_integracoes(self):
        """Lista integrações"""
        self.client.get(
            f"/api/v1/portaria/integracoes?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/integracoes"
        )

    @task(1)
    def list_parceiros(self):
        """Lista parceiros disponíveis (endpoint público)"""
        self.client.get(
            "/api/v1/portaria/integracoes/parceiros",
            name="/portaria/integracoes/parceiros"
        )


class MoradorUser(HttpUser):
    """Simula um morador usando o app"""

    wait_time = between(3, 10)  # Moradores são menos frequentes
    weight = 3  # 3x menos moradores que porteiros

    def on_start(self):
        """Login ao iniciar"""
        self.tenant_id = 1
        self.token = self.login()
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def login(self):
        """Faz login e retorna o token"""
        response = self.client.post("/api/v1/auth/login", json={
            "email": "morador@example.com",
            "password": "Morador123!"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        return "test-token"

    @task(5)
    def list_minhas_pre_autorizacoes(self):
        """Lista minhas pré-autorizações"""
        self.client.get(
            f"/api/v1/portaria/pre-autorizacoes?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/pre-autorizacoes [morador]"
        )

    @task(2)
    def criar_pre_autorizacao(self):
        """Cria uma pré-autorização"""
        data_inicio = date.today()
        data_fim = data_inicio + timedelta(days=random.randint(1, 7))

        self.client.post(
            f"/api/v1/portaria/pre-autorizacoes?tenant_id={self.tenant_id}",
            headers=self.headers,
            json={
                "unit_id": random.randint(1, 100),
                "visitante_nome": f"Visitante {random.randint(1, 1000)}",
                "visitante_documento": f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}",
                "data_inicio": str(data_inicio),
                "data_fim": str(data_fim),
                "tipo": "unica",
                "observacoes": "Criado via teste de stress"
            },
            name="/portaria/pre-autorizacoes [POST morador]"
        )

    @task(3)
    def ver_garagem(self):
        """Visualiza a garagem"""
        self.client.get(
            f"/api/v1/portaria/garagem/ocupacao?tenant_id={self.tenant_id}",
            headers=self.headers,
            name="/portaria/garagem/ocupacao [morador]"
        )


# Event handlers para estatísticas
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        print(f"Request failed: {name} - {exception}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("=" * 60)
    print("TESTE DE STRESS - MÓDULO PORTARIA")
    print("=" * 60)
    print(f"Target: {environment.host}")
    print("Cenários: PortariaUser (porteiro), MoradorUser (morador)")
    print("=" * 60)
