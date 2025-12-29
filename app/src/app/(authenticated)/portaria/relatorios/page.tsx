"use client";
import React, { useState } from 'react';
import {
  BarChart3, Download, Calendar, Users, Car, DoorOpen,
  Clock, TrendingUp, FileText, Filter
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';

interface Relatorio {
  id: string;
  nome: string;
  descricao: string;
  icone: React.ReactNode;
  cor: string;
  categoria: string;
}

const relatoriosDisponiveis: Relatorio[] = [
  { id: 'acessos-periodo', nome: 'Acessos por Per\u00edodo', descricao: 'Relat\u00f3rio detalhado de entradas e sa\u00eddas', icone: <DoorOpen size={24} />, cor: '#3b82f6', categoria: 'Acessos' },
  { id: 'acessos-ponto', nome: 'Acessos por Ponto', descricao: 'An\u00e1lise de fluxo por ponto de acesso', icone: <BarChart3 size={24} />, cor: '#22c55e', categoria: 'Acessos' },
  { id: 'visitantes-frequentes', nome: 'Visitantes Frequentes', descricao: 'Ranking dos visitantes mais frequentes', icone: <Users size={24} />, cor: '#8b5cf6', categoria: 'Visitantes' },
  { id: 'visitantes-bloqueados', nome: 'Visitantes Bloqueados', descricao: 'Lista de visitantes com restri\u00e7\u00e3o de acesso', icone: <Users size={24} />, cor: '#ef4444', categoria: 'Visitantes' },
  { id: 'veiculos-cadastrados', nome: 'Ve\u00edculos Cadastrados', descricao: 'Listagem completa de ve\u00edculos', icone: <Car size={24} />, cor: '#f59e0b', categoria: 'Ve\u00edculos' },
  { id: 'ocupacao-garagem', nome: 'Ocupa\u00e7\u00e3o da Garagem', descricao: 'An\u00e1lise de utiliza\u00e7\u00e3o das vagas', icone: <TrendingUp size={24} />, cor: '#06b6d4', categoria: 'Ve\u00edculos' },
  { id: 'pre-autorizacoes', nome: 'Pr\u00e9-Autoriza\u00e7\u00f5es', descricao: 'Hist\u00f3rico de QR Codes gerados', icone: <FileText size={24} />, cor: '#ec4899', categoria: 'Autoriza\u00e7\u00f5es' },
  { id: 'tempo-permanencia', nome: 'Tempo de Perman\u00eancia', descricao: 'An\u00e1lise do tempo m\u00e9dio de visitas', icone: <Clock size={24} />, cor: '#14b8a6', categoria: 'Estat\u00edsticas' },
];

export default function RelatoriosPage() {
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const categorias = ['todas', ...new Set(relatoriosDisponiveis.map(r => r.categoria))];

  const filteredRelatorios = relatoriosDisponiveis.filter(r => {
    const matchSearch = r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.descricao.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = categoria === 'todas' || r.categoria === categoria;
    return matchSearch && matchCategoria;
  });

  const handleGerarRelatorio = (relatorio: Relatorio) => {
    alert(`Gerando relat\u00f3rio: ${relatorio.nome}\nPer\u00edodo: ${dataInicio || 'In\u00edcio'} a ${dataFim || 'Hoje'}`);
  };

  return (
    <div>
      {/* Filtros */}
      <Card style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <Input
              placeholder="Buscar relat\u00f3rio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          >
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat === 'todas' ? 'Todas Categorias' : cat}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Per\u00edodo */}
      <Card style={{ marginBottom: '1rem' }}>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--accent)' }} /> Per\u00edodo do Relat\u00f3rio
          </CardTitle>
        </CardHeader>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Data In\u00edcio</label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Data Fim</label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            <Button
              variant="secondary"
              onClick={() => {
                const hoje = new Date();
                const hojeStr = hoje.toISOString().split('T')[0] || '';
                setDataInicio(hojeStr);
                setDataFim(hojeStr);
              }}
            >
              Hoje
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const hoje = new Date();
                const semanaAtras = new Date(hoje.getTime() - 7 * 86400000);
                setDataInicio(semanaAtras.toISOString().split('T')[0] || '');
                setDataFim(hoje.toISOString().split('T')[0] || '');
              }}
            >
              \u00daltimos 7 dias
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const hoje = new Date();
                const mesAtras = new Date(hoje.getTime() - 30 * 86400000);
                setDataInicio(mesAtras.toISOString().split('T')[0] || '');
                setDataFim(hoje.toISOString().split('T')[0] || '');
              }}
            >
              \u00daltimos 30 dias
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de Relat\u00f3rios */}
      <Card>
        <CardHeader>
          <CardTitle style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--accent)' }} /> Relat\u00f3rios Dispon\u00edveis
          </CardTitle>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {filteredRelatorios.length} relat\u00f3rio(s)
          </span>
        </CardHeader>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {filteredRelatorios.map((relatorio) => (
            <div
              key={relatorio.id}
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                transition: 'all 150ms',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = relatorio.cor;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `${relatorio.cor}20`,
                  color: relatorio.cor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {relatorio.icone}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
                    {relatorio.nome}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {relatorio.descricao}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      background: `${relatorio.cor}15`,
                      color: relatorio.cor,
                    }}>
                      {relatorio.categoria}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <Button
                  variant="secondary"
                  style={{ flex: 1 }}
                  onClick={() => handleGerarRelatorio(relatorio)}
                >
                  <FileText size={16} /> Visualizar
                </Button>
                <Button
                  style={{ flex: 1 }}
                  onClick={() => handleGerarRelatorio(relatorio)}
                >
                  <Download size={16} /> Exportar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
