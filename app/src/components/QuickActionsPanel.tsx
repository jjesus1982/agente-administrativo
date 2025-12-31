"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap, Plus, FileText, Calendar, Users, MessageSquare, AlertTriangle,
  Package, Calculator, PieChart, Upload, Download, RefreshCw, Settings,
  Sparkles, Clock, X, ChevronRight
} from 'lucide-react';

// 🚀 TIPOS E INTERFACES
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'create' | 'manage' | 'reports' | 'system';
  action: () => void;
  shortcut?: string;
  badge?: number;
  color: string;
  bgColor: string;
}

interface QuickActionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ⚡ AÇÕES RÁPIDAS
const createQuickActions = (router: any): QuickAction[] => [
  // Criar/Adicionar
  {
    id: 'create-boleto',
    title: 'Novo Boleto',
    description: 'Emitir boleto de cobrança',
    icon: FileText,
    category: 'create',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    action: () => router.push('/management/financeiro?action=new-boleto'),
    shortcut: 'Ctrl+B'
  },
  {
    id: 'create-comunicado',
    title: 'Novo Comunicado',
    description: 'Criar comunicado para moradores',
    icon: MessageSquare,
    category: 'create',
    color: '#8b5cf6',
    bgColor: '#f3e8ff',
    action: () => router.push('/announcements?action=new'),
    shortcut: 'Ctrl+N'
  },
  {
    id: 'create-ocorrencia',
    title: 'Registrar Ocorrência',
    description: 'Cadastrar nova ocorrência',
    icon: AlertTriangle,
    category: 'create',
    color: '#ef4444',
    bgColor: '#fef2f2',
    action: () => router.push('/occurrences?action=new')
  },
  {
    id: 'create-reserva',
    title: 'Nova Reserva',
    description: 'Agendar espaço comum',
    icon: Calendar,
    category: 'create',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    action: () => router.push('/reservas?action=new')
  },

  // Gerenciar
  {
    id: 'manage-usuarios',
    title: 'Gerenciar Usuários',
    description: 'Administrar moradores',
    icon: Users,
    category: 'manage',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    action: () => router.push('/management/usuarios')
  },
  {
    id: 'manage-encomendas',
    title: 'Controlar Encomendas',
    description: 'Gerenciar entregas',
    icon: Package,
    category: 'manage',
    color: '#06b6d4',
    bgColor: '#cffafe',
    action: () => router.push('/encomendas'),
    badge: 3
  },
  {
    id: 'sync-banco',
    title: 'Sincronizar Banco',
    description: 'Atualizar dados bancários',
    icon: RefreshCw,
    category: 'system',
    color: '#84cc16',
    bgColor: '#f7fee7',
    action: () => console.log('Sincronizar banco')
  },

  // Relatórios
  {
    id: 'export-financeiro',
    title: 'Exportar Financeiro',
    description: 'Baixar relatório financeiro',
    icon: Download,
    category: 'reports',
    color: '#6366f1',
    bgColor: '#eef2ff',
    action: () => console.log('Exportar financeiro')
  },
  {
    id: 'report-inadimplencia',
    title: 'Relatório Inadimplência',
    description: 'Gerar relatório de inadimplentes',
    icon: PieChart,
    category: 'reports',
    color: '#ec4899',
    bgColor: '#fdf2f8',
    action: () => router.push('/reports?type=inadimplencia')
  },

  // Sistema
  {
    id: 'backup-sistema',
    title: 'Backup do Sistema',
    description: 'Realizar backup dos dados',
    icon: Upload,
    category: 'system',
    color: '#64748b',
    bgColor: '#f8fafc',
    action: () => console.log('Backup sistema')
  }
];

const categoryLabels = {
  create: '🚀 Criar & Adicionar',
  manage: '⚙️ Gerenciar',
  reports: '📊 Relatórios',
  system: '🔧 Sistema'
};

// 🎨 COMPONENTE PRINCIPAL
export default function QuickActionsPanel({ isOpen, onClose }: QuickActionsPanelProps) {
  const router = useRouter();
  const quickActions = createQuickActions(router);
  const [recentActions, setRecentActions] = useState<string[]>([]);

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

  // 📝 EXECUTAR AÇÃO
  const handleAction = (action: QuickAction) => {
    action.action();

    // Adicionar às recentes
    setRecentActions(prev => {
      const updated = [action.id, ...prev.filter(id => id !== action.id)].slice(0, 5);
      return updated;
    });

    onClose();
  };

  // 📑 AGRUPAR POR CATEGORIA
  const groupedActions = quickActions.reduce((groups, action) => {
    const category = action.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(action);
    return groups;
  }, {} as Record<string, QuickAction[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex items-start justify-center pt-[5vh] px-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden animate-fade-in">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                <p className="text-sm text-gray-600">Acesso rápido às funcionalidades mais usadas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Ações Recentes */}
          {recentActions.length > 0 && (
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Recentes</h3>
              </div>
              <div className="flex gap-2">
                {recentActions.slice(0, 3).map(actionId => {
                  const action = quickActions.find(a => a.id === actionId);
                  if (!action) return null;

                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action)}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div
                        className="p-1 rounded"
                        style={{ backgroundColor: action.bgColor }}
                      >
                        <Icon className="w-4 h-4" style={{ color: action.color }} />
                      </div>
                      <span className="text-sm font-medium">{action.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid de Ações */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {Object.entries(groupedActions).map(([category, actions]) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <button
                        key={action.id}
                        onClick={() => handleAction(action)}
                        className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 text-left hover:scale-[1.02]"
                      >
                        <div className="relative">
                          <div
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: action.bgColor }}
                          >
                            <Icon className="w-5 h-5" style={{ color: action.color }} />
                          </div>
                          {action.badge && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {action.badge}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {action.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {action.description}
                          </div>
                          {action.shortcut && (
                            <div className="text-xs text-gray-400 mt-1">
                              {action.shortcut}
                            </div>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono">Esc</kbd>
                Fechar
              </span>
            </div>
            <div className="text-gray-400">
              {quickActions.length} ações disponíveis
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎯 Hook para usar Quick Actions
export function useQuickActions() {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsQuickActionsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isQuickActionsOpen,
    openQuickActions: () => setIsQuickActionsOpen(true),
    closeQuickActions: () => setIsQuickActionsOpen(false)
  };
}