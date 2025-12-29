"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Home, Plus, Search, Edit, Trash2, Users, Car, RefreshCw, X } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import ManagementTabs from '@/components/ManagementTabs';
import { API_BASE } from '@/lib/api';

interface Unit {
  id: number; block: string; number: string; floor: number; unit_type: string;
  area: number; bedrooms: number; owner_name: string; is_rented: boolean; resident_count: number;
}

export default function UnidadesPage() {
  const { currentTenant } = useTenant();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/units/?limit=500&tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setUnits(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUnits(); }, [currentTenant]);

  const filtered = units.filter(u => 
    !busca || u.number?.toLowerCase().includes(busca.toLowerCase()) || u.block?.toLowerCase().includes(busca.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (a.block !== b.block) return (a.block || '').localeCompare(b.block || '');
    return (a.number || '').localeCompare(b.number || '');
  });

  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Home size={24} style={{ color: '#f97316' }}/> <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Unidades</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({filtered.length})</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={fetchUnits} title="Atualizar"><RefreshCw size={16}/></Button>
          <Button style={{ background: '#22c55e', color: 'white' }} onClick={() => setShowModal(true)}><Plus size={16}/> Criar Unidade</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1rem', minHeight: '500px' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar unidade..."
                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.25rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>Pessoas</span><span>Unidade</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma unidade encontrada</div>
            ) : (
              sorted.map((unit, i) => (
                <div key={unit.id} onClick={() => setSelectedUnit(unit)}
                  style={{ display: 'grid', gridTemplateColumns: '60px 1fr', alignItems: 'center', padding: '0.625rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                    background: selectedUnit?.id === unit.id ? 'var(--accent-light)' : i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}
                  onMouseEnter={e => { if (selectedUnit?.id !== unit.id) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={e => { if (selectedUnit?.id !== unit.id) e.currentTarget.style.background = i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'; }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{unit.resident_count || 0}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: selectedUnit?.id === unit.id ? 600 : 400 }}>{unit.block} {unit.number}</span>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {sorted.length} unidade(s)
          </div>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column' }}>
          {!selectedUnit ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Selecione uma unidade para visualizar seus detalhes
            </div>
          ) : (
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: '#f9731620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
                  <Home size={28}/>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{selectedUnit.block} {selectedUnit.number}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                    {selectedUnit.unit_type || 'Apartamento'} • {selectedUnit.area ? `${selectedUnit.area}m²` : '-'}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                  <Button variant="ghost" size="sm"><Edit size={16}/></Button>
                  <Button variant="ghost" size="sm"><Trash2 size={16}/></Button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatBox icon={<Users size={20}/>} label="Moradores" value={selectedUnit.resident_count || 0} color="#3b82f6"/>
                <StatBox icon={<Car size={20}/>} label="Veículos" value={0} color="#eab308"/>
                <StatBox icon={<Home size={20}/>} label="Quartos" value={selectedUnit.bedrooms || 0} color="#22c55e"/>
              </div>
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem' }}>Informações</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Proprietário:</span> <span style={{ fontWeight: 500 }}>{selectedUnit.owner_name || '-'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Andar:</span> <span style={{ fontWeight: 500 }}>{selectedUnit.floor || '-'}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Alugada:</span> <span style={{ fontWeight: 500 }}>{selectedUnit.is_rented ? 'Sim' : 'Não'}</span></div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showModal && <ModalUnidade onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchUnits(); }} tenantId={currentTenant?.tenant_id} />}
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
      <div style={{ color, marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function ModalUnidade({ onClose, onSuccess, tenantId }: { onClose: () => void; onSuccess: () => void; tenantId?: number }) {
  const [form, setForm] = useState({ block: '', number: '', floor: 0, bedrooms: 0 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/units/?tenant_id=${tenantId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) onSuccess(); else alert('Erro ao cadastrar');
    } catch (_e) { alert('Erro ao cadastrar'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Nova Unidade</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input placeholder="Bloco" value={form.block} onChange={e => setForm({ ...form, block: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input placeholder="Número *" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input placeholder="Andar" type="number" value={form.floor || ''} onChange={e => setForm({ ...form, floor: parseInt(e.target.value) || 0 })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input placeholder="Quartos" type="number" value={form.bedrooms || ''} onChange={e => setForm({ ...form, bedrooms: parseInt(e.target.value) || 0 })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
