'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Shield,
  Flame,
  Heart,
  Zap,
  Camera,
  MapPin,
  Clock,
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Activity,
  TrendingUp,
  Download,
  Filter,
  Search,
  Eye,
  Settings,
  Siren,
  Radio,
  Phone
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
interface Alarm {
  id: string;
  type: 'security' | 'fire' | 'medical' | 'technical' | 'intrusion' | 'panic';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: string;
  zone: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'silenced';
  assignedTo?: string;
  cameraId?: string;
  sensorId?: string;
  responseTime?: number;
}

interface AlarmZone {
  id: string;
  name: string;
  type: 'perimeter' | 'interior' | 'garage' | 'common' | 'technical';
  activeAlarms: number;
  totalSensors: number;
  status: 'normal' | 'warning' | 'alarm' | 'offline';
  lastActivity: string;
}

interface AlarmStats {
  activeAlarms: number;
  totalToday: number;
  averageResponseTime: number;
  criticalAlarms: number;
  resolvedToday: number;
  systemHealth: number;
}

const Alarmes = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [zones, setZones] = useState<AlarmZone[]>([]);
  const [stats, setStats] = useState<AlarmStats>({
    activeAlarms: 0,
    totalToday: 0,
    averageResponseTime: 0,
    criticalAlarms: 0,
    resolvedToday: 0,
    systemHealth: 0
  });

  const [selectedAlarm, setSelectedAlarm] = useState<string | null>(null);
  const [alarmFilter, setAlarmFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Mock data initialization
  useEffect(() => {
    const mockAlarms: Alarm[] = [
      {
        id: 'alarm-01',
        type: 'security',
        priority: 'critical',
        title: 'Intrusão Detectada',
        description: 'Movimento não autorizado detectado na área da piscina',
        location: 'Área da Piscina - Bloco A',
        zone: 'zone-01',
        timestamp: '2025-01-03T10:35:00',
        status: 'active',
        cameraId: 'cam-03',
        sensorId: 'sensor-12'
      },
      {
        id: 'alarm-02',
        type: 'fire',
        priority: 'high',
        title: 'Detector de Fumaça Ativado',
        description: 'Fumaça detectada no subsolo próximo à área de manutenção',
        location: 'Subsolo - Área Técnica',
        zone: 'zone-04',
        timestamp: '2025-01-03T10:28:00',
        status: 'acknowledged',
        assignedTo: 'Bombeiros - Eq. 1',
        sensorId: 'smoke-05',
        responseTime: 3
      },
      {
        id: 'alarm-03',
        type: 'technical',
        priority: 'medium',
        title: 'Falha no Sistema Elétrico',
        description: 'Queda de energia detectada no elevador social',
        location: 'Elevador Social - Bloco B',
        zone: 'zone-02',
        timestamp: '2025-01-03T10:15:00',
        status: 'acknowledged',
        assignedTo: 'Manutenção',
        responseTime: 8
      },
      {
        id: 'alarm-04',
        type: 'medical',
        priority: 'high',
        title: 'Botão de Pânico Acionado',
        description: 'Alarme de emergência médica acionado no Apt 1205',
        location: 'Apto 1205 - Bloco A',
        zone: 'zone-01',
        timestamp: '2025-01-03T09:45:00',
        status: 'resolved',
        assignedTo: 'SAMU',
        responseTime: 12
      },
      {
        id: 'alarm-05',
        type: 'intrusion',
        priority: 'medium',
        title: 'Porta Forçada',
        description: 'Tentativa de acesso forçado detectada na portaria',
        location: 'Portaria Principal',
        zone: 'zone-03',
        timestamp: '2025-01-03T09:30:00',
        status: 'silenced',
        cameraId: 'cam-01',
        sensorId: 'sensor-01'
      }
    ];

    const mockZones: AlarmZone[] = [
      {
        id: 'zone-01',
        name: 'Perímetro Bloco A',
        type: 'perimeter',
        activeAlarms: 2,
        totalSensors: 12,
        status: 'alarm',
        lastActivity: '2025-01-03T10:35:00'
      },
      {
        id: 'zone-02',
        name: 'Interior Bloco B',
        type: 'interior',
        activeAlarms: 1,
        totalSensors: 8,
        status: 'warning',
        lastActivity: '2025-01-03T10:15:00'
      },
      {
        id: 'zone-03',
        name: 'Área Social',
        type: 'common',
        activeAlarms: 0,
        totalSensors: 6,
        status: 'normal',
        lastActivity: '2025-01-03T09:30:00'
      },
      {
        id: 'zone-04',
        name: 'Garagem Subsolo',
        type: 'garage',
        activeAlarms: 1,
        totalSensors: 10,
        status: 'warning',
        lastActivity: '2025-01-03T10:28:00'
      },
      {
        id: 'zone-05',
        name: 'Área Técnica',
        type: 'technical',
        activeAlarms: 0,
        totalSensors: 4,
        status: 'normal',
        lastActivity: '2025-01-03T08:00:00'
      }
    ];

    const mockStats: AlarmStats = {
      activeAlarms: 4,
      totalToday: 15,
      averageResponseTime: 7.5,
      criticalAlarms: 1,
      resolvedToday: 11,
      systemHealth: 94
    };

    setAlarms(mockAlarms);
    setZones(mockZones);
    setStats(mockStats);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simular atualização de dados em tempo real
      console.log('Atualizando dados de alarmes...');
    }, 5000); // 5 segundos para alarmes

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Sound notification for critical alarms
  useEffect(() => {
    if (soundEnabled && alarms.some(alarm => alarm.priority === 'critical' && alarm.status === 'active')) {
      // Simular som de alarme crítico
      console.log('🚨 ALARME CRÍTICO - Som ativado');
    }
  }, [alarms, soundEnabled]);

  // Handlers
  const handleAlarmAction = (alarmId: string, action: 'acknowledge' | 'resolve' | 'silence') => {
    setAlarms(prev => prev.map(alarm =>
      alarm.id === alarmId
        ? {
            ...alarm,
            status: action === 'acknowledge' ? 'acknowledged' : action === 'resolve' ? 'resolved' : 'silenced',
            responseTime: action === 'acknowledge' ? Math.floor(Math.random() * 15) + 1 : alarm.responseTime
          }
        : alarm
    ));
  };

  const getAlarmTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-5 h-5" />;
      case 'fire': return <Flame className="w-5 h-5" />;
      case 'medical': return <Heart className="w-5 h-5" />;
      case 'technical': return <Zap className="w-5 h-5" />;
      case 'intrusion': return <Eye className="w-5 h-5" />;
      case 'panic': return <Bell className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlarmTypeColor = (type: string) => {
    switch (type) {
      case 'security': return 'text-blue-500';
      case 'fire': return 'text-red-500';
      case 'medical': return 'text-pink-500';
      case 'technical': return 'text-yellow-500';
      case 'intrusion': return 'text-purple-500';
      case 'panic': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-500';
      case 'acknowledged': return 'text-yellow-500';
      case 'resolved': return 'text-green-500';
      case 'silenced': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  const getZoneStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'alarm': return 'border-red-500 bg-red-50 dark:bg-red-900/20 animate-pulse';
      case 'offline': return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const filteredAlarms = alarms.filter(alarm => {
    const matchesFilter = alarmFilter === 'all' || alarm.status === alarmFilter;
    const matchesPriority = priorityFilter === 'all' || alarm.priority === priorityFilter;
    const matchesSearch = searchTerm === '' ||
      alarm.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alarm.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alarm.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesPriority && matchesSearch;
  });

  const activeAlarms = alarms.filter(alarm => alarm.status === 'active');
  const acknowledgedAlarms = alarms.filter(alarm => alarm.status === 'acknowledged');
  const resolvedAlarms = alarms.filter(alarm => alarm.status === 'resolved');

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
              <Siren className="w-8 h-8 text-red-600" />
              Sistema de Alarmes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitoramento de segurança em tempo real
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

            <div className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-500" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
              <span className="text-sm text-gray-600 dark:text-gray-400">Som</span>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
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
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Alarmes Ativos</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeAlarms}</p>
                </div>
                <div className="p-2 bg-red-500/10 rounded-full">
                  <Bell className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Hoje</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalToday}</p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Críticos</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.criticalAlarms}</p>
                </div>
                <div className="p-2 bg-red-500/10 rounded-full">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Resolvidos</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.resolvedToday}</p>
                </div>
                <div className="p-2 bg-green-500/10 rounded-full">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Tempo Médio</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.averageResponseTime}min</p>
                </div>
                <div className="p-2 bg-yellow-500/10 rounded-full">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sistema</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.systemHealth}%</p>
                </div>
                <div className="p-2 bg-green-500/10 rounded-full">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Zone Status */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Status das Zonas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`p-3 rounded-lg border-2 ${getZoneStatusColor(zone.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{zone.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {zone.status === 'normal' ? 'Normal' :
                         zone.status === 'warning' ? 'Atenção' :
                         zone.status === 'alarm' ? 'ALARME' : 'Offline'}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Sensores: {zone.totalSensors}</div>
                      <div>Alarmes ativos: {zone.activeAlarms}</div>
                      <div>Última atividade: {new Date(zone.lastActivity).toLocaleTimeString('pt-BR')}</div>
                    </div>

                    {zone.activeAlarms > 0 && (
                      <div className="mt-2">
                        <Progress value={(zone.activeAlarms / zone.totalSensors) * 100} className="h-1" />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Alarms List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardContent className="p-6">
                <Tabs defaultValue="active" className="w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <TabsList className="grid w-full lg:w-auto grid-cols-4">
                      <TabsTrigger value="active" className="text-xs">
                        Ativos ({activeAlarms.length})
                      </TabsTrigger>
                      <TabsTrigger value="acknowledged" className="text-xs">
                        Reconhecidos ({acknowledgedAlarms.length})
                      </TabsTrigger>
                      <TabsTrigger value="resolved" className="text-xs">
                        Resolvidos ({resolvedAlarms.length})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="text-xs">
                        Todos ({alarms.length})
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Buscar alarmes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64"
                        size="sm"
                      />

                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue placeholder="Prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="critical">Crítica</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="low">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value="active" className="space-y-3 max-h-96 overflow-y-auto">
                    {activeAlarms.map((alarm) => (
                      <AlarmCard key={alarm.id} alarm={alarm} onAction={handleAlarmAction} />
                    ))}
                  </TabsContent>

                  <TabsContent value="acknowledged" className="space-y-3 max-h-96 overflow-y-auto">
                    {acknowledgedAlarms.map((alarm) => (
                      <AlarmCard key={alarm.id} alarm={alarm} onAction={handleAlarmAction} />
                    ))}
                  </TabsContent>

                  <TabsContent value="resolved" className="space-y-3 max-h-96 overflow-y-auto">
                    {resolvedAlarms.map((alarm) => (
                      <AlarmCard key={alarm.id} alarm={alarm} onAction={handleAlarmAction} />
                    ))}
                  </TabsContent>

                  <TabsContent value="all" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAlarms.map((alarm) => (
                      <AlarmCard key={alarm.id} alarm={alarm} onAction={handleAlarmAction} />
                    ))}
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

// Componente para cada card de alarme
interface AlarmCardProps {
  alarm: Alarm;
  onAction: (alarmId: string, action: 'acknowledge' | 'resolve' | 'silence') => void;
}

const AlarmCard: React.FC<AlarmCardProps> = ({ alarm, onAction }) => {
  const getAlarmTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="w-5 h-5" />;
      case 'fire': return <Flame className="w-5 h-5" />;
      case 'medical': return <Heart className="w-5 h-5" />;
      case 'technical': return <Zap className="w-5 h-5" />;
      case 'intrusion': return <Eye className="w-5 h-5" />;
      case 'panic': return <Bell className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getAlarmTypeColor = (type: string) => {
    switch (type) {
      case 'security': return 'text-blue-500';
      case 'fire': return 'text-red-500';
      case 'medical': return 'text-pink-500';
      case 'technical': return 'text-yellow-500';
      case 'intrusion': return 'text-purple-500';
      case 'panic': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-500';
      case 'acknowledged': return 'text-yellow-500';
      case 'resolved': return 'text-green-500';
      case 'silenced': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <motion.div
      layout
      className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 ${
        alarm.priority === 'critical' && alarm.status === 'active' ? 'animate-pulse border-red-500' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${getAlarmTypeColor(alarm.type)}`}>
            {getAlarmTypeIcon(alarm.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">{alarm.title}</h4>
              <Badge className={`text-xs ${getPriorityColor(alarm.priority)}`}>
                {alarm.priority === 'critical' ? 'CRÍTICO' :
                 alarm.priority === 'high' ? 'Alto' :
                 alarm.priority === 'medium' ? 'Médio' : 'Baixo'}
              </Badge>
              <Badge variant="outline" className={`text-xs ${getStatusColor(alarm.status)}`}>
                {alarm.status === 'active' ? 'Ativo' :
                 alarm.status === 'acknowledged' ? 'Reconhecido' :
                 alarm.status === 'resolved' ? 'Resolvido' : 'Silenciado'}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alarm.description}</p>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {alarm.location}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(alarm.timestamp).toLocaleString('pt-BR')}
              </div>
              {alarm.assignedTo && (
                <div className="flex items-center gap-1">
                  <Radio className="w-3 h-3" />
                  {alarm.assignedTo}
                </div>
              )}
              {alarm.responseTime && (
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Resposta: {alarm.responseTime}min
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 ml-4">
          {alarm.cameraId && (
            <Button size="sm" variant="outline" className="text-blue-600">
              <Camera className="w-3 h-3" />
            </Button>
          )}

          {alarm.status === 'active' && (
            <>
              <Button
                size="sm"
                onClick={() => onAction(alarm.id, 'acknowledge')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Reconhecer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(alarm.id, 'silence')}
                className="text-blue-600"
              >
                <BellOff className="w-3 h-3" />
              </Button>
            </>
          )}

          {alarm.status === 'acknowledged' && (
            <Button
              size="sm"
              onClick={() => onAction(alarm.id, 'resolve')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Resolver
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Alarmes;