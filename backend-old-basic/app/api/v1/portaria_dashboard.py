"""
API do Dashboard da Portaria
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationDep, get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    DashboardPortariaResponse,
    DashboardPortariaStats,
    LivroPortariaEntry,
    LivroPortariaResponse,
    PontoAcessoStatusResponse,
    TurnoInfo,
    VisitaResponse,
)

router = APIRouter(prefix="/portaria", tags=["Portaria"])


@router.get("/dashboard", response_model=DashboardPortariaResponse)
async def get_dashboard(
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna o dashboard completo da portaria com estatísticas e dados em tempo real.
    """
    hoje = datetime.now().date()
    agora = datetime.now()
    uma_hora_atras = agora - timedelta(hours=1)

    # Estatísticas de visitantes
    visitantes_query = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE DATE(data_entrada) = :hoje) as visitantes_hoje,
                COUNT(*) FILTER (WHERE status = 'em_andamento') as no_condominio,
                COUNT(*) FILTER (WHERE status = 'aguardando') as aguardando
            FROM visitas
            WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id, "hoje": hoje}
    )
    visitantes_stats = visitantes_query.fetchone()

    # Estatísticas de entregas (usando tabela packages)
    entregas_query = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE status IN ('pending', 'notified')) as pendentes,
                COUNT(*) FILTER (WHERE DATE(received_at) = :hoje) as hoje
            FROM packages
            WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id, "hoje": hoje}
    )
    entregas_stats = entregas_query.fetchone()

    # Estatísticas de acessos
    acessos_query = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE DATE(registered_at) = :hoje) as hoje,
                COUNT(*) FILTER (WHERE registered_at >= :uma_hora) as ultima_hora
            FROM access_logs
            WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id, "hoje": hoje, "uma_hora": uma_hora_atras}
    )
    acessos_stats = acessos_query.fetchone()

    # Estatísticas de ocorrências
    ocorrencias_query = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as abertas,
                COUNT(*) FILTER (WHERE DATE(created_at) = :hoje) as hoje
            FROM occurrences
            WHERE tenant_id = :tenant_id
        """),
        {"tenant_id": tenant_id, "hoje": hoje}
    )
    ocorrencias_stats = ocorrencias_query.fetchone()

    # Estatísticas de garagem
    garagem_query = await db.execute(
        text("""
            SELECT
                COUNT(*) FILTER (WHERE status = 'ocupada') as ocupadas,
                COUNT(*) FILTER (WHERE status = 'livre') as livres,
                COUNT(*) as total
            FROM vagas_garagem
            WHERE tenant_id = :tenant_id AND is_active = true
        """),
        {"tenant_id": tenant_id}
    )
    garagem_stats = garagem_query.fetchone()

    # Calcular ocupação percentual
    total_vagas = garagem_stats.total if garagem_stats and garagem_stats.total else 0
    ocupadas = garagem_stats.ocupadas if garagem_stats and garagem_stats.ocupadas else 0
    ocupacao_pct = (ocupadas / total_vagas * 100) if total_vagas > 0 else 0

    stats = DashboardPortariaStats(
        visitantes_hoje=visitantes_stats.visitantes_hoje if visitantes_stats else 0,
        visitantes_no_condominio=visitantes_stats.no_condominio if visitantes_stats else 0,
        visitantes_aguardando=visitantes_stats.aguardando if visitantes_stats else 0,
        entregas_pendentes=entregas_stats.pendentes if entregas_stats else 0,
        entregas_hoje=entregas_stats.hoje if entregas_stats else 0,
        acessos_hoje=acessos_stats.hoje if acessos_stats else 0,
        acessos_ultima_hora=acessos_stats.ultima_hora if acessos_stats else 0,
        ocorrencias_abertas=ocorrencias_stats.abertas if ocorrencias_stats else 0,
        ocorrencias_hoje=ocorrencias_stats.hoje if ocorrencias_stats else 0,
        vagas_ocupadas=ocupadas,
        vagas_livres=garagem_stats.livres if garagem_stats else 0,
        ocupacao_percentual=round(ocupacao_pct, 1)
    )

    # Visitantes ativos (em andamento)
    visitantes_ativos_query = await db.execute(
        text("""
            SELECT v.*, u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome, p.name as porteiro_entrada_nome
            FROM visitas v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN users m ON m.id = v.morador_id
            LEFT JOIN users p ON p.id = v.porteiro_entrada_id
            WHERE v.tenant_id = :tenant_id AND v.status = 'em_andamento'
            ORDER BY v.data_entrada DESC
            LIMIT 10
        """),
        {"tenant_id": tenant_id}
    )
    visitantes_ativos = [
        VisitaResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            visitor_id=row.visitor_id,
            visitante_nome=row.visitante_nome,
            visitante_documento=row.visitante_documento,
            visitante_foto_url=row.visitante_foto_url,
            unit_id=row.unit_id,
            unit_number=row.unit_number,
            unit_block=row.unit_block,
            morador_id=row.morador_id,
            morador_nome=row.morador_nome,
            porteiro_entrada_id=row.porteiro_entrada_id,
            porteiro_entrada_nome=row.porteiro_entrada_nome,
            tipo=row.tipo,
            status=row.status,
            data_entrada=row.data_entrada,
            data_saida=row.data_saida,
            autorizado_por=row.autorizado_por,
            metodo_autorizacao=row.metodo_autorizacao,
            veiculo_placa=row.veiculo_placa,
            veiculo_modelo=row.veiculo_modelo,
            observacoes=row.observacoes,
            created_at=row.created_at
        )
        for row in visitantes_ativos_query.fetchall()
    ]

    # Últimos acessos
    ultimos_acessos_query = await db.execute(
        text("""
            SELECT al.*, u.number as unit_number, u.block as unit_block,
                   usr.name as user_name, v.name as visitor_name
            FROM access_logs al
            LEFT JOIN units u ON u.id = al.unit_id
            LEFT JOIN users usr ON usr.id = al.user_id
            LEFT JOIN visitors v ON v.id = al.visitor_id
            WHERE al.tenant_id = :tenant_id
            ORDER BY al.registered_at DESC
            LIMIT 20
        """),
        {"tenant_id": tenant_id}
    )
    ultimos_acessos = [
        {
            "id": row.id,
            "access_type": row.access_type,
            "access_method": row.access_method,
            "access_point": row.access_point,
            "person_name": row.user_name or row.visitor_name or "Desconhecido",
            "unit_number": row.unit_number,
            "unit_block": row.unit_block,
            "vehicle_plate": row.vehicle_plate,
            "registered_at": row.registered_at.isoformat() if row.registered_at else None
        }
        for row in ultimos_acessos_query.fetchall()
    ]

    # Status dos pontos de acesso
    pontos_query = await db.execute(
        text("""
            SELECT id, codigo, nome, status, last_ping_at
            FROM pontos_acesso
            WHERE tenant_id = :tenant_id AND is_active = true AND visivel = true
            ORDER BY ordem, nome
        """),
        {"tenant_id": tenant_id}
    )
    pontos_status = [
        PontoAcessoStatusResponse(
            id=row.id,
            codigo=row.codigo,
            nome=row.nome,
            status=row.status,
            last_ping_at=row.last_ping_at,
            is_online=row.status == "online"
        )
        for row in pontos_query.fetchall()
    ]

    # Alertas
    alertas = []

    # Alerta de entregas antigas
    if entregas_stats and entregas_stats.pendentes > 0:
        entregas_antigas = await db.execute(
            text("""
                SELECT COUNT(*) as count FROM packages
                WHERE tenant_id = :tenant_id
                AND status IN ('pending', 'notified')
                AND received_at < NOW() - INTERVAL '3 days'
            """),
            {"tenant_id": tenant_id}
        )
        antigas = entregas_antigas.scalar()
        if antigas and antigas > 0:
            alertas.append({
                "tipo": "warning",
                "titulo": "Entregas pendentes há mais de 3 dias",
                "mensagem": f"{antigas} entregas aguardando retirada",
                "icone": "Package"
            })

    # Alerta de ocorrências abertas
    if ocorrencias_stats and ocorrencias_stats.abertas > 5:
        alertas.append({
            "tipo": "warning",
            "titulo": "Muitas ocorrências abertas",
            "mensagem": f"{ocorrencias_stats.abertas} ocorrências pendentes",
            "icone": "AlertTriangle"
        })

    return DashboardPortariaResponse(
        stats=stats,
        visitantes_ativos=visitantes_ativos,
        ultimos_acessos=ultimos_acessos,
        pontos_acesso_status=pontos_status,
        alertas=alertas
    )


@router.get("/turno", response_model=TurnoInfo)
async def get_turno_atual(
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna informações do turno atual.
    """
    agora = datetime.now()
    hora = agora.hour

    # Definir turno baseado no horário
    if 6 <= hora < 14:
        turno = "manha"
    elif 14 <= hora < 22:
        turno = "tarde"
    else:
        turno = "noite"

    # Buscar último registro do livro do turno atual
    livro_query = await db.execute(
        text("""
            SELECT l.*, u.name as user_nome
            FROM logbook l
            LEFT JOIN users u ON u.id = l.user_id
            WHERE l.tenant_id = :tenant_id AND l.shift = :turno
            AND DATE(l.registered_at) = :hoje
            ORDER BY l.registered_at DESC
            LIMIT 1
        """),
        {"tenant_id": tenant_id, "turno": turno, "hoje": agora.date()}
    )
    registro = livro_query.fetchone()

    return TurnoInfo(
        turno_atual=turno,
        porteiro_id=registro.user_id if registro else current_user.id,
        porteiro_nome=registro.user_nome if registro else current_user.name,
        inicio_turno=registro.registered_at if registro else None
    )


@router.post("/livro", response_model=LivroPortariaResponse, status_code=status.HTTP_201_CREATED)
async def criar_registro_livro(
    dados: LivroPortariaEntry,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cria um novo registro no livro da portaria.
    """
    agora = datetime.now()
    hora = agora.hour

    # Definir turno
    if 6 <= hora < 14:
        turno = "morning"
    elif 14 <= hora < 22:
        turno = "afternoon"
    else:
        turno = "night"

    result = await db.execute(
        text("""
            INSERT INTO logbook (tenant_id, user_id, title, content, category, shift, registered_at, created_at)
            VALUES (:tenant_id, :user_id, :title, :content, :category, :shift, NOW(), NOW())
            RETURNING id, tenant_id, user_id, title, content, category, shift, registered_at, created_at
        """),
        {
            "tenant_id": tenant_id,
            "user_id": current_user.id,
            "title": dados.titulo,
            "content": dados.conteudo,
            "category": dados.categoria,
            "shift": turno
        }
    )
    await db.commit()
    row = result.fetchone()

    return LivroPortariaResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        user_id=row.user_id,
        user_nome=current_user.name,
        titulo=row.title,
        conteudo=row.content,
        categoria=row.category,
        shift=row.shift,
        registered_at=row.registered_at,
        created_at=row.created_at
    )


@router.get("/livro", response_model=List[LivroPortariaResponse])
async def listar_registros_livro(
    tenant_id: int = Query(..., description="ID do condomínio"),
    turno: Optional[str] = Query(None, description="Filtrar por turno (morning, afternoon, night)"),
    data: Optional[str] = Query(None, description="Filtrar por data (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lista os registros do livro da portaria.
    """
    query = """
        SELECT l.*, u.name as user_nome
        FROM logbook l
        LEFT JOIN users u ON u.id = l.user_id
        WHERE l.tenant_id = :tenant_id
    """
    params = {"tenant_id": tenant_id}

    if turno:
        query += " AND l.shift = :turno"
        params["turno"] = turno

    if data:
        query += " AND DATE(l.registered_at) = :data"
        params["data"] = data

    query += " ORDER BY l.registered_at DESC LIMIT :limit"
    params["limit"] = limit

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    return [
        LivroPortariaResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            user_id=row.user_id,
            user_nome=row.user_nome,
            titulo=row.title,
            conteudo=row.content,
            categoria=row.category,
            shift=row.shift,
            registered_at=row.registered_at,
            created_at=row.created_at
        )
        for row in rows
    ]


@router.get("/stats/acessos")
async def get_stats_acessos(
    tenant_id: int = Query(..., description="ID do condomínio"),
    periodo: str = Query("hoje", description="Período: hoje, semana, mes"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retorna estatísticas de acessos por período.
    """
    hoje = datetime.now().date()

    if periodo == "hoje":
        data_inicio = hoje
    elif periodo == "semana":
        data_inicio = hoje - timedelta(days=7)
    else:  # mes
        data_inicio = hoje - timedelta(days=30)

    # Acessos por hora
    por_hora = await db.execute(
        text("""
            SELECT EXTRACT(HOUR FROM registered_at) as hora, COUNT(*) as total
            FROM access_logs
            WHERE tenant_id = :tenant_id AND DATE(registered_at) >= :data_inicio
            GROUP BY EXTRACT(HOUR FROM registered_at)
            ORDER BY hora
        """),
        {"tenant_id": tenant_id, "data_inicio": data_inicio}
    )

    # Acessos por método
    por_metodo = await db.execute(
        text("""
            SELECT access_method, COUNT(*) as total
            FROM access_logs
            WHERE tenant_id = :tenant_id AND DATE(registered_at) >= :data_inicio
            GROUP BY access_method
            ORDER BY total DESC
        """),
        {"tenant_id": tenant_id, "data_inicio": data_inicio}
    )

    # Acessos por ponto
    por_ponto = await db.execute(
        text("""
            SELECT access_point, COUNT(*) as total
            FROM access_logs
            WHERE tenant_id = :tenant_id AND DATE(registered_at) >= :data_inicio
            GROUP BY access_point
            ORDER BY total DESC
        """),
        {"tenant_id": tenant_id, "data_inicio": data_inicio}
    )

    # Acessos por tipo (entrada/saída)
    por_tipo = await db.execute(
        text("""
            SELECT access_type, COUNT(*) as total
            FROM access_logs
            WHERE tenant_id = :tenant_id AND DATE(registered_at) >= :data_inicio
            GROUP BY access_type
        """),
        {"tenant_id": tenant_id, "data_inicio": data_inicio}
    )

    return {
        "periodo": periodo,
        "data_inicio": data_inicio.isoformat(),
        "por_hora": [{"hora": int(r.hora), "total": r.total} for r in por_hora.fetchall()],
        "por_metodo": [{"metodo": r.access_method, "total": r.total} for r in por_metodo.fetchall()],
        "por_ponto": [{"ponto": r.access_point, "total": r.total} for r in por_ponto.fetchall()],
        "por_tipo": [{"tipo": r.access_type, "total": r.total} for r in por_tipo.fetchall()]
    }
