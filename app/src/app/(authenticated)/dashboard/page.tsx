"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  Home, Users, Car, AlertTriangle, UserPlus, Wrench, Package, Calendar,
  Clock, ArrowRight, Bell, Megaphone, BarChart3, KeyRound,
  Vote, FolderOpen, ShoppingBag, PawPrint, UserCheck, RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui';
import { safeFetch } from '@/lib/apiUtils';

interface StatsCompleto {
  gestao: { unidades: number; moradores: number; dependentes: number; veiculos: number; pets: number; };
  visitantes: { total: number; hoje: number; semana: number; };
  manutencao: { total: number; abertos: number; em_andamento: number; concluidos: number; };
  ocorrencias: { total: number; abertas: number; em_andamento: number; resolvidas: number; };
  comunicados: { total: number; fixados: number; visualizacoes: number; comentarios: number; };
  pesquisas: { total: number; ativas: number; votos: number; };
  documentos: { arquivos: number; pastas: number; tamanho_bytes: number; };
  classificados: { total: number; ativos: number; };
  acessos: { pendentes: number; aprovados: number; };
  reservas: { areas_comuns: number; futuras: number; };
  encomendas: { pendentes: number; entregues: number; total: number; };
  votacoes: { ativas: number; total: number; participacao: number; };
}

interface Atividade { tipo: string; id: number; titulo: string; data: string; icone: string; }

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState<StatsCompleto | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;

      // Usa Promise.allSettled para não falhar se uma requisição falhar
      const [statsResult, atividadesResult] = await Promise.allSettled([
        safeFetch(`/dashboard/stats-completo?tenant_id=${tenantId}`),
        safeFetch(`/dashboard/atividades-recentes?tenant_id=${tenantId}`)
      ]);

      // Processa estatísticas
      if (statsResult.status === 'fulfilled') {
        const statsData = statsResult.value;
        if (statsData.error) {
          console.error('Stats API error:', statsData.error);
          // Fallback para dados padrão
          setStats({
            gestao: { unidades: 0, moradores: 0, dependentes: 0, veiculos: 0, pets: 0 },
            visitantes: { total: 0, hoje: 0, semana: 0 },
            manutencao: { total: 0, abertos: 0, em_andamento: 0, concluidos: 0 },
            ocorrencias: { total: 0, abertas: 0, em_andamento: 0, resolvidas: 0 },
            comunicados: { total: 0, fixados: 0, visualizacoes: 0, comentarios: 0 },
            pesquisas: { total: 0, ativas: 0, votos: 0 },
            documentos: { arquivos: 0, pastas: 0, tamanho_bytes: 0 },
            classificados: { total: 0, ativos: 0 },
            acessos: { pendentes: 0, aprovados: 0 },
            reservas: { areas_comuns: 0, futuras: 0 },
            encomendas: { pendentes: 0, entregues: 0, total: 0 },
            votacoes: { ativas: 0, total: 0, participacao: 0 }
          });
        } else {
          setStats(statsData);
        }
      } else {
        console.error('Stats error:', statsResult.reason);
        // Define dados padrão em caso de erro
        setStats({
          gestao: { unidades: 0, moradores: 0, dependentes: 0, veiculos: 0, pets: 0 },
          visitantes: { total: 0, hoje: 0, semana: 0 },
          manutencao: { total: 0, abertos: 0, em_andamento: 0, concluidos: 0 },
          ocorrencias: { total: 0, abertas: 0, em_andamento: 0, resolvidas: 0 },
          comunicados: { total: 0, fixados: 0, visualizacoes: 0, comentarios: 0 },
          pesquisas: { total: 0, ativas: 0, votos: 0 },
          documentos: { arquivos: 0, pastas: 0, tamanho_bytes: 0 },
          classificados: { total: 0, ativos: 0 },
          acessos: { pendentes: 0, aprovados: 0 },
          reservas: { areas_comuns: 0, futuras: 0 },
          encomendas: { pendentes: 0, entregues: 0, total: 0 },
          votacoes: { ativas: 0, total: 0, participacao: 0 }
        });
      }

      // Processa atividades
      if (atividadesResult.status === 'fulfilled') {
        const data = atividadesResult.value;
        setAtividades(data.items || []);
      } else {
        console.error('Activities error:', atividadesResult.reason);
        setAtividades([]);
      }
    } catch (e) {
      console.error('Dashboard unexpected error:', e);
    }
    setLoading(false);
  }, [currentTenant]);

  // Recarrega quando tenant muda
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Escuta evento de mudança de tenant
  useEffect(() => {
    const handleTenantChange = () => fetchData();
    window.addEventListener('tenantChanged', handleTenantChange);
    return () => window.removeEventListener('tenantChanged', handleTenantChange);
  }, [fetchData]);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // CORREÇÃO BUG #3: Função segura para calcular tempo relativo
  const formatDate = (dateStr: string) => {
    try {
      const agora = new Date();
      const passado = new Date(dateStr);

      // Guard 1: Validar timestamp
      if (isNaN(passado.getTime())) {
        console.error('🐛 BUG: Timestamp inválido:', dateStr);
        return 'Data inválida';
      }

      // Guard 2: Detectar data no futuro
      if (passado > agora) {
        console.warn('🔍 DEBUG: Data no futuro detectada:', {passado, agora, dateStr});
        return 'Há instantes'; // Tratar como "agora"
      }

      // Calcular diferença em milissegundos
      const diferencaMs = agora.getTime() - passado.getTime();
      const diferencaMin = Math.floor(diferencaMs / 60000);

      // Guard 3: Validar resultado negativo
      if (diferencaMin < 0) {
        console.error('🐛 BUG: Diferença negativa detectada:', {agora, passado, diferencaMin, dateStr});
        return 'Há instantes';
      }

      // Formatação hierárquica
      if (diferencaMin < 1) return 'Há instantes';
      if (diferencaMin < 60) return `${diferencaMin}min atrás`;

      const diferencaHoras = Math.floor(diferencaMin / 60);
      if (diferencaHoras < 24) return `${diferencaHoras}h atrás`;

      const diferencaDias = Math.floor(diferencaHoras / 24);
      return `${diferencaDias}d atrás`;

    } catch (error) {
      console.error('🐛 ERRO ao calcular tempo relativo:', error);
      return 'Data desconhecida';
    }
  };

  const getIconForType = (tipo: string) => {
    const icons: Record<string, any> = {
      'manutencao': Wrench, 'ocorrencia': AlertTriangle, 'comunicado': Megaphone,
      'visitante': UserCheck, 'encomenda': Package, 'reserva': Calendar
    };
    return icons[tipo] || Bell;
  };

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Olá, {firstName} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Resumo em tempo real do condomínio
        </p>
      </div>

      {/* Stats Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="UNIDADES" value={stats?.gestao?.unidades || 0} icon={<Home size={24}/>} color="yellow"/>
        <StatCard title="MORADORES" value={stats?.gestao?.moradores || 0} icon={<Users size={24}/>} color="blue"/>
        <StatCard title="DEPENDENTES" value={stats?.gestao?.dependentes || 0} icon={<UserPlus size={24}/>} color="purple"/>
        <StatCard title="VEÍCULOS" value={stats?.gestao?.veiculos || 0} icon={<Car size={24}/>} color="green"/>
        <StatCard title="PETS" value={stats?.gestao?.pets || 0} icon={<PawPrint size={24}/>} color="purple"/>
      </div>

      {/* Cards de Módulos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Manutenção */}
        <Card style={{ cursor: 'pointer' }} onClick={() => router.push('/maintenance')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={20} style={{ color: '#f59e0b' }}/> Manutenção
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <MiniStat label="ABERTOS" value={stats?.manutencao?.abertos || 0} color="#ef4444"/>
            <MiniStat label="EM ANDAMENTO" value={stats?.manutencao?.em_andamento || 0} color="#f59e0b"/>
            <MiniStat label="CONCLUÍDOS" value={stats?.manutencao?.concluidos || 0} color="#22c55e"/>
            <MiniStat label="TOTAL" value={stats?.manutencao?.total || 0} color="#6b7280"/>
          </div>
        </Card>

        {/* Ocorrências */}
        <Card style={{ cursor: 'pointer' }} onClick={() => router.push('/occurrences')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} style={{ color: '#ef4444' }}/> Ocorrências
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <MiniStat label="ABERTAS" value={stats?.ocorrencias?.abertas || 0} color="#ef4444"/>
            <MiniStat label="EM ANDAMENTO" value={stats?.ocorrencias?.em_andamento || 0} color="#f59e0b"/>
            <MiniStat label="RESOLVIDAS" value={stats?.ocorrencias?.resolvidas || 0} color="#22c55e"/>
            <MiniStat label="TOTAL" value={stats?.ocorrencias?.total || 0} color="#6b7280"/>
          </div>
        </Card>

        {/* Comunicados */}
        <Card style={{ cursor: 'pointer' }} onClick={() => router.push('/announcements')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={20} style={{ color: '#3b82f6' }}/> Comunicados
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <MiniStat label="TOTAL" value={stats?.comunicados?.total || 0} color="#3b82f6"/>
            <MiniStat label="FIXADOS" value={stats?.comunicados?.fixados || 0} color="#8b5cf6"/>
            <MiniStat label="VIEWS" value={stats?.comunicados?.visualizacoes || 0} color="#22c55e"/>
            <MiniStat label="COMENTÁRIOS" value={stats?.comunicados?.comentarios || 0} color="#f59e0b"/>
          </div>
        </Card>
      </div>

      {/* Segunda linha de módulos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Pesquisas */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/surveys')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Vote size={20} style={{ color: '#8b5cf6' }}/> Pesquisas
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6' }}>{stats?.pesquisas?.ativas || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ativas</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.pesquisas?.votos || 0} votos</div>
        </Card>

        {/* Documentos */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/documents')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderOpen size={20} style={{ color: '#22c55e' }}/> Documentos
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{stats?.documentos?.arquivos || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>arquivos</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{formatBytes(stats?.documentos?.tamanho_bytes || 0)}</div>
        </Card>

        {/* Entre Vizinhos */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/entre-vizinhos')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={20} style={{ color: '#f59e0b' }}/> Entre Vizinhos
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{stats?.classificados?.ativos || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>anúncios ativos</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.classificados?.total || 0} total</div>
        </Card>

        {/* Visitantes */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/reports/visitors')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={20} style={{ color: '#06b6d4' }}/> Visitantes
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#06b6d4' }}>{stats?.visitantes?.hoje || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hoje</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.visitantes?.semana || 0} na semana</div>
        </Card>
      </div>

      {/* Terceira linha - Reservas, Encomendas, Votação, Acessos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Reservas */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/reservas')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} style={{ color: '#ec4899' }}/> Reservas
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ec4899' }}>{stats?.reservas?.futuras || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>agendadas</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.reservas?.areas_comuns || 0} áreas disponíveis</div>
        </Card>

        {/* Encomendas */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/encomendas')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} style={{ color: '#f97316' }}/> Encomendas
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f97316' }}>{stats?.encomendas?.pendentes || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>aguardando retirada</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.encomendas?.entregues || 0} entregues</div>
        </Card>

        {/* Votação */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/voting')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Vote size={20} style={{ color: '#6366f1' }}/> Votações
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6366f1' }}>{stats?.votacoes?.ativas || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>em andamento</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.votacoes?.participacao || 0}% participação</div>
        </Card>

        {/* Acessos Pendentes */}
        <Card style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push('/reports/access-requests')}>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={20} style={{ color: '#14b8a6' }}/> Acessos
            </CardTitle>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }}/>
          </CardHeader>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: stats?.acessos?.pendentes ? '#ef4444' : '#14b8a6' }}>{stats?.acessos?.pendentes || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>pendentes</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{stats?.acessos?.aprovados || 0} aprovados</div>
        </Card>
      </div>

      {/* Acesso Rápido - Relatórios */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--accent)' }}/> Relatórios
          </CardTitle>
          <button
            onClick={() => router.push('/reports')}
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Ver todos <ArrowRight size={14}/>
          </button>
        </CardHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Moradores', path: '/reports/users', color: '#3b82f6' },
            { label: 'Veículos', path: '/reports/vehicles', color: '#22c55e' },
            { label: 'Visitantes', path: '/reports/visitors', color: '#06b6d4' },
            { label: 'Ocorrências', path: '/reports/occurrences', color: '#ef4444' },
            { label: 'Manutenções', path: '/reports/maintenance-general', color: '#f59e0b' },
            { label: 'Reservas', path: '/reports/reservations', color: '#ec4899' },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-tertiary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = item.color;
                e.currentTarget.style.background = `${item.color}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: item.color }}>{item.label}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Atividades Recentes */}
      {atividades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} style={{ color: 'var(--text-muted)' }}/> Atividades Recentes
            </CardTitle>
          </CardHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {atividades.slice(0, 5).map((ativ, i) => {
              const Icon = getIconForType(ativ.tipo);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} style={{ color: 'var(--text-muted)' }}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{ativ.titulo}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(ativ.data)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: '0.5rem', borderRadius: '8px', background: `${color}15` }}>
      <div style={{ fontSize: '0.65rem', color, fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
