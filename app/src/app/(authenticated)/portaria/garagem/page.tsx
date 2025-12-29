"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import {
  ParkingSquare, Car, RefreshCw, Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Modal } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface VagaGaragem {
  id: number;
  numero: string;
  tipo: 'carro' | 'moto' | 'pcd' | 'idoso' | 'visitante';
  status: 'livre' | 'ocupada' | 'reservada' | 'manutencao';
  posicao_x: number;
  posicao_y: number;
  largura: number;
  altura: number;
  andar: string;
  bloco?: string;
  veiculo_placa?: string;
  veiculo_modelo?: string;
  proprietario_nome?: string;
  unidade_nome?: string;
  entrada_em?: string;
}

interface GaragemConfig {
  largura: number;
  altura: number;
  andares: string[];
}

export default function GaragemPage() {
  const { currentTenant } = useTenant();
  const [vagas, setVagas] = useState<VagaGaragem[]>([]);
  const [loading, setLoading] = useState(true);
  const [andarAtual, setAndarAtual] = useState('Subsolo 1');
  const [selectedVaga, setSelectedVaga] = useState<VagaGaragem | null>(null);
  const [config] = useState<GaragemConfig>({
    largura: 800,
    altura: 500,
    andares: ['Subsolo 1', 'Subsolo 2', 'Térreo'],
  });

  const fetchVagas = async () => {
    setLoading(true);
    try {
      const tenantId = currentTenant?.tenant_id || 1;
      const res = await fetch(`${API_BASE}/portaria/garagem/mapa?tenant_id=${tenantId}&andar=${andarAtual}`);
      if (res.ok) {
        const data = await res.json();
        setVagas(data.vagas || []);
      }
    } catch (e) {
      console.error('Erro ao carregar mapa da garagem:', e);
      setVagas([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVagas();
    const interval = setInterval(fetchVagas, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, andarAtual]);

  const stats = {
    total: vagas.length,
    livres: vagas.filter(v => v.status === 'livre').length,
    ocupadas: vagas.filter(v => v.status === 'ocupada').length,
    reservadas: vagas.filter(v => v.status === 'reservada').length,
    manutencao: vagas.filter(v => v.status === 'manutencao').length,
  };

  const getVagaColor = (vaga: VagaGaragem) => {
    const colors = {
      livre: '#22c55e',
      ocupada: '#ef4444',
      reservada: '#f59e0b',
      manutencao: '#6b7280',
    };
    return colors[vaga.status];
  };

  const getVagaTypeIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      carro: '🚗',
      moto: '🏍️',
      pcd: '♿',
      idoso: '👴',
      visitante: '👥',
    };
    return icons[tipo] || '🚗';
  };

  if (loading && vagas.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Stats e Controles */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Ocupação Geral */}
        <Card style={{ flex: '1', minWidth: '250px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: `conic-gradient(#ef4444 0% ${(stats.ocupadas / stats.total) * 100}%, #22c55e ${(stats.ocupadas / stats.total) * 100}% 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--bg-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Math.round((stats.ocupadas / stats.total) * 100)}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ocupação</div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{stats.livres}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Livres</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{stats.ocupadas}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ocupadas</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Seletor de Andar */}
        <Card style={{ minWidth: '200px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Andar</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {config.andares.map((andar) => (
              <button
                key={andar}
                onClick={() => setAndarAtual(andar)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: andarAtual === andar ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color: andarAtual === andar ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: andarAtual === andar ? 600 : 400,
                }}
              >
                {andar}
              </button>
            ))}
          </div>
        </Card>

        {/* Legenda */}
        <Card style={{ minWidth: '200px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Legenda</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <LegendItem color="#22c55e" label="Livre" />
            <LegendItem color="#ef4444" label="Ocupada" />
            <LegendItem color="#f59e0b" label="Reservada" />
            <LegendItem color="#6b7280" label="Manutenção" />
          </div>
        </Card>
      </div>

      {/* Mapa Visual */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ParkingSquare size={20} style={{ color: 'var(--accent)' }} /> Mapa da Garagem - {andarAtual}
          </CardTitle>
          <Button variant="secondary" onClick={fetchVagas}>
            <RefreshCw size={16} /> Atualizar
          </Button>
        </CardHeader>

        <div style={{
          position: 'relative',
          width: '100%',
          height: '500px',
          background: 'var(--bg-tertiary)',
          borderRadius: '12px',
          overflow: 'auto',
        }}>
          {/* Corredores/Ruas */}
          <div style={{
            position: 'absolute',
            left: '40px',
            right: '100px',
            top: '160px',
            height: '180px',
            background: '#374151',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '90%',
              borderTop: '2px dashed #9ca3af',
            }} />
          </div>

          {/* Vagas */}
          {vagas.map((vaga) => (
            <button
              key={vaga.id}
              onClick={() => setSelectedVaga(vaga)}
              style={{
                position: 'absolute',
                left: vaga.posicao_x,
                top: vaga.posicao_y,
                width: vaga.largura,
                height: vaga.altura,
                background: `${getVagaColor(vaga)}${vaga.status === 'livre' ? '40' : '80'}`,
                border: selectedVaga?.id === vaga.id ? '3px solid var(--accent)' : `2px solid ${getVagaColor(vaga)}`,
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease',
                fontSize: '0.7rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.zIndex = '10';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.zIndex = '1';
              }}
            >
              <span style={{ fontSize: '1rem' }}>{getVagaTypeIcon(vaga.tipo)}</span>
              <span style={{ fontWeight: 600, color: vaga.status === 'livre' ? getVagaColor(vaga) : 'white' }}>
                {vaga.numero}
              </span>
              {vaga.status === 'ocupada' && vaga.veiculo_placa && (
                <span style={{ fontSize: '0.6rem', color: 'white', opacity: 0.9 }}>
                  {vaga.veiculo_placa}
                </span>
              )}
            </button>
          ))}

          {/* Entradas/Saídas */}
          <div style={{
            position: 'absolute',
            left: '10px',
            top: '220px',
            padding: '0.5rem',
            background: '#3b82f680',
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 600,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}>
            ENTRADA ↓
          </div>
          <div style={{
            position: 'absolute',
            left: '10px',
            top: '280px',
            padding: '0.5rem',
            background: '#ef444480',
            borderRadius: '4px',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 600,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}>
            SAÍDA ↑
          </div>
        </div>
      </Card>

      {/* Modal Detalhes da Vaga */}
      {selectedVaga && (
        <VagaDetailModal
          vaga={selectedVaga}
          onClose={() => setSelectedVaga(null)}
        />
      )}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <div style={{ width: '12px', height: '12px', background: color, borderRadius: '2px' }} />
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function VagaDetailModal({ vaga, onClose }: { vaga: VagaGaragem; onClose: () => void }) {
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const formatDuration = (dateStr?: string) => {
    if (!dateStr) return '-';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const statusColors = {
    livre: '#22c55e',
    ocupada: '#ef4444',
    reservada: '#f59e0b',
    manutencao: '#6b7280',
  };

  const tipoLabels: Record<string, string> = {
    carro: 'Carro',
    moto: 'Moto',
    pcd: 'PCD',
    idoso: 'Idoso',
    visitante: 'Visitante',
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Vaga ${vaga.numero}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem',
          background: `${statusColors[vaga.status]}20`,
          borderRadius: '8px',
          borderLeft: `4px solid ${statusColors[vaga.status]}`,
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: statusColors[vaga.status], textTransform: 'capitalize' }}>
              {vaga.status}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tipo</div>
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>{tipoLabels[vaga.tipo]}</div>
          </div>
        </div>

        {/* Info da Vaga */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <InfoItem label="Número" value={vaga.numero} />
          <InfoItem label="Andar" value={vaga.andar} />
          {vaga.bloco && <InfoItem label="Bloco" value={vaga.bloco} />}
        </div>

        {/* Veículo (se ocupada) */}
        {vaga.status === 'ocupada' && vaga.veiculo_placa && (
          <div style={{
            padding: '1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent)' }}>
              <Car size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Veículo Estacionado
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <InfoItem label="Placa" value={vaga.veiculo_placa} />
              <InfoItem label="Modelo" value={vaga.veiculo_modelo || '-'} />
              <InfoItem label="Proprietário" value={vaga.proprietario_nome || '-'} />
              <InfoItem label="Unidade" value={vaga.unidade_nome || '-'} />
            </div>
            {vaga.entrada_em && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entrada</div>
                    <div style={{ fontSize: '0.9rem' }}>{formatTime(vaga.entrada_em)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tempo</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#22c55e' }}>
                      <Clock size={14} style={{ verticalAlign: 'middle' }} /> {formatDuration(vaga.entrada_em)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
            Fechar
          </Button>
          {vaga.status === 'livre' && (
            <Button style={{ flex: 1 }}>
              Reservar
            </Button>
          )}
          {vaga.status === 'ocupada' && (
            <Button variant="danger" style={{ flex: 1 }}>
              Liberar Vaga
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{value}</div>
    </div>
  );
}
