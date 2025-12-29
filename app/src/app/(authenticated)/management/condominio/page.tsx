"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Settings, Edit3, Phone, Mail, MapPin, Hash, Users, Home, Car,
  PawPrint, UserPlus, Package, Wrench, AlertTriangle, Camera, Save, X,
  Shield, RefreshCw, ChevronRight, Building, Clock, CheckCircle
} from 'lucide-react';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

interface Tenant {
  id: number;
  name: string;
  cnpj: string;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  zip_code: string | null;
  phone: string;
  email: string;
  logo_url: string | null;
  subscription_plan: string | null;
  is_active: boolean;
  created_at: string;
}

interface Stats {
  unidades: number;
  moradores: number;
  veiculos: number;
  dependentes: number;
  pets: number;
  blocos: number;
  encomendas_pendentes: number;
  manutencoes_abertas: number;
  ocorrencias_abertas: number;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: number;
  photo_url: string | null;
  is_active: boolean;
}

const roleNames: Record<number, string> = {
  2: 'Síndico',
  3: 'Porteiro',
  4: 'Admin',
  5: 'Super Admin'
};

const roleColors: Record<number, string> = {
  2: '#8b5cf6',
  3: '#f59e0b',
  4: '#3b82f6',
  5: '#ef4444'
};

export default function CondominioPage() {
  const { currentTenant: selectedTenant } = useTenant();
  const { currentTenant } = useTenant();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [equipe, setEquipe] = useState<{ administracao: TeamMember[]; gestao: TeamMember[] }>({ administracao: [], gestao: [] });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);
  const [showAllTeam, setShowAllTeam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    if (!selectedTenant) return;
    
    setLoading(true);
    try {
      const tenantId = selectedTenant.tenant_id;
      
      const [tenantRes, statsRes, equipeRes] = await Promise.all([
        fetch(`${API_BASE}/tenant/${tenantId}`),
        fetch(`${API_BASE}/tenant/${tenantId}/stats?tenant_id=${currentTenant?.tenant_id}`),
        fetch(`${API_BASE}/tenant/${tenantId}/equipe?tenant_id=${currentTenant?.tenant_id}`)
      ]);
      
      if (tenantRes.ok) {
        const data = await tenantRes.json();
        setTenant(data);
        setEditData(data);
      }
      if (statsRes.ok) setStats(await statsRes.json());
      if (equipeRes.ok) setEquipe(await equipeRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Recarrega quando muda o tenant selecionado
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAll();
  }, [selectedTenant]);

  // Escuta evento global de mudança
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleTenantChange = () => fetchAll();
    window.addEventListener('tenantChanged', handleTenantChange);
    return () => window.removeEventListener('tenantChanged', handleTenantChange);
  }, [currentTenant]);

  const handleSave = async () => {
    if (!selectedTenant) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/tenant/${selectedTenant.tenant_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        setTenant({ ...tenant, ...editData } as Tenant);
        setEditMode(false);
      }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedTenant) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(`${API_BASE}/tenant/${selectedTenant.tenant_id}/logo`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setTenant(prev => prev ? { ...prev, logo_url: data.logo_url } : null);
      }
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }}/>
      </div>
    );
  }

  if (!tenant) {
    return <Card style={{ textAlign: 'center', padding: '3rem' }}>Erro ao carregar dados do condomínio</Card>;
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Card - Identidade do Condomínio */}
      <Card style={{ padding: 0, overflow: 'visible', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
        {/* Banner Gradient */}
        <div style={{ 
          height: '120px', 
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
          position: 'relative',
          borderRadius: '12px 12px 0 0',
          overflow: 'visible'
        }}>
          {/* Status Badge */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
            <Badge variant={tenant.is_active ? 'success' : 'error'} style={{ padding: '0.375rem 0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <CheckCircle size={12} style={{ marginRight: '0.375rem' }}/> 
              {tenant.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
        
        <div style={{ padding: '0 1.5rem 1.5rem', marginTop: '-50px', position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 6 }}>
              <div style={{
                width: '100px', height: '100px', borderRadius: '16px',
                background: tenant.logo_url ? `url(${API_BASE.replace('/api/v1', '')}${tenant.logo_url}) center/cover` : 'linear-gradient(135deg, #1e3a5f, #2d5a87)',
                border: '4px solid var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {!tenant.logo_url && <Building2 size={40} style={{ color: 'white' }}/>}
              </div>
              <button onClick={() => fileInputRef.current?.click()} style={{
                position: 'absolute', bottom: '-4px', right: '-4px',
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', zIndex: 7
              }}>
                <Camera size={14}/>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }}/>
            </div>
            
            {/* Info Principal */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              {editMode ? (
                <input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})}
                  style={{ fontSize: '1.5rem', fontWeight: 700, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', width: '100%', color: 'var(--text-primary)' }}/>
              ) : (
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{tenant.name}</h1>
              )}
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Hash size={14}/> {editMode ? (
                    <input type="text" value={editData.cnpj || ''} onChange={e => setEditData({...editData, cnpj: e.target.value})}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'var(--text-primary)', width: '180px' }}/>
                  ) : tenant.cnpj}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <MapPin size={14}/> {tenant.city}, {tenant.state}
                </span>
              </div>
            </div>
            
            {/* Ações */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {editMode ? (
                <>
                  <Button variant="ghost" onClick={() => { setEditMode(false); setEditData(tenant); }}><X size={16}/> Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving}><Save size={16}/> {saving ? 'Salvando...' : 'Salvar'}</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setEditMode(true)}><Edit3 size={16}/> Editar</Button>
                  <Button variant="ghost"><Settings size={16}/> Configurações</Button>
                </>
              )}
            </div>
          </div>
          
          {/* Detalhes do Condomínio */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <InfoItem icon={<MapPin size={16}/>} label="Endereço" value={editMode ? (
              <input type="text" value={editData.address || ''} onChange={e => setEditData({...editData, address: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'var(--text-primary)' }}/>
            ) : tenant.address}/>
            <InfoItem icon={<Phone size={16}/>} label="Telefone" value={editMode ? (
              <input type="text" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'var(--text-primary)' }}/>
            ) : tenant.phone}/>
            <InfoItem icon={<Mail size={16}/>} label="E-mail" value={editMode ? (
              <input type="text" value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})}
                style={{ width: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'var(--text-primary)' }}/>
            ) : tenant.email}/>
            <InfoItem icon={<Clock size={16}/>} label="Desde" value={new Date(tenant.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}/>
          </div>
        </div>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <StatCard icon={<Building size={20}/>} label="Blocos" value={stats.blocos} color="blue"/>
          <StatCard icon={<Home size={20}/>} label="Unidades" value={stats.unidades} color="purple"/>
          <StatCard icon={<Users size={20}/>} label="Moradores" value={stats.moradores} color="green"/>
          <StatCard icon={<Car size={20}/>} label="Veículos" value={stats.veiculos} color="yellow"/>
          <StatCard icon={<UserPlus size={20}/>} label="Dependentes" value={stats.dependentes} color="blue"/>
          <StatCard icon={<PawPrint size={20}/>} label="Pets" value={stats.pets} color="purple"/>
        </div>
      )}

      {/* Cards de Alertas */}
      {stats && (stats.encomendas_pendentes > 0 || stats.manutencoes_abertas > 0 || stats.ocorrencias_abertas > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {stats.encomendas_pendentes > 0 && (
            <AlertCard icon={<Package size={18}/>} label="Encomendas Pendentes" value={stats.encomendas_pendentes} color="yellow" href="/encomendas"/>
          )}
          {stats.manutencoes_abertas > 0 && (
            <AlertCard icon={<Wrench size={18}/>} label="Manutenções Abertas" value={stats.manutencoes_abertas} color="blue" href="/maintenance"/>
          )}
          {stats.ocorrencias_abertas > 0 && (
            <AlertCard icon={<AlertTriangle size={18}/>} label="Ocorrências Abertas" value={stats.ocorrencias_abertas} color="red" href="/occurrences"/>
          )}
        </div>
      )}

      {/* Equipe */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} style={{ color: 'var(--accent)' }}/> Equipe de Gestão
          </h2>
          {(equipe.administracao.length + equipe.gestao.length) > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAllTeam(!showAllTeam)}>
              {showAllTeam ? 'Ver menos' : `Ver todos (${equipe.administracao.length + equipe.gestao.length})`} <ChevronRight size={16}/>
            </Button>
          )}
        </div>
        
        {(equipe.administracao.length + equipe.gestao.length) === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum membro da equipe cadastrado</p>
        ) : (
          <>
            {/* Administração */}
            {equipe.administracao.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Administração</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {equipe.administracao.map(member => (
                    <TeamCard key={member.id} member={member}/>
                  ))}
                </div>
              </div>
            )}
            
            {/* Gestão Operacional */}
            {equipe.gestao.length > 0 && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Gestão Operacional {!showAllTeam && equipe.gestao.length > 4 && `(mostrando 4 de ${equipe.gestao.length})`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {(showAllTeam ? equipe.gestao : equipe.gestao.slice(0, 4)).map(member => (
                    <TeamCard key={member.id} member={member}/>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        {icon} {label}
      </p>
      <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </Card>
  );
}

function AlertCard({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number; color: string; href: string }) {
  return (
    <a href={href} style={{ textDecoration: 'none' }}>
      <Card style={{ padding: '1rem', background: `${color}10`, border: `1px solid ${color}30`, cursor: 'pointer', transition: 'transform 150ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ color }}>{icon}</div>
            <div>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
          <ChevronRight size={20} style={{ color: 'var(--text-muted)' }}/>
        </div>
      </Card>
    </a>
  );
}

function TeamCard({ member }: { member: TeamMember }) {
  const color = roleColors[member.role] || '#6b7280';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '10px' }}>
      <Avatar name={member.name} src={member.photo_url ? `${API_BASE.replace('/api/v1', '')}${member.photo_url}` : undefined} size={44}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', borderRadius: '4px', background: `${color}20`, color, fontWeight: 500 }}>
            {roleNames[member.role] || 'Usuário'}
          </span>
          {member.is_active && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} title="Online"/>}
        </div>
      </div>
    </div>
  );
}
