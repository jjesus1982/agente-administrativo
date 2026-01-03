"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  Megaphone, Plus, Pin, Eye, MessageSquare, Clock, Trash2, Send, Search, Users, Bell, Mail,
  BarChart3, TrendingUp, Activity, Zap, Calendar
} from 'lucide-react';
import { Card, Button, Badge, BadgeVariant, EmptyState, Modal, StatCard } from '@/components/ui';
import { API_BASE } from '@/lib/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, LineElement, PointElement);

const CATEGORIAS = [
  { value: 'geral', label: '📢 Geral' },
  { value: 'obras', label: '🔨 Obras' },
  { value: 'financeiro', label: '💰 Financeiro' },
  { value: 'eventos', label: '🎉 Eventos' },
  { value: 'seguranca', label: '🔒 Segurança' },
  { value: 'manutencao', label: '🔧 Manutenção' },
  { value: 'assembleia', label: '📋 Assembleia' },
  { value: 'outros', label: '📌 Outros' },
];

const PRIORIDADES = [
  { value: 'normal', label: 'Normal', color: 'default' },
  { value: 'importante', label: 'Importante', color: 'warning' },
  { value: 'urgente', label: 'Urgente', color: 'error' },
] as const;

type PrioridadeInfo = { value: string; label: string; color: BadgeVariant };

interface Anuncio {
  id: number; title: string; content: string; summary?: string; category?: string;
  priority: string; is_pinned: boolean; target_audience: string;
  send_push: boolean; send_email: boolean; allow_comments: boolean;
  views_count: number; total_comentarios: number; created_at: string; created_by_nome?: string;
}

interface Comentario { id: number; content: string; user_id: number; user_nome?: string; created_at: string; }

export default function AnnouncementsPage() {
  const { currentTenant } = useTenant();

  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState<Anuncio | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Anuncio | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [novoComentario, setNovoComentario] = useState('');
  
  const [form, setForm] = useState({
    title: '', content: '', summary: '', category: 'geral', priority: 'normal',
    is_pinned: false, target_audience: 'todos', send_push: false, send_email: false, allow_comments: true
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnuncios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/anuncios?tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setAnuncios(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchAnuncios(); }, [currentTenant]);

  const fetchComentarios = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/anuncios/${id}/comentarios?tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setComentarios(data.items || []);
    } catch (e) { console.error(e); }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) { alert('Preencha título e conteúdo'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/anuncios?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro');
      setCreateModal(false);
      setForm({ title: '', content: '', summary: '', category: 'geral', priority: 'normal', is_pinned: false, target_audience: 'todos', send_push: false, send_email: false, allow_comments: true });
      fetchAnuncios();
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Erro ao processar solicitação');
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await fetch(`${API_BASE}/anuncios/${deleteConfirm.id}?tenant_id=${currentTenant?.tenant_id}`, { method: 'DELETE' });
      setDeleteConfirm(null);
      fetchAnuncios();
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Erro ao processar solicitação');
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      await fetch(`${API_BASE}/anuncios/${id}/fixar?tenant_id=${currentTenant?.tenant_id}`, { method: 'PUT' });
      fetchAnuncios();
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Erro ao processar solicitação');
    }
  };

  const handleAddComment = async () => {
    if (!viewModal || !novoComentario.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/anuncios/${viewModal.id}/comentarios?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: novoComentario })
      });
      if (!res.ok) throw new Error('Erro');
      setNovoComentario('');
      fetchComentarios(viewModal.id);
    } catch (e: unknown) {
      const error = e as Error;
      alert(error.message || 'Erro ao processar solicitação');
    }
  };

  const openView = async (anuncio: Anuncio) => {
    setViewModal(anuncio);
    await fetchComentarios(anuncio.id);
  };

  const getCatLabel = (cat?: string) => CATEGORIAS.find(c => c.value === cat)?.label || '📢 Geral';
  const getPrioInfo = (pri: string): PrioridadeInfo => {
    const found = PRIORIDADES.find(p => p.value === pri);
    return found ? { value: found.value, label: found.label, color: found.color } : { value: 'normal', label: 'Normal', color: 'default' };
  };

  const filtered = anuncios.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));
  const fixados = filtered.filter(a => a.is_pinned);
  const outros = filtered.filter(a => !a.is_pinned);

  const stats = {
    total: anuncios.length,
    fixados: anuncios.filter(a => a.is_pinned).length,
    views: anuncios.reduce((sum, a) => sum + (a.views_count || 0), 0),
    comentarios: anuncios.reduce((sum, a) => sum + (a.total_comentarios || 0), 0)
  };

  // Skeleton Loading Components
  const AnnouncementCardSkeleton = () => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-16 h-5 bg-slate-600/50 rounded"></div>
            <div className="w-12 h-4 bg-slate-600/50 rounded"></div>
          </div>
          <div className="w-3/4 h-5 bg-slate-600/50 rounded mb-2"></div>
          <div className="w-full h-4 bg-slate-600/30 rounded mb-1"></div>
          <div className="w-5/6 h-4 bg-slate-600/30 rounded mb-3"></div>
          <div className="flex gap-4">
            <div className="w-12 h-3 bg-slate-600/30 rounded"></div>
            <div className="w-12 h-3 bg-slate-600/30 rounded"></div>
            <div className="w-16 h-3 bg-slate-600/30 rounded"></div>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <div className="w-8 h-8 bg-slate-600/30 rounded"></div>
          <div className="w-8 h-8 bg-slate-600/30 rounded"></div>
        </div>
      </div>
    </div>
  );

  // Chart Data
  const categoryData = {
    labels: CATEGORIAS.slice(0, 6).map(cat => cat.label.split(' ')[1]),
    datasets: [{
      label: 'Comunicados por Categoria',
      data: CATEGORIAS.slice(0, 6).map(cat =>
        anuncios.filter(a => a.category === cat.value).length
      ),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)', // azul
        'rgba(34, 197, 94, 0.8)',  // verde
        'rgba(251, 191, 36, 0.8)', // amarelo
        'rgba(139, 92, 246, 0.8)', // violet
        'rgba(236, 72, 153, 0.8)', // pink
        'rgba(99, 102, 241, 0.8)'  // indigo
      ],
      borderColor: [
        '#3b82f6', '#22c55e', '#fbbf24', '#8b5cf6', '#ec4899', '#6366f1'
      ],
      borderWidth: 2
    }]
  };

  const engagementData = {
    labels: anuncios.slice(-7).map(a => new Date(a.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
    datasets: [
      {
        label: 'Visualizações',
        data: anuncios.slice(-7).map(a => a.views_count || 0),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Comentários',
        data: anuncios.slice(-7).map(a => a.total_comentarios || 0),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  if (loading) {
    return (
      <div className="animate-fade-in min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="w-48 h-8 bg-slate-700/50 rounded animate-pulse"></div>
              <div className="w-64 h-4 bg-slate-700/30 rounded animate-pulse"></div>
            </div>
            <div className="w-40 h-10 bg-slate-700/50 rounded animate-pulse"></div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-slate-700/50 rounded-xl"></div>
                  <div className="w-4 h-4 bg-slate-700/50 rounded"></div>
                </div>
                <div className="w-16 h-4 bg-slate-700/50 rounded mb-1"></div>
                <div className="w-8 h-6 bg-slate-700/50 rounded"></div>
              </div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-32 h-5 bg-slate-700/50 rounded animate-pulse mb-4"></div>
              <div className="h-64 bg-slate-700/20 rounded-xl animate-pulse"></div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-28 h-5 bg-slate-700/50 rounded animate-pulse mb-4"></div>
              <div className="h-64 bg-slate-700/20 rounded-xl animate-pulse"></div>
            </div>
          </div>

          {/* Search Skeleton */}
          <div className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-xl animate-pulse"></div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <AnnouncementCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Modern Gradient Orbs */}
      <div className="absolute -top-32 -right-20 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-32 -left-20 w-80 h-80 bg-gradient-to-tr from-cyan-500/15 to-emerald-400/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000"></div>

      <div className="max-w-7xl mx-auto relative space-y-6">
        {/* Modern Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Megaphone className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Comunicados
                </h1>
                <p className="text-slate-400 text-lg">Avisos e informativos do condomínio</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => setCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Comunicado
          </Button>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={stats.total} icon={<Megaphone size={20}/>} color="blue"/>
          <StatCard title="Fixados" value={stats.fixados} icon={<Pin size={20}/>} color="yellow"/>
          <StatCard title="Visualizações" value={stats.views} icon={<Eye size={20}/>} color="blue"/>
          <StatCard title="Comentários" value={stats.comentarios} icon={<MessageSquare size={20}/>} color="green"/>
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 group hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Categorias
              </h3>
              <Activity className="w-5 h-5 text-cyan-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="h-64">
              {categoryData.datasets[0].data.some(d => d > 0) ? (
                <Doughnut
                  data={categoryData}
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
                    <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Dados de categorias indisponíveis</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 group hover:bg-slate-800/70 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Engajamento
              </h3>
              <Zap className="w-5 h-5 text-yellow-400 opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="h-64">
              {engagementData.datasets[0].data.some(d => d > 0) || engagementData.datasets[1].data.some(d => d > 0) ? (
                <Line
                  data={engagementData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false },
                    plugins: {
                      legend: {
                        position: 'top',
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
                    },
                    scales: {
                      x: {
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                      },
                      y: {
                        ticks: { color: '#94a3b8', font: { size: 10 } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Dados de engajamento indisponíveis</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modern Search Bar */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 backdrop-blur-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar comunicados..."
              className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400">Carregando comunicados...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-200 mb-2">Nenhum comunicado encontrado</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm ? 'Tente buscar com outros termos' : 'Publique avisos para os moradores'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setCreateModal(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Comunicado
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Comunicados Fixados */}
            {fixados.map(anuncio => (
              <div
                key={anuncio.id}
                className="bg-slate-800/50 border border-slate-700 border-l-4 border-l-amber-400 rounded-xl p-6 group hover:bg-slate-800/70 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => openView(anuncio)}
                  >
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-md">
                        <Pin className="w-3 h-3 text-amber-400" />
                        <span className="text-xs text-amber-300 font-medium">Fixado</span>
                      </div>
                      <Badge variant={getPrioInfo(anuncio.priority).color} size="sm">
                        {getPrioInfo(anuncio.priority).label}
                      </Badge>
                      <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                        {getCatLabel(anuncio.category)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-200 mb-2 group-hover:text-white transition-colors">
                      {anuncio.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2 leading-relaxed">
                      {anuncio.summary || anuncio.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {anuncio.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {anuncio.total_comentarios || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(anuncio.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {anuncio.created_by_nome && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {anuncio.created_by_nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(anuncio.id)}
                      title="Desafixar"
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      <Pin className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(anuncio)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Comunicados Normais */}
            {outros.map(anuncio => (
              <div
                key={anuncio.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 group hover:bg-slate-800/70 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex justify-between items-start">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => openView(anuncio)}
                  >
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant={getPrioInfo(anuncio.priority).color} size="sm">
                        {getPrioInfo(anuncio.priority).label}
                      </Badge>
                      <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                        {getCatLabel(anuncio.category)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg text-slate-200 mb-2 group-hover:text-white transition-colors">
                      {anuncio.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2 leading-relaxed">
                      {anuncio.summary || anuncio.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {anuncio.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {anuncio.total_comentarios || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(anuncio.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      {anuncio.created_by_nome && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {anuncio.created_by_nome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePin(anuncio.id)}
                      title="Fixar"
                      className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                    >
                      <Pin className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirm(anuncio)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar */}
      <Modal
        isOpen={createModal}
        onClose={() => !submitting && setCreateModal(false)}
        title="Novo Comunicado"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModal(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              <Send size={16}/> Publicar
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Título *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título do comunicado"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '1rem' }}/>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Resumo</label>
            <input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Breve descrição (aparece na listagem)"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Conteúdo *</label>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Escreva o comunicado completo..." rows={6}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical' }}/>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Categoria</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Prioridade</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                {PRIORIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Público Alvo</label>
              <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                <option value="todos">Todos</option>
                <option value="proprietarios">Proprietários</option>
                <option value="inquilinos">Inquilinos</option>
                <option value="sindico">Síndico/Admin</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })} style={{ width: '18px', height: '18px' }}/>
              <Pin size={16}/> Fixar no topo
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.send_push} onChange={e => setForm({ ...form, send_push: e.target.checked })} style={{ width: '18px', height: '18px' }}/>
              <Bell size={16}/> Notificação Push
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.send_email} onChange={e => setForm({ ...form, send_email: e.target.checked })} style={{ width: '18px', height: '18px' }}/>
              <Mail size={16}/> Enviar por E-mail
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.allow_comments} onChange={e => setForm({ ...form, allow_comments: e.target.checked })} style={{ width: '18px', height: '18px' }}/>
              <MessageSquare size={16}/> Permitir comentários
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal Visualizar */}
      <Modal isOpen={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.title || ''} size="lg"
        footer={<Button variant="ghost" onClick={() => setViewModal(null)}>Fechar</Button>}>
        {viewModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {viewModal.is_pinned && <Badge variant="warning" size="sm"><Pin size={10}/> Fixado</Badge>}
              <Badge variant={getPrioInfo(viewModal.priority).color} size="sm">{getPrioInfo(viewModal.priority).label}</Badge>
              <Badge variant="default" size="sm">{getCatLabel(viewModal.category)}</Badge>
            </div>
            
            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {viewModal.content}
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span><Eye size={14}/> {viewModal.views_count || 0} visualizações</span>
              <span><Clock size={14}/> {new Date(viewModal.created_at).toLocaleString('pt-BR')}</span>
              {viewModal.created_by_nome && <span><Users size={14}/> {viewModal.created_by_nome}</span>}
            </div>
            
            {viewModal.allow_comments && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={16}/> Comentários ({comentarios.length})
                </h4>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Escreva um comentário..."
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
                  <Button onClick={handleAddComment} disabled={!novoComentario.trim()}><Send size={14}/></Button>
                </div>
                
                {comentarios.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
                    {comentarios.map(c => (
                      <div key={c.id} style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>{c.user_nome || 'Usuário'}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Confirmar Delete */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={handleDelete} style={{ background: 'var(--error)' }}>
              Excluir
            </Button>
          </>
        }
      >
        <p>Tem certeza que deseja excluir o comunicado <strong>&quot;{deleteConfirm?.title}&quot;</strong>?</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}
