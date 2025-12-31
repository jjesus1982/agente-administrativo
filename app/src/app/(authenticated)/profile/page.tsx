"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  User, Mail, Phone, Calendar, Shield, Home, Camera, Save, Lock,
  Bell, Settings, FileText, Car, PawPrint, Users, Wrench, AlertTriangle,
  CheckCircle, Edit, Building2, Briefcase, X, Upload,
  Trash2, RefreshCw
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface UserProfile {
  id: number; name: string; email: string; phone: string; phone_secondary: string;
  cpf: string; rg: string; birth_date: string; gender: string; photo_url: string;
  role: number; role_name: string; is_active: boolean; is_verified: boolean;
  last_login: string; has_special_needs: boolean; special_needs_description: string;
  tenant_id: number; tenant_name: string; created_at: string; updated_at: string;
  block: string; unit_number: string; dependents_count: number; vehicles_count: number;
  pets_count: number; tickets_count: number; occurrences_count: number; reservations_count: number;
}

const getRoleConfig = (role: number): { name: string; color: string; bg: string; icon: React.ReactNode; description: string } => {
  const defaultConfig = { name: 'Morador', color: '#3b82f6', bg: '#3b82f620', icon: <Home size={16}/>, description: 'Acesso às funcionalidades básicas do condomínio' };
  const configs: Record<number, { name: string; color: string; bg: string; icon: React.ReactNode; description: string }> = {
    1: defaultConfig,
    2: { name: 'Síndico', color: '#f59e0b', bg: '#f59e0b20', icon: <Briefcase size={16}/>, description: 'Administração geral do condomínio' },
    4: { name: 'Administrador', color: '#ef4444', bg: '#ef444420', icon: <Settings size={16}/>, description: 'Administração do sistema' },
    5: { name: 'Super Admin', color: '#8b5cf6', bg: '#8b5cf620', icon: <Shield size={16}/>, description: 'Acesso total ao sistema' },
    9: { name: 'Agente AGP', color: '#06b6d4', bg: '#06b6d420', icon: <Building2 size={16}/>, description: 'Agente da Administradora Global' },
  };
  return configs[role] ?? defaultConfig;
};

export default function ProfilePage() {
  const { currentTenant } = useTenant();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'notifications'>('info');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<UserProfile>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => { fetchProfile(); }, [currentTenant]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/auth/me?tenant_id=${currentTenant?.tenant_id}`);
      const data = await res.json();
      setProfile(data);
      setForm(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/auth/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, phone_secondary: form.phone_secondary, birth_date: form.birth_date, gender: form.gender, cpf: form.cpf, rg: form.rg })
      });
      if (res.ok) { showSuccessToast('Perfil atualizado com sucesso!'); setEditing(false); fetchProfile(); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const showSuccessToast = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handlePhotoUploaded = () => {
    setShowPhotoModal(false);
    showSuccessToast('Foto atualizada com sucesso!');
    fetchProfile();
  };

  const formatDate = (dateStr: string) => !dateStr ? '-' : new Date(dateStr).toLocaleDateString('pt-BR');
  const formatDateTime = (dateStr: string) => !dateStr ? 'Nunca' : new Date(dateStr).toLocaleString('pt-BR');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const roleConfig = getRoleConfig(profile.role);
  const userInitials = profile.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  const photoUrl = profile.photo_url ? `${API_BASE.replace('/api/v1', '')}${profile.photo_url}` : null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {showSuccess && (
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', background: '#22c55e', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, animation: 'slideIn 0.3s ease' }}>
          <CheckCircle size={18}/> {successMessage}
        </div>
      )}

      {showPhotoModal && <PhotoUploadModal onClose={() => setShowPhotoModal(false)} onSuccess={handlePhotoUploaded} currentPhoto={photoUrl}/>}

      {/* Header Card */}
      <Card style={{ marginBottom: '1.5rem', overflow: 'visible' }}>
        <div style={{ height: '120px', background: `linear-gradient(135deg, var(--accent) 0%, ${roleConfig.color} 100%)`, position: 'relative', borderRadius: '12px 12px 0 0' }}></div>

        <div style={{ padding: '0 1.5rem 1.5rem', marginTop: '-50px', position: 'relative', zIndex: 10 }}>
          {/* Avatar e botão de editar foto */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
            {/* Avatar */}
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-primary)', padding: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', position: 'relative', zIndex: 20 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: photoUrl ? 'transparent' : `linear-gradient(135deg, var(--accent), ${roleConfig.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2rem', fontWeight: 700, overflow: 'hidden' }}>
                {photoUrl ? <img src={photoUrl} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}/> : userInitials}
              </div>
            </div>
            
            {/* Botão Alterar Foto - FORA DO AVATAR */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowPhotoModal(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                marginBottom: '0.5rem'
              }}
            >
              <Camera size={16}/> Alterar foto
            </Button>
          </div>

          {/* Info do usuário */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{profile.name}</h1>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0', fontSize: '0.9rem' }}>{profile.email}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: roleConfig.bg, color: roleConfig.color, padding: '0.375rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>{roleConfig.icon} {roleConfig.name}</span>
                {profile.block && profile.unit_number && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '0.375rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem' }}><Home size={14}/> {profile.block} {profile.unit_number}</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: profile.is_active ? '#22c55e20' : '#ef444420', color: profile.is_active ? '#22c55e' : '#ef4444', padding: '0.375rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>{profile.is_active ? <CheckCircle size={14}/> : <X size={14}/>}{profile.is_active ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!editing ? <Button onClick={() => setEditing(true)}><Edit size={16}/> Editar Perfil</Button> : <>
                <Button variant="ghost" onClick={() => { setEditing(false); setForm(profile); }}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : <><Save size={16}/> Salvar</>}</Button>
              </>}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<Users size={20}/>} label="Dependentes" value={profile.dependents_count} color="blue" href="/management/dependentes"/>
        <StatCard icon={<Car size={20}/>} label="Veículos" value={profile.vehicles_count} color="yellow" href="/management/veiculos"/>
        <StatCard icon={<PawPrint size={20}/>} label="Pets" value={profile.pets_count} color="purple" href="/management/pets"/>
        <StatCard icon={<Wrench size={20}/>} label="Chamados" value={profile.tickets_count} color="green" href="/maintenance"/>
        <StatCard icon={<AlertTriangle size={20}/>} label="Ocorrências" value={profile.occurrences_count} color="yellow" href="/occurrences"/>
        <StatCard icon={<Calendar size={20}/>} label="Reservas" value={profile.reservations_count} color="purple" href="/reservations"/>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} icon={<User size={16}/>} label="Informações Pessoais"/>
        <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Lock size={16}/>} label="Segurança"/>
        <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={16}/>} label="Notificações"/>
      </div>

      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} style={{ color: 'var(--accent)' }}/> Dados Pessoais</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormField label="Nome Completo" icon={<User size={16}/>} value={form.name || ''} editing={editing} onChange={v => setForm({...form, name: v})}/>
              <FormField label="E-mail" icon={<Mail size={16}/>} value={form.email || ''} editing={editing} onChange={v => setForm({...form, email: v})} type="email"/>
              <FormField label="Telefone Principal" icon={<Phone size={16}/>} value={form.phone || ''} editing={editing} onChange={v => setForm({...form, phone: v})}/>
              <FormField label="Telefone Secundário" icon={<Phone size={16}/>} value={form.phone_secondary || ''} editing={editing} onChange={v => setForm({...form, phone_secondary: v})}/>
              <FormField label="Data de Nascimento" icon={<Calendar size={16}/>} value={form.birth_date || ''} editing={editing} onChange={v => setForm({...form, birth_date: v})} type="date"/>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={14}/> Gênero</label>
                {editing ? (
                  <select value={form.gender || ''} onChange={e => setForm({...form, gender: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                    <option value="">Selecione</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
                  </select>
                ) : <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{form.gender === 'M' ? 'Masculino' : form.gender === 'F' ? 'Feminino' : form.gender || '-'}</p>}
              </div>
            </div>
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} style={{ color: 'var(--accent)' }}/> Documentos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FormField label="CPF" icon={<Shield size={16}/>} value={form.cpf || ''} editing={editing && profile.role >= 4} onChange={v => setForm({...form, cpf: v})}/>
              <FormField label="RG" icon={<Shield size={16}/>} value={form.rg || ''} editing={editing && profile.role >= 4} onChange={v => setForm({...form, rg: v})}/>
            </div>
            {profile.role < 4 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '6px' }}>🔒 Documentos só podem ser alterados pela administração.</p>
            )}
          </Card>

          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={18} style={{ color: 'var(--accent)' }}/> Informações do Sistema</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
              <InfoRow label="Condomínio" value={profile.tenant_name}/><InfoRow label="Perfil de Acesso" value={roleConfig.name} badge badgeColor={roleConfig.color}/>
              <InfoRow label="Cadastrado em" value={formatDate(profile.created_at)}/><InfoRow label="Último acesso" value={formatDateTime(profile.last_login)}/>
              <InfoRow label="Status da conta" value={profile.is_active ? 'Ativa' : 'Inativa'} badge badgeColor={profile.is_active ? '#22c55e' : '#ef4444'}/>
            </div>
          </Card>

          <Card style={{ background: `linear-gradient(135deg, ${roleConfig.bg} 0%, var(--bg-secondary) 100%)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: roleConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{roleConfig.icon}</div>
              <div><h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: roleConfig.color }}>{roleConfig.name}</h3><p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>{roleConfig.description}</p></div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={18} style={{ color: 'var(--accent)' }}/> Alterar Senha</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Senha Atual</label><input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Nova Senha</label><input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Confirmar Nova Senha</label><input type="password" placeholder="••••••••" style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/></div>
              <Button style={{ marginTop: '0.5rem' }}><Lock size={16}/> Alterar Senha</Button>
            </div>
          </Card>
          <Card>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield size={18} style={{ color: 'var(--accent)' }}/> Sessões Ativas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SessionItem device="Chrome - Windows" location="São Paulo, BR" current/><SessionItem device="App Mobile - Android" location="São Paulo, BR"/>
            </div>
            <Button variant="ghost" style={{ marginTop: '1rem', color: 'var(--error)' }}>Encerrar todas as outras sessões</Button>
          </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={18} style={{ color: 'var(--accent)' }}/> Preferências de Notificação</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <NotificationToggle label="Comunicados do condomínio" description="Receber avisos e comunicados importantes" defaultChecked/>
            <NotificationToggle label="Entregas e encomendas" description="Notificar quando uma encomenda chegar" defaultChecked/>
            <NotificationToggle label="Reservas de áreas comuns" description="Confirmações e lembretes de reservas" defaultChecked/>
            <NotificationToggle label="Manutenções programadas" description="Avisos sobre manutenções no condomínio"/>
            <NotificationToggle label="Novidades do Entre Vizinhos" description="Novos anúncios na comunidade"/>
          </div>
        </Card>
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

// MODAL DE UPLOAD
function PhotoUploadModal({ onClose, onSuccess, currentPhoto }: { onClose: () => void; onSuccess: () => void; currentPhoto: string | null }) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { return () => { stopCamera(); }; }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setMode('camera');
    
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não suporta acesso à câmera. Use a opção de enviar arquivo.');
      setMode('choose');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch (err: any) {
      let msg = 'Não foi possível acessar a câmera.';
      if (err.name === 'NotAllowedError') msg = 'Permissão negada. Clique no ícone de câmera na barra de endereço.';
      else if (err.name === 'NotFoundError') msg = 'Nenhuma câmera encontrada.';
      else if (err.name === 'NotReadableError') msg = 'Câmera em uso por outro app.';
      else if (err.message?.includes('secure context') || err.name === 'SecurityError') msg = 'Câmera requer HTTPS. Use a opção de enviar arquivo.';
      setCameraError(msg);
      setMode('choose');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
        setMode('preview');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert('Selecione uma imagem.'); return; }
      const reader = new FileReader();
      reader.onload = () => { setCapturedImage(reader.result as string); setMode('preview'); };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;
    setUploading(true);
    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      const response = await fetch(`${API_BASE}/profile/upload-photo`, { method: 'POST', body: formData });
      if (response.ok) onSuccess(); else alert('Erro ao enviar foto');
    } catch (_err) { alert('Erro ao enviar foto'); }
    setUploading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            {mode === 'choose' && 'Alterar Foto de Perfil'}
            {mode === 'camera' && 'Tirar Foto'}
            {mode === 'preview' && 'Confirmar Foto'}
          </h2>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}><X size={20}/></button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {mode === 'choose' && (
            <div>
              {currentPhoto && (
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Foto atual</p>
                  <img src={currentPhoto} alt="Foto atual" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-color)' }}/>
                </div>
              )}

              {cameraError && (
                <div style={{ background: '#f59e0b20', color: '#f59e0b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center' }}>
                  ⚠️ {cameraError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button onClick={startCamera} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', transition: 'all 150ms', textAlign: 'left' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Camera size={24}/></div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Tirar Foto</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Use a câmera do seu dispositivo</div>
                  </div>
                </button>

                <button onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', cursor: 'pointer', transition: 'all 150ms', textAlign: 'left' }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = '#22c55e')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Upload size={24}/></div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Enviar Arquivo</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selecione uma imagem do seu dispositivo</div>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="user" onChange={handleFileSelect} style={{ display: 'none' }}/>

                {currentPhoto && (
                  <button onClick={async () => { await fetch(`${API_BASE}/profile/photo`, { method: 'DELETE' }); onSuccess(); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#ef444410', border: '1px solid #ef444440', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Trash2 size={24}/></div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ef4444' }}>Remover Foto</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usar avatar com iniciais</div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'camera' && (
            <div>
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}/>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '200px', height: '200px', borderRadius: '50%', border: '3px dashed rgba(255,255,255,0.5)' }}/>
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }}/>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <Button variant="ghost" onClick={() => { stopCamera(); setMode('choose'); }} style={{ flex: 1 }}>Cancelar</Button>
                <Button onClick={capturePhoto} style={{ flex: 1, background: '#22c55e' }}><Camera size={18}/> Capturar</Button>
              </div>
            </div>
          )}

          {mode === 'preview' && capturedImage && (
            <div>
              <div style={{ borderRadius: '12px', marginBottom: '1rem', display: 'flex', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '1rem' }}>
                <img src={capturedImage} alt="Preview" style={{ width: '200px', height: '200px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--accent)' }}/>
              </div>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Esta será sua nova foto de perfil</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button variant="ghost" onClick={() => { setCapturedImage(null); setMode('choose'); }} style={{ flex: 1 }}><RefreshCw size={16}/> Escolher Outra</Button>
                <Button onClick={uploadPhoto} disabled={uploading} style={{ flex: 1, background: '#22c55e' }}>{uploading ? 'Enviando...' : <><CheckCircle size={16}/> Confirmar</>}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function StatCard({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number; color: string; href: string }) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <Card style={{ cursor: 'pointer', transition: 'all 150ms', border: '1px solid transparent' }}
        onMouseOver={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
          <div><div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div></div>
        </div>
      </Card>
    </a>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, background: active ? 'var(--accent)' : 'transparent', color: active ? 'white' : 'var(--text-muted)', transition: 'all 150ms' }}>{icon} {label}</button>;
}

function FormField({ label, icon, value, editing, onChange, type = 'text', masked }: { label: string; icon: React.ReactNode; value: string; editing: boolean; onChange?: (v: string) => void; type?: string; masked?: boolean }) {
  const displayValue = masked && value ? value.replace(/./g, '•').substring(0, 11) + value.substring(11) : value;
  return (
    <div>
      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{icon} {label}</label>
      {editing && onChange ? <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}/> : <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{displayValue || '-'}</p>}
    </div>
  );
}

function InfoRow({ label, value, badge, badgeColor }: { label: string; value: string; badge?: boolean; badgeColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      {badge ? <span style={{ background: `${badgeColor}20`, color: badgeColor, padding: '0.25rem 0.625rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>{value}</span> : <span style={{ fontWeight: 500 }}>{value}</span>}
    </div>
  );
}

function SessionItem({ device, location, current }: { device: string; location: string; current?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
      <div><div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{device}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{location}</div></div>
      {current ? <span style={{ background: '#22c55e20', color: '#22c55e', padding: '0.25rem 0.5rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 500 }}>Sessão atual</span> : <Button variant="ghost" size="sm">Encerrar</Button>}
    </div>
  );
}

function NotificationToggle({ label, description, defaultChecked }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked || false);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' }}>
      <div><div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div></div>
      <button onClick={() => setChecked(!checked)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: checked ? 'var(--accent)' : 'var(--bg-tertiary)', position: 'relative', transition: 'background 200ms' }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: checked ? '23px' : '3px', transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
      </button>
    </div>
  );
}
