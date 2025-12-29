"""
Endpoints de perfil do usuário
"""

import os
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_optional_user
from app.config import UPLOAD_BASE_DIR
from app.core.security import verify_access_token
from app.models.user import User

router = APIRouter(prefix="/profile", tags=["Perfil"])

UPLOAD_DIR = os.path.join(UPLOAD_BASE_DIR, "avatars")
os.makedirs(UPLOAD_DIR, exist_ok=True)
security = HTTPBearer(auto_error=False)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone_secondary: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    cpf: Optional[str] = None
    rg: Optional[str] = None
    has_special_needs: Optional[bool] = None
    special_needs_description: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


async def get_user_id_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[int]:
    """Extrai user_id do token JWT se existir"""
    if credentials is None:
        return None
    try:
        payload = verify_access_token(credentials.credentials)
        if payload:
            return int(payload.get("sub"))
    except (ValueError, TypeError, AttributeError):
        # Token inválido, expirado ou malformado - retornar None para indicar não autenticado
        pass
    return None


@router.get("/me")
async def get_profile(
    tenant_id: int = Query(1, description="ID do condomínio"),
    token_user_id: Optional[int] = Depends(get_user_id_from_token),
    db: AsyncSession = Depends(get_db),
):
    """Retorna perfil do usuário logado"""
    # Usa user_id do token ou fallback para 1
    user_id = token_user_id or 1

    result = await db.execute(
        text(
            """
        SELECT u.id, u.name, u.email, u.phone, u.phone_secondary, u.cpf, u.rg,
               u.birth_date, u.gender, u.photo_url, u.role, u.is_active, u.is_verified,
               u.last_login, u.has_special_needs, u.special_needs_description,
               u.tenant_id, u.created_at, u.updated_at,
               t.name as tenant_name,
               ur.unit_id,
               un.block, un.number as unit_number
        FROM users u
        LEFT JOIN tenants t ON t.id = u.tenant_id
        LEFT JOIN unit_residents ur ON ur.user_id = u.id
        LEFT JOIN units un ON un.id = ur.unit_id
        WHERE u.id = :user_id
    """
        ),
        {"user_id": user_id},
    )

    user = result.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    data = dict(user._mapping)
    roles = {1: "Morador", 2: "Síndico", 3: "Porteiro", 4: "Administrador", 5: "Super Admin", 9: "Agente AGP"}
    data["role_name"] = roles.get(data["role"], "Usuário")

    counts = await db.execute(
        text(
            """
        SELECT 
            (SELECT COUNT(*) FROM dependents WHERE responsible_id = :uid) as dependents_count,
            (SELECT COUNT(*) FROM vehicles WHERE owner_id = :uid) as vehicles_count,
            (SELECT COUNT(*) FROM pets WHERE owner_id = :uid) as pets_count,
            (SELECT COUNT(*) FROM maintenance_tickets WHERE requester_id = :uid) as tickets_count,
            (SELECT COUNT(*) FROM occurrences WHERE reporter_id = :uid) as occurrences_count,
            (SELECT COUNT(*) FROM reservations WHERE user_id = :uid) as reservations_count
    """
        ),
        {"uid": user_id},
    )

    counts_data = dict(counts.fetchone()._mapping)
    data.update(counts_data)
    return data


@router.put("/me")
async def update_profile(
    data: ProfileUpdate,
    tenant_id: int = Query(1, description="ID do condomínio"),
    token_user_id: Optional[int] = Depends(get_user_id_from_token),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza perfil do usuário"""
    user_id = token_user_id or 1

    # ✅ SEGURANÇA: Whitelist de campos permitidos para UPDATE
    ALLOWED_FIELDS = {
        "name", "email", "phone", "phone_secondary", "birth_date",
        "gender", "cpf", "rg", "has_special_needs", "special_needs_description"
    }

    updates = []
    params = {"user_id": user_id}

    for field, value in data.dict(exclude_unset=True).items():
        if value is not None and field in ALLOWED_FIELDS:
            updates.append(f"{field} = :{field}")
            params[field] = value

    if updates:
        # Agora é seguro usar f-string pois os campos foram validados contra whitelist
        query = f"UPDATE users SET {', '.join(updates)}, updated_at = NOW() WHERE id = :user_id"
        await db.execute(text(query), params)
        await db.commit()

    return {"message": "Perfil atualizado com sucesso"}


@router.post("/change-password")
async def change_password(
    data: PasswordChange,
    token_user_id: Optional[int] = Depends(get_user_id_from_token),
    db: AsyncSession = Depends(get_db),
):
    """Altera senha do usuário"""
    from app.core.security import get_password_hash, verify_password

    user_id = token_user_id or 1

    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Senhas não conferem")

    # Verificar senha atual
    result = await db.execute(text("SELECT password_hash FROM users WHERE id = :uid"), {"uid": user_id})
    user = result.fetchone()

    if not user or not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")

    # Atualizar senha
    new_hash = get_password_hash(data.new_password)
    await db.execute(text("UPDATE users SET password_hash = :hash WHERE id = :uid"), {"hash": new_hash, "uid": user_id})
    await db.commit()

    return {"message": "Senha alterada com sucesso"}


@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    token_user_id: Optional[int] = Depends(get_user_id_from_token),
    db: AsyncSession = Depends(get_db),
):
    """Upload de foto de perfil"""
    user_id = token_user_id or 1

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser uma imagem")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{user_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    photo_url = f"/uploads/avatars/{filename}"
    await db.execute(text("UPDATE users SET photo_url = :url WHERE id = :uid"), {"url": photo_url, "uid": user_id})
    await db.commit()

    return {"photo_url": photo_url, "message": "Foto atualizada"}
