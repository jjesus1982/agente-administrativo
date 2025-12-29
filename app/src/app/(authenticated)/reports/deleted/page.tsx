"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; name: string; email: string; phone: string; cpf: string; role: string; deleted_at: string; }
export default function DeletedPage() {
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
            const res = await fetch(`${API_BASE}/reports/registros-excluidos?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'email', header: 'Email', accessor: (i) => i.email || '-' },
        { key: 'phone', header: 'Telefone', accessor: (i) => i.phone || '-' },
        { key: 'cpf', header: 'CPF', accessor: (i) => i.cpf || '-' },
        { key: 'role', header: 'Perfil', accessor: (i) => i.role || '-' },
        { key: 'deleted_at', header: 'Excluído em', accessor: (i) => i.deleted_at ? new Date(i.deleted_at).toLocaleString('pt-BR') : '-' },
    ];
    return (
        <ReportPageLayout title="Registros Excluídos" badge={{ label: loading ? '...' : total + ' registros', color: '#ef4444' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[]} />
    );
}
