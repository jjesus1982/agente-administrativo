"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  Home, Users, Car, AlertTriangle, UserPlus, Wrench, Package, Calendar,
  Clock, ArrowRight, Bell, Megaphone, BarChart3, KeyRound,
  Vote, FolderOpen, ShoppingBag, PawPrint, UserCheck, RefreshCw,
  TrendingUp, Activity, Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, StatCard } from '@/components/ui';
import { safeFetch } from '@/lib/apiUtils';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title } from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title);

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

  // Skeleton Loading Components
  const StatCardSkeleton = () => (
    <Card className="bg-slate-800/50 border-slate-700 overflow-hidden group">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-slate-700/50 rounded-xl animate-pulse"></div>
          <div className="w-4 h-4 bg-slate-700/50 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="w-16 h-3 bg-slate-700/50 rounded animate-pulse"></div>
          <div className="w-8 h-6 bg-slate-700/50 rounded animate-pulse"></div>
        </div>
      </div>
    </Card>
  );

  const ModuleCardSkeleton = () => (
    <Card className="bg-slate-800/50 border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-slate-700/50 rounded animate-pulse"></div>
          <div className="w-24 h-5 bg-slate-700/50 rounded animate-pulse"></div>
        </div>
        <div className="w-4 h-4 bg-slate-700/50 rounded animate-pulse"></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
            <div className="w-16 h-3 bg-slate-700/50 rounded animate-pulse mb-2"></div>
            <div className="w-8 h-5 bg-slate-700/50 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (loading && !stats) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="w-48 h-7 bg-slate-700/50 rounded animate-pulse"></div>
          <div className="w-64 h-4 bg-slate-700/30 rounded animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>

        {/* Module Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <ModuleCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  // Dados para os gráficos
  const managementChartData = {
    labels: ['Unidades', 'Moradores', 'Dependentes', 'Veículos', 'Pets'],
    datasets: [{
      label: 'Gestão Geral',
      data: [
        stats?.gestao?.unidades || 0,
        stats?.gestao?.moradores || 0,
        stats?.gestao?.dependentes || 0,
        stats?.gestao?.veiculos || 0,
        stats?.gestao?.pets || 0
      ],
      backgroundColor: [
        'rgba(251, 191, 36, 0.8)',   // yellow-400
        'rgba(59, 130, 246, 0.8)',   // blue-500
        'rgba(139, 92, 246, 0.8)',   // violet-500
        'rgba(34, 197, 94, 0.8)',    // green-500
        'rgba(168, 85, 247, 0.8)'    // purple-500
      ],
      borderColor: [
        'rgba(251, 191, 36, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(168, 85, 247, 1)'
      ],
      borderWidth: 2
    }]
  };

  const activitiesData = {
    labels: ['Manutenção', 'Ocorrências', 'Comunicados', 'Visitantes', 'Encomendas'],
    datasets: [{
      label: 'Atividades',
      data: [
        (stats?.manutencao?.abertos || 0) + (stats?.manutencao?.em_andamento || 0),
        (stats?.ocorrencias?.abertas || 0) + (stats?.ocorrencias?.em_andamento || 0),
        stats?.comunicados?.total || 0,
        stats?.visitantes?.hoje || 0,
        stats?.encomendas?.pendentes || 0
      ],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Modernizado */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Olá, {firstName}
          </h1>
          <div className="animate-bounce">👋</div>
        </div>
        <p className="text-slate-400 text-lg">
          Resumo em tempo real do condomínio • Atualizado agora
        </p>
      </div>

      {/* Overview Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-slate-800/50 border-slate-700 p-6 group hover:bg-slate-800/70 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Gestão do Condomínio
            </h3>
            <TrendingUp className="w-5 h-5 text-green-400 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="h-64">
            <Bar
              data={managementChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: '#475569',
                    borderWidth: 1
                  }
                },
                scales: {
                  x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                  },
                  y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                  }
                }
              }}
            />
          </div>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 p-6 group hover:bg-slate-800/70 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Atividades Pendentes
            </h3>
            <Zap className="w-5 h-5 text-yellow-400 opacity-70 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="h-64">
            <Line
              data={activitiesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#cbd5e1',
                    borderColor: '#475569',
                    borderWidth: 1
                  }
                },
                scales: {
                  x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                  },
                  y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                  }
                }
              }}
            />
          </div>
        </Card>
      </div>

      {/* Stats Principais Modernizadas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard title="UNIDADES" value={stats?.gestao?.unidades || 0} icon={<Home size={24}/>} color="yellow"/>
        <StatCard title="MORADORES" value={stats?.gestao?.moradores || 0} icon={<Users size={24}/>} color="blue"/>
        <StatCard title="DEPENDENTES" value={stats?.gestao?.dependentes || 0} icon={<UserPlus size={24}/>} color="purple"/>
        <StatCard title="VEÍCULOS" value={stats?.gestao?.veiculos || 0} icon={<Car size={24}/>} color="green"/>
        <StatCard title="PETS" value={stats?.gestao?.pets || 0} icon={<PawPrint size={24}/>} color="purple"/>
      </div>

      {/* Cards de Módulos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {/* Manutenção */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-amber-500/20 hover:scale-[1.02] transition-all duration-300"
          onClick={() => router.push('/maintenance')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                <Wrench className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200">Manutenção</h3>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="ABERTOS" value={stats?.manutencao?.abertos || 0} color="#ef4444" />
            <MiniStat label="EM ANDAMENTO" value={stats?.manutencao?.em_andamento || 0} color="#f59e0b" />
            <MiniStat label="CONCLUÍDOS" value={stats?.manutencao?.concluidos || 0} color="#22c55e" />
            <MiniStat label="TOTAL" value={stats?.manutencao?.total || 0} color="#6b7280" />
          </div>
        </Card>

        {/* Ocorrências */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-red-500/20 hover:scale-[1.02] transition-all duration-300"
          onClick={() => router.push('/occurrences')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200">Ocorrências</h3>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="ABERTAS" value={stats?.ocorrencias?.abertas || 0} color="#ef4444" />
            <MiniStat label="EM ANDAMENTO" value={stats?.ocorrencias?.em_andamento || 0} color="#f59e0b" />
            <MiniStat label="RESOLVIDAS" value={stats?.ocorrencias?.resolvidas || 0} color="#22c55e" />
            <MiniStat label="TOTAL" value={stats?.ocorrencias?.total || 0} color="#6b7280" />
          </div>
        </Card>

        {/* Comunicados */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-300"
          onClick={() => router.push('/announcements')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <Megaphone className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-200">Comunicados</h3>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="TOTAL" value={stats?.comunicados?.total || 0} color="#3b82f6" />
            <MiniStat label="FIXADOS" value={stats?.comunicados?.fixados || 0} color="#8b5cf6" />
            <MiniStat label="VIEWS" value={stats?.comunicados?.visualizacoes || 0} color="#22c55e" />
            <MiniStat label="COMENTÁRIOS" value={stats?.comunicados?.comentarios || 0} color="#f59e0b" />
          </div>
        </Card>
      </div>

      {/* Segunda linha de módulos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Pesquisas */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-violet-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/surveys')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-500/20 rounded-lg group-hover:bg-violet-500/30 transition-colors">
                  <Vote className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Pesquisas</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-violet-400 mb-2">{stats?.pesquisas?.ativas || 0}</div>
          <div className="text-xs text-slate-400 mb-2">ativas</div>
          <div className="text-sm text-slate-300">{stats?.pesquisas?.votos || 0} votos</div>
        </Card>

        {/* Documentos */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-green-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/documents')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                  <FolderOpen className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Documentos</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-400 mb-2">{stats?.documentos?.arquivos || 0}</div>
          <div className="text-xs text-slate-400 mb-2">arquivos</div>
          <div className="text-sm text-slate-300">{formatBytes(stats?.documentos?.tamanho_bytes || 0)}</div>
        </Card>

        {/* Entre Vizinhos */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-amber-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/entre-vizinhos')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 transition-colors">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Entre Vizinhos</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-400 mb-2">{stats?.classificados?.ativos || 0}</div>
          <div className="text-xs text-slate-400 mb-2">anúncios ativos</div>
          <div className="text-sm text-slate-300">{stats?.classificados?.total || 0} total</div>
        </Card>

        {/* Visitantes */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-cyan-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/reports/visitors')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-colors">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Visitantes</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyan-400 mb-2">{stats?.visitantes?.hoje || 0}</div>
          <div className="text-xs text-slate-400 mb-2">hoje</div>
          <div className="text-sm text-slate-300">{stats?.visitantes?.semana || 0} na semana</div>
        </Card>
      </div>

      {/* Terceira linha - Reservas, Encomendas, Votação, Acessos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Reservas */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-pink-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/reservas')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-pink-500/20 rounded-lg group-hover:bg-pink-500/30 transition-colors">
                  <Calendar className="w-5 h-5 text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Reservas</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-pink-400 mb-2">{stats?.reservas?.futuras || 0}</div>
          <div className="text-xs text-slate-400 mb-2">agendadas</div>
          <div className="text-sm text-slate-300">{stats?.reservas?.areas_comuns || 0} áreas disponíveis</div>
        </Card>

        {/* Encomendas */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-orange-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/encomendas')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                  <Package className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Encomendas</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-400 mb-2">{stats?.encomendas?.pendentes || 0}</div>
          <div className="text-xs text-slate-400 mb-2">aguardando retirada</div>
          <div className="text-sm text-slate-300">{stats?.encomendas?.entregues || 0} entregues</div>
        </Card>

        {/* Votação */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-indigo-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/voting')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition-colors">
                  <Vote className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Votações</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-400 mb-2">{stats?.votacoes?.ativas || 0}</div>
          <div className="text-xs text-slate-400 mb-2">em andamento</div>
          <div className="text-sm text-slate-300">{stats?.votacoes?.participacao || 0}% participação</div>
        </Card>

        {/* Acessos Pendentes */}
        <Card
          className="bg-slate-800/50 border-slate-700 p-6 cursor-pointer group hover:bg-slate-800/70 hover:shadow-xl hover:shadow-teal-500/20 hover:scale-[1.02] transition-all duration-300 text-center"
          onClick={() => router.push('/reports/access-requests')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 w-full justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-500/20 rounded-lg group-hover:bg-teal-500/30 transition-colors">
                  <KeyRound className="w-5 h-5 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-200">Acessos</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-200 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
          <div className={`text-3xl font-bold mb-2 ${stats?.acessos?.pendentes ? 'text-red-400' : 'text-teal-400'}`}>
            {stats?.acessos?.pendentes || 0}
          </div>
          <div className="text-xs text-slate-400 mb-2">pendentes</div>
          <div className="text-sm text-slate-300">{stats?.acessos?.aprovados || 0} aprovados</div>
        </Card>
      </div>

      {/* Acesso Rápido - Relatórios */}
      <Card className="bg-slate-800/50 border-slate-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Relatórios</h3>
          </div>
          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Ver todos
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Moradores', path: '/reports/users', color: '#3b82f6', icon: Users },
            { label: 'Veículos', path: '/reports/vehicles', color: '#22c55e', icon: Car },
            { label: 'Visitantes', path: '/reports/visitors', color: '#06b6d4', icon: UserCheck },
            { label: 'Ocorrências', path: '/reports/occurrences', color: '#ef4444', icon: AlertTriangle },
            { label: 'Manutenções', path: '/reports/maintenance-general', color: '#f59e0b', icon: Wrench },
            { label: 'Reservas', path: '/reports/reservations', color: '#ec4899', icon: Calendar },
          ].map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="group p-4 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 hover:border-slate-500 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg text-left"
                style={{
                  '--hover-color': item.color,
                } as any}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.boxShadow = `0 4px 20px ${item.color}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#475569';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <IconComponent className="w-4 h-4" style={{ color: item.color }} />
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Atividades Recentes */}
      {atividades.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-700/50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200">Atividades Recentes</h3>
          </div>
          <div className="space-y-3">
            {atividades.slice(0, 5).map((ativ, i) => {
              const Icon = getIconForType(ativ.tipo);
              const iconColors: Record<string, string> = {
                'manutencao': '#f59e0b',
                'ocorrencia': '#ef4444',
                'comunicado': '#3b82f6',
                'visitante': '#06b6d4',
                'encomenda': '#f97316',
                'reserva': '#ec4899'
              };
              const iconColor = iconColors[ativ.tipo] || '#6b7280';

              return (
                <div key={i} className="group flex items-center gap-4 p-4 bg-slate-700/20 hover:bg-slate-700/40 rounded-lg transition-all duration-200 hover:scale-[1.01]">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                    style={{ backgroundColor: `${iconColor}20` }}
                  >
                    <Icon size={20} style={{ color: iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                      {ativ.titulo}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDate(ativ.data)}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-slate-400" />
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
    <div
      className="p-3 rounded-lg transition-all duration-200 hover:scale-105"
      style={{ backgroundColor: `${color}15` }}
    >
      <div
        className="text-xs font-semibold mb-1 uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </div>
      <div className="text-xl font-bold text-slate-200">
        {value.toLocaleString()}
      </div>
    </div>
  );
}
