"""
Dependências da API (injeção de dependência)
"""

from typing import Optional

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from conecta_plus.core.permissions import Role
from conecta_plus.core.security import verify_access_token
from conecta_plus.database import AsyncSessionLocal
from conecta_plus.models.tenant import Tenant
from conecta_plus.models.user import User

security = HTTPBearer()


async def get_db() -> AsyncSession:
    """Dependency para obter sessão do banco"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), db: AsyncSession = Depends(get_db)
) -> User:
    """Dependency para obter usuário autenticado"""

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = verify_access_token(token)

    if payload is None:
        raise credentials_exception

    user_id = int(payload.get("sub"))
    if user_id is None:
        raise credentials_exception

    # Busca usuário
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário desativado")

    if user.is_deleted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário removido")

    return user


async def get_current_tenant(current_user: User = Depends(get_current_user)) -> int:
    """Dependency para obter tenant_id do usuário atual"""
    return current_user.tenant_id


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Dependency opcional - não falha se não autenticado"""
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


def require_role(min_role: Role):
    """Dependency factory para verificar role mínima"""

    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role < min_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão insuficiente. Requer role mínima: {min_role.name}",
            )
        return current_user

    return role_checker


# Pagination dependencies
class PaginationDep:
    """Dependency para paginação"""

    def __init__(
        self,
        page: int = Query(1, ge=1, description="Número da página"),
        page_size: int = Query(15, ge=1, le=100, description="Itens por página"),
        sort_by: Optional[str] = Query(None, description="Campo para ordenação"),
        sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Direção"),
    ):
        self.page = page
        self.page_size = page_size
        self.sort_by = sort_by
        self.sort_order = sort_order
        self.offset = (page - 1) * page_size


# Filter dependencies
class DateFilterDep:
    """Dependency para filtros de data"""

    def __init__(
        self,
        start_date: Optional[str] = Query(None, description="Data início (YYYY-MM-DD)"),
        end_date: Optional[str] = Query(None, description="Data fim (YYYY-MM-DD)"),
    ):
        self.start_date = start_date
        self.end_date = end_date


async def verify_tenant_access(
    tenant_id: int = Query(..., description="ID do tenant"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Tenant:
    """Dependency para verificar acesso ao tenant"""
    # Verifica se o tenant existe
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()

    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant não encontrado"
        )

    # Verifica se o usuário tem acesso ao tenant
    if current_user.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado ao tenant"
        )

    return tenant