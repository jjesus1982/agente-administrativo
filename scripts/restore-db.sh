#!/bin/bash

################################################################################
# Conecta Plus - Script de Restauração do Banco de Dados
# Descrição: Restaura backup do PostgreSQL
# Uso: ./restore-db.sh <arquivo_backup.sql.gz>
################################################################################

set -e

# Configurações
DB_CONTAINER="conecta-db"
DB_NAME="conecta_plus"
DB_USER="postgres"
COMPOSE_FILE="/opt/conecta-plus/backend/docker-compose.prod.yml"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Verificar argumentos
if [ $# -eq 0 ]; then
    error "Nenhum arquivo de backup fornecido!"
    echo "Uso: $0 <arquivo_backup.sql.gz>"
    echo ""
    echo "Backups disponíveis:"
    ls -lh /opt/conecta-plus/backups/conecta_plus_*.sql.gz 2>/dev/null || echo "Nenhum backup encontrado"
    exit 1
fi

BACKUP_FILE=$1

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    error "Arquivo não encontrado: $BACKUP_FILE"
    exit 1
fi

# Verificar integridade do arquivo
log "Verificando integridade do arquivo de backup..."
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    error "Arquivo de backup está corrompido ou não é um arquivo gzip válido!"
    exit 1
fi

log "Integridade verificada: OK"

# Confirmação
warning "ATENÇÃO: Esta operação irá SOBRESCREVER o banco de dados atual!"
echo "Arquivo: $BACKUP_FILE"
echo "Banco: $DB_NAME"
echo ""
read -p "Deseja continuar? (sim/não): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    log "Operação cancelada pelo usuário"
    exit 0
fi

# Backup de segurança antes da restauração
SAFETY_BACKUP="/tmp/conecta_plus_pre_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
log "Criando backup de segurança antes da restauração..."
docker exec -t "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$SAFETY_BACKUP"
log "Backup de segurança criado: $SAFETY_BACKUP"

# Parar API
log "Parando serviço da API..."
docker compose -f "$COMPOSE_FILE" stop api

# Aguardar conexões finalizarem
sleep 5

# Desconectar usuários ativos
log "Desconectando usuários ativos do banco..."
docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# Dropar e recriar banco
log "Recriando banco de dados..."
docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null
docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null

# Restaurar backup
log "Restaurando backup..."
if gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /dev/null; then
    log "Backup restaurado com sucesso!"

    # Reiniciar API
    log "Reiniciando serviço da API..."
    docker compose -f "$COMPOSE_FILE" start api

    # Aguardar API iniciar
    log "Aguardando API inicializar..."
    sleep 10

    # Verificar health
    if curl -f http://localhost:8100/health > /dev/null 2>&1; then
        log "API iniciada com sucesso!"
        log "Health check: OK"
    else
        warning "API pode não ter iniciado corretamente. Verifique os logs."
    fi

    log "Restauração concluída!"
    log "Backup de segurança mantido em: $SAFETY_BACKUP"
else
    error "Falha na restauração!"
    warning "Tentando restaurar backup de segurança..."

    # Tentar restaurar backup de segurança
    docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" > /dev/null
    docker exec -t "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" > /dev/null
    gunzip -c "$SAFETY_BACKUP" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" > /dev/null

    log "Backup de segurança restaurado"
    docker compose -f "$COMPOSE_FILE" start api

    exit 1
fi
