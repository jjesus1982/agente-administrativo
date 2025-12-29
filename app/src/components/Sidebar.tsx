"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Package, Calendar,
  LayoutDashboard, Megaphone, Building2, ClipboardList, Wrench, AlertTriangle,
  FileText, Vote, BarChart3, Users, Settings, LogOut, ChevronLeft, ChevronRight,
  User, Bell, ChevronDown, ShieldCheck
} from 'lucide-react';

import { api, API_BASE } from '@/lib/api';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShieldCheck, label: 'Portaria', path: '/portaria' },
  { icon: Megaphone, label: 'Comunicados', path: '/announcements' },
  { icon: Calendar, label: 'Reservas', path: '/reservas' },
  { icon: Building2, label: 'Gestão Condominial', path: '/management' },
  { icon: Users, label: 'Entre Vizinhos', path: '/entre-vizinhos' },
  { icon: ClipboardList, label: 'Pesquisas', path: '/surveys' },
  { icon: Wrench, label: 'Manutenção', path: '/maintenance' },
  { icon: AlertTriangle, label: 'Ocorrências', path: '/occurrences' },
  { icon: Package, label: 'Encomendas', path: '/encomendas' },
  { icon: FileText, label: 'Documentos', path: '/documents' },
  { icon: Vote, label: 'Votação', path: '/voting' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Settings, label: 'Funcionalidades', path: '/funcionalidades' },
];

const getRoleName = (role: number | string) => {
  const roles: Record<number, string> = {
    1: 'Morador',
    2: 'Síndico',
    3: 'Porteiro',
    4: 'Administrador',
    5: 'Super Admin',
    9: 'Agente AGP',
  };
  if (typeof role === 'number') return roles[role] || 'Usuário';
  return role || 'Usuário';
};

const getRoleColor = (role: number | string) => {
  const colors: Record<number, string> = {
    1: '#3b82f6',
    2: '#f59e0b',
    3: '#22c55e',
    4: '#ef4444',
    5: '#8b5cf6',
    9: '#06b6d4',
  };
  if (typeof role === 'number') return colors[role] || '#64748b';
  return '#64748b';
};

interface UserProfile {
  id: number;
  name: string;
  email: string;
  photo_url: string | null;
  role: number;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Buscar dados do perfil incluindo foto
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile/me');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (_e) {
        // Erro ao buscar perfil
      }
    };
    fetchProfile();
  }, []);

  // Usar dados do profile se disponível, senão do contexto auth
  const userName = profile?.name || user?.name || 'Usuário';
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  const userRole = profile?.role ?? user?.role ?? 1;
  const userPhoto = profile?.photo_url ? `${API_BASE.replace('/api/v1', '')}${profile.photo_url}` : null;

  return (
    <div style={{
      width: collapsed ? '70px' : '240px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-default)',
      transition: 'width 200ms ease',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '1rem 0.5rem' : '1.25rem 1rem',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        {!collapsed && (
          <div>
            <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1rem' }}>Agente Global</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Sistema Admin</div>
          </div>
        )}
        {collapsed && <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '1.25rem' }}>AG</div>}
      </div>

      {/* User Area */}
      <div style={{
        padding: collapsed ? '0.75rem 0.5rem' : '0.75rem 1rem',
        borderBottom: '1px solid var(--border-default)',
        position: 'relative',
      }}>
        <div 
          onClick={() => !collapsed && setShowUserMenu(!showUserMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem',
            borderRadius: '8px',
            cursor: collapsed ? 'default' : 'pointer',
            background: showUserMenu ? 'var(--bg-tertiary)' : 'transparent',
            transition: 'background 150ms',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          onMouseEnter={(e) => { if (!collapsed) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
          onMouseLeave={(e) => { if (!showUserMenu) e.currentTarget.style.background = 'transparent'; }}
        >
          {/* Avatar com foto ou iniciais */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: userPhoto ? 'transparent' : `linear-gradient(135deg, var(--accent), ${getRoleColor(userRole)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.8rem',
            fontWeight: 600,
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}>
            {userPhoto ? (
              <img 
                src={userPhoto} 
                alt={userName} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                }}
              />
            ) : (
              userInitials
            )}
          </div>
          
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 600, 
                  fontSize: '0.85rem', 
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {userName.split(' ')[0]}
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  color: getRoleColor(userRole),
                  fontWeight: 500,
                }}>
                  {getRoleName(userRole)}
                </div>
              </div>
              <ChevronDown 
                size={16} 
                style={{ 
                  color: 'var(--text-muted)', 
                  transition: 'transform 200ms',
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                }} 
              />
            </>
          )}
        </div>

        {/* User Dropdown Menu */}
        {showUserMenu && !collapsed && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0.5rem',
            right: '0.5rem',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 200,
            overflow: 'hidden',
          }}>
            <UserMenuItem icon={<User size={16}/>} label="Meu Perfil" onClick={() => { setShowUserMenu(false); router.push('/profile'); }} />
            <UserMenuItem icon={<Bell size={16}/>} label="Notificações" onClick={() => { setShowUserMenu(false); router.push('/notifications'); }} badge={3} />
            <UserMenuItem icon={<Settings size={16}/>} label="Configurações" onClick={() => { setShowUserMenu(false); router.push('/settings'); }} />
            <div style={{ height: '1px', background: 'var(--border-default)', margin: '0.25rem 0' }} />
            <UserMenuItem 
              icon={<LogOut size={16}/>} 
              label="Sair da conta" 
              onClick={() => {
                document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                router.push('/login');
              }} 
              danger 
            />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.5rem', overflowY: 'auto' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
          
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '0.75rem',
                padding: collapsed ? '0.75rem' : '0.625rem 0.875rem',
                marginBottom: '2px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                fontSize: '0.875rem',
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border-default)' }}>
        <button
          onClick={() => { setCollapsed(!collapsed); setShowUserMenu(false); }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span>Recolher</span></>}
        </button>
      </div>
    </div>
  );
}

function UserMenuItem({ 
  icon, 
  label, 
  onClick, 
  badge, 
  danger 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
  badge?: number;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.625rem 0.875rem',
        border: 'none',
        background: 'transparent',
        color: danger ? 'var(--error)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '0.8rem',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--error-bg)' : 'var(--bg-tertiary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          background: 'var(--error)',
          color: 'white',
          fontSize: '0.65rem',
          fontWeight: 600,
          padding: '0.125rem 0.375rem',
          borderRadius: '9999px',
          minWidth: '18px',
          textAlign: 'center',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
