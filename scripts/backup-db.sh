#!/bin/bash

################################################################################
# Conecta Plus - Script de Backup do Banco de Dados
# Descrição: Realiza backup automático do PostgreSQL com compressão e limpeza
# Uso: ./backup-db.sh
################################################################################

set -e  # Sair em caso de erro

# Configurações
BACKUP_DIR="/opt/conecta-plus/backups"
DB_CONTAINER="conecta-db"
DB_NAME="conecta_plus"
DB_USER="postgres"
RETENTION_DAYS=7
LOG_FILE="/var/log/conecta-backup.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    error "Docker não está rodando!"
    exit 1
fi

# Verificar se container do DB existe
if ! docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    error "Container $DB_CONTAINER não encontrado!"
    exit 1
fi

# Verificar se container está rodando
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    error "Container $DB_CONTAINER não está rodando!"
    exit 1
fi

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Nome do arquivo com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/conecta_plus_$TIMESTAMP.sql.gz"

log "Iniciando backup do banco de dados..."
log "Arquivo: $BACKUP_FILE"

# Executar backup
if docker exec -t "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    # Obter tamanho do arquivo
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

    log "Backup concluído com sucesso!"
    log "Tamanho: $FILE_SIZE"

    # Verificar integridade do arquivo
    if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
        log "Integridade do arquivo verificada: OK"
    else
        error "Arquivo de backup pode estar corrompido!"
    fi

    # Remover backups antigos
    log "Limpando backups antigos (>${RETENTION_DAYS} dias)..."
    DELETED_COUNT=$(find "$BACKUP_DIR" -name "conecta_plus_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)

    if [ "$DELETED_COUNT" -gt 0 ]; then
        log "Removidos $DELETED_COUNT backups antigos"
    else
        log "Nenhum backup antigo para remover"
    fi

    # Listar backups existentes
    log "Backups disponíveis:"
    ls -lh "$BACKUP_DIR"/conecta_plus_*.sql.gz | tail -5

    # Upload para S3 (opcional - descomentar se usar)
    # if command -v aws &> /dev/null; then
    #     log "Enviando backup para S3..."
    #     aws s3 cp "$BACKUP_FILE" s3://seu-bucket/conecta-plus/backups/
    #     if [ $? -eq 0 ]; then
    #         log "Upload para S3 concluído"
    #     else
    #         warning "Falha no upload para S3"
    #     fi
    # fi

    log "Processo de backup finalizado com sucesso!"
    exit 0
else
    error "Falha ao executar backup!"

    # Remover arquivo parcial se existir
    if [ -f "$BACKUP_FILE" ]; then
        rm -f "$BACKUP_FILE"
        warning "Arquivo de backup parcial removido"
    fi

    exit 1
fi
