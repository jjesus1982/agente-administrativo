"use client";
import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Clock, CheckCircle, AlertCircle, Search, Calendar, User, Send, Edit, Eye, PlayCircle, XCircle } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { api } from '@/lib/api';

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wrench size={28} style={{ color: 'var(--accent)' }}/> Chamados de Manutenção
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gerencie os chamados técnicos do condomínio</p>
        </div>
        <Button onClick={() => setCreateModal(true)}><Plus size={18}/> Novo Chamado</Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Abertos" value={stats.abertos} icon={<Clock size={20}/>} color="yellow"/>
        <StatCard title="Em Andamento" value={stats.em_andamento} icon={<AlertCircle size={20}/>} color="blue"/>
        <StatCard title="Concluídos" value={stats.concluidos} icon={<CheckCircle size={20}/>} color="green"/>
        <StatCard title="Total" value={stats.total} icon={<Wrench size={20}/>} color="default"/>
      </div>

      {/* Filtros e Tabs */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por título ou protocolo..."
              style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { key: 'todos', label: 'Todos' },
              { key: 'aberto', label: 'Abertos' },
              { key: 'em_andamento', label: 'Em Andamento' },
              { key: 'concluido', label: 'Concluídos' },
              { key: 'meus', label: 'Meus Chamados' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Lista de Tickets */}
      {loading ? (
        <Card padding="lg">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              🔄 Carregando chamados...
            </div>
            {retryCount > 0 && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tentativa {retryCount + 1}/4
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Timeout em 10 segundos
            </div>
          </div>
        </Card>
      ) : loadingError ? (
        <Card padding="lg">
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} />
              <strong>Erro ao Carregar Dados</strong>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {loadingError}
            </p>
            <Button onClick={() => fetchTickets()} variant="secondary">
              🔄 Tentar Novamente
            </Button>
          </div>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench size={56} style={{ opacity: 0.5 }}/>}
            title="Nenhum chamado encontrado"
            description="Não há chamados de manutenção nesta categoria"
            action={<Button onClick={() => setCreateModal(true)}><Plus size={16}/> Abrir Chamado</Button>}
          />
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredTickets.map(ticket => {
            const statusInfo = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.aberto ?? { label: 'Aberto', color: 'warning' as const };
            const prioInfo = getPrioridadeInfo(ticket.priority);
            
            return (
              <Card key={ticket.id} padding="none" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => setDetailModal(ticket)}>
                <div style={{ 
                  padding: '1.25rem',
                  background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      {/* Header com ícone e título */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '0.75rem' }}>
                        <div style={{ 
                          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                          background: prioInfo.color === 'error' ? 'rgba(239, 68, 68, 0.15)' : 
                                     prioInfo.color === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <Wrench size={22} style={{ 
                            color: prioInfo.color === 'error' ? '#ef4444' : 
                                   prioInfo.color === 'warning' ? '#f59e0b' : '#3b82f6'
                          }}/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{ticket.protocol}</span>
                            <Badge variant={statusInfo.color} size="sm">{statusInfo.label}</Badge>
                            <Badge variant={prioInfo.color as any} size="sm">{prioInfo.label}</Badge>
                          </div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', lineHeight: 1.3 }}>{ticket.title}</h3>
                        </div>
                      </div>
                      
                      {/* Descrição */}
                      <p style={{ 
                        color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem 0',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        marginLeft: '56px', lineHeight: 1.5
                      }}>{ticket.description}</p>
                      
                      {/* Meta info */}
                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '56px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{getCategoriaLabel(ticket.category)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={13}/> {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                        {ticket.assigned_to && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><User size={13}/> {ticket.assigned_to}</span>}
                      </div>
                    </div>
                    
                    {/* Botões de ação */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setDetailModal(ticket)} title="Ver detalhes"><Eye size={16}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(ticket)} title="Editar"><Edit size={16}/></Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Criar Chamado */}
      <Modal
        isOpen={createModal}
        onClose={() => !submitting && (setCreateModal(false), resetForm())}
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
