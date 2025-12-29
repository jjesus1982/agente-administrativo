# Relatório de Internacionalização - Projeto Conecta Plus

**Data:** 2025-12-22
**Objetivo:** Identificar e padronizar a internacionalização (nomes de campos) no projeto

## Padrão Definido

- **Backend (models, schemas, API)**: Campos em INGLÊS
- **Frontend (labels, textos UI)**: Textos em PORTUGUÊS

---

## 1. Análise do Backend

### 1.1. Models - `/home/pedro/Downloads/agente_administrativo/backend/app/models/portaria.py`

**Status:** ⚠️ **INCONSISTÊNCIAS ENCONTRADAS - CAMPOS EM PORTUGUÊS**

#### Campos que DEVERIAM estar em inglês (mas estão em português):

##### Classe `GrupoAcesso` (linhas 25-67)
- `codigo` → deveria ser `code`
- `nome` → deveria ser `name`
- `descricao` → deveria ser `description`
- `permite_morador` → deveria ser `allows_resident`
- `permite_visitante` → deveria ser `allows_visitor`
- `permite_prestador` → deveria ser `allows_provider`
- `permite_entregador` → deveria ser `allows_deliverer`
- `blocos_permitidos` → deveria ser `allowed_blocks`
- `horario_inicio` → deveria ser `start_time`
- `horario_fim` → deveria ser `end_time`
- `dias_semana` → deveria ser `weekdays`

##### Classe `PontoAcesso` (linhas 69-134)
- `codigo` → deveria ser `code`
- `nome` → deveria ser `name`
- `descricao` → deveria ser `description`
- `tipo` → deveria ser `type`
- `porta` → deveria ser `port`
- `rele_id` → deveria ser `relay_id`
- `sensor_id` → deveria ser `sensor_id` (OK)
- `eclusa_pair_id` → deveria ser `airlock_pair_id`
- `eclusa_delay` → deveria ser `airlock_delay`
- `interfone_ramal` → deveria ser `intercom_extension`
- `interfone_ip` → deveria ser `intercom_ip`
- `ordem` → deveria ser `order`
- `visivel` → deveria ser `visible`

##### Classe `GrupoAcessoPonto` (linhas 136-154)
- `permite_entrada` → deveria ser `allows_entry`
- `permite_saida` → deveria ser `allows_exit`

##### Classe `PreAutorizacao` (linhas 156-224)
- `morador_id` → deveria ser `resident_id`
- `visitante_nome` → deveria ser `visitor_name`
- `visitante_documento` → deveria ser `visitor_document`
- `visitante_telefone` → deveria ser `visitor_phone`
- `visitante_email` → deveria ser `visitor_email`
- `visitante_tipo` → deveria ser `visitor_type`
- `veiculo_placa` → deveria ser `vehicle_plate`
- `veiculo_modelo` → deveria ser `vehicle_model`
- `veiculo_cor` → deveria ser `vehicle_color`
- `tipo` → deveria ser `type`
- `observacoes` → deveria ser `notes`

##### Classe `TipoOcorrencia` (linhas 227-265)
- `codigo` → deveria ser `code`
- `nome` → deveria ser `name`
- `descricao` → deveria ser `description`
- `icone` → deveria ser `icon`
- `cor` → deveria ser `color`
- `severidade_padrao` → deveria ser `default_severity`
- `requer_foto` → deveria ser `requires_photo`
- `notificar_sindico` → deveria ser `notify_manager`
- `notificar_administracao` → deveria ser `notify_admin`
- `evento_trigger` → deveria ser `trigger_event`
- `ordem` → deveria ser `order`

##### Classe `IntegracaoHardware` (linhas 268-327)
- `parceiro` → deveria ser `partner`
- `nome_exibicao` → deveria ser `display_name`
- `sync_moradores` → deveria ser `sync_residents`
- `sync_visitantes` → deveria ser `sync_visitors`
- `sync_veiculos` → deveria ser `sync_vehicles`
- `sync_acessos` → deveria ser `sync_accesses`

##### Classe `SincronizacaoLog` (linhas 330-366)
- `integracao_id` → deveria ser `integration_id`
- `tipo_sync` → deveria ser `sync_type`
- `direcao` → deveria ser `direction`
- `registros_total` → deveria ser `total_records`
- `registros_sucesso` → deveria ser `success_records`
- `registros_erro` → deveria ser `error_records`
- `erro_mensagem` → deveria ser `error_message`
- `detalhes` → deveria ser `details`
- `iniciado_em` → deveria ser `started_at`
- `finalizado_em` → deveria ser `finished_at`
- `duracao_ms` → deveria ser `duration_ms` (OK)

##### Classe `VagaGaragem` (linhas 369-422)
- `numero` → deveria ser `number`
- `bloco` → deveria ser `block`
- `andar` → deveria ser `floor`
- `tipo` → deveria ser `type`
- `posicao_x` → deveria ser `position_x`
- `posicao_y` → deveria ser `position_y`
- `largura` → deveria ser `width`
- `altura` → deveria ser `height`
- `rotacao` → deveria ser `rotation`
- `mapa_id` → deveria ser `map_id`
- `ocupada_desde` → deveria ser `occupied_since`
- `veiculo_id` → deveria ser `vehicle_id`

##### Classe `ComunicacaoPortaria` (linhas 425-466)
- `porteiro_id` → deveria ser `guard_id` ou `gatekeeper_id`
- `morador_id` → deveria ser `resident_id`
- `direcao` → deveria ser `direction`
- `tipo_mensagem` → deveria ser `message_type`
- `conteudo` → deveria ser `content`
- `anexo_url` → deveria ser `attachment_url`

##### Classe `Visita` (linhas 469-538)
- `visitante_nome` → deveria ser `visitor_name`
- `visitante_documento` → deveria ser `visitor_document`
- `visitante_foto_url` → deveria ser `visitor_photo_url`
- `morador_id` → deveria ser `resident_id`
- `porteiro_entrada_id` → deveria ser `entry_guard_id`
- `porteiro_saida_id` → deveria ser `exit_guard_id`
- `tipo` → deveria ser `type`
- `veiculo_placa` → deveria ser `vehicle_plate`
- `veiculo_modelo` → deveria ser `vehicle_model`
- `ponto_entrada_id` → deveria ser `entry_point_id`
- `ponto_saida_id` → deveria ser `exit_point_id`
- `observacoes` → deveria ser `notes`
- `motivo_negacao` → deveria ser `denial_reason`

---

### 1.2. Schemas - `/home/pedro/Downloads/agente_administrativo/backend/app/schemas/portaria.py`

**Status:** ⚠️ **INCONSISTÊNCIAS ENCONTRADAS - CAMPOS EM PORTUGUÊS**

Os schemas espelham os mesmos problemas dos models, pois usam os mesmos nomes de campos:

- `GrupoAcessoBase`: todos os campos em português
- `PontoAcessoBase`: todos os campos em português
- `PreAutorizacaoBase`: todos os campos em português
- `TipoOcorrenciaBase`: todos os campos em português
- `IntegracaoBase`: todos os campos em português
- `VagaGaragemBase`: todos os campos em português
- `VisitaBase`: todos os campos em português
- `ComunicacaoBase`: todos os campos em português

**Exceções que já estão corretas:**
- `visitor_id` (linha 406)
- `unit_id` (linhas 136, 164, 333, 410)
- `device_id` (linha 71)
- `ip_address` (linha 72)
- `parking_spot_id` (linha 344)
- `qr_code` (linha 183)
- `status` (várias linhas)
- Campos booleanos com prefixo `is_` (is_active, is_default, is_eclusa, etc.)

---

## 2. Análise do Frontend

### 2.1. Componentes Analisados

**Arquivos verificados:**
- `/home/pedro/Downloads/agente_administrativo/app/src/app/(authenticated)/portaria/page.tsx`
- `/home/pedro/Downloads/agente_administrativo/app/src/app/(authenticated)/portaria/layout.tsx`

**Status:** ✅ **CORRETO - TEXTOS EM PORTUGUÊS**

O frontend está seguindo o padrão correto:
- **Labels e textos da UI:** em PORTUGUÊS
- **Nomes de variáveis e propriedades:** podem estar em inglês ou português

#### Exemplos de textos corretos encontrados:
- "Dashboard da Portaria" (título)
- "Gestão completa de acessos, visitantes e veículos" (subtítulo)
- "VISITANTES HOJE", "VEÍCULOS", "ACESSOS HOJE" (cards KPI)
- "Acessos em Tempo Real" (título de seção)
- "Ações Rápidas" (título de card)
- "Nova Visita", "Gerar QR", "Encomenda", "Ocorrência" (botões)
- "Pré-autorizações Hoje" (título)

#### Nota sobre interfaces TypeScript:
As interfaces TypeScript usam nomes em português para os campos vindos do backend, o que é esperado pois refletem a estrutura da API:

```typescript
interface DashboardStats {
  visitantes_hoje: number;      // vem do backend
  veiculos_estacionados: number; // vem do backend
  acessos_hoje: number;          // vem do backend
  // ...
}
```

Isso é correto, pois quando consumimos a API, devemos usar os mesmos nomes de campos que o backend retorna.

---

## 3. Solução Implementada

### 3.1. Arquivo de Constantes i18n

**Criado:** `/home/pedro/Downloads/agente_administrativo/app/src/lib/i18n.ts`

Este arquivo centraliza todos os textos em português da aplicação, organizados por módulo:

```typescript
export const pt = {
  portaria: {
    dashboard: 'Dashboard',
    visitantes: 'Visitantes',
    visitas: 'Visitas',
    // ... mais traduções
  },
  comum: {
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    // ... mais traduções
  },
  // ... outros módulos
};
```

**Benefícios:**
1. Centralização dos textos em um único local
2. Facilita manutenção e alterações
3. Prepara o sistema para futura internacionalização (multi-idiomas)
4. Evita strings hardcoded espalhadas pelo código
5. Autocomplete e type-safety com TypeScript

**Como usar:**
```typescript
import { pt, t } from '@/lib/i18n';

// Opção 1: Acesso direto
<h1>{pt.portaria.title}</h1>

// Opção 2: Usando função helper
<h1>{t('portaria.title')}</h1>

// Opção 3: Desestruturação
const { portaria } = pt;
<h1>{portaria.title}</h1>
```

---

## 4. Recomendações

### 4.1. Backend - ATENÇÃO: NÃO MUDAR OS CAMPOS EXISTENTES

⚠️ **IMPORTANTE:** Os campos do backend **NÃO devem ser renomeados** neste momento pelos seguintes motivos:

1. **Banco de dados já existente**: Mudar os nomes dos campos nos models requer migrations complexas
2. **API em produção**: Mudanças quebrariam a compatibilidade com clientes existentes
3. **Impacto em todo o sistema**: Afetaria todos os módulos que usam esses models
4. **Risco vs Benefício**: O risco de quebrar funcionalidades é muito alto

### 4.2. Estratégia Recomendada

#### Para NOVOS models/campos:
✅ Usar nomes em INGLÊS desde o início

#### Para models EXISTENTES:
✅ Manter nomes em português nos campos de banco de dados
✅ Adicionar aliases em inglês nos schemas (opcional)
✅ Documentar o padrão atual
✅ Planejar migração gradual se necessário no futuro

#### Exemplo de uso de aliases (futuro):
```python
# Schema com alias
class GrupoAcessoResponse(BaseModel):
    codigo: str = Field(..., alias="code")
    nome: str = Field(..., alias="name")

    class Config:
        populate_by_name = True  # Aceita ambos os nomes
```

### 4.3. Frontend - Usar o arquivo i18n.ts

✅ **Adotar o uso do arquivo de constantes criado:**

1. Substituir strings hardcoded por constantes do i18n.ts
2. Usar imports consistentes em todo o projeto
3. Adicionar novas traduções conforme necessário
4. Manter organização por módulos

**Exemplo de refatoração:**

**Antes:**
```typescript
<h1>Controle de Portaria</h1>
<button>Salvar</button>
```

**Depois:**
```typescript
import { pt } from '@/lib/i18n';

<h1>{pt.portaria.title}</h1>
<button>{pt.comum.salvar}</button>
```

### 4.4. Novos Desenvolvimentos

Para NOVOS módulos/features:

1. **Backend:**
   - Usar nomes de campos em INGLÊS
   - Seguir convenções: snake_case para Python
   - Exemplos: `visitor_name`, `entry_date`, `is_active`

2. **Frontend:**
   - Adicionar textos em PT-BR no arquivo i18n.ts primeiro
   - Usar as constantes nos componentes
   - Manter nomes de variáveis em inglês quando apropriado

---

## 5. Próximos Passos (Opcional - Longo Prazo)

Se no futuro a equipe decidir padronizar completamente o backend:

### 5.1. Planejamento de Migração
1. Criar script de análise de impacto
2. Mapear todas as dependências
3. Criar migrations de banco de dados
4. Implementar aliases temporários para retrocompatibilidade
5. Atualizar documentação da API
6. Versionar a API (v2) se necessário

### 5.2. Cronograma Sugerido
1. **Fase 1:** Novos campos sempre em inglês (imediato)
2. **Fase 2:** Adicionar aliases nos schemas existentes (1-2 meses)
3. **Fase 3:** Criar migrations para renomear campos (3-6 meses)
4. **Fase 4:** Remover aliases e deprecar nomes antigos (6-12 meses)

---

## 6. Resumo Executivo

### Situação Atual
- ❌ Backend: Campos em PORTUGUÊS (inconsistente com padrão definido)
- ✅ Frontend: Textos em PORTUGUÊS (correto)
- ✅ Arquivo i18n.ts criado com sucesso

### Decisão Estratégica
- **NÃO alterar campos existentes** no backend (risco muito alto)
- **Documentar o estado atual** (este relatório)
- **Usar arquivo i18n.ts** no frontend para centralizar textos
- **Novos desenvolvimentos** devem seguir o padrão (backend em inglês)

### Arquivos Criados
1. `/home/pedro/Downloads/agente_administrativo/app/src/lib/i18n.ts` - Constantes de tradução
2. `/home/pedro/Downloads/agente_administrativo/INTERNACIONALIZACAO_RELATORIO.md` - Este relatório

### Ações Imediatas Recomendadas
1. ✅ Usar arquivo i18n.ts em novos componentes frontend
2. ✅ Refatorar componentes existentes gradualmente
3. ✅ Adicionar lint rule para evitar strings hardcoded
4. ✅ Documentar padrão no README do projeto
5. ✅ Para novos models: usar campos em inglês

---

## 7. Referências

- **Models analisados:** `/home/pedro/Downloads/agente_administrativo/backend/app/models/portaria.py`
- **Schemas analisados:** `/home/pedro/Downloads/agente_administrativo/backend/app/schemas/portaria.py`
- **Frontend analisado:** `/home/pedro/Downloads/agente_administrativo/app/src/app/(authenticated)/portaria/`
- **Arquivo i18n:** `/home/pedro/Downloads/agente_administrativo/app/src/lib/i18n.ts`

---

**Gerado em:** 2025-12-22
**Por:** Claude Code - Análise de Internacionalização
