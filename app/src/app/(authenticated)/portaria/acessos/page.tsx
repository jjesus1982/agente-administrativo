"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  History, Search, RefreshCw, LogIn, LogOut, User,
  Car, Home, Download
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface AcessoLog {
  id: number;
  tipo: 'entrada' | 'saida';
  pessoa_id: number;
  pessoa_nome: string;
  pessoa_tipo: 'morador' | 'visitante' | 'prestador' | 'funcionario';
  pessoa_foto?: string;
  documento?: string;
  unidade_nome?: string;
  ponto_acesso: string;
  metodo_acesso: 'tag' | 'facial' | 'qrcode' | 'manual' | 'interfone';
  veiculo_placa?: string;
  porteiro_nome?: string;
  observacoes?: string;
  created_at: string;
}

export default function AcessosPage() {
  const { currentTenant } = useTenant();
  const [acessos, setAcessos] = useState<AcessoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [filterPessoa, setFilterPessoa] = useState<'todos' | 'morador' | 'visitante' | 'prestador'>('todos');
  const [filterData, setFilterData] = useState<'hoje' | 'semana' | 'mes' | 'custom'>('hoje');

  const fetchAcessos = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/portaria/stats/acessos?tenant_id=${tenantId}&periodo=${filterData}`);
      if (res.ok) {
        const data = await res.json();
        setAcessos(data.items || data.acessos || []);
      }
    } catch (e) {
      console.error('Erro ao carregar acessos:', e);
      setAcessos([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAcessos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, filterData]);

  const filteredAcessos = acessos.filter(a => {
    const matchSearch = a.pessoa_nome.toLowerCase().includes(search.toLowerCase()) ||
      a.ponto_acesso.toLowerCase().includes(search.toLowerCase()) ||
      (a.veiculo_placa && a.veiculo_placa.includes(search.toUpperCase()));
    const matchTipo = filterTipo === 'todos' || a.tipo === filterTipo;
    const matchPessoa = filterPessoa === 'todos' || a.pessoa_tipo === filterPessoa;
    return matchSearch && matchTipo && matchPessoa;
  });

  const stats = {
    total: acessos.length,
    entradas: acessos.filter(a => a.tipo === 'entrada').length,
    saidas: acessos.filter(a => a.tipo === 'saida').length,
    moradores: acessos.filter(a => a.pessoa_tipo === 'morador').length,
    visitantes: acessos.filter(a => a.pessoa_tipo === 'visitante').length,
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMetodoLabel = (metodo: string) => {
    const labels: Record<string, string> = {
      tag: 'Tag RFID',
      facial: 'Reconhecimento Facial',
      qrcode: 'QR Code',
      manual: 'Manual',
      interfone: 'Interfone',
    };
    return labels[metodo] || metodo;
  };

  const getTipoColor = (tipo: string) => {
    return tipo === 'entrada' ? '#22c55e' : '#ef4444';
  };

  const getPessoaColor = (tipo: string) => {
    const colors: Record<string, string> = {
      morador: '#3b82f6',
      visitante: '#f59e0b',
      prestador: '#8b5cf6',
      funcionario: '#06b6d4',
    };
    return colors[tipo] || '#6b7280';
  };

  if (loading && acessos.length === 0) {
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
              placeholder="Buscar por nome, ponto ou placa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={filterData}
              onChange={(e) => setFilterData(e.target.value as typeof filterData)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            >
              <option value="hoje">Hoje</option>
              <option value="semana">\u00daltimos 7 dias</option>
              <option value="mes">\u00daltimos 30 dias</option>
            </select>
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
              <option value="entrada">Entradas</option>
              <option value="saida">Sa\u00eddas</option>
            </select>
            <select
              value={filterPessoa}
              onChange={(e) => setFilterPessoa(e.target.value as typeof filterPessoa)}
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
              <option value="prestador">Prestadores</option>
            </select>
            <Button variant="secondary">
              <Download size={16} /> Exportar
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <StatCard label="Total" value={stats.total} color="#3b82f6" icon={<History size={20} />} />
        <StatCard label="Entradas" value={stats.entradas} color="#22c55e" icon={<LogIn size={20} />} />
        <StatCard label="Sa\u00eddas" value={stats.saidas} color="#ef4444" icon={<LogOut size={20} />} />
        <StatCard label="Moradores" value={stats.moradores} color="#3b82f6" icon={<Home size={20} />} />
        <StatCard label="Visitantes" value={stats.visitantes} color="#f59e0b" icon={<User size={20} />} />
      </div>

      {/* Lista de Acessos */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} style={{ color: 'var(--accent)' }} /> Hist\u00f3rico de Acessos
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredAcessos.length} registro(s)
          </span>
        </CardHeader>

        {filteredAcessos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <History size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum acesso registrado no per\u00edodo</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredAcessos.map((acesso) => (
              <div
                key={acesso.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  borderLeft: `3px solid ${getTipoColor(acesso.tipo)}`,
                }}
              >
                {/* \u00cdcone Tipo */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: `${getTipoColor(acesso.tipo)}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {acesso.tipo === 'entrada' ? (
                    <LogIn size={20} style={{ color: getTipoColor(acesso.tipo) }} />
                  ) : (
                    <LogOut size={20} style={{ color: getTipoColor(acesso.tipo) }} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{acesso.pessoa_nome}</span>
                    <Badge
                      style={{
                        background: `${getPessoaColor(acesso.pessoa_tipo)}20`,
                        color: getPessoaColor(acesso.pessoa_tipo),
                        border: `1px solid ${getPessoaColor(acesso.pessoa_tipo)}40`,
                      }}
                    >
                      {acesso.pessoa_tipo}
                    </Badge>
                    {acesso.veiculo_placa && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Car size={14} /> {acesso.veiculo_placa}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {acesso.ponto_acesso}
                    {acesso.unidade_nome && ` \u2022 ${acesso.unidade_nome}`}
                    {` \u2022 ${getMetodoLabel(acesso.metodo_acesso)}`}
                  </div>
                </div>

                {/* Hora */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {formatDateTime(acesso.created_at)}
                  </div>
                  {acesso.porteiro_nome && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      por {acesso.porteiro_nome}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
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
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}
