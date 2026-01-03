"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar, Users, ChevronLeft, ChevronRight, Check, X, Sparkles, PartyPopper,
  Clock, AlertCircle, Trash2, CalendarCheck, ChevronRight as Arrow,
  BarChart3, TrendingUp, Zap
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface Area { id: number; name: string; description: string; capacity: number; }
interface DiaReserva { id: number; start_time: string; end_time: string; user_name: string; unit: string; event_name: string; status: string; }
interface MinhaReserva { id: number; date: string; start_time: string; end_time: string; status: string; event_name: string; area_name: string; created_at: string; }

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const TIPOS_EVENTO = ['Aniversário', 'Churrasco', 'Confraternização', 'Reunião', 'Festa', 'Outro'];

export default function ReservasPage() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [diasOcupados, setDiasOcupados] = useState<Record<string, DiaReserva[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [minhasReservas, setMinhasReservas] = useState<MinhaReserva[]>([]);
  
  // Form states
  const [step, setStep] = useState(1);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('22:00');
  const [tipoEvento, setTipoEvento] = useState('');
  const [nomeEvento, setNomeEvento] = useState('');
  const [qtdConvidados, setQtdConvidados] = useState('');

  // Fetch áreas
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservas/areas?tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await res.json();
        const uniqueAreas = data.items?.reduce((acc: Area[], curr: Area) => {
          if (!acc.find(a => a.name === curr.name)) acc.push(curr);
          return acc;
        }, []) || [];
        setAreas(uniqueAreas);
        if (uniqueAreas.length > 0) setSelectedArea(uniqueAreas[0]);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAreas();
  }, [currentTenant]);

  // Fetch calendário
  useEffect(() => {
    if (!selectedArea) return;
    const fetchCalendario = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservas/calendario/${selectedArea.id}?month=${currentMonth}&year=${currentYear}&tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await res.json();
        setDiasOcupados(data.dias_ocupados || {});
      } catch (e) { console.error(e); }
    };
    fetchCalendario();
  }, [selectedArea, currentMonth, currentYear, currentTenant]);

  // Fetch minhas reservas
  useEffect(() => {
    if (!user) return;
    const fetchMinhas = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservas/minhas?user_id=${user.id}&tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await res.json();
        setMinhasReservas(data.items || []);
      } catch (e) { console.error(e); }
    };
    fetchMinhas();
  }, [user, currentTenant, success]);

  const getDiasDoMes = () => {
    const primeiroDia = new Date(currentYear, currentMonth - 1, 1);
    const ultimoDia = new Date(currentYear, currentMonth, 0);
    const dias: (number | null)[] = [];
    for (let i = 0; i < primeiroDia.getDay(); i++) dias.push(null);
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(i);
    return dias;
  };

  const resetForm = () => {
    setStep(1);
    setHoraInicio('08:00');
    setHoraFim('22:00');
    setTipoEvento('');
    setNomeEvento('');
    setQtdConvidados('');
  };

  const handleReservar = async () => {
    if (!selectedDate || !selectedArea || !user) return;
    try {
      const res = await fetch(`${API_BASE}/reservas/?user_id=${user.id}&unit_id=1&tenant_id=${currentTenant?.tenant_id || 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          area_id: selectedArea.id, 
          date: selectedDate, 
          start_time: horaInicio, 
          end_time: horaFim, 
          event_name: nomeEvento || tipoEvento,
          expected_guests: qtdConvidados ? parseInt(qtdConvidados) : null
        })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { 
          setShowModal(false); 
          setSuccess(false); 
          setSelectedDate(null);
          resetForm();
        }, 2500);
        const cal = await fetch(`${API_BASE}/reservas/calendario/${selectedArea.id}?month=${currentMonth}&year=${currentYear}&tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await cal.json();
        setDiasOcupados(data.dias_ocupados || {});
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao reservar');
      }
    } catch (_) { alert('Erro ao reservar'); }
  };

  const handleCancelar = async (reservaId: number) => {
    if (!confirm('Deseja cancelar esta reserva?')) return;
    try {
      const res = await fetch(`${API_BASE}/reservas/${reservaId}?user_id=${user?.id}&tenant_id=${currentTenant?.tenant_id || 1}`, { method: 'DELETE' });
      if (res.ok) {
        setMinhasReservas(prev => prev.filter(r => r.id !== reservaId));
        // Refresh calendar
        if (selectedArea) {
          const cal = await fetch(`${API_BASE}/reservas/calendario/${selectedArea.id}?month=${currentMonth}&year=${currentYear}&tenant_id=${currentTenant?.tenant_id || 1}`);
          const data = await cal.json();
          setDiasOcupados(data.dias_ocupados || {});
        }
      }
    } catch (_) { alert('Erro ao cancelar'); }
  };

  const hoje = new Date();
  const dias = getDiasDoMes();

  // Skeleton Loading Components
  const AreaCardSkeleton = () => (
    <div className="p-4 bg-slate-700/20 border border-slate-600 rounded-xl animate-pulse">
      <div className="w-24 h-4 bg-slate-600/50 rounded mb-2"></div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-slate-600/50 rounded"></div>
        <div className="w-16 h-3 bg-slate-600/50 rounded"></div>
      </div>
    </div>
  );

  const CalendarSkeleton = () => (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="w-32 h-6 bg-slate-600/50 rounded animate-pulse"></div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-600/50 rounded animate-pulse"></div>
          <div className="w-24 h-4 bg-slate-600/50 rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-slate-600/50 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="aspect-square bg-slate-600/20 rounded-lg animate-pulse"></div>
        ))}
      </div>
    </div>
  );

  const ReservationSkeleton = () => (
    <div className="p-4 bg-slate-700/20 border border-slate-600 rounded-xl animate-pulse">
      <div className="w-20 h-4 bg-slate-600/50 rounded mb-2"></div>
      <div className="w-16 h-3 bg-slate-600/50 rounded mb-1"></div>
      <div className="w-24 h-3 bg-slate-600/50 rounded"></div>
    </div>
  );

  // Chart data for reservations analytics
  const reservationStats = {
    labels: ['Esta Semana', 'Próxima Semana', 'Este Mês'],
    datasets: [{
      label: 'Reservas',
      data: [
        minhasReservas.filter(r => new Date(r.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        minhasReservas.filter(r => {
          const date = new Date(r.date);
          const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const weekAfter = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          return date >= nextWeek && date <= weekAfter;
        }).length,
        minhasReservas.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length
      ],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)'],
      borderColor: ['#22c55e', '#3b82f6', '#8b5cf6'],
      borderWidth: 2
    }]
  };

  const areaUsageData = {
    labels: areas.map(a => a.name.split(' ')[0]),
    datasets: [{
      label: 'Uso das Áreas',
      data: areas.map(area => {
        // Count reservations for this area
        return Object.values(diasOcupados).flat().filter(r =>
          areas.find(a => a.id === area.id)?.name === area.name
        ).length;
      }),
      backgroundColor: 'rgba(236, 72, 153, 0.6)',
      borderColor: 'rgba(236, 72, 153, 1)',
      borderWidth: 2
    }]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 bg-slate-700/50 rounded-2xl animate-pulse"></div>
            <div className="space-y-2">
              <div className="w-32 h-7 bg-slate-700/50 rounded animate-pulse"></div>
              <div className="w-48 h-4 bg-slate-700/30 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="w-32 h-5 bg-slate-700/50 rounded animate-pulse mb-4"></div>
              <div className="h-64 bg-slate-700/20 rounded-xl animate-pulse"></div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="w-24 h-5 bg-slate-700/50 rounded animate-pulse mb-4"></div>
              <div className="h-64 bg-slate-700/20 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="w-16 h-5 bg-slate-700/50 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <AreaCardSkeleton key={i} />)}
              </div>
            </div>
            <div className="xl:col-span-2 bg-slate-800/50 border border-slate-700 rounded-2xl">
              <CalendarSkeleton />
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="w-28 h-5 bg-slate-700/50 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <ReservationSkeleton key={i} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 relative overflow-hidden">
      {/* Modern Gradient Orbs */}
      <div className="absolute -top-32 -right-20 w-96 h-96 bg-gradient-to-br from-violet-500/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-gradient-to-tr from-blue-500/15 to-cyan-400/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto relative space-y-6">
        {/* Modern Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-xl group-hover:shadow-violet-500/30 transition-all duration-300">
            <Calendar className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                Reservas
              </h1>
              <div className="animate-bounce">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-slate-400 text-lg">Reserve áreas comuns do condomínio</p>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 group hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-400" />
                Minhas Reservas
              </h3>
              <TrendingUp className="w-5 h-5 text-green-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="h-64">
              {reservationStats.datasets[0].data.some(d => d > 0) ? (
                <Bar
                  data={reservationStats}
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
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                      },
                      y: {
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Nenhuma reserva ainda</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 group hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-pink-400" />
                Uso das Áreas
              </h3>
              <Zap className="w-5 h-5 text-yellow-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="h-64">
              {areaUsageData.datasets[0].data.some(d => d > 0) ? (
                <Doughnut
                  data={areaUsageData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: '#94a3b8',
                          font: { size: 11 },
                          padding: 15
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#cbd5e1',
                        borderColor: '#475569',
                        borderWidth: 1
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <PartyPopper className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Aguardando dados de uso</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Modern Main Grid - Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Painel 1: Áreas */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-700/50 bg-slate-700/20">
            <h2 className="text-slate-200 text-base font-bold flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 rounded-lg">
                <PartyPopper className="w-4 h-4 text-amber-400" />
              </div>
              Áreas Comuns
            </h2>
          </div>
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
            {areas.map(area => (
              <div
                key={area.id}
                onClick={() => setSelectedArea(area)}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-300 group ${
                  selectedArea?.id === area.id
                    ? 'bg-gradient-to-br from-violet-500/30 to-pink-500/20 border border-violet-400/40 scale-[1.02] shadow-lg shadow-violet-500/20'
                    : 'bg-slate-700/20 border border-slate-600/30 hover:bg-slate-700/40 hover:border-slate-500/50 hover:scale-[1.01]'
                }`}
              >
                <div className="font-semibold text-white text-sm mb-1 group-hover:text-slate-100 transition-colors">
                  {area.name}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Users className="w-3 h-3" />
                  <span>{area.capacity} pessoas</span>
                </div>
                {area.description && (
                  <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {area.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Painel 2: Calendário */}
        <div className="xl:col-span-2 bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden">
          {selectedArea ? (
            <>
              <div className="p-6 bg-gradient-to-r from-violet-500/15 to-pink-500/10 border-b border-slate-700/50">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-white text-xl font-bold mb-2">{selectedArea.name}</h2>
                    <div className="flex gap-4">
                      <span className="flex items-center gap-2 text-slate-400 text-sm">
                        <Users className="w-4 h-4" />
                        {selectedArea.capacity} pessoas
                      </span>
                      <span className="flex items-center gap-2 text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        08h às 22h
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (currentMonth === 1) {
                          setCurrentMonth(12);
                          setCurrentYear(y => y - 1);
                        } else {
                          setCurrentMonth(m => m - 1);
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="min-w-36 text-center font-bold text-lg text-white">
                      {MESES[currentMonth - 1]} {currentYear}
                    </span>
                    <button
                      onClick={() => {
                        if (currentMonth === 12) {
                          setCurrentMonth(1);
                          setCurrentYear(y => y + 1);
                        } else {
                          setCurrentMonth(m => m + 1);
                        }
                      }}
                      className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all duration-200 flex items-center justify-center hover:scale-105 active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Legenda Modernizada */}
              <div className="flex gap-6 px-6 py-3 border-b border-slate-700/30 text-sm">
                <span className="flex items-center gap-2 text-slate-400">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-green-500 to-emerald-600"></div>
                  Disponível
                </span>
                <span className="flex items-center gap-2 text-slate-400">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-red-500 to-red-600"></div>
                  Ocupado
                </span>
                <span className="flex items-center gap-2 text-slate-400">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-violet-500 to-purple-600 ring-2 ring-violet-400/50"></div>
                  Hoje
                </span>
              </div>

              {/* Calendário Modernizado */}
              <div className="p-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {DIAS_SEMANA.map((dia, i) => (
                    <div key={i} className="text-center text-xs font-bold text-slate-500 p-2 uppercase tracking-wide">
                      {dia}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {dias.map((dia, idx) => {
                    if (dia === null) return <div key={idx}></div>;
                    const dataStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const reservasDoDia = diasOcupados[dataStr] || [];
                    const ocupado = reservasDoDia.length > 0;
                    const passado = new Date(dataStr) < new Date(hoje.toDateString());
                    const ehHoje = dia === hoje.getDate() && currentMonth === hoje.getMonth() + 1 && currentYear === hoje.getFullYear();

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!passado && !ocupado) {
                            setSelectedDate(dataStr);
                            setShowModal(true);
                          } else if (ocupado) {
                            setSelectedDate(dataStr);
                          }
                        }}
                        className={`
                          aspect-square flex flex-col items-center justify-center rounded-xl transition-all duration-200 cursor-pointer group
                          ${ehHoje
                            ? 'bg-gradient-to-br from-violet-500/40 to-purple-600/30 border-2 border-violet-400 shadow-lg shadow-violet-500/25'
                            : ocupado
                              ? 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-400/30 hover:from-red-500/30 hover:to-red-600/20'
                              : passado
                                ? 'bg-slate-700/10 border border-transparent opacity-40 cursor-default'
                                : 'bg-gradient-to-br from-green-500/20 to-emerald-600/10 border border-green-400/30 hover:from-green-500/30 hover:to-emerald-600/20 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20'
                          }
                        `}
                      >
                        <span className={`text-sm font-semibold transition-colors ${
                          ehHoje
                            ? 'text-violet-200 font-bold'
                            : ocupado
                              ? 'text-red-300 group-hover:text-red-200'
                              : passado
                                ? 'text-slate-500'
                                : 'text-green-300 group-hover:text-green-200'
                        }`}>
                          {dia}
                        </span>
                        {ocupado && (
                          <div className="w-1 h-1 bg-red-400 rounded-full mt-1"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info dia selecionado ocupado */}
              {selectedDate && diasOcupados[selectedDate] && !showModal && (
                <div className="mx-6 mb-6 p-4 rounded-xl bg-red-500/10 border border-red-400/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="font-bold text-white text-sm">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - Ocupado
                    </span>
                  </div>
                  <div className="space-y-2">
                    {diasOcupados[selectedDate].map((r, i) => (
                      <div key={i} className="text-slate-300 text-sm bg-red-500/5 p-2 rounded-lg">
                        <span className="font-medium text-white">{r.user_name}</span>
                        <span className="text-slate-400"> • {r.start_time} - {r.end_time}</span>
                        {r.event_name && (
                          <div className="text-xs text-red-300 mt-1">{r.event_name}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-16 text-center">
              <Calendar className="w-16 h-16 text-slate-500 mx-auto mb-4 opacity-30" />
              <p className="text-slate-400">Selecione uma área para visualizar o calendário</p>
            </div>
          )}
        </div>

        {/* Painel 3: Minhas Reservas */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-700/50 bg-slate-700/20">
            <h2 className="text-slate-200 text-base font-bold flex items-center gap-2">
              <div className="p-1.5 bg-green-500/20 rounded-lg">
                <CalendarCheck className="w-4 h-4 text-green-400" />
              </div>
              Minhas Reservas
            </h2>
          </div>
          <div className="p-3 max-h-96 overflow-y-auto custom-scrollbar">
            {minhasReservas.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarCheck className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-30" />
                <p className="text-slate-400 text-sm">Você ainda não tem reservas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {minhasReservas.map(reserva => {
                  const isPast = new Date(reserva.date) < new Date(hoje.toDateString());
                  const isCancelled = reserva.status === 'cancelled';
                  return (
                    <div
                      key={reserva.id}
                      className={`p-4 rounded-xl transition-all duration-200 group ${
                        isCancelled
                          ? 'bg-red-500/10 border border-red-400/20 opacity-60'
                          : isPast
                            ? 'bg-slate-700/20 border border-slate-600/20 opacity-60'
                            : 'bg-green-500/10 border border-green-400/20 hover:bg-green-500/15 hover:border-green-400/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-white text-sm group-hover:text-slate-100 transition-colors">
                          {reserva.area_name}
                        </div>
                        {!isPast && !isCancelled && (
                          <button
                            onClick={() => handleCancelar(reserva.id)}
                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 rounded-lg p-2 transition-all duration-200 hover:scale-105 active:scale-95 group/btn"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover/btn:text-red-300" />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1 text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(reserva.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{reserva.start_time} - {reserva.end_time}</span>
                        </div>
                        {reserva.event_name && (
                          <div className="flex items-center gap-2">
                            <PartyPopper className="w-3 h-3" />
                            <span className="text-violet-300">{reserva.event_name}</span>
                          </div>
                        )}
                      </div>
                      {isCancelled && (
                        <div className="mt-2 inline-block">
                          <span className="text-xs font-semibold text-red-400 bg-red-500/20 px-2 py-1 rounded-md">
                            CANCELADA
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for scrollbars */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(71, 85, 105, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
      </div>

      {/* Modal Multi-Step */}
      {showModal && selectedDate && selectedArea && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !success && (setShowModal(false), resetForm())}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: success ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.08))' : 'rgba(20, 20, 40, 0.95)', 
            backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2rem', width: '420px', maxWidth: '95%',
            border: success ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)'
          }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)' }}>
                  <Check size={40} color="white" />
                </div>
                <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Reserva Confirmada!</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Sua reserva foi realizada com sucesso</p>
              </div>
            ) : (
              <>
                {/* Header do Modal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Nova Reserva</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                      {selectedArea.name} • {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer' }}>
                    <X size={20} color="rgba(255,255,255,0.6)" />
                  </button>
                </div>

                {/* Steps Indicator */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[1, 2, 3].map(s => (
                    <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: s <= step ? 'linear-gradient(90deg, #8b5cf6, #ec4899)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }}></div>
                  ))}
                </div>

                {/* Step 1: Horários */}
                {step === 1 && (
                  <div>
                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Escolha o horário</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Início</label>
                        <select value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }}>
                          {HORARIOS.slice(0, -1).map(h => <option key={h} value={h} style={{ background: '#1a1a2e' }}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Término</label>
                        <select value={horaFim} onChange={e => setHoraFim(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }}>
                          {HORARIOS.slice(1).map(h => <option key={h} value={h} style={{ background: '#1a1a2e' }}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Visual Timeline */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        <Clock size={14} />
                        <span>Duração: {parseInt(horaFim) - parseInt(horaInicio)} horas</span>
                      </div>
                      <div style={{ marginTop: '0.75rem', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: `${((parseInt(horaInicio) - 8) / 14) * 100}%`,
                          width: `${((parseInt(horaFim) - parseInt(horaInicio)) / 14) * 100}%`,
                          height: '100%', 
                          background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', 
                          borderRadius: '4px' 
                        }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                        <span>08:00</span><span>22:00</span>
                      </div>
                    </div>
                    <button onClick={() => setStep(2)}
                      style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      Continuar <Arrow size={18} />
                    </button>
                  </div>
                )}

                {/* Step 2: Detalhes */}
                {step === 2 && (
                  <div>
                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Detalhes do evento</h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Tipo de evento</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {TIPOS_EVENTO.map(tipo => (
                          <button key={tipo} onClick={() => setTipoEvento(tipo)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '20px', border: tipoEvento === tipo ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)', 
                              background: tipoEvento === tipo ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)', color: tipoEvento === tipo ? '#c4b5fd' : 'rgba(255,255,255,0.6)', 
                              fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Nome do evento (opcional)</label>
                      <input type="text" value={nomeEvento} onChange={e => setNomeEvento(e.target.value)} placeholder="Ex: Aniversário do João"
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Quantidade de convidados</label>
                      <input type="number" value={qtdConvidados} onChange={e => setQtdConvidados(e.target.value)} placeholder={`Máximo ${selectedArea.capacity}`}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => setStep(1)} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer' }}>Voltar</button>
                      <button onClick={() => setStep(3)} disabled={!tipoEvento}
                        style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', background: tipoEvento ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'rgba(255,255,255,0.1)', color: tipoEvento ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 700, cursor: tipoEvento ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        Continuar <Arrow size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmação */}
                {step === 3 && (
                  <div>
                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Confirme sua reserva</h3>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Área</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{selectedArea.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Data</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Horário</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{horaInicio} - {horaFim}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Evento</span>
                          <span style={{ color: '#c4b5fd', fontWeight: 600, fontSize: '0.85rem' }}>{nomeEvento || tipoEvento}</span>
                        </div>
                        {qtdConvidados && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Convidados</span>
                            <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{qtdConvidados} pessoas</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => setStep(2)} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer' }}>Voltar</button>
                      <button onClick={handleReservar}
                        style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(34, 197, 94, 0.3)' }}>
                        <Check size={18} /> Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
