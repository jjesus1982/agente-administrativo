'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Filter,
  Download,
  Search,
  Eye,
  BarChart3,
  PieChart,
  LineChart,
  FileText,
  Calculator,
  Wallet,
  Receipt,
  Target,
  Activity,
  Users,
  Building,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Tipos TypeScript
interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  unit?: string;
  dueDate?: string;
  paymentMethod?: string;
}

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  pendingReceivables: number;
  overduePayments: number;
  monthlyGrowth: number;
  cashFlow: number;
  reserves: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  change: number;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

const Financeiro = () => {
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    pendingReceivables: 0,
    overduePayments: 0,
    monthlyGrowth: 0,
    cashFlow: 0,
    reserves: 0
  });
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data initialization
  useEffect(() => {
    const mockTransactions: FinancialTransaction[] = [
      {
        id: 'trans-001',
        type: 'income',
        category: 'Taxa de Condomínio',
        description: 'Taxa de condomínio - Janeiro 2025',
        amount: 85000.00,
        date: '2025-01-03',
        status: 'paid',
        paymentMethod: 'PIX'
      },
      {
        id: 'trans-002',
        type: 'expense',
        category: 'Manutenção',
        description: 'Manutenção elevadores - Contrato mensal',
        amount: 3500.00,
        date: '2025-01-03',
        status: 'paid',
        paymentMethod: 'Transferência'
      },
      {
        id: 'trans-003',
        type: 'income',
        category: 'Multas',
        description: 'Multa por uso indevido da área comum',
        amount: 200.00,
        date: '2025-01-02',
        status: 'pending',
        unit: 'Apt 1205',
        dueDate: '2025-01-10'
      },
      {
        id: 'trans-004',
        type: 'expense',
        category: 'Utilidades',
        description: 'Conta de energia elétrica - Áreas comuns',
        amount: 4200.00,
        date: '2025-01-02',
        status: 'overdue',
        dueDate: '2024-12-30'
      },
      {
        id: 'trans-005',
        type: 'income',
        category: 'Aluguel de Salão',
        description: 'Aluguel salão de festas - Festa de aniversário',
        amount: 800.00,
        date: '2025-01-01',
        status: 'paid',
        unit: 'Apt 0304',
        paymentMethod: 'Dinheiro'
      },
      {
        id: 'trans-006',
        type: 'expense',
        category: 'Limpeza',
        description: 'Produtos de limpeza e higiene',
        amount: 1200.00,
        date: '2025-01-01',
        status: 'paid',
        paymentMethod: 'Cartão'
      },
      {
        id: 'trans-007',
        type: 'expense',
        category: 'Segurança',
        description: 'Salário porteiros - Janeiro 2025',
        amount: 8500.00,
        date: '2024-12-31',
        status: 'pending',
        dueDate: '2025-01-05'
      },
      {
        id: 'trans-008',
        type: 'income',
        category: 'Taxa Extra',
        description: 'Taxa extraordinária para pintura externa',
        amount: 15000.00,
        date: '2024-12-30',
        status: 'paid',
        paymentMethod: 'Boleto'
      }
    ];

    const mockSummary: FinancialSummary = {
      totalIncome: 101000.00,
      totalExpenses: 17400.00,
      netBalance: 83600.00,
      pendingReceivables: 8700.00,
      overduePayments: 4200.00,
      monthlyGrowth: 8.5,
      cashFlow: 79400.00,
      reserves: 125000.00
    };

    const mockCategoryBreakdown: CategoryBreakdown[] = [
      { category: 'Taxa de Condomínio', amount: 85000.00, percentage: 84.2, color: 'blue', change: 2.5 },
      { category: 'Taxa Extra', amount: 15000.00, percentage: 14.9, color: 'green', change: -5.0 },
      { category: 'Aluguel de Salão', amount: 800.00, percentage: 0.8, color: 'purple', change: 15.0 },
      { category: 'Multas', amount: 200.00, percentage: 0.2, color: 'red', change: -20.0 }
    ];

    const mockMonthlyData: MonthlyData[] = [
      { month: 'Jul', income: 87000, expenses: 15200, balance: 71800 },
      { month: 'Ago', income: 89500, expenses: 16800, balance: 72700 },
      { month: 'Set', income: 92000, expenses: 14500, balance: 77500 },
      { month: 'Out', income: 88000, expenses: 18200, balance: 69800 },
      { month: 'Nov', income: 94500, expenses: 16000, balance: 78500 },
      { month: 'Dez', income: 96000, expenses: 17400, balance: 78600 },
      { month: 'Jan', income: 101000, expenses: 17400, balance: 83600 }
    ];

    setTransactions(mockTransactions);
    setSummary(mockSummary);
    setCategoryBreakdown(mockCategoryBreakdown);
    setMonthlyData(mockMonthlyData);
  }, []);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'overdue': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'cancelled': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    const matchesType = transactionFilter === 'all' || transaction.type === transactionFilter;
    const matchesSearch = searchTerm === '' ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              Gestão Financeira
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Controle financeiro e análises do condomínio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Mês Atual</SelectItem>
                <SelectItem value="last-month">Mês Anterior</SelectItem>
                <SelectItem value="quarter">Último Trimestre</SelectItem>
                <SelectItem value="year">Ano Atual</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>

            <Button size="sm">
              <Calculator className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          </div>
        </motion.div>

        {/* Financial Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalIncome)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+{summary.monthlyGrowth}%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Despesas Totais</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.totalExpenses)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-600">-2.3%</span>
                  </div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Saldo Líquido</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.netBalance)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">Fluxo positivo</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reservas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(summary.reserves)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Target className="w-3 h-3 text-purple-500" />
                    <span className="text-xs text-purple-600">Meta: 150k</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <PiggyBank className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Trend Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Evolução Financeira Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyData.map((data, index) => (
                    <div key={data.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{data.month}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-green-600">↑ {formatCurrency(data.income)}</span>
                          <span className="text-red-600">↓ {formatCurrency(data.expenses)}</span>
                          <span className="font-semibold">{formatCurrency(data.balance)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-1 h-2">
                        {/* Income bar */}
                        <div className="col-span-6 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${(data.income / Math.max(...monthlyData.map(d => d.income))) * 100}%`
                            }}
                          />
                        </div>
                        {/* Expense bar */}
                        <div className="col-span-6 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{
                              width: `${(data.expenses / Math.max(...monthlyData.map(d => d.expenses))) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Receitas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryBreakdown.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{category.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{category.percentage}%</span>
                        <span className={`text-xs ${category.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {category.change >= 0 ? '+' : ''}{category.change}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Progress value={category.percentage} className="h-2" />
                      <div className="text-xs text-gray-600">{formatCurrency(category.amount)}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Transactions and Pending Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <Tabs defaultValue="transactions" className="w-full">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                  <TabsList className="grid w-full lg:w-auto grid-cols-3">
                    <TabsTrigger value="transactions">Transações</TabsTrigger>
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="analytics">Análises</TabsTrigger>
                  </TabsList>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Buscar transações..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                    />

                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="Taxa de Condomínio">Taxa de Condomínio</SelectItem>
                        <SelectItem value="Manutenção">Manutenção</SelectItem>
                        <SelectItem value="Utilidades">Utilidades</SelectItem>
                        <SelectItem value="Segurança">Segurança</SelectItem>
                        <SelectItem value="Limpeza">Limpeza</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TabsContent value="transactions" className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredTransactions.map((transaction) => (
                    <motion.div
                      key={transaction.id}
                      layout
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-full ${transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                            {transaction.type === 'income' ?
                              <TrendingUp className="w-4 h-4 text-green-600" /> :
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            }
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                {transaction.description}
                              </h4>
                              <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                                {getStatusIcon(transaction.status)}
                                {transaction.status === 'paid' ? 'Pago' :
                                 transaction.status === 'pending' ? 'Pendente' :
                                 transaction.status === 'overdue' ? 'Vencido' : 'Cancelado'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <div>Categoria: {transaction.category}</div>
                              <div>Data: {new Date(transaction.date).toLocaleDateString('pt-BR')}</div>
                              {transaction.unit && (
                                <div>Unidade: {transaction.unit}</div>
                              )}
                              {transaction.paymentMethod && (
                                <div>Método: {transaction.paymentMethod}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          <div className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                          {transaction.dueDate && (
                            <div className="text-xs text-gray-500">
                              Vence: {new Date(transaction.dueDate).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Nenhuma transação encontrada
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-yellow-200 dark:border-yellow-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          Recebimentos Pendentes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600 mb-2">
                          {formatCurrency(summary.pendingReceivables)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          3 transações aguardando pagamento
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 dark:border-red-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          Pagamentos Vencidos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600 mb-2">
                          {formatCurrency(summary.overduePayments)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          1 conta em atraso - atenção necessária
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Taxa de Inadimplência</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">2.3%</div>
                        <Progress value={2.3} className="h-2 mb-2" />
                        <p className="text-xs text-gray-600">Meta: < 5%</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Fluxo de Caixa</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          {formatCurrency(summary.cashFlow)}
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-green-600">Positivo</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Provisão de Reservas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600 mb-2">83%</div>
                        <Progress value={83} className="h-2 mb-2" />
                        <p className="text-xs text-gray-600">Meta: 100% (150k)</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Financeiro;