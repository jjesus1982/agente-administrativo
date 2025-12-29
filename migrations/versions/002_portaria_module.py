"""Módulo Controle de Portaria - Novas tabelas

Revision ID: 002_portaria
Revises: 001_initial
Create Date: 2025-12-22

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_portaria'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # GRUPOS DE ACESSO
    # ==========================================================================
    op.create_table(
        'grupos_acesso',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('codigo', sa.String(50), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('permite_morador', sa.Boolean(), nullable=False, default=True),
        sa.Column('permite_visitante', sa.Boolean(), nullable=False, default=True),
        sa.Column('permite_prestador', sa.Boolean(), nullable=False, default=True),
        sa.Column('permite_entregador', sa.Boolean(), nullable=False, default=True),
        sa.Column('blocos_permitidos', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('horario_inicio', sa.Time(), nullable=True),
        sa.Column('horario_fim', sa.Time(), nullable=True),
        sa.Column('dias_semana', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_grupos_acesso_tenant', 'grupos_acesso', ['tenant_id'])
    op.create_index('ix_grupos_acesso_codigo', 'grupos_acesso', ['tenant_id', 'codigo'])

    # ==========================================================================
    # PONTOS DE ACESSO
    # ==========================================================================
    op.create_table(
        'pontos_acesso',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('codigo', sa.String(50), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('tipo', sa.String(50), nullable=False, default='porta_social'),
        sa.Column('device_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('porta', sa.Integer(), nullable=True),
        sa.Column('rele_id', sa.String(100), nullable=True),
        sa.Column('sensor_id', sa.String(100), nullable=True),
        sa.Column('is_eclusa', sa.Boolean(), nullable=False, default=False),
        sa.Column('eclusa_pair_id', sa.Integer(), nullable=True),
        sa.Column('eclusa_delay', sa.Integer(), nullable=True, default=5),
        sa.Column('interfone_ramal', sa.String(20), nullable=True),
        sa.Column('interfone_ip', sa.String(50), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='offline'),
        sa.Column('last_ping_at', sa.DateTime(), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=False, default=0),
        sa.Column('visivel', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id']),
        sa.ForeignKeyConstraint(['eclusa_pair_id'], ['pontos_acesso.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_pontos_acesso_tenant', 'pontos_acesso', ['tenant_id'])
    op.create_index('ix_pontos_acesso_codigo', 'pontos_acesso', ['tenant_id', 'codigo'])
    op.create_index('ix_pontos_acesso_tipo', 'pontos_acesso', ['tenant_id', 'tipo'])

    # ==========================================================================
    # GRUPOS DE ACESSO x PONTOS DE ACESSO (N:N)
    # ==========================================================================
    op.create_table(
        'grupos_acesso_pontos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('grupo_id', sa.Integer(), nullable=False),
        sa.Column('ponto_id', sa.Integer(), nullable=False),
        sa.Column('permite_entrada', sa.Boolean(), nullable=False, default=True),
        sa.Column('permite_saida', sa.Boolean(), nullable=False, default=True),
        sa.ForeignKeyConstraint(['grupo_id'], ['grupos_acesso.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ponto_id'], ['pontos_acesso.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_grupo_ponto_unique', 'grupos_acesso_pontos', ['grupo_id', 'ponto_id'], unique=True)

    # ==========================================================================
    # TIPOS DE OCORRÊNCIA
    # ==========================================================================
    op.create_table(
        'tipos_ocorrencia',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('codigo', sa.String(50), nullable=False),
        sa.Column('nome', sa.String(255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('icone', sa.String(50), nullable=True),
        sa.Column('cor', sa.String(20), nullable=True),
        sa.Column('severidade_padrao', sa.String(20), nullable=False, default='media'),
        sa.Column('requer_foto', sa.Boolean(), nullable=False, default=False),
        sa.Column('notificar_sindico', sa.Boolean(), nullable=False, default=True),
        sa.Column('notificar_administracao', sa.Boolean(), nullable=False, default=False),
        sa.Column('evento_trigger', sa.String(100), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=False, default=0),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_tipos_ocorrencia_tenant', 'tipos_ocorrencia', ['tenant_id'])
    op.create_index('ix_tipos_ocorrencia_codigo', 'tipos_ocorrencia', ['tenant_id', 'codigo'])

    # ==========================================================================
    # PRÉ-AUTORIZAÇÕES
    # ==========================================================================
    op.create_table(
        'pre_autorizacoes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('morador_id', sa.Integer(), nullable=False),
        sa.Column('visitante_nome', sa.String(255), nullable=False),
        sa.Column('visitante_documento', sa.String(20), nullable=True),
        sa.Column('visitante_telefone', sa.String(20), nullable=True),
        sa.Column('visitante_email', sa.String(255), nullable=True),
        sa.Column('visitante_tipo', sa.String(30), nullable=False, default='visitante'),
        sa.Column('veiculo_placa', sa.String(10), nullable=True),
        sa.Column('veiculo_modelo', sa.String(100), nullable=True),
        sa.Column('veiculo_cor', sa.String(50), nullable=True),
        sa.Column('data_inicio', sa.Date(), nullable=False),
        sa.Column('data_fim', sa.Date(), nullable=False),
        sa.Column('horario_inicio', sa.Time(), nullable=True),
        sa.Column('horario_fim', sa.Time(), nullable=True),
        sa.Column('dias_semana', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('tipo', sa.String(30), nullable=False, default='unica'),
        sa.Column('is_single_use', sa.Boolean(), nullable=False, default=True),
        sa.Column('max_usos', sa.Integer(), nullable=False, default=1),
        sa.Column('usos_realizados', sa.Integer(), nullable=False, default=0),
        sa.Column('qr_code', sa.String(100), nullable=False),
        sa.Column('qr_code_url', sa.String(500), nullable=True),
        sa.Column('grupo_acesso_id', sa.Integer(), nullable=True),
        sa.Column('ponto_acesso_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='ativa'),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id']),
        sa.ForeignKeyConstraint(['morador_id'], ['users.id']),
        sa.ForeignKeyConstraint(['grupo_acesso_id'], ['grupos_acesso.id']),
        sa.ForeignKeyConstraint(['ponto_acesso_id'], ['pontos_acesso.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_pre_autorizacoes_tenant', 'pre_autorizacoes', ['tenant_id'])
    op.create_index('ix_pre_autorizacoes_unit', 'pre_autorizacoes', ['tenant_id', 'unit_id'])
    op.create_index('ix_pre_autorizacoes_qr', 'pre_autorizacoes', ['qr_code'], unique=True)
    op.create_index('ix_pre_autorizacoes_status', 'pre_autorizacoes', ['tenant_id', 'status'])
    op.create_index('ix_pre_autorizacoes_validade', 'pre_autorizacoes', ['tenant_id', 'data_inicio', 'data_fim'])

    # ==========================================================================
    # INTEGRAÇÕES DE HARDWARE
    # ==========================================================================
    op.create_table(
        'integracoes_hardware',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('parceiro', sa.String(50), nullable=False),
        sa.Column('nome_exibicao', sa.String(255), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('config', postgresql.JSONB(), nullable=True, default={}),
        sa.Column('sync_moradores', sa.Boolean(), nullable=False, default=True),
        sa.Column('sync_visitantes', sa.Boolean(), nullable=False, default=True),
        sa.Column('sync_veiculos', sa.Boolean(), nullable=False, default=False),
        sa.Column('sync_acessos', sa.Boolean(), nullable=False, default=True),
        sa.Column('status', sa.String(30), nullable=False, default='inativo'),
        sa.Column('last_health_check', sa.DateTime(), nullable=True),
        sa.Column('last_sync_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_integracoes_tenant', 'integracoes_hardware', ['tenant_id'])
    op.create_index('ix_integracoes_parceiro', 'integracoes_hardware', ['tenant_id', 'parceiro'])

    # ==========================================================================
    # LOG DE SINCRONIZAÇÕES
    # ==========================================================================
    op.create_table(
        'sincronizacoes_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('integracao_id', sa.Integer(), nullable=False),
        sa.Column('tipo_sync', sa.String(50), nullable=False),
        sa.Column('direcao', sa.String(20), nullable=False, default='push'),
        sa.Column('status', sa.String(30), nullable=False, default='pendente'),
        sa.Column('registros_total', sa.Integer(), nullable=False, default=0),
        sa.Column('registros_sucesso', sa.Integer(), nullable=False, default=0),
        sa.Column('registros_erro', sa.Integer(), nullable=False, default=0),
        sa.Column('erro_mensagem', sa.Text(), nullable=True),
        sa.Column('detalhes', postgresql.JSONB(), nullable=True),
        sa.Column('iniciado_em', sa.DateTime(), nullable=True),
        sa.Column('finalizado_em', sa.DateTime(), nullable=True),
        sa.Column('duracao_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['integracao_id'], ['integracoes_hardware.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sync_integracao', 'sincronizacoes_log', ['integracao_id'])
    op.create_index('ix_sync_status', 'sincronizacoes_log', ['integracao_id', 'status'])

    # ==========================================================================
    # VAGAS DE GARAGEM (EXTENSÃO VISUAL)
    # ==========================================================================
    op.create_table(
        'vagas_garagem',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('parking_spot_id', sa.Integer(), nullable=True),
        sa.Column('numero', sa.String(20), nullable=False),
        sa.Column('bloco', sa.String(50), nullable=True),
        sa.Column('andar', sa.String(20), nullable=True),
        sa.Column('tipo', sa.String(30), nullable=False, default='fixa'),
        sa.Column('unit_id', sa.Integer(), nullable=True),
        sa.Column('posicao_x', sa.Float(), nullable=False, default=0),
        sa.Column('posicao_y', sa.Float(), nullable=False, default=0),
        sa.Column('largura', sa.Float(), nullable=False, default=50),
        sa.Column('altura', sa.Float(), nullable=False, default=100),
        sa.Column('rotacao', sa.Float(), nullable=False, default=0),
        sa.Column('mapa_id', sa.String(50), nullable=True),
        sa.Column('status', sa.String(30), nullable=False, default='livre'),
        sa.Column('ocupada_desde', sa.DateTime(), nullable=True),
        sa.Column('veiculo_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parking_spot_id'], ['parking_spots.id']),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id']),
        sa.ForeignKeyConstraint(['veiculo_id'], ['vehicles.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_vagas_garagem_tenant', 'vagas_garagem', ['tenant_id'])
    op.create_index('ix_vagas_garagem_numero', 'vagas_garagem', ['tenant_id', 'numero'])
    op.create_index('ix_vagas_garagem_status', 'vagas_garagem', ['tenant_id', 'status'])
    op.create_index('ix_vagas_garagem_mapa', 'vagas_garagem', ['tenant_id', 'mapa_id'])

    # ==========================================================================
    # VISITAS
    # ==========================================================================
    op.create_table(
        'visitas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('visitor_id', sa.Integer(), nullable=True),
        sa.Column('visitante_nome', sa.String(255), nullable=False),
        sa.Column('visitante_documento', sa.String(20), nullable=True),
        sa.Column('visitante_foto_url', sa.String(500), nullable=True),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('morador_id', sa.Integer(), nullable=True),
        sa.Column('porteiro_entrada_id', sa.Integer(), nullable=True),
        sa.Column('porteiro_saida_id', sa.Integer(), nullable=True),
        sa.Column('tipo', sa.String(30), nullable=False, default='visita'),
        sa.Column('status', sa.String(30), nullable=False, default='aguardando'),
        sa.Column('data_entrada', sa.DateTime(), nullable=True),
        sa.Column('data_saida', sa.DateTime(), nullable=True),
        sa.Column('autorizado_por', sa.String(255), nullable=True),
        sa.Column('metodo_autorizacao', sa.String(30), nullable=True),
        sa.Column('pre_autorizacao_id', sa.Integer(), nullable=True),
        sa.Column('veiculo_placa', sa.String(10), nullable=True),
        sa.Column('veiculo_modelo', sa.String(100), nullable=True),
        sa.Column('ponto_entrada_id', sa.Integer(), nullable=True),
        sa.Column('ponto_saida_id', sa.Integer(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('motivo_negacao', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['visitor_id'], ['visitors.id']),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id']),
        sa.ForeignKeyConstraint(['morador_id'], ['users.id']),
        sa.ForeignKeyConstraint(['porteiro_entrada_id'], ['users.id']),
        sa.ForeignKeyConstraint(['porteiro_saida_id'], ['users.id']),
        sa.ForeignKeyConstraint(['pre_autorizacao_id'], ['pre_autorizacoes.id']),
        sa.ForeignKeyConstraint(['ponto_entrada_id'], ['pontos_acesso.id']),
        sa.ForeignKeyConstraint(['ponto_saida_id'], ['pontos_acesso.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['updated_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_visitas_tenant', 'visitas', ['tenant_id'])
    op.create_index('ix_visitas_unit', 'visitas', ['tenant_id', 'unit_id'])
    op.create_index('ix_visitas_visitor', 'visitas', ['tenant_id', 'visitor_id'])
    op.create_index('ix_visitas_status', 'visitas', ['tenant_id', 'status'])
    op.create_index('ix_visitas_data', 'visitas', ['tenant_id', 'data_entrada'])

    # ==========================================================================
    # COMUNICAÇÕES PORTARIA
    # ==========================================================================
    op.create_table(
        'comunicacoes_portaria',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('porteiro_id', sa.Integer(), nullable=False),
        sa.Column('morador_id', sa.Integer(), nullable=True),
        sa.Column('direcao', sa.String(20), nullable=False),
        sa.Column('tipo_mensagem', sa.String(30), nullable=False, default='texto'),
        sa.Column('conteudo', sa.Text(), nullable=True),
        sa.Column('anexo_url', sa.String(500), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('visita_id', sa.Integer(), nullable=True),
        sa.Column('pre_autorizacao_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['unit_id'], ['units.id']),
        sa.ForeignKeyConstraint(['porteiro_id'], ['users.id']),
        sa.ForeignKeyConstraint(['morador_id'], ['users.id']),
        sa.ForeignKeyConstraint(['visita_id'], ['visitas.id']),
        sa.ForeignKeyConstraint(['pre_autorizacao_id'], ['pre_autorizacoes.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_comunicacoes_tenant', 'comunicacoes_portaria', ['tenant_id'])
    op.create_index('ix_comunicacoes_unit', 'comunicacoes_portaria', ['tenant_id', 'unit_id'])
    op.create_index('ix_comunicacoes_porteiro', 'comunicacoes_portaria', ['tenant_id', 'porteiro_id'])


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('comunicacoes_portaria')
    op.drop_table('visitas')
    op.drop_table('vagas_garagem')
    op.drop_table('sincronizacoes_log')
    op.drop_table('integracoes_hardware')
    op.drop_table('pre_autorizacoes')
    op.drop_table('tipos_ocorrencia')
    op.drop_table('grupos_acesso_pontos')
    op.drop_table('pontos_acesso')
    op.drop_table('grupos_acesso')
