"""
API Endpoints Públicos para App Simples
Endpoints sem autenticação para cadastro de moradores
"""

from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.api.deps import get_db
from app.models.tenant import Tenant
from app.models.unit import Unit
from app.models.user import User
from app.schemas.tenant_schemas import TenantPublicSchema
from app.core.logger import get_logger
from pydantic import BaseModel

logger = get_logger(__name__)
router = APIRouter(prefix="/public", tags=["Público - App Simples"])


# ══════════════════════════════════════════════════════════════
# SCHEMAS PARA VALIDAÇÃO
# ══════════════════════════════════════════════════════════════

class ValidarUnidadeRequest(BaseModel):
    """Schema para validação de unidade"""
    tenant_id: str
    torre: Optional[str] = None
    bloco: Optional[str] = None
    quadra: Optional[str] = None
    numero: str

class ValidarUnidadeResponse(BaseModel):
    """Schema para resposta de validação de unidade"""
    valido: bool
    unidade_id: Optional[str] = None
    endereco_completo: Optional[str] = None
    mensagem: Optional[str] = None
    pode_cadastrar: bool = False
    vagas_disponiveis: int = 0


# ══════════════════════════════════════════════════════════════
# ENDPOINTS PÚBLICOS
# ══════════════════════════════════════════════════════════════

@router.get("/condominios", response_model=List[TenantPublicSchema])
async def listar_condominios_publico(
    db: Session = Depends(get_db),
    busca: Optional[str] = Query(None, description="Buscar por nome ou endereço"),
    cidade: Optional[str] = Query(None, description="Filtrar por cidade"),
    estado: Optional[str] = Query(None, description="Filtrar por estado (UF)"),
    limit: int = Query(50, ge=1, le=100, description="Limite de resultados")
):
    """
    Lista condomínios disponíveis para cadastro.

    Endpoint PÚBLICO - não requer autenticação.
    Retorna apenas dados públicos necessários para o formulário de cadastro.

    Filtros:
    - busca: Busca por nome ou endereço
    - cidade: Cidade específica
    - estado: UF (ex: AM, SP)

    IMPORTANTE:
    - Retorna apenas condomínios ativos e não expirados
    - Só mostra condomínios que permitem cadastro autônomo
    - Nunca expõe dados sensíveis
    """

    try:
        # Query base: apenas condomínios ativos e válidos
        query = db.query(Tenant).filter(
            Tenant.ativo == True,
            or_(
                Tenant.data_expiracao.is_(None),
                Tenant.data_expiracao >= date.today()
            )
        )

        # Aplicar filtros
        if busca:
            busca_term = f"%{busca.strip()}%"
            query = query.filter(
                or_(
                    func.lower(Tenant.nome).like(func.lower(busca_term)),
                    func.lower(Tenant.endereco).like(func.lower(busca_term)),
                    func.lower(Tenant.bairro).like(func.lower(busca_term))
                )
            )

        if cidade:
            query = query.filter(
                func.lower(Tenant.cidade).like(func.lower(f"%{cidade.strip()}%"))
            )

        if estado:
            query = query.filter(
                func.upper(Tenant.estado) == estado.upper()
            )

        # Buscar condomínios
        condominios = query.order_by(Tenant.nome).limit(limit).all()

        # Filtrar apenas os que permitem cadastro autônomo
        resultado = []
        for c in condominios:
            if c.permite_cadastro_publico():
                config_seg = c.config_seguranca or {}

                tenant_public = {
                    "id": c.id,
                    "nome": c.nome,
                    "endereco": c.endereco,
                    "bairro": c.bairro,
                    "cidade": c.cidade,
                    "estado": c.estado,
                    "logo_url": c.logo_url,
                    "tipo_estrutura": c.tipo_estrutura,
                    "nomenclatura": {
                        "unidade": c.get_nomenclatura_unidade(),
                        "agrupador1": c.get_nomenclatura_agrupador1() if c.agrupadores else None
                    },
                    "agrupadores": [
                        {
                            "tipo": ag.get("tipo"),
                            "nome": ag.get("nome"),
                            "parent": ag.get("parent")
                        }
                        for ag in (c.agrupadores or [])
                    ],
                    "exige_aprovacao": config_seg.get("exige_aprovacao_cadastro", True),
                    "aprovador": config_seg.get("aprovador", "sindico"),
                    "permite_cadastro_autonomo": config_seg.get("permite_cadastro_autonomo", True)
                }

                resultado.append(TenantPublicSchema(**tenant_public))

        logger.info(
            "public_condominios_listed",
            total_found=len(resultado),
            filters_applied={
                "busca": busca,
                "cidade": cidade,
                "estado": estado
            }
        )

        return resultado

    except Exception as e:
        logger.error(
            "erro_listar_condominios_publico",
            error=str(e),
            filters={
                "busca": busca,
                "cidade": cidade,
                "estado": estado
            }
        )
        raise HTTPException(500, "Erro interno ao buscar condomínios")


@router.post("/validar-unidade", response_model=ValidarUnidadeResponse)
async def validar_unidade(
    dados: ValidarUnidadeRequest,
    db: Session = Depends(get_db)
):
    """
    Valida se uma unidade existe e está disponível para cadastro.

    Usado no formulário de registro antes de enviar dados completos.

    Verificações:
    1. Se a unidade existe no condomínio
    2. Se o condomínio permite cadastro
    3. Se há vagas disponíveis na unidade
    4. Se o morador pode se cadastrar

    Retorna informações para o frontend sobre disponibilidade.
    """

    try:
        # 1. Verificar se o condomínio existe e está ativo
        tenant = db.query(Tenant).filter(
            Tenant.id == dados.tenant_id,
            Tenant.ativo == True
        ).first()

        if not tenant:
            return ValidarUnidadeResponse(
                valido=False,
                mensagem="Condomínio não encontrado ou inativo.",
                pode_cadastrar=False,
                vagas_disponiveis=0
            )

        # 2. Verificar se permite cadastro autônomo
        if not tenant.permite_cadastro_publico():
            return ValidarUnidadeResponse(
                valido=False,
                mensagem="Este condomínio não permite cadastro direto. Entre em contato com a administração.",
                pode_cadastrar=False,
                vagas_disponiveis=0
            )

        # 3. Buscar a unidade
        unidade = Unit.buscar_por_endereco(
            db=db,
            tenant_id=dados.tenant_id,
            torre=dados.torre,
            bloco=dados.bloco,
            numero=dados.numero
        )

        if not unidade:
            return ValidarUnidadeResponse(
                valido=False,
                mensagem=f"Unidade não encontrada. Verifique os dados: {dados.numero}" +
                        (f", {dados.bloco}" if dados.bloco else "") +
                        (f", {dados.torre}" if dados.torre else ""),
                pode_cadastrar=False,
                vagas_disponiveis=0
            )

        # 4. Verificar se há vagas disponíveis
        max_usuarios = tenant.config_seguranca.get("max_usuarios_por_unidade", 5)
        moradores_ativos = len(unidade.get_moradores_ativos())
        vagas_disponiveis = max_usuarios - moradores_ativos

        if vagas_disponiveis <= 0:
            return ValidarUnidadeResponse(
                valido=True,  # Unidade existe
                unidade_id=unidade.id,
                endereco_completo=unidade.endereco_completo,
                mensagem=f"Unidade já possui {moradores_ativos} moradores cadastrados (limite: {max_usuarios}). "
                         "Entre em contato com os moradores existentes ou com a administração.",
                pode_cadastrar=False,
                vagas_disponiveis=0
            )

        # 5. Sucesso - pode cadastrar
        logger.info(
            "unidade_validada_sucesso",
            tenant_id=dados.tenant_id,
            unidade_id=unidade.id,
            endereco=unidade.endereco_completo,
            vagas_disponiveis=vagas_disponiveis
        )

        return ValidarUnidadeResponse(
            valido=True,
            unidade_id=unidade.id,
            endereco_completo=unidade.endereco_completo,
            mensagem="Unidade disponível para cadastro!",
            pode_cadastrar=True,
            vagas_disponiveis=vagas_disponiveis
        )

    except Exception as e:
        logger.error(
            "erro_validar_unidade",
            error=str(e),
            tenant_id=dados.tenant_id,
            dados_unidade=dados.dict()
        )
        raise HTTPException(500, "Erro interno ao validar unidade")


@router.get("/condominio/{tenant_id}/estrutura")
async def obter_estrutura_condominio(
    tenant_id: str,
    db: Session = Depends(get_db)
):
    """
    Obtém estrutura completa do condomínio para montagem de formulários.

    Retorna:
    - Tipo de estrutura (casas, apartamentos, blocos, torres)
    - Lista de agrupadores disponíveis
    - Nomenclatura personalizada
    - Configurações de cadastro

    Usado pelo App Simples para construir o formulário de endereço dinamicamente.
    """

    try:
        tenant = db.query(Tenant).filter(
            Tenant.id == tenant_id,
            Tenant.ativo == True
        ).first()

        if not tenant or not tenant.permite_cadastro_publico():
            raise HTTPException(404, "Condomínio não encontrado ou não disponível para cadastro")

        # Estrutura básica
        estrutura = {
            "tipo_estrutura": tenant.tipo_estrutura,
            "nomenclatura": {
                "unidade": tenant.get_nomenclatura_unidade(),
                "agrupador1": tenant.get_nomenclatura_agrupador1() if tenant.agrupadores else None
            },
            "agrupadores": tenant.agrupadores or [],
            "requer_campos": []
        }

        # Determinar campos obrigatórios baseado no tipo de estrutura
        if tenant.tipo_estrutura == "casas":
            estrutura["requer_campos"] = ["numero"]
        elif tenant.tipo_estrutura == "apartamentos":
            estrutura["requer_campos"] = ["numero"]
        elif tenant.tipo_estrutura == "apartamentos_blocos":
            estrutura["requer_campos"] = ["bloco", "numero"]
        elif tenant.tipo_estrutura == "apartamentos_torres":
            estrutura["requer_campos"] = ["torre", "numero"]
        elif tenant.tipo_estrutura == "apartamentos_torres_blocos":
            estrutura["requer_campos"] = ["torre", "bloco", "numero"]

        # Configurações de cadastro
        config_cadastro = {
            "exige_aprovacao": tenant.config_seguranca.get("exige_aprovacao_cadastro", True),
            "aprovador": tenant.config_seguranca.get("aprovador", "sindico"),
            "max_usuarios_por_unidade": tenant.config_seguranca.get("max_usuarios_por_unidade", 5)
        }

        estrutura["config_cadastro"] = config_cadastro

        return estrutura

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "erro_obter_estrutura",
            tenant_id=tenant_id,
            error=str(e)
        )
        raise HTTPException(500, "Erro interno ao obter estrutura do condomínio")


@router.get("/cidades")
async def listar_cidades_disponiveis(
    db: Session = Depends(get_db),
    estado: Optional[str] = Query(None, description="Filtrar por UF")
):
    """
    Lista cidades que possuem condomínios disponíveis para cadastro.

    Útil para popular dropdown de cidades no formulário de busca.
    """

    try:
        query = db.query(Tenant.cidade, Tenant.estado).filter(
            Tenant.ativo == True,
            or_(
                Tenant.data_expiracao.is_(None),
                Tenant.data_expiracao >= date.today()
            )
        )

        if estado:
            query = query.filter(func.upper(Tenant.estado) == estado.upper())

        cidades = query.distinct().order_by(Tenant.cidade).all()

        resultado = [
            {
                "cidade": cidade,
                "estado": estado_uf,
                "display": f"{cidade} - {estado_uf}"
            }
            for cidade, estado_uf in cidades
            if cidade  # Filtrar cidades nulas
        ]

        return resultado

    except Exception as e:
        logger.error(
            "erro_listar_cidades",
            error=str(e),
            estado=estado
        )
        raise HTTPException(500, "Erro interno ao listar cidades")


@router.get("/estados")
async def listar_estados_disponiveis(db: Session = Depends(get_db)):
    """
    Lista estados (UF) que possuem condomínios disponíveis.
    """

    try:
        estados = db.query(Tenant.estado).filter(
            Tenant.ativo == True,
            or_(
                Tenant.data_expiracao.is_(None),
                Tenant.data_expiracao >= date.today()
            ),
            Tenant.estado.isnot(None)
        ).distinct().order_by(Tenant.estado).all()

        # Mapa de estados para nome completo
        estados_map = {
            "AC": "Acre", "AL": "Alagoas", "AP": "Amapá", "AM": "Amazonas",
            "BA": "Bahia", "CE": "Ceará", "DF": "Distrito Federal", "ES": "Espírito Santo",
            "GO": "Goiás", "MA": "Maranhão", "MT": "Mato Grosso", "MS": "Mato Grosso do Sul",
            "MG": "Minas Gerais", "PA": "Pará", "PB": "Paraíba", "PR": "Paraná",
            "PE": "Pernambuco", "PI": "Piauí", "RJ": "Rio de Janeiro", "RN": "Rio Grande do Norte",
            "RS": "Rio Grande do Sul", "RO": "Rondônia", "RR": "Roraima", "SC": "Santa Catarina",
            "SP": "São Paulo", "SE": "Sergipe", "TO": "Tocantins"
        }

        resultado = [
            {
                "uf": estado[0],
                "nome": estados_map.get(estado[0], estado[0]),
                "display": f"{estados_map.get(estado[0], estado[0])} ({estado[0]})"
            }
            for estado in estados
            if estado[0]
        ]

        return resultado

    except Exception as e:
        logger.error(
            "erro_listar_estados",
            error=str(e)
        )
        raise HTTPException(500, "Erro interno ao listar estados")