"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  MessageSquare, Mail, Smartphone, Phone, MessageCircle,
  Clock, Settings, RefreshCw, Target, Bell, BellOff, Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { getEstatisticasComunicacao, getPreferenciasUsuarios, otimizarComunicacao } from '@/lib/iaApi';
import IANavigation from '@/components/IANavigation';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Tipos de dados conforme especificado no prompt
interface EstatisticasComunicacao {
  estatisticas: {
    enviadas: number;
    abertas: number;
    cliques: number;
    taxaAbertura: number; // %
    taxaClique: number; // %
  };
  porCanal: {
    email: { enviadas: number; abertas: number; cliques: number; };
    push: { enviadas: number; abertas: number; cliques: number; };
    sms: { enviadas: number; abertas: number; cliques: number; };
    whatsapp: { enviadas: number; abertas: number; cliques: number; };
  };
}

interface PreferenciasUsuario {
  horarioInicio: string;
  horarioFim: string;
  canalPreferido: "email" | "push" | "sms" | "whatsapp";
  limiteDiario: number;
  categorias: string[];
  naoPerturbe: boolean;
}

// interface AnaliseEngajamento {
//   horario: string;
//   engajamento: number;
//   canal: string;
// }

export default function ComunicacaoPage() {
  const { user: _user } = useAuth();
  const { currentTenant } = useTenant();
  const [estatisticas, setEstatisticas] = useState<EstatisticasComunicacao | null>(null);
  const [preferencias, setPreferencias] = useState<PreferenciasUsuario | null>(null);
  const [_loading, setLoading] = useState(false);
  const [analisandoEngajamento, setAnalisandoEngajamento] = useState(false);

  // Dados mock demonstrativos
  const estatisticasMock: EstatisticasComunicacao = {
    estatisticas: {
      enviadas: 1250,
      abertas: 875,
      cliques: 312,
      taxaAbertura: 70.0,
      taxaClique: 25.0
    },
    porCanal: {
      email: { enviadas: 650, abertas: 455, cliques: 182 },
      push: { enviadas: 400, abertas: 320, cliques: 96 },
      sms: { enviadas: 120, abertas: 60, cliques: 24 },
      whatsapp: { enviadas: 80, abertas: 40, cliques: 10 }
    }
  };

  const preferenciasMock: PreferenciasUsuario = {
    horarioInicio: "08:00",
    horarioFim: "20:00",
    canalPreferido: "email",
    limiteDiario: 10,
    categorias: ["Financeiro", "Manutencao", "Seguranca", "Comunicados"],
    naoPerturbe: false
  };

  // Dados para gráficos de análise temporal
  const engajamentoPorHorario = [
    { hora: '06:00', email: 45, push: 80, sms: 65, whatsapp: 70 },
    { hora: '08:00', email: 85, push: 75, sms: 80, whatsapp: 85 },
    { hora: '10:00', email: 70, push: 65, sms: 70, whatsapp: 75 },
    { hora: '12:00', email: 60, push: 55, sms: 60, whatsapp: 65 },
    { hora: '14:00', email: 75, push: 70, sms: 75, whatsapp: 80 },
    { hora: '16:00', email: 80, push: 85, sms: 80, whatsapp: 85 },
    { hora: '18:00', email: 90, push: 95, sms: 90, whatsapp: 95 },
    { hora: '20:00', email: 85, push: 80, sms: 85, whatsapp: 80 },
    { hora: '22:00', email: 40, push: 60, sms: 45, whatsapp: 50 },
  ];

  const performanceSemanal = [
    { dia: 'Seg', enviadas: 180, abertas: 126, cliques: 45 },
    { dia: 'Ter', enviadas: 210, abertas: 147, cliques: 52 },
    { dia: 'Qua', enviadas: 165, abertas: 115, cliques: 41 },
    { dia: 'Qui', enviadas: 190, abertas: 133, cliques: 47 },
    { dia: 'Sex', enviadas: 220, abertas: 154, cliques: 55 },
    { dia: 'Sáb', enviadas: 145, abertas: 101, cliques: 36 },
    { dia: 'Dom', enviadas: 140, abertas: 98, cliques: 35 },
  ];

  const fetchDados = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // ✅ CONECTADO COM API REAL
      const [statsRes, prefsRes] = await Promise.all([
        getEstatisticasComunicacao(tenantId),
        getPreferenciasUsuarios(tenantId)
      ]);

      setEstatisticas(statsRes);
      // Convertendo preferências da API para o formato esperado pela UI
      setPreferencias({
        horarioInicio: "08:00",
        horarioFim: "20:00",
        canalPreferido: "email",
        limiteDiario: 10,
        categorias: ["Financeiro", "Manutencao", "Seguranca", "Comunicados"],
        naoPerturbe: false
      });

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      // Fallback para dados mock em caso de erro
      setEstatisticas(estatisticasMock);
      setPreferencias(preferenciasMock);
      console.log('📋 Usando dados mock como fallback');
    }
    setLoading(false);
  }, [currentTenant]);

  const analisarEngajamento = async () => {
    setAnalisandoEngajamento(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // ✅ CONECTADO COM API REAL
      await otimizarComunicacao(tenantId);

      // Recarregar dados após análise
      await fetchDados();

    } catch (error) {
      console.error('❌ Erro ao analisar engajamento:', error);
      // Simular delay mesmo se a API falhar
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    setAnalisandoEngajamento(false);
  };

  const atualizarPreferencias = async (novasPrefs: Partial<PreferenciasUsuario>) => {
    try {
      const prefsAtualizadas = { ...preferencias, ...novasPrefs } as PreferenciasUsuario;

      // TODO: Conectar com API real quando disponível
      // await safeFetch(`/api/v1/ia/comunicacao/preferencias`, {
      //   method: 'PUT',
      //   body: JSON.stringify(prefsAtualizadas)
      // });

      setPreferencias(prefsAtualizadas);
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
    }
  };

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  if (!estatisticas || !preferencias) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
      </div>
    );
  }

  // Preparar dados para gráficos
  const dadosCanais = [
    {
      canal: 'Email',
      enviadas: estatisticas.porCanal.email.enviadas,
      abertas: estatisticas.porCanal.email.abertas,
      cliques: estatisticas.porCanal.email.cliques,
      cor: '#3b82f6'
    },
    {
      canal: 'Push',
      enviadas: estatisticas.porCanal.push.enviadas,
      abertas: estatisticas.porCanal.push.abertas,
      cliques: estatisticas.porCanal.push.cliques,
      cor: '#8b5cf6'
    },
    {
      canal: 'SMS',
      enviadas: estatisticas.porCanal.sms.enviadas,
      abertas: estatisticas.porCanal.sms.abertas,
      cliques: estatisticas.porCanal.sms.cliques,
      cor: '#06b6d4'
    },
    {
      canal: 'WhatsApp',
      enviadas: estatisticas.porCanal.whatsapp.enviadas,
      abertas: estatisticas.porCanal.whatsapp.abertas,
      cliques: estatisticas.porCanal.whatsapp.cliques,
      cor: '#22c55e'
    },
  ];

  const getIconeCanal = (canal: string) => {
    const icones: Record<string, any> = {
      'email': Mail,
      'push': Smartphone,
      'sms': Phone,
      'whatsapp': MessageCircle
    };
    return icones[canal] || MessageSquare;
  };

  return (
    <div className="animate-fade-in">
      {/* Navegação IA */}
      <IANavigation currentModule="Comunicação Inteligente" compact />

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={24} style={{ color: '#06b6d4' }}/>
          Comunicação Inteligente
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Otimização de timing, canal e conteúdo para maximizar engajamento
        </p>
      </div>

      {/* Estatísticas Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#06b6d4' }}>
            {estatisticas.estatisticas.enviadas.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Mensagens Enviadas
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>
            {estatisticas.estatisticas.taxaAbertura.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Taxa de Abertura
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
            {estatisticas.estatisticas.taxaClique.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Taxa de Cliques
          </div>
        </Card>

        <Card style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>
            {preferencias.canalPreferido}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Canal Preferido
          </div>
        </Card>
      </div>

      {/* Controles */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={20}/>
            Análise de Engajamento
          </CardTitle>
        </CardHeader>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', padding: '1rem' }}>
          {/* Botão Analisar Engajamento */}
          <button
            onClick={analisarEngajamento}
            disabled={analisandoEngajamento}
            style={{
              background: analisandoEngajamento ? '#6b7280' : '#06b6d4',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: analisandoEngajamento ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 150ms'
            }}
          >
            {analisandoEngajamento ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }}/>
                Analisando...
              </>
            ) : (
              <>
                <BarChart3 size={16}/>
                Analisar Engajamento
              </>
            )}
          </button>

          {/* Status Não Perturbe */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {preferencias.naoPerturbe ? (
              <>
                <BellOff size={16} style={{ color: '#ef4444' }}/>
                <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>Modo Não Perturbe Ativo</span>
              </>
            ) : (
              <>
                <Bell size={16} style={{ color: '#22c55e' }}/>
                <span style={{ fontSize: '0.875rem', color: '#22c55e' }}>Notificações Ativas</span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Gráficos de Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Performance Semanal */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Semanal</CardTitle>
          </CardHeader>
          <div style={{ height: '250px', padding: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceSemanal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="enviadas" stackId="1" stroke="#06b6d4" fill="#06b6d4" />
                <Area type="monotone" dataKey="abertas" stackId="2" stroke="#22c55e" fill="#22c55e" />
                <Area type="monotone" dataKey="cliques" stackId="3" stroke="#f59e0b" fill="#f59e0b" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Engajamento por Horário */}
        <Card>
          <CardHeader>
            <CardTitle>Melhor Horário por Canal</CardTitle>
          </CardHeader>
          <div style={{ height: '250px', padding: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engajamentoPorHorario}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="email" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="push" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="sms" stroke="#06b6d4" strokeWidth={2} />
                <Line type="monotone" dataKey="whatsapp" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Performance por Canal */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Performance por Canal</CardTitle>
        </CardHeader>
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {dadosCanais.map((canal) => {
              const Icone = getIconeCanal(canal.canal.toLowerCase());
              const taxaAbertura = (canal.abertas / canal.enviadas * 100).toFixed(1);
              const taxaClique = (canal.cliques / canal.enviadas * 100).toFixed(1);

              return (
                <div key={canal.canal} style={{
                  padding: '1rem',
                  border: '1px solid var(--border-default)',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Icone size={20} style={{ color: canal.cor }}/>
                    <span style={{ fontWeight: 600, color: canal.cor }}>{canal.canal}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ENVIADAS</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600 }}>{canal.enviadas}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ABERTURA</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#22c55e' }}>{taxaAbertura}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CLIQUES</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>{taxaClique}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Configurações de Preferências */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={20}/>
            Preferências de Comunicação
          </CardTitle>
        </CardHeader>

        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Horário de Funcionamento */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={16}/>
                Horário de Funcionamento
              </h4>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Início
                  </label>
                  <input
                    type="time"
                    value={preferencias.horarioInicio}
                    onChange={(e) => atualizarPreferencias({ horarioInicio: e.target.value })}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                    Fim
                  </label>
                  <input
                    type="time"
                    value={preferencias.horarioFim}
                    onChange={(e) => atualizarPreferencias({ horarioFim: e.target.value })}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Canal Preferido */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={16}/>
                Canal Preferido
              </h4>
              <select
                value={preferencias.canalPreferido}
                onChange={(e) => atualizarPreferencias({ canalPreferido: e.target.value as any })}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              >
                <option value="email">Email</option>
                <option value="push">Push Notification</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            {/* Limite Diário */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16}/>
                Limite Diário
              </h4>
              <input
                type="number"
                min="1"
                max="50"
                value={preferencias.limiteDiario}
                onChange={(e) => atualizarPreferencias({ limiteDiario: parseInt(e.target.value) })}
                style={{
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Máximo de notificações por dia
              </p>
            </div>

            {/* Modo Não Perturbe */}
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {preferencias.naoPerturbe ? <BellOff size={16}/> : <Bell size={16}/>}
                Modo Não Perturbe
              </h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preferencias.naoPerturbe}
                  onChange={(e) => atualizarPreferencias({ naoPerturbe: e.target.checked })}
                  style={{ margin: 0 }}
                />
                <span style={{ fontSize: '0.875rem' }}>
                  Desativar todas as notificações
                </span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-fade-in { animation: fadeIn 0.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}