"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  UserCheck, Search, Plus, Clock, LogIn, LogOut, Home,
  Phone, RefreshCw, CheckCircle, User, Car
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, Badge, Modal } from '@/components/ui';
import { api } from '@/lib/api';

interface Visita {
  id: number;
  visitante_id: number;
  visitante_nome: string;
  visitante_documento: string;
  visitante_foto?: string;
  unidade_id: number;
  unidade_nome: string;
  morador_nome: string;
  morador_telefone?: string;
  motivo: string;
  observacoes?: string;
  veiculo_placa?: string;
  entrada_em: string;
  saida_em?: string;
  porteiro_entrada?: string;
  porteiro_saida?: string;
  status: 'em_andamento' | 'finalizada' | 'cancelada';
}

export default function VisitasPage() {
  const { currentTenant } = useTenant();
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'em_andamento' | 'finalizadas'>('em_andamento');
  const [showModal, setShowModal] = useState(false);
  const [, setSelectedVisita] = useState<Visita | null>(null);

  const fetchVisitas = async () => {
    setLoading(true);
    try {
      const statusParam = filterStatus !== 'todas' ? `&status=${filterStatus}` : '';
      const res = await api.get(`/portaria/visitas?${statusParam}&limit=50`);

      if (res.ok) {
        const data = await res.json();
        setVisitas(data.items || data || []);
      } else {
        console.error('Visitas API error:', res.status);
        alert('Erro ao carregar visitas. Verifique sua conexão.');
      }
    } catch (e: any) {
      console.error('Erro ao carregar visitas:', e);
      // Estado vazio - sem mock data
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVisitas();
    const interval = setInterval(fetchVisitas, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, filterStatus]);

  const filteredVisitas = visitas.filter(v => {
    const matchSearch = v.visitante_nome.toLowerCase().includes(search.toLowerCase()) ||
      v.unidade_nome.toLowerCase().includes(search.toLowerCase()) ||
      v.morador_nome.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const visitasEmAndamento = visitas.filter(v => v.status === 'em_andamento').length;

  const handleSaveVisita = async (formData: any) => {
    try {
      const res = await api.post('/portaria/visitas', formData);

      if (res.ok) {
        alert(`Visita de ${formData.visitante_nome} registrada com sucesso!`);
        setShowModal(false);
        fetchVisitas(); // Recarregar lista
      } else {
        const errorData = await res.json();
        alert(`Erro ao registrar visita: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao salvar visita:', error);
      alert(`Erro ao registrar visita: ${error.message}`);
    }
  };

  const handleFinalizarVisita = async (visita: Visita) => {
    try {
      const res = await api.put(`/portaria/visitas/${visita.id}/finalizar`);

      if (res.ok) {
        // Atualizar localmente e recarregar lista
        const updated = visitas.map(v =>
          v.id === visita.id
            ? { ...v, status: 'finalizada' as const, saida_em: new Date().toISOString() }
            : v
        );
        setVisitas(updated);
        alert(`Saída de ${visita.visitante_nome} registrada com sucesso!`);
      } else {
        const errorData = await res.json();
        alert(`Erro ao registrar saída: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao finalizar visita:', error);
      alert(`Erro ao registrar saída: ${error.message}`);
    }
  };

  if (loading && visitas.length === 0) {
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
              placeholder="Buscar visitante, unidade ou morador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="em_andamento">Em andamento</option>
              <option value="finalizadas">Finalizadas</option>
              <option value="todas">Todas</option>
            </select>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Nova Visita
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{
          padding: '1rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <UserCheck size={20} />
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Visitantes Ativos</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{visitasEmAndamento}</div>
        </div>
        <div style={{
          padding: '1rem',
          borderRadius: '12px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-default)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            <Clock size={20} />
            <span style={{ fontSize: '0.85rem' }}>Hoje</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{visitas.length}</div>
        </div>
      </div>

      {/* Lista de Visitas */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} style={{ color: 'var(--accent)' }} /> Registro de Visitas
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredVisitas.length} visita(s)
          </span>
        </CardHeader>

        {filteredVisitas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <UserCheck size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhuma visita encontrada</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredVisitas.map((visita) => (
              <VisitaCard
                key={visita.id}
                visita={visita}
                onFinalizar={() => handleFinalizarVisita(visita)}
                onView={() => setSelectedVisita(visita)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Modal Nova Visita */}
      {showModal && (
        <NovaVisitaModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveVisita}
        />
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function VisitaCard({
  visita,
  onFinalizar,
  onView
}: {
  visita: Visita;
  onFinalizar: () => void;
  onView: () => void;
}) {
  const isActive = visita.status === 'em_andamento';

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (entrada: string, saida?: string) => {
    const start = new Date(entrada).getTime();
    const end = saida ? new Date(saida).getTime() : Date.now();
    const diff = end - start;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        borderRadius: '12px',
        background: 'var(--bg-tertiary)',
        borderLeft: `4px solid ${isActive ? '#22c55e' : '#6b7280'}`,
        cursor: 'pointer',
      }}
      onClick={onView}
    >
      {/* Avatar */}
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: isActive ? '#22c55e20' : 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {visita.visitante_foto ? (
          <img src={visita.visitante_foto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <User size={24} style={{ color: isActive ? '#22c55e' : 'var(--text-muted)' }} />
        )}
      </div>

      {/* Info Principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{visita.visitante_nome}</span>
          {isActive && <Badge variant="success">Em visita</Badge>}
          {visita.status === 'finalizada' && <Badge variant="secondary">Finalizada</Badge>}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          <Home size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
          {visita.unidade_nome} \u2022 {visita.morador_nome}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {visita.motivo}
          {visita.veiculo_placa && (
            <span style={{ marginLeft: '0.5rem' }}>
              <Car size={12} style={{ verticalAlign: 'middle' }} /> {visita.veiculo_placa}
            </span>
          )}
        </div>
      </div>

      {/* Tempo */}
      <div style={{ textAlign: 'center', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#22c55e', fontSize: '0.8rem' }}>
          <LogIn size={14} /> {formatTime(visita.entrada_em)}
        </div>
        {visita.saida_em && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            <LogOut size={14} /> {formatTime(visita.saida_em)}
          </div>
        )}
        <div style={{
          fontSize: '0.75rem',
          color: isActive ? '#22c55e' : 'var(--text-muted)',
          marginTop: '0.25rem',
          fontWeight: 500,
        }}>
          <Clock size={12} style={{ verticalAlign: 'middle' }} /> {formatDuration(visita.entrada_em, visita.saida_em)}
        </div>
      </div>

      {/* A\u00e7\u00f5es */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {visita.morador_telefone && (
          <button
            onClick={(e) => { e.stopPropagation(); window.open(`tel:${visita.morador_telefone}`); }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              border: 'none',
              background: '#3b82f620',
              color: '#3b82f6',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Ligar para morador"
          >
            <Phone size={18} />
          </button>
        )}
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onFinalizar(); }}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#ef444420',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
            title="Registrar sa\u00edda"
          >
            <LogOut size={16} /> Sa\u00edda
          </button>
        )}
      </div>
    </div>
  );
}

function NovaVisitaModal({
  onClose,
  onSave
}: {
  onClose: () => void;
  onSave: (formData: any) => void;
}) {
  const [step, setStep] = useState<'visitante' | 'destino' | 'confirmar'>('visitante');
  const [visitanteSearch, setVisitanteSearch] = useState('');
  const [unidadeSearch, setUnidadeSearch] = useState('');
  const [formData, setFormData] = useState({
    visitante_nome: '',
    visitante_documento: '',
    visitante_telefone: '',
    unidade_id: 0,
    unidade_nome: '',
    morador_nome: '',
    motivo: '',
    veiculo_placa: '',
    observacoes: '',
  });

  const handleSubmit = () => {
    if (!formData.visitante_nome.trim()) {
      alert('Nome do visitante é obrigatório');
      return;
    }

    if (!formData.visitante_documento.trim()) {
      alert('Documento do visitante é obrigatório');
      return;
    }

    if (!formData.unidade_id) {
      alert('Selecione uma unidade de destino');
      return;
    }

    if (!formData.motivo) {
      alert('Selecione o motivo da visita');
      return;
    }

    onSave(formData);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Registrar Nova Visita" size="lg">
      {/* Progress Steps */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
        {['visitante', 'destino', 'confirmar'].map((s, i) => (
          <div
            key={s}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: step === s ? 'var(--accent)' : 'var(--text-muted)',
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: step === s ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: step === s ? 'white' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              {i + 1}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: step === s ? 600 : 400 }}>
              {s === 'visitante' ? 'Visitante' : s === 'destino' ? 'Destino' : 'Confirmar'}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 'visitante' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <Input
              placeholder="Buscar visitante cadastrado..."
              value={visitanteSearch}
              onChange={(e) => setVisitanteSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Ou cadastre um novo:</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nome Completo *</label>
                <Input
                  value={formData.visitante_nome}
                  onChange={(e) => setFormData({ ...formData, visitante_nome: e.target.value })}
                  placeholder="Nome do visitante"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Documento *</label>
                <Input
                  value={formData.visitante_documento}
                  onChange={(e) => setFormData({ ...formData, visitante_documento: e.target.value })}
                  placeholder="CPF ou RG"
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Telefone</label>
                <Input
                  value={formData.visitante_telefone}
                  onChange={(e) => setFormData({ ...formData, visitante_telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'destino' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <Input
              placeholder="Buscar unidade..."
              value={unidadeSearch}
              onChange={(e) => setUnidadeSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Mock units list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
            {[
              { id: 101, nome: 'Apt 101 - Bloco A', morador: 'Jos\u00e9 Oliveira' },
              { id: 102, nome: 'Apt 102 - Bloco A', morador: 'Maria Santos' },
              { id: 201, nome: 'Apt 201 - Bloco A', morador: 'Pedro Almeida' },
            ].map((unidade) => (
              <button
                key={unidade.id}
                onClick={() => setFormData({
                  ...formData,
                  unidade_id: unidade.id,
                  unidade_nome: unidade.nome,
                  morador_nome: unidade.morador,
                })}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: formData.unidade_id === unidade.id ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                  background: formData.unidade_id === unidade.id ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600 }}>{unidade.nome}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{unidade.morador}</div>
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Motivo da Visita *</label>
                <select
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="Visita familiar">Visita familiar</option>
                  <option value="Entrega">Entrega</option>
                  <option value="Prestador de servi\u00e7o">Prestador de servi\u00e7o</option>
                  <option value="Manuten\u00e7\u00e3o">Manuten\u00e7\u00e3o</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Placa do Ve\u00edculo</label>
                <Input
                  value={formData.veiculo_placa}
                  onChange={(e) => setFormData({ ...formData, veiculo_placa: e.target.value.toUpperCase() })}
                  placeholder="ABC-1234"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'confirmar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '12px' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>Resumo da Visita</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visitante</div>
                <div style={{ fontWeight: 600 }}>{formData.visitante_nome}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formData.visitante_documento}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destino</div>
                <div style={{ fontWeight: 600 }}>{formData.unidade_nome}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formData.morador_nome}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Motivo</div>
                <div style={{ fontWeight: 500 }}>{formData.motivo}</div>
              </div>
              {formData.veiculo_placa && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ve\u00edculo</div>
                  <div style={{ fontWeight: 500 }}>{formData.veiculo_placa}</div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Observa\u00e7\u00f5es</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observa\u00e7\u00f5es adicionais..."
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                minHeight: '80px',
                resize: 'vertical',
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <Button
          variant="secondary"
          onClick={() => {
            if (step === 'visitante') onClose();
            else if (step === 'destino') setStep('visitante');
            else setStep('destino');
          }}
        >
          {step === 'visitante' ? 'Cancelar' : 'Voltar'}
        </Button>
        <Button
          onClick={() => {
            if (step === 'visitante') setStep('destino');
            else if (step === 'destino') setStep('confirmar');
            else handleSubmit();
          }}
          disabled={
            (step === 'visitante' && !formData.visitante_nome) ||
            (step === 'destino' && (!formData.unidade_id || !formData.motivo))
          }
        >
          {step === 'confirmar' ? (
            <><CheckCircle size={16} /> Registrar Entrada</>
          ) : (
            'Pr\u00f3ximo'
          )}
        </Button>
      </div>
    </Modal>
  );
}
