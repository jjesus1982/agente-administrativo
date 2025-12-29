"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { PawPrint, Plus, Edit, Trash2, RefreshCw, X } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import ManagementTabs from '@/components/ManagementTabs';
import { API_BASE } from '@/lib/api';

interface Pet {
  id: number; name: string; species: string; breed: string; color: string; size: string;
  gender: string; age: number; owner_name: string; unit_number: string; block: string;
}

export default function PetsPage() {
  const { currentTenant } = useTenant();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const limit = 15;

  const fetchPets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pets/?page=${page}&limit=${limit}&tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setPets(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchPets(); }, [page, currentTenant]);
  const totalPages = Math.ceil(total / limit);

  const getSpeciesEmoji = (s: string) => {
    const map: Record<string, string> = { cachorro: '🐕', cão: '🐕', dog: '🐕', gato: '🐈', cat: '🐈' };
    return map[s?.toLowerCase()] || '🐾';
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão?')) return;
    await fetch(`${API_BASE}/pets/${id}`, { method: 'DELETE' });
    fetchPets();
  };

  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <PawPrint size={24} style={{ color: '#ec4899' }}/> <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Pets</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({total})</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={fetchPets} title="Atualizar"><RefreshCw size={16}/></Button>
          <Button style={{ background: '#22c55e', color: 'white' }} onClick={() => setShowModal(true)}><Plus size={16}/> Cadastrar pet</Button>
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Nome</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Espécie</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Raça</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Porte</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Idade</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Unidade</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</td></tr>
              ) : pets.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum pet cadastrado</td></tr>
              ) : (
                pets.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}><span style={{ marginRight: '0.5rem' }}>{getSpeciesEmoji(p.species)}</span>{p.name || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{p.species || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{p.breed || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{p.size || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{p.age ? `${p.age} ano(s)` : '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{p.unit_number ? `${p.block || ''} ${p.unit_number}` : '-'}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <Button variant="ghost" size="sm"><Edit size={14}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 size={14}/></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{total} pet(s)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}>‹ Anterior</Button>
            <span>{page} / {totalPages || 1}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Próxima ›</Button>
          </div>
        </div>
      </Card>

      {showModal && <ModalPet onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchPets(); }} tenantId={currentTenant?.tenant_id} />}
    </div>
  );
}

function ModalPet({ onClose, onSuccess, tenantId }: { onClose: () => void; onSuccess: () => void; tenantId?: number }) {
  const [form, setForm] = useState({ name: '', species: 'Cachorro', breed: '', size: 'medio', owner_id: 1 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/pets/?tenant_id=${tenantId}`, {
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Novo Pet</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input placeholder="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <select value={form.species} onChange={e => setForm({ ...form, species: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <option value="Cachorro">Cachorro</option>
              <option value="Gato">Gato</option>
              <option value="Pássaro">Pássaro</option>
              <option value="Outro">Outro</option>
            </select>
            <input placeholder="Raça" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <select value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
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
