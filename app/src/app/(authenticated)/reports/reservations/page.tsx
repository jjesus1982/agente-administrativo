"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; date: string; start_time: string; end_time: string; status: string; notes: string; area_name: string; user_name: string; created_at: string; }
export default function ReservationsPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});
    const fetchData = async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(currentPage), limit: String(itemsPerPage) });
        try {
            const res = await fetch(`${API_BASE}/reports/reservas?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'area_name', header: 'Área', accessor: (i) => i.area_name || '-' },
        { key: 'user_name', header: 'Usuário', accessor: (i) => i.user_name || '-' },
        { key: 'date', header: 'Data', accessor: (i) => i.date ? new Date(i.date).toLocaleDateString('pt-BR') : '-' },
        { key: 'start_time', header: 'Início', accessor: (i) => i.start_time || '-' },
        { key: 'end_time', header: 'Fim', accessor: (i) => i.end_time || '-' },
        { key: 'status', header: 'Status', accessor: (i) => i.status || '-' },
    ];
    return (
        <ReportPageLayout title="Relatório de Reservas" badge={{ label: loading ? '...' : total + ' reservas', color: '#3b82f6' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
