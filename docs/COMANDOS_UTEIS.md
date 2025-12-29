# Comandos Úteis - Conecta Plus

Referência rápida de comandos para operação e manutenção do Conecta Plus.

---

## Docker & Docker Compose

### Gerenciamento Básico

```bash
# Subir todos os serviços
docker compose -f docker-compose.prod.yml up -d

# Subir com monitoring (Prometheus + Grafana)
docker compose -f docker-compose.prod.yml --profile monitoring up -d

# Parar serviços
docker compose -f docker-compose.prod.yml down

# Parar sem remover volumes
docker compose -f docker-compose.prod.yml stop

# Reiniciar serviço específico
docker compose -f docker-compose.prod.yml restart api

# Rebuild e restart
docker compose -f docker-compose.prod.yml up -d --build api

# Ver status
docker compose -f docker-compose.prod.yml ps

# Ver logs em tempo real
docker compose -f docker-compose.prod.yml logs -f api

# Ver últimas 100 linhas
docker compose -f docker-compose.prod.yml logs --tail=100 api

# Executar comando em container
docker compose -f docker-compose.prod.yml exec api bash
```

### Limpeza

```bash
# Remover containers parados
docker container prune -f

# Remover imagens não utilizadas
docker image prune -a -f

# Remover volumes não utilizados (CUIDADO!)
docker volume prune -f

# Limpeza completa do sistema
docker system prune -a --volumes -f

# Ver uso de espaço
docker system df
```

### Monitoramento de Recursos

```bash
# Ver uso em tempo real
docker stats

# Ver uso sem stream
docker stats --no-stream

# Ver apenas containers específicos
docker stats conecta-api conecta-db conecta-redis

# Inspecionar container
docker inspect conecta-api

# Ver logs de inicialização
docker logs conecta-api --since 10m
```

---

## Database (PostgreSQL)

### Conexão

```bash
# Conectar ao banco via container
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d conecta_plus

# Conectar ao banco diretamente (se exposto)
psql -h localhost -p 5433 -U postgres -d conecta_plus
```

### Queries Úteis

```sql
-- Ver todas as tabelas
\dt

-- Descrever estrutura de tabela
\d nome_da_tabela

-- Ver conexões ativas
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    query
FROM pg_stat_activity
WHERE datname = 'conecta_plus';

-- Matar conexão específica
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = 12345;

-- Ver tamanho do banco
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;

-- Ver tamanho das tabelas
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Ver índices
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Vacuum e analyze
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE conecta_plus;
```

### Backup e Restore

```bash
# Backup manual
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres conecta_plus | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup com schema only
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres --schema-only conecta_plus > schema.sql

# Backup com data only
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres --data-only conecta_plus > data.sql

# Restore
gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U postgres -d conecta_plus

# Backup de tabela específica
docker compose -f docker-compose.prod.yml exec db pg_dump -U postgres -t nome_tabela conecta_plus > tabela.sql

# Usar script automatizado
/opt/conecta-plus/scripts/backup-db.sh
/opt/conecta-plus/scripts/restore-db.sh backup_20250122.sql.gz
```

---

## Redis

### Conexão e Comandos

```bash
# Conectar ao Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli

# Ping
redis-cli ping

# Ver informações
redis-cli info

# Ver estatísticas de memória
redis-cli info memory

# Listar todas as chaves
redis-cli KEYS "*"

# Contar chaves
redis-cli DBSIZE

# Limpar cache (CUIDADO!)
redis-cli FLUSHDB

# Ver chaves por padrão
redis-cli KEYS "user:*"

# Ver valor de chave específica
redis-cli GET "chave"

# Deletar chave
redis-cli DEL "chave"

# Ver TTL de chave
redis-cli TTL "chave"

# Monitorar comandos em tempo real
redis-cli MONITOR
```

---

## Alembic (Migrations)

```bash
# Ver versão atual
docker compose -f docker-compose.prod.yml exec api alembic current

# Ver histórico de migrations
docker compose -f docker-compose.prod.yml exec api alembic history

# Aplicar migrations
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Voltar uma migration
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1

# Voltar para versão específica
docker compose -f docker-compose.prod.yml exec api alembic downgrade abc123

# Criar nova migration
docker compose -f docker-compose.prod.yml exec api alembic revision --autogenerate -m "descrição"

# Ver SQL de migration
docker compose -f docker-compose.prod.yml exec api alembic upgrade head --sql

# Validar migrations
docker compose -f docker-compose.prod.yml exec api alembic check
```

---

## API Testing

### Health Checks

```bash
# Health básico
curl http://localhost:8100/health

# Health completo (readiness)
curl http://localhost:8100/health/ready

# Health liveness
curl http://localhost:8100/health/live

# Com formatação JSON
curl http://localhost:8100/health/ready | jq

# Verificar resposta HTTP
curl -I http://localhost:8100/health
```

### Endpoints da API

```bash
# Documentação interativa
curl http://localhost:8100/docs
# Abrir no navegador: http://localhost:8100/docs

# Schema OpenAPI
curl http://localhost:8100/openapi.json | jq

# Login (obter token)
curl -X POST http://localhost:8100/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@conectaplus.com.br","password":"senha123"}'

# Usar token
TOKEN="seu_token_aqui"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8100/api/v1/users/me

# Criar usuário
curl -X POST http://localhost:8100/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste",
    "email": "teste@example.com",
    "cpf": "12345678901",
    "password": "senha123"
  }'
```

### Performance Testing

```bash
# Teste de carga com Apache Bench
ab -n 1000 -c 10 http://localhost:8100/health

# Teste com wrk
wrk -t4 -c100 -d30s http://localhost:8100/api/v1/endpoint

# Teste com curl (tempo de resposta)
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8100/health

# Criar curl-format.txt:
cat > curl-format.txt << EOF
    time_namelookup:  %{time_namelookup}s\n
       time_connect:  %{time_connect}s\n
    time_appconnect:  %{time_appconnect}s\n
   time_pretransfer:  %{time_pretransfer}s\n
      time_redirect:  %{time_redirect}s\n
 time_starttransfer:  %{time_starttransfer}s\n
                    ----------\n
         time_total:  %{time_total}s\n
EOF
```

---

## Nginx

### Gerenciamento

```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# Ver logs em tempo real
sudo tail -f /var/log/nginx/conecta-api-access.log
sudo tail -f /var/log/nginx/conecta-api-error.log

# Ver últimas requisições
sudo tail -100 /var/log/nginx/conecta-api-access.log

# Estatísticas de acesso
sudo cat /var/log/nginx/conecta-api-access.log | awk '{print $1}' | sort | uniq -c | sort -nr | head

# Ver códigos de status
sudo cat /var/log/nginx/conecta-api-access.log | awk '{print $9}' | sort | uniq -c | sort -nr
```

---

## SSL/Certbot

### Obter Certificado

```bash
# Método standalone (parar Nginx antes)
sudo systemctl stop nginx
sudo certbot certonly --standalone -d api.seudominio.com.br
sudo systemctl start nginx

# Método webroot (sem parar Nginx)
sudo certbot certonly --webroot -w /var/www/certbot -d api.seudominio.com.br

# Certificado wildcard
sudo certbot certonly --manual --preferred-challenges dns -d *.seudominio.com.br
```

### Gerenciamento

```bash
# Listar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Testar renovação
sudo certbot renew --dry-run

# Revogar certificado
sudo certbot revoke --cert-path /etc/letsencrypt/live/api.seudominio.com.br/cert.pem

# Deletar certificado
sudo certbot delete --cert-name api.seudominio.com.br
```

---

## Monitoramento

### Logs do Sistema

```bash
# Logs do systemd
sudo journalctl -u docker -f

# Logs de boot
sudo journalctl -b

# Logs de período específico
sudo journalctl --since "2025-01-22 10:00:00" --until "2025-01-22 11:00:00"

# Limpar logs antigos
sudo journalctl --vacuum-time=7d
```

### Recursos do Sistema

```bash
# CPU e memória
htop

# Uso de disco
df -h
du -sh /opt/conecta-plus/*

# Processos
ps aux | grep -i conecta

# Portas em uso
sudo netstat -tulpn | grep -E '(8100|5432|6379|80|443)'
sudo ss -tulpn | grep -E '(8100|5432|6379|80|443)'

# Conexões ativas
sudo netstat -an | grep ESTABLISHED | wc -l

# Top processos por memória
ps aux --sort=-%mem | head

# Top processos por CPU
ps aux --sort=-%cpu | head
```

### Prometheus

```bash
# Query via API
curl http://localhost:9090/api/v1/query?query=up

# Métricas da API
curl http://localhost:8100/metrics

# Ver targets
curl http://localhost:9090/api/v1/targets
```

---

## Troubleshooting

### Debug de Conexão

```bash
# Testar conexão com banco
docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT 1;"

# Testar conexão com Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# Testar porta da API
curl -v http://localhost:8100/health

# Verificar DNS
nslookup api.seudominio.com.br
dig api.seudominio.com.br

# Testar SSL
openssl s_client -connect api.seudominio.com.br:443

# Trace de rede
traceroute api.seudominio.com.br
```

### Análise de Performance

```bash
# Ver processos lentos no PostgreSQL
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d conecta_plus -c "
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
ORDER BY duration DESC;
"

# Cache hit ratio do PostgreSQL
docker compose -f docker-compose.prod.yml exec db psql -U postgres -d conecta_plus -c "
SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
"

# Redis memory stats
docker compose -f docker-compose.prod.yml exec redis redis-cli info memory | grep used_memory_human
```

---

## Segurança

### Verificações

```bash
# Verificar CVEs nas imagens
docker scout cves conecta-api:latest

# Scan com Trivy
trivy image conecta-api:latest

# Verificar portas expostas
sudo nmap localhost

# Verificar permissões de arquivos
ls -la /opt/conecta-plus/backend/.env

# Ver usuários logados
who
last
```

### Firewall (UFW)

```bash
# Status
sudo ufw status

# Permitir porta SSH
sudo ufw allow 22

# Permitir HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Negar acesso direto ao PostgreSQL
sudo ufw deny 5432

# Habilitar firewall
sudo ufw enable
```

---

## Scripts Personalizados

```bash
# Deploy automatizado
/opt/conecta-plus/scripts/deploy.sh

# Backup do banco
/opt/conecta-plus/scripts/backup-db.sh

# Restore do banco
/opt/conecta-plus/scripts/restore-db.sh /opt/conecta-plus/backups/backup_20250122.sql.gz

# Verificar health
curl -f http://localhost:8100/health/ready || echo "API com problemas!"
```

---

## Git (se aplicável)

```bash
# Status
git status

# Pull última versão
git pull origin main

# Ver último commit
git log -1

# Ver diferenças
git diff

# Criar tag de versão
git tag -a v1.0.0 -m "Versão 1.0.0"
git push origin v1.0.0
```

---

## Dicas Rápidas

```bash
# Criar alias úteis (adicionar ao ~/.bashrc)
alias dc='docker compose -f docker-compose.prod.yml'
alias dc-logs='docker compose -f docker-compose.prod.yml logs -f'
alias dc-ps='docker compose -f docker-compose.prod.yml ps'
alias api-logs='docker compose -f docker-compose.prod.yml logs -f api'
alias api-shell='docker compose -f docker-compose.prod.yml exec api bash'

# Depois de adicionar:
source ~/.bashrc

# Uso:
dc ps
dc-logs api
api-shell
```

---

Mantenha este arquivo atualizado conforme novos comandos e procedimentos forem descobertos!
