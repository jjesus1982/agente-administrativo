"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  Shield, Plus, Edit2, Users, DoorOpen, Clock, RefreshCw, Search, Check
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal } from '@/components/ui';
import { api } from '@/lib/api';

interface GrupoAcesso {
  id: number;
  nome: string;
  descricao?: string;
  cor: string;
  prioridade: number;
  horario_inicio?: string;
  horario_fim?: string;
  dias_semana: number[];
  pontos_acesso: { id: number; nome: string }[];
  total_membros: number;
  ativo: boolean;
  created_at: string;
}

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b'];

export default function GruposAcessoPage() {
  const { currentTenant } = useTenant();
  const [grupos, setGrupos] = useState<GrupoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoAcesso | null>(null);

  const fetchGrupos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/portaria/grupos-acesso');

      if (res.ok) {
        const data = await res.json();
        setGrupos(data.items || data || []);
      } else {
        console.error('Grupos-acesso API error:', res.status);
        alert('Erro ao carregar grupos de acesso.');
      }
    } catch (e: any) {
      console.error('Erro ao carregar grupos de acesso:', e);
      alert(`Erro ao carregar grupos de acesso: ${e.message}`);
      setGrupos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrupos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const filteredGrupos = grupos.filter(g =>
    g.nome.toLowerCase().includes(search.toLowerCase()) ||
    g.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = () => {
    setSelectedGrupo(null);
    setShowModal(true);
  };

  const handleEdit = (grupo: GrupoAcesso) => {
    setSelectedGrupo(grupo);
    setShowModal(true);
  };

  const handleSave = async (formData: any) => {
    try {
      let res;

      if (selectedGrupo) {
        // Atualizar grupo existente
        res = await api.put(`/portaria/grupos-acesso/${selectedGrupo.id}`, formData);
      } else {
        // Criar novo grupo
        res = await api.post('/portaria/grupos-acesso', formData);
      }

      if (res.ok) {
        alert(`Grupo ${selectedGrupo ? 'atualizado' : 'criado'} com sucesso!`);
        setShowModal(false);
        fetchGrupos();
      } else {
        const errorData = await res.json();
        alert(`Erro ao ${selectedGrupo ? 'atualizar' : 'criar'} grupo: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao salvar grupo:', error);
      alert(`Erro ao ${selectedGrupo ? 'atualizar' : 'criar'} grupo: ${error.message}`);
    }
  };

  if (loading && grupos.length === 0) {
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
              placeholder="Buscar grupo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <Button onClick={handleNew}>
            <Plus size={16} /> Novo Grupo
          </Button>
        </div>
      </Card>

      {/* Lista de Grupos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1rem' }}>
        {filteredGrupos.map((grupo) => (
          <GrupoCard key={grupo.id} grupo={grupo} onEdit={() => handleEdit(grupo)} />
        ))}
      </div>

      {filteredGrupos.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum grupo de acesso encontrado</p>
          </div>
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <GrupoModal
          grupo={selectedGrupo}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function GrupoCard({ grupo, onEdit }: { grupo: GrupoAcesso; onEdit: () => void }) {
  return (
    <Card style={{ borderLeft: `4px solid ${grupo.cor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: grupo.cor,
            }} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{grupo.nome}</span>
          </div>
          {grupo.descricao && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {grupo.descricao}
            </p>
          )}
        </div>
        <button
          onClick={onEdit}
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <Edit2 size={16} />
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600 }}>{grupo.total_membros}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>membros</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DoorOpen size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600 }}>{grupo.pontos_acesso.length}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pontos</span>
        </div>
      </div>

      {/* Hor\u00e1rio */}
      {(grupo.horario_inicio || grupo.horario_fim) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.75rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}>
          <Clock size={14} />
          <span>{grupo.horario_inicio || '00:00'} - {grupo.horario_fim || '23:59'}</span>
        </div>
      )}

      {/* Dias da Semana */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem' }}>
        {diasSemana.map((dia, i) => (
          <div
            key={dia}
            style={{
              width: '32px',
              height: '28px',
              borderRadius: '4px',
              background: grupo.dias_semana.includes(i) ? `${grupo.cor}30` : 'var(--bg-tertiary)',
              color: grupo.dias_semana.includes(i) ? grupo.cor : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: grupo.dias_semana.includes(i) ? 600 : 400,
            }}
          >
            {dia}
          </div>
        ))}
      </div>

      {/* Pontos de Acesso */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {grupo.pontos_acesso.map((ponto) => (
          <Badge key={ponto.id} variant="secondary">
            {ponto.nome}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

function GrupoModal({
  grupo,
  onClose,
  onSave
}: {
  grupo: GrupoAcesso | null;
  onClose: () => void;
  onSave: (formData: any) => void;
}) {
  const [formData, setFormData] = useState({
    nome: grupo?.nome || '',
    descricao: grupo?.descricao || '',
    cor: grupo?.cor || '#3b82f6',
    horario_inicio: grupo?.horario_inicio || '',
    horario_fim: grupo?.horario_fim || '',
    dias_semana: grupo?.dias_semana || [1, 2, 3, 4, 5],
  });

  const cores = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  const toggleDia = (dia: number) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia].sort()
    }));
  };

  const handleSubmit = () => {
    if (!formData.nome.trim()) {
      alert('Nome do grupo é obrigatório');
      return;
    }

    if (formData.nome.trim().length < 2) {
      alert('Nome do grupo deve ter pelo menos 2 caracteres');
      return;
    }

    if (formData.dias_semana.length === 0) {
      alert('Selecione pelo menos um dia da semana');
      return;
    }

    onSave(formData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={grupo ? 'Editar Grupo' : 'Novo Grupo de Acesso'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Nome do Grupo *</label>
          <Input
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            placeholder="Ex: Moradores, Funcion\u00e1rios..."
          />
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Descri\u00e7\u00e3o</label>
          <Input
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            placeholder="Descri\u00e7\u00e3o do grupo..."
          />
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Cor</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {cores.map((cor) => (
              <button
                key={cor}
                onClick={() => setFormData({ ...formData, cor })}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: cor,
                  border: formData.cor === cor ? '3px solid var(--text-primary)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {formData.cor === cor && <Check size={16} style={{ color: 'white' }} />}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Hor\u00e1rio In\u00edcio</label>
            <Input
              type="time"
              value={formData.horario_inicio}
              onChange={(e) => setFormData({ ...formData, horario_inicio: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Hor\u00e1rio Fim</label>
            <Input
              type="time"
              value={formData.horario_fim}
              onChange={(e) => setFormData({ ...formData, horario_fim: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Dias da Semana</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {diasSemana.map((dia, i) => (
              <button
                key={dia}
                onClick={() => toggleDia(i)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  borderRadius: '8px',
                  border: formData.dias_semana.includes(i) ? `2px solid ${formData.cor}` : '1px solid var(--border-default)',
                  background: formData.dias_semana.includes(i) ? `${formData.cor}20` : 'var(--bg-tertiary)',
                  color: formData.dias_semana.includes(i) ? formData.cor : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: formData.dias_semana.includes(i) ? 600 : 400,
                }}
              >
                {dia}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>{grupo ? 'Salvar' : 'Criar Grupo'}</Button>
        </div>
      </div>
    </Modal>
  );
}
