"use client";
import React, { useState, useEffect } from 'react';
import {
  Bell, BellRing, ShieldAlert, Package, CalendarCheck, CreditCard,
  Megaphone, ClipboardList, AlertTriangle, ShoppingBag, Home, Droplets, ScanFace,
  Check, X, Clock, Archive, ChevronRight, CheckCheck, Eye, Wrench,
  RefreshCw, Zap, Users, Vote
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { API_BASE } from '@/lib/api';

interface NotificationAction {
  label: string;
  action: string;
  style: 'primary' | 'secondary' | 'success' | 'danger';
}

interface Notification {
  id: number;
  type: string;
  category: string;
  priority: number;
  title: string;
  message: string;
  icon: string;
  color: string;
  reference_type: string | null;
  reference_id: number | null;
  actions: NotificationAction[] | string;
  is_read: boolean;
  is_dismissed: boolean;
  is_actioned: boolean;
  created_at: string;
}

interface Stats {
  unread: number;
  urgent: number;
  action_required: number;
  total: number;
}

const iconMap: Record<string, React.ReactNode> = {
  'shield-alert': <ShieldAlert size={20}/>,
  'droplets': <Droplets size={20}/>,
  'package': <Package size={20}/>,
  'calendar-check': <CalendarCheck size={20}/>,
  'scan-face': <ScanFace size={20}/>,
  'credit-card': <CreditCard size={20}/>,
  'megaphone': <Megaphone size={20}/>,
  'clipboard-list': <ClipboardList size={20}/>,
  'alert-triangle': <AlertTriangle size={20}/>,
  'shopping-bag': <ShoppingBag size={20}/>,
  'home': <Home size={20}/>,
  'wrench': <Wrench size={20}/>,
  'vote': <Vote size={20}/>,
  'check-circle': <Check size={20}/>,
  'bell': <Bell size={20}/>,
};

const categoryConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgente', color: '#ef4444', bg: '#ef444415', icon: <Zap size={16}/> },
  action_required: { label: 'Ação Necessária', color: '#f59e0b', bg: '#f59e0b15', icon: <Bell size={16}/> },
  info: { label: 'Informativo', color: '#3b82f6', bg: '#3b82f615', icon: <Megaphone size={16}/> },
  social: { label: 'Comunidade', color: '#22c55e', bg: '#22c55e15', icon: <Users size={16}/> },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<Stats>({ unread: 0, urgent: 0, action_required: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchNotifications(); }, [activeFilter]);

  const fetchNotifications = async () => {
    try {
      let url = `${API_BASE}/notifications?limit=100`;
      if (activeFilter) url += `&category=${activeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      setNotifications(data.notifications || []);
      setStats(data.stats || { unread: 0, urgent: 0, action_required: 0, total: 0 });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAction = async (notificationId: number, action: string) => {
    setActionLoading(notificationId);
    try {
      await fetch(`${API_BASE}/notifications/${notificationId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notificationId, action })
      });
      fetchNotifications();
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleMarkAllRead = async () => {
    await fetch(`${API_BASE}/notifications/mark-all-read`, { method: 'POST' });
    fetchNotifications();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const groupedNotifications = notifications.reduce((acc, n) => {
    const cat = n.category || 'info';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(n);
    return acc;
  }, {} as Record<string, Notification[]>);

  const categoryOrder = ['urgent', 'action_required', 'info', 'social'];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }}/>
          <p>Carregando notificações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <BellRing size={24}/>
              </div>
              Centro de Comando
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Gerencie eventos e tome decisões rápidas</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="ghost" size="sm" onClick={fetchNotifications}><RefreshCw size={16}/> Atualizar</Button>
            {stats.unread > 0 && <Button variant="ghost" size="sm" onClick={handleMarkAllRead}><CheckCheck size={16}/> Marcar todas lidas</Button>}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatsCard label="Não Lidas" value={stats.unread} color="#3b82f6" icon={<Bell size={18}/>} active={false} onClick={() => {}}/>
        <StatsCard label="Urgentes" value={stats.urgent} color="#ef4444" icon={<Zap size={18}/>} active={activeFilter === 'urgent'} onClick={() => setActiveFilter(activeFilter === 'urgent' ? null : 'urgent')} pulse={stats.urgent > 0}/>
        <StatsCard label="Ação Requerida" value={stats.action_required} color="#f59e0b" icon={<AlertTriangle size={18}/>} active={activeFilter === 'action_required'} onClick={() => setActiveFilter(activeFilter === 'action_required' ? null : 'action_required')}/>
        <StatsCard label="Total" value={stats.total} color="#64748b" icon={<ClipboardList size={18}/>} active={!activeFilter} onClick={() => setActiveFilter(null)}/>
      </div>

      {/* Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <FilterPill label="Todas" active={!activeFilter} onClick={() => setActiveFilter(null)}/>
        {categoryOrder.map(cat => {
          const config = categoryConfig[cat];
          if (!config) return null;
          const count = groupedNotifications[cat]?.length || 0;
          return <FilterPill key={cat} label={config.label} count={count} color={config.color} active={activeFilter === cat} onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}/>;
        })}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <Bell size={32} style={{ color: 'var(--text-muted)' }}/>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tudo em dia!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma notificação pendente</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {categoryOrder.map(cat => {
            const items = groupedNotifications[cat];
            if (!items?.length || (activeFilter && activeFilter !== cat)) return null;
            const config = categoryConfig[cat];
            if (!config) return null;

            return (
              <div key={cat}>
                {!activeFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', marginTop: cat !== 'urgent' ? '1rem' : 0 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{config.icon}</div>
                    <span style={{ fontWeight: 600, color: config.color }}>{config.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '0.125rem 0.5rem', borderRadius: '10px' }}>{items.length}</span>
                  </div>
                )}
                {items.map(notification => (
                  <NotificationCard key={notification.id} notification={notification} expanded={expandedId === notification.id} onToggle={() => setExpandedId(expandedId === notification.id ? null : notification.id)} onAction={handleAction} actionLoading={actionLoading === notification.id} formatTime={formatTime}/>
                ))}
              </div>
            );
          })}
        </div>
      )}
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function StatsCard({ label, value, color, icon, active, onClick, pulse }: { label: string; value: number; color: string; icon: React.ReactNode; active?: boolean; onClick?: () => void; pulse?: boolean }) {
  return (
    <div onClick={onClick} style={{ background: active ? `${color}15` : 'var(--bg-secondary)', border: `1px solid ${active ? color : 'var(--border-color)'}`, borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'all 150ms', position: 'relative' }}>
      {pulse && value > 0 && <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '8px', height: '8px', borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }}/>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ color }}>{icon}</div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: active ? color : 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function FilterPill({ label, count, color, active, onClick }: { label: string; count?: number; color?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '20px', border: 'none', background: active ? (color || 'var(--accent)') : 'var(--bg-secondary)', color: active ? 'white' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', transition: 'all 150ms' }}>
      {label}
      {count !== undefined && count > 0 && <span style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-tertiary)', padding: '0.125rem 0.375rem', borderRadius: '10px', fontSize: '0.7rem' }}>{count}</span>}
    </button>
  );
}

function NotificationCard({ notification, expanded, onToggle, onAction, actionLoading, formatTime }: { notification: Notification; expanded: boolean; onToggle: () => void; onAction: (id: number, action: string) => void; actionLoading: boolean; formatTime: (date: string) => string }) {
  const config = categoryConfig[notification.category] ?? categoryConfig.info ?? { label: 'Informativo', color: '#3b82f6', bg: '#3b82f615', icon: <Megaphone size={16}/> };
  const actions = typeof notification.actions === 'string' ? JSON.parse(notification.actions) : notification.actions || [];

  const getActionStyle = (style: string) => {
    switch (style) {
      case 'primary': return { bg: 'var(--accent)', color: 'white' };
      case 'success': return { bg: '#22c55e', color: 'white' };
      case 'danger': return { bg: '#ef4444', color: 'white' };
      default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-primary)' };
    }
  };

  return (
    <div style={{ background: notification.is_read ? 'var(--bg-secondary)' : 'var(--bg-primary)', border: `1px solid ${notification.priority === 1 ? config.color + '40' : 'var(--border-color)'}`, borderRadius: '12px', overflow: 'hidden', transition: 'all 150ms', opacity: notification.is_read ? 0.8 : 1 }}>
      {notification.priority <= 2 && <div style={{ height: '3px', background: config.color }}/>}
      <div style={{ padding: '1rem' }}>
        <div onClick={onToggle} style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${notification.color}15`, color: notification.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {iconMap[notification.icon] || <Bell size={20}/>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0, color: notification.is_read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{notification.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatTime(notification.created_at)}</span>
                {!notification.is_read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}/>}
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>{notification.message}</p>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)', transition: 'transform 200ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, marginTop: '0.5rem' }}/>
        </div>

        {expanded && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', animation: 'slideIn 0.2s ease' }}>
            {actions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {actions.map((action: NotificationAction, idx: number) => {
                  const style = getActionStyle(action.style);
                  return (
                    <button key={idx} onClick={() => onAction(notification.id, action.action)} disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', borderRadius: '8px', border: 'none', background: style.bg, color: style.color, fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {!notification.is_read && <QuickAction icon={<Eye size={14}/>} label="Marcar como lida" onClick={() => onAction(notification.id, 'mark_read')}/>}
              <QuickAction icon={<Clock size={14}/>} label="Adiar 1h" onClick={() => onAction(notification.id, 'snooze')}/>
              <QuickAction icon={<Archive size={14}/>} label="Arquivar" onClick={() => onAction(notification.id, 'archive')}/>
              <QuickAction icon={<X size={14}/>} label="Dispensar" onClick={() => onAction(notification.id, 'dismiss')} danger/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', borderRadius: '6px', border: 'none', background: 'transparent', color: danger ? 'var(--error)' : 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', transition: 'all 150ms' }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'var(--error-bg)' : 'var(--bg-tertiary)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {icon} {label}
    </button>
  );
}
