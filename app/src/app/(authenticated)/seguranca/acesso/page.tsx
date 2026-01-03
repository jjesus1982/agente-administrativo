'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  DoorOpen,
  DoorClosed,
  Users,
  Clock,
  Car,
  Camera,
  Eye,
  UserCheck,
  UserX,
  ChevronRight,
  MoreVertical,
  Filter,
  Download,
  Search,
  Bell,
  Lock,
  Unlock,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Tipos TypeScript
interface Gate {
  id: string;
  name: string;
  location: string;
  status: 'open' | 'closed' | 'maintenance';
  lastActivity: string;
  accessLevel: string;
}

interface VisitorQueue {
  id: string;
  visitorName: string;
  document: string;
  residentUnit: string;
  residentName: string;
  arrivalTime: string;
  status: 'waiting' | 'approved' | 'denied' | 'inside';
  photo?: string;
  vehiclePlate?: string;
}

interface AccessHistory {
  id: string;
  personName: string;
  personType: 'resident' | 'visitor' | 'delivery' | 'service';
  unit?: string;
  action: 'entry' | 'exit';
  gate: string;
  timestamp: string;
  method: 'card' | 'biometry' | 'facial' | 'manual' | 'vehicle';
  photo?: string;
  vehiclePlate?: string;
  status: 'success' | 'denied' | 'forced';
}

interface AccessStats {
  totalAccess: number;
  currentVisitors: number;
  pendingApprovals: number;
  alertsToday: number;
  peakHour: string;
  averageQueueTime: number;
}

const ControleAcesso = () => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [visitorQueue, setVisitorQueue] = useState<VisitorQueue[]>([]);
  const [accessHistory, setAccessHistory] = useState<AccessHistory[]>([]);
  const [stats, setStats] = useState<AccessStats>({
    totalAccess: 0,
    currentVisitors: 0,
    pendingApprovals: 0,
    alertsToday: 0,
    peakHour: '',
    averageQueueTime: 0
  });

  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [queueFilter, setQueueFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data initialization
  useEffect(() => {
    const mockGates: Gate[] = [
      {
        id: 'gate-01',
        name: 'Portão Principal',
        location: 'Entrada Principal - Bloco A',
        status: 'closed',
        lastActivity: '2025-01-03T10:30:00',
        accessLevel: 'high'
      },
      {
        id: 'gate-02',
        name: 'Portão Garagem',
        location: 'Subsolo - Entrada Veículos',
        status: 'open',
        lastActivity: '2025-01-03T10:25:00',
        accessLevel: 'medium'
      },
      {
        id: 'gate-03',
        name: 'Portão Serviço',
        location: 'Área de Serviço - Lateral',
        status: 'closed',
        lastActivity: '2025-01-03T09:45:00',
        accessLevel: 'low'
      },
      {
        id: 'gate-04',
        name: 'Saída Emergência',
        location: 'Saída de Emergência - Bloco B',
        status: 'maintenance',
        lastActivity: '2025-01-03T08:00:00',
        accessLevel: 'high'
      }
    ];

    const mockVisitorQueue: VisitorQueue[] = [
      {
        id: 'visitor-01',
        visitorName: 'João Silva Santos',
        document: '123.456.789-00',
        residentUnit: 'Apt 1205',
        residentName: 'Maria Oliveira',
        arrivalTime: '2025-01-03T10:15:00',
        status: 'waiting',
        vehiclePlate: 'ABC-1234'
      },
      {
        id: 'visitor-02',
        visitorName: 'Ana Costa Lima',
        document: '987.654.321-00',
        residentUnit: 'Apt 0804',
        residentName: 'Carlos Ferreira',
        arrivalTime: '2025-01-03T10:20:00',
        status: 'approved'
      },
      {
        id: 'visitor-03',
        visitorName: 'Pedro Almeida',
        document: '456.789.123-00',
        residentUnit: 'Apt 1510',
        residentName: 'Julia Santos',
        arrivalTime: '2025-01-03T10:25:00',
        status: 'waiting',
        vehiclePlate: 'XYZ-9876'
      },
      {
        id: 'visitor-04',
        visitorName: 'Entrega iFood',
        document: 'Motoboy: 111.222.333-44',
        residentUnit: 'Apt 0302',
        residentName: 'Roberto Silva',
        arrivalTime: '2025-01-03T10:28:00',
        status: 'inside'
      }
    ];

    const mockAccessHistory: AccessHistory[] = [
      {
        id: 'access-01',
        personName: 'Maria Oliveira',
        personType: 'resident',
        unit: 'Apt 1205',
        action: 'entry',
        gate: 'Portão Principal',
        timestamp: '2025-01-03T10:30:00',
        method: 'facial',
        status: 'success'
      },
      {
        id: 'access-02',
        personName: 'Carlos Ferreira',
        personType: 'resident',
        unit: 'Apt 0804',
        action: 'exit',
        gate: 'Portão Garagem',
        timestamp: '2025-01-03T10:25:00',
        method: 'card',
        status: 'success',
        vehiclePlate: 'DEF-5678'
      },
      {
        id: 'access-03',
        personName: 'Técnico Elevadores',
        personType: 'service',
        action: 'entry',
        gate: 'Portão Serviço',
        timestamp: '2025-01-03T09:45:00',
        method: 'manual',
        status: 'success'
      },
      {
        id: 'access-04',
        personName: 'Visitante Não Autorizado',
        personType: 'visitor',
        action: 'entry',
        gate: 'Portão Principal',
        timestamp: '2025-01-03T09:30:00',
        method: 'forced',
        status: 'denied'
      },
      {
        id: 'access-05',
        personName: 'Julia Santos',
        personType: 'resident',
        unit: 'Apt 1510',
        action: 'entry',
        gate: 'Portão Principal',
        timestamp: '2025-01-03T09:15:00',
        method: 'biometry',
        status: 'success'
      }
    ];

    const mockStats: AccessStats = {
      totalAccess: 247,
      currentVisitors: 8,
      pendingApprovals: 3,
      alertsToday: 2,
      peakHour: '18:00',
      averageQueueTime: 3.5
    };

    setGates(mockGates);
    setVisitorQueue(mockVisitorQueue);
    setAccessHistory(mockAccessHistory);
    setStats(mockStats);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simular atualização de dados em tempo real
      console.log('Atualizando dados de controle de acesso...');
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handlers
  const handleGateControl = (gateId: string, action: 'open' | 'close') => {
    setGates(prev => prev.map(gate =>
      gate.id === gateId
        ? { ...gate, status: action === 'open' ? 'open' : 'closed', lastActivity: new Date().toISOString() }
        : gate
    ));
  };

  const handleVisitorApproval = (visitorId: string, action: 'approve' | 'deny') => {
    setVisitorQueue(prev => prev.map(visitor =>
      visitor.id === visitorId
        ? { ...visitor, status: action === 'approve' ? 'approved' : 'denied' }
        : visitor
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-500';
      case 'closed': return 'text-red-500';
      case 'maintenance': return 'text-yellow-500';
      case 'waiting': return 'text-yellow-500';
      case 'approved': return 'text-green-500';
      case 'denied': return 'text-red-500';
      case 'inside': return 'text-blue-500';
      case 'success': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getPersonTypeIcon = (type: string) => {
    switch (type) {
      case 'resident': return <Users className="w-4 h-4" />;
      case 'visitor': return <Eye className="w-4 h-4" />;
      case 'delivery': return <Car className="w-4 h-4" />;
      case 'service': return <Activity className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'facial': return <Camera className="w-4 h-4" />;
      case 'biometry': return <Eye className="w-4 h-4" />;
      case 'card': return <Shield className="w-4 h-4" />;
      case 'vehicle': return <Car className="w-4 h-4" />;
      case 'manual': return <UserCheck className="w-4 h-4" />;
      case 'forced': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const filteredHistory = accessHistory.filter(entry => {
    const matchesFilter = historyFilter === 'all' || entry.personType === historyFilter;
    const matchesSearch = searchTerm === '' ||
      entry.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.unit && entry.unit.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const filteredQueue = visitorQueue.filter(visitor => {
    const matchesFilter = queueFilter === 'all' || visitor.status === queueFilter;
    const matchesSearch = searchTerm === '' ||
      visitor.visitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.residentName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
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
              <Shield className="w-8 h-8 text-blue-600" />
              Controle de Acesso
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitoramento e controle de acessos em tempo real
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Tempo Real</span>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                size="sm"
              />
            </div>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Relatório
            </Button>
          </div>
        </motion.div>

        {/* Statistics Cards */}
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Acessos Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAccess}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+12%</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Visitantes Ativos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.currentVisitors}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-gray-600">{stats.averageQueueTime}min média</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <Eye className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aguardando Aprovação</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApprovals}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Bell className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Requer atenção</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alertas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.alertsToday}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-600">Pico: {stats.peakHour}</span>
                  </div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gate Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DoorOpen className="w-5 h-5" />
                  Controle de Portões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gates.map((gate) => (
                  <div
                    key={gate.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{gate.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{gate.location}</p>
                      </div>
                      <Badge
                        variant={gate.status === 'open' ? 'default' : gate.status === 'closed' ? 'secondary' : 'destructive'}
                        className={`${getStatusColor(gate.status)}`}
                      >
                        {gate.status === 'open' ? 'Aberto' : gate.status === 'closed' ? 'Fechado' : 'Manutenção'}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Última atividade: {new Date(gate.lastActivity).toLocaleTimeString('pt-BR')}
                    </div>

                    {gate.status !== 'maintenance' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={gate.status === 'open' ? 'outline' : 'default'}
                          onClick={() => handleGateControl(gate.id, 'open')}
                          className="flex-1"
                          disabled={gate.status === 'open'}
                        >
                          <Unlock className="w-3 h-3 mr-1" />
                          Abrir
                        </Button>
                        <Button
                          size="sm"
                          variant={gate.status === 'closed' ? 'outline' : 'default'}
                          onClick={() => handleGateControl(gate.id, 'close')}
                          className="flex-1"
                          disabled={gate.status === 'closed'}
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          Fechar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardContent className="p-6">
                <Tabs defaultValue="queue" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="queue">Fila de Visitantes</TabsTrigger>
                    <TabsTrigger value="history">Histórico de Acessos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="queue" className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Buscar visitante ou morador..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Select value={queueFilter} onValueChange={setQueueFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Filtrar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="waiting">Aguardando</SelectItem>
                          <SelectItem value="approved">Aprovados</SelectItem>
                          <SelectItem value="denied">Negados</SelectItem>
                          <SelectItem value="inside">No Condomínio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredQueue.map((visitor) => (
                        <motion.div
                          key={visitor.id}
                          layout
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {visitor.visitorName}
                                </h4>
                                <Badge
                                  variant={visitor.status === 'approved' ? 'default' : visitor.status === 'waiting' ? 'secondary' : visitor.status === 'denied' ? 'destructive' : 'outline'}
                                  className={getStatusColor(visitor.status)}
                                >
                                  {visitor.status === 'waiting' ? 'Aguardando' : visitor.status === 'approved' ? 'Aprovado' : visitor.status === 'denied' ? 'Negado' : 'No Condomínio'}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div>Documento: {visitor.document}</div>
                                <div>Unidade: {visitor.residentUnit}</div>
                                <div>Morador: {visitor.residentName}</div>
                                <div>Chegada: {new Date(visitor.arrivalTime).toLocaleTimeString('pt-BR')}</div>
                                {visitor.vehiclePlate && (
                                  <div className="flex items-center gap-1">
                                    <Car className="w-3 h-3" />
                                    {visitor.vehiclePlate}
                                  </div>
                                )}
                              </div>
                            </div>

                            {visitor.status === 'waiting' && (
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  onClick={() => handleVisitorApproval(visitor.id, 'approve')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleVisitorApproval(visitor.id, 'deny')}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Negar
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {filteredQueue.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nenhum visitante na fila
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Buscar no histórico..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Select value={historyFilter} onValueChange={setHistoryFilter}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="Tipo de pessoa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="resident">Moradores</SelectItem>
                          <SelectItem value="visitor">Visitantes</SelectItem>
                          <SelectItem value="delivery">Entregas</SelectItem>
                          <SelectItem value="service">Serviços</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredHistory.map((entry) => (
                        <motion.div
                          key={entry.id}
                          layout
                          className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {getPersonTypeIcon(entry.personType)}
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white">
                                    {entry.personName}
                                  </h4>
                                  {entry.unit && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {entry.unit}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-sm">
                                  {getMethodIcon(entry.method)}
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {entry.method === 'facial' ? 'Reconhecimento Facial' :
                                     entry.method === 'biometry' ? 'Biometria' :
                                     entry.method === 'card' ? 'Cartão' :
                                     entry.method === 'vehicle' ? 'Veículo' :
                                     entry.method === 'manual' ? 'Manual' : 'Forçado'}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(entry.timestamp).toLocaleString('pt-BR')}
                                </div>
                              </div>

                              <Badge
                                variant={entry.status === 'success' ? 'default' : 'destructive'}
                                className={getStatusColor(entry.status)}
                              >
                                {entry.action === 'entry' ? 'Entrada' : 'Saída'}
                              </Badge>

                              <Badge
                                variant={entry.status === 'success' ? 'default' : 'destructive'}
                                className={getStatusColor(entry.status)}
                              >
                                {entry.status === 'success' ? 'Sucesso' : entry.status === 'denied' ? 'Negado' : 'Forçado'}
                              </Badge>
                            </div>
                          </div>

                          {(entry.vehiclePlate || entry.gate) && (
                            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
                              {entry.vehiclePlate && (
                                <span className="mr-4">Veículo: {entry.vehiclePlate}</span>
                              )}
                              {entry.gate && (
                                <span>Portão: {entry.gate}</span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {filteredHistory.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          Nenhum registro encontrado
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ControleAcesso;