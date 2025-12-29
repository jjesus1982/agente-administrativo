"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface Ticket { id: number; protocol: string; title: string; category: string; priority: string; status: string; assigned_to: string; requester_name: string; unidade: string; created_at: string; resolved_at: string; }

export default function MaintenanceCallsPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Ticket[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});

    const fetchData = async (search?: string) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(currentPage), limit: String(itemsPerPage) });
        if (search) params.append('search', search);
        try {
            const res = await fetch(`${API_BASE}/reports/manutencao?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const getStatusLabel = (s: string) => ({ aberto: 'Aberto', em_andamento: 'Em Andamento', concluido: 'Concluído', cancelado: 'Cancelado' }[s] || s);
    const getPriorityLabel = (p: string) => ({ baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' }[p] || p);

    const columns: Column<Ticket>[] = [
        { key: 'protocol', header: 'Protocolo', accessor: 'protocol', sortable: true },
        { key: 'title', header: 'Título', accessor: 'title', sortable: true },
        { key: 'category', header: 'Categoria', accessor: (item) => item.category || '-' },
        { key: 'priority', header: 'Prioridade', accessor: (item) => getPriorityLabel(item.priority) },
        { key: 'status', header: 'Status', accessor: (item) => getStatusLabel(item.status) },
        { key: 'requester_name', header: 'Solicitante', accessor: (item) => item.requester_name || '-' },
        { key: 'unidade', header: 'Unidade', accessor: (item) => item.unidade || '-' },
        { key: 'created_at', header: 'Abertura', accessor: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Chamados de Manutenção"
            badge={{ label: loading ? '...' : total + ' chamados', color: '#f97316' }}
            backPath="/reports"
            columns={columns}
            data={data}
            loading={loading}
            currentPage={currentPage}
            totalPages={Math.ceil(total / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            filterValues={filterValues}
            onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
            onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }}
            onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }}
            filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Protocolo ou título...' }]}
        />
    );
}
