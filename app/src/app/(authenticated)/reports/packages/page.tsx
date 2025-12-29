"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; tracking_code: string; carrier: string; package_type: string; status: string; received_at: string; delivered_at: string; received_by: string; delivered_to: string; unidade: string; }
export default function PackagesPage() {
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
            const res = await fetch(`${API_BASE}/reports/encomendas?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'tracking_code', header: 'Rastreio', accessor: (i) => i.tracking_code || '-' },
        { key: 'carrier', header: 'Transportadora', accessor: (i) => i.carrier || '-' },
        { key: 'unidade', header: 'Unidade', accessor: (i) => i.unidade || '-' },
        { key: 'status', header: 'Status', accessor: (i) => i.status || '-' },
        { key: 'received_at', header: 'Recebido', accessor: (i) => i.received_at ? new Date(i.received_at).toLocaleDateString('pt-BR') : '-' },
        { key: 'delivered_at', header: 'Entregue', accessor: (i) => i.delivered_at ? new Date(i.delivered_at).toLocaleDateString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Relatório de Encomendas" badge={{ label: loading ? '...' : total + ' encomendas', color: '#22c55e' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
