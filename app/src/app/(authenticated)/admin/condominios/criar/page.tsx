"use client";
import React, { useState } from 'react';
import {
  Building2, Plus, X, Save, ArrowLeft, MapPin, Hash, Mail, Phone,
  Home, Users, Shield, Settings, Flame, Waves, Car, Calendar,
  ChevronDown, ChevronUp, Info, AlertTriangle
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { useRouter } from 'next/navigation';

// Types para o formulário
interface AgrupadorForm {
  tipo: 'bloco' | 'torre' | 'quadra' | 'ala' | 'setor';
  nome: string;
  parent?: string;
  ordem: number;
}

interface AreaComumForm {
  id: string;
  nome: string;
  icone: string;
  descricao?: string;
  capacidade?: number;
  regras?: string;
  horario_inicio: string;
  horario_fim: string;
  dias_semana: number[];
  antecedencia_min_dias: number;
  antecedencia_max_dias: number;
  valor_taxa?: number;
  requer_aprovacao: boolean;
  ativo: boolean;
}

interface TenantForm {
  // Dados básicos
  nome: string;
  cnpj?: string;
  endereco?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep?: string;
  telefone?: string;
  email?: string;

  // Estrutura
  tipo_estrutura: string;
  nomenclatura: {
    unidade: string;
    agrupador1?: string;
    agrupador2?: string;
  };
  agrupadores: AgrupadorForm[];

  // Configurações
  areas_comuns: AreaComumForm[];
  funcionalidades: Record<string, boolean>;
  config_seguranca: {
    exige_aprovacao_cadastro: boolean;
    aprovador: string;
    tempo_expiracao_convite_horas: number;
    max_visitantes_simultaneos: number;
    validacao_facial_obrigatoria: boolean;
    permite_cadastro_autonomo: boolean;
    permite_multiplos_usuarios_unidade: boolean;
    max_usuarios_por_unidade: number;
  };

  // Contrato
  plano: string;
  data_contrato?: string;
  data_expiracao?: string;
}

const tiposEstrutura = [
  { value: 'casas', label: 'Casas', description: 'Condomínio de casas sem agrupadores' },
  { value: 'apartamentos', label: 'Apartamentos', description: 'Apartamentos sem blocos ou torres' },
  { value: 'apartamentos_blocos', label: 'Apartamentos com Blocos', description: 'Apartamentos organizados em blocos' },
  { value: 'apartamentos_torres', label: 'Apartamentos com Torres', description: 'Apartamentos organizados em torres' },
  { value: 'apartamentos_torres_blocos', label: 'Torres e Blocos', description: 'Estrutura complexa com torres e blocos' }
];

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const planosDisponiveis = [
  { value: 'basico', label: 'Básico', description: 'Funcionalidades essenciais' },
  { value: 'profissional', label: 'Profissional', description: 'Recursos avançados' },
  { value: 'enterprise', label: 'Enterprise', description: 'Solução completa' }
];

const funcionalidadesPadrao = {
  convites: { label: 'Convites de Visitantes', default: true },
  entregas: { label: 'Controle de Entregas', default: true },
  reservas: { label: 'Reserva de Áreas', default: true },
  pets: { label: 'Cadastro de Pets', default: true },
  veiculos: { label: 'Controle de Veículos', default: true },
  ocorrencias: { label: 'Ocorrências', default: true },
  comunicados: { label: 'Comunicados', default: true },
  ligacoes: { label: 'Ligações Portaria', default: true },
  classificados: { label: 'Classificados', default: false },
  enquetes: { label: 'Enquetes', default: true },
  financeiro: { label: 'Gestão Financeira', default: false },
  portaria_remota: { label: 'Portaria Remota', default: true },
  reconhecimento_facial: { label: 'Reconhecimento Facial', default: false },
  qr_code: { label: 'QR Code', default: true }
};

const iconesAreas = [
  'building', 'flame', 'waves', 'car', 'utensils', 'gamepad2', 'heart', 'book',
  'dumbbell', 'bike', 'tree-pine', 'sun', 'users', 'calendar', 'camera'
];

export default function CriarCondominioPage() {
  const router = useRouter();
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    estrutura: true,
    areas: false,
    funcionalidades: false,
    seguranca: false
  });

  const [formData, setFormData] = useState<TenantForm>({
    nome: '',
    cidade: '',
    estado: 'AM',
    tipo_estrutura: 'apartamentos',
    nomenclatura: {
      unidade: 'Apartamento',
      agrupador1: 'Bloco'
    },
    agrupadores: [],
    areas_comuns: [],
    funcionalidades: Object.fromEntries(
      Object.entries(funcionalidadesPadrao).map(([key, config]) => [key, config.default])
    ),
    config_seguranca: {
      exige_aprovacao_cadastro: true,
      aprovador: 'sindico',
      tempo_expiracao_convite_horas: 24,
      max_visitantes_simultaneos: 10,
      validacao_facial_obrigatoria: false,
      permite_cadastro_autonomo: true,
      permite_multiplos_usuarios_unidade: true,
      max_usuarios_por_unidade: 5
    },
    plano: 'basico'
  });

  const etapas = [
    { id: 'dados', label: 'Dados Básicos', icon: <Building2 size={16}/> },
    { id: 'estrutura', label: 'Estrutura', icon: <Home size={16}/> },
    { id: 'configuracoes', label: 'Configurações', icon: <Settings size={16}/> },
    { id: 'revisao', label: 'Revisão', icon: <Shield size={16}/> }
  ];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const adicionarAgrupador = () => {
    const novoAgrupador: AgrupadorForm = {
      tipo: formData.tipo_estrutura.includes('bloco') ? 'bloco' : 'torre',
      nome: '',
      ordem: formData.agrupadores.length + 1
    };
    setFormData(prev => ({
      ...prev,
      agrupadores: [...prev.agrupadores, novoAgrupador]
    }));
  };

  const removerAgrupador = (index: number) => {
    setFormData(prev => ({
      ...prev,
      agrupadores: prev.agrupadores.filter((_, i) => i !== index)
    }));
  };

  const atualizarAgrupador = (index: number, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      agrupadores: prev.agrupadores.map((agrupador, i) =>
        i === index ? { ...agrupador, [campo]: valor } : agrupador
      )
    }));
  };

  const adicionarAreaComum = () => {
    const novaArea: AreaComumForm = {
      id: `area_${Date.now()}`,
      nome: '',
      icone: 'building',
      horario_inicio: '08:00',
      horario_fim: '22:00',
      dias_semana: [0,1,2,3,4,5,6],
      antecedencia_min_dias: 0,
      antecedencia_max_dias: 30,
      requer_aprovacao: false,
      ativo: true
    };
    setFormData(prev => ({
      ...prev,
      areas_comuns: [...prev.areas_comuns, novaArea]
    }));
  };

  const removerAreaComum = (index: number) => {
    setFormData(prev => ({
      ...prev,
      areas_comuns: prev.areas_comuns.filter((_, i) => i !== index)
    }));
  };

  const atualizarAreaComum = (index: number, campo: string, valor: any) => {
    setFormData(prev => ({
      ...prev,
      areas_comuns: prev.areas_comuns.map((area, i) =>
        i === index ? { ...area, [campo]: valor } : area
      )
    }));
  };

  const handleSubmit = async () => {
    setSalvando(true);
    try {
      const response = await fetch('/api/v1/admin/condominios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const novoCondominio = await response.json();
        alert('✅ Condomínio criado com sucesso!');
        router.push(`/admin/condominios/${novoCondominio.id}`);
      } else {
        const error = await response.json();
        alert(`❌ Erro: ${error.detail}`);
      }
    } catch (error) {
      alert('❌ Erro ao criar condomínio. Tente novamente.');
      console.error(error);
    }
    setSalvando(false);
  };

  const proximaEtapa = () => {
    if (etapaAtual < etapas.length - 1) {
      setEtapaAtual(etapaAtual + 1);
    }
  };

  const etapaAnterior = () => {
    if (etapaAtual > 0) {
      setEtapaAtual(etapaAtual - 1);
    }
  };

  const podeAvancar = () => {
    switch (etapaAtual) {
      case 0: // Dados básicos
        return formData.nome && formData.cidade && formData.estado;
      case 1: // Estrutura
        return true; // Estrutura é opcional
      case 2: // Configurações
        return true; // Configurações têm defaults
      case 3: // Revisão
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft size={16}/> Voltar
          </Button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Criar Novo Condomínio</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Configure um novo condomínio na plataforma Conecta Plus
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          {etapas.map((etapa, index) => (
            <div key={etapa.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: index <= etapaAtual ? 'var(--accent)' : 'var(--bg-secondary)',
                color: index <= etapaAtual ? 'white' : 'var(--text-muted)',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>
                {etapa.icon}
                {etapa.label}
              </div>
              {index < etapas.length - 1 && (
                <div style={{ width: '2rem', height: '2px', background: 'var(--border-color)' }}/>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Formulário Principal */}
        <div>
          {/* Etapa 0: Dados Básicos */}
          {etapaAtual === 0 && (
            <Card style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20}/> Dados Básicos
              </h2>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Nome do Condomínio *
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Residencial Vista Verde"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      CNPJ
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                      placeholder="00.000.000/0000-00"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      CEP
                    </label>
                    <input
                      type="text"
                      value={formData.cep || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, cep: e.target.value }))}
                      placeholder="00000-000"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.endereco || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                    placeholder="Ex: Rua das Flores, 500"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Bairro
                    </label>
                    <input
                      type="text"
                      value={formData.bairro || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bairro: e.target.value }))}
                      placeholder="Centro"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Cidade *
                    </label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({ ...prev, cidade: e.target.value }))}
                      placeholder="Manaus"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      UF *
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {estadosBrasil.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Telefone
                    </label>
                    <input
                      type="text"
                      value={formData.telefone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="contato@condominio.com"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Etapa 1: Estrutura */}
          {etapaAtual === 1 && (
            <Card style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Home size={20}/> Estrutura do Condomínio
              </h2>

              {/* Tipo de Estrutura */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Tipo de Estrutura *
                </label>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {tiposEstrutura.map(tipo => (
                    <label key={tipo.value} style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '1rem',
                      border: `2px solid ${formData.tipo_estrutura === tipo.value ? 'var(--accent)' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      background: formData.tipo_estrutura === tipo.value ? 'var(--accent)10' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all 150ms'
                    }}>
                      <input
                        type="radio"
                        value={tipo.value}
                        checked={formData.tipo_estrutura === tipo.value}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tipo_estrutura: e.target.value,
                          agrupadores: [] // Reset agrupadores when changing type
                        }))}
                        style={{ marginTop: '0.125rem' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, color: formData.tipo_estrutura === tipo.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {tipo.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {tipo.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Nomenclatura */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                  Nomenclatura Personalizada
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome da Unidade</label>
                    <input
                      type="text"
                      value={formData.nomenclatura.unidade}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        nomenclatura: { ...prev.nomenclatura, unidade: e.target.value }
                      }))}
                      placeholder="Apartamento"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        background: 'var(--bg-secondary)',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  {(formData.tipo_estrutura.includes('bloco') || formData.tipo_estrutura.includes('torre')) && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome do Agrupador</label>
                      <input
                        type="text"
                        value={formData.nomenclatura.agrupador1 || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          nomenclatura: { ...prev.nomenclatura, agrupador1: e.target.value }
                        }))}
                        placeholder={formData.tipo_estrutura.includes('bloco') ? 'Bloco' : 'Torre'}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          background: 'var(--bg-secondary)',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Agrupadores */}
              {(formData.tipo_estrutura.includes('bloco') || formData.tipo_estrutura.includes('torre')) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {formData.tipo_estrutura.includes('bloco') ? 'Blocos' : 'Torres'}
                    </label>
                    <Button variant="ghost" size="sm" onClick={adicionarAgrupador}>
                      <Plus size={14}/> Adicionar
                    </Button>
                  </div>

                  {formData.agrupadores.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '8px'
                    }}>
                      Nenhum agrupador configurado. Clique em "Adicionar" para começar.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {formData.agrupadores.map((agrupador, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.75rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }}>
                          <input
                            type="text"
                            value={agrupador.nome}
                            onChange={(e) => atualizarAgrupador(index, 'nome', e.target.value)}
                            placeholder={`Nome do ${agrupador.tipo}`}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              background: 'var(--bg-primary)',
                              fontSize: '0.875rem'
                            }}
                          />
                          <select
                            value={agrupador.tipo}
                            onChange={(e) => atualizarAgrupador(index, 'tipo', e.target.value)}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              background: 'var(--bg-primary)',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="bloco">Bloco</option>
                            <option value="torre">Torre</option>
                            <option value="quadra">Quadra</option>
                            <option value="ala">Ala</option>
                            <option value="setor">Setor</option>
                          </select>
                          <Button variant="ghost" size="sm" onClick={() => removerAgrupador(index)}>
                            <X size={14}/>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Etapa 2: Configurações */}
          {etapaAtual === 2 && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Áreas Comuns */}
              <Card style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <button
                    onClick={() => toggleSection('areas')}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Waves size={20}/>
                    Áreas Comuns ({formData.areas_comuns.length})
                    {expandedSections.areas ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  {expandedSections.areas && (
                    <Button variant="ghost" size="sm" onClick={adicionarAreaComum}>
                      <Plus size={14}/> Adicionar Área
                    </Button>
                  )}
                </div>

                {expandedSections.areas && (
                  <div>
                    {formData.areas_comuns.length === 0 ? (
                      <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '8px'
                      }}>
                        <Waves size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }}/>
                        <p>Nenhuma área comum configurada.</p>
                        <p style={{ fontSize: '0.875rem' }}>Adicione áreas como piscina, churrasqueira, salão de festas, etc.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {formData.areas_comuns.map((area, index) => (
                          <div key={area.id} style={{
                            padding: '1rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            background: 'var(--bg-secondary)'
                          }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                              <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 150px', gap: '0.75rem' }}>
                                  <input
                                    type="text"
                                    value={area.nome}
                                    onChange={(e) => atualizarAreaComum(index, 'nome', e.target.value)}
                                    placeholder="Nome da área"
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      background: 'var(--bg-primary)',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                  <select
                                    value={area.icone}
                                    onChange={(e) => atualizarAreaComum(index, 'icone', e.target.value)}
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      background: 'var(--bg-primary)',
                                      fontSize: '0.875rem'
                                    }}
                                  >
                                    {iconesAreas.map(icone => (
                                      <option key={icone} value={icone}>{icone}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    value={area.capacidade || ''}
                                    onChange={(e) => atualizarAreaComum(index, 'capacidade', e.target.value ? parseInt(e.target.value) : undefined)}
                                    placeholder="Capacidade"
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      background: 'var(--bg-primary)',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 150px', gap: '0.75rem' }}>
                                  <input
                                    type="time"
                                    value={area.horario_inicio}
                                    onChange={(e) => atualizarAreaComum(index, 'horario_inicio', e.target.value)}
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      background: 'var(--bg-primary)',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                  <input
                                    type="time"
                                    value={area.horario_fim}
                                    onChange={(e) => atualizarAreaComum(index, 'horario_fim', e.target.value)}
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      background: 'var(--bg-primary)',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                  <input
                                    type="number"
                                    value={area.valor_taxa || ''}
                                    onChange={(e) => atualizarAreaComum(index, 'valor_taxa', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    placeholder="Taxa (R$)"
                                    style={{
                                      padding: '0.5rem',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      background: 'var(--bg-primary)',
                                      fontSize: '0.875rem'
                                    }}
                                  />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    <input
                                      type="checkbox"
                                      checked={area.requer_aprovacao}
                                      onChange={(e) => atualizarAreaComum(index, 'requer_aprovacao', e.target.checked)}
                                    />
                                    Requer aprovação
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                                    <input
                                      type="checkbox"
                                      checked={area.ativo}
                                      onChange={(e) => atualizarAreaComum(index, 'ativo', e.target.checked)}
                                    />
                                    Ativo
                                  </label>
                                </div>
                              </div>

                              <Button variant="ghost" size="sm" onClick={() => removerAreaComum(index)}>
                                <X size={14}/>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Funcionalidades */}
              <Card style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <button
                    onClick={() => toggleSection('funcionalidades')}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Settings size={20}/>
                    Funcionalidades do App
                    {expandedSections.funcionalidades ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                </div>

                {expandedSections.funcionalidades && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(funcionalidadesPadrao).map(([key, config]) => (
                      <label key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.funcionalidades[key]}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            funcionalidades: {
                              ...prev.funcionalidades,
                              [key]: e.target.checked
                            }
                          }))}
                        />
                        <span style={{ fontSize: '0.875rem' }}>{config.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </Card>

              {/* Configurações de Segurança */}
              <Card style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <button
                    onClick={() => toggleSection('seguranca')}
                    style={{
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '1.125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <Shield size={20}/>
                    Configurações de Segurança
                    {expandedSections.seguranca ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                </div>

                {expandedSections.seguranca && (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.config_seguranca.permite_cadastro_autonomo}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            config_seguranca: {
                              ...prev.config_seguranca,
                              permite_cadastro_autonomo: e.target.checked
                            }
                          }))}
                        />
                        <span style={{ fontSize: '0.875rem' }}>Permite cadastro público</span>
                      </label>

                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-secondary)',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.config_seguranca.exige_aprovacao_cadastro}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            config_seguranca: {
                              ...prev.config_seguranca,
                              exige_aprovacao_cadastro: e.target.checked
                            }
                          }))}
                        />
                        <span style={{ fontSize: '0.875rem' }}>Exige aprovação para cadastro</span>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Aprovador de cadastros
                        </label>
                        <select
                          value={formData.config_seguranca.aprovador}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            config_seguranca: {
                              ...prev.config_seguranca,
                              aprovador: e.target.value
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.875rem'
                          }}
                        >
                          <option value="sindico">Síndico</option>
                          <option value="porteiro">Porteiro</option>
                          <option value="ambos">Ambos</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Máx. usuários por unidade
                        </label>
                        <input
                          type="number"
                          value={formData.config_seguranca.max_usuarios_por_unidade}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            config_seguranca: {
                              ...prev.config_seguranca,
                              max_usuarios_por_unidade: parseInt(e.target.value)
                            }
                          }))}
                          min="1"
                          max="20"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                          Máx. visitantes simultâneos
                        </label>
                        <input
                          type="number"
                          value={formData.config_seguranca.max_visitantes_simultaneos}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            config_seguranca: {
                              ...prev.config_seguranca,
                              max_visitantes_simultaneos: parseInt(e.target.value)
                            }
                          }))}
                          min="1"
                          max="100"
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Plano e Contrato */}
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20}/> Plano e Contrato
                </h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.75rem' }}>
                      Plano Contratado
                    </label>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {planosDisponiveis.map(plano => (
                        <label key={plano.value} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '1rem',
                          border: `2px solid ${formData.plano === plano.value ? 'var(--accent)' : 'var(--border-color)'}`,
                          borderRadius: '8px',
                          background: formData.plano === plano.value ? 'var(--accent)10' : 'var(--bg-secondary)',
                          cursor: 'pointer',
                          transition: 'all 150ms'
                        }}>
                          <input
                            type="radio"
                            value={plano.value}
                            checked={formData.plano === plano.value}
                            onChange={(e) => setFormData(prev => ({ ...prev, plano: e.target.value }))}
                            style={{ marginTop: '0.125rem' }}
                          />
                          <div>
                            <div style={{ fontWeight: 500, color: formData.plano === plano.value ? 'var(--accent)' : 'var(--text-primary)' }}>
                              {plano.label}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                              {plano.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Data do Contrato
                      </label>
                      <input
                        type="date"
                        value={formData.data_contrato || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_contrato: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Data de Expiração
                      </label>
                      <input
                        type="date"
                        value={formData.data_expiracao || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, data_expiracao: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Etapa 3: Revisão */}
          {etapaAtual === 3 && (
            <Card style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20}/> Revisão Final
              </h2>

              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Resumo Dados Básicos */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Dados Básicos</h3>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Nome</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>{formData.nome || 'Não informado'}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cidade/UF</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>{formData.cidade}, {formData.estado}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CNPJ</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>{formData.cnpj || 'Não informado'}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plano</span>
                        <p style={{ margin: 0, fontWeight: 500 }}>
                          {planosDisponiveis.find(p => p.value === formData.plano)?.label}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo Estrutura */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Estrutura</h3>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      <strong>Tipo:</strong> {tiposEstrutura.find(t => t.value === formData.tipo_estrutura)?.label}
                    </p>
                    <p style={{ margin: '0 0 0.5rem 0' }}>
                      <strong>Nomenclatura:</strong> {formData.nomenclatura.unidade}
                      {formData.nomenclatura.agrupador1 && ` / ${formData.nomenclatura.agrupador1}`}
                    </p>
                    {formData.agrupadores.length > 0 && (
                      <p style={{ margin: 0 }}>
                        <strong>Agrupadores:</strong> {formData.agrupadores.map(a => a.nome || 'Sem nome').join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Resumo Configurações */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Configurações</h3>
                  <div style={{
                    padding: '1rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <p style={{ margin: 0 }}>
                        <strong>Áreas comuns:</strong> {formData.areas_comuns.length} configuradas
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>Funcionalidades ativas:</strong> {Object.values(formData.funcionalidades).filter(Boolean).length} de {Object.keys(formData.funcionalidades).length}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {formData.config_seguranca.permite_cadastro_autonomo && (
                          <Badge variant="success">Cadastro Público</Badge>
                        )}
                        {formData.config_seguranca.exige_aprovacao_cadastro && (
                          <Badge variant="warning">Aprovação Obrigatória</Badge>
                        )}
                        <Badge variant="secondary">
                          Máx. {formData.config_seguranca.max_usuarios_por_unidade} usuários/unidade
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aviso Final */}
                <div style={{
                  padding: '1rem',
                  background: 'var(--accent)10',
                  border: '1px solid var(--accent)30',
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '0.75rem'
                }}>
                  <Info size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.125rem' }}/>
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500, color: 'var(--accent)' }}>
                      Importante
                    </p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      Após a criação, o condomínio será sincronizado com o App Simples automaticamente.
                      Você poderá editar essas configurações posteriormente na área de gestão.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
            <Button
              variant="ghost"
              onClick={etapaAnterior}
              disabled={etapaAtual === 0}
            >
              <ArrowLeft size={16}/> Anterior
            </Button>

            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Etapa {etapaAtual + 1} de {etapas.length}
            </div>

            {etapaAtual === etapas.length - 1 ? (
              <Button onClick={handleSubmit} disabled={salvando || !podeAvancar()}>
                <Save size={16}/> {salvando ? 'Criando...' : 'Criar Condomínio'}
              </Button>
            ) : (
              <Button onClick={proximaEtapa} disabled={!podeAvancar()}>
                Próximo <ChevronDown size={16}/>
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar Preview */}
        <Card style={{ padding: '1rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Preview do Condomínio
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building2 size={20} style={{ color: 'white' }}/>
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>
                {formData.nome || 'Nome do Condomínio'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formData.cidade && formData.estado ? `${formData.cidade}, ${formData.estado}` : 'Cidade, UF'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <strong>Estrutura:</strong> {tiposEstrutura.find(t => t.value === formData.tipo_estrutura)?.label}
          </div>

          {formData.agrupadores.length > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              <strong>Agrupadores:</strong> {formData.agrupadores.map(a => a.nome || 'Sem nome').join(', ')}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Badge variant="secondary">{planosDisponiveis.find(p => p.value === formData.plano)?.label}</Badge>
            {formData.config_seguranca.permite_cadastro_autonomo && (
              <Badge variant="success">Cadastro Público</Badge>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}