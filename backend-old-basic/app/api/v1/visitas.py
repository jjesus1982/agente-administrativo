"""
API de Visitas (Registro de Entrada/Saída)
"""

from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    VisitaAutorizar,
    VisitaCreate,
    VisitaFinalizar,
    VisitaListResponse,
    VisitaNegar,
    VisitaResponse,
)

router = APIRouter(prefix="/portaria/visitas", tags=["Portaria - Visitas"])


@router.get("", response_model=VisitaListResponse)
async def listar_visitas(
    tenant_id: int = Query(..., description="ID do condomínio"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    unit_id: Optional[int] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    tipo: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as visitas."""
    query = """
        SELECT v.*, u.number as unit_number, u.block as unit_block,
               m.name as morador_nome, pe.name as porteiro_entrada_nome
        FROM visitas v
        LEFT JOIN units u ON u.id = v.unit_id
        LEFT JOIN users m ON m.id = v.morador_id
        LEFT JOIN users pe ON pe.id = v.porteiro_entrada_id
        WHERE v.tenant_id = :tenant_id
    """
    params = {"tenant_id": tenant_id}

    if status_filter:
        query += " AND v.status = :status"
        params["status"] = status_filter

    if unit_id:
        query += " AND v.unit_id = :unit_id"
        params["unit_id"] = unit_id

    if data_inicio:
        query += " AND DATE(v.data_entrada) >= :data_inicio"
        params["data_inicio"] = data_inicio

    if data_fim:
        query += " AND DATE(v.data_entrada) <= :data_fim"
        params["data_fim"] = data_fim

    if tipo:
        query += " AND v.tipo = :tipo"
        params["tipo"] = tipo

    # Count total
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM ({query}) as subq"),
        params
    )
    total = count_result.scalar()

    # Get items
    query += " ORDER BY v.created_at DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    items = [
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
            tipo=row.tipo,
            morador_id=row.morador_id,
            morador_nome=row.morador_nome,
            porteiro_entrada_id=row.porteiro_entrada_id,
            porteiro_entrada_nome=row.porteiro_entrada_nome,
            porteiro_saida_id=row.porteiro_saida_id,
            status=row.status,
            data_entrada=row.data_entrada,
            data_saida=row.data_saida,
            autorizado_por=row.autorizado_por,
            metodo_autorizacao=row.metodo_autorizacao,
            pre_autorizacao_id=row.pre_autorizacao_id,
            ponto_entrada_id=row.ponto_entrada_id,
            ponto_saida_id=row.ponto_saida_id,
            veiculo_placa=row.veiculo_placa,
            veiculo_modelo=row.veiculo_modelo,
            observacoes=row.observacoes,
            motivo_negacao=row.motivo_negacao,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in rows
    ]

    return VisitaListResponse(
        items=items,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/em-andamento")
async def visitas_em_andamento(
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista visitas em andamento (dentro do condomínio)."""
    result = await db.execute(
        text("""
            SELECT v.*, u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome
            FROM visitas v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN users m ON m.id = v.morador_id
            WHERE v.tenant_id = :tenant_id AND v.status = 'em_andamento'
            ORDER BY v.data_entrada DESC
        """),
        {"tenant_id": tenant_id}
    )

    return [
        {
            "id": row.id,
            "visitante_nome": row.visitante_nome,
            "visitante_documento": row.visitante_documento,
            "visitante_foto_url": row.visitante_foto_url,
            "unit_number": row.unit_number,
            "unit_block": row.unit_block,
            "morador_nome": row.morador_nome,
            "tipo": row.tipo,
            "veiculo_placa": row.veiculo_placa,
            "data_entrada": row.data_entrada.isoformat() if row.data_entrada else None,
            "tempo_permanencia": (
                int((datetime.now() - row.data_entrada).total_seconds() / 60)
                if row.data_entrada else 0
            )
        }
        for row in result.fetchall()
    ]


@router.get("/aguardando")
async def visitas_aguardando(
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista visitas aguardando autorização."""
    result = await db.execute(
        text("""
            SELECT v.*, u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome
            FROM visitas v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN users m ON m.id = v.morador_id
            WHERE v.tenant_id = :tenant_id AND v.status = 'aguardando'
            ORDER BY v.created_at ASC
        """),
        {"tenant_id": tenant_id}
    )

    return [
        {
            "id": row.id,
            "visitante_nome": row.visitante_nome,
            "visitante_documento": row.visitante_documento,
            "unit_number": row.unit_number,
            "unit_block": row.unit_block,
            "morador_nome": row.morador_nome,
            "tipo": row.tipo,
            "veiculo_placa": row.veiculo_placa,
            "created_at": row.created_at.isoformat() if row.created_at else None
        }
        for row in result.fetchall()
    ]


@router.get("/{visita_id}", response_model=VisitaResponse)
async def obter_visita(
    visita_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém detalhes de uma visita."""
    result = await db.execute(
        text("""
            SELECT v.*, u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome, pe.name as porteiro_entrada_nome
            FROM visitas v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN users m ON m.id = v.morador_id
            LEFT JOIN users pe ON pe.id = v.porteiro_entrada_id
            WHERE v.id = :id AND v.tenant_id = :tenant_id
        """),
        {"id": visita_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Visita não encontrada")

    return VisitaResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        visitor_id=row.visitor_id,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_foto_url=row.visitante_foto_url,
        unit_id=row.unit_id,
        unit_number=row.unit_number,
        unit_block=row.unit_block,
        tipo=row.tipo,
        morador_id=row.morador_id,
        morador_nome=row.morador_nome,
        porteiro_entrada_id=row.porteiro_entrada_id,
        porteiro_entrada_nome=row.porteiro_entrada_nome,
        porteiro_saida_id=row.porteiro_saida_id,
        status=row.status,
        data_entrada=row.data_entrada,
        data_saida=row.data_saida,
        autorizado_por=row.autorizado_por,
        metodo_autorizacao=row.metodo_autorizacao,
        pre_autorizacao_id=row.pre_autorizacao_id,
        ponto_entrada_id=row.ponto_entrada_id,
        ponto_saida_id=row.ponto_saida_id,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        observacoes=row.observacoes,
        motivo_negacao=row.motivo_negacao,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("", response_model=VisitaResponse, status_code=status.HTTP_201_CREATED)
async def registrar_visita(
    dados: VisitaCreate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra uma nova visita (aguardando autorização)."""
    result = await db.execute(
        text("""
            INSERT INTO visitas (
                tenant_id, visitor_id, visitante_nome, visitante_documento, visitante_foto_url,
                unit_id, tipo, veiculo_placa, veiculo_modelo, observacoes,
                pre_autorizacao_id, ponto_entrada_id,
                status, created_at, created_by
            ) VALUES (
                :tenant_id, :visitor_id, :visitante_nome, :visitante_documento, :visitante_foto_url,
                :unit_id, :tipo, :veiculo_placa, :veiculo_modelo, :observacoes,
                :pre_autorizacao_id, :ponto_entrada_id,
                'aguardando', NOW(), :created_by
            )
            RETURNING *
        """),
        {
            "tenant_id": tenant_id,
            "visitor_id": dados.visitor_id,
            "visitante_nome": dados.visitante_nome,
            "visitante_documento": dados.visitante_documento,
            "visitante_foto_url": dados.visitante_foto_url,
            "unit_id": dados.unit_id,
            "tipo": dados.tipo,
            "veiculo_placa": dados.veiculo_placa,
            "veiculo_modelo": dados.veiculo_modelo,
            "observacoes": dados.observacoes,
            "pre_autorizacao_id": dados.pre_autorizacao_id,
            "ponto_entrada_id": dados.ponto_entrada_id,
            "created_by": current_user.id
        }
    )
    await db.commit()
    row = result.fetchone()

    # Buscar dados adicionais
    extra = await db.execute(
        text("SELECT number, block FROM units WHERE id = :id"),
        {"id": dados.unit_id}
    )
    unit = extra.fetchone()

    return VisitaResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        visitor_id=row.visitor_id,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_foto_url=row.visitante_foto_url,
        unit_id=row.unit_id,
        unit_number=unit.number if unit else None,
        unit_block=unit.block if unit else None,
        tipo=row.tipo,
        status=row.status,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        observacoes=row.observacoes,
        created_at=row.created_at
    )


@router.post("/{visita_id}/autorizar", response_model=VisitaResponse)
async def autorizar_visita(
    visita_id: int,
    dados: VisitaAutorizar,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Autoriza uma visita e registra a entrada."""
    check = await db.execute(
        text("SELECT * FROM visitas WHERE id = :id AND tenant_id = :tenant_id AND status = 'aguardando'"),
        {"id": visita_id, "tenant_id": tenant_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Visita não encontrada ou já processada")

    result = await db.execute(
        text("""
            UPDATE visitas
            SET status = 'em_andamento',
                data_entrada = NOW(),
                porteiro_entrada_id = :porteiro_id,
                autorizado_por = :autorizado_por,
                metodo_autorizacao = :metodo,
                ponto_entrada_id = :ponto_id,
                updated_at = NOW(),
                updated_by = :updated_by
            WHERE id = :id AND tenant_id = :tenant_id
            RETURNING *
        """),
        {
            "id": visita_id,
            "tenant_id": tenant_id,
            "porteiro_id": current_user.id,
            "autorizado_por": dados.autorizado_por or current_user.name,
            "metodo": dados.metodo_autorizacao,
            "ponto_id": dados.ponto_entrada_id,
            "updated_by": current_user.id
        }
    )
    await db.commit()
    row = result.fetchone()

    # Registrar no access_log
    await db.execute(
        text("""
            INSERT INTO access_logs (
                tenant_id, visitor_id, unit_id, access_type, access_method,
                status, registered_at
            ) VALUES (
                :tenant_id, :visitor_id, :unit_id, 'entrada', :method,
                'authorized', NOW()
            )
        """),
        {
            "tenant_id": tenant_id,
            "visitor_id": row.visitor_id,
            "unit_id": row.unit_id,
            "method": dados.metodo_autorizacao
        }
    )
    await db.commit()

    # Buscar dados adicionais
    extra = await db.execute(
        text("""
            SELECT u.number as unit_number, u.block as unit_block, m.name as morador_nome
            FROM visitas v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN users m ON m.id = v.morador_id
            WHERE v.id = :id
        """),
        {"id": visita_id}
    )
    extra_row = extra.fetchone()

    return VisitaResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        visitor_id=row.visitor_id,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_foto_url=row.visitante_foto_url,
        unit_id=row.unit_id,
        unit_number=extra_row.unit_number if extra_row else None,
        unit_block=extra_row.unit_block if extra_row else None,
        tipo=row.tipo,
        morador_id=row.morador_id,
        morador_nome=extra_row.morador_nome if extra_row else None,
        porteiro_entrada_id=row.porteiro_entrada_id,
        porteiro_entrada_nome=current_user.name,
        status=row.status,
        data_entrada=row.data_entrada,
        autorizado_por=row.autorizado_por,
        metodo_autorizacao=row.metodo_autorizacao,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        observacoes=row.observacoes,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("/{visita_id}/negar")
async def negar_visita(
    visita_id: int,
    dados: VisitaNegar,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Nega uma visita."""
    result = await db.execute(
        text("""
            UPDATE visitas
            SET status = 'negada',
                motivo_negacao = :motivo,
                updated_at = NOW(),
                updated_by = :updated_by
            WHERE id = :id AND tenant_id = :tenant_id AND status = 'aguardando'
            RETURNING id
        """),
        {
            "id": visita_id,
            "tenant_id": tenant_id,
            "motivo": dados.motivo_negacao,
            "updated_by": current_user.id
        }
    )
    await db.commit()

    if not result.fetchone():
        raise HTTPException(status_code=404, detail="Visita não encontrada ou já processada")

    return {"success": True, "message": "Visita negada"}


@router.post("/{visita_id}/finalizar", response_model=VisitaResponse)
async def finalizar_visita(
    visita_id: int,
    dados: VisitaFinalizar,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra a saída de uma visita."""
    check = await db.execute(
        text("SELECT * FROM visitas WHERE id = :id AND tenant_id = :tenant_id AND status = 'em_andamento'"),
        {"id": visita_id, "tenant_id": tenant_id}
    )
    visita = check.fetchone()

    if not visita:
        raise HTTPException(status_code=404, detail="Visita não encontrada ou não está em andamento")

    result = await db.execute(
        text("""
            UPDATE visitas
            SET status = 'finalizada',
                data_saida = NOW(),
                porteiro_saida_id = :porteiro_id,
                ponto_saida_id = :ponto_id,
                observacoes = COALESCE(:observacoes, observacoes),
                updated_at = NOW(),
                updated_by = :updated_by
            WHERE id = :id
            RETURNING *
        """),
        {
            "id": visita_id,
            "porteiro_id": current_user.id,
            "ponto_id": dados.ponto_saida_id,
            "observacoes": dados.observacoes,
            "updated_by": current_user.id
        }
    )
    await db.commit()
    row = result.fetchone()

    # Registrar no access_log
    await db.execute(
        text("""
            INSERT INTO access_logs (
                tenant_id, visitor_id, unit_id, access_type, access_method,
                status, registered_at
            ) VALUES (
                :tenant_id, :visitor_id, :unit_id, 'saida', 'porteiro',
                'authorized', NOW()
            )
        """),
        {
            "tenant_id": tenant_id,
            "visitor_id": visita.visitor_id,
            "unit_id": visita.unit_id
        }
    )
    await db.commit()

    # Buscar dados adicionais
    extra = await db.execute(
        text("""
            SELECT u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome, pe.name as porteiro_entrada_nome
            FROM visitas v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN users m ON m.id = v.morador_id
            LEFT JOIN users pe ON pe.id = v.porteiro_entrada_id
            WHERE v.id = :id
        """),
        {"id": visita_id}
    )
    extra_row = extra.fetchone()

    return VisitaResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        visitor_id=row.visitor_id,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_foto_url=row.visitante_foto_url,
        unit_id=row.unit_id,
        unit_number=extra_row.unit_number if extra_row else None,
        unit_block=extra_row.unit_block if extra_row else None,
        tipo=row.tipo,
        morador_id=row.morador_id,
        morador_nome=extra_row.morador_nome if extra_row else None,
        porteiro_entrada_id=row.porteiro_entrada_id,
        porteiro_entrada_nome=extra_row.porteiro_entrada_nome if extra_row else None,
        porteiro_saida_id=row.porteiro_saida_id,
        status=row.status,
        data_entrada=row.data_entrada,
        data_saida=row.data_saida,
        autorizado_por=row.autorizado_por,
        metodo_autorizacao=row.metodo_autorizacao,
        ponto_entrada_id=row.ponto_entrada_id,
        ponto_saida_id=row.ponto_saida_id,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        observacoes=row.observacoes,
        created_at=row.created_at,
        updated_at=row.updated_at
    )
