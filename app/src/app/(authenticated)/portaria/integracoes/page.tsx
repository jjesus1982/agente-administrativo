"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  Plug, Plus, Settings, RefreshCw, Wifi, WifiOff,
  Clock, AlertTriangle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Modal } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface Integracao {
  id: number;
  nome: string;
  tipo: 'controle_acesso' | 'camera' | 'alarme' | 'interfone' | 'automacao';
  parceiro: string;
  logo_url?: string;
  status: 'conectado' | 'desconectado' | 'erro' | 'configurando';
  ultima_sincronizacao?: string;
  dispositivos_sincronizados: number;
  configuracao: Record<string, unknown>;
  ativo: boolean;
}

const parceirosDisponiveis = [
  { nome: 'Control iD', tipo: 'controle_acesso', logo: 'https://controlid.com.br/logo.png' },
  { nome: 'Linear HCS', tipo: 'controle_acesso', logo: '' },
  { nome: 'Intelbras', tipo: 'controle_acesso', logo: '' },
  { nome: 'Hikvision', tipo: 'camera', logo: '' },
  { nome: 'Dahua', tipo: 'camera', logo: '' },
  { nome: 'Nice', tipo: 'automacao', logo: '' },
  { nome: 'PPA', tipo: 'automacao', logo: '' },
];

export default function IntegracoesPage() {
  const { currentTenant } = useTenant();
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchIntegracoes = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/portaria/integracoes?tenant_id=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setIntegracoes(data.items || data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar integrações:', e);
      setIntegracoes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIntegracoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant]);

  const handleSincronizar = async (integracao: Integracao) => {
    alert(`Sincronizando ${integracao.nome}...`);
  };

  const stats = {
    total: integracoes.length,
    conectados: integracoes.filter(i => i.status === 'conectado').length,
    erros: integracoes.filter(i => i.status === 'erro').length,
    dispositivos: integracoes.reduce((acc, i) => acc + i.dispositivos_sincronizados, 0),
  };

  if (loading && integracoes.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <StatCard label="Integra\u00e7\u00f5es" value={stats.total} color="#3b82f6" icon={<Plug size={20} />} />
        <StatCard label="Conectadas" value={stats.conectados} color="#22c55e" icon={<Wifi size={20} />} />
        <StatCard label="Com Erro" value={stats.erros} color="#ef4444" icon={<AlertTriangle size={20} />} />
        <StatCard label="Dispositivos" value={stats.dispositivos} color="#8b5cf6" icon={<Settings size={20} />} />
      </div>

      {/* Lista de Integra\u00e7\u00f5es */}
      <Card style={{ marginBottom: '1rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plug size={20} style={{ color: 'var(--accent)' }} /> Integra\u00e7\u00f5es Configuradas
          </CardTitle>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nova Integra\u00e7\u00e3o
          </Button>
        </CardHeader>

        {integracoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Plug size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhuma integra\u00e7\u00e3o configurada</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {integracoes.map((integracao) => (
              <IntegracaoCard
                key={integracao.id}
                integracao={integracao}
                onSincronizar={() => handleSincronizar(integracao)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Parceiros Dispon\u00edveis */}
      <Card>
        <CardHeader>
          <CardTitle>Parceiros Dispon\u00edveis</CardTitle>
        </CardHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {parceirosDisponiveis.map((parceiro) => (
            <div
              key={parceiro.nome}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'var(--bg-tertiary)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 150ms',
                border: '1px solid var(--border-default)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                margin: '0 auto 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Plug size={24} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{parceiro.nome}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {parceiro.tipo.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal Nova Integra\u00e7\u00e3o */}
      {showModal && (
        <Modal isOpen={true} onClose={() => setShowModal(false)} title="Nova Integração">
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <Plug size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Funcionalidade em desenvolvimento</p>
            <p style={{ fontSize: '0.85rem' }}>Selecione um parceiro acima para configurar</p>
          </div>
        </Modal>
      )}

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

function IntegracaoCard({ integracao, onSincronizar }: { integracao: Integracao; onSincronizar: () => void }) {
  const statusConfig = {
    conectado: { color: '#22c55e', icon: <Wifi size={16} />, label: 'Conectado' },
    desconectado: { color: '#6b7280', icon: <WifiOff size={16} />, label: 'Desconectado' },
    erro: { color: '#ef4444', icon: <AlertTriangle size={16} />, label: 'Erro' },
    configurando: { color: '#f59e0b', icon: <Settings size={16} />, label: 'Configurando' },
  };

  const tipoLabels: Record<string, string> = {
    controle_acesso: 'Controle de Acesso',
    camera: 'CFTV/Câmeras',
    alarme: 'Alarme',
    interfone: 'Interfone',
    automacao: 'Automa\u00e7\u00e3o',
  };

  const cfg = statusConfig[integracao.status];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      borderRadius: '12px',
      background: 'var(--bg-tertiary)',
      borderLeft: `4px solid ${cfg.color}`,
      opacity: integracao.ativo ? 1 : 0.6,
    }}>
      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Plug size={24} style={{ color: cfg.color }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{integracao.nome}</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.125rem 0.5rem',
            borderRadius: '4px',
            background: `${cfg.color}20`,
            color: cfg.color,
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            {cfg.icon} {cfg.label}
          </span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {integracao.parceiro} \u2022 {tipoLabels[integracao.tipo]}
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
          <span>
            <strong>{integracao.dispositivos_sincronizados}</strong> dispositivos
          </span>
          {integracao.ultima_sincronizacao && (
            <span style={{ color: 'var(--text-muted)' }}>
              <Clock size={12} style={{ verticalAlign: 'middle' }} /> Sincronizado {new Date(integracao.ultima_sincronizacao).toLocaleString('pt-BR')}
            </span>
          )}
        </div>
      </div>

      {/* A\u00e7\u00f5es */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          variant="secondary"
          onClick={onSincronizar}
          disabled={integracao.status !== 'conectado'}
        >
          <RefreshCw size={16} /> Sincronizar
        </Button>
        <Button variant="secondary">
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
}
