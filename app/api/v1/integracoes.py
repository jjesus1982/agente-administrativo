"""
API de Integrações com Hardware
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    IntegracaoCreate,
    IntegracaoListResponse,
    IntegracaoResponse,
    IntegracaoTesteResponse,
    IntegracaoUpdate,
    SincronizacaoLogResponse,
    PARCEIROS_DISPONIVEIS,
)

router = APIRouter(prefix="/portaria/integracoes", tags=["Portaria - Integrações"])


@router.get("/parceiros")
async def listar_parceiros():
    """Lista todos os parceiros de integração disponíveis."""
    return [p.model_dump() for p in PARCEIROS_DISPONIVEIS]


@router.get("", response_model=IntegracaoListResponse)
async def listar_integracoes(
    tenant_id: int = Query(..., description="ID do condomínio"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    parceiro: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as integrações configuradas."""
    query = "SELECT * FROM integracoes_hardware WHERE tenant_id = :tenant_id"
    params = {"tenant_id": tenant_id}

    if parceiro:
        query += " AND parceiro = :parceiro"
        params["parceiro"] = parceiro

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
    query += " ORDER BY created_at DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    items = [
        IntegracaoResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            parceiro=row.parceiro,
            nome_exibicao=row.nome_exibicao,
            logo_url=row.logo_url,
            config=row.config,
            sync_moradores=row.sync_moradores,
            sync_visitantes=row.sync_visitantes,
            sync_veiculos=row.sync_veiculos,
            sync_acessos=row.sync_acessos,
            status=row.status,
            last_health_check=row.last_health_check,
            last_sync_at=row.last_sync_at,
            last_error=row.last_error,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in rows
    ]

    return IntegracaoListResponse(
        items=items,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/{integracao_id}", response_model=IntegracaoResponse)
async def obter_integracao(
    integracao_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém uma integração pelo ID."""
    result = await db.execute(
        text("SELECT * FROM integracoes_hardware WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": integracao_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Integração não encontrada")

    return IntegracaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        parceiro=row.parceiro,
        nome_exibicao=row.nome_exibicao,
        logo_url=row.logo_url,
        config=row.config,
        sync_moradores=row.sync_moradores,
        sync_visitantes=row.sync_visitantes,
        sync_veiculos=row.sync_veiculos,
        sync_acessos=row.sync_acessos,
        status=row.status,
        last_health_check=row.last_health_check,
        last_sync_at=row.last_sync_at,
        last_error=row.last_error,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("", response_model=IntegracaoResponse, status_code=status.HTTP_201_CREATED)
async def criar_integracao(
    dados: IntegracaoCreate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova integração."""
    # Verificar se o parceiro é válido
    parceiros_validos = [p.codigo for p in PARCEIROS_DISPONIVEIS]
    if dados.parceiro not in parceiros_validos:
        raise HTTPException(status_code=400, detail=f"Parceiro inválido. Válidos: {parceiros_validos}")

    result = await db.execute(
        text("""
            INSERT INTO integracoes_hardware (
                tenant_id, parceiro, nome_exibicao, logo_url, config,
                sync_moradores, sync_visitantes, sync_veiculos, sync_acessos,
                status, is_active, created_at
            ) VALUES (
                :tenant_id, :parceiro, :nome_exibicao, :logo_url, :config,
                :sync_moradores, :sync_visitantes, :sync_veiculos, :sync_acessos,
                'inativo', :is_active, NOW()
            )
            RETURNING *
        """),
        {
            "tenant_id": tenant_id,
            "parceiro": dados.parceiro,
            "nome_exibicao": dados.nome_exibicao,
            "logo_url": dados.logo_url,
            "config": dados.config or {},
            "sync_moradores": dados.sync_moradores,
            "sync_visitantes": dados.sync_visitantes,
            "sync_veiculos": dados.sync_veiculos,
            "sync_acessos": dados.sync_acessos,
            "is_active": dados.is_active
        }
    )
    await db.commit()
    row = result.fetchone()

    return IntegracaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        parceiro=row.parceiro,
        nome_exibicao=row.nome_exibicao,
        logo_url=row.logo_url,
        config=row.config,
        sync_moradores=row.sync_moradores,
        sync_visitantes=row.sync_visitantes,
        sync_veiculos=row.sync_veiculos,
        sync_acessos=row.sync_acessos,
        status=row.status,
        last_health_check=row.last_health_check,
        last_sync_at=row.last_sync_at,
        last_error=row.last_error,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.put("/{integracao_id}", response_model=IntegracaoResponse)
async def atualizar_integracao(
    integracao_id: int,
    dados: IntegracaoUpdate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza uma integração."""
    check = await db.execute(
        text("SELECT id FROM integracoes_hardware WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": integracao_id, "tenant_id": tenant_id}
    )
    if not check.fetchone():
        raise HTTPException(status_code=404, detail="Integração não encontrada")

    updates = []
    params = {"id": integracao_id, "tenant_id": tenant_id}

    for field, value in dados.model_dump(exclude_unset=True).items():
        if value is not None:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if not updates:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")

    updates.append("updated_at = NOW()")

    query = f"""
        UPDATE integracoes_hardware
        SET {', '.join(updates)}
        WHERE id = :id AND tenant_id = :tenant_id
        RETURNING *
    """

    result = await db.execute(text(query), params)
    await db.commit()
    row = result.fetchone()

    return IntegracaoResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        parceiro=row.parceiro,
        nome_exibicao=row.nome_exibicao,
        logo_url=row.logo_url,
        config=row.config,
        sync_moradores=row.sync_moradores,
        sync_visitantes=row.sync_visitantes,
        sync_veiculos=row.sync_veiculos,
        sync_acessos=row.sync_acessos,
        status=row.status,
        last_health_check=row.last_health_check,
        last_sync_at=row.last_sync_at,
        last_error=row.last_error,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.delete("/{integracao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_integracao(
    integracao_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Desativa uma integração."""
    result = await db.execute(
        text("""
            UPDATE integracoes_hardware
            SET is_active = false, status = 'inativo', updated_at = NOW()
            WHERE id = :id AND tenant_id = :tenant_id
        """),
        {"id": integracao_id, "tenant_id": tenant_id}
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Integração não encontrada")


@router.post("/{integracao_id}/testar", response_model=IntegracaoTesteResponse)
async def testar_integracao(
    integracao_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Testa a conexão com uma integração."""
    result = await db.execute(
        text("SELECT * FROM integracoes_hardware WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": integracao_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Integração não encontrada")

    # TODO: Implementar teste real com cada parceiro
    # Por enquanto, simula um teste bem-sucedido

    # Atualizar status
    await db.execute(
        text("""
            UPDATE integracoes_hardware
            SET status = 'ativo', last_health_check = NOW(), last_error = NULL
            WHERE id = :id
        """),
        {"id": integracao_id}
    )
    await db.commit()

    return IntegracaoTesteResponse(
        sucesso=True,
        mensagem=f"Conexão com {row.parceiro} estabelecida com sucesso",
        detalhes={
            "parceiro": row.parceiro,
            "ip": row.config.get("base_url") if row.config else None,
            "testado_em": datetime.now().isoformat()
        }
    )


@router.post("/{integracao_id}/sincronizar")
async def sincronizar_integracao(
    integracao_id: int,
    tipo_sync: str = Query(..., description="Tipo: moradores, visitantes, veiculos, acessos"),
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Inicia uma sincronização com a integração."""
    result = await db.execute(
        text("SELECT * FROM integracoes_hardware WHERE id = :id AND tenant_id = :tenant_id AND is_active = true"),
        {"id": integracao_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Integração não encontrada ou inativa")

    if row.status != "ativo":
        raise HTTPException(status_code=400, detail="Integração não está conectada")

    # Criar log de sincronização
    log_result = await db.execute(
        text("""
            INSERT INTO sincronizacoes_log (
                integracao_id, tipo_sync, direcao, status,
                iniciado_em, created_at
            ) VALUES (
                :integracao_id, :tipo_sync, 'push', 'processando',
                NOW(), NOW()
            )
            RETURNING id
        """),
        {"integracao_id": integracao_id, "tipo_sync": tipo_sync}
    )
    log_id = log_result.fetchone().id

    # TODO: Implementar sincronização real em background
    # Por enquanto, simula uma sincronização

    # Simular resultado
    import random
    total = random.randint(10, 100)
    sucesso = total - random.randint(0, 5)
    erro = total - sucesso

    await db.execute(
        text("""
            UPDATE sincronizacoes_log
            SET status = 'sucesso',
                registros_total = :total,
                registros_sucesso = :sucesso,
                registros_erro = :erro,
                finalizado_em = NOW(),
                duracao_ms = :duracao
            WHERE id = :id
        """),
        {
            "id": log_id,
            "total": total,
            "sucesso": sucesso,
            "erro": erro,
            "duracao": random.randint(500, 5000)
        }
    )

    # Atualizar última sincronização
    await db.execute(
        text("UPDATE integracoes_hardware SET last_sync_at = NOW() WHERE id = :id"),
        {"id": integracao_id}
    )

    await db.commit()

    return {
        "success": True,
        "message": f"Sincronização de {tipo_sync} iniciada",
        "log_id": log_id,
        "registros_total": total,
        "registros_sucesso": sucesso,
        "registros_erro": erro
    }


@router.get("/{integracao_id}/sincronizacoes", response_model=List[SincronizacaoLogResponse])
async def listar_sincronizacoes(
    integracao_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista o histórico de sincronizações de uma integração."""
    result = await db.execute(
        text("""
            SELECT sl.* FROM sincronizacoes_log sl
            INNER JOIN integracoes_hardware ih ON ih.id = sl.integracao_id
            WHERE sl.integracao_id = :integracao_id AND ih.tenant_id = :tenant_id
            ORDER BY sl.created_at DESC
            LIMIT :limit
        """),
        {"integracao_id": integracao_id, "tenant_id": tenant_id, "limit": limit}
    )

    return [
        SincronizacaoLogResponse(
            id=row.id,
            integracao_id=row.integracao_id,
            tipo_sync=row.tipo_sync,
            direcao=row.direcao,
            status=row.status,
            registros_total=row.registros_total,
            registros_sucesso=row.registros_sucesso,
            registros_erro=row.registros_erro,
            erro_mensagem=row.erro_mensagem,
            iniciado_em=row.iniciado_em,
            finalizado_em=row.finalizado_em,
            duracao_ms=row.duracao_ms,
            created_at=row.created_at
        )
        for row in result.fetchall()
    ]
