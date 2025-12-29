"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; name: string; code: string; location: string; status: string; created_at: string; }
export default function KeysPage() {
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
            const res = await fetch(`${API_BASE}/reports/chaves?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'code', header: 'Código', accessor: (i) => i.code || '-' },
        { key: 'location', header: 'Local', accessor: (i) => i.location || '-' },
        { key: 'status', header: 'Status', accessor: (i) => i.status || '-' },
    ];
    return (
        <ReportPageLayout title="Relatório de Chaves" badge={{ label: loading ? '...' : total + ' chaves', color: '#eab308' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Nome ou código...' }]} />
    );
}
