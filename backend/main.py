# -*- coding: utf-8 -*-
"""
API Unificada - Conecta Plus
============================

Ponto de entrada único para toda a plataforma Conecta Plus.

Integra:
- /api/agente-tecnico - Inteligência técnica
- /api/campo - Conecta Fielder (execução em campo)
- /api/knowledge - Base de conhecimento
"""

from __future__ import annotations
from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Routers dos módulos
from conecta_plus.agent_tecnico.api import router as agente_tecnico_router
from conecta_plus.campo.api import router as campo_router
from conecta_plus.knowledge.api import router as knowledge_router
from conecta_plus.orchestrator.api import router as orchestrator_router
from conecta_plus.network.api import router as network_router
from conecta_plus.auth.api import router as auth_router
from conecta_plus.dashboard.api import router as dashboard_router
from conecta_plus.ia.api import router as ia_router

# Configura logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida da aplicação."""
    logger.info("=" * 60)
    logger.info("Conecta Plus - Iniciando...")
    logger.info("=" * 60)
    logger.info(f"Ambiente: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"LLM Provider: {os.getenv('LLM_PROVIDER', 'auto-detect')}")
    logger.info("Módulos carregados:")
    logger.info("  - Agente Técnico (cérebro)")
    logger.info("  - Conecta Fielder (campo)")
    logger.info("  - Base de Conhecimento")
    logger.info("=" * 60)
    
    yield
    
    logger.info("Conecta Plus - Finalizando...")


# Cria aplicação
app = FastAPI(
    title="Conecta Plus API",
    description="""
    ## Plataforma Completa para Portaria Remota e Controle de Acesso
    
    ### Módulos Disponíveis:
    
    #### 🧠 Agente Técnico (`/api/agente-tecnico`)
    Inteligência técnica para:
    - Gerar topologias e soluções
    - Criar checklists e documentação
    - Produzir JobTemplates para campo
    - Auxiliar em troubleshooting
    - Gerar esquemas de ligação
    
    #### 🔧 Conecta Fielder (`/api/campo`)
    Execução em campo para:
    - Gerenciar JobTemplates
    - Criar e acompanhar Jobs (OS)
    - Registrar execução de steps
    - Coletar evidências
    - Gerar relatórios
    
    #### 📚 Base de Conhecimento (`/api/knowledge`)
    Memória técnica para:
    - FAQ por fabricante/cenário
    - Soluções de troubleshooting
    - Histórico de atendimentos
    - Busca inteligente
    
    #### 🚀 Orquestrador de Instalação (`/api/orchestrator`)
    Automação completa para:
    - Scanner de rede (descoberta de dispositivos)
    - Provisionamento automático (IPs, VLANs)
    - Configuração de VPN (WireGuard, L2TP)
    - Integração de câmeras no NVR
    - Registro de dispositivos na nuvem
    - Testes de comunicação
    
    #### 🌐 Network - CMDB & ITIL (`/api/network`)
    Gestão de rede e governança:
    - CMDB (Configuration Management Database)
    - Scanner de rede com nmap
    - Device Clients (Mikrotik, Intelbras, Hikvision)
    - Change Records ITIL
    - Relatórios de mudanças
    - Provisionamento remoto
    
    ### Fabricantes Suportados:
    - **Controle de Acesso**: Intelbras, Hikvision, Control iD
    - **CFTV**: Intelbras, Hikvision, Dahua
    - **Automação**: PPA, Garen, Nice
    - **Rede**: Cisco, Ubiquiti, Mikrotik
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# ROTAS DOS MÓDULOS
# =============================================================================

app.include_router(auth_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(ia_router, prefix="/api")
app.include_router(agente_tecnico_router, prefix="/api")
app.include_router(campo_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(orchestrator_router, prefix="/api")
app.include_router(network_router, prefix="/api")


# =============================================================================
# ENDPOINTS GERAIS
# =============================================================================

@app.get("/")
def root():
    """Informações da API."""
    return {
        "name": "Conecta Plus API",
        "version": "2.0.0",
        "modules": {
            "agente_tecnico": "/api/agente-tecnico",
            "campo": "/api/campo",
            "knowledge": "/api/knowledge"
        },
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health"
    }


@app.get("/health")
def health():
    """Health check."""
    return {
        "status": "healthy",
        "version": "2.1.0",
        "modules": {
            "agente_tecnico": "ok",
            "campo": "ok",
            "knowledge": "ok",
            "orchestrator": "ok",
            "network": "ok"
        },
        "llm_provider": os.getenv("LLM_PROVIDER", "auto-detect")
    }


@app.get("/api/status")
def api_status():
    """Status detalhado da API."""
    from conecta_plus.campo.api import JOB_TEMPLATES_DB, JOBS_DB
    from conecta_plus.knowledge.api import CONHECIMENTOS_DB, HISTORICO_DB
    from conecta_plus.orchestrator.api import orquestrador
    from conecta_plus.network.cmdb import get_cmdb
    
    cmdb = get_cmdb()
    cmdb_stats = cmdb.get_stats() if hasattr(cmdb, 'get_stats') else {}
    
    return {
        "api_version": "2.1.0",
        "statistics": {
            "job_templates": len(JOB_TEMPLATES_DB),
            "jobs": len(JOBS_DB),
            "knowledge_articles": len(CONHECIMENTOS_DB),
            "history_records": len(HISTORICO_DB),
            "instalacoes_em_andamento": len(orquestrador.projetos),
            "cmdb_cis": cmdb_stats.get("total_cis", 0),
            "cmdb_changes": cmdb_stats.get("total_changes", 0),
        },
        "endpoints": {
            "agente_tecnico": [
                "POST /api/agente-tecnico/topologia",
                "POST /api/agente-tecnico/lista-materiais",
                "POST /api/agente-tecnico/checklists",
                "POST /api/agente-tecnico/template-config",
                "POST /api/agente-tecnico/fluxo-instalacao",
                "POST /api/agente-tecnico/esquema-bornes",
                "POST /api/agente-tecnico/documentacao-itil",
                "POST /api/agente-tecnico/as-built",
                "POST /api/agente-tecnico/troubleshooting",
                "POST /api/agente-tecnico/job-template",
                "POST /api/agente-tecnico/consulta",
            ],
            "campo": [
                "POST /api/campo/job-templates",
                "GET /api/campo/job-templates",
                "POST /api/campo/jobs/from-template",
                "GET /api/campo/jobs",
                "GET /api/campo/jobs/{job_id}",
                "PATCH /api/campo/jobs/{job_id}",
                "GET /api/campo/jobs/{job_id}/steps",
                "PATCH /api/campo/jobs/{job_id}/steps/{step_id}",
                "POST /api/campo/jobs/{job_id}/steps/{step_id}/evidence",
                "GET /api/campo/jobs/{job_id}/report",
                "GET /api/campo/dashboard/summary",
            ],
            "knowledge": [
                "POST /api/knowledge/artigos",
                "GET /api/knowledge/artigos",
                "GET /api/knowledge/faq",
                "POST /api/knowledge/historico",
                "GET /api/knowledge/historico",
                "GET /api/knowledge/busca",
            ],
            "orchestrator": [
                "POST /api/orchestrator/projetos",
                "GET /api/orchestrator/projetos",
                "GET /api/orchestrator/projetos/{id}",
                "POST /api/orchestrator/projetos/{id}/scan",
                "POST /api/orchestrator/projetos/{id}/identificar",
                "POST /api/orchestrator/projetos/{id}/plano",
                "POST /api/orchestrator/projetos/{id}/provisionar",
                "POST /api/orchestrator/projetos/{id}/vpn",
                "POST /api/orchestrator/projetos/{id}/integrar",
                "POST /api/orchestrator/projetos/{id}/testar",
                "POST /api/orchestrator/projetos/{id}/instalar",
                "GET /api/orchestrator/projetos/{id}/relatorio",
                "POST /api/orchestrator/scan",
            ],
            "network": [
                "POST /api/network/scan",
                "POST /api/network/scan/quick",
                "GET /api/network/cis",
                "GET /api/network/cis/{ci_id}",
                "POST /api/network/cis",
                "PATCH /api/network/cis/{ci_id}",
                "DELETE /api/network/cis/{ci_id}",
                "POST /api/network/cis/{ci_id}/apply-config",
                "POST /api/network/provision",
                "GET /api/network/changes",
                "GET /api/network/changes/{change_id}",
                "POST /api/network/reports/change-record",
                "POST /api/network/reports/cliente",
                "GET /api/network/reports/ci/{ci_id}/history",
                "GET /api/network/stats",
            ]
        }
    }


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=os.getenv("ENVIRONMENT", "development") == "development"
    )
