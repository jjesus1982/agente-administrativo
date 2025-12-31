"""
Serviço de Gestão de Condomínios (Tenants)
Lógica de negócio para criação, atualização e gestão
"""

import uuid
from datetime import datetime, date
from typing import List, Optional, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from conecta_plus.models.tenant import Tenant
from conecta_plus.models.unit import Unit
from conecta_plus.models.user import User
from conecta_plus.schemas.tenant_schemas import TenantCreateSchema, TenantUpdateSchema
from conecta_plus.core.logger import get_logger
from conecta_plus.core.exceptions import ValidationError, NotFoundError

logger = get_logger(__name__)


class TenantService:
    """
    Serviço para gestão completa de condomínios.

    Responsabilidades:
    1. Criação e validação de novos condomínios
    2. Geração automática de unidades
    3. Configuração de estruturas dinâmicas
    4. Validação de consistência de dados
    5. Estatísticas e relatórios
    """

    async def criar_tenant(
        self,
        db: Session,
        tenant_data: TenantCreateSchema,
        created_by: str
    ) -> Tenant:
        """
        Cria um novo condomínio no sistema.

        Processo:
        1. Valida dados de entrada
        2. Cria registro do tenant
        3. Gera unidades automaticamente (se configurado)
        4. Configura permissões padrão
        """

        # 1. Criar tenant
        tenant_dict = tenant_data.dict()
        tenant_dict.update({
            "id": str(uuid.uuid4()),
            "created_by": created_by,
            "created_at": datetime.utcnow()
        })

        novo_tenant = Tenant(**tenant_dict)
        db.add(novo_tenant)
        db.flush()  # Para obter o ID

        # 2. Log da criação
        logger.info(
            "tenant_creation_started",
            tenant_id=novo_tenant.id,
            tenant_nome=novo_tenant.nome,
            tipo_estrutura=novo_tenant.tipo_estrutura,
            created_by=created_by
        )

        # 3. Gerar unidades se especificado nos agrupadores
        if tenant_data.agrupadores:
            await self._gerar_unidades_automaticamente(db, novo_tenant, tenant_data)

        db.commit()
        db.refresh(novo_tenant)

        logger.info(
            "tenant_created_successfully",
            tenant_id=novo_tenant.id,
            tenant_nome=novo_tenant.nome,
            total_agrupadores=len(tenant_data.agrupadores)
        )

        return novo_tenant

    async def _gerar_unidades_automaticamente(
        self,
        db: Session,
        tenant: Tenant,
        tenant_data: TenantCreateSchema
    ):
        """
        Gera unidades automaticamente baseado na estrutura do condomínio.

        Nota: Por segurança, não gera automaticamente.
        Em produção, isso deve ser configurado manualmente ou via wizard.
        """

        # Por enquanto, apenas log que o processo foi chamado
        # Em produção, implementar wizard de geração de unidades
        logger.info(
            "unit_generation_skipped",
            tenant_id=tenant.id,
            reason="auto_generation_disabled",
            agrupadores_count=len(tenant_data.agrupadores)
        )

        # TODO: Implementar wizard de geração automática de unidades
        # Deve considerar:
        # - Numeração sequencial vs personalizada
        # - Unidades especiais (cobertura, térreo)
        # - Validação de nomenclatura
        # - Prevenção de duplicatas

    async def obter_estatisticas(self, db: Session, tenant_id: str) -> Dict[str, Any]:
        """
        Obtém estatísticas completas do condomínio.
        """

        try:
            # Buscar tenant
            tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not tenant:
                raise NotFoundError(f"Condomínio {tenant_id} não encontrado")

            # Contar unidades
            total_unidades = db.query(Unit).filter(
                Unit.tenant_id == tenant_id
            ).count()

            unidades_ocupadas = db.query(Unit).join(User).filter(
                and_(
                    Unit.tenant_id == tenant_id,
                    User.ativo == True,
                    User.role.in_([1, 2, 3])  # moradores, síndicos, porteiros
                )
            ).distinct().count()

            # Contar usuários por role
            usuarios_por_role = db.query(
                User.role,
                func.count(User.id)
            ).filter(
                and_(
                    User.tenant_id == tenant_id,
                    User.ativo == True
                )
            ).group_by(User.role).all()

            role_names = {
                1: "moradores",
                2: "sindicos",
                3: "porteiros",
                4: "admins"
            }

            usuarios_counts = {
                role_names.get(role, f"role_{role}"): count
                for role, count in usuarios_por_role
            }

            # Calcular estatísticas de uso
            taxa_ocupacao = (unidades_ocupadas / total_unidades * 100) if total_unidades > 0 else 0

            # Análise de funcionalidades ativas
            funcionalidades = tenant.funcionalidades or {}
            func_ativas = sum(1 for v in funcionalidades.values() if v is True)
            func_total = len(funcionalidades)

            # Análise de áreas comuns
            areas_comuns = tenant.areas_comuns or []
            areas_ativas = sum(1 for area in areas_comuns if area.get("ativo", True))

            stats = {
                # Dados básicos
                "tenant_id": tenant_id,
                "nome": tenant.nome,
                "tipo_estrutura": tenant.tipo_estrutura,
                "ativo": tenant.ativo,
                "plano": tenant.plano,

                # Unidades
                "total_unidades": total_unidades,
                "unidades_ocupadas": unidades_ocupadas,
                "unidades_vazias": total_unidades - unidades_ocupadas,
                "taxa_ocupacao_pct": round(taxa_ocupacao, 1),

                # Usuários
                "total_usuarios": sum(usuarios_counts.values()),
                "usuarios_por_role": usuarios_counts,

                # Configurações
                "total_agrupadores": len(tenant.agrupadores or []),
                "funcionalidades_ativas": func_ativas,
                "funcionalidades_total": func_total,
                "areas_comuns_ativas": areas_ativas,
                "areas_comuns_total": len(areas_comuns),

                # Metadados
                "created_at": tenant.created_at.isoformat() if tenant.created_at else None,
                "dias_ativo": (datetime.now() - tenant.created_at).days if tenant.created_at else 0
            }

            logger.info(
                "statistics_generated",
                tenant_id=tenant_id,
                total_unidades=total_unidades,
                total_usuarios=stats["total_usuarios"],
                taxa_ocupacao=taxa_ocupacao
            )

            return stats

        except Exception as e:
            logger.error(
                "error_generating_statistics",
                tenant_id=tenant_id,
                error=str(e),
                error_type=type(e).__name__
            )
            raise

    async def gerar_preview_app(self, tenant: Tenant) -> Dict[str, Any]:
        """
        Gera preview de como o condomínio aparecerá no App Simples.

        Usado para validar configurações antes de publicar.
        """

        try:
            # Configurações visuais
            visual_config = {
                "logo_url": tenant.logo_url,
                "nome_exibicao": tenant.nome,
                "endereco_principal": f"{tenant.endereco}, {tenant.bairro}" if tenant.endereco else None,
                "cidade_estado": f"{tenant.cidade} - {tenant.estado}",

                # Tema baseado no plano
                "tema": {
                    "basico": {"primary": "#3B82F6", "accent": "#10B981"},
                    "profissional": {"primary": "#8B5CF6", "accent": "#F59E0B"},
                    "enterprise": {"primary": "#1F2937", "accent": "#EF4444"}
                }.get(tenant.plano, {"primary": "#6B7280", "accent": "#9CA3AF"})
            }

            # Estrutura de endereços
            estrutura_endereco = {
                "tipo": tenant.tipo_estrutura,
                "nomenclatura": tenant.get_nomenclatura_dict(),
                "agrupadores": tenant.agrupadores or [],
                "exemplo_endereco": self._gerar_exemplo_endereco(tenant)
            }

            # Funcionalidades disponíveis
            funcionalidades = tenant.funcionalidades or {}
            funcionalidades_preview = [
                {
                    "id": key,
                    "nome": self._get_funcionalidade_nome(key),
                    "ativo": value,
                    "icone": self._get_funcionalidade_icone(key),
                    "descricao": self._get_funcionalidade_descricao(key)
                }
                for key, value in funcionalidades.items()
                if value is True
            ]

            # Áreas comuns
            areas_preview = []
            for area in (tenant.areas_comuns or []):
                if area.get("ativo", True):
                    areas_preview.append({
                        "nome": area.get("nome"),
                        "icone": area.get("icone", "building"),
                        "horario": f"{area.get('horario_inicio', '00:00')} - {area.get('horario_fim', '23:59')}",
                        "capacidade": area.get("capacidade"),
                        "taxa": area.get("valor_taxa"),
                        "requer_aprovacao": area.get("requer_aprovacao", False)
                    })

            # Configurações de segurança (visíveis para o usuário)
            config_seguranca = tenant.config_seguranca or {}
            seguranca_preview = {
                "cadastro_autonomo": config_seguranca.get("permite_cadastro_autonomo", True),
                "aprovacao_necessaria": config_seguranca.get("exige_aprovacao_cadastro", True),
                "aprovador": config_seguranca.get("aprovador", "sindico"),
                "max_usuarios_unidade": config_seguranca.get("max_usuarios_por_unidade", 5)
            }

            preview = {
                "visual": visual_config,
                "estrutura": estrutura_endereco,
                "funcionalidades": funcionalidades_preview,
                "areas_comuns": areas_preview,
                "configuracoes": seguranca_preview,
                "metadados": {
                    "generated_at": datetime.utcnow().isoformat(),
                    "plano": tenant.plano,
                    "ativo": tenant.ativo
                }
            }

            logger.info(
                "preview_generated",
                tenant_id=tenant.id,
                total_funcionalidades=len(funcionalidades_preview),
                total_areas=len(areas_preview)
            )

            return preview

        except Exception as e:
            logger.error(
                "error_generating_preview",
                tenant_id=tenant.id,
                error=str(e)
            )
            raise

    def _gerar_exemplo_endereco(self, tenant: Tenant) -> str:
        """Gera exemplo de endereço baseado na estrutura"""

        nomenclatura = tenant.get_nomenclatura_dict()
        agrupadores = tenant.agrupadores or []

        if tenant.tipo_estrutura == "casas":
            return f"{nomenclatura.get('unidade', 'Casa')} 15"

        elif tenant.tipo_estrutura == "apartamentos":
            return f"{nomenclatura.get('unidade', 'Apartamento')} 201"

        elif tenant.tipo_estrutura in ["apartamentos_blocos", "apartamentos_torres"]:
            if agrupadores:
                agrupador = agrupadores[0]
                agrup_nome = nomenclatura.get('agrupador1', agrupador.get('tipo', 'Bloco').title())
                return f"{agrup_nome} A, {nomenclatura.get('unidade', 'Apartamento')} 101"

        elif tenant.tipo_estrutura == "apartamentos_torres_blocos":
            return f"Torre 1, Bloco A, {nomenclatura.get('unidade', 'Apartamento')} 501"

        return f"{nomenclatura.get('unidade', 'Unidade')} 1"

    def _get_funcionalidade_nome(self, key: str) -> str:
        """Mapeia IDs de funcionalidades para nomes amigáveis"""
        nomes = {
            "convites": "Convites de Visitantes",
            "entregas": "Controle de Entregas",
            "reservas": "Reserva de Áreas",
            "pets": "Cadastro de Pets",
            "veiculos": "Controle de Veículos",
            "ocorrencias": "Ocorrências",
            "comunicados": "Comunicados",
            "ligacoes": "Ligações Portaria",
            "classificados": "Classificados",
            "enquetes": "Enquetes",
            "financeiro": "Gestão Financeira",
            "portaria_remota": "Portaria Remota",
            "reconhecimento_facial": "Reconhecimento Facial",
            "qr_code": "QR Code"
        }
        return nomes.get(key, key.replace("_", " ").title())

    def _get_funcionalidade_icone(self, key: str) -> str:
        """Mapeia funcionalidades para ícones Lucide React"""
        icones = {
            "convites": "user-plus",
            "entregas": "package",
            "reservas": "calendar",
            "pets": "heart",
            "veiculos": "car",
            "ocorrencias": "alert-triangle",
            "comunicados": "megaphone",
            "ligacoes": "phone",
            "classificados": "shopping-cart",
            "enquetes": "bar-chart",
            "financeiro": "dollar-sign",
            "portaria_remota": "shield",
            "reconhecimento_facial": "eye",
            "qr_code": "qr-code"
        }
        return icones.get(key, "settings")

    def _get_funcionalidade_descricao(self, key: str) -> str:
        """Descrições das funcionalidades"""
        descricoes = {
            "convites": "Geração de QR codes para visitantes",
            "entregas": "Notificação e controle de encomendas",
            "reservas": "Agendamento de áreas comuns",
            "pets": "Registro de pets do condomínio",
            "veiculos": "Controle de veículos e vagas",
            "ocorrencias": "Reporte de problemas e manutenção",
            "comunicados": "Avisos da administração",
            "ligacoes": "Comunicação direta com portaria",
            "classificados": "Compra e venda entre moradores",
            "enquetes": "Votação e pesquisas",
            "financeiro": "Boletos e extratos",
            "portaria_remota": "Abertura remota de portões",
            "reconhecimento_facial": "Acesso por biometria facial",
            "qr_code": "Códigos QR para acesso rápido"
        }
        return descricoes.get(key, "Funcionalidade do condomínio")

    async def enviar_email_boas_vindas(self, tenant: Tenant, admin_email: str):
        """
        Envia email de boas-vindas após criação do condomínio.

        TODO: Implementar integração com serviço de email (SendGrid, SES, etc)
        """

        logger.info(
            "welcome_email_queued",
            tenant_id=tenant.id,
            tenant_nome=tenant.nome,
            tenant_email=tenant.email,
            admin_email=admin_email
        )

        # TODO: Implementar envio real de email
        # - Template personalizado
        # - Dados de acesso inicial
        # - Link para configuração
        # - Guia de primeiros passos

        # Por enquanto, apenas log
        email_data = {
            "to": tenant.email,
            "subject": f"Bem-vindo ao Conecta Plus - {tenant.nome}",
            "template": "welcome_tenant",
            "data": {
                "tenant_nome": tenant.nome,
                "admin_email": admin_email,
                "login_url": "https://app.conectaplus.com/login",
                "support_email": "suporte@conectaplus.com"
            }
        }

        logger.info("email_template_prepared", **email_data)