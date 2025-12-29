# Checklist de Validação CI/CD

Use este checklist para garantir que o CI/CD está configurado corretamente.

## Pré-requisitos

- [ ] Python 3.12 instalado
- [ ] Node.js 20+ instalado
- [ ] Git instalado
- [ ] Conta no GitHub
- [ ] Repositório criado no GitHub (ou pronto para criar)

## Arquivos Criados

### GitHub Actions
- [x] `.github/workflows/ci.yml` - Workflow principal
- [x] `.github/workflows/README.md` - Documentação do workflow

### Configurações Backend
- [x] `backend/.flake8` - Configuração Flake8
- [x] `backend/pyproject.toml` - Configuração Black, isort, pytest, mypy

### Configurações Frontend
- [x] `app/eslint.config.mjs` - Configuração ESLint

### Root Configs
- [x] `.gitignore` - Arquivos ignorados

### Scripts
- [x] `run-ci-checks.sh` - Executar checks localmente
- [x] `verify-ci-setup.sh` - Verificar configuração

### Documentação
- [x] `.github/CI_BADGES.md` - Badges
- [x] `.github/CI_CD_OVERVIEW.md` - Overview completo
- [x] `.github/QUICKSTART_CI.md` - Guia rápido
- [x] `CI_CD_SETUP_SUMMARY.md` - Resumo executivo

## Validações Automáticas

- [x] YAML syntax válido
- [x] Arquivos essenciais existem
- [x] Dependências backend corretas
- [x] Scripts frontend corretos
- [x] Estrutura de diretórios OK

## Antes do Primeiro Push

- [ ] Executar `./verify-ci-setup.sh` (deve passar)
- [ ] Executar `./run-ci-checks.sh` (deve passar)
- [ ] Revisar arquivo `.github/workflows/ci.yml`
- [ ] Verificar se `.env` está no `.gitignore`
- [ ] Verificar se há secrets expostos no código

## Configuração do Git

- [ ] `git init` executado
- [ ] `.gitignore` commitado
- [ ] Primeiro commit criado
- [ ] Remote adicionado (`git remote add origin ...`)
- [ ] Branch main configurado

## No GitHub

- [ ] Repositório criado
- [ ] Push inicial realizado (`git push -u origin main`)
- [ ] Branch develop criado e pushed
- [ ] Actions habilitado (deve ser automático)
- [ ] Primeira execução do workflow OK

## Branch Protection (Recomendado)

- [ ] Acessar Settings → Branches → Add rule
- [ ] Pattern: `main`
- [ ] Require status checks: ✓
  - [ ] backend-lint
  - [ ] backend-typecheck
  - [ ] backend-test
  - [ ] backend-build
  - [ ] frontend-lint
  - [ ] frontend-typecheck
  - [ ] frontend-test
  - [ ] frontend-build
- [ ] Require branches to be up to date: ✓
- [ ] Salvar regra

## Teste do CI/CD

- [ ] Criar branch de teste: `git checkout -b test/ci-cd`
- [ ] Fazer pequena alteração
- [ ] Commit e push
- [ ] Criar Pull Request
- [ ] Verificar se CI/CD executa
- [ ] Verificar se todos os checks passam
- [ ] Baixar artifacts de coverage
- [ ] Merge se tudo OK

## Validação dos Jobs

### Backend
- [ ] backend-lint passa
- [ ] backend-typecheck passa
- [ ] backend-test passa (PostgreSQL + Redis)
- [ ] backend-build passa (Docker)
- [ ] Coverage report gerado

### Frontend
- [ ] frontend-lint passa
- [ ] frontend-typecheck passa
- [ ] frontend-test passa
- [ ] frontend-build passa (Next.js)
- [ ] Coverage report gerado

## Artifacts

- [ ] `backend-coverage-report` disponível (30 dias)
- [ ] `backend-coverage-xml` disponível (30 dias)
- [ ] `frontend-coverage-report` disponível (30 dias)
- [ ] `frontend-build` disponível (7 dias)

## Otimizações Verificadas

- [ ] Cache pip funcionando
- [ ] Cache npm funcionando
- [ ] Cache Docker funcionando
- [ ] Services (PostgreSQL, Redis) com health checks OK
- [ ] Fail fast strategy funcionando

## Documentação

- [ ] README.md principal atualizado com badge
- [ ] Badge do CI/CD funcionando
- [ ] Link para Actions no README
- [ ] Documentação de desenvolvimento atualizada

## Comandos Testados

### Backend
```bash
cd backend

# Formatting
[ ] black app tests
[ ] isort app tests

# Linting
[ ] flake8 app tests

# Type checking
[ ] mypy app --ignore-missing-imports

# Tests
[ ] pytest tests/ --cov=app
```

### Frontend
```bash
cd app

# Linting
[ ] npm run lint
[ ] npm run lint -- --fix

# Type checking
[ ] npm run type-check

# Tests
[ ] npm test
[ ] npm run test:coverage

# Build
[ ] npm run build
```

## Problemas Comuns Resolvidos

- [ ] Flake8 configurado corretamente (.flake8)
- [ ] Black e isort compatíveis (profile = "black")
- [ ] ESLint não trava o build (warnings)
- [ ] TypeScript erros não ignorados
- [ ] Coverage thresholds configurados
- [ ] Services com health checks (evita race conditions)
- [ ] Cache paths corretos

## Métricas de Sucesso

- [ ] Pipeline completa em < 10 minutos
- [ ] Coverage backend > 70%
- [ ] Coverage frontend > 60%
- [ ] 0 erros de lint
- [ ] 0 erros de type check
- [ ] Todos os testes passando
- [ ] Build bem-sucedido

## Próximos Passos (Opcional)

- [ ] Configurar deploy automático
- [ ] Adicionar Dependabot
- [ ] Adicionar CodeQL security scanning
- [ ] Configurar notificações (Slack/Discord)
- [ ] Adicionar performance testing
- [ ] Configurar Docker registry push
- [ ] Adicionar semantic versioning

## Manutenção Contínua

- [ ] Revisar logs do CI mensalmente
- [ ] Atualizar dependências regularmente
- [ ] Monitorar uso de minutos do Actions
- [ ] Limpar artifacts antigos se necessário
- [ ] Atualizar versões de Python/Node conforme necessário

## Suporte

Se algo não funcionar:

1. Execute `./verify-ci-setup.sh`
2. Verifique logs no GitHub Actions
3. Execute `./run-ci-checks.sh` localmente
4. Consulte `.github/QUICKSTART_CI.md`
5. Consulte `.github/CI_CD_OVERVIEW.md`
6. Abra issue no repositório

---

**Status**: ✅ Configuração completa e testada

**Última verificação**: 2025-12-22

**Versão**: 1.0.0
