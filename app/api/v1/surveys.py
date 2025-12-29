from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.survey import Survey, SurveyOption, SurveyVote
from app.schemas.surveys import (
    SurveyCreate,
    SurveyListResponse,
    SurveyOptionResponse,
    SurveyResponse,
    SurveyUpdate,
    VoteCreate,
    VoteResponse,
)

router = APIRouter(prefix="/surveys", tags=["Pesquisas e Enquetes"])


async def get_user_vote(db: AsyncSession, survey_id: int, user_id: int):
    result = await db.execute(
        select(SurveyVote).where(SurveyVote.survey_id == survey_id, SurveyVote.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def calculate_results(db: AsyncSession, survey_id: int):
    total_result = await db.execute(select(func.count(SurveyVote.id)).where(SurveyVote.survey_id == survey_id))
    total_votes = total_result.scalar() or 0

    options_result = await db.execute(select(SurveyOption).where(SurveyOption.survey_id == survey_id))
    for option in options_result.scalars().all():
        count_result = await db.execute(select(func.count(SurveyVote.id)).where(SurveyVote.option_id == option.id))
        option.votes_count = count_result.scalar() or 0
    await db.commit()
    return total_votes


def build_survey_response(
    survey: Survey, options: list, total_votes: int, user_voted: bool, user_vote_option_id: int = None
) -> SurveyResponse:
    return SurveyResponse(
        id=survey.id,
        title=survey.title,
        description=survey.description,
        survey_type=survey.survey_type or "poll",
        starts_at=survey.starts_at,
        ends_at=survey.ends_at,
        is_anonymous=survey.is_anonymous or False,
        allow_multiple=survey.allow_multiple or False,
        status=survey.status or "draft",
        options=options,
        total_votes=total_votes,
        user_voted=user_voted,
        user_vote_option_id=user_vote_option_id,
    )


@router.get("", response_model=SurveyListResponse)
async def listar_surveys(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Survey).options(selectinload(Survey.options)).where(Survey.tenant_id == tenant_id)
    if status_filter:
        query = query.where(Survey.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Survey.created_at.desc()).offset((page - 1) * limit).limit(limit)
    surveys = (await db.execute(query)).scalars().all()

    items = []
    for s in surveys:
        user_vote = await get_user_vote(db, s.id, user_id)
        total_votes = sum(o.votes_count or 0 for o in s.options)
        options = [
            SurveyOptionResponse(id=o.id, text=o.text, order=o.order or 0, votes_count=o.votes_count or 0)
            for o in s.options
        ]
        items.append(
            build_survey_response(
                s, options, total_votes, user_vote is not None, user_vote.option_id if user_vote else None
            )
        )

    return SurveyListResponse(items=items, total=total, page=page)


@router.get("/minhas", response_model=SurveyListResponse)
async def minhas_surveys(
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Survey)
        .options(selectinload(Survey.options))
        .where(Survey.tenant_id == tenant_id, Survey.created_by_id == user_id)
    )
    if status_filter:
        query = query.where(Survey.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Survey.created_at.desc()).offset((page - 1) * limit).limit(limit)
    surveys = (await db.execute(query)).scalars().all()

    items = []
    for s in surveys:
        total_votes = sum(o.votes_count or 0 for o in s.options)
        options = [
            SurveyOptionResponse(id=o.id, text=o.text, order=o.order or 0, votes_count=o.votes_count or 0)
            for o in s.options
        ]
        items.append(build_survey_response(s, options, total_votes, False, None))

    return SurveyListResponse(items=items, total=total, page=page)


@router.get("/{survey_id}", response_model=SurveyResponse)
async def detalhe_survey(
    survey_id: int,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.options))
        .where(Survey.id == survey_id, Survey.tenant_id == tenant_id)
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Pesquisa não encontrada")

    user_vote = await get_user_vote(db, survey.id, user_id)
    total_votes = sum(o.votes_count or 0 for o in survey.options)
    options = [
        SurveyOptionResponse(id=o.id, text=o.text, order=o.order or 0, votes_count=o.votes_count or 0)
        for o in survey.options
    ]

    return build_survey_response(
        survey, options, total_votes, user_vote is not None, user_vote.option_id if user_vote else None
    )


@router.post("", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SurveyResponse, status_code=status.HTTP_201_CREATED)
async def criar_survey(
    dados: SurveyCreate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    if len(dados.options) < 2:
        raise HTTPException(status_code=400, detail="Mínimo de 2 opções")

    survey = Survey(
        tenant_id=tenant_id,
        created_by_id=user_id,
        title=dados.title,
        description=dados.description,
        survey_type=dados.survey_type,
        status="active",
        is_anonymous=dados.is_anonymous,
        allow_multiple=dados.allow_multiple,
        starts_at=dados.starts_at,
        ends_at=dados.ends_at,
    )
    db.add(survey)
    await db.flush()

    for i, opt in enumerate(dados.options):
        db.add(SurveyOption(survey_id=survey.id, text=opt.text, order=opt.order or i))

    await db.commit()
    await db.refresh(survey)

    result = await db.execute(select(Survey).options(selectinload(Survey.options)).where(Survey.id == survey.id))
    survey = result.scalar_one()

    options = [SurveyOptionResponse(id=o.id, text=o.text, order=o.order or 0, votes_count=0) for o in survey.options]
    return build_survey_response(survey, options, 0, False, None)


@router.patch("/{survey_id}/status")
async def alterar_status(
    survey_id: int,
    novo_status: str = Query(...),
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Survey).where(Survey.id == survey_id, Survey.created_by_id == user_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Pesquisa não encontrada")

    survey.status = novo_status
    survey.updated_at = datetime.now()
    await db.commit()
    return {"status": novo_status}


@router.post("/{survey_id}/votar", response_model=VoteResponse)
async def votar(
    survey_id: int,
    voto: VoteCreate,
    request: Request,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Survey)
        .options(selectinload(Survey.options))
        .where(Survey.id == survey_id, Survey.tenant_id == tenant_id, Survey.status == "active")
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Pesquisa não encontrada ou inativa")

    now = datetime.now()
    if survey.starts_at and now < survey.starts_at:
        raise HTTPException(status_code=400, detail="Pesquisa ainda não iniciou")
    if survey.ends_at and now > survey.ends_at:
        raise HTTPException(status_code=400, detail="Pesquisa encerrada")

    if voto.option_id not in [o.id for o in survey.options]:
        raise HTTPException(status_code=400, detail="Opção inválida")

    existing = await get_user_vote(db, survey_id, user_id)
    if existing and not survey.allow_multiple:
        raise HTTPException(status_code=400, detail="Você já votou")

    vote = SurveyVote(
        survey_id=survey_id,
        option_id=voto.option_id,
        user_id=None if survey.is_anonymous else user_id,
        ip_address=request.client.host if request.client else None,
    )
    db.add(vote)
    await db.commit()
    await db.refresh(vote)

    await calculate_results(db, survey_id)

    return VoteResponse(id=vote.id, survey_id=vote.survey_id, option_id=vote.option_id)


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deletar_survey(
    survey_id: int,
    tenant_id: int = Query(1, description="ID do condomínio"),
    user_id: int = Query(1, description="ID do usuário autenticado"),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Survey).where(Survey.id == survey_id, Survey.created_by_id == user_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Pesquisa não encontrada")
    await db.delete(survey)
    await db.commit()
