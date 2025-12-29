"""
API de Pré-Autorizações com QR Code
"""

import hashlib
import secrets
from datetime import datetime, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    PreAutorizacaoCreate,
    PreAutorizacaoListResponse,
    PreAutorizacaoResponse,
    PreAutorizacaoUpdate,
    PreAutorizacaoValidarRequest,
    PreAutorizacaoValidarResponse,
)

router = APIRouter(prefix="/portaria/pre-autorizacoes", tags=["Portaria - Pré-Autorizações"])


def gerar_qr_code() -> str:
    """Gera um código único para QR Code."""
    random_part = secrets.token_hex(8)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{timestamp}{random_part}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16].upper()


@router.get("", response_model=PreAutorizacaoListResponse)
async def listar_pre_autorizacoes(
    tenant_id: int = Query(..., description="ID do condomínio"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    unit_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as pré-autorizações."""
    query = """
        SELECT pa.*, u.number as unit_number, u.block as unit_block,
               m.name as morador_nome
        FROM pre_autorizacoes pa
        LEFT JOIN units u ON u.id = pa.unit_id
        LEFT JOIN users m ON m.id = pa.morador_id
        WHERE pa.tenant_id = :tenant_id
    """
    params = {"tenant_id": tenant_id}

    if unit_id:
        query += " AND pa.unit_id = :unit_id"
        params["unit_id"] = unit_id

    if status_filter:
        query += " AND pa.status = :status"
        params["status"] = status_filter

    if data_inicio:
        query += " AND pa.data_fim >= :data_inicio"
        params["data_inicio"] = data_inicio

    if data_fim:
        query += " AND pa.data_inicio <= :data_fim"
        params["data_fim"] = data_fim

    # Count total
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM ({query}) as subq"),
        params
    )
    total = count_result.scalar()

    # Get items
    query += " ORDER BY pa.created_at DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    items = [
        PreAutorizacaoResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            unit_id=row.unit_id,
            unit_number=row.unit_number,
            unit_block=row.unit_block,
            morador_id=row.morador_id,
            morador_nome=row.morador_nome,
            visitante_nome=row.visitante_nome,
            visitante_documento=row.visitante_documento,
            visitante_telefone=row.visitante_telefone,
            visitante_email=row.visitante_email,
            visitante_tipo=row.visitante_tipo,
            veiculo_placa=row.veiculo_placa,
            veiculo_modelo=row.veiculo_modelo,
            veiculo_cor=row.veiculo_cor,
            data_inicio=row.data_inicio,
            data_fim=row.data_fim,
            horario_inicio=row.horario_inicio,
            horario_fim=row.horario_fim,
            dias_semana=row.dias_semana,
            tipo=row.tipo,
            is_single_use=row.is_single_use,
            max_usos=row.max_usos,
            usos_realizados=row.usos_realizados,
            grupo_acesso_id=row.grupo_acesso_id,
            ponto_acesso_id=row.ponto_acesso_id,
            qr_code=row.qr_code,
            qr_code_url=row.qr_code_url,
            status=row.status,
            observacoes=row.observacoes,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in rows
    ]

    return PreAutorizacaoListResponse(
        items=items,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/{pre_auth_id}", response_model=PreAutorizacaoResponse)
async def obter_pre_autorizacao(
    pre_auth_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém uma pré-autorização pelo ID."""
    result = await db.execute(
        text("""
            SELECT pa.*, u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome
            FROM pre_autorizacoes pa
            LEFT JOIN units u ON u.id = pa.unit_id
            LEFT JOIN users m ON m.id = pa.morador_id
            WHERE pa.id = :id AND pa.tenant_id = :tenant_id
        """),
        {"id": pre_auth_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Pré-autorização não encontrada")

    return PreAutorizacaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        unit_id=row.unit_id,
        unit_number=row.unit_number,
        unit_block=row.unit_block,
        morador_id=row.morador_id,
        morador_nome=row.morador_nome,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_telefone=row.visitante_telefone,
        visitante_email=row.visitante_email,
        visitante_tipo=row.visitante_tipo,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        veiculo_cor=row.veiculo_cor,
        data_inicio=row.data_inicio,
        data_fim=row.data_fim,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        tipo=row.tipo,
        is_single_use=row.is_single_use,
        max_usos=row.max_usos,
        usos_realizados=row.usos_realizados,
        grupo_acesso_id=row.grupo_acesso_id,
        ponto_acesso_id=row.ponto_acesso_id,
        qr_code=row.qr_code,
        qr_code_url=row.qr_code_url,
        status=row.status,
        observacoes=row.observacoes,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("", response_model=PreAutorizacaoResponse, status_code=status.HTTP_201_CREATED)
async def criar_pre_autorizacao(
    dados: PreAutorizacaoCreate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova pré-autorização com QR Code."""
    qr_code = gerar_qr_code()

    result = await db.execute(
        text("""
            INSERT INTO pre_autorizacoes (
                tenant_id, unit_id, morador_id,
                visitante_nome, visitante_documento, visitante_telefone, visitante_email, visitante_tipo,
                veiculo_placa, veiculo_modelo, veiculo_cor,
                data_inicio, data_fim, horario_inicio, horario_fim, dias_semana,
                tipo, is_single_use, max_usos,
                grupo_acesso_id, ponto_acesso_id,
                qr_code, status, observacoes,
                created_at, created_by
            ) VALUES (
                :tenant_id, :unit_id, :morador_id,
                :visitante_nome, :visitante_documento, :visitante_telefone, :visitante_email, :visitante_tipo,
                :veiculo_placa, :veiculo_modelo, :veiculo_cor,
                :data_inicio, :data_fim, :horario_inicio, :horario_fim, :dias_semana,
                :tipo, :is_single_use, :max_usos,
                :grupo_acesso_id, :ponto_acesso_id,
                :qr_code, 'ativa', :observacoes,
                NOW(), :created_by
            )
            RETURNING *
        """),
        {
            "tenant_id": tenant_id,
            "unit_id": dados.unit_id,
            "morador_id": current_user.id,
            "visitante_nome": dados.visitante_nome,
            "visitante_documento": dados.visitante_documento,
            "visitante_telefone": dados.visitante_telefone,
            "visitante_email": dados.visitante_email,
            "visitante_tipo": dados.visitante_tipo,
            "veiculo_placa": dados.veiculo_placa,
            "veiculo_modelo": dados.veiculo_modelo,
            "veiculo_cor": dados.veiculo_cor,
            "data_inicio": dados.data_inicio,
            "data_fim": dados.data_fim,
            "horario_inicio": dados.horario_inicio,
            "horario_fim": dados.horario_fim,
            "dias_semana": dados.dias_semana,
            "tipo": dados.tipo,
            "is_single_use": dados.is_single_use,
            "max_usos": dados.max_usos,
            "grupo_acesso_id": dados.grupo_acesso_id,
            "ponto_acesso_id": dados.ponto_acesso_id,
            "qr_code": qr_code,
            "observacoes": dados.observacoes,
            "created_by": current_user.id
        }
    )
    await db.commit()
    row = result.fetchone()

    # Buscar dados adicionais
    unit_info = await db.execute(
        text("SELECT number, block FROM units WHERE id = :id"),
        {"id": dados.unit_id}
    )
    unit = unit_info.fetchone()

    return PreAutorizacaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        unit_id=row.unit_id,
        unit_number=unit.number if unit else None,
        unit_block=unit.block if unit else None,
        morador_id=row.morador_id,
        morador_nome=current_user.name,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_telefone=row.visitante_telefone,
        visitante_email=row.visitante_email,
        visitante_tipo=row.visitante_tipo,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        veiculo_cor=row.veiculo_cor,
        data_inicio=row.data_inicio,
        data_fim=row.data_fim,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        tipo=row.tipo,
        is_single_use=row.is_single_use,
        max_usos=row.max_usos,
        usos_realizados=row.usos_realizados,
        grupo_acesso_id=row.grupo_acesso_id,
        ponto_acesso_id=row.ponto_acesso_id,
        qr_code=row.qr_code,
        qr_code_url=row.qr_code_url,
        status=row.status,
        observacoes=row.observacoes,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.put("/{pre_auth_id}", response_model=PreAutorizacaoResponse)
async def atualizar_pre_autorizacao(
    pre_auth_id: int,
    dados: PreAutorizacaoUpdate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma pré-autorização."""
    check = await db.execute(
        text("SELECT id FROM pre_autorizacoes WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": pre_auth_id, "tenant_id": tenant_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Pré-autorização não encontrada")

    updates = []
    params = {"id": pre_auth_id, "tenant_id": tenant_id, "updated_by": current_user.id}

    for field, value in dados.model_dump(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates.append("updated_at = NOW()")
    updates.append("updated_by = :updated_by")

    query = f"""
        UPDATE pre_autorizacoes
        SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tenant_id
        RETURNING *
    """

    result = await db.execute(text(query), params)
    await db.commit()
    row = result.fetchone()

    # Buscar dados adicionais
    extra = await db.execute(
        text("""
            SELECT u.number as unit_number, u.block as unit_block, m.name as morador_nome
            FROM pre_autorizacoes pa
            LEFT JOIN units u ON u.id = pa.unit_id
            LEFT JOIN users m ON m.id = pa.morador_id
            WHERE pa.id = :id
        """),
        {"id": pre_auth_id}
    )
    extra_row = extra.fetchone()

    return PreAutorizacaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        unit_id=row.unit_id,
        unit_number=extra_row.unit_number if extra_row else None,
        unit_block=extra_row.unit_block if extra_row else None,
        morador_id=row.morador_id,
        morador_nome=extra_row.morador_nome if extra_row else None,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_telefone=row.visitante_telefone,
        visitante_email=row.visitante_email,
        visitante_tipo=row.visitante_tipo,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        veiculo_cor=row.veiculo_cor,
        data_inicio=row.data_inicio,
        data_fim=row.data_fim,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        tipo=row.tipo,
        is_single_use=row.is_single_use,
        max_usos=row.max_usos,
        usos_realizados=row.usos_realizados,
        grupo_acesso_id=row.grupo_acesso_id,
        ponto_acesso_id=row.ponto_acesso_id,
        qr_code=row.qr_code,
        qr_code_url=row.qr_code_url,
        status=row.status,
        observacoes=row.observacoes,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.delete("/{pre_auth_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar_pre_autorizacao(
    pre_auth_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancela uma pré-autorização."""
    result = await db.execute(
        text("""
            UPDATE pre_autorizacoes
            SET status = 'cancelada', updated_at = NOW(), updated_by = :updated_by
            WHERE id = :id AND tenant_id = :tenant_id AND status = 'ativa'
        """),
        {"id": pre_auth_id, "tenant_id": tenant_id, "updated_by": current_user.id}
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pré-autorização não encontrada ou já cancelada")


@router.post("/validar", response_model=PreAutorizacaoValidarResponse)
async def validar_qr_code(
    dados: PreAutorizacaoValidarRequest,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Valida um QR Code de pré-autorização."""
    result = await db.execute(
        text("""
            SELECT pa.*, u.number as unit_number, u.block as unit_block,
                   m.name as morador_nome
            FROM pre_autorizacoes pa
            LEFT JOIN units u ON u.id = pa.unit_id
            LEFT JOIN users m ON m.id = pa.morador_id
            WHERE pa.qr_code = :qr_code AND pa.tenant_id = :tenant_id
        """),
        {"qr_code": dados.qr_code, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        return PreAutorizacaoValidarResponse(
            valido=False,
            mensagem="QR Code não encontrado"
        )

    hoje = date.today()
    agora = datetime.now()

    # Verificar status
    if row.status != "ativa":
        return PreAutorizacaoValidarResponse(
            valido=False,
            mensagem=f"Pré-autorização {row.status}"
        )

    # Verificar data
    if hoje < row.data_inicio or hoje > row.data_fim:
        return PreAutorizacaoValidarResponse(
            valido=False,
            mensagem="Pré-autorização fora do período de validade"
        )

    # Verificar horário
    if row.horario_inicio and row.horario_fim:
        hora_atual = agora.time()
        if hora_atual < row.horario_inicio or hora_atual > row.horario_fim:
            return PreAutorizacaoValidarResponse(
                valido=False,
                mensagem="Fora do horário permitido"
            )

    # Verificar dia da semana
    if row.dias_semana:
        dia_atual = hoje.weekday()  # 0=segunda, 6=domingo
        # Converter para nosso formato (0=dom, 6=sab)
        dia_formato = (dia_atual + 1) % 7
        if dia_formato not in row.dias_semana:
            return PreAutorizacaoValidarResponse(
                valido=False,
                mensagem="Dia da semana não permitido"
            )

    # Verificar número de usos
    if row.is_single_use and row.usos_realizados >= row.max_usos:
        return PreAutorizacaoValidarResponse(
            valido=False,
            mensagem="Número máximo de usos atingido"
        )

    # Verificar ponto de acesso específico
    if row.ponto_acesso_id and dados.ponto_acesso_id:
        if row.ponto_acesso_id != dados.ponto_acesso_id:
            return PreAutorizacaoValidarResponse(
                valido=False,
                mensagem="Ponto de acesso não autorizado"
            )

    pre_auth = PreAutorizacaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        unit_id=row.unit_id,
        unit_number=row.unit_number,
        unit_block=row.unit_block,
        morador_id=row.morador_id,
        morador_nome=row.morador_nome,
        visitante_nome=row.visitante_nome,
        visitante_documento=row.visitante_documento,
        visitante_telefone=row.visitante_telefone,
        visitante_email=row.visitante_email,
        visitante_tipo=row.visitante_tipo,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        veiculo_cor=row.veiculo_cor,
        data_inicio=row.data_inicio,
        data_fim=row.data_fim,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        tipo=row.tipo,
        is_single_use=row.is_single_use,
        max_usos=row.max_usos,
        usos_realizados=row.usos_realizados,
        grupo_acesso_id=row.grupo_acesso_id,
        ponto_acesso_id=row.ponto_acesso_id,
        qr_code=row.qr_code,
        qr_code_url=row.qr_code_url,
        status=row.status,
        observacoes=row.observacoes,
        created_at=row.created_at,
        updated_at=row.updated_at
    )

    return PreAutorizacaoValidarResponse(
        valido=True,
        mensagem="Acesso autorizado",
        pre_autorizacao=pre_auth
    )


@router.post("/{pre_auth_id}/registrar-uso")
async def registrar_uso(
    pre_auth_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    ponto_acesso_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Registra o uso de uma pré-autorização."""
    result = await db.execute(
        text("""
            UPDATE pre_autorizacoes
            SET usos_realizados = usos_realizados + 1,
                updated_at = NOW(),
                status = CASE
                    WHEN is_single_use AND usos_realizados + 1 >= max_usos THEN 'utilizada'
                    ELSE status
                END
            WHERE id = :id AND tenant_id = :tenant_id AND status = 'ativa'
            RETURNING id, usos_realizados, max_usos, status
        """),
        {"id": pre_auth_id, "tenant_id": tenant_id}
    )
    await db.commit()
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Pré-autorização não encontrada ou inativa")

    return {
        "success": True,
        "usos_realizados": row.usos_realizados,
        "max_usos": row.max_usos,
        "status": row.status
    }
