"use client";
import React, { useState, useEffect } from 'react';
import { 
  Package, Search, Clock, AlertTriangle, CheckCircle, Truck,
  MapPin, Bell, X, RefreshCw, Plus, Barcode, Box, ShoppingBag
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

interface Encomenda {
  id: number;
  unit_id: number;
  recipient_name: string;
  tracking_code: string | null;
  carrier: string;
  description: string | null;
  photo_url: string | null;
  storage_location: string | null;
  status: string;
  is_perishable: boolean;
  is_fragile: boolean;
  received_at: string;
  delivered_at: string | null;
  delivered_to: string | null;
  block: string | null;
  unit_number: string | null;
}

interface Stats {
  pending: number;
  overdue: number;
  perishable: number;
  delivered_today: number;
  total: number;
}

const carrierConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'Correios': { icon: <Package size={20}/>, color: '#f4c542' },
  'Sedex': { icon: <Truck size={20}/>, color: '#e74c3c' },
  'Amazon': { icon: <ShoppingBag size={20}/>, color: '#ff9900' },
  'Mercado Livre': { icon: <ShoppingBag size={20}/>, color: '#ffe600' },
  'iFood': { icon: <Box size={20}/>, color: '#ea1d2c' },
  'Rappi': { icon: <Box size={20}/>, color: '#ff441f' },
  'DHL': { icon: <Truck size={20}/>, color: '#d40511' },
  'default': { icon: <Box size={20}/>, color: '#64748b' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'pending': { label: 'Aguardando', color: '#f59e0b' },
  'notified': { label: 'Notificado', color: '#3b82f6' },
  'delivered': { label: 'Entregue', color: '#22c55e' },
};

export default function EncomendasPage() {
  const { currentTenant } = useTenant();
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, overdue: 0, perishable: 0, delivered_today: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('pending_all');
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEncomenda, setSelectedEncomenda] = useState<Encomenda | null>(null);
  const [deliverTo, setDeliverTo] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchEncomendas(); }, [filter, search, currentTenant]);

  const fetchEncomendas = async () => {
    try {
      let url = `${API_BASE}/encomendas?limit=100`;
      if (filter) url += `&status=${filter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setEncomendas(data.encomendas || []);
      setStats(data.stats || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeliver = async () => {
    if (!selectedEncomenda || !deliverTo.trim()) return;
    await fetch(`${API_BASE}/encomendas/${selectedEncomenda.id}/deliver?tenant_id=${currentTenant?.tenant_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivered_to: deliverTo })
    });
    setShowDeliverModal(false);
    setDeliverTo('');
    setSelectedEncomenda(null);
    fetchEncomendas();
  };

  const handleNotify = async (id: number) => {
    await fetch(`${API_BASE}/encomendas/${id}/notify?tenant_id=${currentTenant?.tenant_id}`, { method: 'POST' });
    fetchEncomendas();
  };

  const getAging = (receivedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(receivedAt).getTime()) / 3600000);
    if (hours < 1) return { text: 'Agora', color: '#22c55e' };
    if (hours < 24) return { text: `${hours}h`, color: '#22c55e' };
    const days = Math.floor(hours / 24);
    if (days < 3) return { text: `${days}d`, color: '#f59e0b' };
    return { text: `${days}d`, color: '#ef4444' };
  };

  const getCarrier = (carrier: string) => {
    const found = carrierConfig[carrier] ?? carrierConfig['default'];
    return found ?? { name: 'Outra', icon: <Package size={24}/>, color: '#6b7280' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Package size={24}/>
            </div>
            Smart Logistics
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Gestão inteligente de encomendas</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}><Plus size={18}/> Nova Encomenda</Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard title="Aguardando" value={stats.pending} color="yellow" icon={<Package size={18}/>} active={filter === 'pending_all'} onClick={() => setFilter('pending_all')}/>
        <StatCard title="Atrasadas" value={stats.overdue} color="red" icon={<AlertTriangle size={18}/>} pulse={stats.overdue > 0}/>
        <StatCard title="Perecíveis" value={stats.perishable} color="yellow" icon={<Box size={18}/>} pulse={stats.perishable > 0}/>
        <StatCard title="Entregues Hoje" value={stats.delivered_today} color="green" icon={<CheckCircle size={18}/>} active={filter === 'delivered'} onClick={() => setFilter('delivered')}/>
      </div>

      {/* Search & Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
          <input type="text" placeholder="Buscar por nome, unidade ou código..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 40px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}/>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <FilterPill label="Pendentes" active={filter === 'pending_all'} onClick={() => setFilter('pending_all')} count={stats.pending}/>
          <FilterPill label="Entregues" active={filter === 'delivered'} onClick={() => setFilter('delivered')}/>
          <FilterPill label="Todas" active={!filter} onClick={() => setFilter('')}/>
        </div>
      </div>

      {/* Lista de Encomendas */}
      {encomendas.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}/>
          <h3>Nenhuma encomenda encontrada</h3>
          <p style={{ color: 'var(--text-muted)' }}>Registre uma nova ou altere os filtros</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {encomendas.map(enc => {
            const aging = getAging(enc.received_at);
            const carrier = getCarrier(enc.carrier);
            const status = statusConfig[enc.status] ?? statusConfig['pending'] ?? { label: 'Aguardando', color: '#f59e0b' };

            return (
              <Card key={enc.id} style={{ padding: 0, overflow: 'hidden', border: aging.color === '#ef4444' ? '1px solid #ef444440' : '1px solid var(--border-color)' }}>
                <div style={{ height: '4px', background: status.color }}/>
                <div style={{ padding: '1rem' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: '50px', height: '50px', borderRadius: '10px', background: `${carrier.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: carrier.color }}>
                        {carrier.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{enc.recipient_name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{enc.block}-{enc.unit_number}</div>
                      </div>
                    </div>
                    <div style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', background: `${aging.color}20`, color: aging.color, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', height: 'fit-content' }}>
                      <Clock size={12}/> {aging.text}
                    </div>
                  </div>
                  
                  {/* Info Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Badge icon={<Truck size={12}/>} text={enc.carrier}/>
                    {enc.storage_location && <Badge icon={<MapPin size={12}/>} text={enc.storage_location}/>}
                    {enc.is_perishable && <Badge icon={<AlertTriangle size={12}/>} text="Perecível" color="#f97316"/>}
                  </div>
                  
                  {/* Tracking */}
                  {enc.tracking_code && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Barcode size={12}/> {enc.tracking_code}
                    </div>
                  )}
                  
                  {/* Actions */}
                  {enc.status !== 'delivered' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => { setSelectedEncomenda(enc); setShowDeliverModal(true); }}
                        style={{ flex: 1, padding: '0.625rem', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', fontWeight: 500, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                        <CheckCircle size={16}/> Entregar
                      </button>
                      <button onClick={() => handleNotify(enc.id)}
                        style={{ padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Notificar">
                        <Bell size={16}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <CheckCircle size={14}/> Retirado por {enc.delivered_to}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Entregar */}
      {showDeliverModal && selectedEncomenda && (
        <Modal onClose={() => { setShowDeliverModal(false); setDeliverTo(''); }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={24} style={{ color: '#22c55e' }}/> Confirmar Entrega
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Encomenda para <strong>{selectedEncomenda.recipient_name}</strong> ({selectedEncomenda.block}-{selectedEncomenda.unit_number})
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nome de quem está retirando:</label>
            <input type="text" value={deliverTo} onChange={e => setDeliverTo(e.target.value)} placeholder="Digite o nome completo" autoFocus
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={() => setShowDeliverModal(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button onClick={handleDeliver} disabled={!deliverTo.trim()} style={{ flex: 1, background: '#22c55e' }}>Confirmar</Button>
          </div>
        </Modal>
      )}

      {/* Modal Nova Encomenda */}
      {showNewModal && <NewModal onClose={() => setShowNewModal(false)} onSuccess={() => { setShowNewModal(false); fetchEncomendas(); }} tenantId={currentTenant?.tenant_id}/>}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon, active, onClick, pulse }: any) {
  return (
    <div onClick={onClick} style={{ background: active ? `${color}15` : 'var(--bg-secondary)', border: `1px solid ${active ? color : 'var(--border-color)'}`, borderRadius: '12px', padding: '1rem', cursor: onClick ? 'pointer' : 'default', position: 'relative' }}>
      {pulse && value > 0 && <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '8px', height: '8px', borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }}/>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><div style={{ color }}>{icon}</div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span></div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: active ? color : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function FilterPill({ label, active, onClick, count }: any) {
  return (
    <button onClick={onClick} style={{ padding: '0.5rem 0.875rem', borderRadius: '20px', border: 'none', background: active ? 'var(--accent)' : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {label}{count !== undefined && <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)', padding: '0.125rem 0.375rem', borderRadius: '10px', fontSize: '0.7rem' }}>{count}</span>}
    </button>
  );
}

function Badge({ icon, text, color }: any) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: color ? `${color}20` : 'var(--bg-tertiary)', color: color || 'var(--text-muted)', fontSize: '0.75rem' }}>{icon} {text}</span>;
}

function Modal({ children, onClose }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
        {children}
      </div>
    </div>
  );
}

function NewModal({ onClose, onSuccess, tenantId }: any) {
  const [form, setForm] = useState({ unit_id: '', recipient_name: '', carrier: 'Correios', tracking_code: '', storage_location: '', is_perishable: false });
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch(`${API_BASE}/units?tenant_id=${tenantId}&limit=1000`).then(r => r.json()).then(d => setUnits(d.items || [])); }, [tenantId]);

  const handleSubmit = async () => {
    if (!form.unit_id || !form.recipient_name) return;
    setLoading(true);
    await fetch(`${API_BASE}/encomendas?tenant_id=${tenantId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, unit_id: parseInt(form.unit_id) }) });
    setLoading(false);
    onSuccess();
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={24} style={{ color: '#f59e0b' }}/> Nova Encomenda</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Unidade *</label>
          <select value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <option value="">Selecione...</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.block}-{u.number}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Destinatário *</label>
          <input type="text" value={form.recipient_name} onChange={e => setForm({...form, recipient_name: e.target.value})} placeholder="Nome do morador" style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Transportadora</label>
          <select value={form.carrier} onChange={e => setForm({...form, carrier: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {['Correios', 'Sedex', 'Amazon', 'Mercado Livre', 'iFood', 'Rappi', 'DHL', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Código Rastreio</label>
          <input type="text" value={form.tracking_code} onChange={e => setForm({...form, tracking_code: e.target.value})} placeholder="BR123456789BR" style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Localização</label>
          <input type="text" value={form.storage_location} onChange={e => setForm({...form, storage_location: e.target.value})} placeholder="Prateleira A1" style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_perishable} onChange={e => setForm({...form, is_perishable: e.target.checked})}/>
          <span style={{ fontSize: '0.85rem' }}>Perecível</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading || !form.unit_id || !form.recipient_name} style={{ flex: 1 }}>Registrar</Button>
      </div>
    </Modal>
  );
}
