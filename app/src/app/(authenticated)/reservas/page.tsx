"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Users, ChevronLeft, ChevronRight, Check, X, Sparkles, PartyPopper, Clock, AlertCircle, Trash2, CalendarCheck, ChevronRight as Arrow } from 'lucide-react';
import { API_BASE } from '@/lib/api';

interface Area { id: number; name: string; description: string; capacity: number; }
interface DiaReserva { id: number; start_time: string; end_time: string; user_name: string; unit: string; event_name: string; status: string; }
interface MinhaReserva { id: number; date: string; start_time: string; end_time: string; status: string; event_name: string; area_name: string; created_at: string; }

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
const TIPOS_EVENTO = ['Aniversário', 'Churrasco', 'Confraternização', 'Reunião', 'Festa', 'Outro'];

export default function ReservasPage() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [diasOcupados, setDiasOcupados] = useState<Record<string, DiaReserva[]>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [minhasReservas, setMinhasReservas] = useState<MinhaReserva[]>([]);
  
  // Form states
  const [step, setStep] = useState(1);
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('22:00');
  const [tipoEvento, setTipoEvento] = useState('');
  const [nomeEvento, setNomeEvento] = useState('');
  const [qtdConvidados, setQtdConvidados] = useState('');

  // Fetch áreas
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservas/areas?tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await res.json();
        const uniqueAreas = data.items?.reduce((acc: Area[], curr: Area) => {
          if (!acc.find(a => a.name === curr.name)) acc.push(curr);
          return acc;
        }, []) || [];
        setAreas(uniqueAreas);
        if (uniqueAreas.length > 0) setSelectedArea(uniqueAreas[0]);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchAreas();
  }, [currentTenant]);

  // Fetch calendário
  useEffect(() => {
    if (!selectedArea) return;
    const fetchCalendario = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservas/calendario/${selectedArea.id}?month=${currentMonth}&year=${currentYear}&tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await res.json();
        setDiasOcupados(data.dias_ocupados || {});
      } catch (e) { console.error(e); }
    };
    fetchCalendario();
  }, [selectedArea, currentMonth, currentYear, currentTenant]);

  // Fetch minhas reservas
  useEffect(() => {
    if (!user) return;
    const fetchMinhas = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservas/minhas?user_id=${user.id}&tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await res.json();
        setMinhasReservas(data.items || []);
      } catch (e) { console.error(e); }
    };
    fetchMinhas();
  }, [user, currentTenant, success]);

  const getDiasDoMes = () => {
    const primeiroDia = new Date(currentYear, currentMonth - 1, 1);
    const ultimoDia = new Date(currentYear, currentMonth, 0);
    const dias: (number | null)[] = [];
    for (let i = 0; i < primeiroDia.getDay(); i++) dias.push(null);
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(i);
    return dias;
  };

  const resetForm = () => {
    setStep(1);
    setHoraInicio('08:00');
    setHoraFim('22:00');
    setTipoEvento('');
    setNomeEvento('');
    setQtdConvidados('');
  };

  const handleReservar = async () => {
    if (!selectedDate || !selectedArea || !user) return;
    try {
      const res = await fetch(`${API_BASE}/reservas/?user_id=${user.id}&unit_id=1&tenant_id=${currentTenant?.tenant_id || 1}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          area_id: selectedArea.id, 
          date: selectedDate, 
          start_time: horaInicio, 
          end_time: horaFim, 
          event_name: nomeEvento || tipoEvento,
          expected_guests: qtdConvidados ? parseInt(qtdConvidados) : null
        })
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { 
          setShowModal(false); 
          setSuccess(false); 
          setSelectedDate(null);
          resetForm();
        }, 2500);
        const cal = await fetch(`${API_BASE}/reservas/calendario/${selectedArea.id}?month=${currentMonth}&year=${currentYear}&tenant_id=${currentTenant?.tenant_id || 1}`);
        const data = await cal.json();
        setDiasOcupados(data.dias_ocupados || {});
      } else {
        const err = await res.json();
        alert(err.detail || 'Erro ao reservar');
      }
    } catch (_) { alert('Erro ao reservar'); }
  };

  const handleCancelar = async (reservaId: number) => {
    if (!confirm('Deseja cancelar esta reserva?')) return;
    try {
      const res = await fetch(`${API_BASE}/reservas/${reservaId}?user_id=${user?.id}&tenant_id=${currentTenant?.tenant_id || 1}`, { method: 'DELETE' });
      if (res.ok) {
        setMinhasReservas(prev => prev.filter(r => r.id !== reservaId));
        // Refresh calendar
        if (selectedArea) {
          const cal = await fetch(`${API_BASE}/reservas/calendario/${selectedArea.id}?month=${currentMonth}&year=${currentYear}&tenant_id=${currentTenant?.tenant_id || 1}`);
          const data = await cal.json();
          setDiasOcupados(data.dias_ocupados || {});
        }
      }
    } catch (_) { alert('Erro ao cancelar'); }
  };

  const hoje = new Date();
  const dias = getDiasDoMes();

  const glassCard = { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0c0c1e 0%, #1a1a3e 50%, #0f2847 100%)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      {/* Gradient Orbs */}
      <div style={{ position: 'absolute', top: '-15%', right: '-5%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-15%', left: '-5%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

      {/* Header */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.35)' }}>
          <Calendar size={26} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Reservas <Sparkles size={20} color="#fbbf24" />
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem' }}>Reserve áreas comuns do condomínio</p>
        </div>
      </div>

      {/* Main Grid - 3 Columns */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: '1.25rem', alignItems: 'start' }}>
        
        {/* Painel 1: Áreas */}
        <div style={glassCard}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h2 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PartyPopper size={18} color="#fbbf24" /> Áreas
            </h2>
          </div>
          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '450px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Carregando...</div>
            ) : areas.map(area => (
              <div key={area.id} onClick={() => setSelectedArea(area)}
                style={{
                  padding: '1rem', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.25s ease',
                  background: selectedArea?.id === area.id ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(236, 72, 153, 0.25))' : 'rgba(255, 255, 255, 0.02)',
                  border: selectedArea?.id === area.id ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.04)',
                  transform: selectedArea?.id === area.id ? 'scale(1.02)' : 'scale(1)'
                }}>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{area.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
                  <Users size={12} /> {area.capacity} pessoas
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Painel 2: Calendário */}
        <div style={glassCard}>
          {selectedArea ? (
            <>
              <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.08))', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>{selectedArea.name}</h2>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}><Users size={13} /> {selectedArea.capacity}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}><Clock size={13} /> 08h-22h</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button onClick={() => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }}
                      style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronLeft size={20} />
                    </button>
                    <span style={{ minWidth: '140px', textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: 'white' }}>
                      {MESES[currentMonth - 1]} {currentYear}
                    </span>
                    <button onClick={() => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }}
                      style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Legenda */}
              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}></span> Livre</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.5)' }}><span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}></span> Ocupado</span>
              </div>

              {/* Calendário */}
              <div style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {DIAS_SEMANA.map((dia, i) => (
                    <div key={i} style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '0.4rem' }}>{dia}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
                  {dias.map((dia, idx) => {
                    if (dia === null) return <div key={idx}></div>;
                    const dataStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const reservasDoDia = diasOcupados[dataStr] || [];
                    const ocupado = reservasDoDia.length > 0;
                    const passado = new Date(dataStr) < new Date(hoje.toDateString());
                    const ehHoje = dia === hoje.getDate() && currentMonth === hoje.getMonth() + 1 && currentYear === hoje.getFullYear();
                    
                    return (
                      <div key={idx}
                        onClick={() => { if (!passado && !ocupado) { setSelectedDate(dataStr); setShowModal(true); } else if (ocupado) setSelectedDate(dataStr); }}
                        style={{
                          aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '10px', cursor: passado ? 'default' : 'pointer', transition: 'all 0.2s',
                          background: ocupado ? 'rgba(239, 68, 68, 0.18)' : passado ? 'rgba(255,255,255,0.02)' : 'rgba(34, 197, 94, 0.12)',
                          border: ehHoje ? '2px solid #8b5cf6' : ocupado ? '1px solid rgba(239, 68, 68, 0.35)' : passado ? '1px solid transparent' : '1px solid rgba(34, 197, 94, 0.25)',
                          opacity: passado ? 0.4 : 1
                        }}>
                        <span style={{ fontWeight: ehHoje ? 800 : 600, fontSize: '0.9rem', color: ehHoje ? '#c4b5fd' : ocupado ? '#fca5a5' : passado ? 'rgba(255,255,255,0.25)' : '#86efac' }}>{dia}</span>
                        {ocupado && <span style={{ fontSize: '0.5rem', color: '#fca5a5', fontWeight: 700 }}>●</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info dia selecionado ocupado */}
              {selectedDate && diasOcupados[selectedDate] && !showModal && (
                <div style={{ margin: '0 1.5rem 1.25rem', padding: '1rem', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertCircle size={16} color="#fca5a5" />
                    <span style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - Ocupado
                    </span>
                  </div>
                  {diasOcupados[selectedDate].map((r, i) => (
                    <div key={i} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                      <strong style={{ color: 'white' }}>{r.user_name}</strong> • {r.start_time} - {r.end_time}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p>Selecione uma área</p>
            </div>
          )}
        </div>

        {/* Painel 3: Minhas Reservas */}
        <div style={glassCard}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <h2 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={18} color="#22c55e" /> Minhas Reservas
            </h2>
          </div>
          <div style={{ padding: '0.75rem', maxHeight: '450px', overflowY: 'auto' }}>
            {minhasReservas.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
                Você ainda não tem reservas
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {minhasReservas.map(reserva => {
                  const isPast = new Date(reserva.date) < new Date(hoje.toDateString());
                  const isCancelled = reserva.status === 'cancelled';
                  return (
                    <div key={reserva.id} style={{
                      padding: '1rem', borderRadius: '14px',
                      background: isCancelled ? 'rgba(239, 68, 68, 0.08)' : isPast ? 'rgba(255,255,255,0.02)' : 'rgba(34, 197, 94, 0.08)',
                      border: isCancelled ? '1px solid rgba(239, 68, 68, 0.15)' : isPast ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(34, 197, 94, 0.15)',
                      opacity: isPast || isCancelled ? 0.6 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <div style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>{reserva.area_name}</div>
                        {!isPast && !isCancelled && (
                          <button onClick={() => handleCancelar(reserva.id)} 
                            style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer', display: 'flex' }}>
                            <Trash2 size={14} color="#fca5a5" />
                          </button>
                        )}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>{new Date(reserva.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>{reserva.start_time} - {reserva.end_time}</span>
                        {reserva.event_name && <span style={{ color: '#c4b5fd' }}>{reserva.event_name}</span>}
                      </div>
                      {isCancelled && <span style={{ fontSize: '0.65rem', color: '#fca5a5', fontWeight: 600, marginTop: '0.3rem', display: 'block' }}>CANCELADA</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Multi-Step */}
      {showModal && selectedDate && selectedArea && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => !success && (setShowModal(false), resetForm())}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: success ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.08))' : 'rgba(20, 20, 40, 0.95)', 
            backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '2rem', width: '420px', maxWidth: '95%',
            border: success ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)'
          }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 10px 40px rgba(34, 197, 94, 0.4)' }}>
                  <Check size={40} color="white" />
                </div>
                <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Reserva Confirmada!</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Sua reserva foi realizada com sucesso</p>
              </div>
            ) : (
              <>
                {/* Header do Modal */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Nova Reserva</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
                      {selectedArea.name} • {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', padding: '0.5rem', cursor: 'pointer' }}>
                    <X size={20} color="rgba(255,255,255,0.6)" />
                  </button>
                </div>

                {/* Steps Indicator */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[1, 2, 3].map(s => (
                    <div key={s} style={{ flex: 1, height: '4px', borderRadius: '2px', background: s <= step ? 'linear-gradient(90deg, #8b5cf6, #ec4899)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }}></div>
                  ))}
                </div>

                {/* Step 1: Horários */}
                {step === 1 && (
                  <div>
                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Escolha o horário</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Início</label>
                        <select value={horaInicio} onChange={e => setHoraInicio(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }}>
                          {HORARIOS.slice(0, -1).map(h => <option key={h} value={h} style={{ background: '#1a1a2e' }}>{h}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Término</label>
                        <select value={horaFim} onChange={e => setHoraFim(e.target.value)}
                          style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }}>
                          {HORARIOS.slice(1).map(h => <option key={h} value={h} style={{ background: '#1a1a2e' }}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                    {/* Visual Timeline */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>
                        <Clock size={14} />
                        <span>Duração: {parseInt(horaFim) - parseInt(horaInicio)} horas</span>
                      </div>
                      <div style={{ marginTop: '0.75rem', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ 
                          position: 'absolute', 
                          left: `${((parseInt(horaInicio) - 8) / 14) * 100}%`,
                          width: `${((parseInt(horaFim) - parseInt(horaInicio)) / 14) * 100}%`,
                          height: '100%', 
                          background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', 
                          borderRadius: '4px' 
                        }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)' }}>
                        <span>08:00</span><span>22:00</span>
                      </div>
                    </div>
                    <button onClick={() => setStep(2)}
                      style={{ width: '100%', padding: '1rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      Continuar <Arrow size={18} />
                    </button>
                  </div>
                )}

                {/* Step 2: Detalhes */}
                {step === 2 && (
                  <div>
                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Detalhes do evento</h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Tipo de evento</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {TIPOS_EVENTO.map(tipo => (
                          <button key={tipo} onClick={() => setTipoEvento(tipo)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '20px', border: tipoEvento === tipo ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)', 
                              background: tipoEvento === tipo ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.03)', color: tipoEvento === tipo ? '#c4b5fd' : 'rgba(255,255,255,0.6)', 
                              fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {tipo}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Nome do evento (opcional)</label>
                      <input type="text" value={nomeEvento} onChange={e => setNomeEvento(e.target.value)} placeholder="Ex: Aniversário do João"
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>Quantidade de convidados</label>
                      <input type="number" value={qtdConvidados} onChange={e => setQtdConvidados(e.target.value)} placeholder={`Máximo ${selectedArea.capacity}`}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => setStep(1)} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer' }}>Voltar</button>
                      <button onClick={() => setStep(3)} disabled={!tipoEvento}
                        style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', background: tipoEvento ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : 'rgba(255,255,255,0.1)', color: tipoEvento ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 700, cursor: tipoEvento ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        Continuar <Arrow size={18} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmação */}
                {step === 3 && (
                  <div>
                    <h3 style={{ color: 'white', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Confirme sua reserva</h3>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'grid', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Área</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{selectedArea.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Data</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Horário</span>
                          <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{horaInicio} - {horaFim}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Evento</span>
                          <span style={{ color: '#c4b5fd', fontWeight: 600, fontSize: '0.85rem' }}>{nomeEvento || tipoEvento}</span>
                        </div>
                        {qtdConvidados && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Convidados</span>
                            <span style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{qtdConvidados} pessoas</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => setStep(2)} style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer' }}>Voltar</button>
                      <button onClick={handleReservar}
                        style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', boxShadow: '0 8px 24px rgba(34, 197, 94, 0.3)' }}>
                        <Check size={18} /> Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
