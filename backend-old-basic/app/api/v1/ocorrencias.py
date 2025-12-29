import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.occurrence import Occurrence
from app.schemas.occurrences import OccurrenceCreate, OccurrenceListResponse, OccurrenceResponse, OccurrenceUpdate

router = APIRouter(prefix="/ocorrencias", tags=["Ocorrências"])

USER_ID_TEMP = 1

CATEGORIAS = [
    "noise",
    "parking",
    "pet",
    "trash",
    "common_area",
    "security",
    "vandalism",
    "leak",
    "elevator",
    "neighbor",
    "employee",
    "visitor",
    "other",
]
SEVERIDADES = ["low", "medium", "high", "critical"]
STATUS_VALIDOS = ["open", "in_progress", "resolved", "closed", "cancelled"]


def gerar_protocolo():
    return f"OCR-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@router.get("", response_model=OccurrenceListResponse)
async def listar_ocorrencias(
    tenant_id: int = Query(1, description="ID do condomínio"),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    severity: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Occurrence).where(Occurrence.tenant_id == tenant_id)

    if status_filter:
        query = query.where(Occurrence.status == status_filter)
    if category:
        query = query.where(Occurrence.category == category)
    if severity:
        query = query.where(Occurrence.severity == severity)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Occurrence.created_at.desc()).offset((page - 1) * limit).limit(limit)
    items = (await db.execute(query)).scalars().all()

    return OccurrenceListResponse(
        items=[
            OccurrenceResponse(
                id=o.id,
                protocol=o.protocol,
                title=o.title,
                description=o.description,
                category=o.category,
                severity=o.severity or "medium",
                status=o.status,
                location=o.location,
                involved_names=o.involved_names,
                witnesses=o.witnesses,
                resolution=o.resolution,
                actions_taken=o.actions_taken,
                occurred_at=o.occurred_at,
                resolved_at=o.resolved_at,
                created_at=o.created_at,
            )
            for o in items
        ],
        total=total,
        page=page,
    )


@router.get("/minhas", response_model=OccurrenceListResponse)
async def minhas_ocorrencias(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Occurrence).where(Occurrence.tenant_id == tenant_id, Occurrence.reporter_id == USER_ID_TEMP)
    if status_filter:
        query = query.where(Occurrence.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Occurrence.created_at.desc()).offset((page - 1) * limit).limit(limit)
    items = (await db.execute(query)).scalars().all()

    return OccurrenceListResponse(
        items=[
            OccurrenceResponse(
                id=o.id,
                protocol=o.protocol,
                title=o.title,
                description=o.description,
                category=o.category,
                severity=o.severity or "medium",
                status=o.status,
                location=o.location,
                involved_names=o.involved_names,
                witnesses=o.witnesses,
                resolution=o.resolution,
                actions_taken=o.actions_taken,
                occurred_at=o.occurred_at,
                resolved_at=o.resolved_at,
                created_at=o.created_at,
            )
            for o in items
        ],
        total=total,
        page=page,
    )


@router.get("/estatisticas")
async def estatisticas(tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)):
    base = select(Occurrence).where(Occurrence.tenant_id == tenant_id)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    abertas = (
        await db.execute(select(func.count()).select_from(base.where(Occurrence.status == "open").subquery()))
    ).scalar() or 0
    em_andamento = (
        await db.execute(select(func.count()).select_from(base.where(Occurrence.status == "in_progress").subquery()))
    ).scalar() or 0
    resolvidas = (
        await db.execute(select(func.count()).select_from(base.where(Occurrence.status == "resolved").subquery()))
    ).scalar() or 0

    return {"total": total, "abertas": abertas, "em_andamento": em_andamento, "resolvidas": resolvidas}


@router.get("/{ocorrencia_id}", response_model=OccurrenceResponse)
async def detalhe_ocorrencia(
    ocorrencia_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Occurrence).where(Occurrence.id == ocorrencia_id, Occurrence.tenant_id == tenant_id)
    )
    o = result.scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    return OccurrenceResponse(
        id=o.id,
        protocol=o.protocol,
        title=o.title,
        description=o.description,
        category=o.category,
        severity=o.severity or "medium",
        status=o.status,
        location=o.location,
        involved_names=o.involved_names,
        witnesses=o.witnesses,
        resolution=o.resolution,
        actions_taken=o.actions_taken,
        occurred_at=o.occurred_at,
        resolved_at=o.resolved_at,
        created_at=o.created_at,
    )


@router.post("", response_model=OccurrenceResponse, status_code=status.HTTP_201_CREATED)
async def criar_ocorrencia(
    dados: OccurrenceCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    if dados.category not in CATEGORIAS:
        raise HTTPException(status_code=400, detail=f"Categoria inválida. Use: {', '.join(CATEGORIAS)}")
    if dados.severity not in SEVERIDADES:
        raise HTTPException(status_code=400, detail=f"Severidade inválida. Use: {', '.join(SEVERIDADES)}")

    ocorrencia = Occurrence(
        tenant_id=tenant_id,
        reporter_id=USER_ID_TEMP,
        created_by_id=USER_ID_TEMP,
        protocol=gerar_protocolo(),
        title=dados.title,
        description=dados.description,
        category=dados.category,
        severity=dados.severity,
        status="open",
        location=dados.location,
        involved_names=dados.involved_names,
        witnesses=dados.witnesses,
        occurred_at=dados.occurred_at or datetime.now(),
    )
    db.add(ocorrencia)
    await db.commit()
    await db.refresh(ocorrencia)

    return OccurrenceResponse(
        id=ocorrencia.id,
        protocol=ocorrencia.protocol,
        title=ocorrencia.title,
        description=ocorrencia.description,
        category=ocorrencia.category,
        severity=ocorrencia.severity,
        status=ocorrencia.status,
        location=ocorrencia.location,
        involved_names=ocorrencia.involved_names,
        witnesses=ocorrencia.witnesses,
        resolution=ocorrencia.resolution,
        actions_taken=ocorrencia.actions_taken,
        occurred_at=ocorrencia.occurred_at,
        resolved_at=ocorrencia.resolved_at,
        created_at=ocorrencia.created_at,
    )


@router.patch("/{ocorrencia_id}", response_model=OccurrenceResponse)
async def atualizar_ocorrencia(
    ocorrencia_id: int,
    dados: OccurrenceUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Occurrence).where(Occurrence.id == ocorrencia_id, Occurrence.tenant_id == tenant_id)
    )
    ocorrencia = result.scalar_one_or_none()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    update_data = dados.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ocorrencia, key, value)

    if dados.status == "resolved" and not ocorrencia.resolved_at:
        ocorrencia.resolved_at = datetime.now()
        ocorrencia.resolved_by_id = USER_ID_TEMP

    ocorrencia.updated_at = datetime.now()
    ocorrencia.updated_by_id = USER_ID_TEMP
    await db.commit()
    await db.refresh(ocorrencia)

    return OccurrenceResponse(
        id=ocorrencia.id,
        protocol=ocorrencia.protocol,
        title=ocorrencia.title,
        description=ocorrencia.description,
        category=ocorrencia.category,
        severity=ocorrencia.severity or "medium",
        status=ocorrencia.status,
        location=ocorrencia.location,
        involved_names=ocorrencia.involved_names,
        witnesses=ocorrencia.witnesses,
        resolution=ocorrencia.resolution,
        actions_taken=ocorrencia.actions_taken,
        occurred_at=ocorrencia.occurred_at,
        resolved_at=ocorrencia.resolved_at,
        created_at=ocorrencia.created_at,
    )


@router.patch("/{ocorrencia_id}/status")
async def alterar_status(
    ocorrencia_id: int,
    novo_status: str = Query(...),
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    if novo_status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido")

    result = await db.execute(
        select(Occurrence).where(Occurrence.id == ocorrencia_id, Occurrence.tenant_id == tenant_id)
    )
    ocorrencia = result.scalar_one_or_none()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    ocorrencia.status = novo_status
    ocorrencia.updated_at = datetime.now()
    if novo_status == "resolved":
        ocorrencia.resolved_at = datetime.now()
        ocorrencia.resolved_by_id = USER_ID_TEMP

    await db.commit()
    return {"status": novo_status}


@router.delete("/{ocorrencia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_ocorrencia(
    ocorrencia_id: int, tenant_id: int = Query(1, description="ID do condomínio"), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Occurrence).where(Occurrence.id == ocorrencia_id, Occurrence.tenant_id == tenant_id)
    )
    ocorrencia = result.scalar_one_or_none()
    if not ocorrencia:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    await db.delete(ocorrencia)
    await db.commit()
