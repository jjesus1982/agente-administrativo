"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, X, Check, CheckCheck, Trash2, Settings, Filter, Search,
  AlertTriangle, Info, CheckCircle, Clock, User, DollarSign,
  Calendar, Package, MessageSquare, Zap, Eye, Archive,
  MoreHorizontal, Circle
} from 'lucide-react';

// 🔔 TIPOS E INTERFACES
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'financial' | 'maintenance' | 'communication' | 'system' | 'security';
  timestamp: Date;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  sender?: string;
  avatar?: string;
}

interface NotificationsCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

// 📝 MOCK DE NOTIFICAÇÕES
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Novo boleto vencido',
    message: 'Apto 301 - Boleto de dezembro/2025 venceu há 3 dias',
    type: 'warning',
    priority: 'high',
    category: 'financial',
    timestamp: new Date('2025-12-28T10:30:00'),
    read: false,
    archived: false,
    actionUrl: '/management/financeiro?filter=vencidos',
    actionLabel: 'Ver inadimplência',
    sender: 'Sistema Financeiro'
  },
  {
    id: '2',
    title: 'Nova reserva confirmada',
    message: 'Salão de festas reservado para 05/01/2026 por Maria Silva',
    type: 'success',
    priority: 'medium',
    category: 'communication',
    timestamp: new Date('2025-12-30T15:20:00'),
    read: false,
    archived: false,
    actionUrl: '/reservas',
    actionLabel: 'Ver agenda',
    sender: 'Maria Silva',
    avatar: '/avatars/maria.jpg'
  },
  {
    id: '3',
    title: 'Manutenção programada',
    message: 'Limpeza da caixa d\'água agendada para amanhã às 8h',
    type: 'info',
    priority: 'medium',
    category: 'maintenance',
    timestamp: new Date('2025-12-30T09:15:00'),
    read: true,
    archived: false,
    sender: 'Administração'
  },
  {
    id: '4',
    title: 'Backup concluído',
    message: 'Backup automático do sistema finalizado com sucesso',
    type: 'success',
    priority: 'low',
    category: 'system',
    timestamp: new Date('2025-12-30T02:00:00'),
    read: true,
    archived: false,
    sender: 'Sistema'
  },
  {
    id: '5',
    title: 'Tentativa de acesso negada',
    message: 'Múltiplas tentativas de login falharam para usuário admin',
    type: 'error',
    priority: 'urgent',
    category: 'security',
    timestamp: new Date('2025-12-30T22:45:00'),
    read: false,
    archived: false,
    actionUrl: '/security/logs',
    actionLabel: 'Ver logs',
    sender: 'Sistema de Segurança'
  },
  {
    id: '6',
    title: 'Nova encomenda registrada',
    message: 'Apto 205 - Encomenda dos Correios chegou na portaria',
    type: 'info',
    priority: 'medium',
    category: 'communication',
    timestamp: new Date('2025-12-30T11:30:00'),
    read: true,
    archived: false,
    sender: 'Portaria'
  }
];

// 🎨 CONFIGURAÇÕES DE ESTILO
const typeStyles = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: Info, iconColor: 'text-blue-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertTriangle, iconColor: 'text-yellow-500' },
  success: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircle, iconColor: 'text-green-500' },
  error: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
  system: { bg: 'bg-gray-50', border: 'border-gray-200', icon: Zap, iconColor: 'text-gray-500' }
};

const categoryIcons = {
  financial: DollarSign,
  maintenance: Settings,
  communication: MessageSquare,
  system: Zap,
  security: AlertTriangle
};

// 🕒 FORMATADOR DE TEMPO
const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// 📱 COMPONENTE PRINCIPAL
export default function NotificationsCenter({ isOpen, onClose }: NotificationsCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  // ⌨️ FECHAR COM ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // 🔍 FILTRAR NOTIFICAÇÕES
  const filteredNotifications = notifications.filter(notification => {
    // Filtro por status
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'archived' && !notification.archived) return false;
    if (filter !== 'archived' && notification.archived) return false;

    // Filtro por categoria
    if (selectedCategory !== 'all' && notification.category !== selectedCategory) return false;

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        (notification.sender && notification.sender.toLowerCase().includes(query))
      );
    }

    return true;
  });

  // ✅ MARCAR COMO LIDA
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // ✅✅ MARCAR TODAS COMO LIDAS
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  // 🗑️ REMOVER NOTIFICAÇÃO
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 📦 ARQUIVAR NOTIFICAÇÃO
  const archiveNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, archived: true } : n)
    );
  };

  // 🔢 CONTAR NÃO LIDAS
  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex items-start justify-end pt-4 pr-4 h-full">
        <div
          ref={containerRef}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden animate-fade-in h-[90vh] flex flex-col"
        >

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-6 h-6 text-blue-600" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Notificações</h2>
                <p className="text-sm text-gray-600">{filteredNotifications.length} itens</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            {/* Busca */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar notificações..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtros de status */}
            <div className="flex gap-2 mb-3">
              {[
                { key: 'all', label: 'Todas' },
                { key: 'unread', label: 'Não lidas' },
                { key: 'archived', label: 'Arquivadas' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === key
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filtros de categoria */}
            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Todas
              </button>
              {Object.entries(categoryIcons).map(([category, Icon]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {category === 'financial' ? 'Financeiro' :
                   category === 'maintenance' ? 'Manutenção' :
                   category === 'communication' ? 'Comunicação' :
                   category === 'system' ? 'Sistema' : 'Segurança'}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Bell className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium">Nenhuma notificação</p>
                <p className="text-xs">Não há itens para exibir</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification) => {
                  const typeStyle = typeStyles[notification.type];
                  const Icon = typeStyle.icon;
                  const CategoryIcon = categoryIcons[notification.category];

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Status Indicator */}
                        <div className="flex-shrink-0 mt-1">
                          {!notification.read ? (
                            <Circle className="w-2 h-2 text-blue-500 fill-current" />
                          ) : (
                            <div className="w-2 h-2" />
                          )}
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${typeStyle.bg} border ${typeStyle.border}`}>
                            <Icon className={`w-4 h-4 ${typeStyle.iconColor}`} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {notification.message}
                              </p>

                              {/* Metadata */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <CategoryIcon className="w-3 h-3" />
                                  <span>{notification.sender}</span>
                                </div>
                                <Clock className="w-3 h-3" />
                                <span>{formatRelativeTime(notification.timestamp)}</span>
                                {notification.priority === 'urgent' && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                                    Urgente
                                  </span>
                                )}
                              </div>

                              {/* Action Button */}
                              {notification.actionUrl && notification.actionLabel && (
                                <button
                                  onClick={() => {
                                    router.push(notification.actionUrl!);
                                    markAsRead(notification.id);
                                    onClose();
                                  }}
                                  className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {notification.actionLabel} →
                                </button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 ml-2">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                  title="Marcar como lida"
                                >
                                  <Check className="w-3 h-3 text-gray-500" />
                                </button>
                              )}
                              <button
                                onClick={() => archiveNotification(notification.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Arquivar"
                              >
                                <Archive className="w-3 h-3 text-gray-500" />
                              </button>
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Remover"
                              >
                                <Trash2 className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => {
                router.push('/notifications');
                onClose();
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Ver todas as notificações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎯 Hook para usar Notifications Center
export function useNotificationsCenter() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Contar notificações não lidas (simulado)
  const unreadCount = mockNotifications.filter(n => !n.read && !n.archived).length;

  return {
    isNotificationsOpen,
    unreadCount,
    openNotifications: () => setIsNotificationsOpen(true),
    closeNotifications: () => setIsNotificationsOpen(false)
  };
}