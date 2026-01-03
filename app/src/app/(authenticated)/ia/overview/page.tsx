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

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Line, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend
);

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

  // Skeleton Loading Component
  const SkeletonCard = () => (
    <div style={{
      background: 'var(--bg-primary)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid var(--border-default)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ animation: 'pulse 2s infinite' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ height: '20px', width: '20px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
          <div style={{ height: '16px', width: '128px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ height: '32px', width: '64px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
          <div style={{ height: '12px', width: '96px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
        </div>
      </div>
    </div>
  );

  const SkeletonModuleCard = () => (
    <div style={{
      background: 'var(--bg-primary)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid var(--border-default)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ animation: 'pulse 2s infinite' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ height: '20px', width: '20px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
            <div style={{ height: '16px', width: '160px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
          </div>
          <div style={{ height: '16px', width: '16px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
        </div>
        <div style={{ height: '12px', width: '100%', background: 'var(--bg-tertiary)', borderRadius: '4px', marginBottom: '1rem' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ height: '12px', width: '80px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
              <div style={{ height: '24px', width: '48px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Chart Data Configurations
  const performanceRadarData = {
    labels: ['Previsões', 'Sugestões', 'Comunicação', 'Aprendizado'],
    datasets: [{
      label: 'Performance IA',
      data: [
        overview?.previsoes.precisaoMedia || 0,
        (overview?.sugestoes.implementadas || 0) * 20,
        overview?.comunicacao.taxaAbertura || 0,
        overview?.aprendizado.precisaoGeral || 0
      ],
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: 'rgba(139, 92, 246, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(139, 92, 246, 1)',
      pointBorderColor: 'white',
      pointHoverBackgroundColor: 'white',
      pointHoverBorderColor: 'rgba(139, 92, 246, 1)'
    }]
  };

  const moduleStatusData = {
    labels: ['Previsões Ativas', 'Sugestões Pendentes', 'Comunicações', 'Feedbacks'],
    datasets: [{
      data: [
        overview?.previsoes.total || 0,
        (overview?.sugestoes.total || 0) - (overview?.sugestoes.implementadas || 0),
        Math.floor((overview?.comunicacao.enviadas || 0) / 100),
        Math.floor((overview?.aprendizado.feedbacks || 0) / 100)
      ],
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',   // red-500
        'rgba(245, 158, 11, 0.8)',  // amber-500
        'rgba(6, 182, 212, 0.8)',   // cyan-500
        'rgba(139, 92, 246, 0.8)'   // violet-500
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(6, 182, 212, 1)',
        'rgba(139, 92, 246, 1)'
      ],
      borderWidth: 2
    }]
  };

  const improvementTrendData = {
    labels: ['3 meses atrás', '2 meses atrás', '1 mês atrás', 'Atual'],
    datasets: [{
      label: 'Precisão Geral (%)',
      data: [
        (overview?.aprendizado.precisaoGeral || 84.5) - (overview?.aprendizado.melhoriaUltimo || 19.3),
        (overview?.aprendizado.precisaoGeral || 84.5) - ((overview?.aprendizado.melhoriaUltimo || 19.3) * 0.7),
        (overview?.aprendizado.precisaoGeral || 84.5) - ((overview?.aprendizado.melhoriaUltimo || 19.3) * 0.3),
        overview?.aprendizado.precisaoGeral || 84.5
      ],
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(34, 197, 94, 1)',
      pointBorderColor: 'white',
      pointBorderWidth: 2,
      pointRadius: 6
    }]
  };

  const engagementMetricsData = {
    labels: ['Abertura Email', 'Clique Email', 'Taxa Aceitação', 'Implementação'],
    datasets: [{
      label: 'Métricas de Engajamento (%)',
      data: [
        overview?.comunicacao.taxaAbertura || 0,
        overview?.comunicacao.taxaClique || 0,
        overview?.aprendizado.taxaAceitacao || 0,
        ((overview?.sugestoes.implementadas || 0) / (overview?.sugestoes.total || 1)) * 100
      ],
      backgroundColor: [
        'rgba(6, 182, 212, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)'
      ],
      borderColor: [
        'rgba(6, 182, 212, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          font: {
            size: 12,
            weight: '500'
          }
        }
      }
    }
  };

  if (!overview) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-app)',
        padding: '1.5rem'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Skeleton */}
          <div style={{ animation: 'pulse 2s infinite' }}>
            <div style={{
              height: '32px',
              width: '256px',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px',
              marginBottom: '0.5rem'
            }}></div>
            <div style={{
              height: '16px',
              width: '384px',
              background: 'var(--bg-tertiary)',
              borderRadius: '4px'
            }}></div>
          </div>

          {/* Metrics Skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem'
          }}>
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>

          {/* Modules Skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem'
          }}>
            {[1, 2, 3, 4].map(i => <SkeletonModuleCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      padding: '1.5rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Modern Header with Gradient */}
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #6366f1 100%)',
          padding: '2rem',
          color: 'white',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px'
              }}>
                <Brain size={32} color="white" />
              </div>
              <h1 style={{
                fontSize: '1.875rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent'
              }}>
                Central de Inteligência
              </h1>
            </div>
            <p style={{ color: '#e0e7ff', fontSize: '1.125rem', fontWeight: 500 }}>
              Visão geral completa dos sistemas de IA proativa para gestão condominial
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                background: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '50px',
                border: '1px solid rgba(74, 222, 128, 0.3)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: '#4ade80',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{ color: '#bbf7d0', fontSize: '0.875rem', fontWeight: 500 }}>Sistema Ativo</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                background: 'rgba(59, 130, 246, 0.2)',
                borderRadius: '50px',
                border: '1px solid rgba(96, 165, 250, 0.3)'
              }}>
                <Target size={16} color="#bfdbfe" />
                <span style={{ color: '#bfdbfe', fontSize: '0.875rem', fontWeight: 500 }}>4 Módulos Funcionando</span>
              </div>
            </div>
          </div>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, transparent 100%)'
          }}></div>
          <div style={{
            position: 'absolute',
            top: '-1rem',
            right: '-1rem',
            width: '6rem',
            height: '6rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(40px)'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-1rem',
            left: '-1rem',
            width: '8rem',
            height: '8rem',
            background: 'rgba(196, 181, 253, 0.2)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }}></div>
        </div>

        {/* Analytics Charts Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Performance Radar Chart */}
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              <Activity size={20} color="#8b5cf6" />
              Performance dos Módulos IA
            </h3>
            <div style={{ height: '256px' }}>
              <Radar data={performanceRadarData} options={chartOptions} />
            </div>
          </div>

          {/* Module Status Doughnut Chart */}
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              <BarChart3 size={20} color="#3b82f6" />
              Distribuição de Atividades
            </h3>
            <div style={{ height: '256px' }}>
              <Doughnut data={moduleStatusData} options={chartOptions} />
            </div>
          </div>

          {/* Improvement Trend Line Chart */}
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              <TrendingUp size={20} color="#22c55e" />
              Evolução da Precisão
            </h3>
            <div style={{ height: '256px' }}>
              <Line data={improvementTrendData} options={chartOptions} />
            </div>
          </div>

          {/* Engagement Metrics Bar Chart */}
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              <MessageSquare size={20} color="#06b6d4" />
              Métricas de Engajamento
            </h3>
            <div style={{ height: '256px' }}>
              <Bar data={engagementMetricsData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#8b5cf620', borderRadius: '8px' }}>
                <Activity size={20} color="#8b5cf6" />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8b5cf6', letterSpacing: '0.05em' }}>SISTEMA IA</span>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>ATIVO</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>4 módulos funcionando</div>
            <div style={{ marginTop: '0.75rem', width: '100%', background: '#22c55e20', borderRadius: '10px', height: '8px' }}>
              <div style={{ background: '#22c55e', height: '8px', borderRadius: '10px', width: '100%', animation: 'pulse 2s infinite' }}></div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#22c55e20', borderRadius: '8px' }}>
                <Target size={20} color="#22c55e" />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#22c55e', letterSpacing: '0.05em' }}>PRECISÃO GERAL</span>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>{overview.aprendizado.precisaoGeral.toFixed(1)}%</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>+{overview.aprendizado.melhoriaUltimo}% nos últimos meses</div>
            <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <TrendingUp size={16} color="#22c55e" />
              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 500 }}>Em crescimento</span>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#f59e0b20', borderRadius: '8px' }}>
                <Zap size={20} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.05em' }}>AÇÕES PROATIVAS</span>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem' }}>
              {overview.previsoes.problemasEvitados + overview.sugestoes.implementadas}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Problemas evitados + sugestões</div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.25rem 0.5rem', background: '#ef444420', borderRadius: '20px', fontSize: '0.75rem', color: '#ef4444' }}>
                {overview.previsoes.problemasEvitados} evitados
              </div>
              <div style={{ padding: '0.25rem 0.5rem', background: '#22c55e20', borderRadius: '20px', fontSize: '0.75rem', color: '#22c55e' }}>
                {overview.sugestoes.implementadas} implementados
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-primary)',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              textAlign: 'center',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ padding: '0.5rem', background: '#06b6d420', borderRadius: '8px' }}>
                <DollarSign size={20} color="#06b6d4" />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#06b6d4', letterSpacing: '0.05em' }}>ECONOMIA POTENCIAL</span>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#06b6d4', marginBottom: '0.5rem' }}>
              R$ {overview.sugestoes.economiaPotencial.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Em sugestões aprovadas</div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 500 }}>
                {overview.sugestoes.total} sugestões geradas
              </div>
            </div>
          </div>
        </div>

        {/* AI Modules Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* RF-05: Previsão de Problemas */}
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            onClick={() => router.push('/ia/previsoes')}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    background: '#ef444420',
                    borderRadius: '8px',
                    transition: 'transform 0.3s ease'
                  }}>
                    <TrendingUp size={20} color="#ef4444" />
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>RF-05: Previsão de Problemas</h3>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" style={{ transition: 'transform 0.3s ease' }} />
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Análise preditiva que identifica padrões e prevê problemas antes que aconteçam
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#ef444410', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Previsões Ativas</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{overview.previsoes.total}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#f59e0b10', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Alto Risco</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{overview.previsoes.altoRisco}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#22c55e10', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Precisão Média</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{overview.previsoes.precisaoMedia}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.75rem', background: '#06b6d410', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Evitados</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4' }}>{overview.previsoes.problemasEvitados}</div>
                </div>
              </div>

              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #ef444410, #f59e0b10)',
                borderRadius: '8px',
                border: '1px solid #ef444420'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <Zap size={16} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>IA Preditiva - Antecipa problemas em 4 categorias</span>
                </div>
              </div>
            </div>
            <div style={{ height: '4px', background: 'linear-gradient(135deg, #ef4444, #f59e0b)' }}></div>
          </div>

          {/* RF-06: Sugestões Automáticas */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer group hover:shadow-lg transform hover:scale-105 transition-all duration-300 overflow-hidden"
            onClick={() => router.push('/ia/sugestoes')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Lightbulb size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">RF-06: Sugestões Automáticas</h3>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform duration-300" />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Recomendações inteligentes para reduzir custos e melhorar operações
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Sugestões Geradas</div>
                  <div className="text-2xl font-bold text-amber-500">{overview.sugestoes.total}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Implementadas</div>
                  <div className="text-2xl font-bold text-green-500">{overview.sugestoes.implementadas}</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Economia Potencial</div>
                  <div className="text-xl font-bold text-cyan-500">R$ {overview.sugestoes.economiaPotencial.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Alta Prioridade</div>
                  <div className="text-2xl font-bold text-red-500">{overview.sugestoes.altaPrioridade}</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                  <Lightbulb size={16} />
                  <span className="text-sm font-medium">Sistema de Recomendação - Otimização automática</span>
                </div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500"></div>
          </div>

          {/* RF-07: Comunicação Inteligente */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer group hover:shadow-lg transform hover:scale-105 transition-all duration-300 overflow-hidden"
            onClick={() => router.push('/ia/comunicacao')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare size={20} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">RF-07: Comunicação Inteligente</h3>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform duration-300" />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Otimização de timing, canal e conteúdo para maximizar engajamento
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Mensagens Enviadas</div>
                  <div className="text-2xl font-bold text-cyan-500">{overview.comunicacao.enviadas.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Taxa Abertura</div>
                  <div className="text-2xl font-bold text-green-500">{overview.comunicacao.taxaAbertura.toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Taxa Clique</div>
                  <div className="text-2xl font-bold text-amber-500">{overview.comunicacao.taxaClique.toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Canal Preferido</div>
                  <div className="text-xl font-bold text-violet-500 capitalize">{overview.comunicacao.canalPreferido}</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center justify-center gap-2 text-cyan-600 dark:text-cyan-400">
                  <MessageSquare size={16} />
                  <span className="text-sm font-medium">Multi-canal - Email, Push, SMS, WhatsApp</span>
                </div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          </div>

          {/* RF-08: Aprendizado Contínuo */}
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer group hover:shadow-lg transform hover:scale-105 transition-all duration-300 overflow-hidden"
            onClick={() => router.push('/ia/aprendizado')}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <BookOpen size={20} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">RF-08: Aprendizado Contínuo</h3>
                </div>
                <ArrowRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform duration-300" />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Sistema que aprende com feedback e melhora previsões continuamente
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Feedbacks Coletados</div>
                  <div className="text-2xl font-bold text-violet-500">{overview.aprendizado.feedbacks.toLocaleString()}</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Precisão Geral</div>
                  <div className="text-2xl font-bold text-green-500">{overview.aprendizado.precisaoGeral.toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Taxa Aceitação</div>
                  <div className="text-2xl font-bold text-cyan-500">{overview.aprendizado.taxaAceitacao.toFixed(1)}%</div>
                </div>
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Melhoria</div>
                  <div className="text-2xl font-bold text-amber-500">+{overview.aprendizado.melhoriaUltimo}%</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <div className="flex items-center justify-center gap-2 text-violet-600 dark:text-violet-400">
                  <Brain size={16} />
                  <span className="text-sm font-medium">Machine Learning - Evolução automática</span>
                </div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500"></div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg">
                <Zap size={20} className="text-white" />
              </div>
              Ações Rápidas
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Acesso direto aos principais recursos de IA do sistema
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/ia/previsoes')}
                className="group p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all duration-300 hover:shadow-md transform hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp size={16} className="text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Analisar Previsões</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Executar nova análise preditiva de problemas
                </p>
                <div className="mt-3 flex items-center text-xs text-red-600 dark:text-red-400">
                  <ArrowRight size={12} className="mr-1 group-hover:translate-x-1 transition-transform duration-300" />
                  Acessar módulo
                </div>
              </button>

              <button
                onClick={() => router.push('/ia/sugestoes')}
                className="group p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800 transition-all duration-300 hover:shadow-md transform hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <Lightbulb size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Gerar Sugestões</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Criar novas recomendações inteligentes
                </p>
                <div className="mt-3 flex items-center text-xs text-amber-600 dark:text-amber-400">
                  <ArrowRight size={12} className="mr-1 group-hover:translate-x-1 transition-transform duration-300" />
                  Acessar módulo
                </div>
              </button>

              <button
                onClick={() => router.push('/ia/comunicacao')}
                className="group p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-left hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 dark:hover:border-cyan-800 transition-all duration-300 hover:shadow-md transform hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 size={16} className="text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Analisar Engajamento</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Otimizar campanhas de comunicação
                </p>
                <div className="mt-3 flex items-center text-xs text-cyan-600 dark:text-cyan-400">
                  <ArrowRight size={12} className="mr-1 group-hover:translate-x-1 transition-transform duration-300" />
                  Acessar módulo
                </div>
              </button>

              <button
                onClick={() => router.push('/ia/aprendizado')}
                className="group p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-300 hover:shadow-md transform hover:scale-105"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg group-hover:scale-110 transition-transform duration-300">
                    <BookOpen size={16} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Coletar Feedback</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Melhorar precisão do sistema IA
                </p>
                <div className="mt-3 flex items-center text-xs text-violet-600 dark:text-violet-400">
                  <ArrowRight size={12} className="mr-1 group-hover:translate-x-1 transition-transform duration-300" />
                  Acessar módulo
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.6s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}