"use client";
import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Vote, CheckCircle, Clock, Users, X, Send, BarChart3 } from 'lucide-react';
import { Card, Button, Badge, EmptyState, Modal, StatCard } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
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

export default function SurveysPage() {
  const { currentTenant } = useTenant();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ativas' | 'minhas' | 'todas'>('ativas');
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [voteModal, setVoteModal] = useState<Survey | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [voting, setVoting] = useState(false);
  
  const [form, setForm] = useState({
    title: '', description: '', survey_type: 'poll',
    starts_at: '', ends_at: '', is_anonymous: false, allow_multiple: false,
    options: [{ text: '' }, { text: '' }, { text: '' }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const fetchSurveys = async () => {
    setLoading(true);
    try {
      let endpoint = '/surveys';
      if (filterTab === 'ativas') endpoint += '?status=active';
      else if (filterTab === 'minhas') endpoint = '/surveys/minhas';
      const res = await fetch(`${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}tenant_id=${currentTenant?.tenant_id || 1}`);
      const data = await res.json();
      setSurveys(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (currentTenant) fetchSurveys(); }, [filterTab, currentTenant]);

  const resetForm = () => {
    setForm({ title: '', description: '', survey_type: 'poll', starts_at: '', ends_at: '', is_anonymous: false, allow_multiple: false, options: [{ text: '' }, { text: '' }, { text: '' }] });
    setStep(1);
  };

  const handleCreateSurvey = async () => {
    const validOptions = form.options.filter(o => o.text.trim());
    if (!form.title.trim()) { alert('Digite um título'); return; }
    if (validOptions.length < 2) { alert('Adicione pelo menos 2 opções'); return; }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/surveys?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: currentTenant?.tenant_id,
          title: form.title, description: form.description, survey_type: form.survey_type,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          is_anonymous: form.is_anonymous, allow_multiple: form.allow_multiple,
          options: validOptions.map((o, i) => ({ text: o.text, order: i }))
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao criar');
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
      const res = await fetch(`${API_BASE}/surveys/${voteModal.id}/votar?tenant_id=${currentTenant?.tenant_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: currentTenant?.tenant_id, option_id: selectedOption }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao votar');
      setVoteModal(null);
      setSelectedOption(null);
      fetchSurveys();
    } catch (e: any) { alert(e.message); }
    setVoting(false);
  };

  const addOption = () => form.options.length < 10 && setForm({ ...form, options: [...form.options, { text: '' }] });
  const removeOption = (i: number) => form.options.length > 2 && setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) });
  const updateOption = (i: number, text: string) => { const opts = [...form.options]; opts[i] = { text }; setForm({ ...form, options: opts }); };
  const getPercentage = (votes: number, total: number) => total > 0 ? Math.round((votes / total) * 100) : 0;

  const renderSurveyCard = (survey: Survey) => {
    const tipo = TIPOS_PESQUISA.find(t => t.value === survey.survey_type);
    const totalVotes = survey.total_votes || survey.options.reduce((sum, o) => sum + (o.votes_count || 0), 0);
    const showResults = survey.user_voted || survey.status === 'closed';
    
    return (
      <Card key={survey.id} padding="none" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
        {/* Header do Card */}
        <div style={{ 
          padding: '1.25rem', 
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
          borderBottom: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              {/* Título e Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '12px', 
                  background: 'var(--accent-bg)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem'
                }}>
                  {tipo?.icon || '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>{survey.title}</h3>
                    <Badge variant={STATUS_COLORS[survey.status]} size="sm">{STATUS_LABELS[survey.status]}</Badge>
                    {survey.user_voted && <Badge variant="success" size="sm">✓ Você Votou</Badge>}
                  </div>
                  {survey.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>{survey.description}</p>
                  )}
                </div>
              </div>
              
              {/* Meta info */}
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginLeft: '56px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={14}/> {totalVotes} voto{totalVotes !== 1 ? 's' : ''}
                </span>
                {survey.ends_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14}/> Até {new Date(survey.ends_at).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {survey.is_anonymous && <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>🔒 Anônima</span>}
              </div>
            </div>
            
            {/* Botão de Ação */}
            <div style={{ flexShrink: 0 }}>
              {survey.status === 'active' && !survey.user_voted && (
                <Button onClick={() => { setVoteModal(survey); setSelectedOption(null); }}>
                  <Vote size={16}/> Votar
                </Button>
              )}
              {(survey.status === 'active' && survey.user_voted) && (
                <Button variant="outline" onClick={() => setVoteModal(survey)}>
                  <BarChart3 size={16}/> Resultado
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Resultados da Votação */}
        {showResults && (
          <div style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {survey.options.map((opt) => {
                const pct = getPercentage(opt.votes_count || 0, totalVotes);
                const isUserVote = survey.user_vote_option_id === opt.id;
                const isWinner = pct > 0 && pct === Math.max(...survey.options.map(o => getPercentage(o.votes_count || 0, totalVotes)));
                
                return (
                  <div key={opt.id} style={{ 
                    padding: '0.875rem 1rem',
                    borderRadius: '10px',
                    background: isUserVote ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                    border: isUserVote ? '2px solid var(--accent)' : '1px solid var(--border-light)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Barra de progresso de fundo */}
                    <div style={{ 
                      position: 'absolute', top: 0, left: 0, bottom: 0,
                      width: `${pct}%`,
                      background: isUserVote ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                      transition: 'width 0.5s ease',
                      borderRadius: '10px'
                    }}/>
                    
                    {/* Conteúdo */}
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isUserVote && <CheckCircle size={16} style={{ color: 'var(--accent)' }}/>}
                        <span style={{ 
                          fontWeight: isUserVote || isWinner ? 600 : 500, 
                          fontSize: '0.9rem',
                          color: isUserVote ? 'var(--accent)' : 'var(--text-primary)'
                        }}>
                          {opt.text}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600, fontSize: '0.9rem',
                        color: isUserVote ? 'var(--accent)' : 'var(--text-secondary)'
                      }}>
                        <span>{opt.votes_count || 0}</span>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '6px', 
                          background: isUserVote ? 'var(--accent)' : 'var(--bg-secondary)',
                          color: isUserVote ? 'white' : 'var(--text-muted)',
                          fontSize: '0.75rem'
                        }}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={28} style={{ color: 'var(--accent)' }}/> Pesquisas e Feedback
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Participe das decisões do condomínio</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateModalOpen(true); }}><Plus size={18}/> Nova Pesquisa</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Pesquisas Ativas" value={surveys.filter(s => s.status === 'active').length} icon={<Vote size={20}/>} color="green"/>
        <StatCard title="Meus Votos" value={surveys.filter(s => s.user_voted).length} icon={<CheckCircle size={20}/>} color="blue"/>
        <StatCard title="Total Votos" value={surveys.reduce((sum, s) => sum + (s.total_votes || 0), 0)} icon={<Users size={20}/>} color="blue"/>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[{ key: 'ativas', label: '🗳️ Ativas' }, { key: 'minhas', label: '📋 Minhas' }, { key: 'todas', label: '📊 Todas' }].map(tab => (
          <button key={tab.key} onClick={() => setFilterTab(tab.key as any)} style={{
            padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none',
            background: filterTab === tab.key ? 'var(--accent)' : 'var(--bg-secondary)',
            color: filterTab === tab.key ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem', transition: 'all 150ms ease'
          }}>{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <Card padding="lg"><div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div></Card>
      ) : surveys.length === 0 ? (
        <Card><EmptyState icon={<ClipboardList size={56} style={{ opacity: 0.5 }}/>} title="Nenhuma pesquisa encontrada"
          description={filterTab === 'ativas' ? 'Não há pesquisas ativas' : filterTab === 'minhas' ? 'Você não criou pesquisas' : 'Nenhuma pesquisa'}
          action={<Button onClick={() => { resetForm(); setCreateModalOpen(true); }}><Plus size={16}/> Criar Pesquisa</Button>}/></Card>
      ) : (
        <div>{surveys.map(s => renderSurveyCard(s))}</div>
      )}

      {/* Modal Criar */}
      <Modal isOpen={createModalOpen} onClose={() => !submitting && setCreateModalOpen(false)}
        title={step === 1 ? "Nova Pesquisa - Informações" : "Nova Pesquisa - Opções"} size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div>{step > 1 && <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>← Voltar</Button>}</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="ghost" onClick={() => setCreateModalOpen(false)} disabled={submitting}>Cancelar</Button>
              {step === 1 ? (
                <Button onClick={() => { if (!form.title.trim()) { alert('Digite um título'); return; } setStep(2); }}>Próximo →</Button>
              ) : (
                <Button onClick={handleCreateSurvey} loading={submitting}><Send size={16}/> Publicar</Button>
              )}
            </div>
          </div>
        }>
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Tipo de Pesquisa</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {TIPOS_PESQUISA.map(tipo => (
                  <div key={tipo.value} onClick={() => setForm({ ...form, survey_type: tipo.value })} style={{
                    padding: '1rem', borderRadius: '8px', textAlign: 'center', cursor: 'pointer',
                    border: `2px solid ${form.survey_type === tipo.value ? 'var(--accent)' : 'var(--border-light)'}`,
                    background: form.survey_type === tipo.value ? 'var(--accent-bg)' : 'var(--bg-tertiary)'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{tipo.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tipo.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tipo.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Título *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Aprovação da nova fachada"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '1rem' }}/>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Descrição</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explique o contexto..." rows={3}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical' }}/>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Início</label>
                <input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Término</label>
                <input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}/>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_anonymous} onChange={e => setForm({ ...form, is_anonymous: e.target.checked })} style={{ width: '18px', height: '18px' }}/>
                <div><div style={{ fontWeight: 500 }}>🔒 Votação anônima</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Votos não identificados</div></div>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.allow_multiple} onChange={e => setForm({ ...form, allow_multiple: e.target.checked })} style={{ width: '18px', height: '18px' }}/>
                <div><div style={{ fontWeight: 500 }}>☑️ Múltiplas escolhas</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecionar mais de uma opção</div></div>
              </label>
            </div>
          </div>
        )}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{TIPOS_PESQUISA.find(t => t.value === form.survey_type)?.icon}</span>
                <strong>{form.title}</strong>
              </div>
              {form.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{form.description}</p>}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600 }}>Opções de Resposta * (mínimo 2)</label>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ width: '28px', height: '28px', background: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>{i + 1}</span>
                  <input value={opt.text} onChange={e => updateOption(i, e.target.value)} placeholder={`Opção ${i + 1}`}
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '0.95rem' }}/>
                  {form.options.length > 2 && (
                    <button onClick={() => removeOption(i)} style={{ width: '36px', height: '36px', background: 'var(--error-bg)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={16} style={{ color: 'var(--error)' }}/>
                    </button>
                  )}
                </div>
              ))}
              {form.options.length < 10 && <Button variant="ghost" size="sm" onClick={addOption} style={{ marginTop: '0.5rem' }}><Plus size={16}/> Adicionar</Button>}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Votar */}
      <Modal isOpen={!!voteModal} onClose={() => !voting && setVoteModal(null)} title={voteModal?.title || ''} size="md"
        footer={!voteModal?.user_voted ? (<><Button variant="ghost" onClick={() => setVoteModal(null)} disabled={voting}>Cancelar</Button><Button onClick={handleVote} loading={voting} disabled={!selectedOption}><CheckCircle size={16}/> Confirmar</Button></>) : (<Button variant="ghost" onClick={() => setVoteModal(null)}>Fechar</Button>)}>
        {voteModal && (
          <div>
            {voteModal.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{voteModal.description}</p>}
            {!voteModal.user_voted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {voteModal.options.map(opt => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: '8px', cursor: 'pointer',
                    background: selectedOption === opt.id ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                    border: `2px solid ${selectedOption === opt.id ? 'var(--accent)' : 'transparent'}` }}>
                    <input type="radio" checked={selectedOption === opt.id} onChange={() => setSelectedOption(opt.id)} style={{ width: '18px', height: '18px' }}/>
                    <span style={{ fontWeight: selectedOption === opt.id ? 600 : 400, fontSize: '1rem' }}>{opt.text}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--success)' }}><CheckCircle size={20}/><span style={{ fontWeight: 600 }}>Você já votou</span></div>
                {voteModal.options.map(opt => {
                  const total = voteModal.total_votes || voteModal.options.reduce((s, o) => s + (o.votes_count || 0), 0);
                  const pct = getPercentage(opt.votes_count || 0, total);
                  const isUserVote = voteModal.user_vote_option_id === opt.id;
                  return (
                    <div key={opt.id} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: isUserVote ? 600 : 400 }}>{isUserVote && '✓ '}{opt.text}</span>
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
            {voteModal.is_anonymous && !voteModal.user_voted && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔒 Votação anônima</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
