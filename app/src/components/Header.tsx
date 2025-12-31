"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, LogOut, X, FileText, Wrench, AlertTriangle, Users, Home, Package, MessageSquare, Command, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TenantSelector from './TenantSelector';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@/lib/api';
import { useGlobalSearch } from './GlobalSearch';
import { useQuickActions } from './QuickActionsPanel';
import { useNotificationsCenter } from './NotificationsCenter';


export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { openSearch } = useGlobalSearch();
  const { openQuickActions } = useQuickActions();
  const { openNotifications, unreadCount } = useNotificationsCenter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadgeColor = (role: number) => {
    const colors: Record<number, string> = {
      1: '#6b7280', 2: '#3b82f6', 3: '#f59e0b', 4: '#8b5cf6', 5: '#ef4444'
    };
    return colors[role] || '#6b7280';
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem',
      borderRadius: '12px', gap: '1rem'
    }}>
      {/* Tenant Selector */}
      <TenantSelector />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Global Search Button */}
      <div style={{ minWidth: '280px' }}>
        <button
          onClick={openSearch}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.5rem 1rem', background: 'var(--bg-tertiary)',
            borderRadius: '8px', border: '1px solid var(--border-color)',
            cursor: 'pointer', width: '100%', transition: 'all 150ms',
            color: 'var(--text-muted)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          <Search size={16} />
          <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem' }}>
            Buscar páginas, ações...
          </span>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.75rem', opacity: 0.7
          }}>
            <Command size={12} />
            <span>K</span>
          </div>
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Quick Actions */}
        <button
          onClick={openQuickActions}
          style={{
            padding: '0.5rem', background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            cursor: 'pointer', color: 'var(--text-primary)',
            transition: 'all 150ms'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          title="Quick Actions (Ctrl+Shift+P)"
        >
          <Zap size={18} />
        </button>

        {/* Notificações */}
        <button
          onClick={openNotifications}
          style={{
            position: 'relative', padding: '0.5rem', background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            cursor: 'pointer', color: 'var(--text-primary)',
            transition: 'all 150ms'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
          title="Notificações"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '4px', right: '4px',
              minWidth: '16px', height: '16px', background: '#ef4444',
              borderRadius: '50%', border: '2px solid var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 'bold', color: 'white'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowUserMenu(!showUserMenu)} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.375rem 0.75rem 0.375rem 0.5rem', background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer'
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: user?.photo_url
                ? `url(${API_BASE.replace('/api/v1', '')}${user.photo_url}) center/cover`
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 600, fontSize: '0.875rem'
            }}>
              {!user?.photo_url && (user?.name?.charAt(0).toUpperCase() || 'U')}
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {user?.name || 'Usuário'}
              </p>
              <p style={{ 
                fontSize: '0.65rem', margin: 0, padding: '0.1rem 0.3rem', borderRadius: '4px',
                background: getRoleBadgeColor(user?.role || 1), color: 'white', display: 'inline-block'
              }}>
                {user?.role_name || 'Morador'}
              </p>
            </div>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              minWidth: '200px', background: 'var(--bg-primary)', borderRadius: '10px',
              border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              zIndex: 1000, overflow: 'hidden'
            }}>
              <button onClick={() => { router.push('/profile'); setShowUserMenu(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.875rem'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Users size={16}/> Meu Perfil
              </button>
              <div style={{ height: '1px', background: 'var(--border-color)' }}/>
              <button onClick={logout} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                cursor: 'pointer', color: '#ef4444', fontSize: '0.875rem'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16}/> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
