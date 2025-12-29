"""
API de Grupos de Acesso
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    GrupoAcessoCreate,
    GrupoAcessoListResponse,
    GrupoAcessoResponse,
    GrupoAcessoUpdate,
)

router = APIRouter(prefix="/portaria/grupos-acesso", tags=["Portaria - Grupos de Acesso"])


@router.get("", response_model=GrupoAcessoListResponse)
async def listar_grupos(
    tenant_id: int = Query(..., description="ID do condomínio"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os grupos de acesso."""
    query = """
        SELECT * FROM grupos_acesso
        WHERE tenant_id = :tenant_id
    """
    params = {"tenant_id": tenant_id}

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
    query += " ORDER BY is_default DESC, nome LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    items = [
        GrupoAcessoResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            codigo=row.codigo,
            nome=row.nome,
            descricao=row.descricao,
            permite_morador=row.permite_morador,
            permite_visitante=row.permite_visitante,
            permite_prestador=row.permite_prestador,
            permite_entregador=row.permite_entregador,
            blocos_permitidos=row.blocos_permitidos,
            horario_inicio=row.horario_inicio,
            horario_fim=row.horario_fim,
            dias_semana=row.dias_semana,
            is_default=row.is_default,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in rows
    ]

    return GrupoAcessoListResponse(
        items=items,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/{grupo_id}", response_model=GrupoAcessoResponse)
async def obter_grupo(
    grupo_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém um grupo de acesso pelo ID."""
    result = await db.execute(
        text("SELECT * FROM grupos_acesso WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": grupo_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    return GrupoAcessoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        codigo=row.codigo,
        nome=row.nome,
        descricao=row.descricao,
        permite_morador=row.permite_morador,
        permite_visitante=row.permite_visitante,
        permite_prestador=row.permite_prestador,
        permite_entregador=row.permite_entregador,
        blocos_permitidos=row.blocos_permitidos,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        is_default=row.is_default,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("", response_model=GrupoAcessoResponse, status_code=status.HTTP_201_CREATED)
async def criar_grupo(
    dados: GrupoAcessoCreate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria um novo grupo de acesso."""
    result = await db.execute(
        text("""
            INSERT INTO grupos_acesso (
                tenant_id, codigo, nome, descricao,
                permite_morador, permite_visitante, permite_prestador, permite_entregador,
                blocos_permitidos, horario_inicio, horario_fim, dias_semana,
                is_default, is_active, created_at, created_by
            ) VALUES (
                :tenant_id, :codigo, :nome, :descricao,
                :permite_morador, :permite_visitante, :permite_prestador, :permite_entregador,
                :blocos_permitidos, :horario_inicio, :horario_fim, :dias_semana,
                :is_default, :is_active, NOW(), :created_by
            )
            RETURNING *
        """),
        {
            "tenant_id": tenant_id,
            "codigo": dados.codigo,
            "nome": dados.nome,
            "descricao": dados.descricao,
            "permite_morador": dados.permite_morador,
            "permite_visitante": dados.permite_visitante,
            "permite_prestador": dados.permite_prestador,
            "permite_entregador": dados.permite_entregador,
            "blocos_permitidos": dados.blocos_permitidos,
            "horario_inicio": dados.horario_inicio,
            "horario_fim": dados.horario_fim,
            "dias_semana": dados.dias_semana,
            "is_default": dados.is_default,
            "is_active": dados.is_active,
            "created_by": current_user.id
        }
    )
    await db.commit()
    row = result.fetchone()

    return GrupoAcessoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        codigo=row.codigo,
        nome=row.nome,
        descricao=row.descricao,
        permite_morador=row.permite_morador,
        permite_visitante=row.permite_visitante,
        permite_prestador=row.permite_prestador,
        permite_entregador=row.permite_entregador,
        blocos_permitidos=row.blocos_permitidos,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        is_default=row.is_default,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.put("/{grupo_id}", response_model=GrupoAcessoResponse)
async def atualizar_grupo(
    grupo_id: int,
    dados: GrupoAcessoUpdate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza um grupo de acesso."""
    # Verificar se existe
    check = await db.execute(
        text("SELECT id FROM grupos_acesso WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": grupo_id, "tenant_id": tenant_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    # Montar query dinâmica
    updates = []
    params = {"id": grupo_id, "tenant_id": tenant_id, "updated_by": current_user.id}

    for field, value in dados.model_dump(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates.append("updated_at = NOW()")
    updates.append("updated_by = :updated_by")

    query = f"""
        UPDATE grupos_acesso
        SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tenant_id
        RETURNING *
    """

    result = await db.execute(text(query), params)
    await db.commit()
    row = result.fetchone()

    return GrupoAcessoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        codigo=row.codigo,
        nome=row.nome,
        descricao=row.descricao,
        permite_morador=row.permite_morador,
        permite_visitante=row.permite_visitante,
        permite_prestador=row.permite_prestador,
        permite_entregador=row.permite_entregador,
        blocos_permitidos=row.blocos_permitidos,
        horario_inicio=row.horario_inicio,
        horario_fim=row.horario_fim,
        dias_semana=row.dias_semana,
        is_default=row.is_default,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.delete("/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_grupo(
    grupo_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Exclui um grupo de acesso (soft delete)."""
    result = await db.execute(
        text("""
            UPDATE grupos_acesso
            SET is_active = false, updated_at = NOW(), updated_by = :updated_by
            WHERE id = :id AND tenant_id = :tenant_id
        """),
        {"id": grupo_id, "tenant_id": tenant_id, "updated_by": current_user.id}
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")


@router.get("/{grupo_id}/pontos")
async def listar_pontos_grupo(
    grupo_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista os pontos de acesso vinculados a um grupo."""
    result = await db.execute(
        text("""
            SELECT p.*, gap.permite_entrada, gap.permite_saida
            FROM pontos_acesso p
            INNER JOIN grupos_acesso_pontos gap ON gap.ponto_id = p.id
            WHERE gap.grupo_id = :grupo_id AND p.tenant_id = :tenant_id
            ORDER BY p.ordem, p.nome
        """),
        {"grupo_id": grupo_id, "tenant_id": tenant_id}
    )

    return [
        {
            "id": row.id,
            "codigo": row.codigo,
            "nome": row.nome,
            "tipo": row.tipo,
            "status": row.status,
            "permite_entrada": row.permite_entrada,
            "permite_saida": row.permite_saida
        }
        for row in result.fetchall()
    ]


@router.post("/{grupo_id}/pontos/{ponto_id}")
async def vincular_ponto(
    grupo_id: int,
    ponto_id: int,
    permite_entrada: bool = Query(True),
    permite_saida: bool = Query(True),
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Vincula um ponto de acesso a um grupo."""
    await db.execute(
        text("""
            INSERT INTO grupos_acesso_pontos (grupo_id, ponto_id, permite_entrada, permite_saida)
            VALUES (:grupo_id, :ponto_id, :permite_entrada, :permite_saida)
            ON CONFLICT (grupo_id, ponto_id) DO UPDATE
            SET permite_entrada = :permite_entrada, permite_saida = :permite_saida
        """),
        {
            "grupo_id": grupo_id,
            "ponto_id": ponto_id,
            "permite_entrada": permite_entrada,
            "permite_saida": permite_saida
        }
    )
    await db.commit()

    return {"message": "Ponto vinculado com sucesso"}


@router.delete("/{grupo_id}/pontos/{ponto_id}")
async def desvincular_ponto(
    grupo_id: int,
    ponto_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Desvincula um ponto de acesso de um grupo."""
    await db.execute(
        text("DELETE FROM grupos_acesso_pontos WHERE grupo_id = :grupo_id AND ponto_id = :ponto_id"),
        {"grupo_id": grupo_id, "ponto_id": ponto_id}
    )
    await db.commit()

    return {"message": "Ponto desvinculado com sucesso"}
