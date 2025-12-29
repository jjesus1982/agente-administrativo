# Documentação do Conecta Plus

Documentação técnica completa do sistema Conecta Plus.

---

## Índice de Documentos

### Documentação de Deploy

- **[DEPLOY.md](./DEPLOY.md)** - Guia completo de deploy para produção
  - Requisitos de hardware e software
  - Configuração de ambiente
  - Deploy com Docker
  - Deploy em Cloud (AWS, GCP, Azure)
  - Variáveis de ambiente
  - SSL/HTTPS com Let's Encrypt
  - Backup e recuperação
  - Monitoramento e observabilidade
  - Troubleshooting

### Referências Rápidas

- **[COMANDOS_UTEIS.md](./COMANDOS_UTEIS.md)** - Referência de comandos úteis
  - Docker e Docker Compose
  - PostgreSQL
  - Redis
  - Alembic (migrations)
  - API testing
  - Nginx
  - SSL/Certbot
  - Monitoramento
  - Troubleshooting
  - Scripts personalizados

### Exemplos de Configuração

- **[nginx-example.conf](./nginx-example.conf)** - Configuração completa do Nginx
  - Proxy reverso
  - SSL/TLS
  - Rate limiting
  - Cache
  - Compressão
  - Security headers
  - Múltiplos domínios

- **[docker-compose.full-stack.yml](./docker-compose.full-stack.yml)** - Stack completa Docker
  - API Backend
  - PostgreSQL
  - Redis
  - Nginx
  - Certbot
  - Prometheus
  - Grafana
  - Backup automatizado

### Scripts de Automação

Localizados em `/scripts/`:

- **[backup-db.sh](../scripts/backup-db.sh)** - Backup automatizado do PostgreSQL
- **[restore-db.sh](../scripts/restore-db.sh)** - Restauração de backups
- **[deploy.sh](../scripts/deploy.sh)** - Deploy automatizado

---

## Guia de Início Rápido

### Para Desenvolvimento Local

```bash
cd /opt/conecta-plus/backend

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Subir serviços
docker compose up -d

# Executar migrations
docker compose exec api alembic upgrade head

# Acessar documentação da API
http://localhost:8100/docs
```

### Para Produção

```bash
# 1. Preparar servidor
# Seguir seção "2. Configuração de Ambiente" em DEPLOY.md

# 2. Configurar variáveis
cp .env.example .env.production
# Editar .env.production (ver DEPLOY.md seção 5)

# 3. Deploy automatizado
/opt/conecta-plus/scripts/deploy.sh

# 4. Configurar Nginx e SSL
# Seguir seções 3.8 e 6 em DEPLOY.md
```

---

## Estrutura do Projeto

```
conecta-plus/
├── backend/                      # API Backend
│   ├── app/                      # Código da aplicação
│   ├── alembic/                  # Migrations
│   ├── tests/                    # Testes
│   ├── Dockerfile                # Imagem Docker
│   ├── docker-compose.yml        # Docker Compose (dev)
│   ├── docker-compose.prod.yml   # Docker Compose (prod)
│   ├── requirements.txt          # Dependências Python
│   └── .env.example              # Exemplo de variáveis
│
├── docs/                         # Documentação (você está aqui)
│   ├── DEPLOY.md                 # Guia de deploy
│   ├── COMANDOS_UTEIS.md         # Comandos úteis
│   ├── nginx-example.conf        # Exemplo Nginx
│   └── docker-compose.full-stack.yml
│
└── scripts/                      # Scripts de automação
    ├── backup-db.sh              # Backup do DB
    ├── restore-db.sh             # Restore do DB
    └── deploy.sh                 # Deploy automatizado
```

---

## Arquitetura

### Stack Tecnológico

**Backend:**
- Python 3.12
- FastAPI
- PostgreSQL 16
- Redis 7
- SQLAlchemy (async)
- Alembic (migrations)
- Pydantic (validação)

**Infraestrutura:**
- Docker & Docker Compose
- Nginx (proxy reverso)
- Gunicorn + Uvicorn workers
- Let's Encrypt (SSL)

**Monitoramento:**
- Prometheus (métricas)
- Grafana (dashboards)
- Health checks (live/ready)

### Fluxo de Requisição

```
Cliente
  ↓
Nginx (SSL, rate limit, cache)
  ↓
Gunicorn (load balancer)
  ↓
Uvicorn Workers (4x)
  ↓
FastAPI Application
  ↓
├─→ PostgreSQL (dados persistentes)
└─→ Redis (cache, sessions)
```

---

## Ambientes

### Desenvolvimento

- `DEBUG=true`
- Logs detalhados
- Hot reload habilitado
- Porta: 8000
- Docker Compose: `docker-compose.yml`

### Staging (opcional)

- `ENVIRONMENT=staging`
- Logs em nível INFO
- Dados de teste
- Docker Compose: `docker-compose.staging.yml`

### Produção

- `DEBUG=false`
- `ENVIRONMENT=production`
- Logs em nível WARNING
- HTTPS obrigatório
- Rate limiting habilitado
- Docker Compose: `docker-compose.prod.yml`

---

## Configuração de Variáveis de Ambiente

### Prioridade de Configuração

1. Variáveis de ambiente do sistema
2. Arquivo `.env` (ou `.env.production`)
3. Valores padrão no código

### Variáveis Críticas

Estas **DEVEM** ser alteradas em produção:

```env
SECRET_KEY=            # Gerar com: python -c "import secrets; print(secrets.token_urlsafe(64))"
DB_PASSWORD=           # Senha forte do PostgreSQL
DEBUG=false            # NUNCA true em produção
ALLOWED_ORIGINS=       # Lista de domínios permitidos
```

Consulte [DEPLOY.md - Seção 5](./DEPLOY.md#5-variáveis-de-ambiente) para lista completa.

---

## Monitoramento e Observabilidade

### Health Checks

- **Liveness**: `/health/live` - Container está vivo?
- **Readiness**: `/health/ready` - Pronto para receber requisições? (verifica DB + Redis)
- **Basic**: `/health` - Health check simples

### Métricas

- **Endpoint**: `/metrics` (formato Prometheus)
- **Dashboard**: http://localhost:9090 (Prometheus)
- **Visualização**: http://localhost:3001 (Grafana)

### Logs

Formato JSON estruturado:

```json
{
  "timestamp": "2025-01-22T10:30:45.123Z",
  "level": "INFO",
  "message": "Request completed",
  "method": "GET",
  "path": "/api/v1/users",
  "status": 200,
  "duration_ms": 45
}
```

---

## Backup e Recuperação

### Estratégia de Backup

- **Frequência**: Diário (3h da manhã)
- **Retenção**: 7 dias local, 30 dias cloud
- **Tipo**: Full dump do PostgreSQL (comprimido)
- **Automação**: Cron job + script bash

### Executar Backup Manual

```bash
/opt/conecta-plus/scripts/backup-db.sh
```

### Restaurar Backup

```bash
/opt/conecta-plus/scripts/restore-db.sh /caminho/para/backup.sql.gz
```

Consulte [DEPLOY.md - Seção 7](./DEPLOY.md#7-backup-e-recuperação) para detalhes.

---

## Segurança

### Checklist de Segurança

- [ ] `DEBUG=false` em produção
- [ ] Secret key gerada aleatoriamente
- [ ] Senhas fortes para DB e Redis
- [ ] HTTPS habilitado (Let's Encrypt)
- [ ] Rate limiting configurado
- [ ] CORS configurado corretamente
- [ ] Cookies seguros (`SECURE_COOKIES=true`)
- [ ] Security headers no Nginx
- [ ] Portas do DB/Redis não expostas publicamente
- [ ] Firewall configurado (UFW)
- [ ] Backups funcionando
- [ ] Logs sendo monitorados

### Security Headers

Configurados no Nginx:

- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options`
- `X-XSS-Protection`
- `Referrer-Policy`
- `Content-Security-Policy`

---

## Troubleshooting

### Problemas Comuns

1. **API não inicia**
   - Verificar logs: `docker compose logs api`
   - Verificar DB está pronto: `docker compose exec db pg_isready`
   - Verificar variáveis: `docker compose exec api env`

2. **Erro 502 Bad Gateway**
   - Verificar API está rodando: `curl http://localhost:8100/health`
   - Verificar logs Nginx: `sudo tail -f /var/log/nginx/error.log`
   - Verificar upstream: `netstat -tulpn | grep 8100`

3. **Performance lenta**
   - Ver uso de recursos: `docker stats`
   - Verificar conexões DB: `docker compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity"`
   - Limpar cache Redis: `docker compose exec redis redis-cli FLUSHDB`

Consulte [DEPLOY.md - Seção 9](./DEPLOY.md#9-troubleshooting) e [COMANDOS_UTEIS.md](./COMANDOS_UTEIS.md) para mais soluções.

---

## Suporte e Recursos

### Documentação Online

- FastAPI: https://fastapi.tiangolo.com/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/docs/
- Docker: https://docs.docker.com/
- Nginx: https://nginx.org/en/docs/

### Ferramentas Úteis

- **Documentação API**: http://localhost:8100/docs (Swagger UI)
- **ReDoc**: http://localhost:8100/redoc
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001

### Contato

Em caso de problemas críticos:

1. Consultar documentação nesta pasta
2. Verificar logs e health checks
3. Contactar equipe de desenvolvimento

---

## Atualizações

### Histórico de Versões

- **v1.0.0** (2025-01-22)
  - Versão inicial da documentação
  - Guia completo de deploy
  - Scripts de automação
  - Exemplos de configuração

### Como Contribuir

1. Mantenha a documentação atualizada
2. Adicione novos comandos úteis ao COMANDOS_UTEIS.md
3. Documente mudanças importantes
4. Atualize exemplos de configuração conforme necessário

---

**Última atualização**: 2025-01-22
**Versão**: 1.0.0
**Projeto**: Conecta Plus
