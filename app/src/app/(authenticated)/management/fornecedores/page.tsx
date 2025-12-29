"use client";
import React from 'react';
import { Truck, Plus } from 'lucide-react';
import ManagementTabs from '@/components/ManagementTabs';
import { Card, Button, EmptyState } from '@/components/ui';

export default function FornecedoresPage() {
  return (
    <div className="animate-fade-in">
      <ManagementTabs />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Truck size={24} style={{ color: '#14b8a6' }}/> Fornecedores</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cadastro de fornecedores</p>
        </div>
        <Button><Plus size={16}/> Novo Fornecedor</Button>
      </div>
      <Card><EmptyState icon={<Truck size={48}/>} title="Fornecedores" description="Em desenvolvimento"/></Card>
    </div>
  );
}
