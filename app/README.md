# Agente Administrativo - Frontend

Sistema de gestão condominial multi-tenant desenvolvido com Next.js 15 e React 19.

## Tecnologias

- **Next.js 15** - Framework React com App Router
- **React 19** - Biblioteca UI
- **TypeScript 5.7** - Tipagem estática
- **Lucide React** - Biblioteca de ícones
- **date-fns** - Manipulação de datas
- **Embla Carousel** - Componente de carrossel
- **React Day Picker** - Seletor de datas

## Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── (authenticated)/    # Rotas protegidas
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── announcements/  # Comunicados
│   │   ├── documents/      # Documentos
│   │   ├── encomendas/     # Gestão de encomendas
│   │   ├── maintenance/    # Chamados de manutenção
│   │   ├── management/     # Gestão (usuários, unidades, etc.)
│   │   ├── notifications/  # Central de notificações
│   │   ├── occurrences/    # Ocorrências
│   │   ├── profile/        # Perfil do usuário
│   │   ├── reports/        # Relatórios (40+ tipos)
│   │   ├── reservas/       # Reservas de áreas comuns
│   │   └── surveys/        # Pesquisas e votações
│   └── login/              # Página de login
├── components/             # Componentes reutilizáveis
│   ├── ui/                 # Componentes UI base
│   └── reports/            # Componentes de relatórios
├── contexts/               # Contextos React
│   └── TenantContext.tsx   # Contexto multi-tenant
├── hooks/                  # Hooks customizados
├── lib/                    # Utilitários
│   ├── api.ts              # Configuração da API
│   └── errorHandler.ts     # Tratamento de erros
└── styles/                 # Estilos globais
```

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8100/api/v1
```

### Instalação

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar em produção
npm start

# Verificar tipos
npm run type-check

# Lint
npm run lint
```

## Arquitetura

### Multi-Tenancy

O sistema suporta múltiplos condomínios (tenants). O tenant atual é gerenciado pelo `TenantContext`:

```typescript
import { useTenant } from '@/contexts/TenantContext';

function MyComponent() {
  const { tenant, tenantId } = useTenant();
  // tenant contém informações do condomínio atual
}
```

### API

Todas as chamadas de API usam a constante `API_BASE` centralizada:

```typescript
import { API_BASE } from '@/lib/api';

const response = await fetch(`${API_BASE}/endpoint?tenant_id=${tenantId}`);
```

### Tratamento de Erros

Use o hook `useApiCall` para chamadas de API com tratamento de erros:

```typescript
import { useApiCall } from '@/lib/errorHandler';

function MyComponent() {
  const { execute, loading, error } = useApiCall<User[]>();

  const fetchUsers = async () => {
    const users = await execute(() =>
      fetch(`${API_BASE}/users?tenant_id=${tenantId}`)
    );
    if (users) {
      // Sucesso
    }
  };
}
```

## Módulos Principais

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Visão geral com estatísticas e métricas |
| Comunicados | Gestão de avisos e comunicados |
| Encomendas | Controle de entregas na portaria |
| Manutenção | Chamados técnicos e acompanhamento |
| Reservas | Agendamento de áreas comuns |
| Ocorrências | Registro e acompanhamento de ocorrências |
| Documentos | Repositório de documentos do condomínio |
| Relatórios | 40+ tipos de relatórios gerenciais |
| Pesquisas | Enquetes e votações |
| Notificações | Centro de notificações em tempo real |

## Componentes UI

O projeto possui uma biblioteca de componentes UI reutilizáveis:

- `Card` - Container com estilos
- `Button` - Botões com variantes
- `Badge` - Badges de status
- `Modal` - Modais
- `Table` - Tabelas de dados
- `StatCard` - Cards de estatísticas
- `EmptyState` - Estado vazio
- `Avatar` - Avatares de usuário
- `Tabs` - Navegação por abas

## Permissões (RBAC)

O sistema possui 5 níveis de permissão:

1. **Morador** (role=1) - Acesso básico
2. **Síndico** (role=2) - Gestão do condomínio
3. **Porteiro** (role=3) - Controle de acesso
4. **Admin** (role=4) - Administração
5. **Superadmin** (role=5) - Acesso total

## Scripts Disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Iniciar servidor de produção
npm run lint         # Verificar código com ESLint
npm run type-check   # Verificar tipos TypeScript
npm run test         # Executar testes
npm run test:watch   # Testes em modo watch
npm run test:coverage # Testes com cobertura
```

## Convenções

- **Nomenclatura**: camelCase para variáveis, PascalCase para componentes
- **Arquivos**: kebab-case para arquivos, PascalCase para componentes React
- **Imports**: Usar alias `@/` para imports absolutos
- **API**: Sempre incluir `tenant_id` nas requisições

## Contribuindo

1. Criar branch a partir de `main`
2. Implementar alterações
3. Rodar `npm run type-check` e `npm run lint`
4. Criar Pull Request
