"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { api } from '@/lib/api';

/**
 * Hook para buscar dados da API com tenant automático
 * Recarrega automaticamente quando o tenant muda
 */
export function useTenantApi<T>(
  endpoint: string,
  defaultValue: T,
  options?: { skip?: boolean }
): { 
  data: T; 
  loading: boolean; 
  error: string | null; 
  refetch: () => void;
  tenantId: number | null;
} {
  const { currentTenant } = useTenant();
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!currentTenant || options?.skip) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Construir endpoint com tenant_id se necessário
      const tenantEndpoint = endpoint.includes('?') 
        ? `${endpoint}&tenant_id=${currentTenant.tenant_id}`
        : `${endpoint}?tenant_id=${currentTenant.tenant_id}`;
      
      const response = await api.get(tenantEndpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro ao carregar dados');
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [currentTenant, endpoint, options?.skip]);

  // Busca inicial e quando tenant muda
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    tenantId: currentTenant?.tenant_id || null,
  };
}

/**
 * Hook para fazer mutações (POST, PUT, DELETE) com tenant
 */
export function useTenantMutation<TData = unknown, TResult = unknown>() {
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: TData
  ): Promise<TResult | null> => {
    if (!currentTenant) {
      setError('Nenhum condomínio selecionado');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const tenantEndpoint = endpoint.includes('?') 
        ? `${endpoint}&tenant_id=${currentTenant.tenant_id}`
        : `${endpoint}?tenant_id=${currentTenant.tenant_id}`;

      let response: Response;
      
      switch (method) {
        case 'POST':
          response = await api.post(tenantEndpoint, data);
          break;
        case 'PUT':
          response = await api.put(tenantEndpoint, data);
          break;
        case 'PATCH':
          response = await api.patch(tenantEndpoint, data);
          break;
        case 'DELETE':
          response = await api.delete(tenantEndpoint);
          break;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Erro na operação');
      }

      const result = await response.json();
      return result as TResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentTenant]);

  return { mutate, loading, error };
}

export default useTenantApi;
