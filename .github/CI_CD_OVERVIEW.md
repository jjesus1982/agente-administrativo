# CI/CD Overview - Agente Administrativo

## Estrutura de Arquivos Criados

```
agente_administrativo/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                  # Workflow principal de CI/CD
│   │   └── README.md               # Documentação do workflow
│   ├── CI_BADGES.md                # Badges para o README
│   ├── QUICKSTART_CI.md            # Guia rápido de uso
│   └── CI_CD_OVERVIEW.md           # Este arquivo
├── backend/
│   ├── .flake8                     # Configuração do Flake8
│   └── pyproject.toml              # Configuração Black, isort, pytest, mypy
├── app/
│   └── eslint.config.mjs           # Configuração do ESLint
├── .gitignore                      # Arquivos ignorados pelo Git
└── run-ci-checks.sh                # Script para executar checks localmente
```

## Configurações do CI/CD

### Tecnologias e Versões

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Python | 3.12 | Backend |
| Node.js | 20 | Frontend |
| PostgreSQL | 16 | Database (testes) |
| Redis | 7 | Cache (testes) |

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Push/PR para main/develop               │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ├──────────────────┬─────────────────────┐
                             │                  │                     │
                    ┌────────▼────────┐  ┌─────▼──────┐  ┌──────────▼─────────┐
                    │  Backend Lint   │  │  Frontend  │  │   Backend Type    │
                    │  - flake8       │  │    Lint    │  │      Check        │
                    │  - black        │  │  - eslint  │  │     - mypy        │
                    │  - isort        │  │            │  │                   │
                    └────────┬────────┘  └─────┬──────┘  └──────────┬─────────┘
                             │                  │                     │
                    ┌────────▼────────┐  ┌─────▼──────┐              │
                    │ Backend Tests   │  │  Frontend  │              │
                    │  - pytest       │  │ Type Check │              │
                    │  - coverage     │  │   - tsc    │              │
                    │  + PostgreSQL   │  └─────┬──────┘              │
                    │  + Redis        │         │                     │
                    └────────┬────────┘  ┌─────▼──────┐              │
                             │           │  Frontend  │              │
                             │           │   Tests    │              │
                             │           │  - jest    │              │
                             │           │  - coverage│              │
                             │           └─────┬──────┘              │
                             │                  │                     │
                    ┌────────▼────────┐  ┌─────▼──────┐              │
                    │ Backend Build   │  │  Frontend  │              │
                    │  - Docker       │  │   Build    │              │
                    │                 │  │ - next build              │
                    └────────┬────────┘  └─────┬──────┘              │
                             │                  │                     │
                             └──────────────────┴─────────────────────┘
                                                │
                                       ┌────────▼────────┐
                                       │   CI Success    │
                                       │   ou Failure    │
                                       └─────────────────┘
```

## Jobs Detalhados

### Backend Pipeline

| Job | Descrição | Ferramentas | Cache | Services |
|-----|-----------|-------------|-------|----------|
| **backend-lint** | Verifica qualidade do código | flake8, black, isort | pip | - |
| **backend-typecheck** | Verifica tipos estáticos | mypy | pip | - |
| **backend-test** | Executa testes com cobertura | pytest, coverage | pip | PostgreSQL 16, Redis 7 |
| **backend-build** | Constrói imagem Docker | Docker Buildx | docker layer | - |

### Frontend Pipeline

| Job | Descrição | Ferramentas | Cache | Dependencies |
|-----|-----------|-------------|-------|--------------|
| **frontend-lint** | Verifica qualidade do código | ESLint | npm | npm ci |
| **frontend-typecheck** | Verifica tipos TypeScript | tsc | npm | npm ci |
| **frontend-test** | Executa testes com cobertura | Jest | npm | npm ci |
| **frontend-build** | Constrói aplicação Next.js | Next.js | npm | npm ci |

## Artifacts Gerados

| Artifact | Conteúdo | Retenção | Tamanho Aprox. |
|----------|----------|----------|----------------|
| `backend-coverage-report` | HTML coverage report | 30 dias | ~500KB |
| `backend-coverage-xml` | XML coverage report | 30 dias | ~100KB |
| `frontend-coverage-report` | HTML/JSON coverage | 30 dias | ~300KB |
| `frontend-build` | Next.js .next/ folder | 7 dias | ~10MB |

## Otimizações Implementadas

### 1. Cache de Dependências

```yaml
# Python - pip cache
- uses: actions/setup-python@v5
  with:
    cache: 'pip'
    cache-dependency-path: backend/requirements.txt

# Node.js - npm cache
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: app/package-lock.json

# Docker - layer cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### 2. Services com Health Checks

```yaml
services:
  postgres:
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5

  redis:
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### 3. Fail Fast Strategy

- Jobs de build dependem dos jobs de lint/test
- Se lint falhar, não executa tests
- Se tests falharem, não executa build
- Economiza minutos de CI/CD

## Configurações de Qualidade

### Backend (.flake8)

```ini
max-line-length = 120
ignore = E203, E266, E501, W503, W504
```

### Backend (pyproject.toml)

```toml
[tool.black]
line-length = 120
target-version = ['py312']

[tool.isort]
profile = "black"
line_length = 120

[tool.mypy]
python_version = "3.12"
ignore_missing_imports = true
```

### Frontend (eslint.config.mjs)

```javascript
rules: {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
}
```

## Métricas e Monitoramento

### O que é Medido

1. **Cobertura de Testes**
   - Backend: pytest-cov
   - Frontend: Jest coverage
   - Artifacts salvos por 30 dias

2. **Qualidade de Código**
   - Linting errors/warnings
   - Type errors
   - Complexity (flake8)

3. **Tempo de Build**
   - Tempo total do pipeline
   - Tempo de cada job
   - Disponível em Actions logs

### Limites Recomendados

| Métrica | Valor Alvo | Status Atual |
|---------|------------|--------------|
| Test Coverage Backend | >80% | Verificar no CI |
| Test Coverage Frontend | >70% | Verificar no CI |
| Build Time | <10min | Otimizado com cache |
| Lint Errors | 0 | Enforced |
| Type Errors | 0 | Enforced |

## Comandos Rápidos

### Executar CI Localmente

```bash
# Todos os checks
./run-ci-checks.sh

# Apenas backend
cd backend
black app tests && isort app tests && flake8 app tests && mypy app && pytest tests/

# Apenas frontend
cd app
npm run lint && npm run type-check && npm test && npm run build
```

### Corrigir Problemas Comuns

```bash
# Corrigir formatação do backend
cd backend
black app tests
isort app tests

# Corrigir linting do frontend
cd app
npm run lint -- --fix
```

## Integração com GitHub

### Branch Protection Rules (Recomendado)

Configure em: Settings → Branches → Add rule

```
Branch name pattern: main
✓ Require status checks to pass before merging
  ✓ backend-lint
  ✓ backend-typecheck
  ✓ backend-test
  ✓ backend-build
  ✓ frontend-lint
  ✓ frontend-typecheck
  ✓ frontend-test
  ✓ frontend-build
✓ Require branches to be up to date before merging
✓ Require linear history
```

### Status Checks

Todos os jobs aparecem como status checks no PR:
- ✅ Green check = Passou
- ❌ Red X = Falhou
- 🟡 Yellow circle = Executando

## Custos e Limites

### GitHub Actions Free Tier

- **2,000 minutos/mês** para repositórios privados
- **Ilimitado** para repositórios públicos
- Tempo médio do pipeline: ~8-10 minutos

### Estimativa de Uso

| Ação | Frequência | Minutos/mês |
|------|------------|-------------|
| Push para develop | 20x | ~200 min |
| PRs | 10x | ~100 min |
| Push para main | 5x | ~50 min |
| **Total** | | **~350 min/mês** |

**Conclusão**: Bem dentro do free tier!

## Próximos Passos (Opcionais)

1. **Deploy Automático**
   - Deploy para staging em push para develop
   - Deploy para produção em push para main

2. **Notificações**
   - Slack/Discord em falhas
   - Email em deploy

3. **Security Scanning**
   - Dependabot
   - CodeQL
   - Snyk

4. **Performance Testing**
   - Lighthouse CI (frontend)
   - Load testing (backend)

5. **Docker Registry**
   - Push automático de imagens
   - Versionamento semântico

## Suporte

- **Documentação**: `.github/workflows/README.md`
- **Guia Rápido**: `.github/QUICKSTART_CI.md`
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Issues**: Abra issue no repositório
