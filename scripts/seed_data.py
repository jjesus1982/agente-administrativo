"""
Script para popular dados iniciais no banco
Conecta Plus - MVP Completo
"""
import asyncio
import uuid
from datetime import datetime, date, time, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config import settings
from app.database import Base
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User
from app.models.unit import Unit
from app.models.visitor import Visitor
from app.models.vehicle import Vehicle, ParkingSpot
from app.models.portaria import (
    GrupoAcesso,
    PontoAcesso,
    GrupoAcessoPonto,
    PreAutorizacao,
    TipoOcorrencia,
    IntegracaoHardware,
    VagaGaragem,
    Visita,
)

# Importa todos os models
from app.models import *


async def seed_data():
    """Popula dados iniciais completos para MVP"""

    engine = create_async_engine(settings.DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        # Cria tabelas
        await conn.run_sync(Base.metadata.create_all)

    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # Verifica se já existe tenant
        result = await db.execute(select(Tenant).limit(1))
        existing_tenant = result.scalar_one_or_none()
        if existing_tenant:
            print("⚠️  Dados já existem. Pulando seed básico.")
            print(f"   Tenant existente: {existing_tenant.name} (ID: {existing_tenant.id})")
            tenant_id = existing_tenant.id

            # Busca usuários existentes para referência
            result = await db.execute(select(User).where(User.tenant_id == tenant_id).limit(10))
            users = result.scalars().all()
            user_map = {u.email: u for u in users}

            porteiro = user_map.get("porteiro@conectaplus.com.br") or users[0] if users else None
            sindico = user_map.get("sindico@conectaplus.com.br") or users[0] if users else None

            # Busca unidades
            result = await db.execute(select(Unit).where(Unit.tenant_id == tenant_id).limit(10))
            units = result.scalars().all()

            # Busca moradores
            result = await db.execute(
                select(User).where(User.tenant_id == tenant_id, User.role == 1).limit(10)
            )
            moradores = result.scalars().all()
        else:
            # ============================================================
            # CRIAÇÃO DO TENANT (CONDOMÍNIO)
            # ============================================================
            tenant = Tenant(
                name="Condomínio Conecta Plus",
                cnpj="12.345.678/0001-90",
                address="Rua das Flores, 123",
                city="Manaus",
                state="AM",
                phone="(92) 99999-9999",
                email="contato@conectaplus.com.br",
                is_active=True,
                settings={
                    "timezone": "America/Manaus",
                    "features": {
                        "facial_recognition": True,
                        "airbnb_mode": True,
                        "qr_code_access": True,
                        "vehicle_control": True
                    }
                }
            )
            db.add(tenant)
            await db.flush()
            tenant_id = tenant.id
            print(f"✅ Tenant criado: {tenant.name} (ID: {tenant.id})")

            # ============================================================
            # CRIAÇÃO DE USUÁRIOS
            # ============================================================

            # Super Admin
            super_admin = User(
                tenant_id=tenant_id,
                name="Super Admin",
                email="admin@conectaplus.com.br",
                password_hash=get_password_hash("Admin@123"),
                role=5,
                is_active=True,
                is_verified=True
            )
            db.add(super_admin)

            # Síndico
            sindico = User(
                tenant_id=tenant_id,
                name="João Silva (Síndico)",
                email="sindico@conectaplus.com.br",
                password_hash=get_password_hash("Sindico@123"),
                cpf="123.456.789-00",
                phone="(92) 98888-8888",
                role=2,
                is_active=True,
                is_verified=True
            )
            db.add(sindico)

            # Porteiro 1
            porteiro = User(
                tenant_id=tenant_id,
                name="Carlos Porteiro",
                email="porteiro@conectaplus.com.br",
                password_hash=get_password_hash("Porteiro@123"),
                cpf="987.654.321-00",
                phone="(92) 97777-7777",
                role=3,
                is_active=True,
                is_verified=True
            )
            db.add(porteiro)

            # Porteiro 2
            porteiro2 = User(
                tenant_id=tenant_id,
                name="Roberto Segurança",
                email="porteiro2@conectaplus.com.br",
                password_hash=get_password_hash("Porteiro@123"),
                cpf="456.789.123-00",
                phone="(92) 96666-6666",
                role=3,
                is_active=True,
                is_verified=True
            )
            db.add(porteiro2)

            # Moradores
            moradores_data = [
                {"name": "Maria Santos", "email": "maria@email.com", "cpf": "111.222.333-44", "phone": "(92) 99111-1111"},
                {"name": "Pedro Oliveira", "email": "pedro@email.com", "cpf": "222.333.444-55", "phone": "(92) 99222-2222"},
                {"name": "Ana Costa", "email": "ana@email.com", "cpf": "333.444.555-66", "phone": "(92) 99333-3333"},
                {"name": "Lucas Ferreira", "email": "lucas@email.com", "cpf": "444.555.666-77", "phone": "(92) 99444-4444"},
                {"name": "Carla Mendes", "email": "carla@email.com", "cpf": "555.666.777-88", "phone": "(92) 99555-5555"},
                {"name": "Ricardo Alves", "email": "ricardo@email.com", "cpf": "666.777.888-99", "phone": "(92) 99666-6666"},
                {"name": "Juliana Lima", "email": "juliana@email.com", "cpf": "777.888.999-00", "phone": "(92) 99777-7777"},
                {"name": "Fernando Souza", "email": "fernando@email.com", "cpf": "888.999.000-11", "phone": "(92) 99888-8888"},
            ]

            moradores = []
            for m in moradores_data:
                user = User(
                    tenant_id=tenant_id,
                    name=m["name"],
                    email=m["email"],
                    password_hash=get_password_hash("Morador@123"),
                    cpf=m["cpf"],
                    phone=m["phone"],
                    role=1,
                    is_active=True
                )
                db.add(user)
                moradores.append(user)

            await db.flush()
            print(f"✅ Usuários criados: {len(moradores_data) + 4}")

            # ============================================================
            # CRIAÇÃO DE UNIDADES
            # ============================================================
            units = []
            unit_count = 0
            morador_idx = 0

            for bloco in ["A", "B"]:
                for andar in range(1, 5):
                    for num in range(1, 5):
                        unit = Unit(
                            tenant_id=tenant_id,
                            block=f"Bloco {bloco}",
                            number=f"{andar}0{num}",
                            floor=andar,
                            unit_type="apartment",
                            bedrooms=2,
                            bathrooms=1,
                            parking_spots=1
                        )
                        db.add(unit)
                        units.append(unit)
                        unit_count += 1

            await db.flush()
            print(f"✅ Unidades criadas: {unit_count}")

            # Atualiza moradores com unidades
            for i, morador in enumerate(moradores):
                if i < len(units):
                    morador.unit_id = units[i].id

            await db.flush()

        # ============================================================
        # VAGAS DE ESTACIONAMENTO (ParkingSpot)
        # ============================================================
        result = await db.execute(select(ParkingSpot).where(ParkingSpot.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            parking_spots = []
            spot_count = 0

            for andar in ["SS1", "SS2"]:
                for secao in ["A", "B", "C"]:
                    for num in range(1, 11):
                        spot_type = "regular"
                        if num <= 2:
                            spot_type = "handicapped" if secao == "A" else "elderly"
                        elif num == 10:
                            spot_type = "motorcycle"

                        spot = ParkingSpot(
                            tenant_id=tenant_id,
                            number=f"{andar}-{secao}{num:02d}",
                            floor=andar,
                            section=f"Seção {secao}",
                            spot_type=spot_type,
                            is_available=True,
                            is_active=True,
                            description=f"Vaga {andar}-{secao}{num:02d}"
                        )
                        db.add(spot)
                        parking_spots.append(spot)
                        spot_count += 1

            await db.flush()
            print(f"✅ Vagas de estacionamento criadas: {spot_count}")
        else:
            result = await db.execute(select(ParkingSpot).where(ParkingSpot.tenant_id == tenant_id))
            parking_spots = result.scalars().all()
            print(f"⚠️  Vagas já existem: {len(parking_spots)}")

        # ============================================================
        # VEÍCULOS
        # ============================================================
        result = await db.execute(select(Vehicle).where(Vehicle.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            veiculos_data = [
                {"plate": "ABC-1234", "model": "Honda Civic", "brand": "Honda", "color": "Prata", "type": "car", "tag": "TAG001"},
                {"plate": "XYZ-5678", "model": "Toyota Corolla", "brand": "Toyota", "color": "Preto", "type": "car", "tag": "TAG002"},
                {"plate": "DEF-9012", "model": "CG 160", "brand": "Honda", "color": "Vermelho", "type": "motorcycle", "tag": "TAG003"},
                {"plate": "GHI-3456", "model": "Onix", "brand": "Chevrolet", "color": "Branco", "type": "car", "tag": "TAG004"},
                {"plate": "JKL-7890", "model": "HB20", "brand": "Hyundai", "color": "Azul", "type": "car", "tag": "TAG005"},
                {"plate": "MNO-1234", "model": "Argo", "brand": "Fiat", "color": "Cinza", "type": "car", "tag": "TAG006"},
                {"plate": "PQR-5678", "model": "T-Cross", "brand": "Volkswagen", "color": "Prata", "type": "car", "tag": "TAG007"},
                {"plate": "STU-9012", "model": "PCX 150", "brand": "Honda", "color": "Preto", "type": "motorcycle", "tag": "TAG008"},
            ]

            for i, v in enumerate(veiculos_data):
                if i < len(moradores) and i < len(parking_spots):
                    vehicle = Vehicle(
                        tenant_id=tenant_id,
                        owner_id=moradores[i].id,
                        unit_id=units[i].id if i < len(units) else None,
                        plate=v["plate"],
                        model=v["model"],
                        brand=v["brand"],
                        color=v["color"],
                        vehicle_type=v["type"],
                        tag_number=v["tag"],
                        parking_spot_id=parking_spots[i].id,
                        is_active=True
                    )
                    db.add(vehicle)

            await db.flush()
            print(f"✅ Veículos criados: {len(veiculos_data)}")
        else:
            print("⚠️  Veículos já existem")

        # ============================================================
        # VISITANTES
        # ============================================================
        result = await db.execute(select(Visitor).where(Visitor.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            visitantes_data = [
                {"name": "José Encanador", "type": "provider", "company": "HidroServ", "service": "Encanamento", "doc": "111.111.111-11"},
                {"name": "Maria Diarista", "type": "provider", "company": None, "service": "Limpeza", "doc": "222.222.222-22"},
                {"name": "Entregador iFood", "type": "delivery", "company": "iFood", "service": "Entrega", "doc": None},
                {"name": "Carlos Parente", "type": "relative", "company": None, "service": None, "doc": "333.333.333-33"},
                {"name": "Ana Visitante", "type": "visitor", "company": None, "service": None, "doc": "444.444.444-44"},
                {"name": "Roberto Eletricista", "type": "provider", "company": "ElétricaMax", "service": "Elétrica", "doc": "555.555.555-55"},
                {"name": "Técnico Intelbras", "type": "provider", "company": "Intelbras", "service": "Manutenção", "doc": "666.666.666-66"},
                {"name": "Entregador Amazon", "type": "delivery", "company": "Amazon", "service": "Entrega", "doc": None},
            ]

            for v in visitantes_data:
                visitor = Visitor(
                    tenant_id=tenant_id,
                    name=v["name"],
                    document=v["doc"],
                    visitor_type=v["type"],
                    company=v["company"],
                    service=v["service"],
                    created_by_id=porteiro.id if porteiro else 1
                )
                db.add(visitor)

            await db.flush()
            print(f"✅ Visitantes criados: {len(visitantes_data)}")
        else:
            print("⚠️  Visitantes já existem")

        # ============================================================
        # GRUPOS DE ACESSO
        # ============================================================
        result = await db.execute(select(GrupoAcesso).where(GrupoAcesso.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            grupos_data = [
                {
                    "codigo": "MORADORES_24H",
                    "nome": "Moradores 24 horas",
                    "descricao": "Acesso total para moradores",
                    "permite_morador": True,
                    "permite_visitante": False,
                    "permite_prestador": False,
                    "permite_entregador": False,
                    "is_default": True,
                },
                {
                    "codigo": "VISITANTES_DIURNO",
                    "nome": "Visitantes Diurno",
                    "descricao": "Acesso diurno para visitantes (6h-22h)",
                    "permite_morador": False,
                    "permite_visitante": True,
                    "permite_prestador": True,
                    "permite_entregador": True,
                    "horario_inicio": time(6, 0),
                    "horario_fim": time(22, 0),
                    "dias_semana": [1, 2, 3, 4, 5, 6, 0],  # Todos os dias
                },
                {
                    "codigo": "PRESTADORES_COMERCIAL",
                    "nome": "Prestadores Horário Comercial",
                    "descricao": "Prestadores de serviço em horário comercial",
                    "permite_morador": False,
                    "permite_visitante": False,
                    "permite_prestador": True,
                    "permite_entregador": False,
                    "horario_inicio": time(8, 0),
                    "horario_fim": time(18, 0),
                    "dias_semana": [1, 2, 3, 4, 5],  # Segunda a sexta
                },
                {
                    "codigo": "ENTREGADORES",
                    "nome": "Entregadores",
                    "descricao": "Acesso restrito para entregadores",
                    "permite_morador": False,
                    "permite_visitante": False,
                    "permite_prestador": False,
                    "permite_entregador": True,
                    "horario_inicio": time(7, 0),
                    "horario_fim": time(22, 0),
                },
            ]

            grupos_criados = []
            for g in grupos_data:
                grupo = GrupoAcesso(
                    tenant_id=tenant_id,
                    codigo=g["codigo"],
                    nome=g["nome"],
                    descricao=g.get("descricao"),
                    permite_morador=g.get("permite_morador", True),
                    permite_visitante=g.get("permite_visitante", True),
                    permite_prestador=g.get("permite_prestador", True),
                    permite_entregador=g.get("permite_entregador", True),
                    horario_inicio=g.get("horario_inicio"),
                    horario_fim=g.get("horario_fim"),
                    dias_semana=g.get("dias_semana"),
                    is_default=g.get("is_default", False),
                    is_active=True
                )
                db.add(grupo)
                grupos_criados.append(grupo)

            await db.flush()
            print(f"✅ Grupos de acesso criados: {len(grupos_data)}")
        else:
            result = await db.execute(select(GrupoAcesso).where(GrupoAcesso.tenant_id == tenant_id))
            grupos_criados = result.scalars().all()
            print(f"⚠️  Grupos de acesso já existem: {len(grupos_criados)}")

        # ============================================================
        # PONTOS DE ACESSO
        # ============================================================
        result = await db.execute(select(PontoAcesso).where(PontoAcesso.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            pontos_data = [
                {"codigo": "SOCIAL_PRINCIPAL", "nome": "Entrada Social Principal", "tipo": "porta_social", "ordem": 1},
                {"codigo": "SERVICO", "nome": "Entrada de Serviço", "tipo": "porta_servico", "ordem": 2},
                {"codigo": "GARAGEM_ENT", "nome": "Garagem - Entrada", "tipo": "garagem_entrada", "ordem": 3},
                {"codigo": "GARAGEM_SAI", "nome": "Garagem - Saída", "tipo": "garagem_saida", "ordem": 4},
                {"codigo": "ECLUSA_ENT", "nome": "Eclusa - Porta Externa", "tipo": "eclusa_entrada", "ordem": 5},
                {"codigo": "ECLUSA_SAI", "nome": "Eclusa - Porta Interna", "tipo": "eclusa_saida", "ordem": 6},
                {"codigo": "CATRACA_01", "nome": "Catraca Bloco A", "tipo": "catraca", "ordem": 7},
                {"codigo": "CATRACA_02", "nome": "Catraca Bloco B", "tipo": "catraca", "ordem": 8},
                {"codigo": "PORTAO_PEDESTRE", "nome": "Portão Pedestre", "tipo": "portao_pedestre", "ordem": 9},
            ]

            pontos_criados = []
            for p in pontos_data:
                ponto = PontoAcesso(
                    tenant_id=tenant_id,
                    codigo=p["codigo"],
                    nome=p["nome"],
                    tipo=p["tipo"],
                    ordem=p.get("ordem", 0),
                    status="online",
                    is_active=True,
                    visivel=True
                )
                db.add(ponto)
                pontos_criados.append(ponto)

            await db.flush()

            # Configurar eclusa (par de portas)
            eclusa_ent = next((p for p in pontos_criados if p.codigo == "ECLUSA_ENT"), None)
            eclusa_sai = next((p for p in pontos_criados if p.codigo == "ECLUSA_SAI"), None)
            if eclusa_ent and eclusa_sai:
                eclusa_ent.is_eclusa = True
                eclusa_ent.eclusa_pair_id = eclusa_sai.id
                eclusa_sai.is_eclusa = True
                eclusa_sai.eclusa_pair_id = eclusa_ent.id

            await db.flush()
            print(f"✅ Pontos de acesso criados: {len(pontos_data)}")

            # Vincular grupos aos pontos
            for grupo in grupos_criados:
                for ponto in pontos_criados:
                    relacao = GrupoAcessoPonto(
                        grupo_id=grupo.id,
                        ponto_id=ponto.id,
                        permite_entrada=True,
                        permite_saida=True
                    )
                    db.add(relacao)

            await db.flush()
            print(f"✅ Grupos vinculados aos pontos de acesso")
        else:
            result = await db.execute(select(PontoAcesso).where(PontoAcesso.tenant_id == tenant_id))
            pontos_criados = result.scalars().all()
            print(f"⚠️  Pontos de acesso já existem: {len(pontos_criados)}")

        # ============================================================
        # TIPOS DE OCORRÊNCIA
        # ============================================================
        result = await db.execute(select(TipoOcorrencia).where(TipoOcorrencia.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            tipos_ocorrencia = [
                {"codigo": "VISITA_NEGADA", "nome": "Visita Negada", "icone": "UserX", "cor": "#ef4444", "severidade": "media"},
                {"codigo": "VEICULO_NAO_AUTORIZADO", "nome": "Veículo Não Autorizado", "icone": "CarOff", "cor": "#f59e0b", "severidade": "alta"},
                {"codigo": "TENTATIVA_INVASAO", "nome": "Tentativa de Invasão", "icone": "ShieldAlert", "cor": "#dc2626", "severidade": "critica"},
                {"codigo": "EQUIPAMENTO_DANIFICADO", "nome": "Equipamento Danificado", "icone": "AlertTriangle", "cor": "#f97316", "severidade": "alta"},
                {"codigo": "BARULHO_EXCESSIVO", "nome": "Barulho Excessivo", "icone": "Volume2", "cor": "#8b5cf6", "severidade": "baixa"},
                {"codigo": "OBJETO_PERDIDO", "nome": "Objeto Perdido/Achado", "icone": "Search", "cor": "#3b82f6", "severidade": "baixa"},
                {"codigo": "ACIDENTE", "nome": "Acidente", "icone": "AlertOctagon", "cor": "#dc2626", "severidade": "critica"},
                {"codigo": "OUTROS", "nome": "Outros", "icone": "FileText", "cor": "#6b7280", "severidade": "baixa"},
            ]

            for i, t in enumerate(tipos_ocorrencia):
                tipo = TipoOcorrencia(
                    tenant_id=tenant_id,
                    codigo=t["codigo"],
                    nome=t["nome"],
                    icone=t["icone"],
                    cor=t["cor"],
                    severidade_padrao=t["severidade"],
                    ordem=i,
                    is_active=True
                )
                db.add(tipo)

            await db.flush()
            print(f"✅ Tipos de ocorrência criados: {len(tipos_ocorrencia)}")
        else:
            print("⚠️  Tipos de ocorrência já existem")

        # ============================================================
        # INTEGRAÇÕES DE HARDWARE
        # ============================================================
        result = await db.execute(select(IntegracaoHardware).where(IntegracaoHardware.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            integracoes = [
                {
                    "parceiro": "intelbras",
                    "nome_exibicao": "Intelbras - Controle de Acesso",
                    "config": {
                        "base_url": "http://192.168.1.100",
                        "api_key": "demo_key",
                        "port": 8080
                    },
                    "status": "ativo"
                },
                {
                    "parceiro": "hikvision",
                    "nome_exibicao": "Hikvision - Câmeras e NVR",
                    "config": {
                        "base_url": "http://192.168.1.101",
                        "username": "admin",
                        "port": 80
                    },
                    "status": "ativo"
                },
                {
                    "parceiro": "controlid",
                    "nome_exibicao": "Control iD - Facial",
                    "config": {
                        "base_url": "http://192.168.1.102",
                        "api_key": "demo_key"
                    },
                    "status": "inativo"
                },
            ]

            for integ in integracoes:
                hardware = IntegracaoHardware(
                    tenant_id=tenant_id,
                    parceiro=integ["parceiro"],
                    nome_exibicao=integ["nome_exibicao"],
                    config=integ["config"],
                    status=integ["status"],
                    sync_moradores=True,
                    sync_visitantes=True,
                    sync_acessos=True,
                    is_active=True
                )
                db.add(hardware)

            await db.flush()
            print(f"✅ Integrações de hardware criadas: {len(integracoes)}")
        else:
            print("⚠️  Integrações já existem")

        # ============================================================
        # VAGAS GARAGEM (VISUAL)
        # ============================================================
        result = await db.execute(select(VagaGaragem).where(VagaGaragem.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            vagas_visuais = []
            x_base = 50
            y_base = 50

            for andar in ["SS1", "SS2"]:
                for row in range(3):  # 3 fileiras
                    for col in range(10):  # 10 vagas por fileira
                        numero = f"{andar}-{chr(65+row)}{col+1:02d}"

                        vaga = VagaGaragem(
                            tenant_id=tenant_id,
                            numero=numero,
                            bloco="Principal",
                            andar=andar,
                            tipo="fixa" if col < 8 else "visitante",
                            posicao_x=x_base + (col * 60),
                            posicao_y=y_base + (row * 110),
                            largura=50,
                            altura=100,
                            rotacao=0,
                            mapa_id=andar,
                            status="livre" if (row + col) % 3 != 0 else "ocupada",
                            is_active=True
                        )
                        db.add(vaga)
                        vagas_visuais.append(vaga)

            await db.flush()
            print(f"✅ Vagas visuais criadas: {len(vagas_visuais)}")
        else:
            print("⚠️  Vagas visuais já existem")

        # ============================================================
        # PRÉ-AUTORIZAÇÕES DE EXEMPLO
        # ============================================================
        result = await db.execute(select(PreAutorizacao).where(PreAutorizacao.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none() and len(units) > 0 and len(moradores) > 0:
            hoje = date.today()

            pre_autorizacoes = [
                {
                    "visitante_nome": "Carlos Técnico",
                    "visitante_documento": "123.456.789-00",
                    "visitante_telefone": "(92) 99999-0001",
                    "visitante_tipo": "prestador",
                    "data_inicio": hoje,
                    "data_fim": hoje + timedelta(days=7),
                    "horario_inicio": time(8, 0),
                    "horario_fim": time(18, 0),
                    "tipo": "recorrente",
                    "is_single_use": False,
                    "max_usos": 5,
                    "status": "ativa",
                },
                {
                    "visitante_nome": "Ana Visitante",
                    "visitante_documento": "987.654.321-00",
                    "visitante_telefone": "(92) 99999-0002",
                    "visitante_tipo": "visitante",
                    "data_inicio": hoje,
                    "data_fim": hoje,
                    "tipo": "unica",
                    "is_single_use": True,
                    "max_usos": 1,
                    "status": "ativa",
                },
                {
                    "visitante_nome": "Entregador Mercado Livre",
                    "visitante_tipo": "entregador",
                    "data_inicio": hoje,
                    "data_fim": hoje,
                    "tipo": "unica",
                    "is_single_use": True,
                    "max_usos": 1,
                    "status": "pendente",
                },
            ]

            for i, pa in enumerate(pre_autorizacoes):
                unit_idx = i % len(units)
                morador_idx = i % len(moradores)

                pre_auth = PreAutorizacao(
                    tenant_id=tenant_id,
                    unit_id=units[unit_idx].id,
                    morador_id=moradores[morador_idx].id,
                    visitante_nome=pa["visitante_nome"],
                    visitante_documento=pa.get("visitante_documento"),
                    visitante_telefone=pa.get("visitante_telefone"),
                    visitante_tipo=pa.get("visitante_tipo", "visitante"),
                    data_inicio=pa["data_inicio"],
                    data_fim=pa["data_fim"],
                    horario_inicio=pa.get("horario_inicio"),
                    horario_fim=pa.get("horario_fim"),
                    tipo=pa.get("tipo", "unica"),
                    is_single_use=pa.get("is_single_use", True),
                    max_usos=pa.get("max_usos", 1),
                    qr_code=f"QR{uuid.uuid4().hex[:16].upper()}",
                    status=pa.get("status", "ativa"),
                    grupo_acesso_id=grupos_criados[1].id if len(grupos_criados) > 1 else None
                )
                db.add(pre_auth)

            await db.flush()
            print(f"✅ Pré-autorizações criadas: {len(pre_autorizacoes)}")
        else:
            print("⚠️  Pré-autorizações já existem ou dados insuficientes")

        # ============================================================
        # VISITAS DE EXEMPLO
        # ============================================================
        result = await db.execute(select(Visita).where(Visita.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none() and len(units) > 0:
            agora = datetime.now()

            visitas_data = [
                {
                    "visitante_nome": "José Encanador",
                    "visitante_documento": "111.111.111-11",
                    "tipo": "prestacao_servico",
                    "status": "em_andamento",
                    "data_entrada": agora - timedelta(hours=2),
                    "autorizado_por": "Maria Santos",
                    "metodo_autorizacao": "interfone",
                },
                {
                    "visitante_nome": "Entregador iFood",
                    "tipo": "entrega",
                    "status": "finalizada",
                    "data_entrada": agora - timedelta(hours=1),
                    "data_saida": agora - timedelta(minutes=50),
                    "autorizado_por": "Porteiro Carlos",
                    "metodo_autorizacao": "porteiro",
                },
                {
                    "visitante_nome": "Carlos Parente",
                    "visitante_documento": "333.333.333-33",
                    "tipo": "visita",
                    "status": "em_andamento",
                    "data_entrada": agora - timedelta(minutes=30),
                    "autorizado_por": "Ana Costa",
                    "metodo_autorizacao": "app",
                },
                {
                    "visitante_nome": "Técnico NET",
                    "visitante_documento": "999.888.777-66",
                    "tipo": "prestacao_servico",
                    "status": "aguardando",
                    "autorizado_por": None,
                    "metodo_autorizacao": None,
                },
            ]

            for i, v in enumerate(visitas_data):
                unit_idx = i % len(units)
                morador_idx = i % len(moradores) if moradores else None

                visita = Visita(
                    tenant_id=tenant_id,
                    visitante_nome=v["visitante_nome"],
                    visitante_documento=v.get("visitante_documento"),
                    unit_id=units[unit_idx].id,
                    morador_id=moradores[morador_idx].id if morador_idx is not None and len(moradores) > morador_idx else None,
                    porteiro_entrada_id=porteiro.id if porteiro else None,
                    tipo=v.get("tipo", "visita"),
                    status=v["status"],
                    data_entrada=v.get("data_entrada"),
                    data_saida=v.get("data_saida"),
                    autorizado_por=v.get("autorizado_por"),
                    metodo_autorizacao=v.get("metodo_autorizacao"),
                    ponto_entrada_id=pontos_criados[0].id if pontos_criados else None,
                )
                db.add(visita)

            await db.flush()
            print(f"✅ Visitas criadas: {len(visitas_data)}")
        else:
            print("⚠️  Visitas já existem ou dados insuficientes")

        # ============================================================
        # COMMIT FINAL
        # ============================================================
        await db.commit()

        print("\n" + "="*60)
        print("🎉 SEED CONCLUÍDO COM SUCESSO!")
        print("="*60)
        print("\n📋 Credenciais de Teste:")
        print("   ┌────────────────────────────────────────────────────────┐")
        print("   │ ADMIN:    admin@conectaplus.com.br    / Admin@123     │")
        print("   │ SÍNDICO:  sindico@conectaplus.com.br  / Sindico@123   │")
        print("   │ PORTEIRO: porteiro@conectaplus.com.br / Porteiro@123  │")
        print("   │ MORADOR:  maria@email.com             / Morador@123   │")
        print("   └────────────────────────────────────────────────────────┘")
        print("\n📊 Dados Criados:")
        print("   • Condomínio: Conecta Plus")
        print("   • Unidades: 32 apartamentos (Blocos A e B)")
        print("   • Vagas: 60 vagas de estacionamento")
        print("   • Pontos de Acesso: 9 pontos configurados")
        print("   • Grupos de Acesso: 4 grupos de permissão")
        print("   • Tipos de Ocorrência: 8 tipos")
        print("   • Integrações: 3 parceiros de hardware")
        print("\n🚀 Sistema pronto para uso!")
        print("="*60)


if __name__ == "__main__":
    asyncio.run(seed_data())
