'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Truck,
  Mail,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Search,
  Filter,
  Download,
  QrCode,
  Scan,
  Plus,
  Eye,
  MessageSquare,
  Calendar,
  TrendingUp,
  Activity,
  Users,
  Building2,
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
interface Delivery {
  id: string;
  type: 'package' | 'mail' | 'document' | 'food' | 'pharmacy' | 'grocery';
  trackingCode?: string;
  recipientUnit: string;
  recipientName: string;
  recipientPhone?: string;
  senderName: string;
  senderCompany?: string;
  deliveryService: string;
  arrivalTime: string;
  deliveryTime?: string;
  pickupTime?: string;
  status: 'arrived' | 'notified' | 'picked_up' | 'returned' | 'refused';
  description: string;
  size: 'small' | 'medium' | 'large' | 'xl';
  urgent: boolean;
  signature?: string;
  photo?: string;
  notes?: string;
  attempts: number;
  lastAttempt?: string;
}

interface DeliveryStats {
  totalToday: number;
  pending: number;
  pickedUp: number;
  returned: number;
  averagePickupTime: number;
  mostActiveHour: string;
  topDeliveryService: string;
  urgentDeliveries: number;
}

interface DeliveryService {
  name: string;
  count: number;
  reliability: number;
  avgDeliveryTime: string;
}

const Entregas = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats>({
    totalToday: 0,
    pending: 0,
    pickedUp: 0,
    returned: 0,
    averagePickupTime: 0,
    mostActiveHour: '',
    topDeliveryService: '',
    urgentDeliveries: 0
  });
  const [deliveryServices, setDeliveryServices] = useState<DeliveryService[]>([]);

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedService, setSelectedService] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  // Mock data initialization
  useEffect(() => {
    const mockDeliveries: Delivery[] = [
      {
        id: 'del-001',
        type: 'package',
        trackingCode: 'BR123456789',
        recipientUnit: 'Apt 1205',
        recipientName: 'Maria Silva Santos',
        recipientPhone: '(11) 98765-4321',
        senderName: 'Americanas',
        senderCompany: 'Americanas.com',
        deliveryService: 'Correios',
        arrivalTime: '2025-01-03T14:30:00',
        status: 'notified',
        description: 'Smartphone Samsung Galaxy A54',
        size: 'medium',
        urgent: false,
        notes: 'Entrega realizada na portaria',
        attempts: 1,
        lastAttempt: '2025-01-03T14:30:00'
      },
      {
        id: 'del-002',
        type: 'food',
        recipientUnit: 'Apt 0804',
        recipientName: 'João Carlos Oliveira',
        recipientPhone: '(11) 99876-5432',
        senderName: 'iFood',
        senderCompany: 'Restaurante Sabor & Arte',
        deliveryService: 'iFood',
        arrivalTime: '2025-01-03T19:45:00',
        pickupTime: '2025-01-03T19:50:00',
        status: 'picked_up',
        description: 'Pizza Margherita + Refrigerante',
        size: 'medium',
        urgent: true,
        attempts: 1
      },
      {
        id: 'del-003',
        type: 'mail',
        recipientUnit: 'Apt 1510',
        recipientName: 'Pedro Almeida Costa',
        senderName: 'Banco Itaú',
        deliveryService: 'Correios',
        arrivalTime: '2025-01-03T10:15:00',
        status: 'arrived',
        description: 'Correspondência bancária',
        size: 'small',
        urgent: false,
        attempts: 0
      },
      {
        id: 'del-004',
        type: 'pharmacy',
        trackingCode: 'DRG987654321',
        recipientUnit: 'Apt 0302',
        recipientName: 'Ana Beatriz Santos',
        recipientPhone: '(11) 97654-3210',
        senderName: 'Droga Raia',
        senderCompany: 'Farmácia Droga Raia',
        deliveryService: 'Moto Express',
        arrivalTime: '2025-01-03T16:20:00',
        deliveryTime: '2025-01-03T16:25:00',
        status: 'notified',
        description: 'Medicamentos controlados',
        size: 'small',
        urgent: true,
        notes: 'Medicamento refrigerado - retirar em até 2h',
        attempts: 1,
        lastAttempt: '2025-01-03T16:25:00'
      },
      {
        id: 'del-005',
        type: 'package',
        trackingCode: 'ML555666777',
        recipientUnit: 'Apt 0605',
        recipientName: 'Roberto Ferreira Lima',
        senderName: 'MercadoLivre',
        senderCompany: 'Vendedor: Tech Store BR',
        deliveryService: 'Mercado Envios',
        arrivalTime: '2025-01-03T11:00:00',
        pickupTime: '2025-01-03T18:30:00',
        status: 'picked_up',
        description: 'Notebook Dell Inspiron 15',
        size: 'large',
        urgent: false,
        signature: 'Roberto F. Lima',
        attempts: 1
      },
      {
        id: 'del-006',
        type: 'document',
        recipientUnit: 'Apt 0708',
        recipientName: 'Carlos Eduardo Rocha',
        recipientPhone: '(11) 96543-2109',
        senderName: 'Receita Federal',
        deliveryService: 'Correios',
        arrivalTime: '2025-01-02T15:45:00',
        status: 'returned',
        description: 'Notificação fiscal - AR',
        size: 'small',
        urgent: true,
        attempts: 3,
        lastAttempt: '2025-01-03T09:00:00',
        notes: 'Morador ausente - 3 tentativas realizadas'
      },
      {
        id: 'del-007',
        type: 'grocery',
        recipientUnit: 'Apt 1012',
        recipientName: 'Julia Santos Oliveira',
        recipientPhone: '(11) 95432-1098',
        senderName: 'Rappi',
        senderCompany: 'Supermercado Extra',
        deliveryService: 'Rappi',
        arrivalTime: '2025-01-03T20:15:00',
        status: 'arrived',
        description: 'Compras do supermercado',
        size: 'xl',
        urgent: false,
        attempts: 0
      },
      {
        id: 'del-008',
        type: 'package',
        trackingCode: 'AMZ789012345',
        recipientUnit: 'Apt 1408',
        recipientName: 'Fernando Costa Silva',
        senderName: 'Amazon',
        senderCompany: 'Amazon Brasil',
        deliveryService: 'Amazon Logistics',
        arrivalTime: '2025-01-03T13:20:00',
        deliveryTime: '2025-01-03T13:25:00',
        status: 'notified',
        description: 'Livros técnicos - 3 volumes',
        size: 'medium',
        urgent: false,
        attempts: 1,
        lastAttempt: '2025-01-03T13:25:00'
      }
    ];

    const mockStats: DeliveryStats = {
      totalToday: 15,
      pending: 5,
      pickedUp: 8,
      returned: 1,
      averagePickupTime: 4.2,
      mostActiveHour: '14:00-15:00',
      topDeliveryService: 'Correios',
      urgentDeliveries: 3
    };

    const mockServices: DeliveryService[] = [
      { name: 'Correios', count: 6, reliability: 92, avgDeliveryTime: '1.5 dias' },
      { name: 'iFood', count: 4, reliability: 98, avgDeliveryTime: '35 min' },
      { name: 'Mercado Envios', count: 3, reliability: 89, avgDeliveryTime: '2.1 dias' },
      { name: 'Amazon Logistics', count: 2, reliability: 95, avgDeliveryTime: '1.8 dias' },
      { name: 'Rappi', count: 2, reliability: 94, avgDeliveryTime: '28 min' },
      { name: 'Moto Express', count: 1, reliability: 87, avgDeliveryTime: '45 min' }
    ];

    setDeliveries(mockDeliveries);
    setStats(mockStats);
    setDeliveryServices(mockServices);
  }, []);

  // Helper functions
  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'package': return <Package className="w-5 h-5" />;
      case 'mail': return <Mail className="w-5 h-5" />;
      case 'document': return <Mail className="w-5 h-5" />;
      case 'food': return <Truck className="w-5 h-5" />;
      case 'pharmacy': return <Plus className="w-5 h-5" />;
      case 'grocery': return <Package className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getDeliveryTypeColor = (type: string) => {
    switch (type) {
      case 'package': return 'text-blue-500';
      case 'mail': return 'text-gray-500';
      case 'document': return 'text-purple-500';
      case 'food': return 'text-orange-500';
      case 'pharmacy': return 'text-red-500';
      case 'grocery': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'notified': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'picked_up': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'returned': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'refused': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'arrived': return <Clock className="w-4 h-4" />;
      case 'notified': return <Bell className="w-4 h-4" />;
      case 'picked_up': return <CheckCircle className="w-4 h-4" />;
      case 'returned': return <XCircle className="w-4 h-4" />;
      case 'refused': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return 'P';
      case 'medium': return 'M';
      case 'large': return 'G';
      case 'xl': return 'XG';
      default: return 'M';
    }
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'small': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'large': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'xl': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleDeliveryAction = (deliveryId: string, action: 'notify' | 'pickup' | 'return') => {
    setDeliveries(prev => prev.map(delivery =>
      delivery.id === deliveryId
        ? {
            ...delivery,
            status: action === 'notify' ? 'notified' : action === 'pickup' ? 'picked_up' : 'returned',
            pickupTime: action === 'pickup' ? new Date().toISOString() : delivery.pickupTime,
            deliveryTime: action === 'notify' ? new Date().toISOString() : delivery.deliveryTime
          }
        : delivery
    ));
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesStatus = selectedStatus === 'all' || delivery.status === selectedStatus;
    const matchesType = selectedType === 'all' || delivery.type === selectedType;
    const matchesService = selectedService === 'all' || delivery.deliveryService === selectedService;
    const matchesUrgent = !showUrgentOnly || delivery.urgent;
    const matchesSearch = searchTerm === '' ||
      delivery.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.recipientUnit.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.trackingCode && delivery.trackingCode.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesType && matchesService && matchesUrgent && matchesSearch;
  });

  const arrivedDeliveries = deliveries.filter(d => d.status === 'arrived');
  const notifiedDeliveries = deliveries.filter(d => d.status === 'notified');
  const pickedUpDeliveries = deliveries.filter(d => d.status === 'picked_up');
  const urgentDeliveries = deliveries.filter(d => d.urgent && ['arrived', 'notified'].includes(d.status));

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
              <Package className="w-8 h-8 text-orange-600" />
              Entregas e Correspondências
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestão de encomendas e correspondências do condomínio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Urgentes</span>
              <Switch
                checked={showUrgentOnly}
                onCheckedChange={setShowUrgentOnly}
                size="sm"
              />
            </div>

            <Button variant="outline" size="sm">
              <QrCode className="w-4 h-4 mr-2" />
              Scanner
            </Button>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Relatório
            </Button>

            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Entrega
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Entregas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalToday}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+18%</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-full">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aguardando Retirada</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">{urgentDeliveries.length} urgentes</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <Bell className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Retiradas Hoje</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pickedUp}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">Tempo médio: {stats.averagePickupTime}h</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Devolvidas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.returned}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-600">Horário pico: {stats.mostActiveHour}</span>
                  </div>
                </div>
                <div className="p-3 bg-red-500/10 rounded-full">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Delivery Services Stats */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Transportadoras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveryServices.map((service) => (
                  <div
                    key={service.name}
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{service.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {service.count} entregas
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>Confiabilidade:</span>
                        <span className="font-medium">{service.reliability}%</span>
                      </div>
                      <Progress value={service.reliability} className="h-1" />
                      <div className="flex items-center justify-between">
                        <span>Tempo médio:</span>
                        <span className="font-medium">{service.avgDeliveryTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Deliveries List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardContent className="p-6">
                <Tabs defaultValue="arrived" className="w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <TabsList className="grid w-full lg:w-auto grid-cols-4">
                      <TabsTrigger value="arrived" className="text-xs">
                        Chegaram ({arrivedDeliveries.length})
                      </TabsTrigger>
                      <TabsTrigger value="notified" className="text-xs">
                        Notificados ({notifiedDeliveries.length})
                      </TabsTrigger>
                      <TabsTrigger value="picked_up" className="text-xs">
                        Retiradas ({pickedUpDeliveries.length})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="text-xs">
                        Todas ({deliveries.length})
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Buscar por morador, unidade ou código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64"
                      />

                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="package">Encomenda</SelectItem>
                          <SelectItem value="mail">Correio</SelectItem>
                          <SelectItem value="food">Comida</SelectItem>
                          <SelectItem value="pharmacy">Farmácia</SelectItem>
                          <SelectItem value="grocery">Mercado</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={selectedService} onValueChange={setSelectedService}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="Transportadora" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {deliveryServices.map((service) => (
                            <SelectItem key={service.name} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value="arrived" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredDeliveries
                      .filter(d => d.status === 'arrived')
                      .map((delivery) => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        onAction={handleDeliveryAction}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="notified" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredDeliveries
                      .filter(d => d.status === 'notified')
                      .map((delivery) => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        onAction={handleDeliveryAction}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="picked_up" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredDeliveries
                      .filter(d => d.status === 'picked_up')
                      .map((delivery) => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        onAction={handleDeliveryAction}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="all" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredDeliveries.map((delivery) => (
                      <DeliveryCard
                        key={delivery.id}
                        delivery={delivery}
                        onAction={handleDeliveryAction}
                      />
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

// Componente para card de entrega
interface DeliveryCardProps {
  delivery: Delivery;
  onAction: (deliveryId: string, action: 'notify' | 'pickup' | 'return') => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, onAction }) => {
  const getDeliveryTypeIcon = (type: string) => {
    switch (type) {
      case 'package': return <Package className="w-5 h-5" />;
      case 'mail': return <Mail className="w-5 h-5" />;
      case 'document': return <Mail className="w-5 h-5" />;
      case 'food': return <Truck className="w-5 h-5" />;
      case 'pharmacy': return <Plus className="w-5 h-5" />;
      case 'grocery': return <Package className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const getDeliveryTypeColor = (type: string) => {
    switch (type) {
      case 'package': return 'text-blue-500';
      case 'mail': return 'text-gray-500';
      case 'document': return 'text-purple-500';
      case 'food': return 'text-orange-500';
      case 'pharmacy': return 'text-red-500';
      case 'grocery': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'notified': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'picked_up': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'returned': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'refused': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'arrived': return <Clock className="w-4 h-4" />;
      case 'notified': return <Bell className="w-4 h-4" />;
      case 'picked_up': return <CheckCircle className="w-4 h-4" />;
      case 'returned': return <XCircle className="w-4 h-4" />;
      case 'refused': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return 'P';
      case 'medium': return 'M';
      case 'large': return 'G';
      case 'xl': return 'XG';
      default: return 'M';
    }
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'small': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'large': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'xl': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <motion.div
      layout
      className={`
        p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50
        ${delivery.urgent ? 'border-orange-300 dark:border-orange-700 shadow-md' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 ${getDeliveryTypeColor(delivery.type)}`}>
            {getDeliveryTypeIcon(delivery.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {delivery.description}
              </h4>
              {delivery.urgent && (
                <Badge className="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Urgente
                </Badge>
              )}
              <Badge className={`text-xs ${getStatusColor(delivery.status)}`}>
                {getStatusIcon(delivery.status)}
                {delivery.status === 'arrived' ? 'Chegou' :
                 delivery.status === 'notified' ? 'Notificado' :
                 delivery.status === 'picked_up' ? 'Retirado' :
                 delivery.status === 'returned' ? 'Devolvido' : 'Recusado'}
              </Badge>
              <div className={`text-xs px-2 py-1 rounded-full ${getSizeColor(delivery.size)}`}>
                {getSizeLabel(delivery.size)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {delivery.recipientUnit}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {delivery.recipientName}
              </div>
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {delivery.deliveryService}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(delivery.arrivalTime).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>De:</strong> {delivery.senderName}
              {delivery.senderCompany && ` (${delivery.senderCompany})`}
            </div>

            {delivery.trackingCode && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                <strong>Código:</strong> {delivery.trackingCode}
              </div>
            )}

            {delivery.notes && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <strong>Observações:</strong> {delivery.notes}
              </div>
            )}

            {delivery.attempts > 0 && (
              <div className="text-xs text-orange-600 dark:text-orange-400">
                <strong>Tentativas:</strong> {delivery.attempts}
                {delivery.lastAttempt && (
                  <span> • Última: {new Date(delivery.lastAttempt).toLocaleString('pt-BR')}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 ml-4">
          {delivery.recipientPhone && (
            <Button size="sm" variant="outline" className="text-blue-600">
              <Phone className="w-3 h-3 mr-1" />
              Ligar
            </Button>
          )}

          {delivery.status === 'arrived' && (
            <Button
              size="sm"
              onClick={() => onAction(delivery.id, 'notify')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Bell className="w-3 h-3 mr-1" />
              Notificar
            </Button>
          )}

          {delivery.status === 'notified' && (
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => onAction(delivery.id, 'pickup')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onAction(delivery.id, 'return')}
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          )}

          {delivery.signature && (
            <div className="text-xs text-green-600 dark:text-green-400">
              <strong>Assinatura:</strong> {delivery.signature}
            </div>
          )}

          {delivery.pickupTime && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <strong>Retirado:</strong> {new Date(delivery.pickupTime).toLocaleString('pt-BR')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Entregas;