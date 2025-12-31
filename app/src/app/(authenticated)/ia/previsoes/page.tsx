"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  AlertTriangle, TrendingUp, Shield, Users, DollarSign, Wrench,
  Play, RefreshCw, Filter, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { getPrevisoes, getTendenciasPrevisoes, type Previsao as PrevisaoAPI } from '@/lib/iaApi';
import IANavigation from '@/components/IANavigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Usando tipos da API real
type Previsao = PrevisaoAPI;

export default function PrevisoesProblemPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroRisco, setFiltroRisco] = useState<string>('');
  const [executandoAnalise, setExecutandoAnalise] = useState(false);

  // Dados mock enquanto APIs não estão conectadas - simulando sistema existente
  const previsoesMock: Previsao[] = [
    {
      id: "prev_001",
      tipo: "Financeiro",
      risco: "Alto Risco",
      titulo: "Risco de inadimplência - Apt 102",
      descricao: "Padrão histórico indica alta probabilidade de atraso no pagamento baseado em comportamento anterior",
      precisao: 87,
      dataPrevisao: new Date(),
      acoesRecomendadas: [
        "Enviar lembrete antecipado",
        "Oferecer parcelamento",
        "Contato direto com síndico"
      ],
      impacto: "Alto"
    },
    {
      id: "prev_002",
      tipo: "Manutencao",
      risco: "Confirmada",
      titulo: "Falha iminente - Bomba d'água",
      descricao: "Análise de vibração e consumo elétrico indicam desgaste crítico nos rolamentos",
      precisao: 94,
      dataPrevisao: new Date(),
      acoesRecomendadas: [
        "Agendar manutenção preventiva",
        "Solicitar orçamento de peças",
        "Preparar bomba reserva"
      ],
      impacto: "Critico"
    },
    {
      id: "prev_003",
      tipo: "Seguranca",
      risco: "Pendente",
      titulo: "Padrão suspeito - Visitantes recorrentes",
      descricao: "Identificado aumento de 340% em visitas não anunciadas no período noturno",
      precisao: 76,
      dataPrevisao: new Date(),
      acoesRecomendadas: [
        "Reforçar fiscalização noturna",
        "Instalar iluminação adicional",
        "Comunicado sobre visitantes"
      ],
      impacto: "Medio"
    },
    {
      id: "prev_004",
      tipo: "Convivencia",
      risco: "Alto Risco",
      titulo: "Conflito escalando - Andares 5 e 6",
      descricao: "Aumento de 500% em reclamações mútuas, padrão indica possível conflito físico",
      precisao: 82,
      dataPrevisao: new Date(),
      acoesRecomendadas: [
        "Reunião de mediação",
        "Aplicar código de conduta",
        "Monitoramento próximo"
      ],
      impacto: "Alto"
    }
  ];

  const fetchPrevisoes = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // ✅ CONECTADO COM API REAL
      const response = await getPrevisoes({
        tenant_id: tenantId,
        categoria: filtroTipo || 'todas',
        risco: filtroRisco || 'todos',
        limite: 50
      });

      // Converter datas string para Date objects
      const previsoes = response.previsoes.map(p => ({
        ...p,
        dataPrevisao: new Date(p.dataPrevisao)
      }));

      setPrevisoes(previsoes);

    } catch (error) {
      console.error('❌ Erro ao carregar previsões:', error);
      // Fallback para dados mock em caso de erro
      setPrevisoes(previsoesMock);
      console.log('📋 Usando dados mock como fallback');
    }
    setLoading(false);
  };

  const executarAnalise = async () => {
    setExecutandoAnalise(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // TODO: Conectar com API real quando disponível
      // await safeFetch(`/api/v1/ia/previsoes/analisar`, {
      //   method: 'POST',
      //   body: JSON.stringify({ tenant_id: tenantId })
      // });

      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Recarregar previsões após análise
      await fetchPrevisoes();

    } catch (error) {
      console.error('Erro ao executar análise:', error);
    }
    setExecutandoAnalise(false);
  };

  useEffect(() => {
    fetchPrevisoes();
  }, [currentTenant]);

  // Filtrar previsões
  const previsoesFiltradas = previsoes.filter(prev => {
    if (filtroTipo && prev.tipo !== filtroTipo) return false;
    if (filtroRisco && prev.risco !== filtroRisco) return false;
    return true;
  });

  // Estatísticas para gráfico
  const estatisticasPorTipo = [
    { nome: 'Financeiro', total: previsoes.filter(p => p.tipo === 'Financeiro').length },
    { nome: 'Manutenção', total: previsoes.filter(p => p.tipo === 'Manutencao').length },
    { nome: 'Segurança', total: previsoes.filter(p => p.tipo === 'Seguranca').length },
    { nome: 'Convivência', total: previsoes.filter(p => p.tipo === 'Convivencia').length },
  ];

  // Cores e ícones por tipo
  const getCorTipo = (tipo: string) => {
    const cores: Record<string, string> = {
      'Financeiro': '#f59e0b',
      'Manutencao': '#ef4444',
      'Seguranca': '#06b6d4',
      'Convivencia': '#8b5cf6'
    };
    return cores[tipo] || '#6b7280';
  };

  const getIconeTipo = (tipo: string) => {
    const icones: Record<string, any> = {
      'Financeiro': DollarSign,
      'Manutencao': Wrench,
      'Seguranca': Shield,
      'Convivencia': Users
    };
    return icones[tipo] || AlertTriangle;
  };

  const getCorRisco = (risco: string) => {
    const cores: Record<string, string> = {
      'Pendente': '#6b7280',
      'Alto Risco': '#f59e0b',
      'Confirmada': '#ef4444'
    };
    return cores[risco] || '#6b7280';
  };

  const getIconeRisco = (risco: string) => {
    const icones: Record<string, any> = {
      'Pendente': Clock,
      'Alto Risco': AlertTriangle,
      'Confirmada': AlertCircle
    };
    return icones[risco] || Clock;
  };

  return (
    <div className="animate-fade-in">
      {/* Navegação IA */}
      <IANavigation currentModule="Previsão de Problemas" compact />

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={24} style={{ color: '#ef4444' }}/>
          Previsão de Problemas
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Sistema de análise preditiva - Antecipe problemas antes que aconteçam
        </p>
      </div>

      {/* Estatísticas Gerais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
            {previsoes.length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Previsões Ativas
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {previsoes.filter(p => p.risco === 'Alto Risco' || p.risco === 'Confirmada').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Alto Risco
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>
            {Math.round(previsoes.reduce((acc, p) => acc + p.precisao, 0) / previsoes.length || 0)}%
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Precisão Média
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#06b6d4' }}>
            {previsoes.filter(p => p.impacto === 'Alto' || p.impacto === 'Critico').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Impacto Crítico
          </div>
        </Card>
      </div>

      {/* Controles e Filtros */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={20}/>
            Controles de Análise
          </CardTitle>
        </CardHeader>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', padding: '1rem' }}>
          {/* Botão Executar Análise */}
          <button
            onClick={executarAnalise}
            disabled={executandoAnalise}
            style={{
              background: executandoAnalise ? '#6b7280' : '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: executandoAnalise ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 150ms'
            }}
          >
            {executandoAnalise ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }}/>
                Analisando...
              </>
            ) : (
              <>
                <Play size={16}/>
                Executar Análise
              </>
            )}
          </button>

          {/* Filtro Tipo */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Todos os Tipos</option>
            <option value="Financeiro">Financeiro</option>
            <option value="Manutencao">Manutenção</option>
            <option value="Seguranca">Segurança</option>
            <option value="Convivencia">Convivência</option>
          </select>

          {/* Filtro Risco */}
          <select
            value={filtroRisco}
            onChange={(e) => setFiltroRisco(e.target.value)}
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="">Todos os Riscos</option>
            <option value="Pendente">Pendente</option>
            <option value="Alto Risco">Alto Risco</option>
            <option value="Confirmada">Confirmada</option>
          </select>

          {/* Botão Refresh */}
          <button
            onClick={fetchPrevisoes}
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

      {/* Gráfico de Distribuição */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Distribuição por Categoria</CardTitle>
        </CardHeader>
        <div style={{ height: '200px', padding: '1rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={estatisticasPorTipo}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Lista de Previsões */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando previsões...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
          {previsoesFiltradas.map((previsao) => {
            const IconeTipo = getIconeTipo(previsao.tipo);
            const IconeRisco = getIconeRisco(previsao.risco);

            return (
              <Card key={previsao.id} style={{ padding: '1.5rem' }}>
                {/* Header do Card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconeTipo size={20} style={{ color: getCorTipo(previsao.tipo) }}/>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      background: `${getCorTipo(previsao.tipo)}20`,
                      color: getCorTipo(previsao.tipo),
                      fontWeight: 600
                    }}>
                      {previsao.tipo}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <IconeRisco size={16} style={{ color: getCorRisco(previsao.risco) }}/>
                    <span style={{
                      fontSize: '0.75rem',
                      color: getCorRisco(previsao.risco),
                      fontWeight: 600
                    }}>
                      {previsao.risco}
                    </span>
                  </div>
                </div>

                {/* Título e Descrição */}
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {previsao.titulo}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {previsao.descricao}
                </p>

                {/* Métricas */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRECISÃO</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e' }}>
                      {previsao.precisao}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IMPACTO</div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: previsao.impacto === 'Critico' ? '#ef4444' :
                             previsao.impacto === 'Alto' ? '#f59e0b' :
                             previsao.impacto === 'Medio' ? '#06b6d4' : '#22c55e'
                    }}>
                      {previsao.impacto}
                    </div>
                  </div>
                </div>

                {/* Ações Recomendadas */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    AÇÕES RECOMENDADAS:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {previsao.acoesRecomendadas.map((acao, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem'
                      }}>
                        <CheckCircle size={12} style={{ color: '#22c55e' }}/>
                        {acao}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {previsoesFiltradas.length === 0 && !loading && (
        <Card style={{ textAlign: 'center', padding: '2rem' }}>
          <TrendingUp size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }}/>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Nenhuma previsão encontrada
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>
            {filtroTipo || filtroRisco ?
              'Tente ajustar os filtros ou executar nova análise.' :
              'Execute a análise para gerar previsões de problemas.'
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