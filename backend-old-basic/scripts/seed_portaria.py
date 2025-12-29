"""
Script para popular dados do módulo Portaria
"""
import asyncio
import uuid
from datetime import datetime, date, time, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.config import settings
from app.database import Base
from app.models.tenant import Tenant
from app.models.user import User
from app.models.unit import Unit
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


async def seed_portaria():
    """Popula dados do módulo Portaria"""

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as db:
        # Busca tenant existente
        result = await db.execute(select(Tenant).limit(1))
        tenant = result.scalar_one_or_none()
        if not tenant:
            print("❌ Nenhum tenant encontrado. Execute seed_data.py primeiro.")
            return

        tenant_id = tenant.id
        print(f"✅ Usando tenant: {tenant.name} (ID: {tenant_id})")

        # Busca usuários
        result = await db.execute(select(User).where(User.tenant_id == tenant_id, User.role == 3).limit(1))
        porteiro = result.scalar_one_or_none()

        result = await db.execute(select(User).where(User.tenant_id == tenant_id, User.role == 1))
        moradores = result.scalars().all()

        result = await db.execute(select(Unit).where(Unit.tenant_id == tenant_id))
        units = result.scalars().all()

        print(f"   Porteiro: {porteiro.name if porteiro else 'Não encontrado'}")
        print(f"   Moradores: {len(moradores)}")
        print(f"   Unidades: {len(units)}")

        # ============================================================
        # VAGAS DE ESTACIONAMENTO
        # ============================================================
        result = await db.execute(select(ParkingSpot).where(ParkingSpot.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none():
            parking_spots = []
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
                        )
                        db.add(spot)
                        parking_spots.append(spot)

            await db.flush()
            print(f"✅ Vagas de estacionamento criadas: {len(parking_spots)}")
        else:
            result = await db.execute(select(ParkingSpot).where(ParkingSpot.tenant_id == tenant_id))
            parking_spots = result.scalars().all()
            print(f"⚠️  Vagas já existem: {len(parking_spots)}")

        # ============================================================
        # VEÍCULOS
        # ============================================================
        result = await db.execute(select(Vehicle).where(Vehicle.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none() and len(moradores) > 0:
            veiculos_data = [
                {"plate": "ABC-1234", "model": "Honda Civic", "brand": "Honda", "color": "Prata", "type": "car", "tag": "TAG001"},
                {"plate": "XYZ-5678", "model": "Toyota Corolla", "brand": "Toyota", "color": "Preto", "type": "car", "tag": "TAG002"},
                {"plate": "DEF-9012", "model": "CG 160", "brand": "Honda", "color": "Vermelho", "type": "motorcycle", "tag": "TAG003"},
                {"plate": "GHI-3456", "model": "Onix", "brand": "Chevrolet", "color": "Branco", "type": "car", "tag": "TAG004"},
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
            print("⚠️  Veículos já existem ou não há moradores")

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
                    "dias_semana": [1, 2, 3, 4, 5, 6, 0],
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
                    "dias_semana": [1, 2, 3, 4, 5],
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

            # Configurar eclusa
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
            print("✅ Grupos vinculados aos pontos de acesso")
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
                {"parceiro": "intelbras", "nome_exibicao": "Intelbras - Controle de Acesso", "status": "ativo"},
                {"parceiro": "hikvision", "nome_exibicao": "Hikvision - Câmeras e NVR", "status": "ativo"},
                {"parceiro": "controlid", "nome_exibicao": "Control iD - Facial", "status": "inativo"},
            ]

            for integ in integracoes:
                hardware = IntegracaoHardware(
                    tenant_id=tenant_id,
                    parceiro=integ["parceiro"],
                    nome_exibicao=integ["nome_exibicao"],
                    config={"base_url": f"http://192.168.1.{100 + len(integracoes)}", "api_key": "demo"},
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
            count = 0
            for andar in ["SS1", "SS2"]:
                for row in range(3):
                    for col in range(10):
                        numero = f"{andar}-{chr(65+row)}{col+1:02d}"
                        vaga = VagaGaragem(
                            tenant_id=tenant_id,
                            numero=numero,
                            bloco="Principal",
                            andar=andar,
                            tipo="fixa" if col < 8 else "visitante",
                            posicao_x=50 + (col * 60),
                            posicao_y=50 + (row * 110),
                            largura=50,
                            altura=100,
                            rotacao=0,
                            mapa_id=andar,
                            status="livre" if (row + col) % 3 != 0 else "ocupada",
                            is_active=True
                        )
                        db.add(vaga)
                        count += 1

            await db.flush()
            print(f"✅ Vagas visuais criadas: {count}")
        else:
            print("⚠️  Vagas visuais já existem")

        # ============================================================
        # PRÉ-AUTORIZAÇÕES
        # ============================================================
        result = await db.execute(select(PreAutorizacao).where(PreAutorizacao.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none() and len(units) > 0 and len(moradores) > 0:
            hoje = date.today()

            pre_autorizacoes = [
                {"nome": "Carlos Técnico", "doc": "123.456.789-00", "tipo": "prestador", "status": "ativa"},
                {"nome": "Ana Visitante", "doc": "987.654.321-00", "tipo": "visitante", "status": "ativa"},
                {"nome": "Entregador ML", "doc": None, "tipo": "entregador", "status": "pendente"},
            ]

            for i, pa in enumerate(pre_autorizacoes):
                pre_auth = PreAutorizacao(
                    tenant_id=tenant_id,
                    unit_id=units[i % len(units)].id,
                    morador_id=moradores[i % len(moradores)].id,
                    visitante_nome=pa["nome"],
                    visitante_documento=pa.get("doc"),
                    visitante_tipo=pa["tipo"],
                    data_inicio=hoje,
                    data_fim=hoje + timedelta(days=7),
                    tipo="unica",
                    is_single_use=True,
                    max_usos=1,
                    qr_code=f"QR{uuid.uuid4().hex[:16].upper()}",
                    status=pa["status"],
                    grupo_acesso_id=grupos_criados[1].id if len(grupos_criados) > 1 else None
                )
                db.add(pre_auth)

            await db.flush()
            print(f"✅ Pré-autorizações criadas: {len(pre_autorizacoes)}")
        else:
            print("⚠️  Pré-autorizações já existem ou dados insuficientes")

        # ============================================================
        # VISITAS
        # ============================================================
        result = await db.execute(select(Visita).where(Visita.tenant_id == tenant_id).limit(1))
        if not result.scalar_one_or_none() and len(units) > 0:
            agora = datetime.now()

            visitas_data = [
                {"nome": "José Encanador", "tipo": "prestacao_servico", "status": "em_andamento"},
                {"nome": "Entregador iFood", "tipo": "entrega", "status": "finalizada"},
                {"nome": "Carlos Parente", "tipo": "visita", "status": "em_andamento"},
                {"nome": "Técnico NET", "tipo": "prestacao_servico", "status": "aguardando"},
            ]

            for i, v in enumerate(visitas_data):
                visita = Visita(
                    tenant_id=tenant_id,
                    visitante_nome=v["nome"],
                    unit_id=units[i % len(units)].id,
                    morador_id=moradores[i % len(moradores)].id if moradores else None,
                    porteiro_entrada_id=porteiro.id if porteiro else None,
                    tipo=v["tipo"],
                    status=v["status"],
                    data_entrada=agora - timedelta(hours=i),
                    autorizado_por="Porteiro",
                    metodo_autorizacao="porteiro",
                    ponto_entrada_id=pontos_criados[0].id if pontos_criados else None,
                )
                db.add(visita)

            await db.flush()
            print(f"✅ Visitas criadas: {len(visitas_data)}")
        else:
            print("⚠️  Visitas já existem ou dados insuficientes")

        # COMMIT
        await db.commit()

        print("\n" + "="*60)
        print("🎉 SEED PORTARIA CONCLUÍDO!")
        print("="*60)


if __name__ == "__main__":
    asyncio.run(seed_portaria())
