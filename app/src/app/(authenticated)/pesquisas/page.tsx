"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { ClipboardList, Plus, Vote, CheckCircle, Clock, Users, X, Send, BarChart3 } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { API_BASE } from '@/lib/api';

const TIPOS_PESQUISA = [
  { value: 'poll', label: 'Enquete Rápida', icon: '📊', desc: 'Pesquisa de opinião simples' },
  { value: 'voting', label: 'Votação Formal', icon: '🗳️', desc: 'Decisão com quórum' },
  { value: 'feedback', label: 'Feedback', icon: '💬', desc: 'Coleta de opiniões' },
];

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default' | 'error' | 'info'> = {
  draft: 'default', active: 'success', closed: 'warning', cancelled: 'error'
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', active: 'Ativa', closed: 'Encerrada', cancelled: 'Cancelada'
};

interface Option { id: number; text: string; order: number; votes_count: number; }
interface Survey {
  id: number; title: string; description: string; survey_type: string;
  status: string; starts_at: string | null; ends_at: string | null;
  is_anonymous: boolean; allow_multiple: boolean;
  options: Option[]; total_votes: number;
  user_voted: boolean; user_vote_option_id: number | null;
}

export default function PesquisasPage() {
  const { currentTenant: _currentTenant } = useTenant();
  const [_activeMainTab, _setActiveMainTab] = useState<'pesquisas' | 'feedback'>('pesquisas');
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ativas' | 'minhas' | 'todas'>('ativas');
  
  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voteModal, setVoteModal] = useState<Survey | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  
  // Formulário de criação
  const [form, setForm] = useState({
    title: '',
    description: '',
    survey_type: 'poll',
    starts_at: '',
    ends_at: '',
    is_anonymous: false,
    allow_multiple: false,
    show_results_during: false,
    options: [{ text: '' }, { text: '' }, { text: '' }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Feedback form
  const [_feedbackForm, _setFeedbackForm] = useState({
    type: 'sugestao',
    title: '',
    message: '',
    is_anonymous: false
  });

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      let endpoint = '/surveys';
      if (filterTab === 'ativas') endpoint += '?status=active';
      else if (filterTab === 'minhas') endpoint = '/surveys/minhas';
      
      const res = await fetch(`${API_BASE}${endpoint}`);
      const data = await res.json();
      setSurveys(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchSurveys(); }, [filterTab]);

  const resetForm = () => {
    setForm({
      title: '', description: '', survey_type: 'poll',
      starts_at: '', ends_at: '', is_anonymous: false,
      allow_multiple: false, show_results_during: false,
      options: [{ text: '' }, { text: '' }, { text: '' }]
    });
    setStep(1);
  };

  const handleCreateSurvey = async () => {
    const validOptions = form.options.filter(o => o.text.trim());
    if (!form.title.trim()) { alert('Digite um título'); return; }
    if (validOptions.length < 2) { alert('Adicione pelo menos 2 opções'); return; }
    
    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        survey_type: form.survey_type,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        is_anonymous: form.is_anonymous,
        allow_multiple: form.allow_multiple,
        options: validOptions.map((o, i) => ({ text: o.text, order: i }))
      };
      
      const res = await fetch(`${API_BASE}/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao criar pesquisa');
      }
      
      setCreateModalOpen(false);
      resetForm();
      fetchSurveys();
    } catch (e: any) { alert(e.message); }
    setSubmitting(false);
  };

  const handleVote = async () => {
    if (!selectedOption || !voteModal) return;
    setVoting(true);
    try {
      const res = await fetch(`${API_BASE}/surveys/${voteModal.id}/votar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: selectedOption }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao votar');
      }
      setVoteModal(null);
      setSelectedOption(null);
      fetchSurveys();
    } catch (e: any) { alert(e.message); }
    setVoting(false);
  };

  const addOption = () => {
    if (form.options.length < 10) {
      setForm({ ...form, options: [...form.options, { text: '' }] });
    }
  };

  const removeOption = (index: number) => {
    if (form.options.length > 2) {
      setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
    }
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...form.options];
    newOptions[index] = { text };
    setForm({ ...form, options: newOptions });
  };

  const getPercentage = (votes: number, total: number) => total > 0 ? Math.round((votes / total) * 100) : 0;

  const renderSurveyCard = (survey: Survey) => {
    const tipo = TIPOS_PESQUISA.find(t => t.value === survey.survey_type);
    const totalVotes = survey.total_votes || survey.options.reduce((sum, o) => sum + (o.votes_count || 0), 0);
    
    return (
      <Card key={survey.id} padding="sm" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.5rem' }}>{tipo?.icon || '📋'}</span>
              <h3 style={{ fontWeight: 600, fontSize: '1.05rem', margin: 0 }}>{survey.title}</h3>
              <Badge variant={STATUS_COLORS[survey.status]} size="sm">{STATUS_LABELS[survey.status]}</Badge>
              {survey.user_voted && <Badge variant="success" size="sm">✓ Você votou</Badge>}
            </div>
            
            {survey.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{survey.description}</p>
            )}
            
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Users size={14}/> {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
              </span>
              {survey.ends_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={14}/> Até {new Date(survey.ends_at).toLocaleDateString('pt-BR')}
                </span>
              )}
              {survey.is_anonymous && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  🔒 Anônima
                </span>
              )}
            </div>
          </div>
          
          <div style={{ marginLeft: '1rem' }}>
            {survey.status === 'active' && !survey.user_voted && (
              <Button onClick={() => { setVoteModal(survey); setSelectedOption(null); }}>
                <Vote size={16}/> Votar
              </Button>
            )}
            {survey.status === 'active' && survey.user_voted && (
              <Button variant="secondary" onClick={() => setVoteModal(survey)}>
                <BarChart3 size={16}/> Ver Resultado
              </Button>
            )}
          </div>
        </div>
        
        {/* Mostrar resultados se já votou ou pesquisa fechada */}
        {(survey.user_voted || survey.status === 'closed') && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
            {survey.options.map(opt => {
              const pct = getPercentage(opt.votes_count || 0, totalVotes);
              const isUserVote = survey.user_vote_option_id === opt.id;
              return (
                <div key={opt.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: isUserVote ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {isUserVote && <CheckCircle size={14} style={{ color: 'var(--accent)' }}/>}
                      {opt.text}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {opt.votes_count || 0} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: isUserVote ? 'var(--accent)' : 'var(--success)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={28} style={{ color: 'var(--accent)' }}/> Pesquisas e Feedback
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Participe das decisões do condomínio
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateModalOpen(true); }}>
          <Plus size={18}/> Nova Pesquisa
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Pesquisas Ativas" value={surveys.filter(s => s.status === 'active').length} icon={<Vote size={20}/>} color="green"/>
        <StatCard title="Meus Votos" value={surveys.filter(s => s.user_voted).length} icon={<CheckCircle size={20}/>} color="blue"/>
        <StatCard title="Total Votos" value={surveys.reduce((sum, s) => sum + (s.total_votes || 0), 0)} icon={<Users size={20}/>} color="blue"/>
      </div>

      {/* Tabs de Filtro */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { key: 'ativas', label: '🗳️ Ativas', desc: 'Pesquisas abertas' },
          { key: 'minhas', label: '📋 Minhas', desc: 'Criadas por mim' },
          { key: 'todas', label: '📊 Todas', desc: 'Histórico completo' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key as any)}
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: filterTab === tab.key ? 'var(--accent)' : 'var(--bg-secondary)',
              color: filterTab === tab.key ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.9rem',
              transition: 'all 150ms ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Pesquisas */}
      {loading ? (
        <Card padding="lg">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            Carregando pesquisas...
          </div>
        </Card>
      ) : surveys.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={56} style={{ opacity: 0.5 }}/>}
            title="Nenhuma pesquisa encontrada"
            description={
              filterTab === 'ativas' ? 'Não há pesquisas ativas no momento' :
              filterTab === 'minhas' ? 'Você ainda não criou nenhuma pesquisa' :
              'Nenhuma pesquisa cadastrada'
            }
            action={
              <Button onClick={() => { resetForm(); setCreateModalOpen(true); }}>
                <Plus size={16}/> Criar Pesquisa
              </Button>
            }
          />
        </Card>
      ) : (
        <div>
          {surveys.map(survey => renderSurveyCard(survey))}
        </div>
      )}

      {/* ==================== MODAL CRIAR PESQUISA ==================== */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => !submitting && setCreateModalOpen(false)}
        title={step === 1 ? "Nova Pesquisa - Informações" : "Nova Pesquisa - Opções"}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>
              {step > 1 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
                  ← Voltar
                </Button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              {step === 1 ? (
                <Button onClick={() => {
                  if (!form.title.trim()) { alert('Digite um título'); return; }
                  setStep(2);
                }}>
                  Próximo →
                </Button>
              ) : (
                <Button onClick={handleCreateSurvey} loading={submitting}>
                  <Send size={16}/> Publicar Pesquisa
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Step 1: Informações básicas */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Tipo de Pesquisa */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Tipo de Pesquisa
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {TIPOS_PESQUISA.map(tipo => (
                  <div
                    key={tipo.value}
                    onClick={() => setForm({ ...form, survey_type: tipo.value })}
                    style={{
                      padding: '1rem',
                      borderRadius: '8px',
                      border: `2px solid ${form.survey_type === tipo.value ? 'var(--accent)' : 'var(--border-light)'}`,
                      background: form.survey_type === tipo.value ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 150ms ease'
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tipo.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tipo.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{tipo.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Título */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Título da Pesquisa *
              </label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Aprovação da nova fachada do prédio"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
            </div>

            {/* Descrição */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Descrição (opcional)
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Explique o contexto e objetivo da pesquisa..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Período */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Data/Hora Início
                </label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => setForm({ ...form, starts_at: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Data/Hora Término
                </label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => setForm({ ...form, ends_at: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            {/* Configurações */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Configurações
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.is_anonymous}
                    onChange={e => setForm({ ...form, is_anonymous: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>🔒 Votação anônima</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Os votos não serão identificados</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.allow_multiple}
                    onChange={e => setForm({ ...form, allow_multiple: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 500 }}>☑️ Múltiplas escolhas</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Permitir selecionar mais de uma opção</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Opções de resposta */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{TIPOS_PESQUISA.find(t => t.value === form.survey_type)?.icon}</span>
                <strong>{form.title}</strong>
              </div>
              {form.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{form.description}</p>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Opções de Resposta * (mínimo 2)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {form.options.map((opt, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ 
                      width: '28px', height: '28px', 
                      background: 'var(--bg-tertiary)', 
                      borderRadius: '50%', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)'
                    }}>
                      {index + 1}
                    </span>
                    <input
                      value={opt.text}
                      onChange={e => updateOption(index, e.target.value)}
                      placeholder={`Opção ${index + 1}`}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem'
                      }}
                    />
                    {form.options.length > 2 && (
                      <button
                        onClick={() => removeOption(index)}
                        style={{
                          width: '36px', height: '36px',
                          background: 'var(--error-bg)',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <X size={16} style={{ color: 'var(--error)' }}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {form.options.length < 10 && (
                <Button variant="ghost" size="sm" onClick={addOption} style={{ marginTop: '0.75rem' }}>
                  <Plus size={16}/> Adicionar Opção
                </Button>
              )}
              
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Máximo de 10 opções. {form.options.filter(o => o.text.trim()).length} de {form.options.length} preenchidas.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== MODAL VOTAR ==================== */}
      <Modal
        isOpen={!!voteModal}
        onClose={() => !voting && setVoteModal(null)}
        title={voteModal?.title || 'Votar'}
        size="md"
        footer={
          !voteModal?.user_voted ? (
            <>
              <Button variant="ghost" onClick={() => setVoteModal(null)} disabled={voting}>Cancelar</Button>
              <Button onClick={handleVote} loading={voting} disabled={!selectedOption}>
                <CheckCircle size={16}/> Confirmar Voto
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setVoteModal(null)}>Fechar</Button>
          )
        }
      >
        {voteModal && (
          <div>
            {voteModal.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                {voteModal.description}
              </p>
            )}
            
            {!voteModal.user_voted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {voteModal.options.map(opt => (
                  <label
                    key={opt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      borderRadius: '8px',
                      background: selectedOption === opt.id ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                      border: `2px solid ${selectedOption === opt.id ? 'var(--accent)' : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 150ms ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="vote-option"
                      checked={selectedOption === opt.id}
                      onChange={() => setSelectedOption(opt.id)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontWeight: selectedOption === opt.id ? 600 : 400, fontSize: '1rem' }}>
                      {opt.text}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--success)' }}>
                  <CheckCircle size={20}/>
                  <span style={{ fontWeight: 600 }}>Você já votou nesta pesquisa</span>
                </div>
                {voteModal.options.map(opt => {
                  const total = voteModal.total_votes || voteModal.options.reduce((s, o) => s + (o.votes_count || 0), 0);
                  const pct = getPercentage(opt.votes_count || 0, total);
                  const isUserVote = voteModal.user_vote_option_id === opt.id;
                  return (
                    <div key={opt.id} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: isUserVote ? 600 : 400 }}>
                          {isUserVote && '✓ '}{opt.text}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pct}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isUserVote ? 'var(--accent)' : 'var(--success)', borderRadius: '4px' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {voteModal.is_anonymous && !voteModal.user_voted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                🔒 Esta é uma votação anônima. Seu voto não será identificado.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
