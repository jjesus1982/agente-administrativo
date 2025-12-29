"""
Endpoints de autenticação
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .deps import get_current_user, get_db
from conecta_plus.core.permissions import get_role_name
from conecta_plus.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_refresh_token,
)
from conecta_plus.models.tenant import Tenant
from conecta_plus.models.user import User
from conecta_plus.schemas.auth import ChangePasswordRequest, LoginRequest, RefreshTokenRequest, TokenResponse, UserMeResponse
from conecta_plus.schemas.common import MessageResponse

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login com email e senha.
    Retorna access_token e refresh_token.
    """
    # Busca usuário por email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário desativado")

    if user.is_deleted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário removido")

    # ✅ FIX: Usar datetime.utcnow() ao invés de deprecated utcnow()
    user.last_login = datetime.utcnow()
    await db.commit()

    # Cria tokens
    token_data = {"sub": str(user.id), "tenant_id": user.tenant_id, "role": user.role}

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """
    Renova o access_token usando o refresh_token.
    """
    payload = verify_refresh_token(data.refresh_token)

    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido ou expirado")

    user_id = payload.get("sub")

    # Verifica se usuário ainda existe e está ativo
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado ou desativado")

    # Cria novo access token
    token_data = {"sub": str(user.id), "tenant_id": user.tenant_id, "role": user.role}

    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        refresh_token=data.refresh_token,  # Mantém o mesmo refresh token
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout do usuário.
    No momento, apenas retorna sucesso.
    Em produção, poderia invalidar o token em um blacklist no Redis.
    """
    return MessageResponse(message="Logout realizado com sucesso")


@router.get("/me", response_model=UserMeResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Retorna informações do usuário autenticado.
    """
    # Busca nome do tenant
    result = await db.execute(select(Tenant.name).where(Tenant.id == current_user.tenant_id))
    tenant_name = result.scalar_one_or_none() or "Desconhecido"

    return UserMeResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        cpf=current_user.cpf,
        phone=current_user.phone,
        photo_url=current_user.photo_url,
        role=current_user.role,
        role_name=get_role_name(current_user.role),
        tenant_id=current_user.tenant_id,
        tenant_name=tenant_name,
        last_login=current_user.last_login,
    )


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Altera a senha do usuário autenticado.
    """
    # Verifica senha atual
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")

    # Atualiza senha
    current_user.password_hash = get_password_hash(data.new_password)
    await db.commit()

    return MessageResponse(message="Senha alterada com sucesso")


# ==================== MULTI-TENANT (Síndicos Multi-Condomínio) ====================

from sqlalchemy import text


@router.get("/me/tenants")
async def get_my_tenants(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Retorna lista de condomínios que o usuário tem acesso.
    Para síndicos que administram múltiplos condomínios.
    """
    query = text(
        """
        SELECT 
            ut.id,
            ut.tenant_id,
            ut.is_primary,
            ut.role_in_tenant,
            t.name as tenant_name,
            t.logo_url,
            t.city,
            t.state,
            (SELECT COUNT(*) FROM units WHERE tenant_id = t.id) as total_units,
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = true) as total_users
        FROM user_tenants ut
        JOIN tenants t ON ut.tenant_id = t.id
        WHERE ut.user_id = :user_id
        ORDER BY ut.is_primary DESC, t.name ASC
    """
    )
    result = await db.execute(query, {"user_id": current_user.id})
    rows = result.fetchall()

    # Se não tem registros em user_tenants, retorna o tenant atual do usuário
    if not rows:
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == current_user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant:
            return [
                {
                    "id": 0,
                    "tenant_id": tenant.id,
                    "tenant_name": tenant.name,
                    "logo_url": tenant.logo_url,
                    "city": tenant.city,
                    "state": tenant.state,
                    "is_primary": True,
                    "role_in_tenant": current_user.role,
                    "total_units": 0,
                    "total_users": 0,
                }
            ]
        return []

    return [
        {
            "id": row.id,
            "tenant_id": row.tenant_id,
            "tenant_name": row.tenant_name,
            "logo_url": row.logo_url,
            "city": row.city,
            "state": row.state,
            "is_primary": row.is_primary,
            "role_in_tenant": row.role_in_tenant,
            "total_units": row.total_units,
            "total_users": row.total_users,
        }
        for row in rows
    ]


@router.post("/me/tenants/switch/{tenant_id}")
async def switch_tenant(
    tenant_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Troca o condomínio ativo do síndico.
    Verifica se o usuário tem permissão para acessar o tenant.
    """
    # Verifica se o usuário tem acesso a este tenant
    query = text(
        """
        SELECT ut.*, t.name as tenant_name 
        FROM user_tenants ut
        JOIN tenants t ON ut.tenant_id = t.id
        WHERE ut.tenant_id = :tenant_id AND ut.user_id = :user_id
    """
    )
    result = await db.execute(query, {"tenant_id": tenant_id, "user_id": current_user.id})
    row = result.fetchone()

    # Se não achou em user_tenants, verifica se é o tenant principal do usuário
    if not row and current_user.tenant_id == tenant_id:
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant:
            return {
                "success": True,
                "tenant_id": tenant_id,
                "tenant_name": tenant.name,
                "message": f"Condomínio alterado para: {tenant.name}",
            }

    if not row:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado a este condomínio")

    return {
        "success": True,
        "tenant_id": tenant_id,
        "tenant_name": row.tenant_name,
        "message": f"Condomínio alterado para: {row.tenant_name}",
    }


@router.post("/me/tenants/{tenant_id}/set-primary")
async def set_primary_tenant(
    tenant_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    """
    Define um condomínio como principal para o usuário.
    """
    # Remove primary de todos os outros
    await db.execute(
        text("UPDATE user_tenants SET is_primary = false WHERE user_id = :user_id"), {"user_id": current_user.id}
    )

    # Define o novo como primary
    result = await db.execute(
        text(
            """
            UPDATE user_tenants 
            SET is_primary = true, updated_at = NOW() 
            WHERE user_id = :user_id AND tenant_id = :tenant_id
            RETURNING id
        """
        ),
        {"user_id": current_user.id, "tenant_id": tenant_id},
    )

    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relacionamento não encontrado")

    await db.commit()

    return {"success": True, "message": "Condomínio principal atualizado"}
