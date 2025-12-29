"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; access_type: string; access_point: string; visitor_name: string; company: string; registered_at: string; }
export default function ProvidersLogPage() {
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
            const res = await fetch(`${API_BASE}/reports/prestadores-log?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'visitor_name', header: 'Prestador', accessor: (i) => i.visitor_name || '-' },
        { key: 'company', header: 'Empresa', accessor: (i) => i.company || '-' },
        { key: 'access_type', header: 'Acesso', accessor: (i) => i.access_type || '-' },
        { key: 'access_point', header: 'Ponto', accessor: (i) => i.access_point || '-' },
        { key: 'registered_at', header: 'Data/Hora', accessor: (i) => i.registered_at ? new Date(i.registered_at).toLocaleString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Entrada/Saída Prestadores" badge={{ label: loading ? '...' : total + ' registros', color: '#f97316' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
