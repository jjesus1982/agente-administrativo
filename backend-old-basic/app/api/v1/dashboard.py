"""
Dashboard - Estatísticas em tempo real de todas as áreas
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.database import get_db
from app.services.cache import cache, cache_key

logger = get_logger(__name__)
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# TTL do cache em segundos
DASHBOARD_CACHE_TTL = 60  # 1 minuto para stats
ATIVIDADES_CACHE_TTL = 30  # 30 segundos para atividades recentes


@router.get("/stats-completo")
async def get_stats_completo(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """
    Retorna estatísticas completas de TODAS as áreas do sistema em tempo real.
    Dados sao cacheados por 1 minuto para melhor performance.
    """
    # Tenta buscar do cache
    ck = cache_key("dashboard", "stats", str(tenant_id))
    if cache.is_connected:
        cached_data = await cache.get(ck)
        if cached_data:
            logger.debug("dashboard_cache_hit", tenant_id=tenant_id)
            return cached_data

    today = datetime.now().date()
    week_ago = today - timedelta(days=7)

    result = await db.execute(
        text(
            """
        SELECT 
            -- Gestão Condominial
            (SELECT COUNT(*) FROM units WHERE tenant_id = :tid) as total_unidades,
            (SELECT COUNT(*) FROM users WHERE tenant_id = :tid AND is_deleted = false) as total_moradores,
            (SELECT COUNT(*) FROM dependents WHERE tenant_id = :tid) as total_dependentes,
            (SELECT COUNT(*) FROM vehicles WHERE tenant_id = :tid) as total_veiculos,
            (SELECT COUNT(*) FROM pets WHERE tenant_id = :tid) as total_pets,
            
            -- Visitantes
            (SELECT COUNT(*) FROM visitors WHERE tenant_id = :tid) as total_visitantes,
            (SELECT COUNT(*) FROM visitors WHERE tenant_id = :tid AND created_at::date = :today) as visitantes_hoje,
            (SELECT COUNT(*) FROM visitors WHERE tenant_id = :tid AND created_at >= :week_ago) as visitantes_semana,
            
            -- Manutenção
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :tid) as manutencao_total,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :tid AND status = 'aberto') as manutencao_abertos,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :tid AND status = 'em_andamento') as manutencao_andamento,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :tid AND status = 'aguardando') as manutencao_aguardando,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :tid AND status = 'concluido') as manutencao_concluidos,
            
            -- Ocorrências
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :tid) as ocorrencias_total,
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :tid AND status = 'open') as ocorrencias_abertas,
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :tid AND status = 'in_progress') as ocorrencias_andamento,
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :tid AND status = 'resolved') as ocorrencias_resolvidas,
            
            -- Comunicados
            (SELECT COUNT(*) FROM announcements WHERE tenant_id = :tid) as comunicados_total,
            (SELECT COUNT(*) FROM announcements WHERE tenant_id = :tid AND is_pinned = true) as comunicados_fixados,
            (SELECT COALESCE(SUM(views_count), 0) FROM announcements WHERE tenant_id = :tid) as comunicados_views,
            (SELECT COUNT(*) FROM announcement_comments ac JOIN announcements a ON a.id = ac.announcement_id WHERE a.tenant_id = :tid) as comunicados_comentarios,
            
            -- Pesquisas
            (SELECT COUNT(*) FROM surveys WHERE tenant_id = :tid) as pesquisas_total,
            (SELECT COUNT(*) FROM surveys WHERE tenant_id = :tid AND status = 'active') as pesquisas_ativas,
            (SELECT COUNT(*) FROM survey_votes sv JOIN surveys s ON s.id = sv.survey_id WHERE s.tenant_id = :tid) as pesquisas_votos,
            
            -- Documentos
            (SELECT COUNT(*) FROM documentos WHERE tenant_id = :tid AND is_pasta = false) as documentos_arquivos,
            (SELECT COUNT(*) FROM documentos WHERE tenant_id = :tid AND is_pasta = true) as documentos_pastas,
            (SELECT COALESCE(SUM(tamanho_bytes), 0) FROM documentos WHERE tenant_id = :tid) as documentos_tamanho,
            
            -- Entre Vizinhos (Classificados)
            (SELECT COUNT(*) FROM classificados_anuncios WHERE tenant_id = :tid) as classificados_total,
            (SELECT COUNT(*) FROM classificados_anuncios WHERE tenant_id = :tid AND status = 'ativo') as classificados_ativos,
            
            -- Solicitações de Acesso
            (SELECT COUNT(*) FROM acessos_solicitacoes WHERE tenant_id = :tid AND status = 'pendente') as acessos_pendentes,
            (SELECT COUNT(*) FROM acessos_solicitacoes WHERE tenant_id = :tid AND status = 'aprovado') as acessos_aprovados,
            
            -- Reservas
            (SELECT COUNT(*) FROM common_areas WHERE tenant_id = :tid) as areas_comuns,
            (SELECT COUNT(*) FROM reservations WHERE tenant_id = :tid AND date >= :today) as reservas_futuras
            
    """
        ),
        {"tid": tenant_id, "today": today, "week_ago": week_ago},
    )

    row = result.fetchone()

    response_data = {
        "gestao": {
            "unidades": row.total_unidades,
            "moradores": row.total_moradores,
            "dependentes": row.total_dependentes,
            "veiculos": row.total_veiculos,
            "pets": row.total_pets,
        },
        "visitantes": {"total": row.total_visitantes, "hoje": row.visitantes_hoje, "semana": row.visitantes_semana},
        "manutencao": {
            "total": row.manutencao_total,
            "abertos": row.manutencao_abertos,
            "em_andamento": row.manutencao_andamento,
            "aguardando": row.manutencao_aguardando,
            "concluidos": row.manutencao_concluidos,
        },
        "ocorrencias": {
            "total": row.ocorrencias_total,
            "abertas": row.ocorrencias_abertas,
            "em_andamento": row.ocorrencias_andamento,
            "resolvidas": row.ocorrencias_resolvidas,
        },
        "comunicados": {
            "total": row.comunicados_total,
            "fixados": row.comunicados_fixados,
            "visualizacoes": row.comunicados_views,
            "comentarios": row.comunicados_comentarios,
        },
        "pesquisas": {"total": row.pesquisas_total, "ativas": row.pesquisas_ativas, "votos": row.pesquisas_votos},
        "documentos": {
            "arquivos": row.documentos_arquivos,
            "pastas": row.documentos_pastas,
            "tamanho_bytes": row.documentos_tamanho,
        },
        "classificados": {"total": row.classificados_total, "ativos": row.classificados_ativos},
        "acessos": {"pendentes": row.acessos_pendentes, "aprovados": row.acessos_aprovados},
        "reservas": {"areas_comuns": row.areas_comuns, "futuras": row.reservas_futuras},
    }

    # Armazena no cache
    if cache.is_connected:
        await cache.set(ck, response_data, ttl=DASHBOARD_CACHE_TTL)
        logger.debug("dashboard_cache_set", tenant_id=tenant_id)

    return response_data


@router.get("/atividades-recentes")
async def get_atividades_recentes(
    tenant_id: int = Query(1, description="ID do condomínio"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna as atividades mais recentes do condomínio.
    Dados sao cacheados por 30 segundos.
    """
    # Tenta buscar do cache
    ck = cache_key("dashboard", "atividades", str(tenant_id), str(limit))
    if cache.is_connected:
        cached_data = await cache.get(ck)
        if cached_data:
            logger.debug("atividades_cache_hit", tenant_id=tenant_id)
            return cached_data

    result = await db.execute(
        text(
            """
        (SELECT 'manutencao' as tipo, id, title as titulo, created_at as data, 'wrench' as icone
         FROM maintenance_tickets WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 3)
        UNION ALL
        (SELECT 'ocorrencia' as tipo, id, title as titulo, created_at as data, 'alert' as icone
         FROM occurrences WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 3)
        UNION ALL
        (SELECT 'comunicado' as tipo, id, title as titulo, created_at as data, 'megaphone' as icone
         FROM announcements WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 3)
        UNION ALL
        (SELECT 'visitante' as tipo, id, name as titulo, created_at as data, 'user' as icone
         FROM visitors WHERE tenant_id = :tid ORDER BY created_at DESC LIMIT 3)
        ORDER BY data DESC
        LIMIT :limit
    """
        ),
        {"tid": tenant_id, "limit": limit},
    )

    rows = result.fetchall()

    response_data = {
        "items": [
            {
                "tipo": row.tipo,
                "id": row.id,
                "titulo": row.titulo,
                "data": row.data.isoformat() if row.data else None,
                "icone": row.icone,
            }
            for row in rows
        ]
    }

    # Armazena no cache
    if cache.is_connected:
        await cache.set(ck, response_data, ttl=ATIVIDADES_CACHE_TTL)
        logger.debug("atividades_cache_set", tenant_id=tenant_id)

    return response_data
