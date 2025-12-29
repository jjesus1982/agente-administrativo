"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  Car, Search, Plus, RefreshCw, MapPin
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface Veiculo {
  id: number;
  plate: string;
  model: string;
  brand?: string;
  color: string;
  vehicle_type: 'car' | 'motorcycle' | 'truck' | 'bike' | 'other';
  owner_id: number;
  owner_name?: string;
  owner_type?: 'morador' | 'visitante';
  unit_id?: number;
  unit_number?: string;
  parking_spot_number?: string;
  tag_number?: string;
  is_active: boolean;
  created_at: string;
}

export default function VeiculosPage() {
  const { currentTenant } = useTenant();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'morador' | 'visitante'>('todos');

  const fetchVeiculos = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/vehicles?tenant_id=${tenantId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setVeiculos(data.items || data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar veículos:', e);
      // Estado vazio - sem mock data
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVeiculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const filteredVeiculos = veiculos.filter(v => {
    const matchSearch = v.plate.toLowerCase().includes(search.toLowerCase()) ||
      (v.model?.toLowerCase().includes(search.toLowerCase()) || false) ||
      (v.owner_name?.toLowerCase().includes(search.toLowerCase()) || false);
    const matchFilter = filterTipo === 'todos' ? true : v.owner_type === filterTipo;
    return matchSearch && matchFilter;
  });

  if (loading && veiculos.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <Input
              placeholder="Buscar por placa, modelo ou proprietário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value as typeof filterTipo)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="todos">Todos</option>
              <option value="morador">Moradores</option>
              <option value="visitante">Visitantes</option>
            </select>
            <Button>
              <Plus size={16} /> Novo Veículo
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <MiniStat label="Total" value={veiculos.length} color="#3b82f6" icon="🚗" />
        <MiniStat label="Moradores" value={veiculos.filter(v => v.owner_type === 'morador').length} color="#22c55e" icon="🏠" />
        <MiniStat label="Visitantes" value={veiculos.filter(v => v.owner_type === 'visitante').length} color="#f59e0b" icon="👥" />
        <MiniStat label="Com Tag" value={veiculos.filter(v => v.tag_number).length} color="#8b5cf6" icon="🏷️" />
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Car size={20} style={{ color: 'var(--accent)' }} /> Veículos Cadastrados
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredVeiculos.length} veículo(s)
          </span>
        </CardHeader>

        {filteredVeiculos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Car size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum veículo encontrado</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredVeiculos.map((veiculo) => (
              <VeiculoCard key={veiculo.id} veiculo={veiculo} />
            ))}
          </div>
        )}
      </Card>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MiniStat({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '12px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function VeiculoCard({ veiculo }: { veiculo: Veiculo }) {
  const tipoLabel = veiculo.owner_type === 'morador' ? 'morador' : 'visitante';

  return (
    <div style={{
      padding: '1rem',
      borderRadius: '12px',
      background: 'var(--bg-tertiary)',
      border: '1px solid var(--border-default)',
      transition: 'all 150ms',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '1px',
            color: 'var(--text-primary)',
          }}>
            {veiculo.plate}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {veiculo.model} • {veiculo.color}
          </div>
        </div>
        <Badge variant={veiculo.owner_type === 'morador' ? 'success' : 'warning'}>
          {tipoLabel}
        </Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Proprietário:</span>
          <span style={{ fontWeight: 500 }}>{veiculo.owner_name || '-'}</span>
        </div>
        {veiculo.unit_number && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Unidade:</span>
            <span style={{ fontWeight: 500 }}>{veiculo.unit_number}</span>
          </div>
        )}
        {veiculo.parking_spot_number && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 500 }}>Vaga {veiculo.parking_spot_number}</span>
          </div>
        )}
        {veiculo.tag_number && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            background: '#8b5cf620',
            borderRadius: '4px',
            color: '#8b5cf6',
            fontSize: '0.75rem',
            fontWeight: 500,
            width: 'fit-content',
          }}>
            🏷️ {veiculo.tag_number}
          </div>
        )}
      </div>
    </div>
  );
}
