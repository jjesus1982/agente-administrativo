"use client";
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck, Car, ParkingSquare, History,
  Shield, DoorOpen, QrCode, Plug, FileSearch, BarChart3
} from 'lucide-react';

const tabs = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/portaria' },
  { icon: Users, label: 'Visitantes', path: '/portaria/visitantes' },
  { icon: UserCheck, label: 'Visitas', path: '/portaria/visitas' },
  { icon: Car, label: 'Veículos', path: '/portaria/veiculos' },
  { icon: ParkingSquare, label: 'Garagem', path: '/portaria/garagem' },
  { icon: History, label: 'Acessos', path: '/portaria/acessos' },
  { icon: Shield, label: 'Grupos', path: '/portaria/grupos-acesso' },
  { icon: DoorOpen, label: 'Pontos', path: '/portaria/pontos-acesso' },
  { icon: QrCode, label: 'Pré-Autorizações', path: '/portaria/pre-autorizacoes' },
  { icon: Plug, label: 'Integrações', path: '/portaria/integracoes' },
  { icon: FileSearch, label: 'Auditoria', path: '/portaria/auditoria' },
  { icon: BarChart3, label: 'Relatórios', path: '/portaria/relatorios' },
];

export default function PortariaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Controle de Portaria
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          Gestão completa de acessos, visitantes e veículos
        </p>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-default)',
      }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.path ||
            (tab.path !== '/portaria' && pathname?.startsWith(tab.path));
          const isExactDashboard = tab.path === '/portaria' && pathname === '/portaria';
          const active = isExactDashboard || (tab.path !== '/portaria' && isActive);

          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                background: active ? 'var(--bg-tertiary)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
