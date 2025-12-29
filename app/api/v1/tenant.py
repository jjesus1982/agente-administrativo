"""
Endpoint para dados do Condomínio (Tenant)
Dashboard de Gestão da Entidade
"""

import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.config import UPLOAD_BASE_DIR

router = APIRouter(prefix="/tenant", tags=["Tenant/Condomínio"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "tenant")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    cnpj: Optional[str] = None
    address: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


@router.get("")
async def get_tenant(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    """Dados do condomínio"""
    result = await db.execute(
        text(
            """
        SELECT id, name, cnpj, address, neighborhood, city, state, zip_code, 
               phone, email, logo_url, settings, is_active, 
               subscription_plan, subscription_expires_at, created_at
        FROM tenants WHERE id = :tid
    """
        ),
        {"tid": tenant_id},
    )

    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")

    return dict(row._mapping)


@router.get("/stats")
async def get_tenant_stats(
    tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Estatísticas gerais do condomínio"""

    units = await db.execute(text("SELECT COUNT(*) FROM units WHERE tenant_id = :tid"), {"tid": tenant_id})
    units_count = units.scalar() or 0

    users = await db.execute(
        text("SELECT COUNT(*) FROM users WHERE tenant_id = :tid AND is_active = true"), {"tid": tenant_id}
    )
    users_count = users.scalar() or 0

    vehicles = await db.execute(text("SELECT COUNT(*) FROM vehicles WHERE tenant_id = :tid"), {"tid": tenant_id})
    vehicles_count = vehicles.scalar() or 0

    dependents = await db.execute(text("SELECT COUNT(*) FROM dependents WHERE tenant_id = :tid"), {"tid": tenant_id})
    dependents_count = dependents.scalar() or 0

    pets = await db.execute(text("SELECT COUNT(*) FROM pets WHERE tenant_id = :tid"), {"tid": tenant_id})
    pets_count = pets.scalar() or 0

    blocks = await db.execute(
        text("SELECT COUNT(DISTINCT block) FROM units WHERE tenant_id = :tid"), {"tid": tenant_id}
    )
    blocks_count = blocks.scalar() or 0

    try:
        encomendas = await db.execute(
            text("SELECT COUNT(*) FROM packages WHERE tenant_id = :tid AND status IN ('pending', 'notified')"),
            {"tid": tenant_id},
        )
        encomendas_count = encomendas.scalar() or 0
    except:
        encomendas_count = 0

    try:
        manutencoes = await db.execute(
            text("SELECT COUNT(*) FROM manutencao WHERE tenant_id = :tid AND status NOT IN ('concluido', 'cancelado')"),
            {"tid": tenant_id},
        )
        manutencoes_count = manutencoes.scalar() or 0
    except:
        manutencoes_count = 0

    try:
        ocorrencias = await db.execute(
            text("SELECT COUNT(*) FROM ocorrencias WHERE tenant_id = :tid AND status = 'aberto'"), {"tid": tenant_id}
        )
        ocorrencias_count = ocorrencias.scalar() or 0
    except:
        ocorrencias_count = 0

    return {
        "unidades": units_count,
        "moradores": users_count,
        "veiculos": vehicles_count,
        "dependentes": dependents_count,
        "pets": pets_count,
        "blocos": blocks_count,
        "encomendas_pendentes": encomendas_count,
        "manutencoes_abertas": manutencoes_count,
        "ocorrencias_abertas": ocorrencias_count,
    }


@router.get("/equipe")
async def get_equipe(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    """Equipe do condomínio (síndicos, porteiros, etc)"""
    result = await db.execute(
        text(
            """
        SELECT u.id, u.name, u.email, u.phone, u.role, u.photo_url, u.is_active
        FROM users u
        WHERE u.tenant_id = :tid AND u.role >= 2
        ORDER BY u.role DESC, u.name
    """
        ),
        {"tid": tenant_id},
    )

    users = [dict(row._mapping) for row in result.fetchall()]

    # Separar por categoria
    administracao = [u for u in users if u["role"] >= 4]  # Admin, Super Admin
    gestao = [u for u in users if u["role"] in [2, 3]]  # Síndico, Porteiro

    return {"administracao": administracao, "gestao": gestao, "total": len(users)}


@router.put("")
async def update_tenant(
    data: TenantUpdate, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """Atualizar dados do condomínio"""
    updates = []
    params = {"tid": tenant_id}

    if data.name is not None:
        updates.append("name = :name")
        params["name"] = data.name
    if data.cnpj is not None:
        updates.append("cnpj = :cnpj")
        params["cnpj"] = data.cnpj
    if data.address is not None:
        updates.append("address = :address")
        params["address"] = data.address
    if data.neighborhood is not None:
        updates.append("neighborhood = :neighborhood")
        params["neighborhood"] = data.neighborhood
    if data.city is not None:
        updates.append("city = :city")
        params["city"] = data.city
    if data.state is not None:
        updates.append("state = :state")
        params["state"] = data.state
    if data.zip_code is not None:
        updates.append("zip_code = :zip_code")
        params["zip_code"] = data.zip_code
    if data.phone is not None:
        updates.append("phone = :phone")
        params["phone"] = data.phone
    if data.email is not None:
        updates.append("email = :email")
        params["email"] = data.email

    if updates:
        updates.append("updated_at = NOW()")
        await db.execute(
            text(
                f"""
            UPDATE tenants SET {', '.join(updates)} WHERE id = :tid
        """
            ),
            params,
        )
        await db.commit()

    return {"success": True, "message": "Dados atualizados com sucesso"}


@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Upload do logo do condomínio"""
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"logo_{tenant_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    logo_url = f"/uploads/tenant/{filename}"

    await db.execute(
        text(
            """
        UPDATE tenants SET logo_url = :logo_url, updated_at = NOW() WHERE id = :tid
    """
        ),
        {"logo_url": logo_url, "tid": tenant_id},
    )

    await db.commit()
    return {"logo_url": logo_url}


# ==================== MULTI-TENANT PÚBLICO ====================


@router.get("/user/{user_id}/tenants")
async def get_user_tenants(
    user_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    """
    Retorna lista de condomínios que o usuário tem acesso.
    Endpoint público para desenvolvimento (sem JWT).
    """
    query = text(
        """
        SELECT 
            ut.id,
            ut.tenant_id,
            ut.is_primary,
            ut.role_in_tenant,
            t.name as tenant_name,
            t.logo_url,
            t.city,
            t.state,
            (SELECT COUNT(*) FROM units WHERE tenant_id = t.id) as total_units,
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as total_users
        FROM user_tenants ut
        JOIN tenants t ON ut.tenant_id = t.id
        WHERE ut.user_id = :user_id
        ORDER BY ut.is_primary DESC, t.name ASC
    """
    )
    result = await db.execute(query, {"user_id": user_id})
    rows = result.fetchall()

    # Se não tem registros em user_tenants, retorna o tenant principal do usuário
    if not rows:
        query2 = text(
            """
            SELECT 
                0 as id,
                t.id as tenant_id,
                true as is_primary,
                u.role as role_in_tenant,
                t.name as tenant_name,
                t.logo_url,
                t.city,
                t.state,
                (SELECT COUNT(*) FROM units WHERE tenant_id = t.id) as total_units,
                (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as total_users
            FROM users u
            JOIN tenants t ON t.id = u.tenant_id
            WHERE u.id = :user_id
        """
        )
        result2 = await db.execute(query2, {"user_id": user_id})
        rows = result2.fetchall()

    return [
        {
            "id": row.id,
            "tenant_id": row.tenant_id,
            "tenant_name": row.tenant_name,
            "logo_url": row.logo_url,
            "city": row.city,
            "state": row.state,
            "is_primary": row.is_primary,
            "role_in_tenant": row.role_in_tenant,
            "total_units": row.total_units,
            "total_users": row.total_users,
        }
        for row in rows
    ]


# ==================== ENDPOINTS POR TENANT ID ====================


@router.get("/{tenant_id}")
async def get_tenant_by_id(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna dados de um tenant específico"""
    query = text("SELECT * FROM tenants WHERE id = :id")
    result = await db.execute(query, {"id": tenant_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    return dict(row._mapping)


@router.get("/{tenant_id}/stats")
async def get_tenant_stats(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna estatísticas de um tenant específico"""
    query = text(
        """
        SELECT
            (SELECT COUNT(*) FROM units WHERE tenant_id = :id) as unidades,
            (SELECT COUNT(*) FROM users WHERE tenant_id = :id AND is_active = true AND role = 1) as moradores,
            (SELECT COUNT(*) FROM vehicles WHERE tenant_id = :id) as veiculos,
            (SELECT COUNT(*) FROM dependents WHERE tenant_id = :id) as dependentes,
            (SELECT COUNT(*) FROM pets WHERE tenant_id = :id) as pets,
            (SELECT COUNT(DISTINCT block) FROM units WHERE tenant_id = :id AND block IS NOT NULL) as blocos,
            (SELECT COUNT(*) FROM packages WHERE tenant_id = :id AND status = 'pending') as encomendas_pendentes,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :id AND status IN ('open', 'in_progress')) as manutencoes_abertas,
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :id AND status IN ('open', 'in_progress')) as ocorrencias_abertas
    """
    )
    result = await db.execute(query, {"id": tenant_id})
    row = result.fetchone()

    return dict(row._mapping) if row else {}


@router.get("/{tenant_id}/equipe")
async def get_tenant_equipe(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna equipe de gestão de um tenant"""
    # Administração (síndicos e admins)
    admin_query = text(
        """
        SELECT id, name, email, phone, role, photo_url, is_active
        FROM users 
        WHERE tenant_id = :id AND role IN (2, 4, 5) AND is_active = true
        ORDER BY role DESC, name
    """
    )
    admin_result = await db.execute(admin_query, {"id": tenant_id})

    # Gestão operacional (porteiros)
    gestao_query = text(
        """
        SELECT id, name, email, phone, role, photo_url, is_active
        FROM users 
        WHERE tenant_id = :id AND role = 3 AND is_active = true
        ORDER BY name
    """
    )
    gestao_result = await db.execute(gestao_query, {"id": tenant_id})

    return {
        "administracao": [dict(row._mapping) for row in admin_result.fetchall()],
        "gestao": [dict(row._mapping) for row in gestao_result.fetchall()],
    }


# ==================== ENDPOINTS POR TENANT ID ====================


@router.get("/{tenant_id}")
async def get_tenant_by_id(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna dados de um tenant específico"""
    query = text("SELECT * FROM tenants WHERE id = :id")
    result = await db.execute(query, {"id": tenant_id})
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Condomínio não encontrado")

    return dict(row._mapping)


@router.get("/{tenant_id}/stats")
async def get_tenant_stats(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna estatísticas de um tenant específico"""
    query = text(
        """
        SELECT
            (SELECT COUNT(*) FROM units WHERE tenant_id = :id) as unidades,
            (SELECT COUNT(*) FROM users WHERE tenant_id = :id AND is_active = true AND role = 1) as moradores,
            (SELECT COUNT(*) FROM vehicles WHERE tenant_id = :id) as veiculos,
            (SELECT COUNT(*) FROM dependents WHERE tenant_id = :id) as dependentes,
            (SELECT COUNT(*) FROM pets WHERE tenant_id = :id) as pets,
            (SELECT COUNT(DISTINCT block) FROM units WHERE tenant_id = :id AND block IS NOT NULL) as blocos,
            (SELECT COUNT(*) FROM packages WHERE tenant_id = :id AND status = 'pending') as encomendas_pendentes,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE tenant_id = :id AND status IN ('open', 'in_progress')) as manutencoes_abertas,
            (SELECT COUNT(*) FROM occurrences WHERE tenant_id = :id AND status IN ('open', 'in_progress')) as ocorrencias_abertas
    """
    )
    result = await db.execute(query, {"id": tenant_id})
    row = result.fetchone()

    return dict(row._mapping) if row else {}


@router.get("/{tenant_id}/equipe")
async def get_tenant_equipe(tenant_id: int, db: AsyncSession = Depends(get_db)):
    """Retorna equipe de gestão de um tenant"""
    # Administração (síndicos e admins)
    admin_query = text(
        """
        SELECT id, name, email, phone, role, photo_url, is_active
        FROM users 
        WHERE tenant_id = :id AND role IN (2, 4, 5) AND is_active = true
        ORDER BY role DESC, name
    """
    )
    admin_result = await db.execute(admin_query, {"id": tenant_id})

    # Gestão operacional (porteiros)
    gestao_query = text(
        """
        SELECT id, name, email, phone, role, photo_url, is_active
        FROM users 
        WHERE tenant_id = :id AND role = 3 AND is_active = true
        ORDER BY name
    """
    )
    gestao_result = await db.execute(gestao_query, {"id": tenant_id})

    return {
        "administracao": [dict(row._mapping) for row in admin_result.fetchall()],
        "gestao": [dict(row._mapping) for row in gestao_result.fetchall()],
    }
