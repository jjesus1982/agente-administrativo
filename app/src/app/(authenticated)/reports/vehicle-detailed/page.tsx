"use client";
import React, { useState, useEffect } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import ReportPageLayout, { Column } from '@/components/reports/ReportPageLayout';
import { API_BASE } from '@/lib/api';
interface Item { id: number; plate: string; model: string; brand: string; color: string; year: number; vehicle_type: string; tag_number: string; owner_name: string; owner_phone: string; unidade: string; }
export default function VehicleDetailedPage() {
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
            const res = await fetch(`${API_BASE}/reports/veiculos-detalhados?${params}`);
            const json = await res.json();
            setData(json.items || []);
            setTotal(json.total || 0);
        } catch (err) { console.error(err); }
        setLoading(false);
    };
    useEffect(() => { fetchData(filterValues.search); }, [currentPage, itemsPerPage]);
    const columns: Column<Item>[] = [
        { key: 'plate', header: 'Placa', accessor: 'plate', sortable: true },
        { key: 'model', header: 'Modelo', accessor: (i) => i.model || '-' },
        { key: 'brand', header: 'Marca', accessor: (i) => i.brand || '-' },
        { key: 'color', header: 'Cor', accessor: (i) => i.color || '-' },
        { key: 'year', header: 'Ano', accessor: (i) => i.year ? String(i.year) : '-' },
        { key: 'vehicle_type', header: 'Tipo', accessor: (i) => i.vehicle_type || '-' },
        { key: 'owner_name', header: 'Proprietário', accessor: (i) => i.owner_name || '-' },
        { key: 'owner_phone', header: 'Tel. Prop.', accessor: (i) => i.owner_phone || '-' },
        { key: 'unidade', header: 'Unidade', accessor: (i) => i.unidade || '-' },
    ];
    return (
        <ReportPageLayout title="Veículos Detalhados" badge={{ label: loading ? '...' : total + ' veículos', color: '#eab308' }} backPath="/reports" columns={columns} data={data} loading={loading} currentPage={currentPage} totalPages={Math.ceil(total / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} filterValues={filterValues} onFilterChange={(k, v) => setFilterValues(p => ({ ...p, [k]: v }))} onApplyFilters={() => { setCurrentPage(1); fetchData(filterValues.search); }} onClearFilters={() => { setFilterValues({}); setCurrentPage(1); fetchData(); }} filterFields={[{ key: 'search', label: 'Buscar', type: 'text', placeholder: 'Placa, modelo ou proprietário...' }]} />
    );
}
