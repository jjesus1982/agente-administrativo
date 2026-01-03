"use client"

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

// 🔐 SISTEMA DE PERMISSÕES CONECTA PLUS
// Níveis hierárquicos de acesso conforme especificação

export enum UserRole {
  MORADOR = 1,          // Acesso básico (próprios dados)
  SINDICO = 2,          // + Criar assembleias + Publicar comunicados + IA
  PORTEIRO = 3,         // + Portaria + Acesso total
  ADMINISTRACAO = 4,    // + Financeiro + Gerenciar ocorrências
  CONECTA_ADMIN = 5     // Acesso total + Multi-tenant
}

export enum Permission {
  // DASHBOARD
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_ALERTS = 'view_alerts',

  // SEGURANÇA
  VIEW_CFTV = 'view_cftv',
  MANAGE_CFTV = 'manage_cftv',
  VIEW_ACCESS_CONTROL = 'view_access_control',
  AUTHORIZE_ACCESS = 'authorize_access',
  VIEW_ALARMS = 'view_alarms',
  MANAGE_ALARMS = 'manage_alarms',
  VIEW_PORTARIA = 'view_portaria',
  MANAGE_PORTARIA = 'manage_portaria',

  // GESTÃO
  VIEW_FINANCIAL = 'view_financial',
  MANAGE_FINANCIAL = 'manage_financial',
  VIEW_OCCURRENCES = 'view_occurrences',
  MANAGE_OCCURRENCES = 'manage_occurrences',
  CREATE_OCCURRENCE = 'create_occurrence',
  VIEW_RESERVATIONS = 'view_reservations',
  MANAGE_RESERVATIONS = 'manage_reservations',
  VIEW_PACKAGES = 'view_packages',
  MANAGE_PACKAGES = 'manage_packages',
  VIEW_MAINTENANCE = 'view_maintenance',
  MANAGE_MAINTENANCE = 'manage_maintenance',

  // COMUNICAÇÃO
  VIEW_ANNOUNCEMENTS = 'view_announcements',
  CREATE_ANNOUNCEMENTS = 'create_announcements',
  MANAGE_ANNOUNCEMENTS = 'manage_announcements',
  VIEW_CLASSIFIEDS = 'view_classifieds',
  CREATE_CLASSIFIEDS = 'create_classifieds',
  MODERATE_CLASSIFIEDS = 'moderate_classifieds',
  VIEW_ASSEMBLIES = 'view_assemblies',
  CREATE_ASSEMBLIES = 'create_assemblies',
  MANAGE_ASSEMBLIES = 'manage_assemblies',

  // INTELIGÊNCIA IA
  VIEW_IA_OVERVIEW = 'view_ia_overview',
  VIEW_IA_PREDICTIONS = 'view_ia_predictions',
  VIEW_IA_SUGGESTIONS = 'view_ia_suggestions',
  VIEW_IA_COMMUNICATION = 'view_ia_communication',
  MANAGE_IA_LEARNING = 'manage_ia_learning',

  // ADMINISTRAÇÃO
  MANAGE_USERS = 'manage_users',
  MANAGE_UNITS = 'manage_units',
  MANAGE_BUILDING = 'manage_building',
  VIEW_REPORTS = 'view_reports',
  GENERATE_REPORTS = 'generate_reports',
  MANAGE_SYSTEM = 'manage_system',

  // SUPER ADMIN
  MULTI_TENANT_ACCESS = 'multi_tenant_access',
  SYSTEM_CONFIGURATION = 'system_configuration'
}

// Permissões base por role (sem herança)
const BASE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.MORADOR]: [
    // Dashboard básico
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ALERTS,

    // Gestão limitada (próprios dados)
    Permission.VIEW_OCCURRENCES,
    Permission.CREATE_OCCURRENCE,
    Permission.VIEW_RESERVATIONS,
    Permission.VIEW_PACKAGES,
    Permission.VIEW_MAINTENANCE,

    // Comunicação básica
    Permission.VIEW_ANNOUNCEMENTS,
    Permission.VIEW_CLASSIFIEDS,
    Permission.CREATE_CLASSIFIEDS,
    Permission.VIEW_ASSEMBLIES,
  ],

  [UserRole.PORTEIRO]: [
    // Segurança completa
    Permission.VIEW_CFTV,
    Permission.MANAGE_CFTV,
    Permission.VIEW_ACCESS_CONTROL,
    Permission.AUTHORIZE_ACCESS,
    Permission.VIEW_ALARMS,
    Permission.VIEW_PORTARIA,
    Permission.MANAGE_PORTARIA,

    // Gestão ampliada
    Permission.MANAGE_PACKAGES,
    Permission.MANAGE_RESERVATIONS,
  ],

  [UserRole.ADMINISTRACAO]: [
    // Gestão financeira
    Permission.VIEW_FINANCIAL,
    Permission.MANAGE_FINANCIAL,

    // Gerenciamento avançado
    Permission.MANAGE_OCCURRENCES,
    Permission.MANAGE_MAINTENANCE,
    Permission.MANAGE_ALARMS,

    // Relatórios
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,

    // Administração básica
    Permission.MANAGE_USERS,
    Permission.MANAGE_UNITS,
  ],

  [UserRole.SINDICO]: [
    // Comunicação avançada
    Permission.CREATE_ANNOUNCEMENTS,
    Permission.MANAGE_ANNOUNCEMENTS,
    Permission.MODERATE_CLASSIFIEDS,
    Permission.CREATE_ASSEMBLIES,
    Permission.MANAGE_ASSEMBLIES,

    // Inteligência IA completa
    Permission.VIEW_IA_OVERVIEW,
    Permission.VIEW_IA_PREDICTIONS,
    Permission.VIEW_IA_SUGGESTIONS,
    Permission.VIEW_IA_COMMUNICATION,
    Permission.MANAGE_IA_LEARNING,

    // Gestão predial
    Permission.MANAGE_BUILDING,
    Permission.MANAGE_SYSTEM,
  ],

  [UserRole.CONECTA_ADMIN]: [
    // Super admin
    Permission.MULTI_TENANT_ACCESS,
    Permission.SYSTEM_CONFIGURATION,
  ]
}

// Função para construir permissões com herança hierárquica
function buildRolePermissions(): Record<UserRole, Permission[]> {
  return {
    [UserRole.MORADOR]: [
      ...BASE_PERMISSIONS[UserRole.MORADOR]
    ],

    [UserRole.SINDICO]: [
      ...BASE_PERMISSIONS[UserRole.MORADOR],
      ...BASE_PERMISSIONS[UserRole.SINDICO]
    ],

    [UserRole.PORTEIRO]: [
      ...BASE_PERMISSIONS[UserRole.MORADOR],
      ...BASE_PERMISSIONS[UserRole.SINDICO],
      ...BASE_PERMISSIONS[UserRole.PORTEIRO]
    ],

    [UserRole.ADMINISTRACAO]: [
      ...BASE_PERMISSIONS[UserRole.MORADOR],
      ...BASE_PERMISSIONS[UserRole.SINDICO],
      ...BASE_PERMISSIONS[UserRole.PORTEIRO],
      ...BASE_PERMISSIONS[UserRole.ADMINISTRACAO]
    ],

    [UserRole.CONECTA_ADMIN]: [
      ...BASE_PERMISSIONS[UserRole.MORADOR],
      ...BASE_PERMISSIONS[UserRole.SINDICO],
      ...BASE_PERMISSIONS[UserRole.PORTEIRO],
      ...BASE_PERMISSIONS[UserRole.ADMINISTRACAO],
      ...BASE_PERMISSIONS[UserRole.CONECTA_ADMIN]
    ]
  }
}

// Mapeamento de permissões por role (com herança)
const ROLE_PERMISSIONS = buildRolePermissions()

interface PermissionContextType {
  userRole: UserRole
  permissions: Permission[]
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  hasAllPermissions: (permissions: Permission[]) => boolean
  canAccessRoute: (route: string) => boolean
  getRoleName: () => string
  getRoleColor: () => string
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
}

// Mapeamento de rotas para permissões necessárias
const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  '/dashboard': [Permission.VIEW_DASHBOARD],
  '/alertas': [Permission.VIEW_ALERTS],

  // Segurança
  '/seguranca/cftv': [Permission.VIEW_CFTV],
  '/seguranca/acesso': [Permission.VIEW_ACCESS_CONTROL],
  '/seguranca/alarmes': [Permission.VIEW_ALARMS],
  '/seguranca/portaria': [Permission.VIEW_PORTARIA],

  // Gestão
  '/management/financeiro': [Permission.VIEW_FINANCIAL],
  '/ocorrencias': [Permission.VIEW_OCCURRENCES],
  '/reservas': [Permission.VIEW_RESERVATIONS],
  '/encomendas': [Permission.VIEW_PACKAGES],
  '/manutencao': [Permission.VIEW_MAINTENANCE],

  // Comunicação
  '/comunicados': [Permission.VIEW_ANNOUNCEMENTS],
  '/classificados': [Permission.VIEW_CLASSIFIEDS],
  '/voting': [Permission.VIEW_ASSEMBLIES],
  '/assembleias': [Permission.VIEW_ASSEMBLIES],

  // IA
  '/ia/overview': [Permission.VIEW_IA_OVERVIEW],
  '/ia/previsoes': [Permission.VIEW_IA_PREDICTIONS],
  '/ia/sugestoes': [Permission.VIEW_IA_SUGGESTIONS],
  '/ia/comunicacao': [Permission.VIEW_IA_COMMUNICATION],
  '/ia/aprendizado': [Permission.MANAGE_IA_LEARNING],

  // Administração
  '/reports': [Permission.VIEW_REPORTS],
  '/management': [Permission.MANAGE_USERS],
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user } = useAuth()

  // Determinar role do usuário (fallback para MORADOR)
  const userRole = (user?.role as UserRole) || UserRole.MORADOR

  // Obter permissões baseadas no role
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS[UserRole.MORADOR]

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissionsToCheck: Permission[]): boolean => {
    return permissionsToCheck.some(permission => permissions.includes(permission))
  }

  const hasAllPermissions = (permissionsToCheck: Permission[]): boolean => {
    return permissionsToCheck.every(permission => permissions.includes(permission))
  }

  const canAccessRoute = (route: string): boolean => {
    const requiredPermissions = ROUTE_PERMISSIONS[route]
    if (!requiredPermissions) return true // Rota pública
    return hasAnyPermission(requiredPermissions)
  }

  const getRoleName = (): string => {
    const roleNames = {
      [UserRole.MORADOR]: 'Morador',
      [UserRole.SINDICO]: 'Síndico',
      [UserRole.PORTEIRO]: 'Porteiro',
      [UserRole.ADMINISTRACAO]: 'Administração',
      [UserRole.CONECTA_ADMIN]: 'Super Admin'
    }
    return roleNames[userRole] || 'Usuário'
  }

  const getRoleColor = (): string => {
    const roleColors = {
      [UserRole.MORADOR]: 'from-blue-500 to-blue-600',
      [UserRole.SINDICO]: 'from-purple-500 to-purple-600',
      [UserRole.PORTEIRO]: 'from-green-500 to-green-600',
      [UserRole.ADMINISTRACAO]: 'from-orange-500 to-orange-600',
      [UserRole.CONECTA_ADMIN]: 'from-red-500 to-red-600'
    }
    return roleColors[userRole] || 'from-gray-500 to-gray-600'
  }

  const value: PermissionContextType = {
    userRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    getRoleName,
    getRoleColor
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

// Hook para usar o contexto de permissões
export function usePermissions(): PermissionContextType {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Componente para renderização condicional baseada em permissões
interface ProtectedComponentProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  role?: UserRole
  minimumRole?: UserRole
}

export function ProtectedComponent({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  role,
  minimumRole
}: ProtectedComponentProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, userRole } = usePermissions()

  // Verificar role específico
  if (role && userRole !== role) {
    return <>{fallback}</>
  }

  // Verificar role mínimo
  if (minimumRole && userRole < minimumRole) {
    return <>{fallback}</>
  }

  // Verificar permissão única
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Verificar múltiplas permissões
  if (permissions.length > 0) {
    const hasAccess = requireAll ?
      hasAllPermissions(permissions) :
      hasAnyPermission(permissions)

    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

// Hook para verificar permissões de forma declarativa
export function usePermissionCheck() {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRoute } = usePermissions()

  return {
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,
    canAccess: canAccessRoute
  }
}