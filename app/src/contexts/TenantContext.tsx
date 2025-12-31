"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Tenant {
  id: number;
  tenant_id: number;
  tenant_name: string;
  logo_url: string | null;
  city: string;
  state: string;
  is_primary: boolean;
  role_in_tenant: number;
  total_units: number;
  total_users: number;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  isMultiTenant: boolean;
  isLoading: boolean;
  switchTenant: (tenantId: number) => Promise<void>;
  refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  currentTenant: null,
  tenants: [],
  isMultiTenant: false,
  isLoading: true,
  switchTenant: async () => {},
  refreshTenants: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTenants = async (userId: number) => {
    try {
      const res = await api.get('/tenant/user/' + userId + '/tenants');

      if (res.ok) {
        const data: Tenant[] = await res.json();
        setTenants(data);

        const savedTenantId = localStorage.getItem('currentTenantId');
        const savedTenant = savedTenantId
          ? data.find(t => t.tenant_id === parseInt(savedTenantId))
          : null;

        const primaryTenant = data.find(t => t.is_primary) || data[0];
        const selected = savedTenant || primaryTenant || null;
        setCurrentTenant(selected);
      }
    } catch (_) {
      // Erro ao carregar tenants
    } finally {
      setIsLoading(false);
    }
  };

  const switchTenant = async (tenantId: number) => {
    const newTenant = tenants.find(t => t.tenant_id === tenantId);
    if (newTenant) {
      setCurrentTenant(newTenant);
      localStorage.setItem('currentTenantId', tenantId.toString());
      window.dispatchEvent(new CustomEvent('tenantChanged', { detail: newTenant }));
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchTenants(user.id);
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  return (
    <TenantContext.Provider value={{
      currentTenant,
      tenants,
      isMultiTenant: tenants.length > 1,
      isLoading,
      switchTenant,
      refreshTenants: () => user ? fetchTenants(user.id) : Promise.resolve()
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
export default TenantContext;
