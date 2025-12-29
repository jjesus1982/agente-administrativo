#!/bin/bash
# Script para verificar se o CI/CD está configurado corretamente

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

ISSUES=0

print_header "Verificando Configuração do CI/CD"

# =============================================================================
# Verificar arquivos essenciais
# =============================================================================
echo -e "${YELLOW}Verificando arquivos...${NC}\n"

# GitHub Actions
if [ -f ".github/workflows/ci.yml" ]; then
    print_check 0 ".github/workflows/ci.yml existe"
else
    print_check 1 ".github/workflows/ci.yml NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

# Backend configs
if [ -f "backend/.flake8" ]; then
    print_check 0 "backend/.flake8 existe"
else
    print_check 1 "backend/.flake8 NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "backend/pyproject.toml" ]; then
    print_check 0 "backend/pyproject.toml existe"
else
    print_check 1 "backend/pyproject.toml NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "backend/requirements.txt" ]; then
    print_check 0 "backend/requirements.txt existe"
else
    print_check 1 "backend/requirements.txt NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "backend/pytest.ini" ]; then
    print_check 0 "backend/pytest.ini existe"
else
    print_check 1 "backend/pytest.ini NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

# Frontend configs
if [ -f "app/package.json" ]; then
    print_check 0 "app/package.json existe"
else
    print_check 1 "app/package.json NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "app/eslint.config.mjs" ]; then
    print_check 0 "app/eslint.config.mjs existe"
else
    print_check 1 "app/eslint.config.mjs NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "app/tsconfig.json" ]; then
    print_check 0 "app/tsconfig.json existe"
else
    print_check 1 "app/tsconfig.json NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

if [ -f "app/jest.config.js" ]; then
    print_check 0 "app/jest.config.js existe"
else
    print_check 1 "app/jest.config.js NÃO ENCONTRADO (warning)"
fi

# Root configs
if [ -f ".gitignore" ]; then
    print_check 0 ".gitignore existe"
else
    print_check 1 ".gitignore NÃO ENCONTRADO"
    ISSUES=$((ISSUES + 1))
fi

# =============================================================================
# Verificar dependências do backend
# =============================================================================
echo -e "\n${YELLOW}Verificando dependências do backend...${NC}\n"

cd backend

required_packages=("pytest" "pytest-cov" "black" "isort" "flake8" "mypy")
for package in "${required_packages[@]}"; do
    if grep -q "^${package}[>=<]" requirements.txt; then
        print_check 0 "$package está em requirements.txt"
    else
        print_check 1 "$package NÃO está em requirements.txt"
        ISSUES=$((ISSUES + 1))
    fi
done

cd ..

# =============================================================================
# Verificar scripts do frontend
# =============================================================================
echo -e "\n${YELLOW}Verificando scripts do frontend...${NC}\n"

cd app

required_scripts=("lint" "type-check" "test" "build")
for script in "${required_scripts[@]}"; do
    if grep -q "\"${script}\"" package.json; then
        print_check 0 "Script '$script' existe em package.json"
    else
        print_check 1 "Script '$script' NÃO existe em package.json"
        ISSUES=$((ISSUES + 1))
    fi
done

cd ..

# =============================================================================
# Verificar estrutura de diretórios
# =============================================================================
echo -e "\n${YELLOW}Verificando estrutura de diretórios...${NC}\n"

required_dirs=("backend/app" "backend/tests" "app/src")
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        print_check 0 "Diretório $dir existe"
    else
        print_check 1 "Diretório $dir NÃO ENCONTRADO"
        ISSUES=$((ISSUES + 1))
    fi
done

# =============================================================================
# Verificar sintaxe do workflow YAML
# =============================================================================
echo -e "\n${YELLOW}Verificando sintaxe do workflow YAML...${NC}\n"

if command -v yamllint &> /dev/null; then
    if yamllint .github/workflows/ci.yml 2>/dev/null; then
        print_check 0 "Sintaxe YAML válida"
    else
        print_check 1 "Sintaxe YAML pode ter problemas (não crítico)"
    fi
else
    echo -e "${YELLOW}⚠${NC} yamllint não instalado - pulando verificação de sintaxe YAML"
fi

# =============================================================================
# Verificar Python e Node.js
# =============================================================================
echo -e "\n${YELLOW}Verificando versões instaladas...${NC}\n"

if command -v python3 &> /dev/null; then
    python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
    echo -e "${GREEN}✓${NC} Python instalado: $python_version"

    if [[ "$python_version" == "3.12"* ]]; then
        print_check 0 "Python 3.12 (requerido pelo CI)"
    else
        echo -e "${YELLOW}⚠${NC} Python $python_version instalado (CI usa 3.12)"
    fi
else
    print_check 1 "Python NÃO instalado"
    ISSUES=$((ISSUES + 1))
fi

if command -v node &> /dev/null; then
    node_version=$(node --version 2>&1 | cut -d'v' -f2)
    echo -e "${GREEN}✓${NC} Node.js instalado: $node_version"

    if [[ "$node_version" == "20."* ]]; then
        print_check 0 "Node.js 20 (requerido pelo CI)"
    else
        echo -e "${YELLOW}⚠${NC} Node.js $node_version instalado (CI usa 20)"
    fi
else
    print_check 1 "Node.js NÃO instalado"
    ISSUES=$((ISSUES + 1))
fi

# =============================================================================
# Resultado final
# =============================================================================
print_header "RESULTADO"

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Configuração do CI/CD está correta!${NC}\n"
    echo -e "Próximos passos:"
    echo -e "  1. Inicialize o repositório Git: ${BLUE}git init${NC}"
    echo -e "  2. Faça commit: ${BLUE}git add . && git commit -m 'feat: setup CI/CD'${NC}"
    echo -e "  3. Crie repositório no GitHub"
    echo -e "  4. Faça push: ${BLUE}git push -u origin main${NC}"
    echo -e "\nDocumentação: ${BLUE}.github/QUICKSTART_CI.md${NC}\n"
    exit 0
else
    echo -e "${RED}✗ Encontrados $ISSUES problemas na configuração${NC}\n"
    echo -e "Corrija os problemas acima antes de usar o CI/CD.\n"
    exit 1
fi
