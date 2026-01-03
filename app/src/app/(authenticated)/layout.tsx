"use client"

import React from 'react'
import ModernLayout from '@/components/ModernLayout'
import { AuthProvider } from '@/context/AuthContext'
import { MaintenanceProvider } from '@/context/MaintenanceContext'
import { TenantProvider } from '@/contexts/TenantContext'
import { PermissionProvider } from '@/contexts/PermissionContext'

// 🎨 LAYOUT MODERNO 2025 - INTEGRADO
// ✅ ModernSidebar com glassmorphism
// ✅ ModernHeader com Command Palette
// ✅ Layout responsivo mobile-first
// ✅ Framer Motion page transitions
// ✅ Dark/Light mode integrado

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <MaintenanceProvider>
          <PermissionProvider>
            <ModernLayout>
              {children}
            </ModernLayout>
          </PermissionProvider>
        </MaintenanceProvider>
      </TenantProvider>
    </AuthProvider>
  )
}
