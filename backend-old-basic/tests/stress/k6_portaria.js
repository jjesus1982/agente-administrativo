/**
 * Teste de Stress - Módulo Portaria
 * Conecta Plus API
 *
 * Uso:
 *   brew install k6  # ou snap install k6
 *   k6 run tests/stress/k6_portaria.js
 *
 * Com mais usuários:
 *   k6 run --vus 50 --duration 5m tests/stress/k6_portaria.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('errors');
const dashboardDuration = new Trend('dashboard_duration');
const visitasDuration = new Trend('visitas_duration');
const garagemDuration = new Trend('garagem_duration');

// Configuração do teste
export const options = {
    // Cenários de carga
    scenarios: {
        // Carga constante - simula uso normal
        constant_load: {
            executor: 'constant-vus',
            vus: 10,
            duration: '2m',
        },
        // Rampa de subida - simula pico de acesso
        ramp_up: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },  // sobe para 20
                { duration: '1m', target: 50 },   // sobe para 50
                { duration: '30s', target: 100 }, // pico de 100
                { duration: '1m', target: 50 },   // desce para 50
                { duration: '30s', target: 0 },   // finaliza
            ],
            startTime: '2m', // começa após constant_load
        },
        // Spike test - simula entrada em massa (ex: início de turno)
        spike: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 200 }, // spike súbito
                { duration: '30s', target: 200 }, // mantém
                { duration: '10s', target: 0 },   // desce rápido
            ],
            startTime: '5m30s',
        },
    },
    // Thresholds - critérios de sucesso
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% das requests < 2s
        http_req_failed: ['rate<0.05'],    // menos de 5% de falhas
        errors: ['rate<0.1'],              // menos de 10% de erros
        dashboard_duration: ['p(95)<1000'], // dashboard < 1s
        visitas_duration: ['p(95)<1500'],   // visitas < 1.5s
        garagem_duration: ['p(95)<1000'],   // garagem < 1s
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const TENANT_ID = __ENV.TENANT_ID || '1';

// Função para fazer login
function login(email, password) {
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: email,
        password: password,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 200) {
        return JSON.parse(res.body).access_token;
    }
    return 'test-token';
}

// Setup - executa uma vez antes de todos os VUs
export function setup() {
    console.log('='.repeat(60));
    console.log('TESTE DE STRESS - MÓDULO PORTARIA (k6)');
    console.log('='.repeat(60));
    console.log(`Target: ${BASE_URL}`);
    console.log(`Tenant: ${TENANT_ID}`);
    console.log('='.repeat(60));

    // Login para obter token
    const token = login('porteiro@example.com', 'Porteiro123!');
    return { token };
}

// Função principal - executada por cada VU
export default function (data) {
    const headers = {
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json',
    };

    // =========================================================================
    // DASHBOARD - Alta prioridade
    // =========================================================================
    group('Dashboard', function () {
        const start = Date.now();

        const dashboardRes = http.get(
            `${BASE_URL}/portaria/dashboard?tenant_id=${TENANT_ID}`,
            { headers, tags: { name: 'dashboard' } }
        );

        dashboardDuration.add(Date.now() - start);

        const dashboardOk = check(dashboardRes, {
            'dashboard status 200': (r) => r.status === 200,
            'dashboard has stats': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return body.stats !== undefined;
                } catch {
                    return false;
                }
            },
        });

        errorRate.add(!dashboardOk);

        // Turno
        const turnoRes = http.get(
            `${BASE_URL}/portaria/turno?tenant_id=${TENANT_ID}`,
            { headers, tags: { name: 'turno' } }
        );

        check(turnoRes, {
            'turno status 200': (r) => r.status === 200,
        });
    });

    sleep(1);

    // =========================================================================
    // VISITAS
    // =========================================================================
    group('Visitas', function () {
        const start = Date.now();

        // Lista visitas em andamento
        const visitasRes = http.get(
            `${BASE_URL}/portaria/visitas/em-andamento?tenant_id=${TENANT_ID}`,
            { headers, tags: { name: 'visitas_em_andamento' } }
        );

        visitasDuration.add(Date.now() - start);

        const visitasOk = check(visitasRes, {
            'visitas status 200': (r) => r.status === 200,
        });

        errorRate.add(!visitasOk);

        // Lista todas as visitas
        http.get(
            `${BASE_URL}/portaria/visitas?tenant_id=${TENANT_ID}&limit=50`,
            { headers, tags: { name: 'visitas_lista' } }
        );

        // 20% de chance de criar uma visita
        if (Math.random() < 0.2) {
            const novaVisita = {
                visitante_nome: `Visitante K6 ${Math.floor(Math.random() * 10000)}`,
                visitante_documento: `${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}.${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 90) + 10}`,
                unit_id: Math.floor(Math.random() * 100) + 1,
                tipo: ['visita', 'entrega', 'prestador'][Math.floor(Math.random() * 3)],
                observacoes: 'Criado via k6 stress test',
            };

            http.post(
                `${BASE_URL}/portaria/visitas?tenant_id=${TENANT_ID}`,
                JSON.stringify(novaVisita),
                { headers, tags: { name: 'visitas_criar' } }
            );
        }
    });

    sleep(1);

    // =========================================================================
    // GARAGEM
    // =========================================================================
    group('Garagem', function () {
        const start = Date.now();

        const andares = ['Subsolo 1', 'Subsolo 2', 'Térreo'];
        const andar = andares[Math.floor(Math.random() * andares.length)];

        const mapaRes = http.get(
            `${BASE_URL}/portaria/garagem/mapa?tenant_id=${TENANT_ID}&andar=${encodeURIComponent(andar)}`,
            { headers, tags: { name: 'garagem_mapa' } }
        );

        garagemDuration.add(Date.now() - start);

        check(mapaRes, {
            'garagem mapa status 200': (r) => r.status === 200,
        });

        // Ocupação
        http.get(
            `${BASE_URL}/portaria/garagem/ocupacao?tenant_id=${TENANT_ID}`,
            { headers, tags: { name: 'garagem_ocupacao' } }
        );
    });

    sleep(1);

    // =========================================================================
    // PONTOS DE ACESSO
    // =========================================================================
    group('Pontos de Acesso', function () {
        http.get(
            `${BASE_URL}/portaria/pontos-acesso/status?tenant_id=${TENANT_ID}`,
            { headers, tags: { name: 'pontos_status' } }
        );

        http.get(
            `${BASE_URL}/portaria/pontos-acesso?tenant_id=${TENANT_ID}`,
            { headers, tags: { name: 'pontos_lista' } }
        );
    });

    sleep(1);

    // =========================================================================
    // PRÉ-AUTORIZAÇÕES
    // =========================================================================
    group('Pre-Autorizacoes', function () {
        http.get(
            `${BASE_URL}/portaria/pre-autorizacoes?tenant_id=${TENANT_ID}&status=ativa`,
            { headers, tags: { name: 'pre_auth_lista' } }
        );

        // 10% de chance de validar QR
        if (Math.random() < 0.1) {
            http.post(
                `${BASE_URL}/portaria/pre-autorizacoes/validar?tenant_id=${TENANT_ID}`,
                JSON.stringify({ qr_code: `QR-${Math.floor(Math.random() * 900000) + 100000}` }),
                { headers, tags: { name: 'pre_auth_validar' } }
            );
        }
    });

    sleep(1);

    // =========================================================================
    // CONFIGURAÇÕES (menos frequente)
    // =========================================================================
    if (Math.random() < 0.3) {
        group('Configuracoes', function () {
            http.get(
                `${BASE_URL}/portaria/grupos-acesso?tenant_id=${TENANT_ID}`,
                { headers, tags: { name: 'grupos_lista' } }
            );

            http.get(
                `${BASE_URL}/portaria/integracoes?tenant_id=${TENANT_ID}`,
                { headers, tags: { name: 'integracoes_lista' } }
            );

            // Parceiros é público
            http.get(
                `${BASE_URL}/portaria/integracoes/parceiros`,
                { tags: { name: 'parceiros_lista' } }
            );
        });
    }

    sleep(2);
}

// Teardown - executa uma vez após todos os VUs
export function teardown(data) {
    console.log('='.repeat(60));
    console.log('TESTE FINALIZADO');
    console.log('='.repeat(60));
}
