"use client";
import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Clock, CheckCircle, AlertCircle, Search, Calendar, User, Send, Edit, Eye, PlayCircle, XCircle, BarChart3 } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { api } from '@/lib/api';

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
  { value: 'eletrica', label: '⚡ Elétrica' },
  { value: 'hidraulica', label: '🚿 Hidráulica' },
  { value: 'estrutural', label: '🏗️ Estrutural' },
  { value: 'pintura', label: '🎨 Pintura' },
  { value: 'limpeza', label: '🧹 Limpeza' },
  { value: 'jardinagem', label: '🌳 Jardinagem' },
  { value: 'elevador', label: '🛗 Elevador' },
  { value: 'seguranca', label: '🔒 Segurança' },
  { value: 'outros', label: '📦 Outros' },
];

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa', color: 'default' },
  { value: 'normal', label: 'Normal', color: 'info' },
  { value: 'alta', label: 'Alta', color: 'warning' },
  { value: 'urgente', label: 'Urgente', color: 'error' },
];

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  aberto: { label: 'Aberto', color: 'warning' },
  em_analise: { label: 'Em Análise', color: 'info' },
  aprovado: { label: 'Aprovado', color: 'info' },
  em_andamento: { label: 'Em Andamento', color: 'warning' },
  aguardando: { label: 'Aguardando', color: 'default' },
  concluido: { label: 'Concluído', color: 'success' },
  cancelado: { label: 'Cancelado', color: 'error' },
};

interface Ticket {
  id: number;
  protocol: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  unit_id: number | null;
  requester_id: number;
  assigned_to: string | null;
  scheduled_date: string | null;
  resolution: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_at: string;
}

interface Stats {
  total: number;
  abertos: number;
  em_andamento: number;
  concluidos: number;
}

// Skeleton Loading Components
const StatCardSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="flex-1">
        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

const ChartSkeleton = ({ height = "300px" }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
    <div className={`w-full bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse`} style={{ height }} />
  </div>
);

const TicketCardSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex gap-4">
      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-3">
          <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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

export default function MaintenancePage() {
  const { currentTenant } = useTenant();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, abertos: 0, em_andamento: 0, concluidos: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState<Ticket | null>(null);
  const [editModal, setEditModal] = useState<Ticket | null>(null);
  
  // Formulário de criação
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'outros',
    priority: 'normal'
  });
  const [submitting, setSubmitting] = useState(false);

  // Validação de formulário
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [formTouched, setFormTouched] = useState<{[key: string]: boolean}>({});
  
  // Formulário de edição/resolução
  const [editForm, setEditForm] = useState({
    status: '',
    assigned_to: '',
    scheduled_date: '',
    resolution: '',
    actual_cost: ''
  });

  const fetchTicketsWithTimeout = async (timeoutMs = 10000) => {
    // Criar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let endpoint = '/manutencao/tickets';
      if (activeTab === 'meus') endpoint = '/manutencao/tickets/meus';
      else if (activeTab !== 'todos') endpoint += `?status=${activeTab}`;

      // Simular timeout usando Promise.race
      const fetchWithTimeout = (url: string) =>
        Promise.race([
          api.get(url),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);

      const [ticketsRes, statsRes] = await Promise.all([
        fetchWithTimeout(endpoint) as Promise<Response>,
        fetchWithTimeout('/manutencao/estatisticas') as Promise<Response>
      ]);

      clearTimeout(timeoutId);

      if (!ticketsRes.ok || !statsRes.ok) {
        throw new Error(`Erro HTTP: ${ticketsRes.status} ${statsRes.status}`);
      }

      const ticketsData = await ticketsRes.json();
      const statsData = await statsRes.json();

      return { ticketsData, statsData };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.message === 'Timeout') {
        throw new Error('Timeout: Servidor não respondeu em 10 segundos');
      }
      throw error;
    }
  };

  const fetchTickets = async (attemptCount = 0) => {
    const MAX_RETRIES = 3;

    setLoading(true);
    setLoadingError(null);

    try {
      const { ticketsData, statsData } = await fetchTicketsWithTimeout();

      setTickets(ticketsData.items || []);
      setStats(statsData);
      setRetryCount(0); // Reset retry count on success
      setLoadingError(null);
    } catch (e: any) {
      console.error(`Erro ao carregar tickets (tentativa ${attemptCount + 1}):`, e);

      if (attemptCount < MAX_RETRIES && e.message.includes('Timeout')) {
        // Retry with exponential backoff
        const delayMs = Math.min(1000 * Math.pow(2, attemptCount), 5000);
        console.log(`Tentando novamente em ${delayMs}ms...`);

        setRetryCount(attemptCount + 1);
        setTimeout(() => fetchTickets(attemptCount + 1), delayMs);
        return;
      }

      // Max retries reached or non-timeout error
      setLoadingError(e.message || 'Erro desconhecido ao carregar dados');
      setTickets([]);
      setStats({ total: 0, abertos: 0, em_andamento: 0, concluidos: 0 });
      setRetryCount(0);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchTickets(); }, [activeTab, currentTenant]);

  // Funções de validação
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    // Validar título
    if (!form.title.trim()) {
      errors.title = 'Título é obrigatório';
    } else if (form.title.trim().length < 5) {
      errors.title = 'Título deve ter pelo menos 5 caracteres';
    } else if (form.title.trim().length > 100) {
      errors.title = 'Título não pode exceder 100 caracteres';
    }

    // Validar descrição
    if (!form.description.trim()) {
      errors.description = 'Descrição é obrigatória';
    } else if (form.description.trim().length < 10) {
      errors.description = 'Descrição deve ter pelo menos 10 caracteres';
    } else if (form.description.trim().length > 1000) {
      errors.description = 'Descrição não pode exceder 1000 caracteres';
    }

    // Validar categoria
    if (!form.category) {
      errors.category = 'Selecione uma categoria';
    }

    // Validar prioridade
    if (!form.priority) {
      errors.priority = 'Selecione uma prioridade';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateField = (field: string, value: string) => {
    const errors = { ...formErrors };

    switch (field) {
      case 'title':
        if (!value.trim()) {
          errors.title = 'Título é obrigatório';
        } else if (value.trim().length < 5) {
          errors.title = 'Título deve ter pelo menos 5 caracteres';
        } else if (value.trim().length > 100) {
          errors.title = 'Título não pode exceder 100 caracteres';
        } else {
          delete errors.title;
        }
        break;
      case 'description':
        if (!value.trim()) {
          errors.description = 'Descrição é obrigatória';
        } else if (value.trim().length < 10) {
          errors.description = 'Descrição deve ter pelo menos 10 caracteres';
        } else if (value.trim().length > 1000) {
          errors.description = 'Descrição não pode exceder 1000 caracteres';
        } else {
          delete errors.description;
        }
        break;
      case 'category':
        if (!value) {
          errors.category = 'Selecione uma categoria';
        } else {
          delete errors.category;
        }
        break;
      case 'priority':
        if (!value) {
          errors.priority = 'Selecione uma prioridade';
        } else {
          delete errors.priority;
        }
        break;
    }

    setFormErrors(errors);
  };

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormTouched(prev => ({ ...prev, [field]: true }));

    // Validar em tempo real apenas se o campo já foi "tocado"
    if (formTouched[field] || value !== '') {
      validateField(field, value);
    }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', category: 'outros', priority: 'normal' });
    setFormErrors({});
    setFormTouched({});
  };

  const handleCreate = async () => {
    // Marcar todos os campos como tocados para mostrar erros
    setFormTouched({ title: true, description: true, category: true, priority: true });

    // Validar formulário completo
    if (!validateForm()) {
      alert('Por favor, corrija os erros no formulário antes de continuar.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/manutencao/tickets', form);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `Erro HTTP ${res.status}`);
      }

      setCreateModal(false);
      resetForm();
      fetchTickets();
      alert('Chamado criado com sucesso!');
    } catch (e: any) {
      console.error('Erro ao criar chamado:', e);
      alert(`Erro ao criar chamado: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (ticketId: number, newStatus: string) => {
    try {
      const res = await api.patch(`/manutencao/tickets/${ticketId}/status?novo_status=${newStatus}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Erro ao atualizar status');
      }

      fetchTickets();
      setDetailModal(null);
      alert('Status atualizado com sucesso!');
    } catch (e: any) {
      console.error('Erro ao atualizar status:', e);
      alert(`Erro ao atualizar status: ${e.message}`);
    }
  };

  const handleEdit = async () => {
    if (!editModal) return;
    setSubmitting(true);
    try {
      const payload: any = {};
      if (editForm.status) payload.status = editForm.status;
      if (editForm.assigned_to) payload.assigned_to = editForm.assigned_to;
      if (editForm.scheduled_date) payload.scheduled_date = new Date(editForm.scheduled_date).toISOString();
      if (editForm.resolution) payload.resolution = editForm.resolution;
      if (editForm.actual_cost) payload.actual_cost = parseFloat(editForm.actual_cost);

      const res = await api.patch(`/manutencao/tickets/${editModal.id}`, payload);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Erro ao atualizar');
      }

      setEditModal(null);
      setEditForm({ status: '', assigned_to: '', scheduled_date: '', resolution: '', actual_cost: '' });
      fetchTickets();
      alert('Chamado atualizado com sucesso!');
    } catch (e: any) {
      console.error('Erro ao atualizar chamado:', e);
      alert(`Erro ao atualizar chamado: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (ticket: Ticket) => {
    setEditForm({
      status: ticket.status,
      assigned_to: ticket.assigned_to || '',
      scheduled_date: ticket.scheduled_date ? ticket.scheduled_date.slice(0, 16) : '',
      resolution: ticket.resolution || '',
      actual_cost: ticket.actual_cost?.toString() || ''
    });
    setEditModal(ticket);
  };

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.protocol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoriaLabel = (cat: string) => CATEGORIAS.find(c => c.value === cat)?.label || cat;
  const getPrioridadeInfo = (pri: string) => {
    const found = PRIORIDADES.find(p => p.value === pri);
    return found ?? { value: 'normal', label: 'Normal', color: 'info' };
  };

  // Chart.js Analytics Data
  const categoryData = {
    labels: CATEGORIAS.slice(0, 6).map(cat => cat.label.split(' ')[1]), // Remove emojis
    datasets: [{
      label: 'Chamados por Categoria',
      data: CATEGORIAS.slice(0, 6).map(cat =>
        tickets.filter(t => t.category === cat.value).length
      ),
      backgroundColor: [
        'rgba(251, 191, 36, 0.8)',   // yellow
        'rgba(59, 130, 246, 0.8)',   // blue
        'rgba(139, 92, 246, 0.8)',   // violet
        'rgba(34, 197, 94, 0.8)',    // green
        'rgba(236, 72, 153, 0.8)',   // pink
        'rgba(99, 102, 241, 0.8)'    // indigo
      ],
      borderColor: [
        '#fbbf24', '#3b82f6', '#8b5cf6', '#22c55e', '#ec4899', '#6366f1'
      ],
      borderWidth: 2
    }]
  };

  const priorityData = {
    labels: ['Baixa', 'Normal', 'Alta', 'Urgente'],
    datasets: [{
      label: 'Distribuição por Prioridade',
      data: [
        tickets.filter(t => t.priority === 'baixa').length,
        tickets.filter(t => t.priority === 'normal').length,
        tickets.filter(t => t.priority === 'alta').length,
        tickets.filter(t => t.priority === 'urgente').length
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',   // green - baixa
        'rgba(59, 130, 246, 0.8)',  // blue - normal
        'rgba(245, 158, 11, 0.8)',  // amber - alta
        'rgba(239, 68, 68, 0.8)'    // red - urgente
      ],
      borderColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
      borderWidth: 2
    }]
  };

  // Tendência de resolução
  const resolutionData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Abertos',
        data: [8, 12, 6, 15, 10, 7],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      },
      {
        label: 'Concluídos',
        data: [5, 10, 8, 12, 14, 9],
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com gradiente e design moderno */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <Wrench size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Chamados de Manutenção</h1>
              <p className="text-white/80 text-lg">Gerenciamento avançado de chamados técnicos do condomínio</p>
            </div>
          </div>
          <Button
            onClick={() => setCreateModal(true)}
            className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus size={20}/> Novo Chamado
          </Button>
        </div>

        {/* Stats Cards com design moderno */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({length: 4}).map((_, index) => <StatCardSkeleton key={index} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Clock size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.abertos}</div>
                  <div className="text-white/80 text-sm">Abertos</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <AlertCircle size={24} />
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
                  <div className="text-3xl font-bold">{stats.concluidos}</div>
                  <div className="text-white/80 text-sm">Concluídos</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Wrench size={24} />
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
                <BarChart3 size={24} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Por Categoria</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Doughnut data={categoryData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Por Prioridade</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Bar data={priorityData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tendência Mensal</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Line data={resolutionData} options={chartOptions} />
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
                placeholder="Buscar por título ou protocolo..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'todos', label: 'Todos', color: 'bg-gray-500' },
                { key: 'aberto', label: 'Abertos', color: 'bg-yellow-500' },
                { key: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-500' },
                { key: 'concluido', label: 'Concluídos', color: 'bg-green-500' },
                { key: 'meus', label: 'Meus Chamados', color: 'bg-purple-500' }
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

        {/* Tickets List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({length: 3}).map((_, index) => <TicketCardSkeleton key={index} />)}
          </div>
        ) : loadingError ? (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-6">
                <AlertCircle size={48} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Erro ao Carregar Dados</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{loadingError}</p>
                {retryCount > 0 && (
                  <p className="text-sm text-gray-400 mb-4">Tentativa {retryCount + 1}/4</p>
                )}
                <Button
                  onClick={() => fetchTickets()}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105"
                >
                  <RefreshCw size={16}/> Tentar Novamente
                </Button>
              </div>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6">
                <Wrench size={48} className="text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Nenhum chamado encontrado</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Não há chamados de manutenção para os filtros selecionados</p>
                <Button
                  onClick={() => setCreateModal(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105"
                >
                  <Plus size={16}/> Abrir Primeiro Chamado
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map(ticket => {
              const statusInfo = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.aberto ?? { label: 'Aberto', color: 'warning' as const };
              const prioInfo = getPrioridadeInfo(ticket.priority);

              return (
                <div
                  key={ticket.id}
                  onClick={() => setDetailModal(ticket)}
                  className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl group"
                >
                  <div className="flex gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      prioInfo.color === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                      prioInfo.color === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      prioInfo.color === 'info' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      <Wrench size={24} className={`${
                        prioInfo.color === 'error' ? 'text-red-600 dark:text-red-400' :
                        prioInfo.color === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                        prioInfo.color === 'info' ? 'text-blue-600 dark:text-blue-400' :
                        'text-green-600 dark:text-green-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                          {ticket.protocol}
                        </span>
                        <Badge variant={statusInfo.color} size="sm">
                          {statusInfo.label}
                        </Badge>
                        <Badge variant={prioInfo.color as any} size="sm">
                          {prioInfo.label}
                        </Badge>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                        {ticket.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {ticket.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          {getCategoriaLabel(ticket.category)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {ticket.assigned_to && (
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {ticket.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailModal(ticket)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(ticket)}
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

      {/* Modal Criar Chamado */}
      <Modal
        isOpen={createModal}
        onClose={() => {
          if (!submitting) {
            setCreateModal(false);
            resetForm();
          }
        }}
        title="Novo Chamado de Manutenção"
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => { setCreateModal(false); resetForm(); }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              loading={submitting}
              disabled={Object.keys(formErrors).length > 0}
            >
              <Send size={16}/> Abrir Chamado
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Título do Chamado *</label>
            <input
              value={form.title}
              onChange={e => handleFormChange('title', e.target.value)}
              placeholder="Ex: Vazamento no banheiro do salão de festas"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                border: formErrors.title ? '1px solid #ef4444' : '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: formErrors.title ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none'
              }}
            />
            {formErrors.title && formTouched.title && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} />
                {formErrors.title}
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {form.title.length}/100 caracteres
            </p>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Descrição Detalhada *</label>
            <textarea
              value={form.description}
              onChange={e => handleFormChange('description', e.target.value)}
              placeholder="Descreva o problema com detalhes: localização exata, quando começou, urgência..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                border: formErrors.description ? '1px solid #ef4444' : '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                resize: 'vertical',
                outline: formErrors.description ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none'
              }}
            />
            {formErrors.description && formTouched.description && (
              <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={12} />
                {formErrors.description}
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {form.description.length}/1000 caracteres
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Categoria *</label>
              <select
                value={form.category}
                onChange={e => handleFormChange('category', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: formErrors.category ? '1px solid #ef4444' : '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: formErrors.category ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none'
                }}
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              {formErrors.category && formTouched.category && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  {formErrors.category}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Prioridade *</label>
              <select
                value={form.priority}
                onChange={e => handleFormChange('priority', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: formErrors.priority ? '1px solid #ef4444' : '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: formErrors.priority ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none'
                }}
              >
                {PRIORIDADES.map(pri => (
                  <option key={pri.value} value={pri.value}>{pri.label}</option>
                ))}
              </select>
              {formErrors.priority && formTouched.priority && (
                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={12} />
                  {formErrors.priority}
                </p>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal Detalhes */}
      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={`Chamado ${detailModal?.protocol || ''}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {detailModal?.status === 'aberto' && (
                <Button variant="secondary" size="sm" onClick={() => handleUpdateStatus(detailModal.id, 'em_andamento')}>
                  <PlayCircle size={14}/> Iniciar
                </Button>
              )}
              {detailModal?.status === 'em_andamento' && (
                <Button variant="secondary" size="sm" onClick={() => openEditModal(detailModal)}>
                  <CheckCircle size={14}/> Concluir
                </Button>
              )}
              {detailModal && detailModal.status !== 'concluido' && detailModal.status !== 'cancelado' && (
                <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(detailModal.id, 'cancelado')}>
                  <XCircle size={14}/> Cancelar
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setDetailModal(null)}>Fechar</Button>
              <Button onClick={() => { setDetailModal(null); openEditModal(detailModal!); }}><Edit size={14}/> Editar</Button>
            </div>
          </div>
        }
      >
        {detailModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Badge variant={STATUS_CONFIG[detailModal.status]?.color || 'default'} size="sm">
                {STATUS_CONFIG[detailModal.status]?.label || detailModal.status}
              </Badge>
              <Badge variant={getPrioridadeInfo(detailModal.priority).color as any} size="sm">
                {getPrioridadeInfo(detailModal.priority).label}
              </Badge>
              <Badge variant="default" size="sm">{getCategoriaLabel(detailModal.category)}</Badge>
            </div>
            
            <div>
              <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{detailModal.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{detailModal.description}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aberto em</span>
                <p style={{ fontWeight: 500 }}>{new Date(detailModal.created_at).toLocaleString('pt-BR')}</p>
              </div>
              {detailModal.assigned_to && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Responsável</span>
                  <p style={{ fontWeight: 500 }}>{detailModal.assigned_to}</p>
                </div>
              )}
              {detailModal.scheduled_date && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agendado para</span>
                  <p style={{ fontWeight: 500 }}>{new Date(detailModal.scheduled_date).toLocaleString('pt-BR')}</p>
                </div>
              )}
              {detailModal.actual_cost && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custo</span>
                  <p style={{ fontWeight: 500 }}>R$ {Number(detailModal.actual_cost).toFixed(2)}</p>
                </div>
              )}
            </div>
            
            {detailModal.resolution && (
              <div style={{ padding: '1rem', background: 'var(--success-bg)', borderRadius: '8px', border: '1px solid var(--success)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>RESOLUÇÃO</span>
                <p style={{ marginTop: '0.25rem', color: 'var(--text-primary)' }}>{detailModal.resolution}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Editar/Concluir */}
      <Modal
        isOpen={!!editModal}
        onClose={() => !submitting && setEditModal(null)}
        title={`Editar Chamado ${editModal?.protocol || ''}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModal(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleEdit} loading={submitting}><CheckCircle size={16}/> Salvar</Button>
          </>
        }
      >
        {editModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
              <strong>{editModal.title}</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{editModal.description}</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                >
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Responsável</label>
                <input
                  value={editForm.assigned_to}
                  onChange={e => setEditForm({ ...editForm, assigned_to: e.target.value })}
                  placeholder="Nome do técnico/empresa"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Data Agendada</label>
                <input
                  type="datetime-local"
                  value={editForm.scheduled_date}
                  onChange={e => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.actual_cost}
                  onChange={e => setEditForm({ ...editForm, actual_cost: e.target.value })}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Resolução / Observações
              </label>
              <textarea
                value={editForm.resolution}
                onChange={e => setEditForm({ ...editForm, resolution: e.target.value })}
                placeholder="Descreva o que foi feito, materiais utilizados, observações..."
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
