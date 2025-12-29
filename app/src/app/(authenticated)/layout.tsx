"use client";
import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { AuthProvider } from '@/context/AuthContext';
import { MaintenanceProvider } from '@/context/MaintenanceContext';
import { TenantProvider, useTenant } from '@/contexts/TenantContext';

// Componente interno que força re-render quando tenant muda
function TenantAwareContent({ children }: { children: React.ReactNode }) {
  const { currentTenant } = useTenant();
  
  return (
    <div key={currentTenant?.tenant_id || 'loading'}>
      <MaintenanceProvider>
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
          <Sidebar />
          <div style={{
            flex: 1,
            marginLeft: '240px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            transition: 'margin-left 200ms ease',
          }}>
            <main style={{ flex: 1, padding: '1.5rem 2rem' }}>
              <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <Header />
                {children}
              </div>
            </main>
          </div>
        </div>
      </MaintenanceProvider>
    </div>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <TenantAwareContent>{children}</TenantAwareContent>
      </TenantProvider>
    </AuthProvider>
  );
}
