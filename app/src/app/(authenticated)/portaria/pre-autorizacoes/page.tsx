"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  QrCode, Plus, Search, RefreshCw, Copy, Share2,
  CheckCircle, XCircle, Eye, Home
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input, Badge, Modal } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface PreAutorizacao {
  id: number;
  codigo: string;
  visitante_nome: string;
  visitante_documento?: string;
  unidade_id: number;
  unidade_nome: string;
  morador_nome: string;
  motivo: string;
  validade_inicio: string;
  validade_fim: string;
  uso_unico: boolean;
  status: 'ativa' | 'utilizada' | 'expirada' | 'cancelada';
  utilizada_em?: string;
  created_at: string;
  qr_code_url?: string;
}

export default function PreAutorizacoesPage() {
  const { currentTenant } = useTenant();
  const [autorizacoes, setAutorizacoes] = useState<PreAutorizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todas' | 'ativa' | 'utilizada' | 'expirada'>('ativa');
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<PreAutorizacao | null>(null);

  const fetchAutorizacoes = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/portaria/pre-autorizacoes?tenant_id=${tenantId}&status=${filterStatus}`);
      if (res.ok) {
        const data = await res.json();
        setAutorizacoes(data.items || data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar pré-autorizações:', e);
      setAutorizacoes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAutorizacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, filterStatus]);

  const filteredAutorizacoes = autorizacoes.filter(a =>
    a.visitante_nome.toLowerCase().includes(search.toLowerCase()) ||
    a.unidade_nome.toLowerCase().includes(search.toLowerCase()) ||
    a.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    ativas: autorizacoes.filter(a => a.status === 'ativa').length,
    utilizadas: autorizacoes.filter(a => a.status === 'utilizada').length,
    expiradas: autorizacoes.filter(a => a.status === 'expirada').length,
  };

  if (loading && autorizacoes.length === 0) {
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
              placeholder="Buscar por nome, unidade ou c\u00f3digo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            <option value="ativa">Ativas</option>
            <option value="utilizada">Utilizadas</option>
            <option value="expirada">Expiradas</option>
            <option value="todas">Todas</option>
          </select>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nova Autoriza\u00e7\u00e3o
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <StatCard label="Ativas" value={stats.ativas} color="#22c55e" icon={<CheckCircle size={18} />} />
        <StatCard label="Utilizadas" value={stats.utilizadas} color="#3b82f6" icon={<Eye size={18} />} />
        <StatCard label="Expiradas" value={stats.expiradas} color="#6b7280" icon={<XCircle size={18} />} />
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={20} style={{ color: 'var(--accent)' }} /> Pr\u00e9-Autoriza\u00e7\u00f5es
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredAutorizacoes.length} registro(s)
          </span>
        </CardHeader>

        {filteredAutorizacoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <QrCode size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhuma pr\u00e9-autoriza\u00e7\u00e3o encontrada</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {filteredAutorizacoes.map((auth) => (
              <AutorizacaoCard
                key={auth.id}
                autorizacao={auth}
                onShowQR={() => setShowQRModal(auth)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Modal Nova Autoriza\u00e7\u00e3o */}
      {showModal && (
        <NovaAutorizacaoModal
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchAutorizacoes();
          }}
        />
      )}

      {/* Modal QR Code */}
      {showQRModal && (
        <QRCodeModal
          autorizacao={showQRModal}
          onClose={() => setShowQRModal(null)}
        />
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

function AutorizacaoCard({ autorizacao, onShowQR }: { autorizacao: PreAutorizacao; onShowQR: () => void }) {
  const statusConfig = {
    ativa: { color: '#22c55e', icon: <CheckCircle size={14} />, label: 'Ativa' },
    utilizada: { color: '#3b82f6', icon: <Eye size={14} />, label: 'Utilizada' },
    expirada: { color: '#6b7280', icon: <XCircle size={14} />, label: 'Expirada' },
    cancelada: { color: '#ef4444', icon: <XCircle size={14} />, label: 'Cancelada' },
  };

  const cfg = statusConfig[autorizacao.status];

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem',
      borderRadius: '12px',
      background: 'var(--bg-tertiary)',
      borderLeft: `4px solid ${cfg.color}`,
    }}>
      {/* QR Icon */}
      <button
        onClick={onShowQR}
        disabled={autorizacao.status !== 'ativa'}
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          border: 'none',
          background: autorizacao.status === 'ativa' ? 'var(--accent)' : 'var(--bg-secondary)',
          color: autorizacao.status === 'ativa' ? 'white' : 'var(--text-muted)',
          cursor: autorizacao.status === 'ativa' ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <QrCode size={28} />
      </button>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{autorizacao.visitante_nome}</span>
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
          {autorizacao.uso_unico && (
            <Badge variant="secondary">Uso \u00fanico</Badge>
          )}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          <Home size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
          {autorizacao.unidade_nome} \u2022 {autorizacao.morador_nome}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {autorizacao.motivo}
        </div>
      </div>

      {/* Validade */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>V\u00e1lido at\u00e9</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
          {formatDateTime(autorizacao.validade_fim)}
        </div>
        {autorizacao.utilizada_em && (
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.25rem' }}>
            Usado: {formatDateTime(autorizacao.utilizada_em)}
          </div>
        )}
      </div>
    </div>
  );
}

function NovaAutorizacaoModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    visitante_nome: '',
    visitante_documento: '',
    unidade_id: 0,
    motivo: '',
    validade_horas: 4,
    uso_unico: true,
  });

  return (
    <Modal isOpen={true} onClose={onClose} title="Nova Pré-Autorização">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Nome do Visitante *</label>
          <Input
            value={formData.visitante_nome}
            onChange={(e) => setFormData({ ...formData, visitante_nome: e.target.value })}
            placeholder="Ex: Jo\u00e3o da Entrega"
          />
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Documento (opcional)</label>
          <Input
            value={formData.visitante_documento}
            onChange={(e) => setFormData({ ...formData, visitante_documento: e.target.value })}
            placeholder="CPF ou RG"
          />
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Unidade de Destino *</label>
          <select
            value={formData.unidade_id}
            onChange={(e) => setFormData({ ...formData, unidade_id: Number(e.target.value) })}
            style={{
              width: '100%',
              padding: '0.625rem',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value={0}>Selecione...</option>
            <option value={101}>Apt 101 - Bloco A (Jos\u00e9 Oliveira)</option>
            <option value={102}>Apt 102 - Bloco A (Maria Santos)</option>
            <option value={201}>Apt 201 - Bloco A (Pedro Almeida)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Motivo *</label>
          <select
            value={formData.motivo}
            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
            style={{
              width: '100%',
              padding: '0.625rem',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">Selecione...</option>
            <option value="Entrega">Entrega</option>
            <option value="Visita">Visita</option>
            <option value="Prestador de servi\u00e7o">Prestador de servi\u00e7o</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>Validade</label>
          <select
            value={formData.validade_horas}
            onChange={(e) => setFormData({ ...formData, validade_horas: Number(e.target.value) })}
            style={{
              width: '100%',
              padding: '0.625rem',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value={1}>1 hora</option>
            <option value={2}>2 horas</option>
            <option value={4}>4 horas</option>
            <option value={8}>8 horas</option>
            <option value={24}>24 horas</option>
            <option value={48}>48 horas</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.uso_unico}
            onChange={(e) => setFormData({ ...formData, uso_unico: e.target.checked })}
          />
          <span style={{ fontSize: '0.9rem' }}>Uso \u00fanico (invalida ap\u00f3s primeira entrada)</span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave}>
            <QrCode size={16} /> Gerar QR Code
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function QRCodeModal({ autorizacao, onClose }: { autorizacao: PreAutorizacao; onClose: () => void }) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(autorizacao.codigo);
    alert('C\u00f3digo copiado!');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Autoriza\u00e7\u00e3o de Acesso',
        text: `Autoriza\u00e7\u00e3o para ${autorizacao.visitante_nome} - C\u00f3digo: ${autorizacao.codigo}`,
      });
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="QR Code de Acesso">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        {/* QR Code Placeholder */}
        <div style={{
          width: '200px',
          height: '200px',
          background: 'white',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-default)',
        }}>
          <QrCode size={160} style={{ color: '#000' }} />
        </div>

        {/* C\u00f3digo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
        }}>
          <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 600 }}>
            {autorizacao.codigo}
          </span>
          <button
            onClick={handleCopyCode}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent)',
            }}
          >
            <Copy size={18} />
          </button>
        </div>

        {/* Info */}
        <div style={{
          width: '100%',
          padding: '1rem',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visitante</div>
              <div style={{ fontWeight: 500 }}>{autorizacao.visitante_nome}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Destino</div>
              <div style={{ fontWeight: 500 }}>{autorizacao.unidade_nome}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Motivo</div>
              <div style={{ fontWeight: 500 }}>{autorizacao.motivo}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>V\u00e1lido at\u00e9</div>
              <div style={{ fontWeight: 500 }}>
                {new Date(autorizacao.validade_fim).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>

        {/* A\u00e7\u00f5es */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Fechar
          </Button>
          <Button onClick={handleShare} style={{ flex: 1 }}>
            <Share2 size={16} /> Compartilhar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
