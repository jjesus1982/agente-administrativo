"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  FileSearch, Search, RefreshCw, Download,
  Settings, DoorOpen, Clock, Eye
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface AuditLog {
  id: number;
  acao: string;
  modulo: string;
  usuario_id: number;
  usuario_nome: string;
  usuario_role: string;
  entidade_tipo: string;
  entidade_id?: number;
  detalhes: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function AuditoriaPage() {
  const { currentTenant } = useTenant();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModulo, setFilterModulo] = useState('todos');
  const [filterPeriodo, setFilterPeriodo] = useState('hoje');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/audit-logs?tenant_id=${tenantId}&periodo=${filterPeriodo}&modulo=${filterModulo}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar logs de auditoria:', e);
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, filterModulo, filterPeriodo]);

  const filteredLogs = logs.filter(l =>
    l.usuario_nome.toLowerCase().includes(search.toLowerCase()) ||
    l.acao.toLowerCase().includes(search.toLowerCase()) ||
    l.modulo.toLowerCase().includes(search.toLowerCase())
  );

  const getAcaoIcon = (acao: string) => {
    const icons: Record<string, React.ReactNode> = {
      create: <span style={{ color: '#22c55e' }}>+</span>,
      update: <span style={{ color: '#f59e0b' }}>\u270e</span>,
      delete: <span style={{ color: '#ef4444' }}>\u00d7</span>,
      login: <span style={{ color: '#3b82f6' }}>\u2192</span>,
      logout: <span style={{ color: '#6b7280' }}>\u2190</span>,
      access: <DoorOpen size={14} style={{ color: '#8b5cf6' }} />,
      config: <Settings size={14} style={{ color: '#06b6d4' }} />,
    };
    return icons[acao] || <Eye size={14} />;
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      create: 'Cria\u00e7\u00e3o',
      update: 'Atualiza\u00e7\u00e3o',
      delete: 'Exclus\u00e3o',
      login: 'Login',
      logout: 'Logout',
      access: 'Acesso',
      config: 'Configura\u00e7\u00e3o',
    };
    return labels[acao] || acao;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading && logs.length === 0) {
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
              placeholder="Buscar por usu\u00e1rio, a\u00e7\u00e3o ou m\u00f3dulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            value={filterPeriodo}
            onChange={(e) => setFilterPeriodo(e.target.value)}
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
            value={filterModulo}
            onChange={(e) => setFilterModulo(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="todos">Todos M\u00f3dulos</option>
            <option value="visitantes">Visitantes</option>
            <option value="acessos">Acessos</option>
            <option value="grupos">Grupos</option>
            <option value="integracoes">Integra\u00e7\u00f5es</option>
            <option value="autorizacoes">Autoriza\u00e7\u00f5es</option>
          </select>
          <Button variant="secondary">
            <Download size={16} /> Exportar
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <StatCard label="Total" value={logs.length} color="#3b82f6" />
        <StatCard label="Cria\u00e7\u00f5es" value={logs.filter(l => l.acao === 'create').length} color="#22c55e" />
        <StatCard label="Atualiza\u00e7\u00f5es" value={logs.filter(l => l.acao === 'update').length} color="#f59e0b" />
        <StatCard label="Exclus\u00f5es" value={logs.filter(l => l.acao === 'delete').length} color="#ef4444" />
      </div>

      {/* Lista de Logs */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSearch size={20} style={{ color: 'var(--accent)' }} /> Registros de Auditoria
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredLogs.length} registro(s)
          </span>
        </CardHeader>

        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <FileSearch size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum registro encontrado</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  fontSize: '0.85rem',
                }}
              >
                {/* \u00cdcone A\u00e7\u00e3o */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}>
                  {getAcaoIcon(log.acao)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{log.usuario_nome}</span>
                    <Badge variant="secondary" style={{ fontSize: '0.7rem' }}>{log.usuario_role}</Badge>
                    <span style={{ color: 'var(--text-muted)' }}>\u2022</span>
                    <span>{getAcaoLabel(log.acao)}</span>
                    <span style={{ color: 'var(--text-muted)' }}>em</span>
                    <span style={{ textTransform: 'capitalize' }}>{log.modulo}</span>
                    {log.entidade_id && (
                      <span style={{ color: 'var(--text-muted)' }}>#{log.entidade_id}</span>
                    )}
                  </div>
                  {log.ip_address && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      IP: {log.ip_address}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  {formatDateTime(log.created_at)}
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

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '12px',
      background: `${color}10`,
      border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
