"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface Pet { id: number; name: string; species: string; breed: string; size: string; gender: string; color: string; created_at: string; }

export default function PetsPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Pet[]>([]);
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
            const res = await fetch(`${API_BASE}/reports/pets?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const columns: Column<Pet>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'name', header: 'Nome', accessor: 'name', sortable: true },
        { key: 'species', header: 'Espécie', accessor: (item) => item.species || '-' },
        { key: 'breed', header: 'Raça', accessor: (item) => item.breed || '-' },
        { key: 'size', header: 'Porte', accessor: (item) => item.size || '-' },
        { key: 'gender', header: 'Sexo', accessor: (item) => item.gender || '-' },
        { key: 'color', header: 'Cor', accessor: (item) => item.color || '-' },
        { key: 'created_at', header: 'Cadastro', accessor: (item) => item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Pets"
            badge={{ label: loading ? '...' : total + ' pets', color: '#ec4899' }}
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
            filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Nome ou raça...' }]}
        />
    );
}
