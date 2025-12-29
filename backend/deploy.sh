#!/bin/bash
# =============================================================================
# Conecta Plus - Deploy Script
# =============================================================================
# 
# Execute este script na VPS para fazer o deploy:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# =============================================================================

set -e

echo "=============================================="
echo " Conecta Plus - Deploy v2.1.0"
echo "=============================================="

# Variáveis
PROJECT_DIR="/projetos/conecta_plus"
SERVICE_NAME="conecta-plus"
PORT=8004

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica se é root
if [ "$EUID" -ne 0 ]; then 
    log_error "Execute como root: sudo ./deploy.sh"
    exit 1
fi

# 1. Instala dependências do sistema
log_info "Instalando dependências do sistema..."
apt-get update
apt-get install -y python3 python3-venv python3-pip nmap

# 2. Cria diretório do projeto
log_info "Criando diretório do projeto..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 3. Copia arquivos (assume que o zip foi extraído no diretório atual)
log_info "Copiando arquivos..."
if [ -d "conecta_plus_full" ]; then
    cp -r conecta_plus_full/* .
    rm -rf conecta_plus_full
fi

# 4. Cria ambiente virtual
log_info "Criando ambiente virtual Python..."
python3 -m venv venv
source venv/bin/activate

# 5. Instala dependências Python
log_info "Instalando dependências Python..."
pip install --upgrade pip
pip install -r requirements.txt

# 6. Cria arquivo .env se não existir
if [ ! -f ".env" ]; then
    log_info "Criando arquivo .env..."
    cat > .env << EOF
# Conecta Plus - Configuração
ENVIRONMENT=production
PORT=$PORT
HOST=0.0.0.0

# LLM Provider (openai ou anthropic)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here

# CORS
CORS_ORIGINS=*
EOF
    log_warn "Edite o arquivo .env com suas chaves de API!"
fi

# 7. Cria serviço systemd
log_info "Configurando serviço systemd..."
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Conecta Plus API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
Environment="PATH=$PROJECT_DIR/venv/bin"
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=$PROJECT_DIR/venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 8. Recarrega e inicia serviço
log_info "Iniciando serviço..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# 9. Verifica status
sleep 3
if systemctl is-active --quiet $SERVICE_NAME; then
    log_info "Serviço iniciado com sucesso!"
else
    log_error "Falha ao iniciar serviço"
    systemctl status $SERVICE_NAME
    exit 1
fi

# 10. Testa API
log_info "Testando API..."
sleep 2
HEALTH=$(curl -s http://localhost:$PORT/health 2>/dev/null || echo "error")

if echo "$HEALTH" | grep -q "healthy"; then
    log_info "API respondendo corretamente!"
else
    log_warn "API pode não estar respondendo ainda. Verifique os logs."
fi

echo ""
echo "=============================================="
echo " Deploy Concluído!"
echo "=============================================="
echo ""
echo " Endpoints disponíveis:"
echo "   - API:     http://localhost:$PORT"
echo "   - Docs:    http://localhost:$PORT/docs"
echo "   - Health:  http://localhost:$PORT/health"
echo ""
echo " Módulos:"
echo "   - /api/agente-tecnico  (Inteligência)"
echo "   - /api/campo           (Fielder)"
echo "   - /api/knowledge       (Base conhecimento)"
echo "   - /api/orchestrator    (Automação)"
echo "   - /api/network         (CMDB & ITIL)"
echo ""
echo " Comandos úteis:"
echo "   systemctl status $SERVICE_NAME"
echo "   journalctl -u $SERVICE_NAME -f"
echo "   systemctl restart $SERVICE_NAME"
echo ""
echo "=============================================="
