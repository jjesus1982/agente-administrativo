"use client";
import React, { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api';
import { useTenant } from '@/contexts/TenantContext';
import { Plus, Search, Edit, Trash2, Phone, Mail, Home, RefreshCw, X } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import ManagementTabs from '@/components/ManagementTabs';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  role: string;
  is_active: boolean;
  birth_date: string;
  created_at: string;
  unit_id: number;
  unit_number: string;
  block: string;
}

export default function UsuariosPage() {
  const { currentTenant } = useTenant();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const url = API_BASE + '/reports/moradores?limit=500&tenant_id=' + (currentTenant?.tenant_id || 1);
      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers(); }, [currentTenant]);

  const filtered = users.filter(u => 
    !busca || 
    u.name?.toLowerCase().includes(busca.toLowerCase()) ||
    u.email?.toLowerCase().includes(busca.toLowerCase()) ||
    u.cpf?.includes(busca)
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      '1': { label: 'Morador', color: '#3b82f6' },
      '2': { label: 'Síndico', color: '#f59e0b' },
      '3': { label: 'Porteiro', color: '#22c55e' },
      '4': { label: 'Admin', color: '#ef4444' },
      '5': { label: 'Super Admin', color: '#8b5cf6' },
    };
    const r = roles[String(role)] || { label: 'Usuário', color: '#64748b' };
    return <Badge style={{ background: r.color + '20', color: r.color, border: '1px solid ' + r.color + '40' }}>{r.label}</Badge>;
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <ManagementTabs />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por nome, email ou CPF..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', width: '300px' }}
            />
          </div>
          <Button variant="ghost" onClick={fetchUsers}><RefreshCw size={16}/></Button>
        </div>
        <Button style={{ background: '#22c55e', color: 'white' }} onClick={() => setShowModal(true)}><Plus size={16}/> Cadastrar usuário</Button>
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Usuário</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Contato</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unidade</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Perfil</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cadastro</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum usuário encontrado</td></tr>
              ) : filtered.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600 }}>
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.cpf || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} color="var(--text-muted)"/> {user.email || '-'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14} color="var(--text-muted)"/> {user.phone || '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Home size={14} color="var(--text-muted)"/>
                      {user.block && user.unit_number ? `${user.block} - ${user.unit_number}` : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{getRoleBadge(user.role)}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDate(user.created_at)}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <Button variant="ghost" style={{ padding: '0.5rem' }}><Edit size={16}/></Button>
                      <Button variant="ghost" style={{ padding: '0.5rem', color: '#ef4444' }}><Trash2 size={16}/></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{filtered.length} usuário(s)</span>
        </div>
      </Card>

      {/* Modal de Cadastro */}
      {showModal && <ModalCadastro onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchUsers(); }} tenantId={currentTenant?.tenant_id} />}
    </div>
  );
}

function ModalCadastro({ onClose, onSuccess, tenantId }: { onClose: () => void; onSuccess: () => void; tenantId?: number }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', cpf: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = API_BASE + '/users/?tenant_id=' + (tenantId || 1);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, password: "12345678", role: 1, is_active: true, tenant_id: tenantId || 1 })
      });
      if (res.ok) { 
        onSuccess(); 
      } else { 
        const err = await res.json(); 
        alert(typeof err.detail === 'string' ? err.detail : (err.message || 'Erro ao cadastrar')); 
      }
    } catch (_e) { alert('Erro ao cadastrar'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Novo Usuário</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input placeholder="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input placeholder="Telefone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            <input placeholder="CPF" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
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
