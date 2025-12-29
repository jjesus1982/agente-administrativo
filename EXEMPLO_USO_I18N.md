# Guia de Uso do Arquivo i18n.ts

## Como Usar as Constantes de Tradução

### 1. Importação Básica

```typescript
// Importar o objeto completo
import { pt } from '@/lib/i18n';

// OU importar a função helper
import { t } from '@/lib/i18n';

// OU importar ambos
import { pt, t } from '@/lib/i18n';
```

---

## 2. Exemplos Práticos de Uso

### Exemplo 1: Botões de Ação

**Antes:**
```typescript
<Button>Salvar</Button>
<Button>Cancelar</Button>
<Button>Editar</Button>
<Button>Excluir</Button>
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

<Button>{pt.comum.salvar}</Button>
<Button>{pt.comum.cancelar}</Button>
<Button>{pt.comum.editar}</Button>
<Button>{pt.comum.excluir}</Button>
```

---

### Exemplo 2: Títulos e Headers

**Antes:**
```typescript
<h1>Controle de Portaria</h1>
<p>Gestão completa de acessos, visitantes e veículos</p>
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

<h1>{pt.portaria.title}</h1>
<p>{pt.portaria.subtitle}</p>
```

---

### Exemplo 3: Labels de Formulário

**Antes:**
```typescript
<FormField>
  <label>Nome</label>
  <input placeholder="Digite o nome" />
</FormField>

<FormField>
  <label>Descrição</label>
  <textarea placeholder="Digite a descrição" />
</FormField>
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

<FormField>
  <label>{pt.comum.nome}</label>
  <input placeholder={`Digite ${pt.comum.nome.toLowerCase()}`} />
</FormField>

<FormField>
  <label>{pt.comum.descricao}</label>
  <textarea placeholder={`Digite a ${pt.comum.descricao.toLowerCase()}`} />
</FormField>
```

---

### Exemplo 4: Navegação/Tabs

**Antes:**
```typescript
const tabs = [
  { label: 'Dashboard', path: '/portaria' },
  { label: 'Visitantes', path: '/portaria/visitantes' },
  { label: 'Visitas', path: '/portaria/visitas' },
  { label: 'Veículos', path: '/portaria/veiculos' },
];
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

const tabs = [
  { label: pt.portaria.dashboard, path: '/portaria' },
  { label: pt.portaria.visitantes, path: '/portaria/visitantes' },
  { label: pt.portaria.visitas, path: '/portaria/visitas' },
  { label: pt.portaria.veiculos, path: '/portaria/veiculos' },
];
```

---

### Exemplo 5: Mensagens de Status

**Antes:**
```typescript
const showSuccess = () => {
  toast.success('Operação realizada com sucesso');
};

const showError = () => {
  toast.error('Erro ao carregar dados');
};
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

const showSuccess = () => {
  toast.success(pt.comum.sucesso);
};

const showError = () => {
  toast.error(pt.comum.erro);
};
```

---

### Exemplo 6: Select/Dropdown Options

**Antes:**
```typescript
<Select>
  <option value="ativo">Ativo</option>
  <option value="inativo">Inativo</option>
  <option value="pendente">Pendente</option>
</Select>
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

<Select>
  <option value="ativo">{pt.comum.ativo}</option>
  <option value="inativo">{pt.comum.inativo}</option>
  <option value="pendente">{pt.comum.pendente}</option>
</Select>
```

---

### Exemplo 7: Usando a Função Helper `t()`

**Quando usar:** Quando você precisa de acesso dinâmico às traduções

```typescript
import { t } from '@/lib/i18n';

// Dinâmico baseado em variável
const module = 'portaria';
const section = 'dashboard';
const title = t(`${module}.${section}`); // 'Dashboard'

// Em loops
const fields = ['nome', 'descricao', 'codigo'];
fields.map(field => ({
  label: t(`comum.${field}`),
  key: field
}));
```

---

## 3. Exemplo Completo: Refatoração de Componente

### ANTES - Componente Original
```typescript
// page.tsx
export default function GruposAcessoPage() {
  return (
    <div>
      <h1>Grupos de Acesso</h1>
      <p>Gerencie os grupos de permissão de acesso</p>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Grupos</CardTitle>
        </CardHeader>
        <div>
          <Button onClick={handleCreate}>
            Novo Grupo
          </Button>
        </div>
        <Table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(grupo => (
              <tr key={grupo.id}>
                <td>{grupo.codigo}</td>
                <td>{grupo.nome}</td>
                <td>{grupo.descricao}</td>
                <td>{grupo.is_active ? 'Ativo' : 'Inativo'}</td>
                <td>
                  <Button onClick={() => handleEdit(grupo)}>Editar</Button>
                  <Button onClick={() => handleDelete(grupo)}>Excluir</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {showForm && (
        <Modal>
          <h2>{isEditing ? 'Editar Grupo' : 'Novo Grupo'}</h2>
          <form onSubmit={handleSubmit}>
            <FormField>
              <label>Código</label>
              <input name="codigo" required />
            </FormField>
            <FormField>
              <label>Nome</label>
              <input name="nome" required />
            </FormField>
            <FormField>
              <label>Descrição</label>
              <textarea name="descricao" />
            </FormField>
            <FormField>
              <label>Permite Morador</label>
              <input type="checkbox" name="permite_morador" />
            </FormField>
            <FormField>
              <label>Permite Visitante</label>
              <input type="checkbox" name="permite_visitante" />
            </FormField>
            <div>
              <Button type="submit">Salvar</Button>
              <Button type="button" onClick={handleCancel}>Cancelar</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
```

### DEPOIS - Componente Refatorado

```typescript
// page.tsx
import { pt } from '@/lib/i18n';

export default function GruposAcessoPage() {
  const { grupos: labels } = pt.portaria;
  const { comum } = pt;

  return (
    <div>
      <h1>{labels.title}</h1>
      <p>Gerencie os grupos de permissão de acesso</p>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Grupos</CardTitle>
        </CardHeader>
        <div>
          <Button onClick={handleCreate}>
            {comum.novo} Grupo
          </Button>
        </div>
        <Table>
          <thead>
            <tr>
              <th>{labels.codigo}</th>
              <th>{labels.nome}</th>
              <th>{labels.descricao}</th>
              <th>{comum.status}</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map(grupo => (
              <tr key={grupo.id}>
                <td>{grupo.codigo}</td>
                <td>{grupo.nome}</td>
                <td>{grupo.descricao}</td>
                <td>{grupo.is_active ? comum.ativo : comum.inativo}</td>
                <td>
                  <Button onClick={() => handleEdit(grupo)}>
                    {comum.editar}
                  </Button>
                  <Button onClick={() => handleDelete(grupo)}>
                    {comum.excluir}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {showForm && (
        <Modal>
          <h2>{isEditing ? `${comum.editar} Grupo` : `${comum.novo} Grupo`}</h2>
          <form onSubmit={handleSubmit}>
            <FormField>
              <label>{labels.codigo}</label>
              <input name="codigo" required />
            </FormField>
            <FormField>
              <label>{labels.nome}</label>
              <input name="nome" required />
            </FormField>
            <FormField>
              <label>{labels.descricao}</label>
              <textarea name="descricao" />
            </FormField>
            <FormField>
              <label>{labels.permite_morador}</label>
              <input type="checkbox" name="permite_morador" />
            </FormField>
            <FormField>
              <label>{labels.permite_visitante}</label>
              <input type="checkbox" name="permite_visitante" />
            </FormField>
            <div>
              <Button type="submit">{comum.salvar}</Button>
              <Button type="button" onClick={handleCancel}>
                {comum.cancelar}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
```

---

## 4. Boas Práticas

### ✅ DO (Faça)

```typescript
// 1. Desestruture no início do componente
const { portaria, comum } = pt;

// 2. Use constantes semânticas
<Button>{comum.salvar}</Button>

// 3. Combine strings quando necessário
<h2>{`${comum.novo} ${portaria.grupos.title}`}</h2>

// 4. Use em validações
const validateForm = () => {
  if (!campo) {
    return pt.validacoes.campo_obrigatorio;
  }
};
```

### ❌ DON'T (Não faça)

```typescript
// 1. Não use strings hardcoded
<Button>Salvar</Button> // ❌

// 2. Não importe tudo sem necessidade
import i18n from '@/lib/i18n'; // ❌ (use import { pt })

// 3. Não crie strings duplicadas
const SALVAR = 'Salvar'; // ❌ (use pt.comum.salvar)

// 4. Não misture português e inglês sem padrão
<Button>Save</Button> // ❌
```

---

## 5. Adicionando Novas Traduções

Quando precisar adicionar novas traduções ao sistema:

```typescript
// 1. Abra o arquivo i18n.ts
// 2. Adicione no módulo apropriado

export const pt = {
  // ... código existente

  meu_modulo: {
    title: 'Título do Meu Módulo',
    subtitle: 'Subtítulo',
    campos: {
      campo1: 'Campo 1',
      campo2: 'Campo 2',
    },
    acoes: {
      acao_especial: 'Ação Especial',
    },
  },
};
```

---

## 6. TypeScript Support (Futuro)

Para adicionar type-safety completo (opcional):

```typescript
// i18n.ts
export type TranslationKey =
  | 'portaria.dashboard'
  | 'portaria.visitantes'
  | 'comum.salvar'
  | 'comum.cancelar'
  // ... etc

export function t(key: TranslationKey): string {
  // implementação
}

// Uso com autocomplete
t('portaria.dashboard'); // ✅ Autocomplete funciona
t('portaria.invalido');  // ❌ Erro do TypeScript
```

---

## 7. Migração Gradual

Não é necessário refatorar tudo de uma vez. Estratégia recomendada:

1. **Novos componentes**: sempre use i18n.ts desde o início
2. **Componentes existentes**: refatore quando for editar
3. **Componentes legados**: manter como está, sem urgência
4. **Prioridade**: componentes mais usados primeiro

---

## 8. Benefícios desta Abordagem

- 🎯 **Manutenibilidade**: Alterar textos em um único lugar
- 🌍 **Internacionalização**: Fácil adicionar novos idiomas no futuro
- 🔍 **Busca**: Encontrar todos os usos de um texto rapidamente
- 🛡️ **Type-Safety**: Com TypeScript, previne erros de digitação
- 📝 **Documentação**: Centraliza todos os textos da aplicação
- ♻️ **Reutilização**: Evita duplicação de strings

---

**Criado em:** 2025-12-22
**Última atualização:** 2025-12-22
