"use client";
import { Settings, Users, Shield, Database, Bell, Palette } from 'lucide-react';
import { Card } from '@/components/ui';

export default function AdminPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={24} style={{ color: 'var(--accent)' }}/> Administração</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configurações do sistema</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {[
          { icon: Users, label: 'Usuários', desc: 'Gerenciar administradores', color: 'var(--accent)' },
          { icon: Shield, label: 'Permissões', desc: 'Controle de acesso', color: 'var(--success)' },
          { icon: Database, label: 'Backup', desc: 'Backup de dados', color: '#f97316' },
          { icon: Bell, label: 'Notificações', desc: 'Configurar alertas', color: '#8b5cf6' },
          { icon: Palette, label: 'Aparência', desc: 'Personalização', color: '#ec4899' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <Card key={item.label} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}><Icon size={24}/></div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.label}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
