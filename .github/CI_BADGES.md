# CI/CD Badges

Adicione estes badges ao README.md principal do projeto para mostrar o status do CI/CD:

## Badge de Status do CI

```markdown
![CI/CD Pipeline](https://github.com/SEU-USUARIO/SEU-REPOSITORIO/actions/workflows/ci.yml/badge.svg)
```

## Badges Detalhados

### Badge com Branch Específica

```markdown
![CI/CD Pipeline](https://github.com/SEU-USUARIO/SEU-REPOSITORIO/actions/workflows/ci.yml/badge.svg?branch=main)
```

### Badge com Link

```markdown
[![CI/CD Pipeline](https://github.com/SEU-USUARIO/SEU-REPOSITORIO/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU-USUARIO/SEU-REPOSITORIO/actions/workflows/ci.yml)
```

## Exemplo de Seção no README

```markdown
## Status do Projeto

[![CI/CD Pipeline](https://github.com/SEU-USUARIO/SEU-REPOSITORIO/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU-USUARIO/SEU-REPOSITORIO/actions/workflows/ci.yml)

O projeto está configurado com CI/CD automático usando GitHub Actions. Todos os commits e pull requests são automaticamente verificados para:

- ✅ Linting (Backend: flake8, black, isort | Frontend: ESLint)
- ✅ Type checking (Backend: mypy | Frontend: TypeScript)
- ✅ Testes unitários e de integração (Backend: pytest | Frontend: Jest)
- ✅ Build (Backend: Docker | Frontend: Next.js)

### Cobertura de Testes

Os relatórios de cobertura estão disponíveis nos artifacts de cada execução do CI.
```

## Substituindo os Placeholders

Substitua `SEU-USUARIO` e `SEU-REPOSITORIO` pelos valores corretos do seu repositório no GitHub.

Por exemplo, se o repositório é `github.com/acme/agente-admin`:
- `SEU-USUARIO` → `acme`
- `SEU-REPOSITORIO` → `agente-admin`
