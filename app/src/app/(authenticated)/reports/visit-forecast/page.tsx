"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; name: string; cpf: string; phone: string; visitor_type: string; company: string; service: string; created_at: string; }
export default function VisitForecastPage() {
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
            const res = await fetch(`${API_BASE}/reports/previsoes-visita?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'cpf', header: 'CPF', accessor: (i) => i.cpf || '-' },
        { key: 'phone', header: 'Telefone', accessor: (i) => i.phone || '-' },
        { key: 'visitor_type', header: 'Tipo', accessor: (i) => i.visitor_type || '-' },
        { key: 'company', header: 'Empresa', accessor: (i) => i.company || '-' },
        { key: 'service', header: 'Serviço', accessor: (i) => i.service || '-' },
    ];
    return (
        <ReportPageLayout title="Previsões de Visita" badge={{ label: loading ? '...' : total + ' previsões', color: '#8b5cf6' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
