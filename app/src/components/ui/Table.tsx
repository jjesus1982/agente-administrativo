"use client";
import React from 'react';

export interface TableColumn<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
    columns: TableColumn<T>[];
    data: T[];
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    emptyIcon?: React.ReactNode;
    loading?: boolean;
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function Table<T extends Record<string, any>>({ 
    columns, 
    data, 
    onRowClick, 
    emptyMessage = "Nenhum dado",
    emptyIcon,
    loading,
    className
}: TableProps<T>) {
    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Carregando...
            </div>
        );
    }

    return (
        <div className={className} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        {columns.map(col => (
                            <th key={col.key} style={{ 
                                padding: '0.75rem 1rem', 
                                textAlign: col.align || 'left', 
                                fontWeight: 600, 
                                color: '#64748b', 
                                fontSize: '0.75rem', 
                                textTransform: 'uppercase', 
                                width: col.width 
                            }}>
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    {emptyIcon && <div style={{ opacity: 0.5 }}>{emptyIcon}</div>}
                                    <span>{emptyMessage}</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.map((item, idx) => (
                        <tr 
                            key={idx} 
                            onClick={() => onRowClick?.(item)} 
                            style={{ 
                                borderBottom: '1px solid #f1f5f9', 
                                cursor: onRowClick ? 'pointer' : 'default',
                                transition: 'background-color 0.15s',
                            }}
                            onMouseEnter={e => { if (onRowClick) e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {columns.map(col => (
                                <td key={col.key} style={{ 
                                    padding: '0.75rem 1rem', 
                                    color: '#1e293b',
                                    textAlign: col.align || 'left',
                                }}>
                                    {col.render ? col.render(item) : item[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
