"use client";
import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Download, Filter, ChevronLeft, ChevronRight, RefreshCw, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';

export interface Column<T> {
    key: string;
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

export interface FilterField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date';
    placeholder?: string;
    options?: { value: string; label: string }[];
}

interface ReportPageLayoutProps<T> {
    title: string;
    subtitle?: string;
    badge?: { label: string; color?: string };
    backPath?: string;
    columns: Column<T>[];
    data: T[];
    keyExtractor?: (item: T) => string | number;
    filterFields?: FilterField[];
    filterValues?: Record<string, string>;
    onFilterChange?: (key: string, value: string) => void;
    onApplyFilters?: () => void;
    onClearFilters?: () => void;
    loading?: boolean;
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    itemsPerPage?: number;
    onItemsPerPageChange?: (count: number) => void;
    onExport?: () => void;
}

export default function ReportPageLayout<T extends Record<string, any>>({
    title,
    subtitle,
    badge,
    backPath = '/reports',
    columns,
    data,
    keyExtractor = (item: any) => item.id || Math.random(),
    filterFields = [],
    filterValues = {},
    onFilterChange,
    onApplyFilters,
    onClearFilters,
    loading = false,
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    itemsPerPage = 15,
    onItemsPerPageChange,
    onExport,
}: ReportPageLayoutProps<T>) {
    const router = useRouter();
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showFilters, setShowFilters] = useState(false);

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortOrder]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortOrder('asc');
        }
    };

    const getCellValue = (item: T, column: Column<T>) => {
        if (typeof column.accessor === 'function') {
            return column.accessor(item);
        }
        return item[column.accessor as keyof T];
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <button
                        onClick={() => router.push(backPath)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{title}</h1>
                            {badge && <Badge variant="info">{badge.label}</Badge>}
                        </div>
                        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>{subtitle}</p>}
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <Card style={{ marginBottom: '1rem', padding: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {filterFields.length > 0 && (
                            <Button variant={showFilters ? 'primary' : 'secondary'} size="sm" onClick={() => setShowFilters(!showFilters)}>
                                <Filter size={16} /> Filtros {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                            </Button>
                        )}
                        {onApplyFilters && (
                            <Button variant="secondary" size="sm" onClick={onApplyFilters}>
                                <RefreshCw size={16} /> Atualizar
                            </Button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            {data.length} registro(s)
                        </span>
                        {onExport && (
                            <Button variant="secondary" size="sm" onClick={onExport}>
                                <Download size={16} /> Exportar
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && filterFields.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {filterFields.map((field) => (
                                <div key={field.key}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                                        {field.label}
                                    </label>
                                    {field.type === 'select' && field.options ? (
                                        <select
                                            value={filterValues[field.key] || ''}
                                            onChange={(e) => onFilterChange?.(field.key, e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', fontSize: '0.875rem' }}
                                        >
                                            <option value="">Todos</option>
                                            {field.options.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={field.type === 'date' ? 'date' : 'text'}
                                            placeholder={field.placeholder}
                                            value={filterValues[field.key] || ''}
                                            onChange={(e) => onFilterChange?.(field.key, e.target.value)}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', fontSize: '0.875rem' }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <Button variant="primary" size="sm" onClick={onApplyFilters}>
                                <Search size={16} /> Buscar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onClearFilters}>
                                <X size={16} /> Limpar
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Table */}
            <Card style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            textAlign: (col.align || 'left') as any,
                                            fontWeight: 600,
                                            color: 'var(--text-secondary)',
                                            cursor: col.sortable ? 'pointer' : 'default',
                                            whiteSpace: 'nowrap',
                                            width: col.width,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {col.header}
                                            {col.sortable && sortKey === col.key && (
                                                sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                                        Carregando...
                                    </td>
                                </tr>
                            ) : sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Nenhum registro encontrado
                                    </td>
                                </tr>
                            ) : (
                                sortedData.map((row, index) => (
                                    <tr
                                        key={keyExtractor(row)}
                                        style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            background: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                        }}
                                    >
                                        {columns.map((col) => (
                                            <td
                                                key={col.key}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    textAlign: (col.align || 'left') as any,
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {getCellValue(row, col)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Itens por página:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
                                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', fontSize: '0.875rem' }}
                            >
                                {[10, 15, 25, 50, 100].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onPageChange?.(currentPage - 1)}
                                disabled={currentPage <= 1}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
                                {currentPage} de {totalPages}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onPageChange?.(currentPage + 1)}
                                disabled={currentPage >= totalPages}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
