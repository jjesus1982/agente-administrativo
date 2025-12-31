"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Command, ArrowRight, Clock, Star, FileText, Users,
  Calculator, Settings, Home, BarChart3, Calendar, Package,
  AlertTriangle, Megaphone, Building2, X, Zap
} from 'lucide-react';

// 🔍 TIPOS E INTERFACES
interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: 'pages' | 'actions' | 'recent' | 'favorites';
  icon: React.ComponentType<any>;
  path?: string;
  action?: () => void;
  keywords: string[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

// 📋 DADOS DE BUSCA
const searchData: SearchItem[] = [
  // Páginas
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Visão geral do sistema',
    category: 'pages',
    icon: Home,
    path: '/dashboard',
    keywords: ['dashboard', 'home', 'inicio', 'principal', 'overview']
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Gestão financeira e boletos',
    category: 'pages',
    icon: Calculator,
    path: '/management/financeiro',
    keywords: ['financeiro', 'boletos', 'receitas', 'despesas', 'cobrança', 'pagamentos']
  },
  {
    id: 'reservas',
    title: 'Reservas',
    description: 'Gestão de reservas de espaços',
    category: 'pages',
    icon: Calendar,
    path: '/reservas',
    keywords: ['reservas', 'agenda', 'espaços', 'agendamento']
  },
  {
    id: 'comunicados',
    title: 'Comunicados',
    description: 'Avisos e comunicações',
    category: 'pages',
    icon: Megaphone,
    path: '/announcements',
    keywords: ['comunicados', 'avisos', 'noticias', 'informes']
  },
  {
    id: 'ocorrencias',
    title: 'Ocorrências',
    description: 'Registro de ocorrências',
    category: 'pages',
    icon: AlertTriangle,
    path: '/occurrences',
    keywords: ['ocorrencias', 'problemas', 'reclamações', 'incidentes']
  },
  {
    id: 'encomendas',
    title: 'Encomendas',
    description: 'Controle de encomendas',
    category: 'pages',
    icon: Package,
    path: '/encomendas',
    keywords: ['encomendas', 'entregas', 'pacotes', 'correspondencia']
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    description: 'Relatórios e analytics',
    category: 'pages',
    icon: BarChart3,
    path: '/reports',
    keywords: ['relatorios', 'dados', 'analytics', 'estatisticas']
  },
  {
    id: 'ia-overview',
    title: 'IA - Visão Geral',
    description: 'Inteligência artificial e insights',
    category: 'pages',
    icon: Zap,
    path: '/ia/overview',
    keywords: ['ia', 'inteligencia', 'artificial', 'ai', 'insights', 'automação']
  },

  // Ações Rápidas
  {
    id: 'action-boleto',
    title: 'Emitir Novo Boleto',
    description: 'Criar novo boleto de cobrança',
    category: 'actions',
    icon: FileText,
    keywords: ['boleto', 'emitir', 'cobrança', 'novo'],
    action: () => console.log('Emitir boleto')
  },
  {
    id: 'action-comunicado',
    title: 'Novo Comunicado',
    description: 'Criar novo comunicado',
    category: 'actions',
    icon: Megaphone,
    keywords: ['comunicado', 'aviso', 'novo', 'criar'],
    action: () => console.log('Novo comunicado')
  },
  {
    id: 'action-ocorrencia',
    title: 'Registrar Ocorrência',
    description: 'Registrar nova ocorrência',
    category: 'actions',
    icon: AlertTriangle,
    keywords: ['ocorrencia', 'registrar', 'problema', 'novo'],
    action: () => console.log('Nova ocorrência')
  },
  {
    id: 'action-relatorio',
    title: 'Gerar Relatório',
    description: 'Gerar relatório personalizado',
    category: 'actions',
    icon: BarChart3,
    keywords: ['relatorio', 'gerar', 'exportar', 'dados'],
    action: () => console.log('Gerar relatório')
  }
];

const categoryLabels = {
  pages: 'Páginas',
  actions: 'Ações Rápidas',
  recent: 'Recentes',
  favorites: 'Favoritos'
};

// 🎨 COMPONENTE PRINCIPAL
export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredResults, setFilteredResults] = useState<SearchItem[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // 🔍 FILTRAR RESULTADOS
  useEffect(() => {
    if (!query.trim()) {
      setFilteredResults(searchData.slice(0, 8)); // Mostrar alguns padrões
      setSelectedIndex(0);
      return;
    }

    const filtered = searchData.filter(item => {
      const searchTerms = query.toLowerCase().split(' ');
      return searchTerms.every(term =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.keywords.some(keyword => keyword.includes(term))
      );
    });

    setFilteredResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  // ⌨️ MANIPULAR TECLADO
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelectItem(filteredResults[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      inputRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedIndex, filteredResults, onClose]);

  // 📍 SELECIONAR ITEM
  const handleSelectItem = (item: SearchItem) => {
    if (item.path) {
      router.push(item.path);
    } else if (item.action) {
      item.action();
    }
    onClose();
    setQuery('');
  };

  // 📑 AGRUPAR POR CATEGORIA
  const groupedResults = filteredResults.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, SearchItem[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex items-start justify-center pt-[10vh] px-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden animate-fade-in">

          {/* Header de Busca */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busque páginas, ações ou conteúdo..."
              className="flex-1 text-lg bg-transparent border-none outline-none text-gray-900 placeholder-gray-500"
            />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded-md font-mono">⌘K</kbd>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resultados */}
          <div className="max-h-96 overflow-y-auto">
            {filteredResults.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  {query ? 'Nenhum resultado encontrado' : 'Digite para buscar...'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category} className="mb-4 last:mb-0">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </div>
                    <div className="space-y-1">
                      {items.map((item, index) => {
                        const globalIndex = filteredResults.indexOf(item);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{item.title}</div>
                              <div className="text-sm text-gray-500 truncate">
                                {item.description}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono">↑↓</kbd>
                Navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono">Enter</kbd>
                Selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white rounded border text-[10px] font-mono">Esc</kbd>
                Fechar
              </span>
            </div>
            <div className="text-gray-400">
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🎯 Hook para usar busca global
export function useGlobalSearch() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isSearchOpen,
    openSearch: () => setIsSearchOpen(true),
    closeSearch: () => setIsSearchOpen(false)
  };
}