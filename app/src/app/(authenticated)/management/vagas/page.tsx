"use client";
import React from 'react';
import { ParkingCircle, Plus } from 'lucide-react';
import ManagementTabs from '@/components/ManagementTabs';
import { Card, Button, EmptyState } from '@/components/ui';

export default function VagasPage() {
  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ParkingCircle size={24} style={{ color: '#8b5cf6' }}/> Vagas</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestão de vagas</p>
        </div>
        <Button><Plus size={16}/> Nova Vaga</Button>
      </div>
      <Card><EmptyState icon={<ParkingCircle size={48}/>} title="Vagas" description="Em desenvolvimento"/></Card>
    </div>
  );
}
