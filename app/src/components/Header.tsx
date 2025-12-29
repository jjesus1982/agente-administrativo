"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, LogOut, X, FileText, Wrench, AlertTriangle, Users, Home, Package, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TenantSelector from './TenantSelector';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@/lib/api';

// Itens pesquisáveis
const SEARCH_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: Home, keywords: ['inicio', 'home', 'painel'] },
  { name: 'Manutenção', path: '/maintenance', icon: Wrench, keywords: ['chamados', 'tickets', 'reparo'] },
  { name: 'Ocorrências', path: '/occurrences', icon: AlertTriangle, keywords: ['problemas', 'reclamações'] },
  { name: 'Documentos', path: '/documents', icon: FileText, keywords: ['arquivos', 'pdf', 'regulamento'] },
  { name: 'Pesquisas', path: '/surveys', icon: MessageSquare, keywords: ['votação', 'enquete', 'feedback'] },
  { name: 'Encomendas', path: '/encomendas', icon: Package, keywords: ['pacotes', 'entregas', 'correios'] },
  { name: 'Entre Vizinhos', path: '/entre-vizinhos', icon: Users, keywords: ['classificados', 'marketplace', 'vendas'] },
  { name: 'Comunicados', path: '/announcements', icon: MessageSquare, keywords: ['avisos', 'noticias'] },
  { name: 'Moradores', path: '/management/usuarios', icon: Users, keywords: ['usuarios', 'pessoas', 'residentes'] },
  { name: 'Unidades', path: '/management/unidades', icon: Home, keywords: ['apartamentos', 'casas', 'blocos'] },
  { name: 'Veículos', path: '/management/veiculos', icon: Home, keywords: ['carros', 'motos', 'vagas'] },
  { name: 'Perfil', path: '/profile', icon: Users, keywords: ['minha conta', 'configurações'] },
  { name: 'Notificações', path: '/notifications', icon: Bell, keywords: ['alertas', 'mensagens'] },
];

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar resultados
  const filteredResults = searchTerm.trim() 
    ? SEARCH_ITEMS.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const handleSearch = (path: string) => {
    router.push(path);
    setSearchTerm('');
    setShowResults(false);
  };

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

      {/* Search Bar */}
      <div ref={searchRef} style={{ position: 'relative', minWidth: '280px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.5rem 1rem', background: 'var(--bg-tertiary)',
          borderRadius: '8px', border: '1px solid var(--border-color)',
        }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar páginas..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '0.875rem', width: '100%'
            }}
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setShowResults(false); }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={14} style={{ color: 'var(--text-muted)' }}/>
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && filteredResults.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: 'var(--bg-primary)', borderRadius: '10px',
            border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 1000, overflow: 'hidden', maxHeight: '300px', overflowY: 'auto'
          }}>
            {filteredResults.map((item, idx) => (
              <button key={idx} onClick={() => handleSearch(item.path)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', border: 'none', background: 'transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'background 150ms'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <item.icon size={18} style={{ color: 'var(--accent)' }}/>
                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{item.name}</span>
              </button>
            ))}
          </div>
        )}

        {showResults && searchTerm && filteredResults.length === 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
            background: 'var(--bg-primary)', borderRadius: '10px',
            border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 1000, padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem'
          }}>
            Nenhum resultado para "{searchTerm}"
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Notificações */}
        <button onClick={() => router.push('/notifications')} style={{
          position: 'relative', padding: '0.5rem', background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)', borderRadius: '8px',
          cursor: 'pointer', color: 'var(--text-primary)'
        }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '8px', height: '8px', background: '#ef4444',
            borderRadius: '50%', border: '2px solid var(--bg-secondary)'
          }} />
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
