# Testes E2E com Playwright

Este diretório contém os testes end-to-end (E2E) para o frontend do Agente Administrativo usando Playwright.

## Estrutura

```
e2e/
├── auth.spec.ts       # Testes de autenticação
├── portaria.spec.ts   # Testes do módulo portaria
└── README.md          # Este arquivo
```

## Pré-requisitos

1. Certifique-se de que o backend está rodando em `http://localhost:8100`
2. O frontend será iniciado automaticamente em `http://localhost:3000` pelo Playwright

## Credenciais de Teste

Os testes utilizam as seguintes credenciais:

- **Email:** porteiro@conectaplus.com.br
- **Senha:** Porteiro@123

## Executando os Testes

### Modo Headless (padrão)

```bash
npm run test:e2e
```

### Modo UI (interface gráfica)

```bash
npm run test:e2e:ui
```

Este modo abre uma interface gráfica onde você pode:
- Ver os testes em tempo real
- Debugar testes específicos
- Ver screenshots e traces
- Executar testes individualmente

### Executar testes específicos

```bash
# Apenas testes de autenticação
npx playwright test auth.spec.ts

# Apenas testes de portaria
npx playwright test portaria.spec.ts

# Executar um teste específico
npx playwright test auth.spec.ts -g "deve fazer login"
```

### Modo Debug

```bash
npx playwright test --debug
```

## Testes Implementados

### Autenticação (auth.spec.ts)

- ✓ Login com credenciais válidas
- ✓ Validação de erro com credenciais inválidas
- ✓ Logout corretamente
- ✓ Validação de campos obrigatórios
- ✓ Persistência de sessão após reload

### Módulo Portaria (portaria.spec.ts)

#### Dashboard
- ✓ Acessar dashboard e exibir informações
- ✓ Exibir estatísticas do dia
- ✓ Navegar entre diferentes seções

#### Veículos
- ✓ Exibir lista de veículos
- ✓ Filtrar veículos por placa
- ✓ Exibir detalhes do veículo
- ✓ Registrar entrada de veículo

#### Visitas
- ✓ Exibir lista de visitas
- ✓ Filtrar visitas por nome
- ✓ Exibir status das visitas
- ✓ Registrar nova visita
- ✓ Finalizar visita

#### Filtros
- ✓ Filtrar por data
- ✓ Limpar filtros aplicados

## Relatórios

Após executar os testes, um relatório HTML é gerado automaticamente:

```bash
npx playwright show-report
```

O relatório inclui:
- Status de cada teste
- Screenshots de falhas
- Traces para debugging
- Tempo de execução

## Configuração

A configuração do Playwright está em `playwright.config.ts` na raiz do projeto:

```typescript
{
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
  },
  // ...
}
```

## CI/CD

Os testes estão configurados para executar em CI com:
- 2 retries em caso de falha
- 1 worker (execução sequencial)
- `forbidOnly: true` (previne commits com `.only`)

## Troubleshooting

### Erro: "Connection refused"

Certifique-se de que o backend está rodando:

```bash
cd ../backend
python manage.py runserver 8100
```

### Erro: "Browser not found"

Instale os navegadores do Playwright:

```bash
npx playwright install chromium
```

### Testes falhando intermitentemente

Os testes incluem waiters e retries apropriados, mas se você encontrar falhas intermitentes:

1. Aumente os timeouts em `playwright.config.ts`
2. Adicione mais `waitForLoadState('networkidle')` nos testes
3. Use `page.waitForSelector()` para elementos dinâmicos

## Boas Práticas

1. **Use data-testid**: Adicione `data-testid` aos elementos para seletores mais robustos
2. **Evite sleeps fixos**: Use `waitForSelector` ou `waitForResponse` em vez de `waitForTimeout`
3. **Isole os testes**: Cada teste deve ser independente
4. **Limpe o estado**: Use `beforeEach` para garantir estado limpo
5. **Screenshots**: Playwright tira screenshots automaticamente em falhas

## Recursos

- [Documentação Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
