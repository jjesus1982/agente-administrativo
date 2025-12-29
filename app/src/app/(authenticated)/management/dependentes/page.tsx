"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { UserPlus, Plus, Edit, Trash2, RefreshCw, X } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import ManagementTabs from '@/components/ManagementTabs';
import { API_BASE } from '@/lib/api';

interface Dependent {
  id: number; name: string; relationship_type: string; phone: string; cpf: string; rg: string;
  age: number; responsible_name: string; unit_number: string; block: string; can_access_alone: boolean;
}

export default function DependentesPage() {
  const { currentTenant } = useTenant();
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const limit = 15;

  const fetchDependents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/dependents/?page=${page}&limit=${limit}&tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setDependents(data.items || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchDependents(); }, [page, currentTenant]);
  const totalPages = Math.ceil(total / limit);

  const handleDelete = async (id: number) => {
    if (!confirm('Confirma exclusão?')) return;
    await fetch(`${API_BASE}/dependents/${id}`, { method: 'DELETE' });
    fetchDependents();
  };

  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <UserPlus size={24} style={{ color: '#22c55e' }}/> <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Dependentes</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({total})</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="ghost" size="sm" onClick={fetchDependents} title="Atualizar"><RefreshCw size={16}/></Button>
          <Button style={{ background: '#22c55e', color: 'white' }} onClick={() => setShowModal(true)}><Plus size={16}/> Cadastrar dependente</Button>
        </div>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Nome</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Parentesco</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Idade</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Telefone</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Unidade</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)' }}>Acesso</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</td></tr>
              ) : dependents.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dependente cadastrado</td></tr>
              ) : (
                dependents.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 600 }}>
                          {d.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        {d.name || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.relationship_type || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.age || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.phone || '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.unit_number ? `${d.block || ''} ${d.unit_number}` : '-'}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {d.can_access_alone ? <Badge variant="success">Autorizado</Badge> : <Badge variant="default">Restrito</Badge>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <Button variant="ghost" size="sm"><Edit size={14}/></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}><Trash2 size={14}/></Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{total} dependente(s)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}>‹ Anterior</Button>
            <span>{page} / {totalPages || 1}</span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}>Próxima ›</Button>
          </div>
        </div>
      </Card>

      {showModal && <ModalDependente onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchDependents(); }} tenantId={currentTenant?.tenant_id} />}
    </div>
  );
}

function ModalDependente({ onClose, onSuccess, tenantId }: { onClose: () => void; onSuccess: () => void; tenantId?: number }) {
  const [form, setForm] = useState({ name: '', relationship_type: 'Filho', phone: '', responsible_id: 1 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/dependents/?tenant_id=${tenantId}`, {
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Novo Dependente</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input placeholder="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
            <select value={form.relationship_type} onChange={e => setForm({ ...form, relationship_type: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
              <option value="Filho">Filho(a)</option>
              <option value="Esposo">Esposo(a)</option>
              <option value="Pai">Pai/Mãe</option>
              <option value="Irmao">Irmão(ã)</option>
              <option value="Outro">Outro</option>
            </select>
            <input placeholder="Telefone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }} />
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
