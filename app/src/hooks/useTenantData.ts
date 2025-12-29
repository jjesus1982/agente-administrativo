"use client";
import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { API_BASE } from '@/lib/api';

export function useTenantData<T>(
  endpoint: string,
  defaultValue: T
): { data: T; loading: boolean; error: string | null; refetch: () => void } {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentTenant) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const url = `${API_BASE}${endpoint.replace('{tenant_id}', currentTenant.tenant_id.toString())}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Erro ao carregar dados');
      }
    } catch (_e) {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [currentTenant, endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleTenantChange = () => fetchData();
    window.addEventListener('tenantChanged', handleTenantChange);
    return () => window.removeEventListener('tenantChanged', handleTenantChange);
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useCurrentTenantId(): number | null {
  const { currentTenant } = useTenant();
  return currentTenant?.tenant_id || null;
}
