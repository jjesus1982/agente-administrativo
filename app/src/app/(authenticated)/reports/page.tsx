"use client";
import React, { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import {
  BarChart3, Search, Users, Car, DoorOpen, Wrench, FileText, Home, AlertTriangle,
  UserCheck, Package, Calendar, Key, BookOpen, PawPrint, Trash2, Clock, Shield,
  Monitor, Cpu, Zap, MapPin, UserPlus, Eye, LogIn,
  TrendingUp, Truck, Settings, HardDrive, Box
} from 'lucide-react';
import { Card } from '@/components/ui';

interface ReportItem {
  icon: any;
  label: string;
  path: string;
}

interface ReportCategory {
  title: string;
  items: ReportItem[];
}

const reportCategories: ReportCategory[] = [
  {
    title: 'Controle de Acesso',
    items: [
      { icon: DoorOpen, label: 'Entrada/Saída visitantes', path: '/reports/visitors-log' },
      { icon: Truck, label: 'Entrada/Saída de prestadores', path: '/reports/providers-log' },
      { icon: Monitor, label: 'Dispositivos cadastrados', path: '/reports/devices' },
      { icon: Calendar, label: 'Previsões de visita', path: '/reports/visit-forecast' },
      { icon: Cpu, label: 'Eventos de hardware', path: '/reports/hardware-events' },
      { icon: Settings, label: 'Solicitações de dispositivos', path: '/reports/device-requests' },
      { icon: Clock, label: 'Presença diária', path: '/reports/daily-presence' },
      { icon: TrendingUp, label: 'Histórico de frequência', path: '/reports/frequency-history' },
    ]
  },
  {
    title: 'Cadastros',
    items: [
      { icon: Users, label: 'Usuários', path: '/reports/users' },
      { icon: UserPlus, label: 'Usuários detalhados', path: '/reports/users-detailed' },
      { icon: Users, label: 'Dependentes', path: '/reports/dependents' },
      { icon: PawPrint, label: 'Pets', path: '/reports/pets' },
      { icon: Car, label: 'Veículos de condôminos', path: '/reports/vehicles' },
      { icon: Car, label: 'Veículo detalhado', path: '/reports/vehicle-detailed' },
      { icon: Car, label: 'Veículos de visitantes', path: '/reports/vehicle-visitors' },
      { icon: UserCheck, label: 'Visitantes', path: '/reports/visitors' },
      { icon: Eye, label: 'Visitantes ativos', path: '/reports/visitors-active' },
      { icon: Home, label: 'Unidades', path: '/reports/units' },
      { icon: MapPin, label: 'Vagas de veículos', path: '/reports/parking-spots' },
    ]
  },
  {
    title: 'Operacional',
    items: [
      { icon: Wrench, label: 'Manutenção', path: '/reports/maintenance-general' },
      { icon: Wrench, label: 'Chamados de manutenção', path: '/reports/maintenance-calls' },
      { icon: AlertTriangle, label: 'Ocorrências', path: '/reports/occurrences' },
      { icon: Calendar, label: 'Reservas', path: '/reports/reservations' },
      { icon: Package, label: 'Encomendas', path: '/reports/packages' },
      { icon: Key, label: 'Histórico de chaves', path: '/reports/keys' },
      { icon: BookOpen, label: 'Livro da portaria', path: '/reports/logbook' },
      { icon: Box, label: 'Controle de Ativos', path: '/reports/assets' },
      { icon: HardDrive, label: 'Obras', path: '/reports/works' },
      { icon: Search, label: 'Achados e perdidos', path: '/reports/lost-found' },
    ]
  },
  {
    title: 'Segurança e Auditoria',
    items: [
      { icon: Shield, label: 'Solicitações de acesso', path: '/reports/access-requests' },
      { icon: LogIn, label: 'Últimos logins', path: '/reports/logins' },
      { icon: FileText, label: 'Logs de auditoria', path: '/reports/audit' },
      { icon: Trash2, label: 'Registros excluídos', path: '/reports/deleted' },
      { icon: Zap, label: 'Eventos de velocidade', path: '/reports/speed-events' },
    ]
  },
];

export default function ReportsPage() {
  const router = useRouter();
  const { currentTenant: _currentTenant } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = reportCategories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={28} style={{ color: 'var(--accent)' }}/> Relatórios
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gere e exporte relatórios do sistema</p>
        </div>
      </div>

      {/* Barra de Busca */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}/>
          <input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="Busque por um relatório..."
            style={{ 
              width: '100%', 
              padding: '0.75rem 0.75rem 0.75rem 2.5rem', 
              borderRadius: '8px', 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-default)', 
              color: 'var(--text-primary)', 
              fontSize: '0.9rem' 
            }}
          />
        </div>
      </Card>

      {/* Categorias */}
      {filteredCategories.map(category => (
        <div key={category.title} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {category.title}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
            {category.items.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <Icon size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }}/>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Caso não encontre resultados */}
      {filteredCategories.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <Search size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }}/>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum relatório encontrado para "{searchTerm}"</p>
        </Card>
      )}
    </div>
  );
}
