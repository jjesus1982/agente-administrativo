"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface Dependent { id: number; name: string; phone: string; relationship_type: string; cpf: string; rg: string; has_special_needs: boolean; created_at: string; }

export default function DependentsPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Dependent[]>([]);
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
            const res = await fetch(`${API_BASE}/reports/dependentes?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const columns: Column<Dependent>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'relationship_type', header: 'Parentesco', accessor: (item) => item.relationship_type || '-' },
        { key: 'phone', header: 'Telefone', accessor: (item) => item.phone || '-' },
        { key: 'cpf', header: 'CPF', accessor: (item) => item.cpf || '-' },
        { key: 'rg', header: 'RG', accessor: (item) => item.rg || '-' },
        { key: 'has_special_needs', header: 'Necessidades Especiais', accessor: (item) => item.has_special_needs ? 'Sim' : 'Não' },
        { key: 'created_at', header: 'Cadastro', accessor: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Dependentes"
            badge={{ label: loading ? '...' : total + ' dependentes', color: '#8b5cf6' }}
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
            filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Nome ou CPF...' }]}
        />
    );
}
