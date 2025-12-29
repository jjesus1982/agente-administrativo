#!/bin/bash
# Script para executar todos os checks do CI/CD localmente
# Útil para validar código antes de fazer push

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Verificar se estamos na raiz do projeto
if [ ! -d "backend" ] || [ ! -d "app" ]; then
    print_error "Execute este script da raiz do projeto!"
    exit 1
fi

FAILED=0

# =============================================================================
# BACKEND CHECKS
# =============================================================================
print_header "BACKEND CHECKS"

cd backend

# Check 1: Flake8
print_info "Executando Flake8..."
if flake8 app tests --count --select=E9,F63,F7,F82 --show-source --statistics; then
    print_success "Flake8 passou"
else
    print_error "Flake8 falhou"
    FAILED=1
fi

# Check 2: Black
print_info "Verificando formatação com Black..."
if black --check app tests; then
    print_success "Black passou"
else
    print_error "Black falhou - Execute: black app tests"
    FAILED=1
fi

# Check 3: isort
print_info "Verificando imports com isort..."
if isort --check-only app tests; then
    print_success "isort passou"
else
    print_error "isort falhou - Execute: isort app tests"
    FAILED=1
fi

# Check 4: mypy
print_info "Verificando tipos com mypy..."
if mypy app --ignore-missing-imports --no-strict-optional; then
    print_success "mypy passou"
else
    print_error "mypy falhou"
    FAILED=1
fi

# Check 5: pytest
print_info "Executando testes do backend..."
if pytest tests/ --cov=app --cov-report=term-missing -v; then
    print_success "pytest passou"
else
    print_error "pytest falhou"
    FAILED=1
fi

cd ..

# =============================================================================
# FRONTEND CHECKS
# =============================================================================
print_header "FRONTEND CHECKS"

cd app

# Check 1: ESLint
print_info "Executando ESLint..."
if npm run lint; then
    print_success "ESLint passou"
else
    print_error "ESLint falhou - Execute: npm run lint -- --fix"
    FAILED=1
fi

# Check 2: TypeScript
print_info "Verificando tipos com TypeScript..."
if npm run type-check; then
    print_success "TypeScript passou"
else
    print_error "TypeScript falhou"
    FAILED=1
fi

# Check 3: Jest
print_info "Executando testes do frontend..."
if npm run test:coverage; then
    print_success "Jest passou"
else
    print_error "Jest falhou"
    FAILED=1
fi

# Check 4: Build
print_info "Testando build do Next.js..."
if npm run build; then
    print_success "Build passou"
else
    print_error "Build falhou"
    FAILED=1
fi

cd ..

# =============================================================================
# RESULTADO FINAL
# =============================================================================
print_header "RESULTADO FINAL"

if [ $FAILED -eq 0 ]; then
    print_success "Todos os checks passaram! ✓"
    echo -e "\n${GREEN}Você pode fazer commit e push com segurança!${NC}\n"
    exit 0
else
    print_error "Alguns checks falharam! ✗"
    echo -e "\n${RED}Corrija os erros antes de fazer commit/push.${NC}\n"
    exit 1
fi
