"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  Package, Calendar, LayoutDashboard, Megaphone, Building2, ClipboardList,
  Wrench, AlertTriangle, FileText, Vote, BarChart3, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, User, Bell, ChevronDown, Brain,
  DollarSign, Newspaper
} from 'lucide-react';

import { api, API_BASE } from '@/lib/api';

// Nova estrutura organizada em categorias
const menuCategories = [
  {
    title: "PRINCIPAL",
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Bell, label: 'Alertas', path: '/alertas', badge: 3 },
    ]
  },
  {
    title: "GESTÃO",
    items: [
      { icon: DollarSign, label: 'Financeiro', path: '/management' },
      { icon: Calendar, label: 'Reservas', path: '/reservas' },
      { icon: Wrench, label: 'Manutenção', path: '/maintenance' },
      { icon: AlertTriangle, label: 'Ocorrências', path: '/occurrences' },
      { icon: Package, label: 'Encomendas', path: '/encomendas' },
      { icon: ClipboardList, label: 'Pesquisas', path: '/surveys' },
      { icon: FileText, label: 'Documentos', path: '/documents' },
      { icon: BarChart3, label: 'Relatórios', path: '/reports' },
    ]
  },
  {
    title: "COMUNICAÇÃO",
    items: [
      { icon: Megaphone, label: 'Comunicados', path: '/announcements' },
      { icon: Users, label: 'Entre Vizinhos', path: '/entre-vizinhos' },
      { icon: Vote, label: 'Assembleias', path: '/voting' },
      { icon: Newspaper, label: 'Classificados', path: '/classificados' },
    ]
  },
  {
    title: "INTELIGÊNCIA",
    items: [
      { icon: Brain, label: 'Visão Geral', path: '/ia/overview' },
    ]
  }
];

// Item sem categoria (no final)
const miscItems = [
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

// 🎨 DESIGN TOKENS OTIMIZADOS
const sidebarTokens = {
  // Container
  container: "flex flex-col h-screen",
  background: "bg-slate-900",

  // User section
  userSection: "p-4 bg-slate-800 border-b border-slate-700",
  userCard: "flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-700/30",

  // Navigation
  navContainer: "flex-1 overflow-y-auto py-4",

  // Section headers
  sectionHeader: "px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-6 first:mt-0",

  // Menu items
  menuItem: "flex items-center gap-3 mx-3 px-3 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-all duration-200 rounded-lg group hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-800/20",
  menuItemActive: "bg-slate-800 text-white shadow-lg ring-1 ring-slate-700 scale-[1.02] shadow-slate-800/30",

  // Icons
  icon: "w-5 h-5 shrink-0",

  // Badges
  badge: "px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[20px] text-center",

  // Footer
  footer: "p-4 border-t border-slate-700 bg-slate-800/50"
};

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
        const res = await api.get('/auth/auth/me');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (_) {
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
    <div className={`${sidebarTokens.container} ${sidebarTokens.background} ${collapsed ? 'w-16' : 'w-64'} fixed left-0 top-0 z-40 transition-all duration-300`}>

      {/* 1. HEADER - Logo e controle */}
      <div className="flex h-16 items-center justify-between px-4 bg-slate-800 border-b border-slate-700">
        {!collapsed && (
          <div>
            <div className="text-blue-400 font-bold text-base">Agente Administrativo</div>
            <div className="text-slate-400 text-xs">Sistema Admin</div>
          </div>
        )}
        {collapsed && (
          <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={() => { setCollapsed(!collapsed); setShowUserMenu(false); }}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all duration-200 hover:scale-110 hover:shadow-md"
          aria-label="Recolher menu lateral"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* 2. USER SECTION - Área do usuário destacada */}
      <div className={sidebarTokens.userSection}>
        <div
          onClick={() => !collapsed && setShowUserMenu(!showUserMenu)}
          className={`${sidebarTokens.userCard} ${collapsed ? 'justify-center cursor-default' : 'justify-start'} ${showUserMenu ? 'bg-slate-700' : ''}`}
        >
          {/* Avatar com foto ou iniciais */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-lg overflow-hidden ring-2 ring-slate-600"
            style={{
              background: userPhoto ? 'transparent' : `linear-gradient(135deg, #3b82f6, ${getRoleColor(userRole)})`,
            }}
          >
            {userPhoto ? (
              <Image
                src={userPhoto}
                alt={userName}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              userInitials
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-100 truncate">
                  {userName.split(' ')[0]}
                </div>
                <div
                  className="text-xs font-medium text-slate-300"
                >
                  {getRoleName(userRole)}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : 'rotate-0'}`}
              />
            </>
          )}
        </div>

        {/* User Dropdown Menu */}
        {showUserMenu && !collapsed && (
          <div className="absolute top-full left-2 right-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden mt-1">
            <UserMenuItem icon={<User size={16}/>} label="Meu Perfil" onClick={() => { setShowUserMenu(false); router.push('/profile'); }} />
            <UserMenuItem icon={<Bell size={16}/>} label="Notificações" onClick={() => { setShowUserMenu(false); router.push('/notifications'); }} badge={3} />
            <UserMenuItem icon={<Settings size={16}/>} label="Configurações" onClick={() => { setShowUserMenu(false); router.push('/settings'); }} />
            <div className="h-px bg-slate-700 mx-2 my-1" />
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

      {/* 3. NAVIGATION - Área scrollável com hierarquia visual */}
      <nav className={sidebarTokens.navContainer} role="navigation" aria-label="Navegacao lateral">
        {menuCategories.map((category) => (
          <div key={category.title}>
            {!collapsed && (
              <div className={sidebarTokens.sectionHeader}>
                {category.title}
              </div>
            )}
            <div className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');

                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`${sidebarTokens.menuItem} ${
                      isActive ? sidebarTokens.menuItemActive : ''
                    } ${collapsed ? 'justify-center mx-2' : 'justify-start'}`}
                  >
                    <Icon className={sidebarTokens.icon} />
                    {!collapsed && (
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                    )}
                    {!collapsed && item.badge && item.badge > 0 && (
                      <span className={sidebarTokens.badge}>
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Items sem categoria */}
        {miscItems.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700 mx-3">
            <div className="space-y-1">
              {miscItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');

                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`${sidebarTokens.menuItem} ${
                      isActive ? sidebarTokens.menuItemActive : ''
                    } ${collapsed ? 'justify-center mx-2' : 'justify-start'}`}
                  >
                    <Icon className={sidebarTokens.icon} />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* 4. FOOTER - Botão Sair destacado */}
      <div className={sidebarTokens.footer}>
        <button
          onClick={() => {
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            router.push('/login');
          }}
          title={collapsed ? 'Sair da conta' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-red-400 hover:bg-red-500/10 hover:text-red-300 ${collapsed ? 'justify-center' : 'justify-start'}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
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
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors text-left ${
        danger
          ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full min-w-[18px] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}