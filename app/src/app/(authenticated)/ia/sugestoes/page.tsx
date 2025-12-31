"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  Lightbulb, DollarSign, Users, Shield, Wrench, Building,
  Play, RefreshCw, Filter, Clock, CheckCircle, TrendingUp,
  ArrowRight, Target, Calendar, Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { getSugestoes, aceitarSugestao, type Sugestao as SugestaoAPI } from '@/lib/iaApi';
import IANavigation from '@/components/IANavigation';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ✅ Usando tipos da API real
type Sugestao = SugestaoAPI;

export default function SugestoesPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('');
  const [gerandoSugestoes, setGerandoSugestoes] = useState(false);

  // Dados mock demonstrativos
  const sugestoesMock: Sugestao[] = [
    {
      id: "sug_001",
      categoria: "Financeira",
      titulo: "Renegociação contratos de energia",
      descricao: "Análise de consumo indica potencial economia de 23% com migração para mercado livre de energia",
      prioridade: "Alta",
      impactoFinanceiro: {
        economia: 2800,
        investimento: 500,
        roi: 3,
        payback_meses: 3
      },
      dificuldade: "Moderada",
      passos: [
        "Solicitar propostas de fornecedores",
        "Análise jurídica dos contratos",
        "Aprovação em assembleia",
        "Migração gradual"
      ],
      status: "Pendente",
      dataGeracao: new Date().toISOString(),
      confianca: 87
    },
    {
      id: "sug_002",
      categoria: "Operacional",
      titulo: "Automação sistema de irrigação",
      descricao: "Sensores de umidade podem reduzir consumo de água em 40% nas áreas verdes",
      prioridade: "Media",
      impactoFinanceiro: {
        economia: 450,
        investimento: 1200,
        roi: 8,
        payback_meses: 8
      },
      dificuldade: "Facil",
      passos: [
        "Cotação de sensores",
        "Instalação por empresa especializada",
        "Configuração de horários",
        "Treinamento do zelador"
      ],
      status: "Aceita",
      dataGeracao: new Date().toISOString(),
      confianca: 85
    },
    {
      id: "sug_003",
      categoria: "Convivencia",
      titulo: "App de comunicação entre vizinhos",
      descricao: "Plataforma digital para reduzir conflitos e melhorar comunicação interna",
      prioridade: "Baixa",
      impactoFinanceiro: {
        economia: 0,
        investimento: 800,
        roi: 12,
        payback_meses: 12
      },
      dificuldade: "Complexa",
      passos: [
        "Pesquisa de soluções existentes",
        "Desenvolvimento customizado",
        "Treinamento dos moradores",
        "Monitoramento de uso"
      ],
      status: "Implementada",
      dataGeracao: new Date().toISOString(),
      confianca: 92
    },
    {
      id: "sug_004",
      categoria: "Seguranca",
      titulo: "Upgrade sistema CFTV",
      descricao: "Câmeras com IA para detecção automática de intrusos reduziriam custos de vigilância",
      prioridade: "Alta",
      impactoFinanceiro: {
        economia: 1200,
        investimento: 3500,
        roi: 6,
        payback_meses: 6
      },
      dificuldade: "Moderada",
      passos: [
        "Auditoria do sistema atual",
        "Seleção de fornecedor",
        "Instalação e configuração",
        "Treinamento da equipe"
      ],
      status: "Pendente",
      dataGeracao: new Date().toISOString(),
      confianca: 87
    },
    {
      id: "sug_005",
      categoria: "Manutencao",
      titulo: "Manutenção preditiva elevadores",
      descricao: "Sensores IoT para monitoramento contínuo e redução de paradas emergenciais",
      prioridade: "Media",
      impactoFinanceiro: {
        economia: 3200,
        investimento: 2800,
        roi: 4,
        payback_meses: 4
      },
      dificuldade: "Complexa",
      passos: [
        "Contrato com empresa de IoT",
        "Instalação de sensores",
        "Integração com sistema atual",
        "Treinamento técnico"
      ],
      status: "Rejeitada",
      dataGeracao: new Date().toISOString(),
      confianca: 78
    }
  ];

  const fetchSugestoes = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // ✅ CONECTADO COM API REAL
      const response = await getSugestoes({
        tenant_id: tenantId,
        categoria: filtroCategoria || undefined,
        prioridade: filtroPrioridade || undefined,
        limite: 50
      });

      setSugestoes(response.sugestoes);

    } catch (error) {
      console.error('❌ Erro ao carregar sugestões:', error);
      // Fallback para dados mock em caso de erro
      setSugestoes(sugestoesMock);
      console.log('📋 Usando dados mock como fallback');
    }
    setLoading(false);
  };

  const gerarSugestoes = async () => {
    setGerandoSugestoes(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // TODO: Conectar com API real quando disponível
      // await safeFetch(`/api/v1/ia/sugestoes/gerar`, {
      //   method: 'POST',
      //   body: JSON.stringify({ tenant_id: tenantId })
      // });

      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Recarregar sugestões após gerar novas
      await fetchSugestoes();

    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
    }
    setGerandoSugestoes(false);
  };

  const atualizarStatusSugestao = async (id: string, novoStatus: string) => {
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      if (novoStatus === 'Aceita') {
        // ✅ CONECTADO COM API REAL
        await aceitarSugestao(id, tenantId);
      }

      // Atualiza no estado local
      setSugestoes(prev => prev.map(sug =>
        sug.id === id ? { ...sug, status: novoStatus as any } : sug
      ));

    } catch (error) {
      console.error('❌ Erro ao atualizar status da sugestão:', error);

      // Atualiza no estado local mesmo se a API falhar
      setSugestoes(prev => prev.map(sug =>
        sug.id === id ? { ...sug, status: novoStatus as any } : sug
      ));
    }
  };

  useEffect(() => {
    fetchSugestoes();
  }, [currentTenant]);

  // Filtrar sugestões
  const sugestoesFiltradas = sugestoes.filter(sug => {
    if (filtroCategoria && sug.categoria !== filtroCategoria) return false;
    if (filtroStatus && sug.status !== filtroStatus) return false;
    if (filtroPrioridade && sug.prioridade !== filtroPrioridade) return false;
    return true;
  });

  // Estatísticas
  const estatisticasPorCategoria = [
    { nome: 'Operacional', valor: sugestoes.filter(s => s.categoria === 'Operacional').length },
    { nome: 'Financeira', valor: sugestoes.filter(s => s.categoria === 'Financeira').length },
    { nome: 'Convivência', valor: sugestoes.filter(s => s.categoria === 'Convivencia').length },
    { nome: 'Segurança', valor: sugestoes.filter(s => s.categoria === 'Seguranca').length },
    { nome: 'Manutenção', valor: sugestoes.filter(s => s.categoria === 'Manutencao').length },
  ];

  const estatisticasPorStatus = [
    { nome: 'Pendente', valor: sugestoes.filter(s => s.status === 'Pendente').length, cor: '#f59e0b' },
    { nome: 'Aceita', valor: sugestoes.filter(s => s.status === 'Aceita').length, cor: '#06b6d4' },
    { nome: 'Implementada', valor: sugestoes.filter(s => s.status === 'Implementada').length, cor: '#22c55e' },
    { nome: 'Rejeitada', valor: sugestoes.filter(s => s.status === 'Rejeitada').length, cor: '#ef4444' },
  ];

  // Cores e ícones
  const getCorCategoria = (categoria: string) => {
    const cores: Record<string, string> = {
      'Operacional': '#06b6d4',
      'Financeira': '#22c55e',
      'Convivencia': '#8b5cf6',
      'Seguranca': '#ef4444',
      'Manutencao': '#f59e0b'
    };
    return cores[categoria] || '#6b7280';
  };

  const getIconeCategoria = (categoria: string) => {
    const icones: Record<string, any> = {
      'Operacional': Building,
      'Financeira': DollarSign,
      'Convivencia': Users,
      'Seguranca': Shield,
      'Manutencao': Wrench
    };
    return icones[categoria] || Lightbulb;
  };

  const getCorPrioridade = (prioridade: string) => {
    const cores: Record<string, string> = {
      'Baixa': '#22c55e',
      'Media': '#f59e0b',
      'Alta': '#ef4444'
    };
    return cores[prioridade] || '#6b7280';
  };

  const getCorDificuldade = (dificuldade: string) => {
    const cores: Record<string, string> = {
      'Facil': '#22c55e',
      'Moderada': '#f59e0b',
      'Complexa': '#ef4444'
    };
    return cores[dificuldade] || '#6b7280';
  };

  const getCorStatus = (status: string) => {
    const cores: Record<string, string> = {
      'Pendente': '#f59e0b',
      'Aceita': '#06b6d4',
      'Implementada': '#22c55e',
      'Rejeitada': '#ef4444'
    };
    return cores[status] || '#6b7280';
  };

  const economiaTotal = sugestoes
    .filter(s => s.status === 'Implementada' || s.status === 'Aceita')
    .reduce((acc, s) => acc + s.impactoFinanceiro.economia, 0);

  return (
    <div className="animate-fade-in">
      {/* Navegação IA */}
      <IANavigation currentModule="Sugestões Automáticas" compact />

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={24} style={{ color: '#f59e0b' }}/>
          Sugestões Automáticas
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Recomendações inteligentes para otimizar operações e reduzir custos
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {sugestoes.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Sugestões Geradas
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>
            {sugestoes.filter(s => s.status === 'Implementada').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Implementadas
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#06b6d4' }}>
            R$ {economiaTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Economia Potencial
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
            {sugestoes.filter(s => s.prioridade === 'Alta').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Alta Prioridade
          </div>
        </Card>
      </div>

      {/* Controles e Filtros */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={20}/>
            Controles de Sugestões
          </CardTitle>
        </CardHeader>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', padding: '1rem' }}>
          {/* Botão Gerar Sugestões */}
          <button
            onClick={gerarSugestoes}
            disabled={gerandoSugestoes}
            style={{
              background: gerandoSugestoes ? '#6b7280' : '#22c55e',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: gerandoSugestoes ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 150ms'
            }}
          >
            {gerandoSugestoes ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }}/>
                Gerando...
              </>
            ) : (
              <>
                <Zap size={16}/>
                Gerar Sugestões
              </>
            )}
          </button>

          {/* Filtro Categoria */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Todas as Categorias</option>
            <option value="Operacional">Operacional</option>
            <option value="Financeira">Financeira</option>
            <option value="Convivencia">Convivência</option>
            <option value="Seguranca">Segurança</option>
            <option value="Manutencao">Manutenção</option>
          </select>

          {/* Filtro Status */}
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Todos os Status</option>
            <option value="Pendente">Pendente</option>
            <option value="Aceita">Aceita</option>
            <option value="Implementada">Implementada</option>
            <option value="Rejeitada">Rejeitada</option>
          </select>

          {/* Filtro Prioridade */}
          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Todas as Prioridades</option>
            <option value="Alta">Alta</option>
            <option value="Media">Média</option>
            <option value="Baixa">Baixa</option>
          </select>

          {/* Botão Refresh */}
          <button
            onClick={fetchSugestoes}
            disabled={loading}
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              padding: '0.5rem',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
      </Card>

      {/* Gráficos de Análise */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Distribuição por Categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Categoria</CardTitle>
          </CardHeader>
          <div style={{ height: '200px', padding: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={estatisticasPorCategoria}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="valor" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status das Sugestões */}
        <Card>
          <CardHeader>
            <CardTitle>Status das Sugestões</CardTitle>
          </CardHeader>
          <div style={{ height: '200px', padding: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={estatisticasPorStatus}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="valor"
                >
                  {estatisticasPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Lista de Sugestões */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando sugestões...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1rem' }}>
          {sugestoesFiltradas.map((sugestao) => {
            const IconeCategoria = getIconeCategoria(sugestao.categoria);

            return (
              <Card key={sugestao.id} style={{ padding: '1.5rem' }}>
                {/* Header do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconeCategoria size={20} style={{ color: getCorCategoria(sugestao.categoria) }}/>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: `${getCorCategoria(sugestao.categoria)}20`,
                      color: getCorCategoria(sugestao.categoria),
                      fontWeight: 600
                    }}>
                      {sugestao.categoria}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: `${getCorStatus(sugestao.status)}20`,
                      color: getCorStatus(sugestao.status),
                      fontWeight: 600
                    }}>
                      {sugestao.status}
                    </span>
                  </div>
                </div>

                {/* Título e Descrição */}
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {sugestao.titulo}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {sugestao.descricao}
                </p>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRIORIDADE</div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: getCorPrioridade(sugestao.prioridade)
                    }}>
                      {sugestao.prioridade}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DIFICULDADE</div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: getCorDificuldade(sugestao.dificuldade)
                    }}>
                      {sugestao.dificuldade}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROI</div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#22c55e'
                    }}>
                      {sugestao.impactoFinanceiro.roi} meses
                    </div>
                  </div>
                </div>

                {/* Impacto Financeiro */}
                <div style={{
                  background: 'var(--bg-tertiary)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    IMPACTO FINANCEIRO:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span>Economia: <strong style={{ color: '#22c55e' }}>R$ {sugestao.impactoFinanceiro.economia.toLocaleString()}</strong></span>
                    <span>Investimento: <strong style={{ color: '#ef4444' }}>R$ {sugestao.impactoFinanceiro.investimento.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Passos de Implementação */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    PASSOS PARA IMPLEMENTAÇÃO:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {sugestao.passos.map((passo, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{
                          background: '#06b6d4',
                          color: 'white',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.625rem',
                          fontWeight: 600
                        }}>
                          {index + 1}
                        </div>
                        {passo}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                {sugestao.status === 'Pendente' && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-default)'
                  }}>
                    <button
                      onClick={() => atualizarStatusSugestao(sugestao.id, 'Aceita')}
                      style={{
                        background: '#22c55e',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <CheckCircle size={14}/>
                      Aceitar
                    </button>

                    <button
                      onClick={() => atualizarStatusSugestao(sugestao.id, 'Rejeitada')}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Rejeitar
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {sugestoesFiltradas.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <Lightbulb size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }}/>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Nenhuma sugestão encontrada
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {filtroCategoria || filtroStatus || filtroPrioridade ?
              'Tente ajustar os filtros ou gerar novas sugestões.' :
              'Gere sugestões para otimizar as operações do condomínio.'
            }
          </p>
        </Card>
      )}

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}