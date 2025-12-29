"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; protocol: string; title: string; category: string; priority: string; status: string; requester_name: string; unidade: string; created_at: string; }
export default function MaintenanceGeneralPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Item[]>([]);
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
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'protocol', header: 'Protocolo', accessor: 'protocol', sortable: true },
        { key: 'title', header: 'Título', accessor: 'title', sortable: true },
        { key: 'category', header: 'Categoria', accessor: (i) => i.category || '-' },
        { key: 'priority', header: 'Prioridade', accessor: (i) => i.priority || '-' },
        { key: 'status', header: 'Status', accessor: (i) => i.status || '-' },
        { key: 'requester_name', header: 'Solicitante', accessor: (i) => i.requester_name || '-' },
        { key: 'unidade', header: 'Unidade', accessor: (i) => i.unidade || '-' },
        { key: 'created_at', header: 'Data', accessor: (i) => i.created_at ? new Date(i.created_at).toLocaleDateString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Manutenção Geral" badge={{ label: loading ? '...' : total + ' chamados', color: '#f97316' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Protocolo ou título...' }]} />
    );
}
