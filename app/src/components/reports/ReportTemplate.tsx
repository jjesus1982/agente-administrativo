"use client";

import React, { useState } from 'react';
import { ArrowLeft, Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface Column<T> {
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    width?: string;
    align?: 'left' | 'center' | 'right';
}

interface ReportTemplateProps<T> {
    title: string;
    backPath?: string;
    columns: Column<T>[];
    data: T[];
    onSearch?: (term: string) => void;
    filterComponent?: React.ReactNode;
    extraActions?: React.ReactNode;
}

export default function ReportTemplate<T extends { id: string | number }>({
    title,
    backPath = '/reports',
    columns,
    data,
    onSearch,
    filterComponent,
    extraActions
}: ReportTemplateProps<T>) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Default search filtering if onSearch is not provided
    const filteredData = onSearch
        ? data
        : data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <Link href={backPath} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem',
                    textDecoration: 'none'
                }}>
                    <ArrowLeft size={16} /> Voltar para Relatórios
                </Link>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--foreground)' }}>
                        {title}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {extraActions ? extraActions : (
                            <>
                                <div style={{ position: 'relative', width: '300px' }}>
                                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        placeholder="Buscar nos registros..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            if (onSearch) onSearch(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.8rem 1rem 0.8rem 2.5rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--glass-border)',
                                            background: 'white',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.8rem 1.2rem', borderRadius: '8px',
                                    background: 'white', border: '1px solid var(--glass-border)',
                                    cursor: 'pointer', fontWeight: 500, color: 'var(--foreground)'
                                }}>
                                    <Filter size={16} /> Filtros
                                </button>
                                <button style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.8rem 1.2rem', borderRadius: '8px',
                                    background: 'var(--primary)', border: 'none',
                                    cursor: 'pointer', fontWeight: 600, color: 'white'
                                }}>
                                    <Download size={16} /> Exportar
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Filters Area */}
            {filterComponent && (
                <div className="glass-panel" style={{
                    marginBottom: '1.5rem',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    background: 'white',
                    border: '1px solid var(--glass-border)'
                }}>
                    {filterComponent}
                </div>
            )}

            {/* Table Card */}
            <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden', background: 'white', border: '1px solid var(--glass-border)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                {columns.map((col, idx) => (
                                    <th key={idx} style={{
                                        padding: '1rem 1.5rem', textAlign: col.align || 'left',
                                        width: col.width, color: '#6b7280', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase'
                                    }}>
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.length > 0 ? paginatedData.map((row) => (
                                <tr key={row.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    {columns.map((col, idx) => (
                                        <td key={idx} style={{ padding: '1rem 1.5rem', textAlign: col.align || 'left', color: '#374151' }}>
                                            {typeof col.accessor === 'function'
                                                ? col.accessor(row)
                                                : row[col.accessor] as React.ReactNode}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={columns.length} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div style={{
                    padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb'
                }}>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                        Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} resultados
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #d1d5db', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
