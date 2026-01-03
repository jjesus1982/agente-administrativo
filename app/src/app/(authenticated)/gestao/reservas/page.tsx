'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  Star,
  Utensils,
  Car,
  Gamepad2,
  Dumbbell,
  Waves,
  TreePine,
  Building,
  ChevronLeft,
  ChevronRight,
  Activity,
  TrendingUp,
  UserCheck
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
interface Space {
  id: string;
  name: string;
  type: 'salon' | 'bbq' | 'sports' | 'gym' | 'pool' | 'garden' | 'garage';
  capacity: number;
  hourlyRate: number;
  amenities: string[];
  availability: boolean;
  maintenanceMode: boolean;
  image?: string;
  rules?: string[];
}

interface Reservation {
  id: string;
  spaceId: string;
  spaceName: string;
  userId: string;
  userName: string;
  userUnit: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalCost: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  purpose: string;
  guestCount: number;
  specialRequests?: string;
  createdAt: string;
  approvedBy?: string;
}

interface ReservationStats {
  totalReservations: number;
  thisMonth: number;
  pendingApproval: number;
  revenue: number;
  utilizationRate: number;
  popularSpace: string;
  averageDuration: number;
  cancelledRate: number;
}

const Reservas = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<ReservationStats>({
    totalReservations: 0,
    thisMonth: 0,
    pendingApproval: 0,
    revenue: 0,
    utilizationRate: 0,
    popularSpace: '',
    averageDuration: 0,
    cancelledRate: 0
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSpace, setSelectedSpace] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarView, setCalendarView] = useState('month');

  // Mock data initialization
  useEffect(() => {
    const mockSpaces: Space[] = [
      {
        id: 'space-01',
        name: 'Salão de Festas',
        type: 'salon',
        capacity: 80,
        hourlyRate: 150.00,
        amenities: ['Som ambiente', 'Mesas e cadeiras', 'Cozinha equipada', 'Banheiros'],
        availability: true,
        maintenanceMode: false,
        rules: ['Música até 22h', 'Limpeza obrigatória', 'Máximo 80 pessoas']
      },
      {
        id: 'space-02',
        name: 'Churrasqueira Coberta',
        type: 'bbq',
        capacity: 30,
        hourlyRate: 80.00,
        amenities: ['Grelha grande', 'Área coberta', 'Mesas para 30 pessoas', 'Pia'],
        availability: true,
        maintenanceMode: false,
        rules: ['Limpeza da churrasqueira', 'Carvão por conta do locatário']
      },
      {
        id: 'space-03',
        name: 'Quadra Poliesportiva',
        type: 'sports',
        capacity: 20,
        hourlyRate: 60.00,
        amenities: ['Quadra oficial', 'Iluminação LED', 'Vestiário', 'Material esportivo'],
        availability: true,
        maintenanceMode: false,
        rules: ['Uso de tênis obrigatório', 'Respeitar horários']
      },
      {
        id: 'space-04',
        name: 'Academia',
        type: 'gym',
        capacity: 15,
        hourlyRate: 40.00,
        amenities: ['Equipamentos modernos', 'Ar condicionado', 'Espelhos', 'Som ambiente'],
        availability: false,
        maintenanceMode: true,
        rules: ['Toalha obrigatória', 'Recolocar equipamentos no lugar']
      },
      {
        id: 'space-05',
        name: 'Área da Piscina',
        type: 'pool',
        capacity: 50,
        hourlyRate: 100.00,
        amenities: ['Piscina adulto e infantil', 'Deck', 'Guarda-sóis', 'Vestiário'],
        availability: true,
        maintenanceMode: false,
        rules: ['Criança acompanhada', 'Não é permitido vidro', 'Uso até 20h']
      },
      {
        id: 'space-06',
        name: 'Jardim dos Eventos',
        type: 'garden',
        capacity: 100,
        hourlyRate: 200.00,
        amenities: ['Área verde ampla', 'Gazebo', 'Iluminação decorativa', 'Tomadas externas'],
        availability: true,
        maintenanceMode: false,
        rules: ['Eventos até 22h', 'Decoração removível apenas']
      }
    ];

    const mockReservations: Reservation[] = [
      {
        id: 'res-001',
        spaceId: 'space-01',
        spaceName: 'Salão de Festas',
        userId: 'user-123',
        userName: 'Maria Silva Santos',
        userUnit: 'Apt 1205',
        date: '2025-01-05',
        startTime: '18:00',
        endTime: '23:00',
        duration: 5,
        totalCost: 750.00,
        status: 'confirmed',
        purpose: 'Aniversário de 50 anos',
        guestCount: 60,
        specialRequests: 'Decoração com balões azuis e dourados',
        createdAt: '2025-01-02T10:30:00',
        approvedBy: 'Administração'
      },
      {
        id: 'res-002',
        spaceId: 'space-02',
        spaceName: 'Churrasqueira Coberta',
        userId: 'user-456',
        userName: 'João Carlos Oliveira',
        userUnit: 'Apt 0804',
        date: '2025-01-06',
        startTime: '12:00',
        endTime: '17:00',
        duration: 5,
        totalCost: 400.00,
        status: 'pending',
        purpose: 'Almoço familiar',
        guestCount: 25,
        createdAt: '2025-01-03T09:15:00'
      },
      {
        id: 'res-003',
        spaceId: 'space-03',
        spaceName: 'Quadra Poliesportiva',
        userId: 'user-789',
        userName: 'Pedro Almeida Costa',
        userUnit: 'Apt 1510',
        date: '2025-01-04',
        startTime: '08:00',
        endTime: '10:00',
        duration: 2,
        totalCost: 120.00,
        status: 'completed',
        purpose: 'Treino de futebol',
        guestCount: 15,
        createdAt: '2025-01-01T15:20:00',
        approvedBy: 'Administração'
      },
      {
        id: 'res-004',
        spaceId: 'space-05',
        spaceName: 'Área da Piscina',
        userId: 'user-321',
        userName: 'Ana Beatriz Santos',
        userUnit: 'Apt 0302',
        date: '2025-01-07',
        startTime: '14:00',
        endTime: '18:00',
        duration: 4,
        totalCost: 400.00,
        status: 'confirmed',
        purpose: 'Festa infantil',
        guestCount: 35,
        specialRequests: 'Decoração temática de princesa',
        createdAt: '2025-01-02T16:45:00',
        approvedBy: 'Administração'
      },
      {
        id: 'res-005',
        spaceId: 'space-01',
        spaceName: 'Salão de Festas',
        userId: 'user-654',
        userName: 'Roberto Ferreira Lima',
        userUnit: 'Apt 0605',
        date: '2025-01-10',
        startTime: '19:00',
        endTime: '23:00',
        duration: 4,
        totalCost: 600.00,
        status: 'pending',
        purpose: 'Formatura da filha',
        guestCount: 70,
        specialRequests: 'Necessário projetor para apresentação',
        createdAt: '2025-01-03T11:30:00'
      }
    ];

    const mockStats: ReservationStats = {
      totalReservations: 24,
      thisMonth: 5,
      pendingApproval: 2,
      revenue: 4800.00,
      utilizationRate: 65,
      popularSpace: 'Salão de Festas',
      averageDuration: 3.8,
      cancelledRate: 8
    };

    setSpaces(mockSpaces);
    setReservations(mockReservations);
    setStats(mockStats);
  }, []);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getSpaceIcon = (type: string) => {
    switch (type) {
      case 'salon': return <Utensils className="w-5 h-5" />;
      case 'bbq': return <Utensils className="w-5 h-5" />;
      case 'sports': return <Gamepad2 className="w-5 h-5" />;
      case 'gym': return <Dumbbell className="w-5 h-5" />;
      case 'pool': return <Waves className="w-5 h-5" />;
      case 'garden': return <TreePine className="w-5 h-5" />;
      case 'garage': return <Car className="w-5 h-5" />;
      default: return <Building className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <Star className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleReservationAction = (reservationId: string, action: 'approve' | 'cancel') => {
    setReservations(prev => prev.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, status: action === 'approve' ? 'confirmed' : 'cancelled' }
        : reservation
    ));
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSpace = selectedSpace === 'all' || reservation.spaceId === selectedSpace;
    const matchesStatus = selectedStatus === 'all' || reservation.status === selectedStatus;
    const matchesSearch = searchTerm === '' ||
      reservation.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.spaceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSpace && matchesStatus && matchesSearch;
  });

  // Calendar logic
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const reservationsForDay = reservations.filter(res =>
        new Date(res.date).toDateString() === currentDate.toDateString()
      );

      days.push({
        date: day,
        fullDate: currentDate,
        reservations: reservationsForDay
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

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
              <CalendarIcon className="w-8 h-8 text-purple-600" />
              Reservas de Espaços
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestão de reservas e agendamentos do condomínio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={calendarView} onValueChange={setCalendarView}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="day">Dia</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Relatório
            </Button>

            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Reserva
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Reservas Este Mês</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+25%</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <CalendarIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aguardando Aprovação</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingApproval}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Atenção</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <UserCheck className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Receita do Mês</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.revenue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">Meta: 6k</span>
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Ocupação</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.utilizationRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Progress value={stats.utilizationRate} className="w-16 h-1" />
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Calendário de Reservas
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-7 gap-1">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => (
                      <div
                        key={index}
                        className={`
                          relative h-20 border border-gray-200 dark:border-gray-700 rounded-lg p-1
                          ${!day ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'}
                          ${day && day.reservations.length > 0 ? 'border-purple-300 dark:border-purple-700' : ''}
                        `}
                      >
                        {day && (
                          <>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {day.date}
                            </div>
                            <div className="mt-1 space-y-1">
                              {day.reservations.slice(0, 2).map((reservation) => (
                                <div
                                  key={reservation.id}
                                  className={`
                                    text-xs px-1 py-0.5 rounded truncate
                                    ${getStatusColor(reservation.status)}
                                  `}
                                >
                                  {reservation.startTime} {reservation.spaceName.split(' ')[0]}
                                </div>
                              ))}
                              {day.reservations.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{day.reservations.length - 2} mais
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Spaces List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Espaços Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {spaces.map((space) => (
                  <div
                    key={space.id}
                    className={`
                      p-4 rounded-lg border border-gray-200 dark:border-gray-700
                      ${space.availability && !space.maintenanceMode
                        ? 'bg-gray-50/50 dark:bg-gray-900/50'
                        : 'bg-gray-100 dark:bg-gray-800 opacity-60'}
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                          {getSpaceIcon(space.type)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                            {space.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            até {space.capacity} pessoas
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={space.availability && !space.maintenanceMode ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {space.maintenanceMode ? 'Manutenção' : space.availability ? 'Disponível' : 'Ocupado'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(space.hourlyRate)}/hora
                      </div>

                      <div className="space-y-1">
                        {space.amenities.slice(0, 2).map((amenity, index) => (
                          <div key={index} className="text-gray-600 dark:text-gray-400">
                            • {amenity}
                          </div>
                        ))}
                        {space.amenities.length > 2 && (
                          <div className="text-purple-600 cursor-pointer hover:underline">
                            +{space.amenities.length - 2} comodidades
                          </div>
                        )}
                      </div>

                      {space.availability && !space.maintenanceMode && (
                        <Button size="sm" className="w-full mt-2">
                          <Plus className="w-3 h-3 mr-1" />
                          Reservar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Reservations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <Tabs defaultValue="upcoming" className="w-full">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                  <TabsList className="grid w-full lg:w-auto grid-cols-4">
                    <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="completed">Concluídas</TabsTrigger>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                  </TabsList>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Buscar reservas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                    />

                    <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Espaço" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os espaços</SelectItem>
                        {spaces.map((space) => (
                          <SelectItem key={space.id} value={space.id}>
                            {space.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="confirmed">Confirmadas</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="cancelled">Canceladas</SelectItem>
                        <SelectItem value="completed">Concluídas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <TabsContent value="upcoming" className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredReservations
                    .filter(res => res.status === 'confirmed' && new Date(res.date) >= new Date())
                    .map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onAction={handleReservationAction}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredReservations
                    .filter(res => res.status === 'pending')
                    .map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onAction={handleReservationAction}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="completed" className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredReservations
                    .filter(res => res.status === 'completed')
                    .map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onAction={handleReservationAction}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="all" className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredReservations.map((reservation) => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      onAction={handleReservationAction}
                    />
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

// Componente para card de reserva
interface ReservationCardProps {
  reservation: Reservation;
  onAction: (reservationId: string, action: 'approve' | 'cancel') => void;
}

const ReservationCard: React.FC<ReservationCardProps> = ({ reservation, onAction }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'completed': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'completed': return <Star className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <motion.div
      layout
      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <CalendarIcon className="w-4 h-4 text-purple-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {reservation.spaceName}
              </h4>
              <Badge className={`text-xs ${getStatusColor(reservation.status)}`}>
                {getStatusIcon(reservation.status)}
                {reservation.status === 'confirmed' ? 'Confirmada' :
                 reservation.status === 'pending' ? 'Pendente' :
                 reservation.status === 'cancelled' ? 'Cancelada' : 'Concluída'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {reservation.userName} ({reservation.userUnit})
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {new Date(reservation.date).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {reservation.startTime} às {reservation.endTime}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {reservation.guestCount} convidados
              </div>
            </div>

            <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong>Evento:</strong> {reservation.purpose}
            </div>

            {reservation.specialRequests && (
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                <strong>Observações:</strong> {reservation.specialRequests}
              </div>
            )}
          </div>
        </div>

        <div className="text-right ml-4">
          <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {formatCurrency(reservation.totalCost)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {reservation.duration}h • {formatCurrency(reservation.totalCost / reservation.duration)}/h
          </div>

          {reservation.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onAction(reservation.id, 'approve')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onAction(reservation.id, 'cancel')}
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Reservas;