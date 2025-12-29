# CI/CD Pipeline - Agente Administrativo

Este diretório contém os workflows do GitHub Actions para CI/CD do projeto.

## Workflows Disponíveis

### ci.yml - Pipeline de CI/CD Completo

Pipeline principal que executa todas as verificações de qualidade, testes e builds para o projeto.

#### Triggers

- **Push**: Executado em pushes para branches `main` e `develop`
- **Pull Request**: Executado em PRs para branches `main` e `develop`

#### Jobs do Backend

1. **backend-lint**
   - Executa flake8 para verificação de erros críticos
   - Verifica formatação com black --check
   - Verifica ordenação de imports com isort --check

2. **backend-typecheck**
   - Executa mypy para verificação de tipos estáticos
   - Usa Python 3.12

3. **backend-test**
   - Executa pytest com coverage
   - Usa PostgreSQL 16 e Redis 7 como services
   - Gera relatórios de cobertura em XML e HTML
   - Faz upload dos relatórios como artifacts

4. **backend-build**
   - Constrói imagem Docker do backend
   - Usa cache do GitHub Actions para otimização
   - Só executa se lint, typecheck e tests passarem

#### Jobs do Frontend

1. **frontend-lint**
   - Executa ESLint para verificação de código
   - Usa npm run lint

2. **frontend-typecheck**
   - Executa TypeScript compiler (tsc)
   - Verifica tipos sem gerar código

3. **frontend-test**
   - Executa Jest com coverage
   - Gera relatórios de cobertura
   - Faz upload dos relatórios como artifacts

4. **frontend-build**
   - Executa next build
   - Gera build de produção
   - Faz upload do build como artifact
   - Só executa se lint, typecheck e tests passarem

#### Otimizações

- **Cache de dependências**:
  - pip cache para Python
  - npm cache para Node.js
  - Docker layer cache via GitHub Actions

- **Services para testes**:
  - PostgreSQL 16 com health checks
  - Redis 7 com health checks

- **Fail Fast**:
  - Jobs do build só executam se lint, typecheck e tests passarem
  - ci-success só executa se todos os jobs passarem

#### Artifacts Gerados

- `backend-coverage-report`: Relatório HTML de cobertura do backend (30 dias)
- `backend-coverage-xml`: Relatório XML de cobertura do backend (30 dias)
- `frontend-coverage-report`: Relatório de cobertura do frontend (30 dias)
- `frontend-build`: Build do Next.js (7 dias)

## Configurações de Ambiente

### Backend

- Python: 3.12
- PostgreSQL: 16
- Redis: 7

### Frontend

- Node.js: 20

## Como Visualizar os Resultados

1. Acesse a aba **Actions** do repositório no GitHub
2. Selecione o workflow **CI/CD Pipeline**
3. Clique em uma execução específica
4. Visualize os logs de cada job
5. Baixe os artifacts de cobertura se necessário

## Configurações Locais

Para executar os mesmos comandos localmente:

### Backend

```bash
cd backend

# Lint
flake8 app tests
black --check app tests
isort --check-only app tests

# Type check
mypy app --ignore-missing-imports

# Tests
pytest tests/ --cov=app --cov-report=term-missing

# Build Docker
docker build -t agente-administrativo-backend .
```

### Frontend

```bash
cd app

# Lint
npm run lint

# Type check
npm run type-check

# Tests
npm run test:coverage

# Build
npm run build
```

## Troubleshooting

### Testes falhando

- Verifique se as variáveis de ambiente estão corretas
- Certifique-se que PostgreSQL e Redis estão rodando (para testes locais)
- Veja os logs detalhados no GitHub Actions

### Build falhando

- Verifique se todas as dependências estão no requirements.txt / package.json
- Certifique-se que o Dockerfile está correto
- Verifique problemas de cache (pode limpar o cache no GitHub)

### Lint falhando

- Execute os comandos localmente para corrigir:
  - Backend: `black app tests && isort app tests`
  - Frontend: `npm run lint -- --fix`

## Manutenção

- Atualizar versões de Python/Node conforme necessário
- Revisar configurações de cache periodicamente
- Ajustar timeouts se necessário
- Manter artifacts com retention adequado
