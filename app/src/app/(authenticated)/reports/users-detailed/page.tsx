"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; name: string; email: string; phone: string; cpf: string; role: string; is_active: boolean; total_dependentes: number; total_veiculos: number; total_pets: number; }
export default function UsersDetailedPage() {
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
            const res = await fetch(`${API_BASE}/reports/usuarios-detalhados?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'email', header: 'Email', accessor: 'email' },
        { key: 'phone', header: 'Telefone', accessor: (i) => i.phone || '-' },
        { key: 'cpf', header: 'CPF', accessor: (i) => i.cpf || '-' },
        { key: 'role', header: 'Perfil', accessor: (i) => i.role || '-' },
        { key: 'total_dependentes', header: 'Dependentes', accessor: (i) => String(i.total_dependentes || 0) },
        { key: 'total_veiculos', header: 'Veículos', accessor: (i) => String(i.total_veiculos || 0) },
        { key: 'total_pets', header: 'Pets', accessor: (i) => String(i.total_pets || 0) },
        { key: 'is_active', header: 'Status', accessor: (i) => i.is_active ? 'Ativo' : 'Inativo' },
    ];
    return (
        <ReportPageLayout title="Usuários Detalhados" badge={{ label: loading ? '...' : total + ' usuários', color: '#3b82f6' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Nome ou email...' }]} />
    );
}
