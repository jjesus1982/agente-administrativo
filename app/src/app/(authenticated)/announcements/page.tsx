"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Megaphone, Plus, Pin, Eye, MessageSquare, Clock, Trash2, Send, Search, Users, Bell, Mail } from 'lucide-react';
import { Card, Button, Badge, BadgeVariant, EmptyState, Modal, StatCard } from '@/components/ui';
import { API_BASE } from '@/lib/api';

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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Megaphone size={28} style={{ color: 'var(--accent)' }}/> Comunicados
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Avisos e informativos do condomínio</p>
        </div>
        <Button onClick={() => setCreateModal(true)}><Plus size={18}/> Novo Comunicado</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Total" value={stats.total} icon={<Megaphone size={20}/>} color="blue"/>
        <StatCard title="Fixados" value={stats.fixados} icon={<Pin size={20}/>} color="yellow"/>
        <StatCard title="Visualizações" value={stats.views} icon={<Eye size={20}/>} color="blue"/>
        <StatCard title="Comentários" value={stats.comentarios} icon={<MessageSquare size={20}/>} color="green"/>
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar comunicados..."
            style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}/>
        </div>
      </Card>

      {loading ? (
        <Card padding="lg"><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={<Megaphone size={56} style={{ opacity: 0.5 }}/>} title="Nenhum comunicado" description="Publique avisos para os moradores"
          action={<Button onClick={() => setCreateModal(true)}><Plus size={16}/> Criar Comunicado</Button>}/></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Fixados primeiro */}
          {fixados.map(anuncio => (
            <Card key={anuncio.id} padding="md" style={{ borderLeft: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openView(anuncio)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <Pin size={14} style={{ color: 'var(--warning)' }}/>
                    <Badge variant={getPrioInfo(anuncio.priority).color} size="sm">{getPrioInfo(anuncio.priority).label}</Badge>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getCatLabel(anuncio.category)}</span>
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{anuncio.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{anuncio.summary || anuncio.content}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span><Eye size={12}/> {anuncio.views_count || 0}</span>
                    <span><MessageSquare size={12}/> {anuncio.total_comentarios || 0}</span>
                    <span><Clock size={12}/> {new Date(anuncio.created_at).toLocaleDateString('pt-BR')}</span>
                    {anuncio.created_by_nome && <span>por {anuncio.created_by_nome}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1rem' }}>
                  <Button variant="ghost" size="sm" onClick={() => handleTogglePin(anuncio.id)} title="Desafixar"><Pin size={14}/></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(anuncio)}><Trash2 size={14}/></Button>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Outros */}
          {outros.map(anuncio => (
            <Card key={anuncio.id} padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => openView(anuncio)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge variant={getPrioInfo(anuncio.priority).color} size="sm">{getPrioInfo(anuncio.priority).label}</Badge>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getCatLabel(anuncio.category)}</span>
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{anuncio.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{anuncio.summary || anuncio.content}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span><Eye size={12}/> {anuncio.views_count || 0}</span>
                    <span><MessageSquare size={12}/> {anuncio.total_comentarios || 0}</span>
                    <span><Clock size={12}/> {new Date(anuncio.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1rem' }}>
                  <Button variant="ghost" size="sm" onClick={() => handleTogglePin(anuncio.id)} title="Fixar"><Pin size={14}/></Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(anuncio)}><Trash2 size={14}/></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar */}
      <Modal isOpen={createModal} onClose={() => !submitting && setCreateModal(false)} title="Novo Comunicado" size="lg"
        footer={<><Button variant="ghost" onClick={() => setCreateModal(false)} disabled={submitting}>Cancelar</Button><Button onClick={handleCreate} loading={submitting}><Send size={16}/> Publicar</Button></>}>
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
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirmar Exclusão" size="sm"
        footer={<><Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button><Button onClick={handleDelete} style={{ background: 'var(--error)' }}>Excluir</Button></>}>
        <p>Tem certeza que deseja excluir o comunicado <strong>&quot;{deleteConfirm?.title}&quot;</strong>?</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}
