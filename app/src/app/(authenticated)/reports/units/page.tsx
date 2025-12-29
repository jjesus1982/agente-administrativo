"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface Unit { id: number; block: string; number: string; floor: string; unit_type: string; area: number; is_rented: boolean; owner_name: string; tenant_name: string; }

export default function UnitsPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Unit[]>([]);
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
            const res = await fetch(`${API_BASE}/reports/unidades?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const columns: Column<Unit>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'block', header: 'Bloco', accessor: 'block', sortable: true },
        { key: 'number', header: 'Número', accessor: 'number', sortable: true },
        { key: 'floor', header: 'Andar', accessor: (item) => item.floor || '-' },
        { key: 'unit_type', header: 'Tipo', accessor: (item) => item.unit_type || '-' },
        { key: 'area', header: 'Área (m²)', accessor: (item) => item.area ? String(item.area) : '-' },
        { key: 'owner_name', header: 'Proprietário', accessor: (item) => item.owner_name || '-' },
        { key: 'tenant_name', header: 'Inquilino', accessor: (item) => item.tenant_name || '-' },
        { key: 'is_rented', header: 'Status', accessor: (item) => item.is_rented ? 'Alugada' : 'Própria' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Unidades"
            badge={{ label: loading ? '...' : total + ' unidades', color: '#f97316' }}
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
            filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Bloco ou número...' }]}
        />
    );
}
