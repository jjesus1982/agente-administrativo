"""
Endpoints de relatórios - Públicos (sem autenticação para desenvolvimento)
"""

import io
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/reports", tags=["Relatórios"])


# ==================== MORADORES ====================
@router.get("/moradores")
async def moradores_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de moradores"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["tenant_id = :tid", "is_deleted = false"]
    if is_active is not None:
        where_clauses.append(f"is_active = {'true' if is_active else 'false'}")
    if role:
        where_clauses.append("role = :role")
        params["role"] = role
    if search:
        where_clauses.append("(name ILIKE :search OR email ILIKE :search OR cpf ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM users WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT u.id, u.name, u.email, u.phone, u.cpf, u.role, u.is_active, u.created_at,
            (SELECT string_agg(un.block || '-' || un.number, ', ') FROM units un 
             JOIN unit_residents ur ON ur.unit_id = un.id WHERE ur.user_id = u.id) as unidades
        FROM users u WHERE {where_sql}
        ORDER BY u.name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "moradores")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== VISITANTES ====================
@router.get("/visitantes")
async def visitantes_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    visitor_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de visitantes"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["tenant_id = :tid"]
    if visitor_type:
        where_clauses.append("visitor_type = :vtype")
        params["vtype"] = visitor_type
    if search:
        where_clauses.append("(name ILIKE :search OR cpf ILIKE :search)")
        params["search"] = f"%{search}%"
    if start_date:
        where_clauses.append("created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("created_at <= :end_date")
        params["end_date"] = end_date

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM visitors WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT id, name, cpf, rg, phone, visitor_type, company, service, is_blocked, created_at
        FROM visitors WHERE {where_sql}
        ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "visitantes")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== VEÍCULOS ====================
@router.get("/veiculos")
async def veiculos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de veículos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["v.tenant_id = :tid"]
    if vehicle_type:
        where_clauses.append("v.vehicle_type = :vtype")
        params["vtype"] = vehicle_type
    if search:
        where_clauses.append("(v.plate ILIKE :search OR v.model ILIKE :search OR v.brand ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM vehicles v WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT v.id, v.plate, v.model, v.brand, v.color, v.year, v.vehicle_type, v.tag_number,
            u.name as owner_name, un.block || '-' || un.number as unidade, v.created_at
        FROM vehicles v
        LEFT JOIN users u ON u.id = v.owner_id
        LEFT JOIN units un ON un.id = v.unit_id
        WHERE {where_sql}
        ORDER BY v.plate LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "veiculos")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== MANUTENÇÃO ====================
@router.get("/manutencao")
async def manutencao_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de chamados de manutenção"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["m.tenant_id = :tid"]
    if status:
        where_clauses.append("m.status = :status")
        params["status"] = status
    if category:
        where_clauses.append("m.category = :category")
        params["category"] = category
    if priority:
        where_clauses.append("m.priority = :priority")
        params["priority"] = priority
    if search:
        where_clauses.append("(m.title ILIKE :search OR m.protocol ILIKE :search)")
        params["search"] = f"%{search}%"
    if start_date:
        where_clauses.append("m.created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("m.created_at <= :end_date")
        params["end_date"] = end_date

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM maintenance_tickets m WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT m.id, m.protocol, m.title, m.category, m.priority, m.status, 
            m.assigned_to, m.created_at, m.resolved_at,
            u.name as requester_name, un.block || '-' || un.number as unidade
        FROM maintenance_tickets m
        LEFT JOIN users u ON u.id = m.requester_id
        LEFT JOIN units un ON un.id = m.unit_id
        WHERE {where_sql}
        ORDER BY m.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "manutencao")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== OCORRÊNCIAS ====================
@router.get("/ocorrencias")
async def ocorrencias_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de ocorrências"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["o.tenant_id = :tid"]
    if status:
        where_clauses.append("o.status = :status")
        params["status"] = status
    if category:
        where_clauses.append("o.category = :category")
        params["category"] = category
    if severity:
        where_clauses.append("o.severity = :severity")
        params["severity"] = severity
    if search:
        where_clauses.append("(o.title ILIKE :search OR o.protocol ILIKE :search)")
        params["search"] = f"%{search}%"
    if start_date:
        where_clauses.append("o.created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("o.created_at <= :end_date")
        params["end_date"] = end_date

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM occurrences o WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT o.id, o.protocol, o.title, o.category, o.severity, o.status, 
            o.location, o.created_at, o.resolved_at,
            u.name as reporter_name
        FROM occurrences o
        LEFT JOIN users u ON u.id = o.reporter_id
        WHERE {where_sql}
        ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "ocorrencias")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== UNIDADES ====================
@router.get("/unidades")
async def unidades_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    is_rented: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de unidades"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["u.tenant_id = :tid", "u.is_active = true"]
    if is_rented is not None:
        where_clauses.append(f"u.is_rented = {'true' if is_rented else 'false'}")
    if search:
        where_clauses.append("(u.block ILIKE :search OR u.number ILIKE :search)")
        params["search"] = f"%{search}%"

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM units u WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT u.id, u.block, u.number, u.floor, u.unit_type, u.area, u.is_rented,
            owner.name as owner_name, tenant_u.name as tenant_name
        FROM units u
        LEFT JOIN users owner ON owner.id = u.owner_id
        LEFT JOIN users tenant_u ON tenant_u.id = u.tenant_user_id
        WHERE {where_sql}
        ORDER BY u.block, u.number LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "unidades")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== ACESSOS ====================
@router.get("/acessos")
async def acessos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    access_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de logs de acesso"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}

    where_clauses = ["a.tenant_id = :tid"]
    if access_type:
        where_clauses.append("a.access_type = :atype")
        params["atype"] = access_type
    if start_date:
        where_clauses.append("a.registered_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("a.registered_at <= :end_date")
        params["end_date"] = end_date

    where_sql = " AND ".join(where_clauses)

    count_result = await db.execute(text(f"SELECT COUNT(*) FROM access_logs a WHERE {where_sql}"), params)
    total = count_result.scalar() or 0

    result = await db.execute(
        text(
            f"""
        SELECT a.id, a.access_type, a.access_method, a.access_point, a.vehicle_plate, a.registered_at,
            COALESCE(u.name, v.name) as person_name,
            CASE WHEN u.id IS NOT NULL THEN 'Morador' ELSE 'Visitante' END as person_type,
            un.block || '-' || un.number as unidade
        FROM access_logs a
        LEFT JOIN users u ON u.id = a.user_id
        LEFT JOIN visitors v ON v.id = a.visitor_id
        LEFT JOIN units un ON un.id = a.unit_id
        WHERE {where_sql}
        ORDER BY a.registered_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )

    items = [dict(row._mapping) for row in result.fetchall()]

    if format == "csv":
        return generate_csv(items, "acessos")

    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== RESUMO GERAL ====================
@router.get("/resumo")
async def resumo_geral(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    """Resumo geral para a página de relatórios"""
    result = await db.execute(
        text(
            """
        SELECT
            (SELECT COUNT(*) FROM users WHERE tenant_id = :tid AND is_deleted = false) as moradores,
            (SELECT COUNT(*) FROM visitors WHERE tenant_id = :tid) as visitantes,
            (SELECT COUNT(*) FROM vehicles WHERE tenant_id = :tid) as veiculos,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :tid) as manutencao,
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :tid) as ocorrencias,
            (SELECT COUNT(*) FROM units WHERE tenant_id = :tid AND is_active = true) as unidades,
            (SELECT COUNT(*) FROM access_logs WHERE tenant_id = :tid) as acessos
    """
        ),
        {"tid": tenant_id},
    )

    row = result.fetchone()
    return {
        "moradores": row[0] or 0,
        "visitantes": row[1] or 0,
        "veiculos": row[2] or 0,
        "manutencao": row[3] or 0,
        "ocorrencias": row[4] or 0,
        "unidades": row[5] or 0,
        "acessos": row[6] or 0,
    }


def generate_csv(items: List[dict], filename: str) -> StreamingResponse:
    """Gera CSV a partir dos dados"""
    if not items:
        content = "Sem dados"
    else:
        headers = list(items[0].keys())
        lines = [",".join(headers)]
        for item in items:
            values = []
            for h in headers:
                val = item.get(h, "")
                if val is None:
                    val = ""
                val = str(val).replace(",", ";").replace("\n", " ")
                values.append(val)
            lines.append(",".join(values))
        content = "\n".join(lines)

    return StreamingResponse(
        io.StringIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}_{datetime.now().strftime('%Y%m%d')}.csv"},
    )


# ==================== DEPENDENTES ====================
@router.get("/dependentes")
async def dependentes_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de dependentes"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if search:
        where_clauses.append("(name ILIKE :search OR cpf ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM dependents WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, name, phone, relationship_type, cpf, rg, has_special_needs, created_at
        FROM dependents WHERE {where_sql} ORDER BY name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "dependentes")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== PETS ====================
@router.get("/pets")
async def pets_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    species: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de pets"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if search:
        where_clauses.append("(name ILIKE :search OR breed ILIKE :search)")
        params["search"] = f"%{search}%"
    if species:
        where_clauses.append("species = :species")
        params["species"] = species
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM pets WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, name, species, breed, size, gender, color, created_at
        FROM pets WHERE {where_sql} ORDER BY name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "pets")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== RESERVAS ====================
@router.get("/reservas")
async def reservas_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de reservas"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["r.tenant_id = :tid"]
    if status:
        where_clauses.append("r.status = :status")
        params["status"] = status
    if start_date:
        where_clauses.append("r.date >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("r.date <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM reservations r WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT r.id, r.date, r.start_time, r.end_time, r.status, r.notes, r.created_at,
            ca.name as area_name, u.name as user_name
        FROM reservations r
        LEFT JOIN common_areas ca ON ca.id = r.common_area_id
        LEFT JOIN users u ON u.id = r.user_id
        WHERE {where_sql} ORDER BY r.date DESC, r.start_time LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "reservas")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== ENCOMENDAS ====================
@router.get("/encomendas")
async def encomendas_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de encomendas"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["p.tenant_id = :tid"]
    if status:
        where_clauses.append("p.status = :status")
        params["status"] = status
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM packages p WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT p.id, p.tracking_code, p.carrier, p.package_type, p.status, p.received_at, p.delivered_at,
            p.received_by, p.delivered_to, un.block || '-' || un.number as unidade
        FROM packages p
        LEFT JOIN units un ON un.id = p.unit_id
        WHERE {where_sql} ORDER BY p.received_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "encomendas")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== CHAVES ====================
@router.get("/chaves")
async def chaves_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de chaves"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if search:
        where_clauses.append("(name ILIKE :search OR code ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM keys WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, name, code, location, status, created_at FROM keys 
        WHERE {where_sql} ORDER BY name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "chaves")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== HISTÓRICO DE CHAVES ====================
@router.get("/chaves-historico")
async def chaves_historico_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de histórico de chaves"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["kl.tenant_id = :tid"]
    if start_date:
        where_clauses.append("kl.created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("kl.created_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM key_logs kl WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT kl.id, kl.action, kl.created_at, k.name as key_name, u.name as user_name
        FROM key_logs kl
        LEFT JOIN keys k ON k.id = kl.key_id
        LEFT JOIN users u ON u.id = kl.user_id
        WHERE {where_sql} ORDER BY kl.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "chaves_historico")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== LIVRO DA PORTARIA ====================
@router.get("/livro-portaria")
async def livro_portaria_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório do livro da portaria"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if start_date:
        where_clauses.append("created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("created_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM logbook WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, entry_type, description, created_at, created_by FROM logbook
        WHERE {where_sql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "livro_portaria")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== ACHADOS E PERDIDOS ====================
@router.get("/achados-perdidos")
async def achados_perdidos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de achados e perdidos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if search:
        where_clauses.append("(title ILIKE :search OR description ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM lost_found WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, title, description, item_type, location, status, found_date, created_at
        FROM lost_found WHERE {where_sql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "achados_perdidos")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== OBRAS ====================
@router.get("/obras")
async def obras_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de obras"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if search:
        where_clauses.append("(title ILIKE :search OR description ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM works WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, title, description, status, start_date, end_date, contractor, created_at
        FROM works WHERE {where_sql} ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "obras")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== ATIVOS ====================
@router.get("/ativos")
async def ativos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de ativos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["a.tenant_id = :tid"]
    if search:
        where_clauses.append("(a.name ILIKE :search OR a.code ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM ativos a WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT a.id, a.name, a.code, a.description, a.location, a.status, a.acquisition_date, a.created_at,
            c.name as categoria
        FROM ativos a
        LEFT JOIN ativos_categorias c ON c.id = a.categoria_id
        WHERE {where_sql} ORDER BY a.name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "ativos")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== DISPOSITIVOS ====================
@router.get("/dispositivos")
async def dispositivos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de dispositivos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["tenant_id = :tid"]
    if search:
        where_clauses.append("(name ILIKE :search OR serial_number ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM devices WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT id, name, device_type, serial_number, location, status, ip_address, created_at
        FROM devices WHERE {where_sql} ORDER BY name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "dispositivos")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== SOLICITAÇÕES DE DISPOSITIVOS ====================
@router.get("/dispositivos-solicitacoes")
async def dispositivos_solicitacoes_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de solicitações de dispositivos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["dr.tenant_id = :tid"]
    if status:
        where_clauses.append("dr.status = :status")
        params["status"] = status
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM device_requests dr WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT dr.id, dr.request_type, dr.status, dr.notes, dr.created_at, u.name as user_name
        FROM device_requests dr
        LEFT JOIN users u ON u.id = dr.user_id
        WHERE {where_sql} ORDER BY dr.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "dispositivos_solicitacoes")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== SOLICITAÇÕES DE ACESSO ====================
@router.get("/solicitacoes-acesso")
async def solicitacoes_acesso_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de solicitações de acesso"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["sa.tenant_id = :tid"]
    if status:
        where_clauses.append("sa.status = :status")
        params["status"] = status
    if tipo:
        where_clauses.append("sa.tipo = :tipo")
        params["tipo"] = tipo
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM acessos_solicitacoes sa WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT sa.id, sa.tipo, sa.status, sa.motivo, sa.created_at, u.name as user_name
        FROM acessos_solicitacoes sa
        LEFT JOIN users u ON u.id = sa.user_id
        WHERE {where_sql} ORDER BY sa.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "solicitacoes_acesso")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== VAGAS DE ESTACIONAMENTO ====================
@router.get("/vagas")
async def vagas_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de vagas de estacionamento"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["ps.tenant_id = :tid"]
    if search:
        where_clauses.append("(ps.number ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM parking_spots ps WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT ps.id, ps.number, ps.spot_type, ps.location, ps.status, ps.created_at,
            un.block || '-' || un.number as unidade
        FROM parking_spots ps
        LEFT JOIN units un ON un.id = ps.unit_id
        WHERE {where_sql} ORDER BY ps.number LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "vagas")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== VEÍCULOS DE VISITANTES ====================
@router.get("/veiculos-visitantes")
async def veiculos_visitantes_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de veículos de visitantes"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["vv.tenant_id = :tid"]
    if search:
        where_clauses.append("(vv.plate ILIKE :search OR vv.model ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM visitor_vehicles vv WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT vv.id, vv.plate, vv.model, vv.brand, vv.color, vv.created_at, v.name as visitor_name
        FROM visitor_vehicles vv
        LEFT JOIN visitors v ON v.id = vv.visitor_id
        WHERE {where_sql} ORDER BY vv.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "veiculos_visitantes")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== LOGS DE AUDITORIA ====================
@router.get("/auditoria")
async def auditoria_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    action: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de logs de auditoria"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["al.tenant_id = :tid"]
    if action:
        where_clauses.append("al.action = :action")
        params["action"] = action
    if start_date:
        where_clauses.append("al.created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("al.created_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM audit_logs al WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT al.id, al.action, al.entity_type, al.entity_id, al.old_values, al.new_values, al.ip_address, al.created_at,
            u.name as user_name
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE {where_sql} ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "auditoria")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== LOGINS ====================
@router.get("/logins")
async def logins_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de logins"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["al.tenant_id = :tid", "al.action = 'login'"]
    if start_date:
        where_clauses.append("al.created_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("al.created_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM audit_logs al WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT al.id, al.ip_address, al.user_agent, al.created_at, u.name as user_name, u.email
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE {where_sql} ORDER BY al.created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "logins")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== LOGS DE ACESSO ====================
@router.get("/logs-acesso")
async def logs_acesso_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    access_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de logs de acesso físico"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["al.tenant_id = :tid"]
    if access_type:
        where_clauses.append("al.access_type = :access_type")
        params["access_type"] = access_type
    if start_date:
        where_clauses.append("al.registered_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("al.registered_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM access_logs al WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT al.id, al.access_type, al.access_method, al.access_point, al.vehicle_plate, al.registered_at,
            COALESCE(u.name, v.name) as person_name,
            CASE WHEN u.id IS NOT NULL THEN 'Morador' ELSE 'Visitante' END as person_type
        FROM access_logs al
        LEFT JOIN users u ON u.id = al.user_id
        LEFT JOIN visitors v ON v.id = al.visitor_id
        WHERE {where_sql} ORDER BY al.registered_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "logs_acesso")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== VISITANTES ATIVOS ====================
@router.get("/visitantes-ativos")
async def visitantes_ativos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de visitantes ativos no condomínio"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM visitors WHERE tenant_id = :tid AND is_blocked = false"), params
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            """
        SELECT id, name, cpf, phone, visitor_type, company, created_at
        FROM visitors WHERE tenant_id = :tid AND is_blocked = false
        ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "visitantes_ativos")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== ENTRADA/SAÍDA VISITANTES ====================
@router.get("/visitantes-log")
async def visitantes_log_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de entrada/saída de visitantes"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["al.tenant_id = :tid", "al.visitor_id IS NOT NULL"]
    if start_date:
        where_clauses.append("al.registered_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("al.registered_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM access_logs al WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT al.id, al.access_type, al.access_point, al.registered_at, v.name as visitor_name, v.visitor_type
        FROM access_logs al
        LEFT JOIN visitors v ON v.id = al.visitor_id
        WHERE {where_sql} ORDER BY al.registered_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "visitantes_log")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== ENTRADA/SAÍDA PRESTADORES ====================
@router.get("/prestadores-log")
async def prestadores_log_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de entrada/saída de prestadores"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["al.tenant_id = :tid", "v.visitor_type = 'prestador'"]
    if start_date:
        where_clauses.append("al.registered_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("al.registered_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(
        text(
            f"""
        SELECT COUNT(*) FROM access_logs al
        LEFT JOIN visitors v ON v.id = al.visitor_id
        WHERE {where_sql}
    """
        ),
        params,
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT al.id, al.access_type, al.access_point, al.registered_at, v.name as visitor_name, v.company
        FROM access_logs al
        LEFT JOIN visitors v ON v.id = al.visitor_id
        WHERE {where_sql} ORDER BY al.registered_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "prestadores_log")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== PRESENÇA DIÁRIA ====================
@router.get("/presenca-diaria")
async def presenca_diaria_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    data: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de presença diária"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    if data:
        params["data"] = data
        where_date = "AND al.registered_at::date = :data"
    else:
        where_date = "AND al.registered_at::date = CURRENT_DATE"
    count_result = await db.execute(
        text(
            f"""
        SELECT COUNT(DISTINCT COALESCE(al.user_id, al.visitor_id)) FROM access_logs al 
        WHERE al.tenant_id = :tid {where_date}
    """
        ),
        params,
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT DISTINCT COALESCE(u.name, v.name) as pessoa,
            CASE WHEN u.id IS NOT NULL THEN 'Morador' ELSE 'Visitante' END as tipo,
            MIN(al.registered_at) as primeira_entrada, MAX(al.registered_at) as ultima_atividade
        FROM access_logs al
        LEFT JOIN users u ON u.id = al.user_id
        LEFT JOIN visitors v ON v.id = al.visitor_id
        WHERE al.tenant_id = :tid {where_date}
        GROUP BY COALESCE(u.name, v.name), CASE WHEN u.id IS NOT NULL THEN 'Morador' ELSE 'Visitante' END
        ORDER BY primeira_entrada LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "presenca_diaria")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== HISTÓRICO DE FREQUÊNCIA ====================
@router.get("/historico-frequencia")
async def historico_frequencia_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de histórico de frequência"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["al.tenant_id = :tid", "al.user_id IS NOT NULL"]
    if user_id:
        where_clauses.append("al.user_id = :user_id")
        params["user_id"] = user_id
    if start_date:
        where_clauses.append("al.registered_at >= :start_date")
        params["start_date"] = start_date
    if end_date:
        where_clauses.append("al.registered_at <= :end_date")
        params["end_date"] = end_date
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM access_logs al WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT al.id, al.access_type, al.access_point, al.registered_at, u.name as user_name
        FROM access_logs al
        LEFT JOIN users u ON u.id = al.user_id
        WHERE {where_sql} ORDER BY al.registered_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "historico_frequencia")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== USUÁRIOS DETALHADOS ====================
@router.get("/usuarios-detalhados")
async def usuarios_detalhados_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de usuários detalhados"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["u.tenant_id = :tid", "u.is_deleted = false"]
    if search:
        where_clauses.append("(u.name ILIKE :search OR u.email ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(text(f"SELECT COUNT(*) FROM users u WHERE {where_sql}"), params)
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT u.id, u.name, u.email, u.phone, u.cpf, u.rg, u.role, u.is_active, u.birth_date, u.created_at,
            (SELECT COUNT(*) FROM dependents d WHERE d.user_id = u.id) as total_dependentes,
            (SELECT COUNT(*) FROM vehicles v WHERE v.owner_id = u.id) as total_veiculos,
            (SELECT COUNT(*) FROM pets p WHERE p.owner_id = u.id) as total_pets
        FROM users u WHERE {where_sql} ORDER BY u.name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "usuarios_detalhados")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== VEÍCULOS DETALHADOS ====================
@router.get("/veiculos-detalhados")
async def veiculos_detalhados_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de veículos detalhados"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    where_clauses = ["v.tenant_id = :tid"]
    if search:
        where_clauses.append("(v.plate ILIKE :search OR v.model ILIKE :search OR u.name ILIKE :search)")
        params["search"] = f"%{search}%"
    where_sql = " AND ".join(where_clauses)
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM vehicles v LEFT JOIN users u ON u.id = v.owner_id WHERE {where_sql}"), params
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            f"""
        SELECT v.id, v.plate, v.model, v.brand, v.color, v.year, v.vehicle_type, v.tag_number, v.chassis, v.renavam,
            u.name as owner_name, u.phone as owner_phone, un.block || '-' || un.number as unidade
        FROM vehicles v
        LEFT JOIN users u ON u.id = v.owner_id
        LEFT JOIN units un ON un.id = v.unit_id
        WHERE {where_sql} ORDER BY v.plate LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "veiculos_detalhados")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== PROPRIETÁRIOS DE VEÍCULOS ====================
@router.get("/proprietarios-veiculos")
async def proprietarios_veiculos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de proprietários de veículos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    count_result = await db.execute(
        text("SELECT COUNT(DISTINCT owner_id) FROM vehicles WHERE tenant_id = :tid AND owner_id IS NOT NULL"), params
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            """
        SELECT u.id, u.name, u.email, u.phone, COUNT(v.id) as total_veiculos,
            string_agg(v.plate, ', ') as placas
        FROM users u
        JOIN vehicles v ON v.owner_id = u.id
        WHERE v.tenant_id = :tid
        GROUP BY u.id, u.name, u.email, u.phone
        ORDER BY u.name LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "proprietarios_veiculos")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== PREVISÕES DE VISITA ====================
@router.get("/previsoes-visita")
async def previsoes_visita_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de previsões de visita (visitantes esperados)"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM visitors WHERE tenant_id = :tid AND is_blocked = false"), params
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            """
        SELECT id, name, cpf, phone, visitor_type, company, service, created_at
        FROM visitors WHERE tenant_id = :tid AND is_blocked = false
        ORDER BY created_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "previsoes_visita")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== REGISTROS EXCLUÍDOS ====================
@router.get("/registros-excluidos")
async def registros_excluidos_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de registros excluídos"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM users WHERE tenant_id = :tid AND is_deleted = true"), params
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            """
        SELECT id, name, email, phone, cpf, role, created_at, updated_at as deleted_at
        FROM users WHERE tenant_id = :tid AND is_deleted = true
        ORDER BY updated_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "registros_excluidos")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== EVENTOS DE HARDWARE ====================
@router.get("/eventos-hardware")
async def eventos_hardware_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de eventos de hardware"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    # Usando access_logs como proxy para eventos de hardware
    count_result = await db.execute(
        text("SELECT COUNT(*) FROM access_logs WHERE tenant_id = :tid AND access_method IS NOT NULL"), params
    )
    total = count_result.scalar() or 0
    result = await db.execute(
        text(
            """
        SELECT id, access_type, access_method, access_point, vehicle_plate, registered_at
        FROM access_logs WHERE tenant_id = :tid AND access_method IS NOT NULL
        ORDER BY registered_at DESC LIMIT :limit OFFSET :offset
    """
        ),
        params,
    )
    items = [dict(row._mapping) for row in result.fetchall()]
    if format == "csv":
        return generate_csv(items, "eventos_hardware")
    return {"items": items, "total": total, "page": page, "generated_at": datetime.now().isoformat()}


# ==================== EVENTOS DE VELOCIDADE ====================
@router.get("/eventos-velocidade")
async def eventos_velocidade_report(
    tenant_id: int = Query(1, description="ID do condomínio"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    format: str = Query("json", pattern="^(json|csv)$"),
    db: AsyncSession = Depends(get_db),
):
    """Relatório de eventos de velocidade"""
    params = {"tid": tenant_id, "limit": limit, "offset": (page - 1) * limit}
    # Placeholder - retorna vazio se não houver tabela específica
    return {"items": [], "total": 0, "page": page, "generated_at": datetime.now().isoformat()}
