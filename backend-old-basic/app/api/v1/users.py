"""
Endpoints de usuários
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import PaginationDep, get_current_tenant, get_current_user, get_db
from app.core.exceptions import DuplicateError, NotFoundError
from app.core.permissions import Role, get_role_name
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Usuários"])


def user_to_response(user: User) -> UserResponse:
    """Converte model para response"""
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        cpf=user.cpf,
        rg=user.rg,
        phone=user.phone,
        phone_secondary=user.phone_secondary,
        birth_date=user.birth_date,
        gender=user.gender,
        photo_url=user.photo_url,
        role=user.role,
        role_name=get_role_name(user.role),
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login=user.last_login,
        has_special_needs=user.has_special_needs,
        special_needs_description=user.special_needs_description,
        tenant_id=user.tenant_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/", response_model=UserListResponse)
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
    pagination: PaginationDep = Depends(),
    search: Optional[str] = Query(None, description="Busca por nome, email ou CPF"),
    role: Optional[int] = Query(None, description="Filtrar por role"),
    is_active: Optional[bool] = Query(None, description="Filtrar por status"),
):
    """
    Lista usuários do condomínio com filtros e paginação.
    """
    # Verifica permissão
    if current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Query base
    query = select(User).where(User.tenant_id == tenant_id, User.is_deleted == False)

    # Filtros
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(User.name.ilike(search_term), User.email.ilike(search_term), User.cpf.ilike(search_term))
        )

    if role is not None:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Ordenação
    if pagination.sort_by and hasattr(User, pagination.sort_by):
        order_column = getattr(User, pagination.sort_by)
        if pagination.sort_order == "asc":
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())
    else:
        query = query.order_by(User.created_at.desc())

    # Paginação
    query = query.offset(pagination.offset).limit(pagination.page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    # Calcula totais
    total_pages = (total + pagination.page_size - 1) // pagination.page_size

    return UserListResponse(
        items=[user_to_response(u) for u in users],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
        total_pages=total_pages,
        has_next=pagination.page < total_pages,
        has_prev=pagination.page > 1,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Retorna detalhes de um usuário.
    """
    # Permite ver próprio perfil ou se for admin
    if user_id != current_user.id and current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundError("Usuário não encontrado")

    return user_to_response(user)


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Cria um novo usuário.
    """
    # Verifica permissão
    if current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão para criar usuários")

    # Verifica se email já existe
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise DuplicateError("Email já cadastrado")

    # Verifica se CPF já existe (se informado)
    if data.cpf:
        result = await db.execute(select(User).where(User.cpf == data.cpf, User.tenant_id == tenant_id))
        if result.scalar_one_or_none():
            raise DuplicateError("CPF já cadastrado")

    # Cria usuário
    user = User(
        tenant_id=tenant_id,
        name=data.name,
        email=data.email,
        password_hash=get_password_hash(data.password),
        cpf=data.cpf,
        rg=data.rg,
        phone=data.phone,
        phone_secondary=data.phone_secondary,
        birth_date=data.birth_date,
        gender=data.gender,
        role=data.role,
        has_special_needs=data.has_special_needs,
        special_needs_description=data.special_needs_description,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user_to_response(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Atualiza um usuário.
    """
    # Permite editar próprio perfil ou se for admin
    if user_id != current_user.id and current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Busca usuário
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id, User.is_deleted == False)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundError("Usuário não encontrado")

    # Atualiza campos
    update_data = data.model_dump(exclude_unset=True)

    # Não permite usuário comum alterar próprio role
    if user_id == current_user.id and "role" in update_data:
        del update_data["role"]

    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_by_id = current_user.id

    await db.commit()
    await db.refresh(user)

    return user_to_response(user)


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Remove um usuário (soft delete).
    """
    # Verifica permissão
    if current_user.role < Role.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Sem permissão")

    # Não pode deletar a si mesmo
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível remover o próprio usuário")

    # Busca usuário
    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundError("Usuário não encontrado")

    # Soft delete
    from datetime import datetime

    user.is_deleted = True
    user.deleted_at = datetime.utcnow()
    user.deleted_by_id = current_user.id
    user.is_active = False

    await db.commit()

    return MessageResponse(message="Usuário removido com sucesso")


@router.post("/{user_id}/activate", response_model=MessageResponse)
async def activate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Ativa um usuário.
    """
    if current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundError("Usuário não encontrado")

    user.is_active = True
    await db.commit()

    return MessageResponse(message="Usuário ativado com sucesso")


@router.post("/{user_id}/deactivate", response_model=MessageResponse)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: int = Depends(get_current_tenant),
):
    """
    Desativa um usuário.
    """
    if current_user.role < Role.SYNDIC:
        raise HTTPException(status_code=403, detail="Sem permissão")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível desativar o próprio usuário")

    result = await db.execute(select(User).where(User.id == user_id, User.tenant_id == tenant_id))
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundError("Usuário não encontrado")

    user.is_active = False
    await db.commit()

    return MessageResponse(message="Usuário desativado com sucesso")


@router.get("/public-list")
async def get_public_users(
    skip: int = 0,
    limit: int = 100,
    tenant_id: int = Query(1, description="ID do condomínio"),
    db: AsyncSession = Depends(get_db),
):
    """Lista usuários sem autenticação (para teste)"""
    from sqlalchemy import select

    from app.models.user import User

    tenant_id = 1

    # Total
    total = (
        await db.execute(select(func.count()).where(User.tenant_id == tenant_id, User.is_deleted == False))
    ).scalar()

    # Lista
    result = await db.execute(
        select(User)
        .where(User.tenant_id == tenant_id, User.is_deleted == False)
        .offset(skip)
        .limit(limit)
        .order_by(User.name)
    )
    users = result.scalars().all()

    return {
        "total": total,
        "items": [
            {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role, "cpf": u.cpf}
            for u in users
        ],
    }
