"""
Endpoints de visitantes
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import PaginationDep, get_current_tenant, get_current_user, get_db
from app.core.exceptions import BusinessError, DuplicateError, NotFoundError
from app.core.permissions import Role
from app.models.access_log import AccessLog
from app.models.unit import Unit
from app.models.user import User
from app.models.visitor import Visitor, VisitorVehicle
from app.schemas.common import MessageResponse
from app.schemas.visitor import (
    ActiveVisitorResponse,
    VisitorBlockRequest,
    VisitorCreate,
    VisitorEntryRequest,
    VisitorExitRequest,
    VisitorListResponse,
    VisitorResponse,
    VisitorUpdate,
    VisitorVehicleResponse,
)

router = APIRouter(prefix="/visitors", tags=["Visitantes"])


def visitor_to_response(visitor: Visitor, created_by_name: str = None) -> VisitorResponse:
    """Converte model para response"""
    return VisitorResponse(
        id=visitor.id,
        name=visitor.name,
        cpf=visitor.cpf,
        rg=visitor.rg,
        phone=visitor.phone,
        email=visitor.email,
        birth_date=visitor.birth_date,
        visitor_type=visitor.visitor_type,
        company=visitor.company,
        company_cnpj=visitor.company_cnpj,
        service=visitor.service,
        has_special_needs=visitor.has_special_needs,
        special_needs_description=visitor.special_needs_description,
        observations=visitor.observations,
        photo_url=visitor.photo_url,
        facial_id=visitor.facial_id,
        is_blocked=visitor.is_blocked,
        block_reason=visitor.block_reason,
        vehicles=[
            VisitorVehicleResponse(
                id=v.id,
                plate=v.plate,
                model=v.model,
                brand=v.brand,
                color=v.color,
                vehicle_type=v.vehicle_type,
                created_at=v.created_at,
            )
            for v in visitor.vehicles
        ],
        created_by_id=visitor.created_by_id,
        created_by_name=created_by_name,
        created_at=visitor.created_at,
        updated_at=visitor.updated_at,
    )


@router.get("/", response_model=VisitorListResponse)
async def list_visitors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    pagination: PaginationDep = Depends(),
    search: Optional[str] = Query(None, description="Busca por nome, CPF, RG"),
    visitor_type: Optional[str] = Query(None, description="Tipo de visitante"),
    company: Optional[str] = Query(None, description="Empresa"),
    is_blocked: Optional[bool] = Query(None, description="Bloqueados"),
):
    """
    Lista visitantes com filtros e paginação.
    """
    query = select(Visitor).where(Visitor.tenant_id == tenant_id).options(selectinload(Visitor.vehicles))

    # Filtros
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Visitor.name.ilike(search_term),
                Visitor.cpf.ilike(search_term),
                Visitor.rg.ilike(search_term),
                Visitor.phone.ilike(search_term),
            )
        )

    if visitor_type:
        query = query.where(Visitor.visitor_type == visitor_type)

    if company:
        query = query.where(Visitor.company.ilike(f"%{company}%"))

    if is_blocked is not None:
        query = query.where(Visitor.is_blocked == is_blocked)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Ordenação e paginação
    query = query.order_by(Visitor.created_at.desc())
    query = query.offset(pagination.offset).limit(pagination.page_size)

    result = await db.execute(query)
    visitors = result.scalars().all()

    total_pages = (total + pagination.page_size - 1) // pagination.page_size

    return VisitorListResponse(
        items=[visitor_to_response(v) for v in visitors],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        has_next=pagination.page < total_pages,
        has_prev=pagination.page > 1,
    )


@router.get("/active", response_model=List[ActiveVisitorResponse])
async def list_active_visitors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Lista visitantes atualmente no condomínio.
    """
    # Subquery para última ação de cada visitante
    subquery = (
        select(AccessLog.visitor_id, func.max(AccessLog.registered_at).label("last_action"))
        .where(AccessLog.tenant_id == tenant_id, AccessLog.visitor_id.isnot(None))
        .group_by(AccessLog.visitor_id)
        .subquery()
    )

    # Busca logs de entrada sem saída correspondente
    query = (
        select(AccessLog)
        .join(
            subquery,
            and_(AccessLog.visitor_id == subquery.c.visitor_id, AccessLog.registered_at == subquery.c.last_action),
        )
        .where(AccessLog.tenant_id == tenant_id, AccessLog.access_type == "entry")
        .options(
            selectinload(AccessLog.visitor),
            selectinload(AccessLog.unit),
            selectinload(AccessLog.vehicle),
            selectinload(AccessLog.registered_by),
        )
    )

    result = await db.execute(query)
    logs = result.scalars().all()

    active_visitors = []
    now = datetime.utcnow()

    for log in logs:
        if not log.visitor:
            continue

        time_inside = now - log.registered_at
        hours = int(time_inside.total_seconds() // 3600)
        minutes = int((time_inside.total_seconds() % 3600) // 60)

        active_visitors.append(
            ActiveVisitorResponse(
                id=log.visitor.id,
                name=log.visitor.name,
                visitor_type=log.visitor.visitor_type,
                company=log.visitor.company,
                unit_identifier=log.unit.full_identifier if log.unit else "-",
                vehicle_plate=log.vehicle.plate if log.vehicle else None,
                entry_time=log.registered_at,
                time_inside=f"{hours}h {minutes}min",
                released_by=None,
                registered_by=log.registered_by.name if log.registered_by else "-",
            )
        )

    return active_visitors


@router.get("/{visitor_id}", response_model=VisitorResponse)
async def get_visitor(
    visitor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Retorna detalhes de um visitante.
    """
    result = await db.execute(
        select(Visitor)
        .where(Visitor.id == visitor_id, Visitor.tenant_id == tenant_id)
        .options(selectinload(Visitor.vehicles))
    )
    visitor = result.scalar_one_or_none()

    if not visitor:
        raise NotFoundError("Visitante não encontrado")

    # Busca nome do criador
    created_by_name = None
    if visitor.created_by_id:
        result = await db.execute(select(User.name).where(User.id == visitor.created_by_id))
        created_by_name = result.scalar_one_or_none()

    return visitor_to_response(visitor, created_by_name)


@router.post("/", response_model=VisitorResponse, status_code=status.HTTP_201_CREATED)
async def create_visitor(
    data: VisitorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Cadastra um novo visitante.
    """
    # Verifica permissão
    if current_user.role < Role.DOORMAN:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Verifica duplicidade por CPF
    if data.cpf:
        result = await db.execute(select(Visitor).where(Visitor.cpf == data.cpf, Visitor.tenant_id == tenant_id))
        if result.scalar_one_or_none():
            raise DuplicateError("Visitante com este CPF já cadastrado")

    # Cria visitante
    visitor = Visitor(
        tenant_id=tenant_id,
        created_by_id=current_user.id,
        name=data.name,
        cpf=data.cpf,
        rg=data.rg,
        phone=data.phone,
        email=data.email,
        birth_date=data.birth_date,
        visitor_type=data.visitor_type,
        company=data.company,
        company_cnpj=data.company_cnpj,
        service=data.service,
        has_special_needs=data.has_special_needs,
        special_needs_description=data.special_needs_description,
        observations=data.observations,
    )

    # Adiciona veículos
    for vehicle_data in data.vehicles:
        vehicle = VisitorVehicle(
            plate=vehicle_data.plate,
            model=vehicle_data.model,
            brand=vehicle_data.brand,
            color=vehicle_data.color,
            vehicle_type=vehicle_data.vehicle_type,
        )
        visitor.vehicles.append(vehicle)

    db.add(visitor)
    await db.commit()
    await db.refresh(visitor)

    return visitor_to_response(visitor, current_user.name)


@router.put("/{visitor_id}", response_model=VisitorResponse)
async def update_visitor(
    visitor_id: int,
    data: VisitorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Atualiza um visitante.
    """
    if current_user.role < Role.DOORMAN:
        raise HTTPException(status_code=403, detail="Sem permissão")

    result = await db.execute(
        select(Visitor)
        .where(Visitor.id == visitor_id, Visitor.tenant_id == tenant_id)
        .options(selectinload(Visitor.vehicles))
    )
    visitor = result.scalar_one_or_none()

    if not visitor:
        raise NotFoundError("Visitante não encontrado")

    # Atualiza campos
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(visitor, field, value)

    visitor.updated_by_id = current_user.id

    await db.commit()
    await db.refresh(visitor)

    return visitor_to_response(visitor)


@router.post("/{visitor_id}/entry", response_model=MessageResponse)
async def register_entry(
    visitor_id: int,
    data: VisitorEntryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Registra entrada de visitante.
    """
    if current_user.role < Role.DOORMAN:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Busca visitante
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id, Visitor.tenant_id == tenant_id))
    visitor = result.scalar_one_or_none()

    if not visitor:
        raise NotFoundError("Visitante não encontrado")

    if visitor.is_blocked:
        raise BusinessError(f"Visitante bloqueado: {visitor.block_reason}")

    # Verifica se já está no condomínio
    result = await db.execute(
        select(AccessLog)
        .where(AccessLog.visitor_id == visitor_id, AccessLog.tenant_id == tenant_id)
        .order_by(AccessLog.registered_at.desc())
        .limit(1)
    )
    last_log = result.scalar_one_or_none()

    if last_log and last_log.access_type == "entry":
        raise BusinessError("Visitante já está no condomínio")

    # Busca veículo se informado
    vehicle_plate = None
    if data.vehicle_id:
        result = await db.execute(select(VisitorVehicle).where(VisitorVehicle.id == data.vehicle_id))
        vehicle = result.scalar_one_or_none()
        if vehicle:
            vehicle_plate = vehicle.plate

    # Registra entrada
    access_log = AccessLog(
        tenant_id=tenant_id,
        visitor_id=visitor_id,
        unit_id=data.unit_id,
        vehicle_id=data.vehicle_id,
        vehicle_plate=vehicle_plate,
        access_type="entry",
        access_method="manual",
        access_point=data.access_point,
        registered_by_id=current_user.id,
        observations=data.observations,
    )

    db.add(access_log)
    await db.commit()

    return MessageResponse(message="Entrada registrada com sucesso")


@router.post("/{visitor_id}/exit", response_model=MessageResponse)
async def register_exit(
    visitor_id: int,
    data: VisitorExitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Registra saída de visitante.
    """
    if current_user.role < Role.DOORMAN:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Busca visitante
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id, Visitor.tenant_id == tenant_id))
    visitor = result.scalar_one_or_none()

    if not visitor:
        raise NotFoundError("Visitante não encontrado")

    # Verifica se está no condomínio
    result = await db.execute(
        select(AccessLog)
        .where(AccessLog.visitor_id == visitor_id, AccessLog.tenant_id == tenant_id)
        .order_by(AccessLog.registered_at.desc())
        .limit(1)
    )
    last_log = result.scalar_one_or_none()

    if not last_log or last_log.access_type != "entry":
        raise BusinessError("Visitante não está no condomínio")

    # Registra saída
    access_log = AccessLog(
        tenant_id=tenant_id,
        visitor_id=visitor_id,
        unit_id=last_log.unit_id,
        vehicle_id=last_log.vehicle_id,
        vehicle_plate=last_log.vehicle_plate,
        access_type="exit",
        access_method="manual",
        access_point=data.access_point,
        registered_by_id=current_user.id,
        observations=data.observations,
    )

    db.add(access_log)
    await db.commit()

    return MessageResponse(message="Saída registrada com sucesso")


@router.post("/{visitor_id}/block", response_model=MessageResponse)
async def block_visitor(
    visitor_id: int,
    data: VisitorBlockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Bloqueia um visitante.
    """
    if current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id, Visitor.tenant_id == tenant_id))
    visitor = result.scalar_one_or_none()

    if not visitor:
        raise NotFoundError("Visitante não encontrado")

    visitor.is_blocked = True
    visitor.block_reason = data.reason
    visitor.blocked_at = datetime.utcnow().date()
    visitor.blocked_by_id = current_user.id

    await db.commit()

    return MessageResponse(message="Visitante bloqueado com sucesso")


@router.post("/{visitor_id}/unblock", response_model=MessageResponse)
async def unblock_visitor(
    visitor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Desbloqueia um visitante.
    """
    if current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id, Visitor.tenant_id == tenant_id))
    visitor = result.scalar_one_or_none()

    if not visitor:
        raise NotFoundError("Visitante não encontrado")

    visitor.is_blocked = False
    visitor.block_reason = None
    visitor.blocked_at = None
    visitor.blocked_by_id = None

    await db.commit()

    return MessageResponse(message="Visitante desbloqueado com sucesso")
