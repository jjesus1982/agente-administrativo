# Guia Rápido - Testes E2E com Playwright

## Inicio Rapido

### 1. Pre-requisitos

Certifique-se de que o backend esta rodando:

```bash
cd /home/pedro/Downloads/agente_administrativo/backend
python manage.py runserver 8100
```

### 2. Executar Testes

#### Opcao 1: Usar o script interativo (Recomendado)

```bash
./run-e2e-tests.sh
```

Este script ira:
- Verificar se o backend esta respondendo
- Perguntar qual modo de execucao voce prefere
- Executar os testes
- Abrir o relatorio HTML automaticamente

#### Opcao 2: Comandos diretos

```bash
# Modo headless (padrao - mais rapido)
npm run test:e2e

# Modo UI (interface grafica - melhor para debug)
npm run test:e2e:ui

# Apenas testes de autenticacao
npx playwright test auth.spec.ts

# Apenas testes de portaria
npx playwright test portaria.spec.ts
```

### 3. Ver Resultados

Apos executar os testes:

```bash
npx playwright show-report
```

## Estrutura dos Testes

```
e2e/
├── auth.spec.ts       # Testes de login, logout, validacoes
├── portaria.spec.ts   # Testes de veiculos, visitas, dashboard
├── helpers.ts         # Funcoes auxiliares reutilizaveis
└── README.md          # Documentacao completa
```

## Testes Implementados

### Autenticacao (auth.spec.ts)
- ✓ Login com credenciais validas
- ✓ Erro com credenciais invalidas
- ✓ Logout
- ✓ Validacao de campos obrigatorios
- ✓ Persistencia de sessao

### Portaria (portaria.spec.ts)

**Dashboard**
- ✓ Acessar e exibir informacoes
- ✓ Exibir estatisticas
- ✓ Navegacao entre secoes

**Veiculos**
- ✓ Listar veiculos
- ✓ Filtrar por placa
- ✓ Ver detalhes
- ✓ Registrar entrada

**Visitas**
- ✓ Listar visitas
- ✓ Filtrar por nome
- ✓ Ver status
- ✓ Registrar nova visita
- ✓ Finalizar visita

## Credenciais de Teste

```
Email: porteiro@conectaplus.com.br
Senha: Porteiro@123
API: http://localhost:8100
```

## Troubleshooting

### Backend nao responde
```bash
cd ../backend
python manage.py runserver 8100
```

### Navegadores nao instalados
```bash
npx playwright install chromium
```

### Ver traces de falhas
```bash
npx playwright show-report
# Clique em um teste falhado para ver o trace completo
```

## Proximos Passos

1. **Personalizar testes**: Edite os arquivos em `e2e/` conforme necessario
2. **Adicionar mais testes**: Use `helpers.ts` para criar novos testes facilmente
3. **CI/CD**: O workflow `.github/workflows/e2e-tests.yml` ja esta configurado
4. **Debug**: Use `npm run test:e2e:ui` para modo interativo

## Recursos Uteis

- [Documentacao completa](e2e/README.md)
- [Helpers disponiveis](e2e/helpers.ts)
- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Comandos Rapidos

```bash
# Executar todos os testes
npm run test:e2e

# Modo UI
npm run test:e2e:ui

# Debug
npx playwright test --debug

# Apenas um arquivo
npx playwright test auth.spec.ts

# Apenas um teste especifico
npx playwright test -g "deve fazer login"

# Ver relatorio
npx playwright show-report

# Atualizar snapshots
npx playwright test --update-snapshots
```

---

**Dica**: Sempre mantenha o backend rodando antes de executar os testes!
