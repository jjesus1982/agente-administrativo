"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Shield, FileText, HelpCircle, ShoppingBag, Star, Search, Package, BarChart3, Megaphone, Image, CheckCircle, XCircle, Smartphone, Car, Tag, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, Tabs, Badge, Button, Table, Modal, EmptyState, Avatar } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface TabConfig {
  id: string;
  label: string;
  icon: any;
}

const TABS: TabConfig[] = [
  { id: 'solicitacoes', label: 'Solicitações', icon: Shield },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'classificados', label: 'Classificados', icon: ShoppingBag },
  { id: 'avaliacoes', label: 'Avaliações', icon: Star },
  { id: 'achados', label: 'Achados e Perdidos', icon: Search },
  { id: 'ativos', label: 'Controle de Ativos', icon: Package },
  { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3 },
  { id: 'anuncios', label: 'Comunicados', icon: Megaphone },
  { id: 'destaques', label: 'Destaques', icon: Image },
];

interface Solicitacao { id: number; tipo: string; status: string; nome_solicitante: string; unidade: string; created_at: string; }

// Helper para extrair array de qualquer formato de resposta
const extractArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.anuncios && Array.isArray(data.anuncios)) return data.anuncios;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};

export default function FuncionalidadesPage() {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState('solicitacoes');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => { fetchAllCounts(); }, [currentTenant]);

  const fetchAllCounts = async () => {
    setLoadingCounts(true);
    const newCounts: Record<string, number> = {};
    
    const endpoints: Record<string, string> = {
      'solicitacoes': '/acessos?status=pendente',
      'documentos': '/documentos',
      'faq': '/faq',
      'classificados': '/classificados',
      'avaliacoes': '/avaliacoes',
      'achados': '/achados-perdidos',
      'ativos': '/ativos',
      'anuncios': '/anuncios',
      'destaques': '/destaques',
    };

    await Promise.all(Object.entries(endpoints).map(async ([key, endpoint]) => {
      try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        if (res.ok) {
          const data = await res.json();
          const arr = extractArray(data);
          newCounts[key] = arr.length;
        }
      } catch {}
    }));
    
    setCounts(newCounts);
    setLoadingCounts(false);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Funcionalidades</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gerencie todas as funcionalidades do sistema</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAllCounts} disabled={loadingCounts}>
          <RefreshCw size={16} style={{ animation: loadingCounts ? 'spin 1s linear infinite' : 'none' }}/> Atualizar
        </Button>
      </div>
      
      <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-default)' }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const count = counts[tab.id];
          const hasCount = count !== undefined && count > 0;
          
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent', border: 'none', borderRadius: '6px',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              <Icon size={16} />
              {tab.label}
              {hasCount && (
                <span style={{
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--accent)',
                  color: 'white', padding: '0.125rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
      
      {activeTab === 'solicitacoes' && <SolicitacoesTab onUpdate={fetchAllCounts} />}
      {activeTab === 'documentos' && <GenericTab endpoint="/documentos" icon={<FileText size={18}/>} title="Documentos" renderItem={(item) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={20} style={{ color: 'var(--accent)' }}/>
            <div><p style={{ fontWeight: 500 }}>{item.titulo || item.nome || 'Documento'}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.categoria || item.tipo || ''}</p></div>
          </div>
          <Badge>{item.tipo || 'PDF'}</Badge>
        </div>
      )}/>}
      {activeTab === 'faq' && <GenericTab endpoint="/faq" icon={<HelpCircle size={18}/>} title="Perguntas Frequentes" renderItem={(item) => (
        <details style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '1rem' }}>
          <summary style={{ fontWeight: 500, cursor: 'pointer' }}>{item.pergunta || item.titulo || 'Pergunta'}</summary>
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.resposta || item.conteudo || ''}</p>
        </details>
      )}/>}
      {activeTab === 'classificados' && <GenericTab endpoint="/classificados" icon={<ShoppingBag size={18}/>} title="Classificados" grid renderItem={(item) => (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ height: '120px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={32} style={{ color: 'var(--text-muted)' }}/>
          </div>
          <div style={{ padding: '0.75rem' }}>
            <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{item.titulo || 'Item'}</p>
            <p style={{ color: 'var(--success)', fontWeight: 600 }}>R$ {parseFloat(item.preco || 0).toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      )}/>}
      {activeTab === 'avaliacoes' && <GenericTab endpoint="/avaliacoes" icon={<Star size={18}/>} title="Avaliações" renderItem={(item) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div><p style={{ fontWeight: 500 }}>{item.tipo || item.categoria || 'Avaliação'}</p><p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.descricao || item.comentario || ''}</p></div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>{[1,2,3,4,5].map(n => <Star key={n} size={16} fill={n <= (item.nota || 0) ? '#f59e0b' : 'transparent'} stroke={n <= (item.nota || 0) ? '#f59e0b' : 'var(--text-muted)'}/>)}</div>
        </div>
      )}/>}
      {activeTab === 'achados' && <GenericTab endpoint="/achados-perdidos" icon={<Search size={18}/>} title="Achados e Perdidos" renderItem={(item) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Search size={20} style={{ color: 'var(--accent)' }}/>
            <div><p style={{ fontWeight: 500 }}>{item.descricao || item.titulo || 'Item'}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.local || ''}</p></div>
          </div>
          <Badge variant={item.status === 'aberto' ? 'warning' : 'success'}>{item.status || item.tipo || 'Aberto'}</Badge>
        </div>
      )}/>}
      {activeTab === 'ativos' && <GenericTab endpoint="/ativos" icon={<Package size={18}/>} title="Controle de Ativos" renderItem={(item) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
          <div><p style={{ fontWeight: 500 }}>{item.nome || item.descricao || 'Ativo'}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.localizacao || item.categoria || ''}</p></div>
          <Badge variant={item.status === 'ativo' ? 'success' : 'default'}>{item.status || 'Ativo'}</Badge>
        </div>
      )}/>}
      {activeTab === 'estatisticas' && <EstatisticasTab />}
      {activeTab === 'anuncios' && <GenericTab endpoint="/anuncios" icon={<Megaphone size={18}/>} title="Comunicados" renderItem={(item) => (
        <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <p style={{ fontWeight: 600 }}>{item.titulo || 'Comunicado'}</p>
            <Badge variant={item.ativo !== false ? 'success' : 'default'}>{item.ativo !== false ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{(item.conteudo || item.descricao || '').substring(0, 150)}</p>
        </div>
      )}/>}
      {activeTab === 'destaques' && <GenericTab endpoint="/destaques" icon={<Image size={18}/>} title="Destaques" grid renderItem={(item) => (
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ height: '150px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {item.imagem_url ? <img src={item.imagem_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <Image size={32} style={{ color: 'var(--text-muted)' }}/>}
          </div>
          <div style={{ padding: '0.75rem' }}>
            <p style={{ fontWeight: 500 }}>{item.titulo || 'Destaque'}</p>
            <Badge variant={item.ativo !== false ? 'success' : 'default'} style={{ marginTop: '0.5rem' }}>{item.ativo !== false ? 'Ativo' : 'Inativo'}</Badge>
          </div>
        </div>
      )}/>}
      
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// =============================================
// COMPONENTE GENÉRICO PARA TABS
// =============================================
function GenericTab({ endpoint, icon, title, renderItem, grid }: { endpoint: string; icon: React.ReactNode; title: string; renderItem: (item: any) => React.ReactNode; grid?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}${endpoint}`)
      .then(r => r.json())
      .then(d => {
        const arr = extractArray(d);
        setItems(arr);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setItems([]);
        setLoading(false);
      });
  }, [endpoint]);

  if (loading) return <LoadingCard />;
  
  if (error) return (
    <Card>
      <CardHeader><CardTitle icon={icon}>{title}</CardTitle></CardHeader>
      <EmptyState icon={<XCircle size={48}/>} title="Erro ao carregar" description="Não foi possível carregar os dados"/>
    </Card>
  );
  
  return (
    <Card>
      <CardHeader><CardTitle icon={icon}>{title} ({items.length})</CardTitle></CardHeader>
      {items.length === 0 ? (
        <EmptyState icon={icon} title={`Nenhum registro`} description="Nenhum item encontrado"/>
      ) : (
        <div style={{ 
          display: grid ? 'grid' : 'flex', 
          gridTemplateColumns: grid ? 'repeat(auto-fill, minmax(250px, 1fr))' : undefined,
          flexDirection: grid ? undefined : 'column',
          gap: '0.75rem', 
          padding: '1rem' 
        }}>
          {items.map((item: any, idx: number) => (
            <React.Fragment key={item.id || idx}>
              {renderItem(item)}
            </React.Fragment>
          ))}
        </div>
      )}
    </Card>
  );
}

// =============================================
// TAB: SOLICITAÇÕES DE ACESSO
// =============================================
function SolicitacoesTab({ onUpdate }: { onUpdate?: () => void }) {
  const { currentTenant } = useTenant();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pendente');
  const [modalRecusa, setModalRecusa] = useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [motivosPadrao, setMotivosPadrao] = useState<string[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchSolicitacoes();
    fetch(`${API_BASE}/acessos/motivos-recusa?tenant_id=${currentTenant?.tenant_id}`).then(r => r.json()).then(d => setMotivosPadrao(d.motivos || [])).catch(() => {});
  }, [statusFilter]);

  const fetchSolicitacoes = async () => {
    setLoading(true);
    try { 
      const res = await fetch(`${API_BASE}/acessos?status=${statusFilter}&tenant_id=${currentTenant?.tenant_id}`); 
      const data = await res.json(); 
      setSolicitacoes(extractArray(data)); 
    } catch (_e) { setSolicitacoes([]); }
    setLoading(false);
  };

  const handleAprovar = async (id: number) => { 
    await fetch(`${API_BASE}/acessos/${id}/aprovar`, { method: 'POST' }); 
    fetchSolicitacoes(); 
    onUpdate?.();
  };
  
  const handleRecusar = async () => {
    if (!modalRecusa.id) return;
    await fetch(`${API_BASE}/acessos/${modalRecusa.id}/recusar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo: motivoRecusa }) });
    setModalRecusa({ open: false, id: null }); setMotivoRecusa(''); 
    fetchSolicitacoes();
    onUpdate?.();
  };

  const columns = [
    { key: 'solicitante', header: 'Solicitante', render: (item: Solicitacao) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Avatar name={item.nome_solicitante || 'Usuário'} size={36} />
        <div><p style={{ fontWeight: 500 }}>{item.nome_solicitante || 'Usuário'}</p><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unidade || ''}</p></div>
      </div>
    )},
    { key: 'tipo', header: 'Tipo', render: (item: Solicitacao) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {item.tipo === 'facial' ? <Smartphone size={16}/> : item.tipo === 'veiculo' ? <Car size={16}/> : <Tag size={16}/>}
        <span style={{ textTransform: 'capitalize' }}>{item.tipo || 'Acesso'}</span>
      </div>
    )},
    { key: 'data', header: 'Data', render: (item: Solicitacao) => <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}</span> },
    { key: 'acoes', header: 'Ações', align: 'right' as const, render: (item: Solicitacao) => (
      statusFilter === 'pendente' ? (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button variant="success" size="sm" onClick={() => handleAprovar(item.id)}><CheckCircle size={14}/> Aprovar</Button>
          <Button variant="danger" size="sm" onClick={() => setModalRecusa({ open: true, id: item.id })}><XCircle size={14}/> Recusar</Button>
        </div>
      ) : <Badge variant={statusFilter === 'aprovado' ? 'success' : 'error'}>{statusFilter}</Badge>
    )},
  ];

  return (
    <Card>
      <CardHeader><CardTitle icon={<Shield size={18}/>}>Solicitações de Acesso</CardTitle></CardHeader>
      <Tabs tabs={[{ id: 'pendente', label: 'Pendentes' }, { id: 'aprovado', label: 'Aprovados' }, { id: 'recusado', label: 'Recusados' }]} activeTab={statusFilter} onChange={setStatusFilter} />
      <Table columns={columns} data={solicitacoes} loading={loading} emptyMessage="Nenhuma solicitação" emptyIcon={<CheckCircle size={48}/>} />
      <Modal isOpen={modalRecusa.open} onClose={() => setModalRecusa({ open: false, id: null })} title="Recusar Solicitação" footer={<><Button variant="ghost" onClick={() => setModalRecusa({ open: false, id: null })}>Cancelar</Button><Button variant="danger" onClick={handleRecusar}>Confirmar</Button></>}>
        <select value={motivoRecusa} onChange={e => setMotivoRecusa(e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          <option value="">Selecione um motivo...</option>
          {motivosPadrao.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <textarea value={motivoRecusa} onChange={e => setMotivoRecusa(e.target.value)} placeholder="Ou digite..." rows={3} style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
      </Modal>
    </Card>
  );
}

// =============================================
// TAB: ESTATÍSTICAS
// =============================================
function EstatisticasTab() {
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => { 
    fetch(`${API_BASE}/estatisticas?tenant_id=${currentTenant?.tenant_id}`).then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false)); 
  }, [currentTenant]);
  
  if (loading) return <LoadingCard />;
  
  const items = [
    { label: 'Ocorrências', value: stats?.ocorrencias || 0, color: 'var(--error)' },
    { label: 'Avisos', value: stats?.avisos || 0, color: 'var(--warning)' },
    { label: 'Enquetes', value: stats?.enquetes || 0, color: 'var(--accent)' },
    { label: 'Encomendas', value: stats?.encomendas || 0, color: 'var(--success)' },
    { label: 'Visitas', value: stats?.visitas || 0, color: '#8b5cf6' },
    { label: 'Reservas', value: stats?.reservas || 0, color: '#14b8a6' },
    { label: 'Chamados', value: stats?.chamados_manutencao || 0, color: '#f97316' },
    { label: 'Classificados', value: stats?.classificados || 0, color: '#84cc16' },
  ];
  
  return (
    <Card>
      <CardHeader><CardTitle icon={<BarChart3 size={18}/>}>Estatísticas Gerais</CardTitle></CardHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', padding: '1rem' }}>
        {items.map(i => (
          <div key={i.label} style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: `3px solid ${i.color}` }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: i.color, textTransform: 'uppercase' }}>{i.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>{i.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================
// COMPONENTES AUXILIARES
// =============================================
function LoadingCard() {
  return (
    <Card style={{ padding: '3rem', textAlign: 'center' }}>
      <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)', marginBottom: '1rem' }}/>
      <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
    </Card>
  );
}
