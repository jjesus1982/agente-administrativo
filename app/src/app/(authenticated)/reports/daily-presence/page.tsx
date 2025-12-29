"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { pessoa: string; tipo: string; primeira_entrada: string; ultima_atividade: string; }
export default function DailyPresencePage() {
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
            const res = await fetch(`${API_BASE}/reports/presenca-diaria?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'pessoa', header: 'Pessoa', accessor: 'pessoa', sortable: true },
        { key: 'tipo', header: 'Tipo', accessor: (i) => i.tipo || '-' },
        { key: 'primeira_entrada', header: 'Primeira Entrada', accessor: (i) => i.primeira_entrada ? new Date(i.primeira_entrada).toLocaleString('pt-BR') : '-' },
        { key: 'ultima_atividade', header: 'Última Atividade', accessor: (i) => i.ultima_atividade ? new Date(i.ultima_atividade).toLocaleString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Presença Diária" badge={{ label: loading ? '...' : total + ' pessoas', color: '#3b82f6' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
