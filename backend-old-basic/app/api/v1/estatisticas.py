"""
API de Estatísticas
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import get_logger
from app.database import get_db
from app.services.cache import cache, cache_key

logger = get_logger(__name__)
router = APIRouter(prefix="/estatisticas", tags=["Estatísticas"])

# TTL do cache
STATS_CACHE_TTL = 120  # 2 minutos


class EstatisticasResponse(BaseModel):
    ocorrencias: int = 0
    avisos: int = 0
    enquetes: int = 0
    encomendas: int = 0
    visitas: int = 0
    novos_visitantes: int = 0
    liberacoes_acesso: int = 0
    reservas: int = 0
    chamados_manutencao: int = 0
    tarefas_manutencao: int = 0
    solicitacoes_dispositivo: int = 0
    livro_portaria: int = 0
    classificados: int = 0
    achados_perdidos: int = 0


@router.get("", response_model=EstatisticasResponse)
async def obter_estatisticas(
    tenant_id: int = Query(1, description="ID do condominio"),
    periodo: str = Query("mensal", regex="^(diario|semanal|mensal)$"),
    mes: Optional[int] = Query(None, ge=1, le=12),
    ano: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Retorna estatisticas do condominio.
    Dados sao cacheados por 2 minutos.
    """
    # Tenta buscar do cache
    ck = cache_key("stats", str(tenant_id), periodo, str(mes or 0), str(ano or 0))
    if cache.is_connected:
        cached_data = await cache.get(ck)
        if cached_data:
            logger.debug("stats_cache_hit", tenant_id=tenant_id)
            return EstatisticasResponse(**cached_data)

    agora = datetime.now()
    if periodo == "diario":
        data_inicio = agora.replace(hour=0, minute=0, second=0, microsecond=0)
    elif periodo == "semanal":
        data_inicio = agora - timedelta(days=agora.weekday())
        data_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        m = mes or agora.month
        a = ano or agora.year
        data_inicio = datetime(a, m, 1)

    async def count_table(table: str, date_col: str = "created_at"):
        # ✅ SEGURANÇA: Whitelist de tabelas e colunas permitidas
        ALLOWED_TABLES = {
            "occurrences", "announcements", "surveys", "packages", "access_logs",
            "visitors", "reservations", "maintenance_tickets", "maintenance_executions",
            "acessos_solicitacoes", "logbook", "classificados_anuncios", "lost_found"
        }
        ALLOWED_DATE_COLUMNS = {"created_at", "updated_at", "found_at", "access_date"}

        if table not in ALLOWED_TABLES:
            raise ValueError(f"Tabela não permitida: {table}")
        if date_col not in ALLOWED_DATE_COLUMNS:
            raise ValueError(f"Coluna de data não permitida: {date_col}")

        try:
            # Agora é seguro usar f-string pois os valores foram validados contra whitelist
            q = text(f"SELECT COUNT(*) FROM {table} WHERE tenant_id = :tenant_id AND {date_col} >= :data_inicio")
            r = await db.execute(q, {"tenant_id": tenant_id, "data_inicio": data_inicio})
            return r.scalar() or 0
        except Exception:
            return 0

    response = EstatisticasResponse(
        ocorrencias=await count_table("occurrences"),
        avisos=await count_table("announcements"),
        enquetes=await count_table("surveys"),
        encomendas=await count_table("packages"),
        visitas=await count_table("access_logs"),
        novos_visitantes=await count_table("visitors"),
        liberacoes_acesso=await count_table("access_logs"),
        reservas=await count_table("reservations"),
        chamados_manutencao=await count_table("maintenance_tickets"),
        tarefas_manutencao=await count_table("maintenance_executions"),
        solicitacoes_dispositivo=await count_table("acessos_solicitacoes"),
        livro_portaria=await count_table("logbook"),
        classificados=await count_table("classificados_anuncios"),
        achados_perdidos=await count_table("lost_found", "found_at"),
    )

    # Armazena no cache
    if cache.is_connected:
        await cache.set(ck, response.model_dump(), ttl=STATS_CACHE_TTL)
        logger.debug("stats_cache_set", tenant_id=tenant_id)

    return response
