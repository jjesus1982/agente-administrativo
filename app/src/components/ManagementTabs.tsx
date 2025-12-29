"use client";
import React from 'react';
import { Building2, Home, Users, RefreshCw, UserPlus, PawPrint, Car, ParkingSquare, Construction, Settings } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const tabs = [
    { icon: Building2, label: 'Condominio', path: '/management/condominio' },
    { icon: Home, label: 'Unidades', path: '/management/unidades' },
    { icon: Users, label: 'Usuarios', path: '/management/usuarios' },
    { icon: RefreshCw, label: 'Fornecedores', path: '/management/fornecedores' },
    { icon: UserPlus, label: 'Dependentes', path: '/management/dependentes' },
    { icon: PawPrint, label: 'Pets', path: '/management/pets' },
    { icon: Car, label: 'Veiculos', path: '/management/veiculos' },
    { icon: ParkingSquare, label: 'Vagas', path: '/management/vagas' },
    { icon: Construction, label: 'Obras', path: '/management/obras' },
    { icon: Settings, label: 'Configuracoes', path: '/management/configuracoes' },
];

export default function ManagementTabs() {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div style={{ display: 'flex', gap: '0.25rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.path;
                return (
                    <button
                        key={tab.path}
                        onClick={() => router.push(tab.path)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            background: isActive ? 'var(--primary)' : 'transparent',
                            color: isActive ? 'white' : 'var(--text-muted)',
                            fontWeight: isActive ? 600 : 400,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Icon size={16} /> {tab.label}
                    </button>
                );
            })}
        </div>
    );
}