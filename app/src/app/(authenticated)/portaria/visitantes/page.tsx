"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  Users, Search, Plus, Phone, Camera, RefreshCw, Edit2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, Badge, Modal } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface Visitante {
  id: number;
  nome: string;
  documento: string;
  tipo_documento: string;
  telefone: string;
  email?: string;
  foto_url?: string;
  empresa?: string;
  bloqueado: boolean;
  motivo_bloqueio?: string;
  total_visitas: number;
  ultima_visita?: string;
  created_at: string;
}

export default function VisitantesPage() {
  const { currentTenant } = useTenant();
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBloqueado, setFilterBloqueado] = useState<'todos' | 'ativos' | 'bloqueados'>('todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedVisitante, setSelectedVisitante] = useState<Visitante | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'new'>('view');

  const fetchVisitantes = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/visitors?tenant_id=${tenantId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setVisitantes(data.items || data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar visitantes:', e);
      setVisitantes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVisitantes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const filteredVisitantes = visitantes.filter(v => {
    const matchSearch = v.nome.toLowerCase().includes(search.toLowerCase()) ||
      v.documento.includes(search) ||
      v.telefone.includes(search);
    const matchFilter = filterBloqueado === 'todos' ? true :
      filterBloqueado === 'bloqueados' ? v.bloqueado : !v.bloqueado;
    return matchSearch && matchFilter;
  });

  const handleNewVisitante = () => {
    setSelectedVisitante(null);
    setModalMode('new');
    setShowModal(true);
  };

  const handleViewVisitante = (visitante: Visitante) => {
    setSelectedVisitante(visitante);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEditVisitante = (visitante: Visitante) => {
    setSelectedVisitante(visitante);
    setModalMode('edit');
    setShowModal(true);
  };

  if (loading && visitantes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <Input
              placeholder="Buscar por nome, documento ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={filterBloqueado}
              onChange={(e) => setFilterBloqueado(e.target.value as typeof filterBloqueado)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="bloqueados">Bloqueados</option>
            </select>
            <Button onClick={handleNewVisitante}>
              <Plus size={16} /> Novo Visitante
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <MiniStat label="Total" value={visitantes.length} color="#3b82f6" />
        <MiniStat label="Ativos" value={visitantes.filter(v => !v.bloqueado).length} color="#22c55e" />
        <MiniStat label="Bloqueados" value={visitantes.filter(v => v.bloqueado).length} color="#ef4444" />
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} style={{ color: 'var(--accent)' }} /> Visitantes Cadastrados
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredVisitantes.length} resultado(s)
          </span>
        </CardHeader>

        {filteredVisitantes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum visitante encontrado</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredVisitantes.map((visitante) => (
              <VisitanteRow
                key={visitante.id}
                visitante={visitante}
                onView={() => handleViewVisitante(visitante)}
                onEdit={() => handleEditVisitante(visitante)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <VisitanteModal
          visitante={selectedVisitante}
          mode={modalMode}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchVisitantes();
          }}
        />
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '12px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function VisitanteRow({
  visitante,
  onView,
  onEdit
}: {
  visitante: Visitante;
  onView: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.875rem',
        borderRadius: '8px',
        background: 'var(--bg-tertiary)',
        cursor: 'pointer',
        transition: 'background 150ms',
      }}
      onClick={onView}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
    >
      {/* Avatar */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: visitante.bloqueado ? '#ef444430' : 'var(--accent-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {visitante.foto_url ? (
          <img src={visitante.foto_url} alt={visitante.nome} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontWeight: 600, color: visitante.bloqueado ? '#ef4444' : 'var(--accent)' }}>
            {visitante.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{visitante.nome}</span>
          {visitante.bloqueado && <Badge variant="danger">Bloqueado</Badge>}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {visitante.tipo_documento}: {visitante.documento}
          {visitante.empresa && ` | ${visitante.empresa}`}
        </div>
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'center', padding: '0 1rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>{visitante.total_visitas}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>visitas</div>
      </div>

      {/* Contact */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={(e) => { e.stopPropagation(); window.open(`tel:${visitante.telefone}`); }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            background: '#22c55e20',
            color: '#22c55e',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Phone size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--bg-secondary)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Edit2 size={16} />
        </button>
      </div>
    </div>
  );
}

function VisitanteModal({
  visitante,
  mode,
  onClose,
  onSave
}: {
  visitante: Visitante | null;
  mode: 'view' | 'edit' | 'new';
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    nome: visitante?.nome || '',
    documento: visitante?.documento || '',
    tipo_documento: visitante?.tipo_documento || 'CPF',
    telefone: visitante?.telefone || '',
    email: visitante?.email || '',
    empresa: visitante?.empresa || '',
  });

  const isReadOnly = mode === 'view';
  const title = mode === 'new' ? 'Novo Visitante' : mode === 'edit' ? 'Editar Visitante' : 'Detalhes do Visitante';

  return (
    <Modal isOpen={true} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--accent-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)' }}>
              {formData.nome ? formData.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
            </span>
            {!isReadOnly && (
              <button
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Nome Completo</label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              disabled={isReadOnly}
              placeholder="Nome do visitante"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Tipo Documento</label>
            <select
              value={formData.tipo_documento}
              onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
              disabled={isReadOnly}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="CPF">CPF</option>
              <option value="RG">RG</option>
              <option value="CNH">CNH</option>
              <option value="Passaporte">Passaporte</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>N\u00famero</label>
            <Input
              value={formData.documento}
              onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
              disabled={isReadOnly}
              placeholder="N\u00famero do documento"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Telefone</label>
            <Input
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              disabled={isReadOnly}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Email</label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={isReadOnly}
              placeholder="email@exemplo.com"
              type="email"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Empresa (opcional)</label>
            <Input
              value={formData.empresa}
              onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              disabled={isReadOnly}
              placeholder="Nome da empresa"
            />
          </div>
        </div>

        {/* Stats (view mode) */}
        {isReadOnly && visitante && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total de Visitas</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)' }}>{visitante.total_visitas}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>\u00daltima Visita</div>
              <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                {visitante.ultima_visita ? new Date(visitante.ultima_visita).toLocaleDateString('pt-BR') : '-'}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" onClick={onClose}>
            {isReadOnly ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadOnly && (
            <Button onClick={onSave}>
              {mode === 'new' ? 'Cadastrar' : 'Salvar'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
