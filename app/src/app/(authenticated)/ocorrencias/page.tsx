"use client";
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Clock, CheckCircle, XCircle, Search, Calendar, MapPin, Eye, Edit, Send, PlayCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CATEGORIAS = [
  { value: 'noise', label: '🔊 Barulho' },
  { value: 'parking', label: '🚗 Estacionamento' },
  { value: 'pet', label: '🐕 Animais' },
  { value: 'trash', label: '🗑️ Lixo' },
  { value: 'common_area', label: '🏢 Área Comum' },
  { value: 'security', label: '🔒 Segurança' },
  { value: 'vandalism', label: '💥 Vandalismo' },
  { value: 'leak', label: '💧 Vazamento' },
  { value: 'elevator', label: '🛗 Elevador' },
  { value: 'neighbor', label: '👥 Vizinho' },
  { value: 'employee', label: '👷 Funcionário' },
  { value: 'visitor', label: '🚶 Visitante' },
  { value: 'other', label: '📋 Outros' },
];

const SEVERIDADES = [
  { value: 'low', label: 'Baixa', color: 'default' },
  { value: 'medium', label: 'Média', color: 'info' },
  { value: 'high', label: 'Alta', color: 'warning' },
  { value: 'critical', label: 'Crítica', color: 'error' },
];

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  open: { label: 'Aberta', color: 'warning' },
  in_progress: { label: 'Em Andamento', color: 'info' },
  resolved: { label: 'Resolvida', color: 'success' },
  closed: { label: 'Fechada', color: 'default' },
  cancelled: { label: 'Cancelada', color: 'error' },
};

interface Occurrence {
  id: number;
  protocol: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  location: string | null;
  involved_names: string | null;
  witnesses: string | null;
  resolution: string | null;
  actions_taken: string | null;
  occurred_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface Stats { total: number; abertas: number; em_andamento: number; resolvidas: number; }

// Skeleton Loading Components
const StatCardSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="flex-1">
        <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

const ChartSkeleton = ({ height = "320px" }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
    <div className={`w-full bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse`} style={{ height }} />
  </div>
);

const OccurrenceCardSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex gap-4">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-3">
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-12 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-14 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
        <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="flex gap-4">
          <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-18 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

export default function OccurrencesPage() {
  const { currentTenant } = useTenant();
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, abertas: 0, em_andamento: 0, resolvidas: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState<Occurrence | null>(null);
  const [editModal, setEditModal] = useState<Occurrence | null>(null);
  
  const [form, setForm] = useState({ title: '', description: '', category: 'other', severity: 'medium', location: '', involved_names: '', witnesses: '' });
  const [editForm, setEditForm] = useState({ status: '', resolution: '', actions_taken: '' });
  const [submitting, setSubmitting] = useState(false);

  // DEBUG: Log para monitorar mudanças nos dropdowns
  const [debugInfo, setDebugInfo] = useState<{lastCategoryChange?: string, lastSeverityChange?: string}>({});

  // CORREÇÃO BUG #1: Handlers específicos para dropdowns com debug
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoValor = e.target.value;
    console.log('🔍 DEBUG: Categoria mudou para:', novoValor, 'Estado anterior:', form.category);
    setForm(prev => {
      const novoForm = { ...prev, category: novoValor };
      console.log('🔍 DEBUG: Novo estado form:', novoForm);
      return novoForm;
    });
    setDebugInfo(prev => ({ ...prev, lastCategoryChange: novoValor }));
  };

  const handleSeveridadeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoValor = e.target.value;
    console.log('🔍 DEBUG: Severidade mudou para:', novoValor, 'Estado anterior:', form.severity);
    setForm(prev => {
      const novoForm = { ...prev, severity: novoValor };
      console.log('🔍 DEBUG: Novo estado form:', novoForm);
      return novoForm;
    });
    setDebugInfo(prev => ({ ...prev, lastSeverityChange: novoValor }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '/ocorrencias';
      if (activeTab === 'minhas') endpoint = '/ocorrencias/minhas';
      else if (activeTab !== 'todas') endpoint += `?status=${activeTab}`;
      
      const [ocRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}tenant_id=${currentTenant?.tenant_id || 1}`),
        fetch(`${API_BASE}/ocorrencias/estatisticas?tenant_id=${currentTenant?.tenant_id || 1}`)
      ]);
      setOccurrences((await ocRes.json()).items || []);
      setStats(await statsRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchData(); }, [activeTab, currentTenant]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) { alert('Preencha título e descrição'); return; }

    // CORREÇÃO BUG #1: Validar estado dos dropdowns antes de enviar
    console.log('🔍 DEBUG: Estado atual do formulário antes do submit:', form);
    console.log('🔍 DEBUG: Histórico de mudanças:', debugInfo);

    // Verificar se valores não são defaults suspeitos
    if (form.category === 'other' && debugInfo.lastCategoryChange && debugInfo.lastCategoryChange !== 'other') {
      alert('⚠️ ERRO: categoria não foi salva corretamente. Tente novamente.');
      console.error('🐛 BUG DETECTADO: categoria deveria ser', debugInfo.lastCategoryChange, 'mas form tem', form.category);
      return;
    }

    if (form.severity === 'medium' && debugInfo.lastSeverityChange && debugInfo.lastSeverityChange !== 'medium') {
      alert('⚠️ ERRO: severidade não foi salva corretamente. Tente novamente.');
      console.error('🐛 BUG DETECTADO: severidade deveria ser', debugInfo.lastSeverityChange, 'mas form tem', form.severity);
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...form };
      console.log('🚀 Enviando payload:', payload);

      const res = await fetch(`${API_BASE}/ocorrencias?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro');

      console.log('✅ Ocorrência criada com sucesso');
      setCreateModal(false);
      setForm({ title: '', description: '', category: 'other', severity: 'medium', location: '', involved_names: '', witnesses: '' });
      setDebugInfo({}); // Reset debug info
      fetchData();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await fetch(`${API_BASE}/ocorrencias/${id}/status?novo_status=${newStatus}&tenant_id=${currentTenant?.tenant_id}`, { method: 'PATCH' });
      fetchData();
      setDetailModal(null);
    } catch (e: any) { alert(e.message); }
  };

  const handleEdit = async () => {
    if (!editModal) return;
    setSubmitting(true);
    try {
      const payload: any = {};
      if (editForm.status) payload.status = editForm.status;
      if (editForm.resolution) payload.resolution = editForm.resolution;
      if (editForm.actions_taken) payload.actions_taken = editForm.actions_taken;
      
      const res = await fetch(`${API_BASE}/ocorrencias/${editModal.id}?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro');
      setEditModal(null);
      fetchData();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const openEditModal = (oc: Occurrence) => {
    setEditForm({ status: oc.status, resolution: oc.resolution || '', actions_taken: oc.actions_taken || '' });
    setEditModal(oc);
  };

  const filtered = occurrences.filter(o => 
    o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.protocol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCatLabel = (cat: string) => CATEGORIAS.find(c => c.value === cat)?.label || cat;
  const getSevInfo = (sev: string) => SEVERIDADES.find(s => s.value === sev) ?? SEVERIDADES[1];

  // Dados dos Charts.js para Analytics
  const categoryData = {
    labels: CATEGORIAS.slice(0, 6).map(cat => cat.label.split(' ')[1]), // Remove emojis
    datasets: [{
      label: 'Ocorrências por Categoria',
      data: CATEGORIAS.slice(0, 6).map(cat =>
        occurrences.filter(o => o.category === cat.value).length
      ),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',   // red
        'rgba(245, 158, 11, 0.8)',  // amber
        'rgba(34, 197, 94, 0.8)',   // green
        'rgba(59, 130, 246, 0.8)',  // blue
        'rgba(139, 92, 246, 0.8)',  // violet
        'rgba(236, 72, 153, 0.8)'   // pink
      ],
      borderColor: [
        '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'
      ],
      borderWidth: 2
    }]
  };

  const severityData = {
    labels: ['Baixa', 'Média', 'Alta', 'Crítica'],
    datasets: [{
      label: 'Distribuição por Severidade',
      data: [
        occurrences.filter(o => o.severity === 'low').length,
        occurrences.filter(o => o.severity === 'medium').length,
        occurrences.filter(o => o.severity === 'high').length,
        occurrences.filter(o => o.severity === 'critical').length
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',   // green - baixa
        'rgba(59, 130, 246, 0.8)',  // blue - média
        'rgba(245, 158, 11, 0.8)',  // amber - alta
        'rgba(239, 68, 68, 0.8)'    // red - crítica
      ],
      borderColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 2
    }]
  };

  // Tendência mensal
  const monthlyData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Abertas',
        data: [12, 19, 8, 15, 11, 9],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      },
      {
        label: 'Resolvidas',
        data: [8, 15, 12, 18, 14, 10],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com gradiente e design moderno */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <AlertTriangle size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Ocorrências</h1>
              <p className="text-white/80 text-lg">Registro e gestão de ocorrências do condomínio</p>
            </div>
          </div>
          <Button
            onClick={() => setCreateModal(true)}
            className="bg-white text-orange-600 hover:bg-gray-100 font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus size={20}/> Nova Ocorrência
          </Button>
        </div>

        {/* Stats Cards com design moderno */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({length: 4}).map((_, index) => <StatCardSkeleton key={index} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <AlertCircle size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.abertas}</div>
                  <div className="text-white/80 text-sm">Abertas</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Clock size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.em_andamento}</div>
                  <div className="text-white/80 text-sm">Em Andamento</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <CheckCircle size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.resolvidas}</div>
                  <div className="text-white/80 text-sm">Resolvidas</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.total}</div>
                  <div className="text-white/80 text-sm">Total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Charts */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Por Categoria</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Doughnut data={categoryData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Por Severidade</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Bar data={severityData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tendência Mensal</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Line data={monthlyData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartSkeleton height="280px" />
            <ChartSkeleton height="280px" />
            <ChartSkeleton height="280px" />
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 min-w-0 relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por título, protocolo..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'todas', label: 'Todas', color: 'bg-gray-500' },
                { key: 'open', label: 'Abertas', color: 'bg-amber-500' },
                { key: 'in_progress', label: 'Em Andamento', color: 'bg-blue-500' },
                { key: 'resolved', label: 'Resolvidas', color: 'bg-green-500' },
                { key: 'minhas', label: 'Minhas', color: 'bg-purple-500' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${
                    activeTab === tab.key
                      ? `${tab.color} text-white shadow-lg`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Occurrence List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({length: 3}).map((_, index) => <OccurrenceCardSkeleton key={index} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6">
                <AlertTriangle size={48} className="text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Nenhuma ocorrência encontrada</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Não há ocorrências registradas para os filtros selecionados</p>
                <Button
                  onClick={() => setCreateModal(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105"
                >
                  <Plus size={16}/> Registrar Primeira Ocorrência
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(oc => {
              const statusInfo = STATUS_CONFIG[oc.status] || STATUS_CONFIG.open;
              const sevInfo = getSevInfo(oc.severity);

              return (
                <div
                  key={oc.id}
                  onClick={() => setDetailModal(oc)}
                  className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl group"
                >
                  <div className="flex gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      sevInfo?.color === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                      sevInfo?.color === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      sevInfo?.color === 'info' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      <AlertTriangle size={24} className={`${
                        sevInfo?.color === 'error' ? 'text-red-600 dark:text-red-400' :
                        sevInfo?.color === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                        sevInfo?.color === 'info' ? 'text-blue-600 dark:text-blue-400' :
                        'text-green-600 dark:text-green-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                          {oc.protocol}
                        </span>
                        <Badge variant={statusInfo?.color || 'default'} size="sm">
                          {statusInfo?.label || 'Aberta'}
                        </Badge>
                        <Badge variant={(sevInfo?.color || 'default') as any} size="sm">
                          {sevInfo?.label || 'Média'}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-200">
                        {oc.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {oc.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          {getCatLabel(oc.category)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(oc.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {oc.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {oc.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailModal(oc)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(oc)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>

    {/* Modal Criar */}
    <Modal isOpen={createModal} onClose={() => !submitting && setCreateModal(false)} title="Nova Ocorrência" size="lg"
        footer={<><Button variant="ghost" onClick={() => setCreateModal(false)} disabled={submitting}>Cancelar</Button><Button onClick={handleCreate} loading={submitting}><Send size={16}/> Registrar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Título *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Barulho excessivo após 22h"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '1rem' }}/>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Descrição *</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descreva a ocorrência com detalhes..." rows={4}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Categoria</label>
              <select
                value={form.category}
                onChange={handleCategoriaChange}
                onClick={(e) => console.log('🔍 DEBUG: Dropdown categoria clicado, valor atual:', e.currentTarget.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {/* DEBUG: Mostrar estado atual */}
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Atual: {form.category} | Último change: {debugInfo.lastCategoryChange || 'nenhum'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Severidade</label>
              <select
                value={form.severity}
                onChange={handleSeveridadeChange}
                onClick={(e) => console.log('🔍 DEBUG: Dropdown severidade clicado, valor atual:', e.currentTarget.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {SEVERIDADES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {/* DEBUG: Mostrar estado atual */}
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Atual: {form.severity} | Último change: {debugInfo.lastSeverityChange || 'nenhum'}
              </div>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Local</label>
            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ex: Bloco A, 3º andar"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Envolvidos</label>
              <input value={form.involved_names} onChange={e => setForm({ ...form, involved_names: e.target.value })} placeholder="Nomes (opcional)"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Testemunhas</label>
              <input value={form.witnesses} onChange={e => setForm({ ...form, witnesses: e.target.value })} placeholder="Nomes (opcional)"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
            </div>
          </div>
        </div>
      </Modal>

    {/* Modal Detalhes */}
    <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`Ocorrência ${detailModal?.protocol || ''}`} size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {detailModal?.status === 'open' && <Button variant="secondary" size="sm" onClick={() => handleUpdateStatus(detailModal.id, 'in_progress')}><PlayCircle size={14}/> Iniciar</Button>}
              {detailModal?.status === 'in_progress' && <Button variant="secondary" size="sm" onClick={() => openEditModal(detailModal)}><CheckCircle size={14}/> Resolver</Button>}
              {detailModal && !['resolved', 'closed', 'cancelled'].includes(detailModal.status) && <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(detailModal.id, 'cancelled')}><XCircle size={14}/> Cancelar</Button>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setDetailModal(null)}>Fechar</Button>
              <Button onClick={() => { setDetailModal(null); openEditModal(detailModal!); }}><Edit size={14}/> Editar</Button>
            </div>
          </div>
        }>
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge variant={STATUS_CONFIG[detailModal.status]?.color || 'default'} size="sm">{STATUS_CONFIG[detailModal.status]?.label}</Badge>
              <Badge variant={(getSevInfo(detailModal.severity)?.color || 'default') as any} size="sm">{getSevInfo(detailModal.severity)?.label || 'Média'}</Badge>
              <Badge variant="default" size="sm">{getCatLabel(detailModal.category)}</Badge>
            </div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{detailModal.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{detailModal.description}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registrado em</span><p style={{ fontWeight: 500 }}>{new Date(detailModal.created_at).toLocaleString('pt-BR')}</p></div>
              {detailModal.location && <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local</span><p style={{ fontWeight: 500 }}>{detailModal.location}</p></div>}
              {detailModal.involved_names && <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Envolvidos</span><p style={{ fontWeight: 500 }}>{detailModal.involved_names}</p></div>}
              {detailModal.witnesses && <div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Testemunhas</span><p style={{ fontWeight: 500 }}>{detailModal.witnesses}</p></div>}
            </div>
            {detailModal.resolution && (
              <div style={{ padding: '1rem', background: 'var(--success-bg)', borderRadius: '8px', border: '1px solid var(--success)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>RESOLUÇÃO</span>
                <p style={{ marginTop: '0.25rem' }}>{detailModal.resolution}</p>
              </div>
            )}
            {detailModal.actions_taken && (
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AÇÕES TOMADAS</span>
                <p style={{ marginTop: '0.25rem' }}>{detailModal.actions_taken}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

    {/* Modal Editar */}
    <Modal isOpen={!!editModal} onClose={() => !submitting && setEditModal(null)} title={`Editar ${editModal?.protocol || ''}`} size="lg"
        footer={<><Button variant="ghost" onClick={() => setEditModal(null)} disabled={submitting}>Cancelar</Button><Button onClick={handleEdit} loading={submitting}><CheckCircle size={16}/> Salvar</Button></>}>
        {editModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <strong>{editModal.title}</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{editModal.description}</p>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Status</label>
              <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Resolução</label>
              <textarea value={editForm.resolution} onChange={e => setEditForm({ ...editForm, resolution: e.target.value })} placeholder="Descreva como foi resolvida..." rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'vertical' }}/>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Ações Tomadas</label>
              <textarea value={editForm.actions_taken} onChange={e => setEditForm({ ...editForm, actions_taken: e.target.value })} placeholder="Quais medidas foram aplicadas..." rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'vertical' }}/>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
