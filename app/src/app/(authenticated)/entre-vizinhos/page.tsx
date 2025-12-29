"use client";
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Heart, Clock, Search, Grid, List, X, Upload, Eye, Pause, Play, Copy, Trash2, TrendingUp, Package } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

const UPLOADS_BASE = API_BASE.replace('/api/v1', '');

const CATEGORIAS = ['Todos', 'moveis', 'eletronicos', 'eletrodomesticos', 'roupas', 'esportes', 'livros', 'brinquedos', 'veiculos', 'servicos', 'outros'];
const CONDICOES = [
  { value: 'novo', label: 'Novo' },
  { value: 'usado', label: 'Usado' },
  { value: 'reparo', label: 'Precisa de reparo' },
];
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  disponivel: { label: 'Ativo', color: 'success' },
  pausado: { label: 'Pausado', color: 'warning' },
  vendido: { label: 'Vendido', color: 'info' },
  arquivado: { label: 'Arquivado', color: 'default' },
};

interface Imagem { url: string; ordem: number; id: number; }
interface Anuncio { 
  id: number; titulo: string; descricao: string; preco: string | number; 
  categoria: string; condicao: string; status: string; 
  imagens: Imagem[]; created_at: string; visualizacoes: number; is_favorito: boolean;
}
interface Stats { total: number; ativos: number; pausados: number; vendidos: number; arquivados: number; total_visualizacoes: number; total_favoritos: number; }

export default function EntreVizinhosPage() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'vitrine' | 'meus'>('vitrine');
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [meusAnuncios, setMeusAnuncios] = useState<Anuncio[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<Anuncio | null>(null);
  
  const [formData, setFormData] = useState({ titulo: '', descricao: '', preco: '', categoria: 'outros', condicao: 'usado' });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchVitrine = async () => {
    const res = await fetch(`${API_BASE}/classificados?tenant_id=${currentTenant?.tenant_id}`);
    const data = await res.json();
    setAnuncios(data.items || []);
  };

  const fetchMeusAnuncios = async () => {
    const [anunciosRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/classificados/meus/anuncios?tenant_id=${currentTenant?.tenant_id}${statusFilter ? `&status=${statusFilter}` : ''}`),
      fetch(`${API_BASE}/classificados/meus/estatisticas?tenant_id=${currentTenant?.tenant_id}`)
    ]);
    const anunciosData = await anunciosRes.json();
    const statsData = await statsRes.json();
    setMeusAnuncios(anunciosData.items || []);
    setStats(statsData);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setLoading(true);
    if (activeTab === 'vitrine') {
      fetchVitrine().finally(() => setLoading(false));
    } else {
      fetchMeusAnuncios().finally(() => setLoading(false));
    }
  }, [activeTab, statusFilter]);

  const filtered = anuncios.filter(a => {
    if (categoria !== 'Todos' && a.categoria !== categoria) return false;
    if (busca && !a.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const formatPreco = (preco: number | string | undefined) => {
    if (!preco) return '0,00';
    const num = typeof preco === 'string' ? parseFloat(preco) : preco;
    return isNaN(num) ? '0,00' : num.toFixed(2).replace('.', ',');
  };

  const handleSubmit = async () => {
    if (!formData.titulo || !formData.preco) return alert('Preencha título e preço');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/classificados?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, preco: parseFloat(formData.preco) }),
      });
      if (!res.ok) throw new Error((await res.json()).detail);
      const anuncio = await res.json();
      
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append('file', file);
        await fetch(`${API_BASE}/classificados/${anuncio.id}/imagens?tenant_id=${currentTenant?.tenant_id}`, { method: 'POST', body: fd });
      }
      
      setFormData({ titulo: '', descricao: '', preco: '', categoria: 'outros', condicao: 'usado' });
      setSelectedFiles([]);
      setModalOpen(false);
      fetchVitrine();
      fetchMeusAnuncios();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleStatusChange = async (id: number, novoStatus: string) => {
    await fetch(`${API_BASE}/classificados/${id}/status?novo_status=${novoStatus}&tenant_id=${currentTenant?.tenant_id}`, { method: 'PATCH' });
    fetchMeusAnuncios();
    fetchVitrine();
  };

  const handleDuplicar = async (id: number) => {
    await fetch(`${API_BASE}/classificados/${id}/duplicar?tenant_id=${currentTenant?.tenant_id}`, { method: 'POST' });
    fetchMeusAnuncios();
  };

  const handleDeletar = async (id: number) => {
    if (!confirm('Excluir este anúncio?')) return;
    await fetch(`${API_BASE}/classificados/${id}?tenant_id=${currentTenant?.tenant_id}`, { method: 'DELETE' });
    fetchMeusAnuncios();
    fetchVitrine();
  };

  const toggleFavorito = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${API_BASE}/classificados/${id}/favorito?tenant_id=${currentTenant?.tenant_id}`, { method: 'POST' });
    fetchVitrine();
  };

  const getImageUrl = (a: Anuncio) => a.imagens?.[0] ? `${UPLOADS_BASE}${a.imagens[0].url}` : null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={24} style={{ color: 'var(--accent)' }}/> Entre Vizinhos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Marketplace do condomínio</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16}/> Novo Anúncio</Button>
      </div>

      {/* Tabs principais */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('vitrine')} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: activeTab === 'vitrine' ? 'var(--accent)' : 'var(--bg-secondary)', color: activeTab === 'vitrine' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
          <ShoppingBag size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}/> Vitrine
        </button>
        <button onClick={() => setActiveTab('meus')} style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', border: 'none', background: activeTab === 'meus' ? 'var(--accent)' : 'var(--bg-secondary)', color: activeTab === 'meus' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
          <Package size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }}/> Meus Anúncios
        </button>
      </div>

      {/* VITRINE */}
      {activeTab === 'vitrine' && (
        <>
          <Card style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." 
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}/>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                {['Todos', 'moveis', 'eletronicos', 'roupas', 'outros'].map(c => (
                  <button key={c} onClick={() => setCategoria(c)} style={{ padding: '0.35rem 0.6rem', borderRadius: '4px', border: 'none', background: categoria === c ? 'var(--accent)' : 'var(--bg-tertiary)', color: categoria === c ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => setViewMode('grid')} style={{ padding: '0.4rem', borderRadius: '4px', border: 'none', background: viewMode === 'grid' ? 'var(--accent)' : 'var(--bg-tertiary)', color: viewMode === 'grid' ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}><Grid size={16}/></button>
                <button onClick={() => setViewMode('list')} style={{ padding: '0.4rem', borderRadius: '4px', border: 'none', background: viewMode === 'list' ? 'var(--accent)' : 'var(--bg-tertiary)', color: viewMode === 'list' ? 'white' : 'var(--text-muted)', cursor: 'pointer' }}><List size={16}/></button>
              </div>
            </div>
          </Card>

          {loading ? (
            <Card padding="lg"><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div></Card>
          ) : filtered.length === 0 ? (
            <Card><EmptyState icon={<ShoppingBag size={48}/>} title="Nenhum anúncio" description="Seja o primeiro a anunciar!" action={<Button onClick={() => setModalOpen(true)}><Plus size={16}/> Criar</Button>}/></Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(240px, 1fr))' : '1fr', gap: '1rem' }}>
              {filtered.map(a => (
                <Card key={a.id} padding="none" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setDetailModal(a)}>
                  <div style={{ height: '150px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {getImageUrl(a) ? <img src={getImageUrl(a)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <ShoppingBag size={40} style={{ opacity: 0.3 }}/>}
                    <button onClick={e => toggleFavorito(a.id, e)} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', padding: '0.35rem', cursor: 'pointer' }}>
                      <Heart size={14} style={{ color: a.is_favorito ? '#ef4444' : 'white', fill: a.is_favorito ? '#ef4444' : 'none' }}/>
                    </button>
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</h3>
                    <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem' }}>R$ {formatPreco(a.preco)}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <Badge variant="default" size="sm">{a.categoria}</Badge>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}><Eye size={10}/> {a.visualizacoes}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* MEUS ANÚNCIOS */}
      {activeTab === 'meus' && (
        <>
          {/* Stats */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <StatCard title="Total" value={stats.total} icon={<Package size={18}/>} color="default"/>
              <StatCard title="Ativos" value={stats.ativos} icon={<Play size={18}/>} color="green"/>
              <StatCard title="Pausados" value={stats.pausados} icon={<Pause size={18}/>} color="yellow"/>
              <StatCard title="Vendidos" value={stats.vendidos} icon={<TrendingUp size={18}/>} color="blue"/>
              <StatCard title="Views" value={stats.total_visualizacoes} icon={<Eye size={18}/>} color="blue"/>
            </div>
          )}

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[{ v: '', l: 'Todos' }, { v: 'disponivel', l: 'Ativos' }, { v: 'pausado', l: 'Pausados' }, { v: 'vendido', l: 'Vendidos' }, { v: 'arquivado', l: 'Arquivados' }].map(s => (
              <button key={s.v} onClick={() => setStatusFilter(s.v)} style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: 'none', background: statusFilter === s.v ? 'var(--accent)' : 'var(--bg-tertiary)', color: statusFilter === s.v ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>{s.l}</button>
            ))}
          </div>

          {loading ? (
            <Card padding="lg"><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div></Card>
          ) : meusAnuncios.length === 0 ? (
            <Card><EmptyState icon={<Package size={48}/>} title="Nenhum anúncio" description="Você ainda não criou anúncios" action={<Button onClick={() => setModalOpen(true)}><Plus size={16}/> Criar</Button>}/></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {meusAnuncios.map(a => (
                <Card key={a.id} padding="sm" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-tertiary)', flexShrink: 0 }}>
                    {getImageUrl(a) ? <img src={getImageUrl(a)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><ShoppingBag size={24} style={{ opacity: 0.3 }}/></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titulo}</h3>
                      <Badge variant={STATUS_LABELS[a.status]?.color as any || 'default'} size="sm">{STATUS_LABELS[a.status]?.label || a.status}</Badge>
                    </div>
                    <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem' }}>R$ {formatPreco(a.preco)}</p>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      <span><Eye size={12} style={{ verticalAlign: 'middle' }}/> {a.visualizacoes} views</span>
                      <span><Clock size={12} style={{ verticalAlign: 'middle' }}/> {new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    {a.status === 'disponivel' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(a.id, 'pausado')} title="Pausar"><Pause size={14}/></Button>}
                    {a.status === 'pausado' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(a.id, 'disponivel')} title="Ativar"><Play size={14}/></Button>}
                    {a.status !== 'vendido' && <Button variant="ghost" size="sm" onClick={() => handleStatusChange(a.id, 'vendido')} title="Marcar vendido"><TrendingUp size={14}/></Button>}
                    <Button variant="ghost" size="sm" onClick={() => handleDuplicar(a.id)} title="Duplicar"><Copy size={14}/></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletar(a.id)} title="Excluir"><Trash2 size={14}/></Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal Novo Anúncio */}
      <Modal isOpen={modalOpen} onClose={() => !submitting && setModalOpen(false)} title="Novo Anúncio" size="lg"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)} disabled={submitting}>Cancelar</Button><Button onClick={handleSubmit} loading={submitting}>Publicar</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>Título *</label>
            <input value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ex: iPhone 12 Pro Max" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}/>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>Descrição</label>
            <textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} placeholder="Descreva..." rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical' }}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>Preço *</label>
              <input type="number" step="0.01" value={formData.preco} onChange={e => setFormData({...formData, preco: e.target.value})} placeholder="0,00" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}/>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>Categoria</label>
              <select value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>Condição</label>
              <select value={formData.condicao} onChange={e => setFormData({...formData, condicao: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {CONDICOES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 500 }}>Fotos</label>
            <div style={{ border: '1px dashed var(--border-default)', borderRadius: '6px', padding: '1rem', textAlign: 'center', cursor: 'pointer' }} onClick={() => document.getElementById('file-input')?.click()}>
              <input id="file-input" type="file" multiple accept="image/*" onChange={e => e.target.files && setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 10))} style={{ display: 'none' }}/>
              <Upload size={24} style={{ color: 'var(--text-muted)' }}/>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Clique para selecionar</p>
            </div>
            {selectedFiles.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{ position: 'relative', width: '50px', height: '50px' }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}/>
                    <button onClick={e => { e.stopPropagation(); setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i)); }} style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--error)', border: 'none', borderRadius: '50%', width: '14px', height: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={8} color="white"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Detalhes */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal?.titulo || ''} size="lg">
        {detailModal && (
          <div>
            {detailModal.imagens?.length > 0 && detailModal.imagens[0] && <img src={`${UPLOADS_BASE}${detailModal.imagens[0].url}`} alt="" style={{ width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '6px', background: 'var(--bg-tertiary)', marginBottom: '1rem' }}/>}
            <p style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.4rem', marginBottom: '0.5rem' }}>R$ {formatPreco(detailModal.preco)}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <Badge variant="default">{detailModal.categoria}</Badge>
              <Badge variant="info">{CONDICOES.find(c => c.value === detailModal.condicao)?.label}</Badge>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>{detailModal.descricao || 'Sem descrição'}</p>
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}><Eye size={12}/> {detailModal.visualizacoes} • {new Date(detailModal.created_at).toLocaleDateString('pt-BR')}</span>
              <Button size="sm">Contato</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
