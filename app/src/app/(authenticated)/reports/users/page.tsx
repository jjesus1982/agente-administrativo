"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface User { id: number; name: string; email: string; phone: string; cpf: string; role: string; is_active: boolean; unidades: string; }

export default function UsersPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<User[]>([]);
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
            const res = await fetch(`${API_BASE}/reports/moradores?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const columns: Column<User>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'email', header: 'E-mail', accessor: 'email', sortable: true },
        { key: 'phone', header: 'Telefone', accessor: (item) => item.phone || '-' },
        { key: 'cpf', header: 'CPF', accessor: (item) => item.cpf || '-' },
        { key: 'role', header: 'Perfil', accessor: 'role' },
        { key: 'unidades', header: 'Unidades', accessor: (item) => item.unidades || '-' },
        { key: 'is_active', header: 'Status', accessor: (item) => item.is_active ? 'Ativo' : 'Inativo' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Usuários"
            badge={{ label: loading ? '...' : total + ' usuários', color: '#3b82f6' }}
            backPath="/reports"
            columns={columns}
            data={data}
            loading={loading}
            currentPage={currentPage}
            totalPages={Math.ceil(total / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            filterValues={filterValues}
            onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
            onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }}
            onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }}
            filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Nome, email ou CPF...' }]}
        />
    );
}
