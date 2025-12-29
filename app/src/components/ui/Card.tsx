"use client";

import React from 'react';

// ============================================================================
// CARD COMPONENT
// ============================================================================

interface CardProps {
    children: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    hover?: boolean;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
    onMouseOver?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseOut?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const paddingStyles = {
    none: '0',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
};

export function Card({
    children,
    padding = 'md',
    hover = false,
    onClick,
    className,
    style,
    onMouseOver,
    onMouseOut,
    onMouseEnter,
    onMouseLeave,
}: CardProps) {
    const cardStyle: React.CSSProperties = {
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: paddingStyles[padding],
        cursor: onClick ? 'pointer' : 'default',
        transition: hover || onClick ? 'all 0.2s' : 'none',
        ...style,
    };

    return (
        <div
            className={className}
            style={cardStyle}
            onClick={onClick}
            onMouseOver={onMouseOver}
            onMouseOut={onMouseOut}
            onMouseEnter={(e) => {
                onMouseEnter?.(e);
                if (hover || onClick) {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseLeave={(e) => {
                onMouseLeave?.(e);
                if (hover || onClick) {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'none';
                }
            }}
        >
            {children}
        </div>
    );
}

// ============================================================================
// CARD HEADER
// ============================================================================

interface CardHeaderProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
    children?: React.ReactNode;
}

export function CardHeader({ title, subtitle, icon, action, className, children }: CardHeaderProps) {
    // Se tem children, renderiza diretamente
    if (children) {
        return (
            <div
                className={className}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                }}
            >
                {children}
                {action && <div>{action}</div>}
            </div>
        );
    }
    
    return (
        <div
            className={className}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1rem',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {icon && (
                    <div
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6',
                        }}
                    >
                        {icon}
                    </div>
                )}
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
    title?: string;
    label?: string; // alias for title
    value: string | number;
    icon?: React.ReactNode;
    trend?: { value: number; label?: string; isPositive?: boolean; };
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'default' | string;
    onClick?: () => void;
    href?: string;
    active?: boolean;
    pulse?: boolean;
}

const defaultColorStyle = { bg: '#f1f5f9', icon: '#64748b', border: '#e2e8f0' };

const colorStyles: Record<string, { bg: string; icon: string; border: string }> = {
    blue: { bg: '#dbeafe', icon: '#3b82f6', border: '#93c5fd' },
    green: { bg: '#dcfce7', icon: '#16a34a', border: '#86efac' },
    yellow: { bg: '#fef3c7', icon: '#d97706', border: '#fcd34d' },
    red: { bg: '#fee2e2', icon: '#dc2626', border: '#fca5a5' },
    purple: { bg: '#f3e8ff', icon: '#9333ea', border: '#d8b4fe' },
    default: defaultColorStyle,
};

export function StatCard({ title, label, value, icon, trend, color = 'default', onClick, href, active, pulse }: StatCardProps) {
    const displayTitle = title || label || '';
    const colors = colorStyles[color] ?? defaultColorStyle;
    
    const content = (
        <Card hover={!!onClick || !!href} onClick={onClick} style={{ 
            minWidth: '140px',
            border: active ? '2px solid #3b82f6' : undefined,
            animation: pulse ? 'pulse 2s infinite' : undefined,
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 500 }}>{displayTitle}</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>{value}</p>
                    {trend && (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: trend.isPositive ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                            {trend.label && <span style={{ color: '#64748b' }}>{trend.label}</span>}
                        </p>
                    )}
                </div>
                {icon && (
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: colors?.bg ?? '#f1f5f9', border: `1px solid ${colors?.border ?? '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors?.icon ?? '#64748b' }}>{icon}</div>
                )}
            </div>
        </Card>
    );
    
    if (href) {
        return <a href={href} style={{ textDecoration: 'none' }}>{content}</a>;
    }
    return content;
}

// ============================================================================
// REPORT CARD (for report listing)
// ============================================================================

interface ReportCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    count?: number;
    href: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'default';
}

export function ReportCard({ title, description, icon, count, href, color = 'default' }: ReportCardProps) {
    const colors = colorStyles[color] ?? defaultColorStyle;

    return (
        <a href={href} style={{ textDecoration: 'none' }}>
            <Card
                hover
                style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            backgroundColor: colors.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.icon,
                            flexShrink: 0,
                        }}
                    >
                        {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '0.9375rem',
                            fontWeight: 600,
                            color: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            {title}
                            {count !== undefined && (
                                <span style={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 500,
                                    padding: '0.125rem 0.5rem',
                                    borderRadius: '9999px',
                                    backgroundColor: colors.bg,
                                    color: colors.icon,
                                }}>
                                    {count}
                                </span>
                            )}
                        </h3>
                        <p style={{
                            margin: '0.25rem 0 0',
                            fontSize: '0.8125rem',
                            color: '#64748b',
                            lineHeight: 1.4,
                        }}>
                            {description}
                        </p>
                    </div>
                </div>
            </Card>
        </a>
    );
}

export default Card;

// ============================================================================
// CARD TITLE
// ============================================================================

interface CardTitleProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    icon?: React.ReactNode;
}

export function CardTitle({ children, className, style, icon }: CardTitleProps) {
    return (
        <h3 
            className={className}
            style={{ 
                margin: 0, 
                fontSize: '1.125rem', 
                fontWeight: 600, 
                color: '#1e293b',
                display: icon ? 'flex' : undefined,
                alignItems: icon ? 'center' : undefined,
                gap: icon ? '0.5rem' : undefined,
                ...style 
            }}
        >
            {icon}{children}
        </h3>
    );
}
