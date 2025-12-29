#!/bin/bash

################################################################################
# Conecta Plus - Script de Deploy Automatizado
# Descrição: Automatiza processo de deploy em produção
# Uso: ./deploy.sh [--skip-backup] [--skip-tests]
################################################################################

set -e

# Configurações
PROJECT_DIR="/opt/conecta-plus/backend"
COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="/opt/conecta-plus/backups"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Flags
SKIP_BACKUP=false
SKIP_TESTS=false

# Parse argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        *)
            echo "Argumento desconhecido: $1"
            exit 1
            ;;
    esac
done

# Funções
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

check_prerequisites() {
    header "Verificando Pré-requisitos"

    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado!"
        exit 1
    fi
    log "Docker: $(docker --version)"

    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado!"
        exit 1
    fi
    log "Docker Compose: $(docker-compose --version)"

    # Verificar se está no diretório correto
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Arquivo $COMPOSE_FILE não encontrado!"
        error "Execute este script do diretório: $PROJECT_DIR"
        exit 1
    fi

    # Verificar arquivo .env
    if [ ! -f ".env" ]; then
        error "Arquivo .env não encontrado!"
        error "Copie .env.example para .env e configure as variáveis"
        exit 1
    fi

    log "Pré-requisitos verificados com sucesso"
}

create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        warning "Backup pulado (--skip-backup)"
        return
    fi

    header "Criando Backup de Segurança"

    # Criar diretório de backup
    mkdir -p "$BACKUP_DIR"

    # Backup do banco
    BACKUP_FILE="$BACKUP_DIR/pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
    log "Criando backup em: $BACKUP_FILE"

    if docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U postgres conecta_plus | gzip > "$BACKUP_FILE"; then
        log "Backup criado com sucesso"
        log "Tamanho: $(du -h $BACKUP_FILE | cut -f1)"
    else
        warning "Falha ao criar backup (continuando...)"
    fi
}

pull_latest_code() {
    header "Atualizando Código"

    # Se for repositório git
    if [ -d ".git" ]; then
        log "Obtendo últimas alterações do repositório..."

        # Verificar branch atual
        CURRENT_BRANCH=$(git branch --show-current)
        log "Branch atual: $CURRENT_BRANCH"

        # Pull
        git pull origin "$CURRENT_BRANCH"
        log "Código atualizado"

        # Mostrar último commit
        log "Último commit: $(git log -1 --pretty=format:'%h - %s (%an)')"
    else
        info "Não é um repositório Git, pulando atualização..."
    fi
}

run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        warning "Testes pulados (--skip-tests)"
        return
    fi

    header "Executando Testes"

    # Executar testes (se existir)
    if [ -f "pytest.ini" ] || [ -d "tests" ]; then
        log "Executando suite de testes..."
        docker compose -f "$COMPOSE_FILE" exec -T api pytest -v || {
            error "Testes falharam!"
            read -p "Deseja continuar mesmo assim? (sim/não): " CONTINUE
            if [ "$CONTINUE" != "sim" ]; then
                exit 1
            fi
        }
    else
        info "Nenhum teste configurado"
    fi
}

build_images() {
    header "Construindo Imagens Docker"

    log "Iniciando build..."
    docker compose -f "$COMPOSE_FILE" build --no-cache

    log "Build concluído"
}

stop_services() {
    header "Parando Serviços"

    log "Parando containers..."
    docker compose -f "$COMPOSE_FILE" stop

    log "Serviços parados"
}

start_services() {
    header "Iniciando Serviços"

    log "Iniciando containers..."
    docker compose -f "$COMPOSE_FILE" up -d

    log "Aguardando serviços iniciarem..."
    sleep 10
}

run_migrations() {
    header "Executando Migrations"

    log "Verificando migrations pendentes..."
    docker compose -f "$COMPOSE_FILE" exec -T api alembic current

    log "Aplicando migrations..."
    docker compose -f "$COMPOSE_FILE" exec -T api alembic upgrade head

    log "Migrations aplicadas"
}

health_check() {
    header "Verificando Saúde da Aplicação"

    MAX_ATTEMPTS=12
    ATTEMPT=1

    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        log "Tentativa $ATTEMPT de $MAX_ATTEMPTS..."

        if curl -f http://localhost:8100/health/ready > /dev/null 2>&1; then
            log "Health check: OK"
            return 0
        fi

        sleep 5
        ATTEMPT=$((ATTEMPT + 1))
    done

    error "Health check falhou após $MAX_ATTEMPTS tentativas!"
    return 1
}

show_status() {
    header "Status dos Serviços"

    docker compose -f "$COMPOSE_FILE" ps

    echo ""
    info "Logs recentes:"
    docker compose -f "$COMPOSE_FILE" logs --tail=20 api
}

cleanup() {
    header "Limpeza"

    log "Removendo imagens antigas..."
    docker image prune -f

    log "Removendo containers parados..."
    docker container prune -f

    log "Limpeza concluída"
}

main() {
    cd "$PROJECT_DIR"

    header "Deploy Conecta Plus - Produção"

    log "Iniciando processo de deploy..."
    info "Data/Hora: $(date)"
    info "Usuário: $(whoami)"
    info "Host: $(hostname)"

    check_prerequisites
    create_backup
    pull_latest_code
    run_tests
    build_images
    stop_services
    start_services
    run_migrations
    health_check

    if [ $? -eq 0 ]; then
        show_status
        cleanup

        header "Deploy Concluído com Sucesso!"
        log "Aplicação rodando em: http://localhost:8100"
        log "Health check: http://localhost:8100/health"
        log "Documentação API: http://localhost:8100/docs"

        echo ""
        info "Próximos passos:"
        echo "  1. Verificar logs: docker compose -f $COMPOSE_FILE logs -f api"
        echo "  2. Monitorar métricas: http://localhost:9090 (Prometheus)"
        echo "  3. Dashboards: http://localhost:3001 (Grafana)"

        exit 0
    else
        error "Deploy falhou! Verifique os logs acima"
        exit 1
    fi
}

# Executar
main
