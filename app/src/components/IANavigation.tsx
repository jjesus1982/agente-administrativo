"use client";
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Brain, TrendingUp, Lightbulb, MessageSquare, BookOpen,
  ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui';

interface IANavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const iaNavItems: IANavItem[] = [
  {
    id: 'overview',
    label: 'Visão Geral',
    path: '/ia/overview',
    icon: Brain,
    description: 'Dashboard central de IA',
    color: '#8b5cf6'
  },
  {
    id: 'previsoes',
    label: 'Previsões',
    path: '/ia/previsoes',
    icon: TrendingUp,
    description: 'Análise preditiva de problemas',
    color: '#ef4444'
  },
  {
    id: 'sugestoes',
    label: 'Sugestões',
    path: '/ia/sugestoes',
    icon: Lightbulb,
    description: 'Recomendações automáticas',
    color: '#f59e0b'
  },
  {
    id: 'comunicacao',
    label: 'Comunicação',
    path: '/ia/comunicacao',
    icon: MessageSquare,
    description: 'Otimização inteligente',
    color: '#06b6d4'
  },
  {
    id: 'aprendizado',
    label: 'Aprendizado',
    path: '/ia/aprendizado',
    icon: BookOpen,
    description: 'Sistema evolutivo',
    color: '#8b5cf6'
  }
];

interface IANavigationProps {
  currentModule?: string;
  compact?: boolean;
}

export default function IANavigation({ currentModule, compact = false }: IANavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentPath = pathname || '';

  if (compact) {
    // Versão compacta - breadcrumb style
    return (
      <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Brain size={16} style={{ color: '#8b5cf6' }}/>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#8b5cf6' }}>
            Inteligência
          </span>

          {currentModule && (
            <>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }}/>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {currentModule}
              </span>
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            {iaNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;

              return (
                <button
                  key={item.id}
                  onClick={() => router.push(item.path)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    background: isActive ? `${item.color}15` : 'transparent',
                    border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 150ms',
                    color: isActive ? item.color : 'var(--text-muted)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = `${item.color}10`;
                      e.currentTarget.style.borderColor = `${item.color}20`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={12}/>
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  // Versão completa - cards clicáveis
  return (
    <Card style={{ marginBottom: '1.5rem' }}>
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Brain size={20} style={{ color: '#8b5cf6' }}/>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#8b5cf6' }}>
          Módulos de Inteligência
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
        padding: '1rem'
      }}>
        {iaNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path;

          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              style={{
                padding: '0.75rem',
                background: isActive ? `${item.color}15` : 'var(--bg-tertiary)',
                border: isActive ? `1px solid ${item.color}40` : '1px solid var(--border-default)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 150ms',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = `${item.color}10`;
                  e.currentTarget.style.borderColor = `${item.color}30`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)';
                  e.currentTarget.style.borderColor = 'var(--border-default)';
                }
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.375rem'
              }}>
                <Icon size={16} style={{ color: item.color }}/>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: isActive ? item.color : 'var(--text-primary)'
                }}>
                  {item.label}
                </span>
                {isActive && (
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: item.color,
                    marginLeft: 'auto'
                  }}/>
                )}
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                margin: 0
              }}>
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}