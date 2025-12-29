"use client";
import React from 'react';
import Link from 'next/link';
import { Building2, Users, Car, Home, UserPlus, PawPrint, ParkingCircle, HardHat, Truck, Settings } from 'lucide-react';

const modules = [
  { icon: Building2, label: 'Condomínio', path: '/management/condominio', color: '#6366f1', desc: 'Configurações gerais' },
  { icon: Home, label: 'Unidades', path: '/management/unidades', color: '#f97316', desc: 'Apartamentos e casas' },
  { icon: Users, label: 'Usuários', path: '/management/usuarios', color: '#3b82f6', desc: 'Gestão de moradores' },
  { icon: Truck, label: 'Fornecedores', path: '/management/fornecedores', color: '#14b8a6', desc: 'Cadastro de fornecedores' },
  { icon: UserPlus, label: 'Dependentes', path: '/management/dependentes', color: '#22c55e', desc: 'Cadastro de dependentes' },
  { icon: PawPrint, label: 'Pets', path: '/management/pets', color: '#ec4899', desc: 'Cadastro de animais' },
  { icon: Car, label: 'Veículos', path: '/management/veiculos', color: '#eab308', desc: 'Cadastro de veículos' },
  { icon: ParkingCircle, label: 'Vagas', path: '/management/vagas', color: '#8b5cf6', desc: 'Vagas de estacionamento' },
  { icon: HardHat, label: 'Obras', path: '/management/obras', color: '#f43f5e', desc: 'Gestão de obras' },
  { icon: Settings, label: 'Configurações', path: '/management/configuracoes', color: '#64748b', desc: 'Configurações do sistema' },
];

export default function ManagementPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={24} style={{ color: 'var(--accent)' }}/> Gestão Condominial
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gerencie todos os cadastros do condomínio</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {modules.map(m => {
          const Icon = m.icon;
          return (
            <Link 
              key={m.path} 
              href={m.path}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div 
                style={{ 
                  background: 'var(--bg-secondary)', 
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  padding: '1rem',
                  cursor: 'pointer', 
                  transition: 'all 150ms ease',
                }} 
                onMouseOver={(e) => { 
                  e.currentTarget.style.borderColor = m.color; 
                  e.currentTarget.style.transform = 'translateY(-2px)'; 
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => { 
                  e.currentTarget.style.borderColor = 'var(--border-color)'; 
                  e.currentTarget.style.transform = 'translateY(0)'; 
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    background: `${m.color}20`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: m.color 
                  }}>
                    <Icon size={24}/>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem', margin: 0 }}>{m.label}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{m.desc}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
