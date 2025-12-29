"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Car, Plus, Edit, Trash2, RefreshCw, X, Truck, Bike } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import ManagementTabs from '@/components/ManagementTabs';
import { API_BASE } from '@/lib/api';

interface Vehicle {
  id: number; plate: string; model: string; brand: string; color: string; year: number;
  vehicle_type: string; owner_name: string; unit_number: string; block: string;
}

export default function VeiculosPage() {
  const { currentTenant } = useTenant();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const limit = 15;

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vehicles/?page=${page}&limit=${limit}&tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setVehicles(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchVehicles(); }, [page, currentTenant]);

  const totalPages = Math.ceil(total / limit);

  const getVehicleIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'moto': return <Bike size={16}/>;
      case 'caminhao': return <Truck size={16}/>;
      default: return <Car size={16}/>;
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão?')) return;
    await fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE' });
    fetchVehicles();
  };

  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Car size={24} style={{ color: '#eab308' }}/> <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Veículos</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({total})</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={fetchVehicles} title="Atualizar"><RefreshCw size={16}/></Button>
          <Button style={{ background: '#22c55e', color: 'white' }} onClick={() => setShowModal(true)}><Plus size={16}/> Cadastrar veículo</Button>
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Tipo</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Placa</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Modelo</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Marca</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Cor</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Unidade</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Proprietário</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</td></tr>
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum veículo cadastrado</td></tr>
              ) : (
                vehicles.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{getVehicleIcon(v.vehicle_type)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontFamily: 'monospace' }}>{v.plate || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{v.model || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{v.brand || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{v.color || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{v.unit_number ? `${v.block || ''} ${v.unit_number}` : '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{v.owner_name || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <Button variant="ghost" size="sm"><Edit size={14}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(v.id)}><Trash2 size={14}/></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{total} veículo(s)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}>‹ Anterior</Button>
            <span>{page} / {totalPages || 1}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Próxima ›</Button>
          </div>
        </div>
      </Card>

      {showModal && <ModalVeiculo onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchVehicles(); }} tenantId={currentTenant?.tenant_id} />}
    </div>
  );
}

function ModalVeiculo({ onClose, onSuccess, tenantId }: { onClose: () => void; onSuccess: () => void; tenantId?: number }) {
  const [form, setForm] = useState({ plate: '', model: '', brand: '', color: '', vehicle_type: 'carro', owner_id: 1 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/vehicles/?tenant_id=${tenantId}`, {
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Novo Veículo</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input placeholder="Placa *" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <input placeholder="Modelo" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <input placeholder="Marca" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <input placeholder="Cor" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <select value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="caminhao">Caminhão</option>
            </select>
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
