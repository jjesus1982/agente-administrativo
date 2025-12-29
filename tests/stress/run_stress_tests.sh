#!/bin/bash

# ============================================================================
# Script de Teste de Stress - Módulo Portaria
# Conecta Plus API
# ============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
API_URL="${API_URL:-http://localhost:8000}"
TENANT_ID="${TENANT_ID:-1}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}     TESTE DE STRESS - CONECTA PLUS (Módulo Portaria)       ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "API URL: ${GREEN}${API_URL}${NC}"
echo -e "Tenant:  ${GREEN}${TENANT_ID}${NC}"
echo ""

# Função para verificar se o servidor está rodando
check_server() {
    echo -e "${YELLOW}Verificando se o servidor está rodando...${NC}"
    if curl -s "${API_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Servidor está online${NC}"
        return 0
    else
        echo -e "${RED}✗ Servidor não está respondendo em ${API_URL}${NC}"
        echo -e "${YELLOW}Inicie o servidor com: uvicorn app.main:app --reload${NC}"
        return 1
    fi
}

# Função para rodar testes com Locust
run_locust() {
    echo -e "\n${BLUE}=== LOCUST ===${NC}"

    if ! command -v locust &> /dev/null; then
        echo -e "${YELLOW}Instalando Locust...${NC}"
        pip install locust
    fi

    echo -e "${GREEN}Iniciando Locust Web UI...${NC}"
    echo -e "Acesse: ${BLUE}http://localhost:8089${NC}"
    echo ""
    echo "Configurações sugeridas:"
    echo "  - Number of users: 50"
    echo "  - Spawn rate: 5"
    echo "  - Host: ${API_URL}"
    echo ""

    locust -f "${SCRIPT_DIR}/locustfile.py" --host="${API_URL}"
}

# Função para rodar testes com k6
run_k6() {
    echo -e "\n${BLUE}=== K6 ===${NC}"

    if ! command -v k6 &> /dev/null; then
        echo -e "${RED}k6 não está instalado.${NC}"
        echo -e "${YELLOW}Instale com:${NC}"
        echo "  Ubuntu/Debian: sudo snap install k6"
        echo "  macOS: brew install k6"
        echo "  Outros: https://k6.io/docs/getting-started/installation"
        return 1
    fi

    echo -e "${GREEN}Executando teste k6...${NC}"
    echo ""

    API_URL="${API_URL}/api/v1" TENANT_ID="${TENANT_ID}" k6 run "${SCRIPT_DIR}/k6_portaria.js"
}

# Função para rodar teste rápido
run_quick_test() {
    echo -e "\n${BLUE}=== TESTE RÁPIDO (curl) ===${NC}"

    echo -e "\n${YELLOW}1. Health Check${NC}"
    curl -s "${API_URL}/health" | jq . 2>/dev/null || curl -s "${API_URL}/health"

    echo -e "\n${YELLOW}2. Login${NC}"
    TOKEN=$(curl -s -X POST "${API_URL}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"porteiro@example.com","password":"Porteiro123!"}' \
        | jq -r '.access_token' 2>/dev/null || echo "")

    if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
        echo -e "${RED}Falha no login. Usando token de teste.${NC}"
        TOKEN="test-token"
    else
        echo -e "${GREEN}✓ Login OK${NC}"
    fi

    echo -e "\n${YELLOW}3. Dashboard${NC}"
    time curl -s "${API_URL}/api/v1/portaria/dashboard?tenant_id=${TENANT_ID}" \
        -H "Authorization: Bearer ${TOKEN}" | head -c 200

    echo -e "\n\n${YELLOW}4. Visitas em Andamento${NC}"
    time curl -s "${API_URL}/api/v1/portaria/visitas/em-andamento?tenant_id=${TENANT_ID}" \
        -H "Authorization: Bearer ${TOKEN}" | head -c 200

    echo -e "\n\n${YELLOW}5. Garagem Ocupação${NC}"
    time curl -s "${API_URL}/api/v1/portaria/garagem/ocupacao?tenant_id=${TENANT_ID}" \
        -H "Authorization: Bearer ${TOKEN}" | head -c 200

    echo -e "\n\n${YELLOW}6. Parceiros (público)${NC}"
    time curl -s "${API_URL}/api/v1/portaria/integracoes/parceiros" | head -c 200

    echo -e "\n\n${GREEN}✓ Teste rápido concluído${NC}"
}

# Função para benchmark simples
run_benchmark() {
    echo -e "\n${BLUE}=== BENCHMARK (Apache Bench) ===${NC}"

    if ! command -v ab &> /dev/null; then
        echo -e "${RED}Apache Bench (ab) não está instalado.${NC}"
        echo -e "${YELLOW}Instale com: sudo apt install apache2-utils${NC}"
        return 1
    fi

    echo -e "${GREEN}Executando benchmark...${NC}"
    echo ""

    echo -e "${YELLOW}Endpoint: /portaria/integracoes/parceiros (público)${NC}"
    ab -n 1000 -c 50 "${API_URL}/api/v1/portaria/integracoes/parceiros"
}

# Menu principal
show_menu() {
    echo -e "\n${BLUE}Escolha o tipo de teste:${NC}"
    echo "  1) Teste Rápido (curl)"
    echo "  2) Locust (Web UI)"
    echo "  3) k6 (CLI)"
    echo "  4) Benchmark (Apache Bench)"
    echo "  5) Sair"
    echo ""
    read -p "Opção: " choice

    case $choice in
        1)
            run_quick_test
            ;;
        2)
            check_server && run_locust
            ;;
        3)
            check_server && run_k6
            ;;
        4)
            check_server && run_benchmark
            ;;
        5)
            echo -e "${GREEN}Até mais!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida${NC}"
            show_menu
            ;;
    esac

    show_menu
}

# Verificar argumentos
if [ "$1" == "quick" ]; then
    run_quick_test
elif [ "$1" == "locust" ]; then
    check_server && run_locust
elif [ "$1" == "k6" ]; then
    check_server && run_k6
elif [ "$1" == "benchmark" ]; then
    check_server && run_benchmark
else
    show_menu
fi
