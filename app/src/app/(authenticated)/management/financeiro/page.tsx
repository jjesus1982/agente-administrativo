"use client";

import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  Brain, Target, Upload, Download, Building2, Plus,
  FileText, Calendar, PieChart, CreditCard, RefreshCw,
  Eye, Check, Mail, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// 📊 MODELO DE DADOS
interface FinanceiroPageData {
  metrics: {
    receitas: { valor: number; meta: number; percentual: number; };
    despesas: { valor: number; economia: number; };
    inadimplencia: { valor: number; percentual: number; unidades: number; };
    saldo: { valor: number; periodo: string; };
  };
  boletos: {
    total: number; pagos: number; pendentes: number; vencidos: number;
  };
  listaBoletos: Boleto[];
  pagination: {
    currentPage: number; totalPages: number; itemsPerPage: number;
  };
}

interface Boleto {
  id: string;
  unidade: string;
  morador: string;
  competencia: string;
  vencimento: Date;
  diasRestantes: number;
  valor: number;
  status: "Pendente" | "Pago" | "Vencido";
}

// 📊 CONFIGURAÇÕES DOS GRÁFICOS
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          family: 'Inter',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      padding: 12
    }
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const
  },
  scales: {
    x: {
      grid: {
        display: false,
        color: 'rgba(148, 163, 184, 0.1)'
      },
      ticks: {
        font: {
          family: 'Inter',
          size: 11
        },
        color: '#64748b'
      }
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)'
      },
      ticks: {
        font: {
          family: 'Inter',
          size: 11
        },
        color: '#64748b'
      }
    }
  }
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          family: 'Inter',
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      titleColor: '#f8fafc',
      bodyColor: '#e2e8f0',
      borderColor: '#334155',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      padding: 12
    }
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart' as const
  },
  cutout: '60%'
};

// 🎨 COMPONENTES REUTILIZÁVEIS
const Button = ({
  children,
  variant = "default",
  size = "default",
  disabled = false,
  onClick,
  className = ""
}: {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "ai";
  size?: "default" | "sm";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) => {
  const baseClasses = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-[1.02] hover:shadow-md";

  const variants = {
    default: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-gray-200/50",
    primary: "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30 hover:shadow-lg",
    secondary: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-400 hover:shadow-gray-200/50",
    ai: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 hover:shadow-purple-200/50"
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 py-1"
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const Card = ({
  children,
  className = "",
  variant = "default",
  interactive = true
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "flat" | "outlined";
  interactive?: boolean;
}) => {
  const variants = {
    default: "rounded-xl border border-gray-200/60 bg-white shadow-sm",
    elevated: "rounded-xl bg-white shadow-lg shadow-gray-200/40 border border-gray-100/50",
    flat: "rounded-xl bg-white border border-gray-200/40",
    outlined: "rounded-xl bg-white border-2 border-gray-200/80 shadow-none"
  };

  const interactiveClasses = interactive
    ? "hover:shadow-2xl hover:shadow-gray-200/30 hover:border-gray-300/60 hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer hover:-translate-y-1"
    : "";

  return (
    <div className={`${variants[variant]} ${interactiveClasses} ${className}`}>
      {children}
    </div>
  );
};

const Skeleton = ({ className = "" }: { className?: string; }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded ${className}`} />
);

const MetricCardSkeleton = () => (
  <Card variant="elevated">
    <div className="p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-9 w-28 mt-2" />
      <div className="flex items-center gap-1 mt-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  </Card>
);

const QuickActionSkeleton = () => (
  <div className="h-20 rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="h-full flex flex-col items-center justify-center gap-2 p-4">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <Card variant="flat">
    <div className="p-4 text-center">
      <Skeleton className="h-8 w-12 mx-auto mb-2" />
      <Skeleton className="h-4 w-20 mx-auto" />
    </div>
  </Card>
);

const TableRowSkeleton = () => (
  <tr className="border-b border-gray-100">
    <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
    <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
    <td className="py-3 px-4">
      <div>
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
    </td>
    <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
    <td className="py-3 px-4 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
    <td className="py-3 px-4">
      <div className="flex items-center justify-end gap-1">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </td>
  </tr>
);

const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "pending" | "paid" | "overdue"; }) => {
  const variants = {
    default: "bg-gray-50 text-gray-700",
    pending: "bg-yellow-50 text-yellow-700",
    paid: "bg-green-50 text-green-700",
    overdue: "bg-red-50 text-red-700"
  };

  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default function FinanceiroPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Evita problemas de hidratação
  useEffect(() => {
    setIsClient(true);
    // Simula carregamento de dados
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 📊 DADOS MOCK (seguindo especificações do prompt)
  const financeData: FinanceiroPageData = {
    metrics: {
      receitas: { valor: 85000, meta: 100000, percentual: 85 },
      despesas: { valor: 0, economia: 0 },
      inadimplencia: { valor: 12750, percentual: 15, unidades: 15 },
      saldo: { valor: 72250, periodo: "dezembro/2025" }
    },
    boletos: { total: 100, pagos: 85, pendentes: 0, vencidos: 15 },
    listaBoletos: [
      {
        id: "1",
        unidade: "B 106",
        morador: "Proprietário",
        competencia: "12/2025",
        vencimento: new Date("2025-12-14"),
        diasRestantes: 16,
        valor: 850,
        status: "Pendente"
      },
      // Mais dados mock com valores estáticos
      ...Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 2}`,
        unidade: `A ${100 + i}`,
        morador: i % 3 === 0 ? "Proprietário" : "Inquilino",
        competencia: "12/2025",
        vencimento: new Date("2025-12-10"),
        diasRestantes: i % 4 === 0 ? 12 : i % 4 === 1 ? 8 : i % 4 === 2 ? -3 : -7,
        valor: 850 + (i * 50),
        status: i % 3 === 0 ? "Pago" : i % 3 === 1 ? "Pendente" : "Vencido"
      }))
    ],
    pagination: { currentPage: 1, totalPages: 10, itemsPerPage: 10 }
  };

  // 💰 FORMATAÇÃO DE VALORES
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR');
  };

  // 🧠 HANDLERS DE IA
  const handleIAScore = () => {
    console.log("IA Score clicked");
    // Implementar chamada para API de IA Score
  };

  const handlePrevisoes = () => {
    console.log("Previsões clicked");
    // Implementar chamada para API de Previsões
  };

  const handleConciliacao = () => {
    console.log("Conciliação clicked");
    // Implementar upload e conciliação bancária
  };

  // 🔍 FILTROS E BUSCA
  const filteredBoletos = financeData.listaBoletos.filter(boleto => {
    const matchesSearch = boleto.unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         boleto.morador.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "Todos" || boleto.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 📊 DADOS DOS GRÁFICOS
  const revenueProgressData = {
    labels: ['Arrecadado', 'Meta Restante'],
    datasets: [
      {
        data: [
          financeData.metrics.receitas.valor,
          financeData.metrics.receitas.meta - financeData.metrics.receitas.valor
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(229, 231, 235, 0.5)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(209, 213, 219, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(229, 231, 235, 0.7)'
        ]
      }
    ]
  };

  const monthlyTrendData = {
    labels: ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    datasets: [
      {
        label: 'Receitas',
        data: [78000, 82000, 79000, 85000, 88000, 85000],
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      },
      {
        label: 'Meta',
        data: [100000, 100000, 100000, 100000, 100000, 100000],
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderDash: [5, 5],
        tension: 0.1,
        fill: false,
        borderWidth: 2,
        pointRadius: 0
      }
    ]
  };

  const paymentStatusData = {
    labels: ['Pagos', 'Vencidos', 'Pendentes'],
    datasets: [
      {
        data: [financeData.boletos.pagos, financeData.boletos.vencidos, financeData.boletos.pendentes],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(245, 158, 11, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(34, 197, 94, 0.9)',
          'rgba(239, 68, 68, 0.9)',
          'rgba(245, 158, 11, 0.9)'
        ]
      }
    ]
  };

  const revenueVsExpenseData = {
    labels: ['Receitas', 'Despesas', 'Saldo'],
    datasets: [
      {
        label: 'Valores (R$)',
        data: [
          financeData.metrics.receitas.valor,
          financeData.metrics.despesas.valor,
          financeData.metrics.saldo.valor
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(59, 130, 246, 0.8)'
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(59, 130, 246, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. HEADER DA PÁGINA */}
      <div className="bg-white border-b">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título e Subtítulo */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
              <p className="text-gray-600 mt-1">Gestão financeira do condomínio</p>
            </div>

            {/* Botões do Header */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Botões de IA */}
              <Button variant="ai" onClick={handleIAScore}>
                <Brain className="w-4 h-4" />
                IA Score
              </Button>

              <Button variant="secondary" onClick={handlePrevisoes}>
                <Target className="w-4 h-4" />
                Previsões
              </Button>

              <Button variant="secondary" onClick={handleConciliacao}>
                <Upload className="w-4 h-4" />
                Conciliação
              </Button>

              {/* Separador */}
              <div className="h-6 w-px bg-gray-300" />

              {/* Botões de Ação */}
              <Button variant="secondary">
                <Download className="w-4 h-4" />
                Exportar
              </Button>

              <Button variant="secondary">
                <Building2 className="w-4 h-4" />
                Bancos
              </Button>

              {/* Botão Primário */}
              <Button variant="primary">
                <Plus className="w-4 h-4" />
                Emitir Novo Boleto
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONTEÚDO PRINCIPAL */}
      <div className="p-6">
        {/* CARDS DE MÉTRICAS FINANCEIRAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            // Skeleton loading para métricas
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              {/* Conteúdo real das métricas */}
          {/* Receitas do Mês */}
          <Card variant="elevated">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Receitas do Mês</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold mt-2 text-green-500">
                {formatCurrency(financeData.metrics.receitas.valor)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span className="text-sm text-green-500">
                  {financeData.metrics.receitas.percentual}% da meta
                </span>
              </div>
            </div>
          </Card>

          {/* Despesas do Mês */}
          <Card variant="elevated">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Despesas do Mês</p>
                <TrendingDown className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold mt-2 text-orange-500">
                {formatCurrency(financeData.metrics.despesas.valor)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingDown className="w-3 h-3 text-orange-500" />
                <span className="text-sm text-orange-500">
                  Economia: {formatCurrency(financeData.metrics.despesas.economia)}
                </span>
              </div>
            </div>
          </Card>

          {/* Inadimplência */}
          <Card variant="elevated">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Inadimplência</p>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold mt-2 text-red-500">
                {formatCurrency(financeData.metrics.inadimplencia.valor)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span className="text-sm text-red-500">
                  {financeData.metrics.inadimplencia.percentual}% ({financeData.metrics.inadimplencia.unidades} unidades)
                </span>
              </div>
            </div>
          </Card>

          {/* Saldo do Mês */}
          <Card variant="elevated">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Saldo do Mês</p>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold mt-2 text-blue-500">
                {formatCurrency(financeData.metrics.saldo.valor)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span className="text-sm text-blue-500">
                  {financeData.metrics.saldo.periodo}
                </span>
              </div>
            </div>
          </Card>
            </>
          )}
        </div>

        {/* BOTÕES DE AÇÃO RÁPIDA */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            // Skeleton loading para ações rápidas
            <>
              <QuickActionSkeleton />
              <QuickActionSkeleton />
              <QuickActionSkeleton />
              <QuickActionSkeleton />
              <QuickActionSkeleton />
            </>
          ) : (
            <>
              {/* Conteúdo real das ações */}
          <Button variant="secondary" className="h-20 flex-col">
            <FileText className="w-6 h-6 mb-2" />
            Emitir Boleto
          </Button>

          <Button variant="secondary" className="h-20 flex-col">
            <Calendar className="w-6 h-6 mb-2" />
            Extrato Mensal
          </Button>

          <Button variant="secondary" className="h-20 flex-col">
            <PieChart className="w-6 h-6 mb-2" />
            Rel. Inadimplência
          </Button>

          <Button variant="secondary" className="h-20 flex-col">
            <CreditCard className="w-6 h-6 mb-2" />
            Registrar Pagamento
          </Button>

          <Button variant="secondary" className="h-20 flex-col opacity-50" disabled>
            <RefreshCw className="w-6 h-6 mb-2" />
            Sincronizar Banco
          </Button>
            </>
          )}
        </div>

        {/* DASHBOARD DE GRÁFICOS MODERNOS */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Dashboard Analítico</h2>
            <div className="text-sm text-gray-500">Atualizado em tempo real</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progresso de Receitas */}
            <Card variant="elevated">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Meta de Receitas</h3>
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <Doughnut data={revenueProgressData} options={doughnutOptions} />
                  </div>
                )}
              </div>
            </Card>

            {/* Tendência Mensal */}
            <Card variant="elevated">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Tendência Mensal</h3>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <Line data={monthlyTrendData} options={chartOptions} />
                  </div>
                )}
              </div>
            </Card>

            {/* Status de Pagamentos */}
            <Card variant="elevated">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Status dos Boletos</h3>
                  <PieChart className="w-5 h-5 text-purple-500" />
                </div>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <Pie data={paymentStatusData} options={doughnutOptions} />
                  </div>
                )}
              </div>
            </Card>

            {/* Receitas vs Despesas */}
            <Card variant="elevated">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Receitas vs Despesas</h3>
                  <DollarSign className="w-5 h-5 text-orange-500" />
                </div>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="h-64">
                    <Bar data={revenueVsExpenseData} options={chartOptions} />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ESTATÍSTICAS DE BOLETOS */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            // Skeleton loading para estatísticas
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              {/* Conteúdo real das estatísticas */}
          <Card variant="flat" className="bg-gradient-to-br from-gray-50 to-gray-100/50">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{financeData.boletos.total}</p>
              <p className="text-sm text-gray-600">Total Boletos</p>
            </div>
          </Card>

          <Card variant="flat" className="bg-gradient-to-br from-green-50 to-green-100/50">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{financeData.boletos.pagos}</p>
              <p className="text-sm text-green-600">Pagos</p>
            </div>
          </Card>

          <Card variant="flat" className="bg-gradient-to-br from-yellow-50 to-yellow-100/50">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{financeData.boletos.pendentes}</p>
              <p className="text-sm text-yellow-600">Pendentes</p>
            </div>
          </Card>

          <Card variant="flat" className="bg-gradient-to-br from-red-50 to-red-100/50">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{financeData.boletos.vencidos}</p>
              <p className="text-sm text-red-600">Vencidos</p>
            </div>
          </Card>
            </>
          )}
        </div>

        {/* TABELA DE BOLETOS */}
        <Card variant="outlined">
          <div className="p-6">
            {/* Header da Tabela com Busca e Filtros */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold">Boletos</h3>

              <div className="flex flex-col md:flex-row gap-2">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar unidade ou morador..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Filtro de Status */}
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="Pago">Pago</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              {!isClient ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">Carregando...</div>
                </div>
              ) : (
                <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Unidade</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Morador</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Competência</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vencimento</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Valor</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    // Skeleton loading para tabela
                    <>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </>
                  ) : (
                    filteredBoletos.slice((currentPage - 1) * 10, currentPage * 10).map((boleto) => (
                      <tr key={boleto.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{boleto.unidade}</td>
                        <td className="py-3 px-4 text-gray-600">{boleto.morador}</td>
                        <td className="py-3 px-4 text-gray-600">{boleto.competencia}</td>
                        <td className="py-3 px-4 text-gray-600">
                          <div>
                            {formatDate(boleto.vencimento)}
                            <div className={`text-xs ${boleto.diasRestantes < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                              ({Math.abs(boleto.diasRestantes)} dias{boleto.diasRestantes < 0 ? ' em atraso' : ' restantes'})
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 text-right">
                          {formatCurrency(boleto.valor)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={
                            boleto.status === "Pago" ? "paid" :
                            boleto.status === "Pendente" ? "pending" : "overdue"
                          }>
                            {boleto.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="secondary">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="secondary">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="secondary">
                              <Mail className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="secondary">
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between mt-6">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-48" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Mostrando {((currentPage - 1) * 10) + 1} a {Math.min(currentPage * 10, filteredBoletos.length)} de {filteredBoletos.length} resultados
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <span className="px-3 py-1 text-sm">
                      Página {currentPage} de {financeData.pagination.totalPages}
                    </span>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={currentPage === financeData.pagination.totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}