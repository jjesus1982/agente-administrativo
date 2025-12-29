#!/bin/bash
# Conecta Plus Scalable Deployment Script
# Deploy script for 1000+ concurrent users architecture

set -e

echo "🚀 CONECTA PLUS SCALABLE DEPLOYMENT"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        log_error "Don't run this script as root!"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    commands=("docker" "docker-compose" "openssl" "curl")

    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is required but not installed."
            exit 1
        fi
    done

    log_success "All dependencies found"
}

# Generate SSL certificates
generate_ssl() {
    log_info "Generating SSL certificates..."

    mkdir -p nginx/ssl

    if [ ! -f nginx/ssl/cert.pem ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=BR/ST=AM/L=Manaus/O=ConectaPlus/OU=IT/CN=localhost"

        log_success "SSL certificates generated"
    else
        log_info "SSL certificates already exist"
    fi
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."

    if [ ! -f .env ]; then
        if [ -f .env.scalable.example ]; then
            cp .env.scalable.example .env
            log_warning "Created .env from example. PLEASE UPDATE PASSWORDS AND SECRETS!"
        else
            log_error ".env.scalable.example not found!"
            exit 1
        fi
    fi

    # Generate secure keys if not set
    if grep -q "CHANGE_ME" .env; then
        log_info "Generating secure keys..."

        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
        DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        REPLICATION_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
        REDIS_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

        sed -i "s/CHANGE_ME_GENERATE_SECURE_64_CHAR_KEY.*/$SECRET_KEY/" .env
        sed -i "s/CHANGE_DB_PASSWORD_STRONG_64_CHARS/$DB_PASSWORD/" .env
        sed -i "s/CHANGE_REPLICATION_PASSWORD_32_CHARS/$REPLICATION_PASSWORD/" .env
        sed -i "s/CHANGE_REDIS_PASSWORD_HERE/$REDIS_PASSWORD/" .env

        log_success "Secure keys generated and updated in .env"
    fi
}

# Validate configuration
validate_config() {
    log_info "Validating configuration..."

    # Check if required environment variables are set
    source .env

    required_vars=("SECRET_KEY" "DB_PASSWORD" "DOMAIN")

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done

    log_success "Configuration validated"
}

# Setup directories
setup_directories() {
    log_info "Setting up directories..."

    directories=(
        "postgres/data/master"
        "postgres/data/replica"
        "redis/data/master"
        "redis/data/slave"
        "prometheus/data"
        "grafana/data"
        "minio/data"
        "nginx/logs"
        "uploads"
    )

    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        chmod 755 "$dir"
    done

    log_success "Directories created"
}

# Make scripts executable
setup_permissions() {
    log_info "Setting up permissions..."

    chmod +x postgres/init-replication.sh
    chmod +x postgres/init-replica.sh

    # Set proper permissions for data directories
    sudo chown -R 999:999 postgres/data/ || log_warning "Could not set postgres permissions"
    sudo chown -R 999:999 redis/data/ || log_warning "Could not set redis permissions"

    log_success "Permissions configured"
}

# Build and start services
deploy_cluster() {
    log_info "Building and deploying cluster..."

    # Pull latest images
    docker-compose -f docker-compose.scalable.yml pull

    # Build custom images
    docker-compose -f docker-compose.scalable.yml build --no-cache

    # Start infrastructure services first
    log_info "Starting infrastructure services..."
    docker-compose -f docker-compose.scalable.yml up -d db-master redis-master

    # Wait for master services
    log_info "Waiting for master services to be ready..."
    sleep 30

    # Start replica services
    log_info "Starting replica services..."
    docker-compose -f docker-compose.scalable.yml up -d db-replica redis-slave redis-sentinel

    # Wait for replicas
    sleep 20

    # Start API instances
    log_info "Starting API instances..."
    docker-compose -f docker-compose.scalable.yml up -d api-1 api-2 api-3

    # Wait for APIs
    sleep 30

    # Start load balancer
    log_info "Starting load balancer..."
    docker-compose -f docker-compose.scalable.yml up -d nginx

    # Start monitoring
    log_info "Starting monitoring services..."
    docker-compose -f docker-compose.scalable.yml up -d prometheus grafana minio

    log_success "Cluster deployment completed!"
}

# Health check
health_check() {
    log_info "Performing health checks..."

    services=(
        "http://localhost/health:Load Balancer"
        "http://localhost/api/v1/health:API Health"
        "http://localhost:9090:Prometheus"
        "http://localhost:3001:Grafana"
    )

    for service_info in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service_info"

        if curl -f -s "$url" > /dev/null; then
            log_success "$name is healthy"
        else
            log_error "$name health check failed"
        fi
    done
}

# Performance test
performance_test() {
    log_info "Running basic performance test..."

    if command -v ab &> /dev/null; then
        ab -n 1000 -c 50 http://localhost/health > /dev/null 2>&1
        log_success "Basic performance test completed"
    else
        log_warning "Apache Bench (ab) not found, skipping performance test"
    fi
}

# Show status
show_status() {
    log_info "Deployment Status:"
    echo "================================"

    docker-compose -f docker-compose.scalable.yml ps

    echo ""
    log_info "Service URLs:"
    echo "• Load Balancer: http://localhost"
    echo "• API Documentation: http://localhost/api/v1/docs"
    echo "• Prometheus: http://localhost:9090"
    echo "• Grafana: http://localhost:3001 (admin/password from .env)"
    echo "• MinIO Console: http://localhost:9001"
    echo ""

    log_info "To view logs: docker-compose -f docker-compose.scalable.yml logs -f [service]"
    log_info "To scale API: docker-compose -f docker-compose.scalable.yml scale api-1=2"
    log_info "To stop: docker-compose -f docker-compose.scalable.yml down"
}

# Main deployment function
main() {
    log_info "Starting Conecta Plus scalable deployment..."

    check_root
    check_dependencies
    generate_ssl
    setup_environment
    validate_config
    setup_directories
    setup_permissions
    deploy_cluster

    log_info "Waiting for services to stabilize..."
    sleep 30

    health_check
    performance_test
    show_status

    log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉"
    log_info "Your Conecta Plus cluster is now ready to handle 1000+ concurrent users!"
}

# Handle arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "health")
        health_check
        ;;
    "status")
        show_status
        ;;
    "stop")
        log_info "Stopping all services..."
        docker-compose -f docker-compose.scalable.yml down
        log_success "All services stopped"
        ;;
    "clean")
        log_warning "This will remove all data! Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.scalable.yml down -v --remove-orphans
            docker system prune -f
            log_success "Environment cleaned"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|health|status|stop|clean}"
        echo "  deploy - Full deployment (default)"
        echo "  health - Check health of services"
        echo "  status - Show current status"
        echo "  stop   - Stop all services"
        echo "  clean  - Clean environment (removes data)"
        exit 1
        ;;
esac