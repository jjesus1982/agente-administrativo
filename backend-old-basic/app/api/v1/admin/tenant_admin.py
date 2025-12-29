"""
API Endpoints para Gestão de Condomínios (Admin Only)
Integração Conecta Plus + App Simples
"""

from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.api.deps import get_db, get_current_user
# from app.core.security import require_admin_permission  # Removed - not needed
from app.middleware.tenant_security import get_current_user_context
from app.models.tenant import Tenant
from app.models.unit import Unit
from app.models.user import User
from app.schemas.tenant_schemas import (
    TenantCreateSchema,
    TenantUpdateSchema,
    TenantResponseSchema,
    TenantListSchema
)
from app.services.sync_service import SyncService
from app.services.tenant_service import TenantService
from app.core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/admin/condominios", tags=["Admin - Condomínios"])

# Serviços
sync_service = SyncService()
tenant_service = TenantService()


@router.post("", response_model=TenantResponseSchema, status_code=201)
async def criar_condominio(
    tenant_data: TenantCreateSchema,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cria um novo condomínio no sistema.

    Funcionalidades:
    1. Valida dados de entrada
    2. Cria tenant no banco
    3. Gera unidades automaticamente (se configurado)
    4. Sincroniza com App Simples via webhook
    5. Envia notificação para síndico (background)

    Acesso: Apenas admins Conecta Plus
    """

    # Verificar permissões de admin
    user_context = get_current_user_context(request)
    if current_user.role < 4:  # Apenas admin e super_admin
        raise HTTPException(403, "Acesso negado. Apenas administradores podem criar condomínios.")

    try:
        # 1. Verificar se CNPJ já existe
        if tenant_data.cnpj:
            existing = db.query(Tenant).filter(Tenant.cnpj == tenant_data.cnpj).first()
            if existing:
                raise HTTPException(400, f"CNPJ {tenant_data.cnpj} já está cadastrado no condomínio '{existing.nome}'")

        # 2. Verificar se nome já existe na mesma cidade
        existing_nome = db.query(Tenant).filter(
            and_(
                func.lower(Tenant.nome) == tenant_data.nome.lower(),
                func.lower(Tenant.cidade) == tenant_data.cidade.lower()
            )
        ).first()
        if existing_nome:
            raise HTTPException(400, f"Já existe um condomínio com o nome '{tenant_data.nome}' em {tenant_data.cidade}")

        # 3. Criar tenant usando o service
        novo_tenant = await tenant_service.criar_tenant(
            db=db,
            tenant_data=tenant_data,
            created_by=current_user.id
        )

        # 4. Log da operação
        logger.info(
            "tenant_created",
            tenant_id=novo_tenant.id,
            tenant_nome=novo_tenant.nome,
            created_by=current_user.id,
            created_by_email=current_user.email,
            cidade=novo_tenant.cidade
        )

        # 5. Sincronização em background
        background_tasks.add_task(
            sync_service.sync_tenant_to_app,
            tenant=novo_tenant,
            action="create"
        )

        # 6. Envio de notificações em background
        if tenant_data.email:
            background_tasks.add_task(
                tenant_service.enviar_email_boas_vindas,
                tenant=novo_tenant,
                admin_email=current_user.email
            )

        return novo_tenant

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "erro_criar_tenant",
            error=str(e),
            tenant_nome=tenant_data.nome,
            created_by=current_user.id
        )
        raise HTTPException(500, "Erro interno ao criar condomínio. Contate o suporte.")


@router.get("", response_model=List[TenantListSchema])
async def listar_condominios(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    busca: Optional[str] = Query(None, description="Busca por nome ou cidade"),
    cidade: Optional[str] = Query(None, description="Filtrar por cidade"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    plano: Optional[str] = Query(None, description="Filtrar por plano"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """
    Lista todos os condomínios do sistema.

    Filtros disponíveis:
    - busca: Nome ou cidade
    - cidade: Cidade específica
    - ativo: Status ativo/inativo
    - plano: Plano contratado

    Acesso: Admins e Super Admins
    """

    # Verificar permissões
    if current_user.role < 4:
        raise HTTPException(403, "Acesso negado")

    # Construir query base
    query = db.query(Tenant)

    # Aplicar filtros
    if busca:
        query = query.filter(
            or_(
                Tenant.nome.ilike(f"%{busca}%"),
                Tenant.cidade.ilike(f"%{busca}%"),
                Tenant.endereco.ilike(f"%{busca}%")
            )
        )

    if cidade:
        query = query.filter(Tenant.cidade.ilike(f"%{cidade}%"))

    if ativo is not None:
        query = query.filter(Tenant.ativo == ativo)

    if plano:
        query = query.filter(Tenant.plano == plano)

    # Aplicar paginação e ordenação
    query = query.order_by(Tenant.created_at.desc())
    tenants = query.offset(offset).limit(limit).all()

    # Enriquecer com estatísticas
    result = []
    for tenant in tenants:
        # Contar unidades e moradores
        total_unidades = db.query(Unit).filter(Unit.tenant_id == tenant.id).count()
        total_moradores = db.query(User).filter(
            and_(
                User.tenant_id == tenant.id,
                User.role.in_([1, 2, 3]),  # morador, síndico, porteiro
                User.ativo == True
            )
        ).count()

        tenant_dict = {
            "id": tenant.id,
            "nome": tenant.nome,
            "cidade": tenant.cidade,
            "estado": tenant.estado,
            "tipo_estrutura": tenant.tipo_estrutura,
            "ativo": tenant.ativo,
            "plano": tenant.plano,
            "total_unidades": total_unidades,
            "total_moradores": total_moradores,
            "created_at": tenant.created_at
        }
        result.append(TenantListSchema(**tenant_dict))

    return result


@router.get("/{tenant_id}", response_model=TenantResponseSchema)
async def obter_condominio(
    tenant_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém detalhes completos de um condomínio.

    Acesso: Admins ou usuários do próprio condomínio
    """

    user_context = get_current_user_context(request)

    # Verificar permissões
    if current_user.role >= 4:
        # Admin pode ver qualquer condomínio
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    else:
        # Usuário normal só pode ver seu próprio condomínio
        if user_context["tenant_id"] != tenant_id:
            raise HTTPException(403, "Acesso negado a este condomínio")
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    if not tenant:
        raise HTTPException(404, "Condomínio não encontrado")

    return tenant


@router.put("/{tenant_id}", response_model=TenantResponseSchema)
async def atualizar_condominio(
    tenant_id: str,
    tenant_data: TenantUpdateSchema,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Atualiza dados de um condomínio.

    Campos atualizáveis:
    - Dados básicos (nome, endereço, contato)
    - Áreas comuns
    - Funcionalidades
    - Configurações de segurança
    - Status ativo/inativo

    Acesso: Admins ou síndicos do condomínio
    """

    user_context = get_current_user_context(request)

    # Buscar tenant
    if current_user.role >= 4:
        # Admin pode atualizar qualquer condomínio
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    else:
        # Síndico só pode atualizar seu próprio condomínio
        if user_context["tenant_id"] != tenant_id or current_user.role < 2:
            raise HTTPException(403, "Acesso negado")
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()

    if not tenant:
        raise HTTPException(404, "Condomínio não encontrado")

    try:
        # Atualizar campos
        update_data = tenant_data.dict(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(tenant, field):
                setattr(tenant, field, value)

        db.commit()
        db.refresh(tenant)

        # Log da operação
        logger.info(
            "tenant_updated",
            tenant_id=tenant.id,
            updated_by=current_user.id,
            updated_fields=list(update_data.keys())
        )

        # Sincronizar com App Simples
        background_tasks.add_task(
            sync_service.sync_tenant_to_app,
            tenant=tenant,
            action="update"
        )

        return tenant

    except Exception as e:
        db.rollback()
        logger.error(
            "erro_atualizar_tenant",
            tenant_id=tenant_id,
            error=str(e),
            updated_by=current_user.id
        )
        raise HTTPException(500, "Erro interno ao atualizar condomínio")


@router.delete("/{tenant_id}", status_code=204)
async def desativar_condominio(
    tenant_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Desativa um condomínio (soft delete).

    CUIDADO: Esta operação:
    1. Desativa o condomínio
    2. Bloqueia acesso de todos os usuários
    3. Sincroniza com App Simples
    4. É IRREVERSÍVEL via API

    Acesso: Apenas Super Admins
    """

    # Apenas super admins podem desativar condomínios
    if current_user.role < 5:
        raise HTTPException(403, "Acesso negado. Apenas super administradores podem desativar condomínios.")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Condomínio não encontrado")

    if not tenant.ativo:
        raise HTTPException(400, "Condomínio já está desativado")

    try:
        # Desativar tenant
        tenant.ativo = False

        # Desativar todos os usuários do tenant
        db.query(User).filter(User.tenant_id == tenant_id).update({"ativo": False})

        db.commit()

        # Log crítico
        logger.critical(
            "tenant_deactivated",
            tenant_id=tenant.id,
            tenant_nome=tenant.nome,
            deactivated_by=current_user.id,
            deactivated_by_email=current_user.email
        )

        # Sincronizar com App Simples
        background_tasks.add_task(
            sync_service.sync_tenant_to_app,
            tenant=tenant,
            action="delete"
        )

    except Exception as e:
        db.rollback()
        logger.error(
            "erro_desativar_tenant",
            tenant_id=tenant_id,
            error=str(e),
            deactivated_by=current_user.id
        )
        raise HTTPException(500, "Erro interno ao desativar condomínio")


@router.post("/{tenant_id}/reativar", response_model=TenantResponseSchema)
async def reativar_condominio(
    tenant_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reativa um condomínio desativado.

    Acesso: Apenas Super Admins
    """

    if current_user.role < 5:
        raise HTTPException(403, "Acesso negado")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Condomínio não encontrado")

    if tenant.ativo:
        raise HTTPException(400, "Condomínio já está ativo")

    try:
        tenant.ativo = True
        db.commit()

        logger.info(
            "tenant_reactivated",
            tenant_id=tenant.id,
            reactivated_by=current_user.id
        )

        return tenant

    except Exception as e:
        db.rollback()
        logger.error(
            "erro_reativar_tenant",
            tenant_id=tenant_id,
            error=str(e)
        )
        raise HTTPException(500, "Erro interno ao reativar condomínio")


@router.get("/{tenant_id}/estatisticas")
async def obter_estatisticas_condominio(
    tenant_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtém estatísticas detalhadas do condomínio.

    Inclui:
    - Contadores de unidades, moradores, visitantes
    - Uso de funcionalidades
    - Dados de engajamento
    """

    user_context = get_current_user_context(request)

    # Verificar acesso
    if current_user.role < 4 and user_context["tenant_id"] != tenant_id:
        raise HTTPException(403, "Acesso negado")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Condomínio não encontrado")

    try:
        stats = await tenant_service.obter_estatisticas(db, tenant_id)
        return stats

    except Exception as e:
        logger.error(
            "erro_estatisticas_tenant",
            tenant_id=tenant_id,
            error=str(e)
        )
        raise HTTPException(500, "Erro ao obter estatísticas")


# Endpoints auxiliares para configuração

@router.get("/{tenant_id}/preview-app")
async def preview_configuracao_app(
    tenant_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Gera preview de como o condomínio aparecerá no App Simples.
    Útil para validar configurações antes de finalizar.
    """

    user_context = get_current_user_context(request)

    if current_user.role < 4 and user_context["tenant_id"] != tenant_id:
        raise HTTPException(403, "Acesso negado")

    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(404, "Condomínio não encontrado")

    return await tenant_service.gerar_preview_app(tenant)