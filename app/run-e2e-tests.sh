#!/bin/bash

# Script para executar testes E2E do Agente Administrativo
# Autor: Sistema de Testes E2E
# Data: 2025-12-22

set -e

echo "=========================================="
echo "  Testes E2E - Agente Administrativo"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se o backend está rodando
check_backend() {
  echo -n "Verificando backend (http://localhost:8100)... "
  if curl -s http://localhost:8100 > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
    return 0
  else
    echo -e "${RED}FALHOU${NC}"
    return 1
  fi
}

# Função para verificar dependências
check_dependencies() {
  echo -n "Verificando dependências do Playwright... "
  if [ -d "node_modules/@playwright/test" ]; then
    echo -e "${GREEN}OK${NC}"
  else
    echo -e "${YELLOW}INSTALANDO${NC}"
    npm install
  fi
}

# Função principal
main() {
  # Verificar dependências
  check_dependencies

  # Verificar backend
  if ! check_backend; then
    echo ""
    echo -e "${YELLOW}ATENÇÃO:${NC} Backend não está respondendo em http://localhost:8100"
    echo "Por favor, inicie o backend antes de executar os testes:"
    echo ""
    echo "  cd ../backend"
    echo "  python manage.py runserver 8100"
    echo ""
    read -p "Deseja continuar mesmo assim? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Abortando..."
      exit 1
    fi
  fi

  echo ""
  echo "Escolha o modo de execução:"
  echo ""
  echo "  1) Headless (padrão - mais rápido)"
  echo "  2) UI Mode (interface gráfica)"
  echo "  3) Debug Mode (passo a passo)"
  echo "  4) Apenas Auth Tests"
  echo "  5) Apenas Portaria Tests"
  echo "  6) Ver relatório anterior"
  echo ""
  read -p "Opção [1]: " option
  option=${option:-1}

  echo ""
  echo "Executando testes..."
  echo ""

  case $option in
    1)
      npm run test:e2e
      ;;
    2)
      npm run test:e2e:ui
      ;;
    3)
      npx playwright test --debug
      ;;
    4)
      npx playwright test auth.spec.ts
      ;;
    5)
      npx playwright test portaria.spec.ts
      ;;
    6)
      npx playwright show-report
      exit 0
      ;;
    *)
      echo -e "${RED}Opção inválida${NC}"
      exit 1
      ;;
  esac

  # Mostrar relatório se os testes foram executados
  if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Testes concluídos com sucesso!${NC}"
    echo ""
    read -p "Deseja ver o relatório HTML? (Y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
      npx playwright show-report
    fi
  else
    echo ""
    echo -e "${RED}Alguns testes falharam.${NC}"
    echo "Execute 'npx playwright show-report' para ver os detalhes."
    exit 1
  fi
}

# Executar
main
