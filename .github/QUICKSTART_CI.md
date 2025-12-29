# Guia Rápido - CI/CD com GitHub Actions

## Configuração Inicial

### 1. Inicializar Repositório Git (se ainda não fez)

```bash
cd /home/pedro/Downloads/agente_administrativo
git init
git add .
git commit -m "Initial commit with CI/CD setup"
```

### 2. Criar Repositório no GitHub

1. Acesse https://github.com/new
2. Crie um novo repositório (ex: `agente-administrativo`)
3. NÃO inicialize com README (já temos um)

### 3. Conectar ao Repositório Remoto

```bash
git remote add origin https://github.com/SEU-USUARIO/agente-administrativo.git
git branch -M main
git push -u origin main
```

### 4. Criar Branch de Desenvolvimento

```bash
git checkout -b develop
git push -u origin develop
```

## Como o CI/CD Funciona

### Quando o CI/CD é Executado?

- **Push** para `main` ou `develop`
- **Pull Request** para `main` ou `develop`

### O que é Verificado?

#### Backend (Python)
1. Linting com flake8, black, isort
2. Type checking com mypy
3. Testes com pytest + coverage
4. Build da imagem Docker

#### Frontend (Next.js)
1. Linting com ESLint
2. Type checking com TypeScript
3. Testes com Jest + coverage
4. Build do Next.js

### Workflow de Desenvolvimento

```bash
# 1. Criar feature branch
git checkout develop
git pull origin develop
git checkout -b feature/minha-feature

# 2. Fazer alterações
# ... código ...

# 3. Executar verificações localmente (recomendado)
cd backend
black app tests
isort app tests
flake8 app tests
pytest tests/ --cov=app

cd ../app
npm run lint
npm run type-check
npm run test

# 4. Commit e push
git add .
git commit -m "feat: adiciona nova funcionalidade"
git push origin feature/minha-feature

# 5. Criar Pull Request
# - Acesse GitHub
# - Crie PR de feature/minha-feature para develop
# - CI/CD será executado automaticamente
# - Aguarde aprovação dos checks
```

## Visualizando Resultados

### No GitHub

1. Vá para **Actions** no repositório
2. Clique na execução do workflow
3. Veja logs detalhados de cada job

### Baixar Reports de Cobertura

1. Acesse a execução do workflow
2. Role até **Artifacts**
3. Baixe:
   - `backend-coverage-report` (HTML)
   - `frontend-coverage-report` (HTML)

## Solução de Problemas

### Lint Falhando

**Backend:**
```bash
cd backend
black app tests
isort app tests
git add .
git commit -m "style: fix linting issues"
git push
```

**Frontend:**
```bash
cd app
npm run lint -- --fix
git add .
git commit -m "style: fix linting issues"
git push
```

### Testes Falhando

1. Execute localmente para debugar:
```bash
# Backend
cd backend
pytest tests/ -v

# Frontend
cd app
npm test
```

2. Corrija os testes
3. Commit e push novamente

### Type Check Falhando

**Backend:**
```bash
cd backend
mypy app --ignore-missing-imports
# Corrija os erros apontados
```

**Frontend:**
```bash
cd app
npm run type-check
# Corrija os erros apontados
```

### Build Falhando

**Backend:**
```bash
cd backend
docker build -t test .
# Verifique erros no Dockerfile ou dependências
```

**Frontend:**
```bash
cd app
npm run build
# Verifique erros de build
```

## Configuração de Secrets (se necessário)

Para variáveis sensíveis no CI:

1. Vá para **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Adicione secrets como:
   - `DATABASE_URL`
   - `REDIS_URL`
   - `SECRET_KEY`
   - etc.

No workflow, use assim:
```yaml
env:
  SECRET_KEY: ${{ secrets.SECRET_KEY }}
```

## Badges no README

Adicione ao README.md principal:

```markdown
[![CI/CD Pipeline](https://github.com/SEU-USUARIO/agente-administrativo/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU-USUARIO/agente-administrativo/actions/workflows/ci.yml)
```

## Comandos Úteis

### Executar Todos os Checks Localmente

**Backend:**
```bash
cd backend
black app tests && \
isort app tests && \
flake8 app tests && \
mypy app --ignore-missing-imports && \
pytest tests/ --cov=app
```

**Frontend:**
```bash
cd app
npm run lint && \
npm run type-check && \
npm run test:coverage && \
npm run build
```

### Limpar Cache

```bash
# Python
cd backend
rm -rf __pycache__ .pytest_cache .mypy_cache htmlcov/

# Node.js
cd app
rm -rf node_modules .next coverage/
npm install
```

## Boas Práticas

1. **Sempre execute os checks localmente antes de fazer push**
2. **Mantenha commits pequenos e focados**
3. **Escreva mensagens de commit descritivas**
4. **Use branches para features**
5. **Crie Pull Requests para código review**
6. **Não faça push direto para main**
7. **Mantenha a cobertura de testes alta (>80%)**

## Recursos Adicionais

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [pytest Documentation](https://docs.pytest.org/)
- [Jest Documentation](https://jestjs.io/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
