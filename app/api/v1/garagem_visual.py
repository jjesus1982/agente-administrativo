"""
API do Mapa Visual da Garagem
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.portaria import (
    MapaGaragemResponse,
    OcupacaoGaragemResponse,
    VagaGaragemCreate,
    VagaGaragemListResponse,
    VagaGaragemResponse,
    VagaGaragemUpdate,
)

router = APIRouter(prefix="/portaria/garagem", tags=["Portaria - Garagem"])


@router.get("/mapa", response_model=List[MapaGaragemResponse])
async def obter_mapa(
    tenant_id: int = Query(..., description="ID do condomínio"),
    mapa_id: Optional[str] = Query(None, description="ID do mapa/andar específico"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna o mapa visual da garagem com todas as vagas."""
    query = """
        SELECT v.*, u.number as unit_number, u.block as unit_block,
               ve.plate as veiculo_placa, ve.model as veiculo_modelo
        FROM vagas_garagem v
        LEFT JOIN units u ON u.id = v.unit_id
        LEFT JOIN vehicles ve ON ve.id = v.veiculo_id
        WHERE v.tenant_id = :tenant_id AND v.is_active = true
    """
    params = {"tenant_id": tenant_id}

    if mapa_id:
        query += " AND v.mapa_id = :mapa_id"
        params["mapa_id"] = mapa_id

    query += " ORDER BY v.mapa_id, v.numero"

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    # Agrupar por mapa_id
    mapas = {}
    for row in rows:
        mapa = row.mapa_id or "principal"
        if mapa not in mapas:
            mapas[mapa] = {
                "mapa_id": mapa,
                "nome": f"Andar {mapa}" if mapa != "principal" else "Garagem Principal",
                "vagas": [],
                "total_vagas": 0,
                "vagas_ocupadas": 0,
                "vagas_livres": 0
            }

        vaga = VagaGaragemResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            parking_spot_id=row.parking_spot_id,
            numero=row.numero,
            bloco=row.bloco,
            andar=row.andar,
            tipo=row.tipo,
            unit_id=row.unit_id,
            unit_number=row.unit_number,
            unit_block=row.unit_block,
            posicao_x=row.posicao_x,
            posicao_y=row.posicao_y,
            largura=row.largura,
            altura=row.altura,
            rotacao=row.rotacao,
            mapa_id=row.mapa_id,
            status=row.status,
            ocupada_desde=row.ocupada_desde,
            veiculo_id=row.veiculo_id,
            veiculo_placa=row.veiculo_placa,
            veiculo_modelo=row.veiculo_modelo,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at
        )

        mapas[mapa]["vagas"].append(vaga)
        mapas[mapa]["total_vagas"] += 1

        if row.status == "ocupada":
            mapas[mapa]["vagas_ocupadas"] += 1
        elif row.status == "livre":
            mapas[mapa]["vagas_livres"] += 1

    # Calcular ocupação percentual
    result_list = []
    for mapa_data in mapas.values():
        total = mapa_data["total_vagas"]
        ocupacao = (mapa_data["vagas_ocupadas"] / total * 100) if total > 0 else 0
        result_list.append(
            MapaGaragemResponse(
                mapa_id=mapa_data["mapa_id"],
                nome=mapa_data["nome"],
                vagas=mapa_data["vagas"],
                total_vagas=total,
                vagas_ocupadas=mapa_data["vagas_ocupadas"],
                vagas_livres=mapa_data["vagas_livres"],
                ocupacao_percentual=round(ocupacao, 1)
            )
        )

    return result_list


@router.get("/ocupacao", response_model=OcupacaoGaragemResponse)
async def obter_ocupacao(
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retorna estatísticas de ocupação da garagem."""
    result = await db.execute(
        text("""
            SELECT
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'ocupada') as ocupadas,
                COUNT(*) FILTER (WHERE status = 'livre') as livres,
                COUNT(*) FILTER (WHERE status = 'reservada') as reservadas,
                COUNT(*) FILTER (WHERE status = 'manutencao') as manutencao
            FROM vagas_garagem
            WHERE tenant_id = :tenant_id AND is_active = true
        """),
        {"tenant_id": tenant_id}
    )
    stats = result.fetchone()

    # Contagem por tipo
    por_tipo_result = await db.execute(
        text("""
            SELECT tipo, COUNT(*) as count
            FROM vagas_garagem
            WHERE tenant_id = :tenant_id AND is_active = true
            GROUP BY tipo
        """),
        {"tenant_id": tenant_id}
    )
    por_tipo = {row.tipo: row.count for row in por_tipo_result.fetchall()}

    total = stats.total or 0
    ocupadas = stats.ocupadas or 0
    ocupacao_pct = (ocupadas / total * 100) if total > 0 else 0

    return OcupacaoGaragemResponse(
        total_vagas=total,
        vagas_ocupadas=ocupadas,
        vagas_livres=stats.livres or 0,
        vagas_reservadas=stats.reservadas or 0,
        vagas_manutencao=stats.manutencao or 0,
        ocupacao_percentual=round(ocupacao_pct, 1),
        por_tipo=por_tipo
    )


@router.get("/vagas", response_model=VagaGaragemListResponse)
async def listar_vagas(
    tenant_id: int = Query(..., description="ID do condomínio"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status_filter: Optional[str] = Query(None, alias="status"),
    tipo: Optional[str] = Query(None),
    mapa_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todas as vagas da garagem."""
    query = """
        SELECT v.*, u.number as unit_number, u.block as unit_block,
               ve.plate as veiculo_placa, ve.model as veiculo_modelo
        FROM vagas_garagem v
        LEFT JOIN units u ON u.id = v.unit_id
        LEFT JOIN vehicles ve ON ve.id = v.veiculo_id
        WHERE v.tenant_id = :tenant_id AND v.is_active = true
    """
    params = {"tenant_id": tenant_id}

    if status_filter:
        query += " AND v.status = :status"
        params["status"] = status_filter

    if tipo:
        query += " AND v.tipo = :tipo"
        params["tipo"] = tipo

    if mapa_id:
        query += " AND v.mapa_id = :mapa_id"
        params["mapa_id"] = mapa_id

    # Count total
    count_result = await db.execute(
        text(f"SELECT COUNT(*) FROM ({query}) as subq"),
        params
    )
    total = count_result.scalar()

    # Get items
    query += " ORDER BY v.numero LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip

    result = await db.execute(text(query), params)
    rows = result.fetchall()

    items = [
        VagaGaragemResponse(
            id=row.id,
            tenant_id=row.tenant_id,
            parking_spot_id=row.parking_spot_id,
            numero=row.numero,
            bloco=row.bloco,
            andar=row.andar,
            tipo=row.tipo,
            unit_id=row.unit_id,
            unit_number=row.unit_number,
            unit_block=row.unit_block,
            posicao_x=row.posicao_x,
            posicao_y=row.posicao_y,
            largura=row.largura,
            altura=row.altura,
            rotacao=row.rotacao,
            mapa_id=row.mapa_id,
            status=row.status,
            ocupada_desde=row.ocupada_desde,
            veiculo_id=row.veiculo_id,
            veiculo_placa=row.veiculo_placa,
            veiculo_modelo=row.veiculo_modelo,
            is_active=row.is_active,
            created_at=row.created_at,
            updated_at=row.updated_at
        )
        for row in rows
    ]

    return VagaGaragemListResponse(
        items=items,
        total=total,
        page=skip // limit + 1,
        size=limit,
        pages=(total + limit - 1) // limit
    )


@router.get("/vagas/{vaga_id}", response_model=VagaGaragemResponse)
async def obter_vaga(
    vaga_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtém detalhes de uma vaga."""
    result = await db.execute(
        text("""
            SELECT v.*, u.number as unit_number, u.block as unit_block,
                   ve.plate as veiculo_placa, ve.model as veiculo_modelo
            FROM vagas_garagem v
            LEFT JOIN units u ON u.id = v.unit_id
            LEFT JOIN vehicles ve ON ve.id = v.veiculo_id
            WHERE v.id = :id AND v.tenant_id = :tenant_id
        """),
        {"id": vaga_id, "tenant_id": tenant_id}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    return VagaGaragemResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        parking_spot_id=row.parking_spot_id,
        numero=row.numero,
        bloco=row.bloco,
        andar=row.andar,
        tipo=row.tipo,
        unit_id=row.unit_id,
        unit_number=row.unit_number,
        unit_block=row.unit_block,
        posicao_x=row.posicao_x,
        posicao_y=row.posicao_y,
        largura=row.largura,
        altura=row.altura,
        rotacao=row.rotacao,
        mapa_id=row.mapa_id,
        status=row.status,
        ocupada_desde=row.ocupada_desde,
        veiculo_id=row.veiculo_id,
        veiculo_placa=row.veiculo_placa,
        veiculo_modelo=row.veiculo_modelo,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.post("/vagas", response_model=VagaGaragemResponse, status_code=status.HTTP_201_CREATED)
async def criar_vaga(
    dados: VagaGaragemCreate,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria uma nova vaga na garagem."""
    result = await db.execute(
        text("""
            INSERT INTO vagas_garagem (
                tenant_id, parking_spot_id, numero, bloco, andar, tipo, unit_id,
                posicao_x, posicao_y, largura, altura, rotacao, mapa_id,
                status, is_active, created_at
            ) VALUES (
                :tenant_id, :parking_spot_id, :numero, :bloco, :andar, :tipo, :unit_id,
                :posicao_x, :posicao_y, :largura, :altura, :rotacao, :mapa_id,
                'livre', :is_active, NOW()
            )
            RETURNING *
        """),
        {
            "tenant_id": tenant_id,
            "parking_spot_id": dados.parking_spot_id,
            "numero": dados.numero,
            "bloco": dados.bloco,
            "andar": dados.andar,
            "tipo": dados.tipo,
            "unit_id": dados.unit_id,
            "posicao_x": dados.posicao_x,
            "posicao_y": dados.posicao_y,
            "largura": dados.largura,
            "altura": dados.altura,
            "rotacao": dados.rotacao,
            "mapa_id": dados.mapa_id,
            "is_active": dados.is_active
        }
    )
    await db.commit()
    row = result.fetchone()

    return VagaGaragemResponse(
        id=row.id,
        tenant_id=row.tenant_id,
        parking_spot_id=row.parking_spot_id,
        numero=row.numero,
        bloco=row.bloco,
        andar=row.andar,
        tipo=row.tipo,
        unit_id=row.unit_id,
        posicao_x=row.posicao_x,
        posicao_y=row.posicao_y,
        largura=row.largura,
        altura=row.altura,
        rotacao=row.rotacao,
        mapa_id=row.mapa_id,
        status=row.status,
        ocupada_desde=row.ocupada_desde,
        veiculo_id=row.veiculo_id,
        is_active=row.is_active,
        created_at=row.created_at,
        updated_at=row.updated_at
    )


@router.put("/vagas/{vaga_id}/posicao")
async def atualizar_posicao(
    vaga_id: int,
    posicao_x: float = Query(...),
    posicao_y: float = Query(...),
    rotacao: Optional[float] = Query(None),
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza a posição de uma vaga no mapa (drag & drop)."""
    query = """
        UPDATE vagas_garagem
        SET posicao_x = :posicao_x, posicao_y = :posicao_y, updated_at = NOW()
    """
    params = {
        "id": vaga_id,
        "tenant_id": tenant_id,
        "posicao_x": posicao_x,
        "posicao_y": posicao_y
    }

    if rotacao is not None:
        query += ", rotacao = :rotacao"
        params["rotacao"] = rotacao

    query += " WHERE id = :id AND tenant_id = :tenant_id RETURNING id, numero"

    result = await db.execute(text(query), params)
    await db.commit()
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    return {"success": True, "vaga": row.numero}


@router.post("/vagas/{vaga_id}/ocupar")
async def ocupar_vaga(
    vaga_id: int,
    veiculo_id: Optional[int] = Query(None),
    placa: Optional[str] = Query(None),
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca uma vaga como ocupada."""
    # Verificar se a vaga está livre
    check = await db.execute(
        text("SELECT status FROM vagas_garagem WHERE id = :id AND tenant_id = :tenant_id"),
        {"id": vaga_id, "tenant_id": tenant_id}
    )
    row = check.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    if row.status != "livre":
        raise HTTPException(status_code=400, detail=f"Vaga não está livre (status: {row.status})")

    # Buscar veículo pela placa se informada
    if placa and not veiculo_id:
        veiculo_result = await db.execute(
            text("SELECT id FROM vehicles WHERE plate = :placa AND tenant_id = :tenant_id"),
            {"placa": placa, "tenant_id": tenant_id}
        )
        veiculo_row = veiculo_result.fetchone()
        if veiculo_row:
            veiculo_id = veiculo_row.id

    await db.execute(
        text("""
            UPDATE vagas_garagem
            SET status = 'ocupada', ocupada_desde = NOW(), veiculo_id = :veiculo_id, updated_at = NOW()
            WHERE id = :id AND tenant_id = :tenant_id
        """),
        {"id": vaga_id, "tenant_id": tenant_id, "veiculo_id": veiculo_id}
    )
    await db.commit()

    return {"success": True, "message": "Vaga ocupada com sucesso"}


@router.post("/vagas/{vaga_id}/liberar")
async def liberar_vaga(
    vaga_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Libera uma vaga ocupada."""
    result = await db.execute(
        text("""
            UPDATE vagas_garagem
            SET status = 'livre', ocupada_desde = NULL, veiculo_id = NULL, updated_at = NOW()
            WHERE id = :id AND tenant_id = :tenant_id AND status = 'ocupada'
            RETURNING id, numero
        """),
        {"id": vaga_id, "tenant_id": tenant_id}
    )
    await db.commit()
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Vaga não encontrada ou não está ocupada")

    return {"success": True, "message": f"Vaga {row.numero} liberada"}


@router.delete("/vagas/{vaga_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_vaga(
    vaga_id: int,
    tenant_id: int = Query(..., description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove uma vaga do mapa (soft delete)."""
    result = await db.execute(
        text("""
            UPDATE vagas_garagem
            SET is_active = false, updated_at = NOW()
            WHERE id = :id AND tenant_id = :tenant_id
        """),
        {"id": vaga_id, "tenant_id": tenant_id}
    )
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
