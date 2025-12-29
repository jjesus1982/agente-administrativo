# Deploy para Produção - Conecta Plus

## Sumário
1. [Requisitos](#1-requisitos)
2. [Configuração de Ambiente](#2-configuração-de-ambiente)
3. [Deploy com Docker](#3-deploy-com-docker)
4. [Deploy em Cloud](#4-deploy-em-cloud)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [SSL/HTTPS](#6-sslhttps)
7. [Backup e Recuperação](#7-backup-e-recuperação)
8. [Monitoramento](#8-monitoramento)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Requisitos

### Requisitos Mínimos de Hardware

#### Servidor de Aplicação
- **CPU**: 2 cores (4 cores recomendado)
- **RAM**: 4 GB (8 GB recomendado)
- **Disco**: 50 GB SSD
- **Rede**: 100 Mbps

#### Servidor de Banco de Dados (se separado)
- **CPU**: 2 cores (4 cores recomendado)
- **RAM**: 4 GB (8 GB recomendado)
- **Disco**: 100 GB SSD (com I/O otimizado)

### Software Necessário

- **Docker**: 24.0+
- **Docker Compose**: 2.20+
- **PostgreSQL**: 16+ (se instalado diretamente)
- **Redis**: 7+ (se instalado diretamente)
- **Nginx**: 1.24+ (para proxy reverso)
- **Git**: Para clone do repositório
- **Certbot**: Para certificados SSL (Let's Encrypt)

### Domínio e DNS

- Domínio registrado e configurado
- Registros DNS apontando para o servidor:
  ```
  A     api.seudominio.com.br    -> IP_DO_SERVIDOR
  A     seudominio.com.br        -> IP_DO_SERVIDOR
  AAAA  api.seudominio.com.br    -> IPv6 (opcional)
  ```

### Certificado SSL

- Certificado válido (Let's Encrypt ou comercial)
- Configuração HTTPS obrigatória para produção

---

## 2. Configuração de Ambiente

### 2.1 Preparação do Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git vim htop net-tools

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalações
docker --version
docker-compose --version
```

### 2.2 Clone do Repositório

```bash
# Criar diretório de aplicações
sudo mkdir -p /opt/conecta-plus
sudo chown $USER:$USER /opt/conecta-plus

# Clonar repositório
cd /opt/conecta-plus
git clone https://github.com/seu-usuario/conecta-plus.git .

# Ou fazer upload manual via SCP/SFTP
```

### 2.3 Variáveis de Ambiente - Backend

Crie o arquivo `.env.production` no diretório `backend/`:

```bash
cd /opt/conecta-plus/backend
cp .env.example .env.production
```

Edite `.env.production`:

```env
# =============================================================================
# APP CONFIGURATION
# =============================================================================
APP_NAME="Conecta Plus API"
APP_VERSION="1.0.0"
DEBUG=false
ENVIRONMENT=production

# =============================================================================
# API CONFIGURATION
# =============================================================================
API_PREFIX=/api/v1
ALLOWED_ORIGINS=["https://seudominio.com.br","https://www.seudominio.com.br"]

# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgresql+asyncpg://postgres:SUA_SENHA_SEGURA_DB@db:5432/conecta_plus
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800

# =============================================================================
# REDIS
# =============================================================================
REDIS_URL=redis://redis:6379/0
REDIS_MAX_CONNECTIONS=10
CACHE_TTL_SECONDS=300

# =============================================================================
# JWT / SECURITY
# IMPORTANTE: Gere uma chave segura com:
# python -c "import secrets; print(secrets.token_urlsafe(64))"
# =============================================================================
SECRET_KEY=GERE_UMA_CHAVE_SEGURA_AQUI_COM_64_CARACTERES_MINIMO
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# =============================================================================
# RATE LIMITING
# =============================================================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
RATE_LIMIT_AUTH_REQUESTS=5
RATE_LIMIT_AUTH_WINDOW=300

# =============================================================================
# SECURITY
# =============================================================================
CORS_ALLOW_CREDENTIALS=true
CORS_MAX_AGE=600
SECURE_COOKIES=true
TRUSTED_HOSTS=["api.seudominio.com.br"]

# =============================================================================
# MINIO / S3 (se usar)
# =============================================================================
MINIO_ENDPOINT=s3.amazonaws.com
MINIO_ACCESS_KEY=sua_access_key
MINIO_SECRET_KEY=sua_secret_key
MINIO_BUCKET=conecta-plus-prod
MINIO_SECURE=true
MINIO_PUBLIC_URL=https://s3.amazonaws.com/conecta-plus-prod

# =============================================================================
# EMAIL / SMTP
# =============================================================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-app
SMTP_FROM_EMAIL=noreply@seudominio.com.br
SMTP_USE_TLS=true

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=WARNING
LOG_FORMAT=json
LOG_FILE=/app/logs/app.log

# =============================================================================
# PAGINATION
# =============================================================================
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# =============================================================================
# FILE UPLOAD
# =============================================================================
MAX_UPLOAD_SIZE=10485760

# =============================================================================
# GUNICORN (Production)
# =============================================================================
GUNICORN_WORKERS=4
GUNICORN_BIND=0.0.0.0:8100
GUNICORN_LOG_LEVEL=warning

# =============================================================================
# PROMETHEUS METRICS
# =============================================================================
ENABLE_METRICS=true
```

### 2.4 Arquivo de Senhas Docker

Crie `.env` na raiz do projeto para senhas do Docker Compose:

```bash
cd /opt/conecta-plus/backend
vim .env
```

Conteúdo:

```env
# Senhas para Docker Compose
DB_PASSWORD=SUA_SENHA_POSTGRESQL_SUPER_SEGURA
SECRET_KEY=SUA_CHAVE_JWT_SUPER_SEGURA_64_CHARS
GRAFANA_PASSWORD=SUA_SENHA_GRAFANA
```

### 2.5 Gerar Secret Key Segura

```bash
# Gerar SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# Gerar senha aleatória forte
openssl rand -base64 32
```

---

## 3. Deploy com Docker

### 3.1 Estrutura Docker Compose Produção

O arquivo `docker-compose.prod.yml` já está configurado com:

- **API Backend** (Gunicorn + FastAPI)
- **PostgreSQL 16** com otimizações de performance
- **Redis 7** com persistência
- **Prometheus** (opcional, profile monitoring)
- **Grafana** (opcional, profile monitoring)

### 3.2 Criar Rede e Volumes

```bash
cd /opt/conecta-plus/backend

# Criar rede Docker
docker network create conecta-network 2>/dev/null || true

# Criar volumes persistentes
docker volume create postgres_data
docker volume create redis_data
```

### 3.3 Build das Imagens

```bash
# Build da imagem da API
docker compose -f docker-compose.prod.yml build --no-cache

# Verificar imagem criada
docker images | grep conecta
```

### 3.4 Iniciar Serviços

```bash
# Subir serviços essenciais (sem monitoring)
docker compose -f docker-compose.prod.yml up -d

# OU subir com monitoring (Prometheus + Grafana)
docker compose -f docker-compose.prod.yml --profile monitoring up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps

# Verificar logs
docker compose -f docker-compose.prod.yml logs -f api
```

### 3.5 Executar Migrations

```bash
# Executar migrations do Alembic
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Verificar versão atual
docker compose -f docker-compose.prod.yml exec api alembic current
```

### 3.6 Seed de Dados (Primeira Instalação)

```bash
# Executar seed de dados iniciais
docker compose -f docker-compose.prod.yml exec api python scripts/seed_data.py

# OU se tiver script específico
docker compose -f docker-compose.prod.yml exec api python -m app.scripts.seed
```

### 3.7 Verificar Health Checks

```bash
# Health check básico
curl http://localhost:8100/health

# Health check completo (ready)
curl http://localhost:8100/health/ready

# Health check liveness
curl http://localhost:8100/health/live

# Verificar métricas
curl http://localhost:8100/metrics
```

### 3.8 Configurar Nginx como Proxy Reverso

Crie o arquivo `/etc/nginx/sites-available/conecta-plus`:

```nginx
upstream conecta_api {
    server localhost:8100;
    keepalive 64;
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.seudominio.com.br;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS - API Backend
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.seudominio.com.br;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.seudominio.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/conecta-api-access.log;
    error_log /var/log/nginx/conecta-api-error.log;

    # Client body size (para uploads)
    client_max_body_size 10M;

    # Proxy para API
    location / {
        proxy_pass http://conecta_api;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health checks sem logs excessivos
    location ~ ^/health {
        proxy_pass http://conecta_api;
        access_log off;
    }
}
```

Ativar site:

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/conecta-plus /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 4. Deploy em Cloud

### 4.1 AWS (ECS/Fargate)

#### Pré-requisitos
- AWS CLI instalado e configurado
- ECR (Elastic Container Registry) configurado
- RDS PostgreSQL criado
- ElastiCache Redis criado

#### Passos

1. **Build e Push da Imagem para ECR**

```bash
# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag da imagem
docker tag conecta-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/conecta-api:latest

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/conecta-api:latest
```

2. **Task Definition (task-definition.json)**

```json
{
  "family": "conecta-plus-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "conecta-api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/conecta-api:latest",
      "portMappings": [
        {
          "containerPort": 8100,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        },
        {
          "name": "DEBUG",
          "value": "false"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:conecta/db-url"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:conecta/secret-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/conecta-plus",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8100/health/live || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

3. **Criar ECS Service**

```bash
aws ecs create-service \
  --cluster conecta-plus-cluster \
  --service-name conecta-api-service \
  --task-definition conecta-plus-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/conecta-tg,containerName=conecta-api,containerPort=8100"
```

### 4.2 Google Cloud Run

```bash
# Build e push para GCR
gcloud builds submit --tag gcr.io/seu-projeto/conecta-api

# Deploy
gcloud run deploy conecta-api \
  --image gcr.io/seu-projeto/conecta-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "ENVIRONMENT=production,DEBUG=false" \
  --set-secrets "DATABASE_URL=conecta-db-url:latest,SECRET_KEY=conecta-secret:latest"
```

### 4.3 Azure Container Apps

```bash
# Login
az login

# Criar resource group
az group create --name conecta-plus-rg --location eastus

# Criar container app environment
az containerapp env create \
  --name conecta-env \
  --resource-group conecta-plus-rg \
  --location eastus

# Deploy
az containerapp create \
  --name conecta-api \
  --resource-group conecta-plus-rg \
  --environment conecta-env \
  --image seu-registry.azurecr.io/conecta-api:latest \
  --target-port 8100 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars "ENVIRONMENT=production" "DEBUG=false" \
  --secrets "db-url=seu-connection-string" "secret-key=sua-chave"
```

### 4.4 Deploy em VPS (DigitalOcean, Linode, Vultr)

```bash
# 1. Conectar ao servidor
ssh root@seu-ip

# 2. Seguir passos da seção 2 (Preparação do Servidor)

# 3. Clonar repositório
cd /opt
git clone https://github.com/seu-usuario/conecta-plus.git
cd conecta-plus/backend

# 4. Configurar .env
cp .env.example .env.production
vim .env.production

# 5. Subir com Docker Compose
docker compose -f docker-compose.prod.yml up -d

# 6. Configurar Nginx (ver seção 3.8)

# 7. Configurar SSL (ver seção 6)
```

---

## 5. Variáveis de Ambiente

### 5.1 Variáveis Críticas de Segurança

Estas variáveis **DEVEM** ser alteradas em produção:

| Variável | Descrição | Como Gerar |
|----------|-----------|------------|
| `SECRET_KEY` | Chave para JWT e criptografia | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DB_PASSWORD` | Senha do PostgreSQL | `openssl rand -base64 32` |
| `REDIS_PASSWORD` | Senha do Redis (opcional) | `openssl rand -base64 24` |

### 5.2 Variáveis de Database

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/database
DB_POOL_SIZE=20              # Conexões no pool
DB_MAX_OVERFLOW=10           # Conexões extras permitidas
DB_POOL_TIMEOUT=30           # Timeout para obter conexão
DB_POOL_RECYCLE=1800         # Reciclar conexões após 30min
```

### 5.3 Variáveis de Performance

```env
GUNICORN_WORKERS=4           # Número de workers (2-4 x CPU cores)
REDIS_MAX_CONNECTIONS=10     # Pool de conexões Redis
CACHE_TTL_SECONDS=300        # TTL padrão do cache (5min)
```

### 5.4 Variáveis de Segurança

```env
DEBUG=false                  # NUNCA true em produção
ENVIRONMENT=production
SECURE_COOKIES=true          # Cookies apenas HTTPS
CORS_ALLOW_CREDENTIALS=true
ALLOWED_ORIGINS=["https://seudominio.com.br"]
TRUSTED_HOSTS=["api.seudominio.com.br"]
RATE_LIMIT_ENABLED=true
```

### 5.5 Checklist de Configuração

- [ ] `DEBUG=false`
- [ ] `SECRET_KEY` gerada aleatoriamente
- [ ] Senhas fortes para DB e Redis
- [ ] `ALLOWED_ORIGINS` configurado corretamente
- [ ] `SECURE_COOKIES=true`
- [ ] SMTP configurado para emails
- [ ] Logs em nível WARNING ou ERROR
- [ ] Rate limiting habilitado

---

## 6. SSL/HTTPS

### 6.1 Obter Certificado com Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado (método standalone - parar Nginx temporariamente)
sudo systemctl stop nginx
sudo certbot certonly --standalone -d api.seudominio.com.br -d seudominio.com.br
sudo systemctl start nginx

# OU método webroot (sem parar Nginx)
sudo certbot certonly --webroot -w /var/www/certbot -d api.seudominio.com.br
```

### 6.2 Renovação Automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# Configurar cron para renovação automática
sudo crontab -e
```

Adicionar linha:

```cron
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 6.3 Configuração SSL Nginx (já incluída na seção 3.8)

Principais pontos:
- TLS 1.2 e 1.3 apenas
- Ciphers seguros
- HSTS habilitado
- Redirecionamento HTTP → HTTPS

### 6.4 Verificar Configuração SSL

```bash
# Testar SSL
curl -vI https://api.seudominio.com.br

# Verificar certificado
openssl s_client -connect api.seudominio.com.br:443 -servername api.seudominio.com.br

# Testar com SSL Labs (online)
# https://www.ssllabs.com/ssltest/
```

---

## 7. Backup e Recuperação

### 7.1 Backup do PostgreSQL

#### Script de Backup Automatizado

Criar `/opt/conecta-plus/scripts/backup-db.sh`:

```bash
#!/bin/bash

# Configurações
BACKUP_DIR="/opt/conecta-plus/backups"
DB_CONTAINER="conecta-db"
DB_NAME="conecta_plus"
DB_USER="postgres"
RETENTION_DAYS=7

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Nome do arquivo com timestamp
BACKUP_FILE="$BACKUP_DIR/conecta_plus_$(date +%Y%m%d_%H%M%S).sql.gz"

# Executar backup
echo "Iniciando backup do banco de dados..."
docker exec -t "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verificar sucesso
if [ $? -eq 0 ]; then
    echo "Backup concluído: $BACKUP_FILE"

    # Remover backups antigos
    find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
    echo "Backups antigos (>$RETENTION_DAYS dias) removidos."
else
    echo "ERRO: Backup falhou!"
    exit 1
fi

# Upload para S3 (opcional)
# aws s3 cp "$BACKUP_FILE" s3://seu-bucket/backups/

# Estatísticas
ls -lh "$BACKUP_FILE"
```

Tornar executável:

```bash
chmod +x /opt/conecta-plus/scripts/backup-db.sh
```

#### Agendar Backup Diário

```bash
sudo crontab -e
```

Adicionar:

```cron
# Backup diário às 3h da manhã
0 3 * * * /opt/conecta-plus/scripts/backup-db.sh >> /var/log/conecta-backup.log 2>&1
```

### 7.2 Restaurar Backup

```bash
# Parar API
docker compose -f docker-compose.prod.yml stop api

# Restaurar banco
gunzip -c /opt/conecta-plus/backups/conecta_plus_20250122_030000.sql.gz | \
  docker exec -i conecta-db psql -U postgres -d conecta_plus

# Reiniciar API
docker compose -f docker-compose.prod.yml start api
```

### 7.3 Backup de Volumes Docker

```bash
# Backup do volume PostgreSQL
docker run --rm \
  -v postgres_data:/data \
  -v /opt/conecta-plus/backups:/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz /data

# Backup do volume Redis
docker run --rm \
  -v redis_data:/data \
  -v /opt/conecta-plus/backups:/backup \
  alpine tar czf /backup/redis_volume_$(date +%Y%m%d).tar.gz /data
```

### 7.4 Backup para Cloud Storage

#### AWS S3

```bash
# Instalar AWS CLI
sudo apt install awscli -y

# Configurar
aws configure

# Upload de backup
aws s3 cp /opt/conecta-plus/backups/ s3://seu-bucket/conecta-plus/backups/ --recursive

# Sincronização automática
aws s3 sync /opt/conecta-plus/backups/ s3://seu-bucket/conecta-plus/backups/
```

#### Google Cloud Storage

```bash
# Instalar gcloud
curl https://sdk.cloud.google.com | bash

# Upload
gsutil cp /opt/conecta-plus/backups/*.sql.gz gs://seu-bucket/conecta-plus/backups/
```

### 7.5 Estratégia de Backup Completa

Recomendações:
- **Backup diário** do banco de dados (3h da manhã)
- **Backup semanal** dos volumes Docker (domingos)
- **Retenção**: 7 dias local, 30 dias em cloud
- **Teste de restauração** mensal
- **Backup antes de deploys** importantes

---

## 8. Monitoramento

### 8.1 Health Checks

A API fornece três endpoints de health check:

```bash
# Health básico
curl http://localhost:8100/health
# Retorna: {"status": "ok"}

# Readiness check (verifica DB e Redis)
curl http://localhost:8100/health/ready
# Retorna: {
#   "status": "ready",
#   "database": "connected",
#   "redis": "connected"
# }

# Liveness check
curl http://localhost:8100/health/live
# Retorna: {"status": "alive"}
```

### 8.2 Métricas com Prometheus

#### Configuração Prometheus

Arquivo `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'conecta-api'
    static_configs:
      - targets: ['api:8100']
    metrics_path: '/metrics'
```

#### Métricas Disponíveis

Acesse `http://localhost:8100/metrics` para ver:

- Request count
- Request duration
- Response status codes
- Database pool status
- Redis connection status
- Sistema operacional (CPU, memória)

#### Executar com Monitoring

```bash
# Subir com Prometheus e Grafana
docker compose -f docker-compose.prod.yml --profile monitoring up -d

# Acessar Prometheus
http://seu-servidor:9090

# Acessar Grafana
http://seu-servidor:3001
# Login: admin / senha-configurada-no-.env
```

### 8.3 Configurar Grafana

1. **Adicionar Data Source**
   - URL: `http://prometheus:9090`
   - Access: Server (default)

2. **Importar Dashboard**
   - Dashboard ID: 1860 (Node Exporter)
   - Dashboard ID: 12708 (FastAPI)

3. **Criar Alertas**
   - CPU > 80%
   - Memória > 80%
   - Erro 5xx > 10/min
   - Response time > 2s

### 8.4 Logs

#### Visualizar Logs

```bash
# Logs da API
docker compose -f docker-compose.prod.yml logs -f api

# Logs do PostgreSQL
docker compose -f docker-compose.prod.yml logs -f db

# Logs do Redis
docker compose -f docker-compose.prod.yml logs -f redis

# Últimas 100 linhas
docker compose -f docker-compose.prod.yml logs --tail=100 api
```

#### Configuração de Logs

Os logs estão configurados em formato JSON para facilitar parsing:

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

#### Agregação de Logs (opcional)

Para ambientes maiores, considere:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki** + Grafana
- **CloudWatch Logs** (AWS)
- **Cloud Logging** (GCP)

Exemplo com Loki:

```yaml
# Adicionar ao docker-compose.prod.yml
loki:
  image: grafana/loki:2.9.0
  ports:
    - "3100:3100"
  command: -config.file=/etc/loki/local-config.yaml

promtail:
  image: grafana/promtail:2.9.0
  volumes:
    - /var/log:/var/log
  command: -config.file=/etc/promtail/config.yml
```

### 8.5 Uptime Monitoring

Serviços recomendados:

- **UptimeRobot** (gratuito até 50 monitores)
- **Pingdom**
- **StatusCake**
- **Healthchecks.io**

Configurar monitoramento em:
- `https://api.seudominio.com.br/health/live` (cada 1 minuto)

### 8.6 Alertas

#### Slack Webhook (exemplo)

```python
# Script de alerta
import requests

def send_alert(message):
    webhook_url = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    payload = {"text": f"🚨 ALERTA: {message}"}
    requests.post(webhook_url, json=payload)

# Usar em scripts de monitoramento
```

#### Email Alerts (via Prometheus Alertmanager)

```yaml
# alertmanager.yml
route:
  receiver: 'email'

receivers:
  - name: 'email'
    email_configs:
      - to: 'ops@seudominio.com.br'
        from: 'alertmanager@seudominio.com.br'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alertmanager@seudominio.com.br'
        auth_password: 'senha'
```

---

## 9. Troubleshooting

### 9.1 Problemas Comuns

#### API não inicia

```bash
# Verificar logs
docker compose -f docker-compose.prod.yml logs api

# Erros comuns:
# 1. Banco não está pronto
# Solução: Aguardar health check do DB

# 2. Variáveis de ambiente incorretas
docker compose -f docker-compose.prod.yml exec api env | grep DATABASE_URL

# 3. Migrations pendentes
docker compose -f docker-compose.prod.yml exec api alembic current
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

#### Erro de conexão com Database

```bash
# Verificar se DB está rodando
docker compose -f docker-compose.prod.yml ps db

# Testar conexão
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d conecta_plus -c "SELECT 1;"

# Verificar logs do DB
docker compose -f docker-compose.prod.yml logs db

# Verificar variável DATABASE_URL
docker compose -f docker-compose.prod.yml exec api env | grep DATABASE_URL
```

#### Erro de conexão com Redis

```bash
# Verificar se Redis está rodando
docker compose -f docker-compose.prod.yml ps redis

# Testar conexão
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Verificar logs
docker compose -f docker-compose.prod.yml logs redis
```

#### Erro 502 Bad Gateway (Nginx)

```bash
# Verificar se API está respondendo
curl http://localhost:8100/health

# Verificar configuração Nginx
sudo nginx -t

# Verificar logs Nginx
sudo tail -f /var/log/nginx/conecta-api-error.log

# Verificar upstream
sudo netstat -tulpn | grep 8100
```

#### Performance Degradada

```bash
# Verificar uso de recursos
docker stats

# Verificar conexões do DB
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Verificar slow queries
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Verificar cache Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli info stats
```

### 9.2 Comandos Úteis

```bash
# Restart da API
docker compose -f docker-compose.prod.yml restart api

# Rebuild e restart
docker compose -f docker-compose.prod.yml up -d --build api

# Ver uso de recursos
docker stats --no-stream

# Limpar logs
docker compose -f docker-compose.prod.yml logs --tail=0 -f api

# Acessar shell do container
docker compose -f docker-compose.prod.yml exec api bash

# Executar comando Python
docker compose -f docker-compose.prod.yml exec api python -c "import app; print(app.__version__)"

# Verificar migrations
docker compose -f docker-compose.prod.yml exec api alembic history
```

### 9.3 Recuperação de Desastres

#### Container corrompido

```bash
# Parar tudo
docker compose -f docker-compose.prod.yml down

# Remover containers
docker compose -f docker-compose.prod.yml rm -f

# Rebuild
docker compose -f docker-compose.prod.yml build --no-cache

# Subir novamente
docker compose -f docker-compose.prod.yml up -d
```

#### Banco de dados corrompido

```bash
# Restaurar do backup (ver seção 7.2)
gunzip -c /opt/conecta-plus/backups/ultimo_backup.sql.gz | \
  docker exec -i conecta-db psql -U postgres -d conecta_plus
```

#### Disco cheio

```bash
# Verificar uso
df -h

# Limpar logs antigos do Docker
docker system prune -a --volumes

# Limpar logs do sistema
sudo journalctl --vacuum-time=7d

# Limpar backups antigos
find /opt/conecta-plus/backups -mtime +30 -delete
```

### 9.4 Debug Mode Temporário

**NUNCA deixar em produção permanentemente!**

```bash
# Habilitar debug temporariamente
docker compose -f docker-compose.prod.yml exec api bash -c "export DEBUG=true && python -m uvicorn app.main:app --reload"

# Verificar configuração atual
docker compose -f docker-compose.prod.yml exec api python -c "from app.core.config import settings; print(f'Debug: {settings.DEBUG}')"
```

### 9.5 Verificação de Segurança

```bash
# Verificar portas expostas
sudo netstat -tulpn

# Verificar CVEs nas imagens
docker scout cves conecta-api:latest

# Scan de vulnerabilidades
trivy image conecta-api:latest

# Verificar permissões
ls -la /opt/conecta-plus/backend/
```

### 9.6 Rollback de Deploy

```bash
# Voltar para versão anterior
docker compose -f docker-compose.prod.yml down
git checkout v1.0.0  # ou commit anterior
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Rollback de migration
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1
```

### 9.7 Contatos de Suporte

Em caso de problemas críticos:

1. Verificar este guia de troubleshooting
2. Consultar logs: `/var/log/nginx/` e `docker compose logs`
3. Verificar status: `docker compose ps`
4. Contactar equipe de desenvolvimento

---

## Checklist Final de Deploy

### Pré-Deploy
- [ ] Código testado e aprovado
- [ ] Migrations criadas e testadas
- [ ] Variáveis de ambiente configuradas
- [ ] Senhas geradas e armazenadas com segurança
- [ ] Certificado SSL obtido
- [ ] Backup do ambiente atual

### Durante Deploy
- [ ] Build das imagens executado
- [ ] Containers iniciados com sucesso
- [ ] Migrations executadas
- [ ] Health checks passando
- [ ] Nginx configurado e rodando
- [ ] HTTPS funcionando

### Pós-Deploy
- [ ] Testes smoke realizados
- [ ] Logs monitorados por 30 minutos
- [ ] Métricas verificadas
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] Documentação atualizada
- [ ] Equipe notificada

---

## Referências e Recursos

### Documentação Oficial
- [FastAPI](https://fastapi.tiangolo.com/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/docs/)
- [Docker](https://docs.docker.com/)
- [Nginx](https://nginx.org/en/docs/)

### Ferramentas Úteis
- [Let's Encrypt](https://letsencrypt.org/)
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)
- [Docker Hub](https://hub.docker.com/)

### Comunidade
- [FastAPI Discord](https://discord.com/invite/fastapi)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/fastapi)

---

**Última atualização**: 2025-01-22
**Versão do documento**: 1.0.0
**Projeto**: Conecta Plus API
