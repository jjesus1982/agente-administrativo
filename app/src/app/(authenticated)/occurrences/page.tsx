"use client";
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Clock, CheckCircle, XCircle, Search, Calendar, MapPin, Eye, Edit, Send, PlayCircle, AlertCircle } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={28} style={{ color: 'var(--warning)' }}/> Ocorrências
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Registro de ocorrências do condomínio</p>
        </div>
        <Button onClick={() => setCreateModal(true)}><Plus size={18}/> Nova Ocorrência</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Abertas" value={stats.abertas} icon={<AlertCircle size={20}/>} color="yellow"/>
        <StatCard title="Em Andamento" value={stats.em_andamento} icon={<Clock size={20}/>} color="blue"/>
        <StatCard title="Resolvidas" value={stats.resolvidas} icon={<CheckCircle size={20}/>} color="green"/>
        <StatCard title="Total" value={stats.total} icon={<AlertTriangle size={20}/>} color="default"/>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..."
              style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}/>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[{ key: 'todas', label: 'Todas' }, { key: 'open', label: 'Abertas' }, { key: 'in_progress', label: 'Em Andamento' }, { key: 'resolved', label: 'Resolvidas' }, { key: 'minhas', label: 'Minhas' }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                padding: '0.5rem 1rem', borderRadius: '6px', border: 'none',
                background: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-tertiary)',
                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500
              }}>{tab.label}</button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card padding="lg"><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<AlertTriangle size={56} style={{ opacity: 0.5 }}/>} title="Nenhuma ocorrência" description="Não há ocorrências registradas"
          action={<Button onClick={() => setCreateModal(true)}><Plus size={16}/> Registrar</Button>}/></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(oc => {
            const statusInfo = STATUS_CONFIG[oc.status] || STATUS_CONFIG.open;
            const sevInfo = getSevInfo(oc.severity);
            return (
              <Card key={oc.id} padding="none" style={{ cursor: 'pointer', overflow: 'hidden' }} onClick={() => setDetailModal(oc)}>
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
                          background: sevInfo?.color === 'error' ? 'rgba(239, 68, 68, 0.15)' :
                                     sevInfo?.color === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-tertiary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <AlertTriangle size={22} style={{
                            color: sevInfo?.color === 'error' ? '#ef4444' :
                                   sevInfo?.color === 'warning' ? '#f59e0b' : 'var(--text-muted)'
                          }}/>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-tertiary)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{oc.protocol}</span>
                            <Badge variant={statusInfo?.color || 'default'} size="sm">{statusInfo?.label || 'Aberta'}</Badge>
                            <Badge variant={(sevInfo?.color || 'default') as any} size="sm">{sevInfo?.label || 'Média'}</Badge>
                          </div>
                          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)', lineHeight: 1.3 }}>{oc.title}</h3>
                        </div>
                      </div>
                      
                      {/* Descrição */}
                      <p style={{ 
                        color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem 0',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        marginLeft: '56px', lineHeight: 1.5
                      }}>{oc.description}</p>
                      
                      {/* Meta info */}
                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '56px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>{getCatLabel(oc.category)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calendar size={13}/> {new Date(oc.created_at).toLocaleDateString('pt-BR')}</span>
                        {oc.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><MapPin size={13}/> {oc.location}</span>}
                      </div>
                    </div>
                    
                    {/* Botões de ação */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setDetailModal(oc)} title="Ver detalhes"><Eye size={16}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(oc)} title="Editar"><Edit size={16}/></Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
