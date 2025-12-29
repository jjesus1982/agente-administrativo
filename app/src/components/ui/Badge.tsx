"use client";
import React from 'react';

export type BadgeVariant = 
    | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'pink'
    | 'outline' | 'error' | 'secondary' | 'blue' | 'green' | 'red' | 'yellow';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    style?: React.CSSProperties;
    icon?: React.ReactNode;
    text?: string;
    color?: string;
}

const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
    default: { bg: '#f3f4f6', text: '#6b7280' },
    primary: { bg: '#dbeafe', text: '#1d4ed8' },
    secondary: { bg: '#f3f4f6', text: '#6b7280' },
    success: { bg: '#dcfce7', text: '#16a34a' },
    green: { bg: '#dcfce7', text: '#16a34a' },
    warning: { bg: '#fef3c7', text: '#d97706' },
    yellow: { bg: '#fef3c7', text: '#d97706' },
    danger: { bg: '#fee2e2', text: '#dc2626' },
    error: { bg: '#fee2e2', text: '#dc2626' },
    red: { bg: '#fee2e2', text: '#dc2626' },
    info: { bg: '#e0f2fe', text: '#0284c7' },
    blue: { bg: '#dbeafe', text: '#1d4ed8' },
    purple: { bg: '#f3e8ff', text: '#9333ea' },
    pink: { bg: '#fce7f3', text: '#db2777' },
    outline: { bg: 'transparent', text: '#6b7280', border: '#e5e7eb' },
};

const sizeStyles = {
    sm: { padding: '0.125rem 0.375rem', fontSize: '0.625rem' },
    md: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
    lg: { padding: '0.375rem 0.75rem', fontSize: '0.875rem' },
};

export function Badge({ children, variant = 'default', size = 'md', className, style, icon, text, color }: BadgeProps) {
    const variantStyle = variantStyles[variant] ?? variantStyles.default;
    const sizeStyle = sizeStyles[size] ?? sizeStyles.md;

    // Se color foi passado diretamente (hex), usar
    const finalStyle: React.CSSProperties = color ? {
        backgroundColor: `${color}20`,
        color: color,
        ...sizeStyle,
        borderRadius: '9999px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        ...style,
    } : {
        backgroundColor: variantStyle?.bg ?? '#f3f4f6',
        color: variantStyle?.text ?? '#6b7280',
        border: variantStyle?.border ? `1px solid ${variantStyle.border}` : undefined,
        ...sizeStyle,
        borderRadius: '9999px',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        ...style,
    };

    return (
        <span className={className} style={finalStyle}>
            {icon}{text || children}
        </span>
    );
}

// StatusBadge para status específicos
interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md' | 'lg';
}

const statusMap: Record<string, BadgeVariant> = {
    active: 'success', ativo: 'success', aprovado: 'success', concluido: 'success', entregue: 'success',
    pending: 'warning', pendente: 'warning', em_andamento: 'warning', aguardando: 'warning',
    inactive: 'default', inativo: 'default', cancelado: 'default',
    error: 'danger', recusado: 'danger', rejeitado: 'danger', atrasado: 'danger',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
    const variant = statusMap[status.toLowerCase()] || 'default';
    return <Badge variant={variant} size={size}>{status}</Badge>;
}

// CountBadge para contadores
interface CountBadgeProps {
    count: number;
    variant?: BadgeVariant;
}

export function CountBadge({ count, variant = 'primary' }: CountBadgeProps) {
    if (count <= 0) return null;
    return <Badge variant={variant} size="sm">{count > 99 ? '99+' : count}</Badge>;
}
