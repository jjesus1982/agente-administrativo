import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.maintenance import MaintenanceExecution, MaintenanceSchedule, MaintenanceTicket
from app.models.user import User
from app.schemas.maintenance import (
    ExecutionCreate,
    ExecutionResponse,
    ScheduleCreate,
    ScheduleListResponse,
    ScheduleResponse,
    TicketCreate,
    TicketListResponse,
    TicketResponse,
    TicketUpdate,
)

router = APIRouter(prefix="/manutencao", tags=["Manutenção"])

USER_ID_TEMP = 1

CATEGORIAS = [
    "eletrica",
    "hidraulica",
    "estrutural",
    "pintura",
    "limpeza",
    "jardinagem",
    "elevador",
    "seguranca",
    "outros",
]
PRIORIDADES = ["baixa", "normal", "alta", "urgente"]
STATUS_TICKET = ["aberto", "em_analise", "aprovado", "em_andamento", "aguardando", "concluido", "cancelado"]


def gerar_protocolo():
    # ✅ FIX: Usar timezone-aware datetime
    return f"MNT-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


# ==================== TICKETS ====================


@router.get("/tickets", response_model=TicketListResponse)
async def listar_tickets(
    tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(MaintenanceTicket).where(MaintenanceTicket.tenant_id == tenant_id)

    if status_filter:
        query = query.where(MaintenanceTicket.status == status_filter)
    if category:
        query = query.where(MaintenanceTicket.category == category)
    if priority:
        query = query.where(MaintenanceTicket.priority == priority)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(MaintenanceTicket.created_at.desc()).offset((page - 1) * limit).limit(limit)
    tickets = (await db.execute(query)).scalars().all()

    return TicketListResponse(
        items=[
            TicketResponse(
                id=t.id,
                protocol=t.protocol,
                title=t.title,
                description=t.description,
                category=t.category,
                priority=t.priority or "normal",
                status=t.status,
                unit_id=t.unit_id,
                requester_id=t.requester_id,
                assigned_to=t.assigned_to,
                scheduled_date=t.scheduled_date,
                resolution=t.resolution,
                estimated_cost=t.estimated_cost,
                actual_cost=t.actual_cost,
                created_at=t.created_at,
            )
            for t in tickets
        ],
        total=total,
        page=page,
    )


@router.get("/tickets/meus", response_model=TicketListResponse)
async def meus_tickets(
    tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(MaintenanceTicket).where(
        MaintenanceTicket.tenant_id == tenant_id, MaintenanceTicket.requester_id == USER_ID_TEMP
    )
    if status_filter:
        query = query.where(MaintenanceTicket.status == status_filter)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(MaintenanceTicket.created_at.desc()).offset((page - 1) * limit).limit(limit)
    tickets = (await db.execute(query)).scalars().all()

    return TicketListResponse(
        items=[
            TicketResponse(
                id=t.id,
                protocol=t.protocol,
                title=t.title,
                description=t.description,
                category=t.category,
                priority=t.priority or "normal",
                status=t.status,
                unit_id=t.unit_id,
                requester_id=t.requester_id,
                assigned_to=t.assigned_to,
                scheduled_date=t.scheduled_date,
                resolution=t.resolution,
                estimated_cost=t.estimated_cost,
                actual_cost=t.actual_cost,
                created_at=t.created_at,
            )
            for t in tickets
        ],
        total=total,
        page=page,
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def detalhe_ticket(
    ticket_id: int, tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id, MaintenanceTicket.tenant_id == tenant_id)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")
    return TicketResponse(
        id=t.id,
        protocol=t.protocol,
        title=t.title,
        description=t.description,
        category=t.category,
        priority=t.priority or "normal",
        status=t.status,
        unit_id=t.unit_id,
        requester_id=t.requester_id,
        assigned_to=t.assigned_to,
        scheduled_date=t.scheduled_date,
        resolution=t.resolution,
        estimated_cost=t.estimated_cost,
        actual_cost=t.actual_cost,
        created_at=t.created_at,
    )


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def criar_ticket(
    tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0),
    dados: TicketCreate = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validação de campos obrigatórios
    if dados.category not in CATEGORIAS:
        raise HTTPException(status_code=400, detail=f"Categoria inválida. Use: {', '.join(CATEGORIAS)}")
    if dados.priority not in PRIORIDADES:
        raise HTTPException(status_code=400, detail=f"Prioridade inválida. Use: {', '.join(PRIORIDADES)}")

    # ✅ VALIDAÇÃO DE ACESSO AO TENANT
    if current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "TENANT_ACCESS_DENIED",
                "message": f"Usuário não tem acesso ao tenant {tenant_id}",
                "user_tenant": current_user.tenant_id,
                "requested_tenant": tenant_id
            }
        )

    ticket = MaintenanceTicket(
        tenant_id=tenant_id,
        requester_id=current_user.id,
        created_by_id=current_user.id,
        protocol=gerar_protocolo(),
        title=dados.title,
        description=dados.description,
        category=dados.category,
        priority=dados.priority,
        status="aberto",
        unit_id=dados.unit_id,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        protocol=ticket.protocol,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        unit_id=ticket.unit_id,
        requester_id=ticket.requester_id,
        assigned_to=ticket.assigned_to,
        scheduled_date=ticket.scheduled_date,
        resolution=ticket.resolution,
        estimated_cost=ticket.estimated_cost,
        actual_cost=ticket.actual_cost,
        created_at=ticket.created_at,
    )


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def atualizar_ticket(
    ticket_id: int,
    dados: TicketUpdate,
    tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id, MaintenanceTicket.tenant_id == tenant_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    update_data = dados.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ticket, key, value)

    if dados.status == "concluido" and not ticket.resolved_at:
        ticket.resolved_at = datetime.now()
        ticket.resolved_by_id = USER_ID_TEMP

    ticket.updated_at = datetime.now()
    ticket.updated_by_id = USER_ID_TEMP
    await db.commit()
    await db.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        protocol=ticket.protocol,
        title=ticket.title,
        description=ticket.description,
        category=ticket.category,
        priority=ticket.priority or "normal",
        status=ticket.status,
        unit_id=ticket.unit_id,
        requester_id=ticket.requester_id,
        assigned_to=ticket.assigned_to,
        scheduled_date=ticket.scheduled_date,
        resolution=ticket.resolution,
        estimated_cost=ticket.estimated_cost,
        actual_cost=ticket.actual_cost,
        created_at=ticket.created_at,
    )


@router.patch("/tickets/{ticket_id}/status")
async def alterar_status_ticket(
    ticket_id: int,
    novo_status: str = Query(...),
    tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0),
    db: AsyncSession = Depends(get_db),
):
    if novo_status not in STATUS_TICKET:
        raise HTTPException(status_code=400, detail=f"Status inválido")

    result = await db.execute(
        select(MaintenanceTicket).where(MaintenanceTicket.id == ticket_id, MaintenanceTicket.tenant_id == tenant_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Chamado não encontrado")

    ticket.status = novo_status
    ticket.updated_at = datetime.now()
    if novo_status == "concluido":
        ticket.resolved_at = datetime.now()
        ticket.resolved_by_id = USER_ID_TEMP

    await db.commit()
    return {"status": novo_status}


@router.get("/estatisticas")
async def estatisticas(tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0), db: AsyncSession = Depends(get_db)):
    base = select(MaintenanceTicket).where(MaintenanceTicket.tenant_id == tenant_id)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar() or 0
    abertos = (
        await db.execute(select(func.count()).select_from(base.where(MaintenanceTicket.status == "aberto").subquery()))
    ).scalar() or 0
    em_andamento = (
        await db.execute(
            select(func.count()).select_from(base.where(MaintenanceTicket.status == "em_andamento").subquery())
        )
    ).scalar() or 0
    concluidos = (
        await db.execute(
            select(func.count()).select_from(base.where(MaintenanceTicket.status == "concluido").subquery())
        )
    ).scalar() or 0

    return {"total": total, "abertos": abertos, "em_andamento": em_andamento, "concluidos": concluidos}


# ==================== SCHEDULES ====================


@router.get("/agendamentos", response_model=ScheduleListResponse)
async def listar_agendamentos(
    tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0),
    is_active: Optional[bool] = True,
    db: AsyncSession = Depends(get_db),
):
    query = select(MaintenanceSchedule).where(MaintenanceSchedule.tenant_id == tenant_id)
    if is_active is not None:
        query = query.where(MaintenanceSchedule.is_active == is_active)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(MaintenanceSchedule.next_execution.asc())
    schedules = (await db.execute(query)).scalars().all()

    return ScheduleListResponse(
        items=[
            ScheduleResponse(
                id=s.id,
                title=s.title,
                description=s.description,
                category=s.category,
                recurrence_type=s.recurrence_type,
                recurrence_interval=s.recurrence_interval,
                next_execution=s.next_execution,
                last_execution=s.last_execution,
                assigned_to=s.assigned_to,
                is_active=s.is_active or True,
                created_at=s.created_at,
            )
            for s in schedules
        ],
        total=total,
    )


@router.post("/agendamentos", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def criar_agendamento(
    dados: ScheduleCreate, tenant_id: int = Query(..., description="ID do condomínio (obrigatório)", gt=0), db: AsyncSession = Depends(get_db)
):
    schedule = MaintenanceSchedule(
        tenant_id=tenant_id,
        created_by_id=USER_ID_TEMP,
        title=dados.title,
        description=dados.description,
        category=dados.category,
        recurrence_type=dados.recurrence_type,
        recurrence_interval=dados.recurrence_interval,
        recurrence_day=dados.recurrence_day,
        next_execution=dados.next_execution,
        assigned_to=dados.assigned_to,
        is_active=True,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return ScheduleResponse(
        id=schedule.id,
        title=schedule.title,
        description=schedule.description,
        category=schedule.category,
        recurrence_type=schedule.recurrence_type,
        recurrence_interval=schedule.recurrence_interval,
        next_execution=schedule.next_execution,
        last_execution=schedule.last_execution,
        assigned_to=schedule.assigned_to,
        is_active=schedule.is_active or True,
        created_at=schedule.created_at,
    )
