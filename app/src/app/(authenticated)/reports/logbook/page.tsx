"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; entry_type: string; description: string; created_at: string; created_by: string; }
export default function LogbookPage() {
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
            const res = await fetch(`${API_BASE}/reports/livro-portaria?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'entry_type', header: 'Tipo', accessor: (i) => i.entry_type || '-' },
        { key: 'description', header: 'Descrição', accessor: (i) => i.description || '-' },
        { key: 'created_by', header: 'Criado por', accessor: (i) => i.created_by || '-' },
        { key: 'created_at', header: 'Data', accessor: (i) => i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Livro da Portaria" badge={{ label: loading ? '...' : total + ' registros', color: '#8b5cf6' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
