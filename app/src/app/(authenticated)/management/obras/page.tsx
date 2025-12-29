"use client";
import React from 'react';
import { HardHat, Plus } from 'lucide-react';
import ManagementTabs from '@/components/ManagementTabs';
import { Card, Button, EmptyState } from '@/components/ui';

export default function ObrasPage() {
  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HardHat size={24} style={{ color: '#f97316' }}/> Obras</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestão de obras</p>
        </div>
        <Button><Plus size={16}/> Nova Obra</Button>
      </div>
      <Card><EmptyState icon={<HardHat size={48}/>} title="Obras" description="Em desenvolvimento"/></Card>
    </div>
  );
}
