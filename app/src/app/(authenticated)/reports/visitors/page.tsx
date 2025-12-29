"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface Visitor { id: number; name: string; cpf: string; rg: string; phone: string; visitor_type: string; company: string; is_blocked: boolean; created_at: string; }

export default function VisitorsPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Visitor[]>([]);
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
            const res = await fetch(`${API_BASE}/reports/visitantes?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const columns: Column<Visitor>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'cpf', header: 'CPF', accessor: (item) => item.cpf || '-' },
        { key: 'rg', header: 'RG', accessor: (item) => item.rg || '-' },
        { key: 'phone', header: 'Telefone', accessor: (item) => item.phone || '-' },
        { key: 'visitor_type', header: 'Tipo', accessor: (item) => item.visitor_type || 'Visitante' },
        { key: 'company', header: 'Empresa', accessor: (item) => item.company || '-' },
        { key: 'created_at', header: 'Data', accessor: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-' },
        { key: 'is_blocked', header: 'Status', accessor: (item) => item.is_blocked ? 'Bloqueado' : 'Liberado' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Visitantes"
            badge={{ label: loading ? '...' : total + ' visitantes', color: '#22c55e' }}
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
