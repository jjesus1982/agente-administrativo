"""
API de Pontos de Acesso
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    PontoAcessoCreate,
    PontoAcessoListResponse,
    PontoAcessoResponse,
    PontoAcessoStatusResponse,
    PontoAcessoUpdate,
)

router = APIRouter(prefix="/portaria/pontos-acesso", tags=["Portaria - Pontos de Acesso"])


@router.get("", response_model=PontoAcessoListResponse)
async def listar_pontos(
    tenant_id: int = Query(..., description="ID do condomínio"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tipo: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os pontos de acesso."""
    query = "SELECT * FROM pontos_acesso WHERE tenant_id = :tenant_id"
    params = {"tenant_id": tenant_id}

    if tipo:
        query += " AND tipo = :tipo"
        params["tipo"] = tipo

    if is_active is not None:
        query += " AND is_active = :is_active"
        params["is_active"] = is_active

    # Count total
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM ({query}) as subq"),
        params
    )
    total = count_result.scalar()

    # Get items
    query += " ORDER BY ordem, nome LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    items = [
        PontoAcessoResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            codigo=row.codigo,
            nome=row.nome,
            descricao=row.descricao,
            tipo=row.tipo,
            device_id=row.device_id,
            ip_address=row.ip_address,
            porta=row.porta,
            rele_id=row.rele_id,
            sensor_id=row.sensor_id,
            is_eclusa=row.is_eclusa,
            eclusa_pair_id=row.eclusa_pair_id,
            eclusa_delay=row.eclusa_delay,
            interfone_ramal=row.interfone_ramal,
            interfone_ip=row.interfone_ip,
            status=row.status,
            last_ping_at=row.last_ping_at,
            ordem=row.ordem,
            visivel=row.visivel,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in rows
    ]

    return PontoAcessoListResponse(
        items=items,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/status", response_model=List[PontoAcessoStatusResponse])
async def status_pontos(
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o status de todos os pontos de acesso ativos."""
    result = await db.execute(
        text("""
            SELECT id, codigo, nome, status, last_ping_at
            FROM pontos_acesso
            WHERE tenant_id = :tenant_id AND is_active = true AND visivel = true
            ORDER BY ordem, nome
        """),
        {"tenant_id": tenant_id}
    )

    return [
        PontoAcessoStatusResponse(
            id=row.id,
            codigo=row.codigo,
            nome=row.nome,
            status=row.status,
            last_ping_at=row.last_ping_at,
            is_online=row.status == "online"
        )
        for row in result.fetchall()
    ]


@router.get("/{ponto_id}", response_model=PontoAcessoResponse)
async def obter_ponto(
    ponto_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém um ponto de acesso pelo ID."""
    result = await db.execute(
        text("SELECT * FROM pontos_acesso WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": ponto_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Ponto de acesso não encontrado")

    return PontoAcessoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        codigo=row.codigo,
        nome=row.nome,
        descricao=row.descricao,
        tipo=row.tipo,
        device_id=row.device_id,
        ip_address=row.ip_address,
        porta=row.porta,
        rele_id=row.rele_id,
        sensor_id=row.sensor_id,
        is_eclusa=row.is_eclusa,
        eclusa_pair_id=row.eclusa_pair_id,
        eclusa_delay=row.eclusa_delay,
        interfone_ramal=row.interfone_ramal,
        interfone_ip=row.interfone_ip,
        status=row.status,
        last_ping_at=row.last_ping_at,
        ordem=row.ordem,
        visivel=row.visivel,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("", response_model=PontoAcessoResponse, status_code=status.HTTP_201_CREATED)
async def criar_ponto(
    dados: PontoAcessoCreate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo ponto de acesso."""
    result = await db.execute(
        text("""
            INSERT INTO pontos_acesso (
                tenant_id, codigo, nome, descricao, tipo,
                device_id, ip_address, porta, rele_id, sensor_id,
                is_eclusa, eclusa_pair_id, eclusa_delay,
                interfone_ramal, interfone_ip,
                ordem, visivel, is_active, status, created_at
            ) VALUES (
                :tenant_id, :codigo, :nome, :descricao, :tipo,
                :device_id, :ip_address, :porta, :rele_id, :sensor_id,
                :is_eclusa, :eclusa_pair_id, :eclusa_delay,
                :interfone_ramal, :interfone_ip,
                :ordem, :visivel, :is_active, 'offline', NOW()
            )
            RETURNING *
        """),
        {
            "tenant_id": tenant_id,
            "codigo": dados.codigo,
            "nome": dados.nome,
            "descricao": dados.descricao,
            "tipo": dados.tipo,
            "device_id": dados.device_id,
            "ip_address": dados.ip_address,
            "porta": dados.porta,
            "rele_id": dados.rele_id,
            "sensor_id": dados.sensor_id,
            "is_eclusa": dados.is_eclusa,
            "eclusa_pair_id": dados.eclusa_pair_id,
            "eclusa_delay": dados.eclusa_delay,
            "interfone_ramal": dados.interfone_ramal,
            "interfone_ip": dados.interfone_ip,
            "ordem": dados.ordem,
            "visivel": dados.visivel,
            "is_active": dados.is_active
        }
    )
    await db.commit()
    row = result.fetchone()

    return PontoAcessoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        codigo=row.codigo,
        nome=row.nome,
        descricao=row.descricao,
        tipo=row.tipo,
        device_id=row.device_id,
        ip_address=row.ip_address,
        porta=row.porta,
        rele_id=row.rele_id,
        sensor_id=row.sensor_id,
        is_eclusa=row.is_eclusa,
        eclusa_pair_id=row.eclusa_pair_id,
        eclusa_delay=row.eclusa_delay,
        interfone_ramal=row.interfone_ramal,
        interfone_ip=row.interfone_ip,
        status=row.status,
        last_ping_at=row.last_ping_at,
        ordem=row.ordem,
        visivel=row.visivel,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.put("/{ponto_id}", response_model=PontoAcessoResponse)
async def atualizar_ponto(
    ponto_id: int,
    dados: PontoAcessoUpdate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza um ponto de acesso."""
    check = await db.execute(
        text("SELECT id FROM pontos_acesso WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": ponto_id, "tenant_id": tenant_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Ponto de acesso não encontrado")

    updates = []
    params = {"id": ponto_id, "tenant_id": tenant_id}

    for field, value in dados.model_dump(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates.append("updated_at = NOW()")

    query = f"""
        UPDATE pontos_acesso
        SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tenant_id
        RETURNING *
    """

    result = await db.execute(text(query), params)
    await db.commit()
    row = result.fetchone()

    return PontoAcessoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        codigo=row.codigo,
        nome=row.nome,
        descricao=row.descricao,
        tipo=row.tipo,
        device_id=row.device_id,
        ip_address=row.ip_address,
        porta=row.porta,
        rele_id=row.rele_id,
        sensor_id=row.sensor_id,
        is_eclusa=row.is_eclusa,
        eclusa_pair_id=row.eclusa_pair_id,
        eclusa_delay=row.eclusa_delay,
        interfone_ramal=row.interfone_ramal,
        interfone_ip=row.interfone_ip,
        status=row.status,
        last_ping_at=row.last_ping_at,
        ordem=row.ordem,
        visivel=row.visivel,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.delete("/{ponto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_ponto(
    ponto_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui um ponto de acesso (soft delete)."""
    result = await db.execute(
        text("""
            UPDATE pontos_acesso
            SET is_active = false, updated_at = NOW()
            WHERE id = :id AND tenant_id = :tenant_id
        """),
        {"id": ponto_id, "tenant_id": tenant_id}
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Ponto de acesso não encontrado")


@router.post("/{ponto_id}/abrir")
async def abrir_ponto(
    ponto_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    motivo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envia comando para abrir um ponto de acesso."""
    # Buscar ponto
    result = await db.execute(
        text("SELECT * FROM pontos_acesso WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": ponto_id, "tenant_id": tenant_id}
    )
    ponto = result.fetchone()

    if not ponto:
        raise HTTPException(status_code=404, detail="Ponto de acesso não encontrado")

    if ponto.status != "online":
        raise HTTPException(status_code=400, detail="Ponto de acesso não está online")

    # TODO: Implementar integração real com hardware
    # Por enquanto, apenas registra o comando

    # Registrar log de acesso
    await db.execute(
        text("""
            INSERT INTO access_logs (
                tenant_id, user_id, access_type, access_method, access_point,
                status, observations, registered_at
            ) VALUES (
                :tenant_id, :user_id, 'entrada', 'remote', :access_point,
                'authorized', :observations, NOW()
            )
        """),
        {
            "tenant_id": tenant_id,
            "user_id": current_user.id,
            "access_point": ponto.nome,
            "observations": f"Abertura remota: {motivo or 'Sem motivo informado'}"
        }
    )
    await db.commit()

    return {
        "success": True,
        "message": f"Comando de abertura enviado para {ponto.nome}",
        "ponto_id": ponto_id
    }


@router.get("/{ponto_id}/status", response_model=PontoAcessoStatusResponse)
async def status_ponto(
    ponto_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o status atual de um ponto de acesso."""
    result = await db.execute(
        text("""
            SELECT id, codigo, nome, status, last_ping_at
            FROM pontos_acesso
            WHERE id = :id AND tenant_id = :tenant_id
        """),
        {"id": ponto_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Ponto de acesso não encontrado")

    return PontoAcessoStatusResponse(
        id=row.id,
        codigo=row.codigo,
        nome=row.nome,
        status=row.status,
        last_ping_at=row.last_ping_at,
        is_online=row.status == "online"
    )


@router.post("/{ponto_id}/ping")
async def ping_ponto(
    ponto_id: int,
    status: str = Query("online", description="Status: online, offline, manutencao, erro"),
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza o status de um ponto de acesso (usado pelo hardware)."""
    result = await db.execute(
        text("""
            UPDATE pontos_acesso
            SET status = :status, last_ping_at = NOW()
            WHERE id = :id AND tenant_id = :tenant_id
            RETURNING id, nome
        """),
        {"id": ponto_id, "tenant_id": tenant_id, "status": status}
    )
    await db.commit()
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Ponto de acesso não encontrado")

    return {"success": True, "ponto": row.nome, "status": status}
