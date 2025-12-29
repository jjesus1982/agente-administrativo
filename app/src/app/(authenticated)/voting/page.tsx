"use client";
import React from 'react';
import { Vote, Plus } from 'lucide-react';
import { Card, Button, EmptyState } from '@/components/ui';

export default function VotingPage() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Vote size={24} style={{ color: 'var(--accent)' }}/> Votação Digital</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Enquetes e votações do condomínio</p>
        </div>
        <Button><Plus size={16}/> Nova Votação</Button>
      </div>
      <Card><EmptyState icon={<Vote size={48}/>} title="Nenhuma votação" description="Não há votações ativas no momento"/></Card>
    </div>
  );
}
