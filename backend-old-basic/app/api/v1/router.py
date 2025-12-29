from fastapi import APIRouter

from app.api.v1.acessos import router as acessos_router
from app.api.v1.achados_perdidos import router as achados_router
from app.api.v1.anuncios import router as anuncios_router
from app.api.v1.ativos import router as ativos_router
from app.api.v1.auth import router as auth_router
from app.api.v1.avaliacoes import router as avaliacoes_router
from app.api.v1.classificados import router as classificados_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.dependents import router as dependents_router
from app.api.v1.destaques import router as destaques_router
from app.api.v1.documentos import router as documentos_router
from app.api.v1.encomendas import router as encomendas_router
from app.api.v1.estatisticas import router as estatisticas_router
from app.api.v1.faq import router as faq_router
from app.api.v1.manutencao import router as manutencao_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.ocorrencias import router as ocorrencias_router
from app.api.v1.pets import router as pets_router
from app.api.v1.portaria_dashboard import router as portaria_router
from app.api.v1.grupos_acesso import router as grupos_acesso_router
from app.api.v1.pontos_acesso import router as pontos_acesso_router
from app.api.v1.pre_autorizacoes import router as pre_autorizacoes_router
from app.api.v1.integracoes import router as integracoes_router
from app.api.v1.garagem_visual import router as garagem_router
from app.api.v1.visitas import router as visitas_router
from app.api.v1.profile import router as profile_router
from app.api.v1.reports import router as reports_router
from app.api.v1.reservas import router as reservas_router
from app.api.v1.surveys import router as surveys_router
from app.api.v1.tenant import router as tenant_router
from app.api.v1.units import router as units_router
from app.api.v1.users import router as users_router
from app.api.v1.vehicles import router as vehicles_router
from app.api.v1.visitors import router as visitors_router
from app.api.v1.websocket import router as websocket_router
from app.api.v1.admin.tenant_admin import router as tenant_admin_router
from app.api.v1.admin.sync_admin import router as sync_admin_router
from app.api.v1.public.public_api import router as public_api_router

api_router = APIRouter()

# REST API routes
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(visitors_router)
api_router.include_router(dashboard_router)
api_router.include_router(reports_router)
api_router.include_router(classificados_router)
api_router.include_router(acessos_router)
api_router.include_router(achados_router)
api_router.include_router(documentos_router)
api_router.include_router(faq_router)
api_router.include_router(destaques_router)
api_router.include_router(estatisticas_router)
api_router.include_router(avaliacoes_router)
api_router.include_router(ativos_router)
api_router.include_router(anuncios_router)
api_router.include_router(surveys_router)
api_router.include_router(manutencao_router)
api_router.include_router(ocorrencias_router)
api_router.include_router(units_router)
api_router.include_router(vehicles_router)
api_router.include_router(pets_router)
api_router.include_router(dependents_router)
api_router.include_router(profile_router)
api_router.include_router(notifications_router)
api_router.include_router(encomendas_router)
api_router.include_router(tenant_router)
api_router.include_router(reservas_router)

# Admin routes (autenticação obrigatória)
api_router.include_router(tenant_admin_router)
api_router.include_router(sync_admin_router)

# Public routes (sem autenticação)
api_router.include_router(public_api_router)

# Portaria module routes
api_router.include_router(portaria_router)
api_router.include_router(grupos_acesso_router)
api_router.include_router(pontos_acesso_router)
api_router.include_router(pre_autorizacoes_router)
api_router.include_router(integracoes_router)
api_router.include_router(garagem_router)
api_router.include_router(visitas_router)

# WebSocket routes
api_router.include_router(websocket_router, tags=["WebSocket"])
