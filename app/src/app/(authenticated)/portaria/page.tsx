"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import {
  Users, Car, UserCheck, Package, DoorOpen, Clock, AlertTriangle,
  ArrowRight, RefreshCw, LogIn, LogOut, Shield, QrCode, ParkingSquare,
  Phone, CheckCircle, XCircle, Eye
} from 'lucide-react';
import { Card, CardHeader, CardTitle, StatCard, Button } from '@/components/ui';
import { api } from '@/lib/api';

interface DashboardStats {
  visitantes_hoje: number;
  veiculos_estacionados: number;
  acessos_hoje: number;
  encomendas_pendentes: number;
  ocorrencias_abertas: number;
  pre_autorizacoes_ativas: number;
  vagas_disponiveis: number;
  vagas_total: number;
}

interface AcessoRecente {
  id: number;
  tipo: 'entrada' | 'saida';
  pessoa_nome: string;
  pessoa_tipo: string;
  ponto_acesso: string;
  data_hora: string;
  foto_url?: string;
}

interface TurnoInfo {
  porteiro_nome: string;
  inicio_turno: string;
  tempo_ativo: string;
  acessos_registrados: number;
}

export default function PortariaDashboardPage() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [acessos, setAcessos] = useState<AcessoRecente[]>([]);
  const [turno, setTurno] = useState<TurnoInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, turnoRes] = await Promise.all([
        api.get('/portaria/dashboard'),
        api.get('/portaria/turno')
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data.stats);
        setAcessos(data.ultimos_acessos || []);
      } else {
        console.error('Dashboard API error:', dashboardRes.status);
      }

      if (turnoRes.ok) {
        const data = await turnoRes.json();
        setTurno(data);
      } else {
        console.error('Turno API error:', turnoRes.status);
      }
    } catch (e: any) {
      console.error('Erro ao carregar dados do dashboard:', e);
      alert(`Erro ao carregar dashboard: ${e.message}`);
      // Estado vazio - sem mock data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // CORREÇÃO BUG #3: Função segura para tempo relativo (versão portaria)
  const formatRelativeTime = (dateStr: string) => {
    try {
      const agora = Date.now();
      const passado = new Date(dateStr).getTime();

      // Guard 1: Validar timestamp
      if (isNaN(passado)) {
        console.error('🐛 BUG: Timestamp inválido na portaria:', dateStr);
        return 'Erro';
      }

      const diff = agora - passado;
      const minutes = Math.floor(diff / 60000);

      // Guard 2: Detectar diferença negativa
      if (minutes < 0) {
        console.warn('🔍 DEBUG: Tempo negativo na portaria:', {agora, passado, minutes, dateStr});
        return 'Agora';
      }

      // Formatação
      if (minutes < 1) return 'Agora';
      if (minutes < 60) return `${minutes}min`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h`;
    } catch (error) {
      console.error('🐛 ERRO na formatação de tempo da portaria:', error);
      return 'Erro';
    }
  };

  // CORREÇÃO BUG #2: Função segura para calcular ocupação da garagem
  const calcularOcupacaoGaragem = (stats: DashboardStats | null) => {
    try {
      // Guard 1: Verificar se stats existe
      if (!stats) {
        console.warn('🔍 DEBUG: Stats da garagem não disponíveis');
        return { percentual: 0, ocupadas: 0, total: 0 };
      }

      const ocupadas = stats.vagas_total - stats.vagas_disponiveis;
      const total = stats.vagas_total;

      // Guard 2: Validar inputs são números
      if (typeof ocupadas !== 'number' || typeof total !== 'number') {
        console.warn('🔍 DEBUG: Dados de garagem inválidos:', {ocupadas, total, stats});
        return { percentual: 0, ocupadas: 0, total: 0 };
      }

      // Guard 3: Evitar divisão por zero
      if (total === 0) {
        console.warn('🔍 DEBUG: Total de vagas é zero');
        return { percentual: 0, ocupadas: 0, total: 0 };
      }

      // Guard 4: Validar números negativos
      if (ocupadas < 0 || total < 0) {
        console.warn('🔍 DEBUG: Números negativos detectados:', {ocupadas, total});
        return { percentual: 0, ocupadas: Math.max(0, ocupadas), total: Math.max(0, total) };
      }

      // Calcular ocupação
      const percentual = (ocupadas / total) * 100;

      // Guard 5: Validar resultado
      if (isNaN(percentual)) {
        console.error('🐛 BUG: Cálculo resultou em NaN:', {ocupadas, total, stats});
        return { percentual: 0, ocupadas, total };
      }

      const resultado = {
        percentual: Math.round(percentual),
        ocupadas,
        total
      };

      console.log('🔍 DEBUG: Ocupação calculada:', resultado);
      return resultado;
    } catch (error) {
      console.error('🐛 ERRO ao calcular ocupação da garagem:', error);
      return { percentual: 0, ocupadas: 0, total: 0 };
    }
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Turno Info */}
      {turno && (
        <Card style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Shield size={24} style={{ color: 'white' }} />
              </div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Em servi\u00e7o</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{turno.porteiro_nome}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                  <Clock size={12} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  {turno.tempo_ativo} | {turno.acessos_registrados} acessos
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                onClick={() => router.push('/portaria/visitas')}
                style={{ background: 'white', color: 'var(--accent)' }}
              >
                <UserCheck size={16} /> Registrar Visita
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard
          title="VISITANTES HOJE"
          value={stats?.visitantes_hoje || 0}
          icon={<Users size={24} />}
          color="blue"
          onClick={() => router.push('/portaria/visitas')}
        />
        <StatCard
          title="VE\u00cdCULOS"
          value={stats?.veiculos_estacionados || 0}
          icon={<Car size={24} />}
          color="green"
          onClick={() => router.push('/portaria/veiculos')}
        />
        <StatCard
          title="ACESSOS HOJE"
          value={stats?.acessos_hoje || 0}
          icon={<DoorOpen size={24} />}
          color="purple"
          onClick={() => router.push('/portaria/acessos')}
        />
        <StatCard
          title="ENCOMENDAS"
          value={stats?.encomendas_pendentes || 0}
          icon={<Package size={24} />}
          color="yellow"
          onClick={() => router.push('/encomendas')}
        />
        <StatCard
          title="OCORR\u00caNCIAS"
          value={stats?.ocorrencias_abertas || 0}
          icon={<AlertTriangle size={24} />}
          color={stats?.ocorrencias_abertas ? 'red' : 'gray'}
          onClick={() => router.push('/occurrences')}
        />
        <StatCard
          title="PR\u00c9-AUTORIZA\u00c7\u00d5ES"
          value={stats?.pre_autorizacoes_ativas || 0}
          icon={<QrCode size={24} />}
          color="cyan"
          onClick={() => router.push('/portaria/pre-autorizacoes')}
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
        {/* Feed de Acessos */}
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} style={{ color: 'var(--accent)' }} /> Acessos em Tempo Real
            </CardTitle>
            <button
              onClick={() => router.push('/portaria/acessos')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              Ver todos <ArrowRight size={14} />
            </button>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            {acessos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                Nenhum acesso registrado hoje
              </div>
            ) : (
              acessos.map((acesso) => (
                <div
                  key={acesso.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    borderLeft: `3px solid ${acesso.tipo === 'entrada' ? '#22c55e' : '#ef4444'}`,
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: acesso.tipo === 'entrada' ? '#22c55e20' : '#ef444420',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {acesso.tipo === 'entrada' ? (
                      <LogIn size={18} style={{ color: '#22c55e' }} />
                    ) : (
                      <LogOut size={18} style={{ color: '#ef4444' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{acesso.pessoa_nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {acesso.pessoa_tipo} \u2022 {acesso.ponto_acesso}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{formatTime(acesso.data_hora)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatRelativeTime(acesso.data_hora)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* A\u00e7\u00f5es R\u00e1pidas + Vagas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Ocupa\u00e7\u00e3o da Garagem */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ParkingSquare size={20} style={{ color: '#22c55e' }} /> Garagem
              </CardTitle>
              <button
                onClick={() => router.push('/portaria/garagem')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                Ver mapa <ArrowRight size={14} />
              </button>
            </CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ocupa\u00e7\u00e3o</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {/* CORREÇÃO BUG #2: Usar função segura */}
                    {calcularOcupacaoGaragem(stats).percentual}%
                  </span>
                </div>
                <div style={{
                  height: '8px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    /* CORREÇÃO BUG #2: Usar função segura */
                    width: `${calcularOcupacaoGaragem(stats).percentual}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #22c55e, #f59e0b)',
                    borderRadius: '4px',
                    transition: 'width 300ms ease',
                  }} />
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{stats?.vagas_disponiveis || 0}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LIVRES</div>
              </div>
            </div>
          </Card>

          {/* A\u00e7\u00f5es R\u00e1pidas */}
          <Card>
            <CardHeader>
              <CardTitle>A\u00e7\u00f5es R\u00e1pidas</CardTitle>
            </CardHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <QuickActionButton
                icon={<UserCheck size={20} />}
                label="Nova Visita"
                color="#3b82f6"
                onClick={() => router.push('/portaria/visitas?action=new')}
              />
              <QuickActionButton
                icon={<QrCode size={20} />}
                label="Gerar QR"
                color="#8b5cf6"
                onClick={() => router.push('/portaria/pre-autorizacoes?action=new')}
              />
              <QuickActionButton
                icon={<Package size={20} />}
                label="Encomenda"
                color="#f59e0b"
                onClick={() => router.push('/encomendas?action=new')}
              />
              <QuickActionButton
                icon={<AlertTriangle size={20} />}
                label="Ocorr\u00eancia"
                color="#ef4444"
                onClick={() => router.push('/occurrences?action=new')}
              />
              <QuickActionButton
                icon={<Phone size={20} />}
                label="Interfone"
                color="#06b6d4"
                onClick={() => {}}
              />
              <QuickActionButton
                icon={<DoorOpen size={20} />}
                label="Abrir Port\u00e3o"
                color="#22c55e"
                onClick={() => router.push('/portaria/pontos-acesso')}
              />
            </div>
          </Card>

          {/* Pr\u00e9-autoriza\u00e7\u00f5es do Dia */}
          <Card>
            <CardHeader>
              <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={20} style={{ color: '#8b5cf6' }} /> Pr\u00e9-autoriza\u00e7\u00f5es Hoje
              </CardTitle>
            </CardHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <PreAuthItem
                nome="Entrega iFood"
                unidade="Apt 101"
                status="ativa"
                validade="at\u00e9 18:00"
              />
              <PreAuthItem
                nome="T\u00e9cnico NET"
                unidade="Apt 502"
                status="ativa"
                validade="at\u00e9 17:00"
              />
              <PreAuthItem
                nome="Jo\u00e3o (Primo)"
                unidade="Apt 304"
                status="utilizada"
                validade="12:30"
              />
            </div>
          </Card>
        </div>
      </div>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '1rem',
        borderRadius: '12px',
        border: `1px solid ${color}30`,
        background: `${color}10`,
        cursor: 'pointer',
        transition: 'all 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}20`;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${color}10`;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ color }}>{icon}</div>
      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
    </button>
  );
}

function PreAuthItem({
  nome,
  unidade,
  status,
  validade
}: {
  nome: string;
  unidade: string;
  status: 'ativa' | 'utilizada' | 'expirada';
  validade: string;
}) {
  const statusConfig = {
    ativa: { icon: <CheckCircle size={14} />, color: '#22c55e', label: 'Ativa' },
    utilizada: { icon: <Eye size={14} />, color: '#6b7280', label: 'Utilizada' },
    expirada: { icon: <XCircle size={14} />, color: '#ef4444', label: 'Expirada' },
  };
  const cfg = statusConfig[status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.625rem',
      borderRadius: '8px',
      background: 'var(--bg-tertiary)',
    }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{nome}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{unidade}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: cfg.color, fontSize: '0.75rem' }}>
          {cfg.icon} {cfg.label}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{validade}</div>
      </div>
    </div>
  );
}
