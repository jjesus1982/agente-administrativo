"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  DoorOpen, Plus, Settings, RefreshCw, Search, Wifi, WifiOff, Unlock
} from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/ui';
import { api } from '@/lib/api';

interface PontoAcesso {
  id: number;
  nome: string;
  tipo: 'entrada' | 'saida' | 'bidirecional';
  dispositivo: 'catraca' | 'cancela' | 'porta' | 'eclusa' | 'portao';
  localizacao: string;
  ip_address?: string;
  status: 'online' | 'offline' | 'manutencao';
  ultimo_acesso?: string;
  acessos_hoje: number;
  integracao?: string;
  ativo: boolean;
}

export default function PontosAcessoPage() {
  const { currentTenant } = useTenant();
  const [pontos, setPontos] = useState<PontoAcesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchPontos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/portaria/pontos-acesso');

      if (res.ok) {
        const data = await res.json();
        setPontos(data.items || data || []);
      } else {
        console.error('Pontos-acesso API error:', res.status);
        alert('Erro ao carregar pontos de acesso.');
      }
    } catch (e: any) {
      console.error('Erro ao carregar pontos de acesso:', e);
      alert(`Erro ao carregar pontos de acesso: ${e.message}`);
      setPontos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPontos();
    const interval = setInterval(fetchPontos, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const filteredPontos = pontos.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.localizacao.toLowerCase().includes(search.toLowerCase())
  );

  const handleAbrirPonto = async (ponto: PontoAcesso) => {
    try {
      const res = await api.post(`/portaria/pontos-acesso/${ponto.id}/abrir`);

      if (res.ok) {
        alert(`${ponto.nome} foi aberto com sucesso!`);
        // Atualizar status do ponto se necessário
        fetchPontos();
      } else {
        const errorData = await res.json();
        alert(`Erro ao abrir ${ponto.nome}: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao abrir ponto:', error);
      alert(`Erro ao abrir ${ponto.nome}: ${error.message}`);
    }
  };

  const stats = {
    total: pontos.length,
    online: pontos.filter(p => p.status === 'online').length,
    offline: pontos.filter(p => p.status === 'offline').length,
    manutencao: pontos.filter(p => p.status === 'manutencao').length,
  };

  if (loading && pontos.length === 0) {
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
              placeholder="Buscar ponto de acesso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <Button>
            <Plus size={16} /> Novo Ponto
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <StatCard label="Total" value={stats.total} color="#3b82f6" />
        <StatCard label="Online" value={stats.online} color="#22c55e" icon={<Wifi size={18} />} />
        <StatCard label="Offline" value={stats.offline} color="#ef4444" icon={<WifiOff size={18} />} />
        <StatCard label="Manuten\u00e7\u00e3o" value={stats.manutencao} color="#f59e0b" icon={<Settings size={18} />} />
      </div>

      {/* Lista de Pontos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {filteredPontos.map((ponto) => (
          <PontoCard key={ponto.id} ponto={ponto} onAbrir={() => handleAbrirPonto(ponto)} />
        ))}
      </div>

      {filteredPontos.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <DoorOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum ponto de acesso encontrado</p>
          </div>
        </Card>
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
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
      {icon && <div style={{ color }}>{icon}</div>}
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function PontoCard({ ponto, onAbrir }: { ponto: PontoAcesso; onAbrir: () => void }) {
  const statusConfig = {
    online: { color: '#22c55e', icon: <Wifi size={16} />, label: 'Online' },
    offline: { color: '#ef4444', icon: <WifiOff size={16} />, label: 'Offline' },
    manutencao: { color: '#f59e0b', icon: <Settings size={16} />, label: 'Manuten\u00e7\u00e3o' },
  };

  const dispositivoIcons: Record<string, string> = {
    catraca: '\ud83d\udeaa',
    cancela: '\ud83d\udea7',
    porta: '\ud83d\udeaa',
    eclusa: '\ud83d\udd10',
    portao: '\u26d4',
  };

  const tipoLabels: Record<string, string> = {
    entrada: 'Entrada',
    saida: 'Sa\u00edda',
    bidirecional: 'Bidirecional',
  };

  const cfg = statusConfig[ponto.status];

  return (
    <Card style={{
      borderTop: `3px solid ${cfg.color}`,
      opacity: ponto.ativo ? 1 : 0.6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{dispositivoIcons[ponto.dispositivo]}</span>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{ponto.nome}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {ponto.localizacao}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          background: `${cfg.color}20`,
          color: cfg.color,
          fontSize: '0.75rem',
          fontWeight: 500,
        }}>
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tipo</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tipoLabels[ponto.tipo]}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dispositivo</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>{ponto.dispositivo}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Acessos Hoje</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>{ponto.acessos_hoje}</div>
        </div>
      </div>

      {ponto.ip_address && (
        <div style={{
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          marginBottom: '1rem',
          fontFamily: 'monospace',
        }}>
          IP: {ponto.ip_address}
        </div>
      )}

      {ponto.integracao && (
        <Badge variant="secondary" style={{ marginBottom: '1rem' }}>
          {ponto.integracao}
        </Badge>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          variant="secondary"
          style={{ flex: 1 }}
          disabled={ponto.status !== 'online'}
        >
          <Settings size={16} /> Configurar
        </Button>
        <Button
          style={{ flex: 1 }}
          onClick={onAbrir}
          disabled={ponto.status !== 'online'}
        >
          <Unlock size={16} /> Abrir
        </Button>
      </div>
    </Card>
  );
}
