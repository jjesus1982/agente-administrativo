"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; title: string; description: string; status: string; start_date: string; end_date: string; contractor: string; created_at: string; }
export default function WorksPage() {
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
            const res = await fetch(`${API_BASE}/reports/obras?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'title', header: 'Título', accessor: 'title', sortable: true },
        { key: 'contractor', header: 'Contratado', accessor: (i) => i.contractor || '-' },
        { key: 'status', header: 'Status', accessor: (i) => i.status || '-' },
        { key: 'start_date', header: 'Início', accessor: (i) => i.start_date ? new Date(i.start_date).toLocaleDateString('pt-BR') : '-' },
        { key: 'end_date', header: 'Fim', accessor: (i) => i.end_date ? new Date(i.end_date).toLocaleDateString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Relatório de Obras" badge={{ label: loading ? '...' : total + ' obras', color: '#f97316' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Título...' }]} />
    );
}
