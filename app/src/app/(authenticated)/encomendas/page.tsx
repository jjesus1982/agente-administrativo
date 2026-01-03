"use client";
import React, { useState, useEffect } from 'react';
import {
  Package, Search, Clock, AlertTriangle, CheckCircle, Truck,
  MapPin, Bell, X, RefreshCw, Plus, Barcode, Box, ShoppingBag, BarChart3
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Encomenda {
  id: number;
  unit_id: number;
  recipient_name: string;
  tracking_code: string | null;
  carrier: string;
  description: string | null;
  photo_url: string | null;
  storage_location: string | null;
  status: string;
  is_perishable: boolean;
  is_fragile: boolean;
  received_at: string;
  delivered_at: string | null;
  delivered_to: string | null;
  block: string | null;
  unit_number: string | null;
}

interface Stats {
  pending: number;
  overdue: number;
  perishable: number;
  delivered_today: number;
  total: number;
}

// Skeleton Loading Components
const StatCardSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      <div className="flex-1">
        <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="w-8 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  </div>
);

const ChartSkeleton = ({ height = "300px" }) => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
    <div className={`w-full bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse`} style={{ height }} />
  </div>
);

const PackageCardSkeleton = () => (
  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
    <div className="flex gap-4 mb-4">
      <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="w-1/2 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
    <div className="flex gap-2 mb-4">
      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="w-20 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
    </div>
    <div className="flex gap-2">
      <div className="flex-1 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
    </div>
  </div>
);

const carrierConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'Correios': { icon: <Package size={20}/>, color: '#f4c542' },
  'Sedex': { icon: <Truck size={20}/>, color: '#e74c3c' },
  'Amazon': { icon: <ShoppingBag size={20}/>, color: '#ff9900' },
  'Mercado Livre': { icon: <ShoppingBag size={20}/>, color: '#ffe600' },
  'iFood': { icon: <Box size={20}/>, color: '#ea1d2c' },
  'Rappi': { icon: <Box size={20}/>, color: '#ff441f' },
  'DHL': { icon: <Truck size={20}/>, color: '#d40511' },
  'default': { icon: <Box size={20}/>, color: '#64748b' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'pending': { label: 'Aguardando', color: '#f59e0b' },
  'notified': { label: 'Notificado', color: '#3b82f6' },
  'delivered': { label: 'Entregue', color: '#22c55e' },
};

export default function EncomendasPage() {
  const { currentTenant } = useTenant();
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, overdue: 0, perishable: 0, delivered_today: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('pending_all');
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEncomenda, setSelectedEncomenda] = useState<Encomenda | null>(null);
  const [deliverTo, setDeliverTo] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentTenant) fetchEncomendas(); }, [filter, search, currentTenant]);

  const fetchEncomendas = async () => {
    try {
      let url = `${API_BASE}/encomendas?limit=100`;
      if (filter) url += `&status=${filter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const data = await res.json();
      setEncomendas(data.encomendas || []);
      setStats(data.stats || {});
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeliver = async () => {
    if (!selectedEncomenda || !deliverTo.trim()) return;
    await fetch(`${API_BASE}/encomendas/${selectedEncomenda.id}/deliver?tenant_id=${currentTenant?.tenant_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivered_to: deliverTo })
    });
    setShowDeliverModal(false);
    setDeliverTo('');
    setSelectedEncomenda(null);
    fetchEncomendas();
  };

  const handleNotify = async (id: number) => {
    await fetch(`${API_BASE}/encomendas/${id}/notify?tenant_id=${currentTenant?.tenant_id}`, { method: 'POST' });
    fetchEncomendas();
  };

  const getAging = (receivedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(receivedAt).getTime()) / 3600000);
    if (hours < 1) return { text: 'Agora', color: '#22c55e' };
    if (hours < 24) return { text: `${hours}h`, color: '#22c55e' };
    const days = Math.floor(hours / 24);
    if (days < 3) return { text: `${days}d`, color: '#f59e0b' };
    return { text: `${days}d`, color: '#ef4444' };
  };

  const getCarrier = (carrier: string) => {
    const found = carrierConfig[carrier] ?? carrierConfig['default'];
    return found ?? { name: 'Outra', icon: <Package size={24}/>, color: '#6b7280' };
  };

  // Chart.js Analytics Data
  const carrierData = {
    labels: Object.keys(carrierConfig).filter(c => c !== 'default').slice(0, 6),
    datasets: [{
      label: 'Encomendas por Transportadora',
      data: Object.keys(carrierConfig).filter(c => c !== 'default').slice(0, 6).map(carrier =>
        encomendas.filter(e => e.carrier === carrier).length
      ),
      backgroundColor: [
        'rgba(244, 197, 66, 0.8)',  // Correios
        'rgba(231, 76, 60, 0.8)',   // Sedex
        'rgba(255, 153, 0, 0.8)',   // Amazon
        'rgba(255, 230, 0, 0.8)',   // Mercado Livre
        'rgba(234, 29, 44, 0.8)',   // iFood
        'rgba(255, 68, 31, 0.8)'    // Rappi
      ],
      borderColor: [
        '#f4c542', '#e74c3c', '#ff9900', '#ffe600', '#ea1d2c', '#ff441f'
      ],
      borderWidth: 2
    }]
  };

  const statusData = {
    labels: ['Aguardando', 'Notificado', 'Entregue'],
    datasets: [{
      label: 'Status das Encomendas',
      data: [
        encomendas.filter(e => e.status === 'pending').length,
        encomendas.filter(e => e.status === 'notified').length,
        encomendas.filter(e => e.status === 'delivered').length
      ],
      backgroundColor: [
        'rgba(245, 158, 11, 0.8)', // amber - aguardando
        'rgba(59, 130, 246, 0.8)', // blue - notificado
        'rgba(34, 197, 94, 0.8)'   // green - entregue
      ],
      borderColor: ['#f59e0b', '#3b82f6', '#22c55e'],
      borderWidth: 2
    }]
  };

  // Dados de tendência diária
  const dailyData = {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Recebidas',
        data: [15, 22, 18, 25, 20, 8, 12],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      },
      {
        label: 'Entregues',
        data: [12, 18, 15, 22, 18, 10, 8],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com gradiente e design moderno */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
              <Package size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Smart Logistics</h1>
              <p className="text-white/80 text-lg">Gestão inteligente de encomendas e entregas</p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewModal(true)}
            className="bg-white text-amber-600 hover:bg-gray-100 font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <Plus size={20}/> Nova Encomenda
          </Button>
        </div>

        {/* Stats Cards com design moderno */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({length: 4}).map((_, index) => <StatCardSkeleton key={index} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              onClick={() => setFilter('pending_all')}
              className={`rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer ${
                filter === 'pending_all' ? 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-amber-500/25' : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Package size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.pending}</div>
                  <div className="text-white/80 text-sm">Aguardando</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer relative">
              {stats.overdue > 0 && (
                <div className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full animate-pulse" />
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <AlertTriangle size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.overdue}</div>
                  <div className="text-white/80 text-sm">Atrasadas</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer relative">
              {stats.perishable > 0 && (
                <div className="absolute top-3 right-3 w-3 h-3 bg-white rounded-full animate-pulse" />
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <Box size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.perishable}</div>
                  <div className="text-white/80 text-sm">Perecíveis</div>
                </div>
              </div>
            </div>

            <div
              onClick={() => setFilter('delivered')}
              className={`rounded-2xl p-6 shadow-lg text-white transform transition-all duration-200 hover:scale-105 cursor-pointer ${
                filter === 'delivered' ? 'bg-gradient-to-br from-green-600 to-green-700 shadow-green-500/25' : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                  <CheckCircle size={24} />
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{stats.delivered_today}</div>
                  <div className="text-white/80 text-sm">Entregues Hoje</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Charts */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Por Transportadora</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Doughnut data={carrierData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Por Status</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Bar data={statusData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={24} className="text-green-600" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tendência Semanal</h3>
              </div>
              <div style={{ height: '280px' }}>
                <Line data={dailyData} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartSkeleton height="280px" />
            <ChartSkeleton height="280px" />
            <ChartSkeleton height="280px" />
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 min-w-0 relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, unidade ou código de rastreio..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'pending_all', label: 'Pendentes', color: 'bg-amber-500', count: stats.pending },
                { key: 'delivered', label: 'Entregues', color: 'bg-green-500' },
                { key: '', label: 'Todas', color: 'bg-gray-500' }
              ].map(filterOption => (
                <button
                  key={filterOption.key}
                  onClick={() => setFilter(filterOption.key)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${
                    filter === filterOption.key
                      ? `${filterOption.color} text-white shadow-lg`
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filterOption.label}
                  {filterOption.count !== undefined && (
                    <span className="ml-2 px-2 py-1 bg-white/20 rounded-lg text-xs">
                      {filterOption.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Package List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({length: 6}).map((_, index) => <PackageCardSkeleton key={index} />)}
          </div>
        ) : encomendas.length === 0 ? (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 shadow-lg border border-gray-100 dark:border-gray-700 text-center">
            <div className="flex flex-col items-center gap-6">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-full p-6">
                <Package size={48} className="text-gray-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">Nenhuma encomenda encontrada</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Registre uma nova encomenda ou altere os filtros de busca</p>
                <Button
                  onClick={() => setShowNewModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transform transition-all duration-200 hover:scale-105"
                >
                  <Plus size={16}/> Registrar Primeira Encomenda
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {encomendas.map(enc => {
              const aging = getAging(enc.received_at);
              const carrier = getCarrier(enc.carrier);
              const status = statusConfig[enc.status] ?? statusConfig['pending'] ?? { label: 'Aguardando', color: '#f59e0b' };

              return (
                <div
                  key={enc.id}
                  className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border transform transition-all duration-200 hover:scale-[1.02] hover:shadow-xl group ${
                    aging.color === '#ef4444' ? 'border-red-200 shadow-red-100 dark:border-red-800 dark:shadow-red-900/20' : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  <div className="h-1 rounded-full mb-4" style={{ backgroundColor: status.color }} />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${carrier.color}20`, color: carrier.color }}
                      >
                        {carrier.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200">
                          {enc.recipient_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{enc.block}-{enc.unit_number}</p>
                      </div>
                    </div>
                    <div
                      className="px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                      style={{ backgroundColor: `${aging.color}20`, color: aging.color }}
                    >
                      <Clock size={12}/> {aging.text}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs">
                      <Truck size={12}/> {enc.carrier}
                    </span>
                    {enc.storage_location && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs">
                        <MapPin size={12}/> {enc.storage_location}
                      </span>
                    )}
                    {enc.is_perishable && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-md text-xs">
                        <AlertTriangle size={12}/> Perecível
                      </span>
                    )}
                  </div>

                  {enc.tracking_code && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4 font-mono">
                      <Barcode size={12}/> {enc.tracking_code}
                    </div>
                  )}

                  {enc.status !== 'delivered' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedEncomenda(enc); setShowDeliverModal(true); }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={16}/> Entregar
                      </button>
                      <button
                        onClick={() => handleNotify(enc.id)}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 p-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                        title="Notificar morador"
                      >
                        <Bell size={16}/>
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 font-medium">
                      <CheckCircle size={14}/> Retirado por {enc.delivered_to}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal Entregar */}
      {showDeliverModal && selectedEncomenda && (
        <Modal onClose={() => { setShowDeliverModal(false); setDeliverTo(''); }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={24} style={{ color: '#22c55e' }}/> Confirmar Entrega
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Encomenda para <strong>{selectedEncomenda.recipient_name}</strong> ({selectedEncomenda.block}-{selectedEncomenda.unit_number})
          </p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Nome de quem está retirando:</label>
            <input type="text" value={deliverTo} onChange={e => setDeliverTo(e.target.value)} placeholder="Digite o nome completo" autoFocus
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button variant="ghost" onClick={() => setShowDeliverModal(false)} style={{ flex: 1 }}>Cancelar</Button>
            <Button onClick={handleDeliver} disabled={!deliverTo.trim()} style={{ flex: 1, background: '#22c55e' }}>Confirmar</Button>
          </div>
        </Modal>
      )}

      {/* Modal Nova Encomenda */}
      {showNewModal && <NewModal onClose={() => setShowNewModal(false)} onSuccess={() => { setShowNewModal(false); fetchEncomendas(); }} tenantId={currentTenant?.tenant_id}/>}

      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>
    </div>
  );
}

function StatCard({ label, value, color, icon, active, onClick, pulse }: any) {
  return (
    <div onClick={onClick} style={{ background: active ? `${color}15` : 'var(--bg-secondary)', border: `1px solid ${active ? color : 'var(--border-color)'}`, borderRadius: '12px', padding: '1rem', cursor: onClick ? 'pointer' : 'default', position: 'relative' }}>
      {pulse && value > 0 && <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '8px', height: '8px', borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }}/>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><div style={{ color }}>{icon}</div><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span></div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: active ? color : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function FilterPill({ label, active, onClick, count }: any) {
  return (
    <button onClick={onClick} style={{ padding: '0.5rem 0.875rem', borderRadius: '20px', border: 'none', background: active ? 'var(--accent)' : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {label}{count !== undefined && <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)', padding: '0.125rem 0.375rem', borderRadius: '10px', fontSize: '0.7rem' }}>{count}</span>}
    </button>
  );
}

function Badge({ icon, text, color }: any) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '6px', background: color ? `${color}20` : 'var(--bg-tertiary)', color: color || 'var(--text-muted)', fontSize: '0.75rem' }}>{icon} {text}</span>;
}

function Modal({ children, onClose }: any) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', padding: '1.5rem', maxWidth: '400px', width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
        {children}
      </div>
    </div>
  );
}

function NewModal({ onClose, onSuccess, tenantId }: any) {
  const [form, setForm] = useState({ unit_id: '', recipient_name: '', carrier: 'Correios', tracking_code: '', storage_location: '', is_perishable: false });
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch(`${API_BASE}/units?tenant_id=${tenantId}&limit=1000`).then(r => r.json()).then(d => setUnits(d.items || [])); }, [tenantId]);

  const handleSubmit = async () => {
    if (!form.unit_id || !form.recipient_name) return;
    setLoading(true);
    await fetch(`${API_BASE}/encomendas?tenant_id=${tenantId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, unit_id: parseInt(form.unit_id) }) });
    setLoading(false);
    onSuccess();
  };

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Package size={24} style={{ color: '#f59e0b' }}/> Nova Encomenda</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Unidade *</label>
          <select value={form.unit_id} onChange={e => setForm({...form, unit_id: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            <option value="">Selecione...</option>
            {units.map((u: any) => <option key={u.id} value={u.id}>{u.block}-{u.number}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Destinatário *</label>
          <input type="text" value={form.recipient_name} onChange={e => setForm({...form, recipient_name: e.target.value})} placeholder="Nome do morador" style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Transportadora</label>
          <select value={form.carrier} onChange={e => setForm({...form, carrier: e.target.value})} style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
            {['Correios', 'Sedex', 'Amazon', 'Mercado Livre', 'iFood', 'Rappi', 'DHL', 'Outros'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Código Rastreio</label>
          <input type="text" value={form.tracking_code} onChange={e => setForm({...form, tracking_code: e.target.value})} placeholder="BR123456789BR" style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.85rem' }}>Localização</label>
          <input type="text" value={form.storage_location} onChange={e => setForm({...form, storage_location: e.target.value})} placeholder="Prateleira A1" style={{ width: '100%', padding: '0.625rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}/>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.is_perishable} onChange={e => setForm({...form, is_perishable: e.target.checked})}/>
          <span style={{ fontSize: '0.85rem' }}>Perecível</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading || !form.unit_id || !form.recipient_name} style={{ flex: 1 }}>Registrar</Button>
      </div>
    </Modal>
  );
}
