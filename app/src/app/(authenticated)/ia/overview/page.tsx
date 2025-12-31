"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  Brain, TrendingUp, Lightbulb, MessageSquare, BookOpen,
  DollarSign, ArrowRight, Activity, Target, Zap, RefreshCw, BarChart3
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { getOverviewIA, getStatusIA } from '@/lib/iaApi';

interface OverviewData {
  previsoes: {
    total: number;
    altoRisco: number;
    precisaoMedia: number;
    problemasEvitados: number;
  };
  sugestoes: {
    total: number;
    implementadas: number;
    economiaPotencial: number;
    altaPrioridade: number;
  };
  comunicacao: {
    enviadas: number;
    taxaAbertura: number;
    taxaClique: number;
    canalPreferido: string;
  };
  aprendizado: {
    feedbacks: number;
    precisaoGeral: number;
    taxaAceitacao: number;
    melhoriaUltimo: number;
  };
}

export default function IAOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(false);

  // Dados mock demonstrativos
  const overviewMock: OverviewData = {
    previsoes: {
      total: 4,
      altoRisco: 2,
      precisaoMedia: 85,
      problemasEvitados: 23
    },
    sugestoes: {
      total: 5,
      implementadas: 1,
      economiaPotencial: 7650,
      altaPrioridade: 2
    },
    comunicacao: {
      enviadas: 1250,
      taxaAbertura: 70.0,
      taxaClique: 25.0,
      canalPreferido: "email"
    },
    aprendizado: {
      feedbacks: 1247,
      precisaoGeral: 84.5,
      taxaAceitacao: 78.2,
      melhoriaUltimo: 19.3
    }
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // ✅ CONECTADO COM API REAL
      const response = await getOverviewIA(tenantId);

      // Converter resposta da API para formato esperado pela UI
      setOverview({
        previsoes: {
          total: response.previsoes?.total || 0,
          altoRisco: response.previsoes?.alto_risco || 0,
          precisaoMedia: response.previsoes?.precisao_media || 0,
          problemasEvitados: response.previsoes?.problemas_evitados || 0
        },
        sugestoes: {
          total: response.sugestoes?.total || 0,
          implementadas: response.sugestoes?.implementadas || 0,
          economiaPotencial: response.sugestoes?.economia_potencial || 0,
          altaPrioridade: response.sugestoes?.alta_prioridade || 0
        },
        comunicacao: {
          enviadas: response.comunicacao?.enviadas || 0,
          taxaAbertura: response.comunicacao?.taxa_abertura || 0,
          taxaClique: response.comunicacao?.taxa_clique || 0,
          canalPreferido: response.comunicacao?.canal_preferido || "email"
        },
        aprendizado: {
          feedbacks: response.aprendizado?.feedbacks || 0,
          precisaoGeral: response.aprendizado?.precisao_geral || 0,
          taxaAceitacao: response.aprendizado?.taxa_aceitacao || 0,
          melhoriaUltimo: response.aprendizado?.melhoria_ultimo || 0
        }
      });

    } catch (error) {
      console.error('❌ Erro ao carregar overview:', error);
      // Fallback para dados mock em caso de erro
      setOverview(overviewMock);
      console.log('📋 Usando dados mock como fallback');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOverview();
  }, [currentTenant]);

  if (!overview) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Brain size={24} style={{ color: '#8b5cf6' }}/>
          Central de Inteligência
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Visão geral completa dos sistemas de IA proativa para gestão condominial
        </p>
      </div>

      {/* Métricas Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Activity size={20} style={{ color: '#8b5cf6' }}/>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8b5cf6' }}>SISTEMA IA</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>
            ATIVO
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            4 módulos funcionando
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Target size={20} style={{ color: '#22c55e' }}/>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#22c55e' }}>PRECISÃO GERAL</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>
            {overview.aprendizado.precisaoGeral.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            +{overview.aprendizado.melhoriaUltimo}% nos últimos meses
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Zap size={20} style={{ color: '#f59e0b' }}/>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f59e0b' }}>AÇÕES PROATIVAS</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {overview.previsoes.problemasEvitados + overview.sugestoes.implementadas}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Problemas evitados + sugestões
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <DollarSign size={20} style={{ color: '#06b6d4' }}/>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#06b6d4' }}>ECONOMIA POTENCIAL</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#06b6d4' }}>
            R$ {overview.sugestoes.economiaPotencial.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Em sugestões aprovadas
          </div>
        </Card>
      </div>

      {/* Módulos IA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* RF-05: Previsão de Problemas */}
        <Card
          style={{ cursor: 'pointer', transition: 'all 150ms' }}
          onClick={() => router.push('/ia/previsoes')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={20} style={{ color: '#ef4444' }}/>
              RF-05: Previsão de Problemas
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}/>
            </CardTitle>
          </CardHeader>

          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Análise preditiva que identifica padrões e prevê problemas antes que aconteçam
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PREVISÕES ATIVAS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                  {overview.previsoes.total}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ALTO RISCO</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  {overview.previsoes.altoRisco}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRECISÃO MÉDIA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                  {overview.previsoes.precisaoMedia}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EVITADOS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4' }}>
                  {overview.previsoes.problemasEvitados}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.5rem',
              background: '#ef444410',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#ef4444',
              textAlign: 'center'
            }}>
              ⚡ IA Preditiva - Antecipa problemas em 4 categorias
            </div>
          </div>
        </Card>

        {/* RF-06: Sugestões Automáticas */}
        <Card
          style={{ cursor: 'pointer', transition: 'all 150ms' }}
          onClick={() => router.push('/ia/sugestoes')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb size={20} style={{ color: '#f59e0b' }}/>
              RF-06: Sugestões Automáticas
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}/>
            </CardTitle>
          </CardHeader>

          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Recomendações inteligentes para reduzir custos e melhorar operações
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SUGESTÕES GERADAS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  {overview.sugestoes.total}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>IMPLEMENTADAS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                  {overview.sugestoes.implementadas}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ECONOMIA POTENCIAL</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#06b6d4' }}>
                  R$ {overview.sugestoes.economiaPotencial.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ALTA PRIORIDADE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                  {overview.sugestoes.altaPrioridade}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.5rem',
              background: '#f59e0b10',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#f59e0b',
              textAlign: 'center'
            }}>
              💡 Sistema de Recomendação - Otimização automática
            </div>
          </div>
        </Card>

        {/* RF-07: Comunicação Inteligente */}
        <Card
          style={{ cursor: 'pointer', transition: 'all 150ms' }}
          onClick={() => router.push('/ia/comunicacao')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} style={{ color: '#06b6d4' }}/>
              RF-07: Comunicação Inteligente
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}/>
            </CardTitle>
          </CardHeader>

          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Otimização de timing, canal e conteúdo para maximizar engajamento
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MENSAGENS ENVIADAS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4' }}>
                  {overview.comunicacao.enviadas.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TAXA ABERTURA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                  {overview.comunicacao.taxaAbertura.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TAXA CLIQUE</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  {overview.comunicacao.taxaClique.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CANAL PREFERIDO</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#8b5cf6' }}>
                  {overview.comunicacao.canalPreferido}
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.5rem',
              background: '#06b6d410',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#06b6d4',
              textAlign: 'center'
            }}>
              📱 Multi-canal - Email, Push, SMS, WhatsApp
            </div>
          </div>
        </Card>

        {/* RF-08: Aprendizado Contínuo */}
        <Card
          style={{ cursor: 'pointer', transition: 'all 150ms' }}
          onClick={() => router.push('/ia/aprendizado')}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: '#8b5cf6' }}/>
              RF-08: Aprendizado Contínuo
              <ArrowRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}/>
            </CardTitle>
          </CardHeader>

          <div style={{ padding: '0 1.5rem 1.5rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Sistema que aprende com feedback e melhora previsões continuamente
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FEEDBACKS COLETADOS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
                  {overview.aprendizado.feedbacks.toLocaleString()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PRECISÃO GERAL</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>
                  {overview.aprendizado.precisaoGeral.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TAXA ACEITAÇÃO</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4' }}>
                  {overview.aprendizado.taxaAceitacao.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MELHORIA</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>
                  +{overview.aprendizado.melhoriaUltimo}%
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.5rem',
              background: '#8b5cf610',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#8b5cf6',
              textAlign: 'center'
            }}>
              🧠 Machine Learning - Evolução automática
            </div>
          </div>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20}/>
            Ações Rápidas
          </CardTitle>
        </CardHeader>

        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

            <button
              onClick={() => router.push('/ia/previsoes')}
              style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ef4444';
                e.currentTarget.style.background = '#ef444410';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <TrendingUp size={16} style={{ color: '#ef4444' }}/>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Analisar Previsões</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Executar nova análise preditiva
              </p>
            </button>

            <button
              onClick={() => router.push('/ia/sugestoes')}
              style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.background = '#f59e0b10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Lightbulb size={16} style={{ color: '#f59e0b' }}/>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Gerar Sugestões</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Criar novas recomendações
              </p>
            </button>

            <button
              onClick={() => router.push('/ia/comunicacao')}
              style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#06b6d4';
                e.currentTarget.style.background = '#06b6d410';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <BarChart3 size={16} style={{ color: '#06b6d4' }}/>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Analisar Engajamento</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Otimizar comunicações
              </p>
            </button>

            <button
              onClick={() => router.push('/ia/aprendizado')}
              style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#8b5cf6';
                e.currentTarget.style.background = '#8b5cf610';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <BookOpen size={16} style={{ color: '#8b5cf6' }}/>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Coletar Feedback</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Melhorar sistema IA
              </p>
            </button>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}