"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';

interface Vehicle { id: number; plate: string; model: string; brand: string; color: string; year: number; vehicle_type: string; owner_name: string; unidade: string; tag_number: string; }

export default function VehiclesPage() {
    const { currentTenant: _currentTenant } = useTenant();
    const [data, setData] = useState<Vehicle[]>([]);
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
            const res = await fetch(`${API_BASE}/reports/veiculos?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error('Erro:', err); }
        setLoading(false);
    };

    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);

    const columns: Column<Vehicle>[] = [
        { key: 'id', header: 'ID', accessor: 'id', sortable: true },
        { key: 'plate', header: 'Placa', accessor: 'plate', sortable: true },
        { key: 'model', header: 'Modelo', accessor: (item) => item.model || '-' },
        { key: 'brand', header: 'Marca', accessor: (item) => item.brand || '-' },
        { key: 'color', header: 'Cor', accessor: (item) => item.color || '-' },
        { key: 'year', header: 'Ano', accessor: (item) => item.year ? String(item.year) : '-' },
        { key: 'vehicle_type', header: 'Tipo', accessor: (item) => item.vehicle_type || 'Carro' },
        { key: 'owner_name', header: 'Proprietário', accessor: (item) => item.owner_name || '-' },
        { key: 'unidade', header: 'Unidade', accessor: (item) => item.unidade || '-' },
        { key: 'tag_number', header: 'Tag', accessor: (item) => item.tag_number || '-' },
    ];

    return (
        <ReportPageLayout
            title="Relatório de Veículos"
            badge={{ label: loading ? '...' : total + ' veículos', color: '#eab308' }}
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
            filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Placa, modelo ou marca...' }]}
        />
    );
}
