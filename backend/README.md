# Conecta Plus - Plataforma Unificada

Plataforma completa para portaria remota e controle de acesso.

## 🏗️ Arquitetura

```
conecta_plus/
├── agent_tecnico/      # 🧠 Cérebro - Inteligência técnica
│   ├── schemas.py      # Modelos de dados
│   ├── prompts.py      # Prompts para LLM
│   ├── llm_client.py   # Clientes OpenAI/Claude
│   ├── agent.py        # Núcleo do agente
│   └── api.py          # Endpoints REST
│
├── campo/              # 🔧 Braço - Conecta Fielder
│   ├── schemas.py      # JobTemplate, JobInstance, Steps
│   └── api.py          # Endpoints de campo
│
├── knowledge/          # 📚 Memória - Base de conhecimento
│   └── api.py          # FAQ, histórico, busca
│
└── main.py             # 🚀 API Unificada
```

## 🚀 Deploy Rápido na VPS

### 1. Extrair e configurar

```bash
cd /opt
unzip conecta_plus_full.zip
cd conecta_plus_full
```

### 2. Criar ambiente virtual

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configurar variáveis

```bash
cp .env.example .env
nano .env
# Configure sua OPENAI_API_KEY ou ANTHROPIC_API_KEY
```

### 4. Testar manualmente

```bash
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000
# Ctrl+C para parar
```

### 5. Configurar como serviço

```bash
# Editar o arquivo de serviço com sua API key
nano deploy/conecta-plus.service

# Copiar para systemd
sudo cp deploy/conecta-plus.service /etc/systemd/system/

# Ativar e iniciar
sudo systemctl daemon-reload
sudo systemctl enable conecta-plus
sudo systemctl start conecta-plus

# Verificar status
sudo systemctl status conecta-plus
```

### 6. Testar

```bash
curl http://localhost:8000/health
```

## 📡 Endpoints Disponíveis

### Agente Técnico (`/api/agente-tecnico`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/topologia` | POST | Gera topologia de rede |
| `/lista-materiais` | POST | Gera Bill of Materials |
| `/checklists` | POST | Gera checklists técnicos |
| `/template-config` | POST | Template de configuração |
| `/fluxo-instalacao` | POST | Roteiro de instalação |
| `/esquema-bornes` | POST | Esquema de ligação |
| `/documentacao-itil` | POST | Documentação ITIL |
| `/troubleshooting` | POST | Guia de troubleshooting |
| `/job-template` | POST | **Gera JobTemplate para campo** |
| `/consulta` | POST | Consulta técnica livre |

### Conecta Fielder (`/api/campo`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/job-templates` | POST | Criar template |
| `/job-templates` | GET | Listar templates |
| `/jobs/from-template` | POST | Criar job de OS |
| `/jobs` | GET | Listar jobs |
| `/jobs/{id}` | GET | Buscar job |
| `/jobs/{id}` | PATCH | Atualizar job |
| `/jobs/{id}/steps` | GET | Listar steps |
| `/jobs/{id}/steps/{step}` | PATCH | Atualizar step |
| `/jobs/{id}/report` | GET | Relatório do job |
| `/dashboard/summary` | GET | Dashboard geral |

### Base de Conhecimento (`/api/knowledge`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/artigos` | POST | Criar artigo |
| `/artigos` | GET | Listar artigos |
| `/faq` | GET | FAQ por fabricante |
| `/historico` | POST | Registrar atendimento |
| `/historico` | GET | Listar histórico |
| `/busca` | GET | Busca inteligente |

## 🔄 Fluxo Completo

```
1. PROJETO
   └─> Agente Técnico gera topologia
   └─> Agente Técnico gera JobTemplate
   
2. CAMPO
   └─> Fielder recebe JobTemplate
   └─> Cria JobInstance (OS)
   └─> Técnico executa steps
   └─> Registra evidências
   
3. PÓS
   └─> Gera relatório
   └─> Alimenta base de conhecimento
```

## 📝 Exemplo: Criar Job de Instalação

### 1. Gerar JobTemplate via Agente

```bash
curl -X POST http://localhost:8000/api/agente-tecnico/job-template \
  -H "Content-Type: application/json" \
  -d '{
    "condominio": {
      "nome": "Residencial Solar",
      "tipo_ambiente": "residencial",
      "cidade": "São Paulo",
      "estado": "SP",
      "numero_torres": 2,
      "quantidade_unidades": 120,
      "acessos": [
        {"nome": "Portão Social", "tipo": "pedestre", "possui_leitor_facial": true},
        {"nome": "Portão Veículos", "tipo": "veicular", "possui_cancela": true}
      ]
    },
    "tipo_job": "instalacao",
    "prioridade": "alta"
  }'
```

### 2. Salvar JobTemplate no Fielder

```bash
curl -X POST http://localhost:8000/api/campo/job-templates \
  -H "Content-Type: application/json" \
  -d '<JSON retornado acima>'
```

### 3. Criar Job (OS) a partir do Template

```bash
curl -X POST http://localhost:8000/api/campo/jobs/from-template \
  -H "Content-Type: application/json" \
  -d '{
    "template_id": "tmpl_xxx",
    "technician_id": "tec_001",
    "technician_name": "João Silva",
    "os_number": "OS-2024-001"
  }'
```

### 4. Técnico atualiza step

```bash
curl -X PATCH http://localhost:8000/api/campo/jobs/job_xxx/steps/step_xxx \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "checklist_answers": [
      {"item_code": "INF-001", "value": true, "notes": "OK verificado"}
    ]
  }'
```

## 🔧 Portas na VPS

| Serviço | Porta | Status |
|---------|-------|--------|
| **Conecta Plus (este)** | **8000** | ✅ |
| Portaria Autônoma | 8001 | ✅ |
| Agente Técnico v1 | 8002 | ✅ |
| Agente Técnico v2 | 8003 | ✅ |

## 📖 Documentação

Acesse `/docs` para documentação Swagger interativa.

---

Desenvolvido para Conecta Plus
