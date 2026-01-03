"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTheme, ThemeToggle } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import { api, API_BASE } from '@/lib/api'
import {
  Package, Calendar, LayoutDashboard, Megaphone, Building2, ClipboardList,
  Wrench, AlertTriangle, FileText, Vote, BarChart3, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, User, Bell, ChevronDown, Brain,
  DollarSign, Newspaper, Sparkles, Menu, X, Shield, Camera, UserCheck,
  Lock, Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

// 📦 ESTRUTURA DE MENU CATEGORIZADA CONECTA PLUS
const menuCategories = [
  {
    title: "PRINCIPAL",
    icon: LayoutDashboard,
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', description: 'Visão geral do sistema' },
      { icon: Bell, label: 'Alertas', path: '/alertas', badge: 3, description: 'Central de notificações' },
    ]
  },
  {
    title: "SEGURANÇA",
    icon: Shield,
    items: [
      { icon: Camera, label: 'CFTV', path: '/seguranca/cftv', description: 'Circuito fechado de câmeras' },
      { icon: UserCheck, label: 'Controle de Acesso', path: '/seguranca/acesso', description: 'Autorização de visitantes' },
      { icon: Lock, label: 'Alarmes', path: '/seguranca/alarmes', description: 'Central de alarmes' },
      { icon: Shield, label: 'Portaria Virtual', path: '/seguranca/portaria', description: 'Portaria em tempo real' },
    ]
  },
  {
    title: "GESTÃO",
    icon: Settings,
    items: [
      { icon: DollarSign, label: 'Financeiro', path: '/management/financeiro', description: 'Gestão financeira' },
      { icon: AlertTriangle, label: 'Ocorrências', path: '/ocorrencias', description: 'Registro de ocorrências' },
      { icon: Calendar, label: 'Reservas', path: '/reservas', description: 'Reservas de espaços' },
      { icon: Package, label: 'Encomendas', path: '/encomendas', description: 'Controle de encomendas' },
      { icon: Wrench, label: 'Manutenção', path: '/manutencao', description: 'Solicitações de manutenção' },
    ]
  },
  {
    title: "COMUNICAÇÃO",
    icon: Users,
    items: [
      { icon: Megaphone, label: 'Comunicados', path: '/comunicados', description: 'Avisos oficiais' },
      { icon: Newspaper, label: 'Classificados', path: '/classificados', description: 'Marketplace interno' },
      { icon: Vote, label: 'Assembleias', path: '/voting', description: 'Assembleias e votações' },
    ]
  },
  {
    title: "INTELIGÊNCIA IA",
    icon: Brain,
    items: [
      { icon: Brain, label: 'Visão Geral IA', path: '/ia/overview', description: 'Dashboard de IA', isNew: true },
      { icon: Zap, label: 'Previsões', path: '/ia/previsoes', description: 'Predições de problemas' },
      { icon: Sparkles, label: 'Sugestões', path: '/ia/sugestoes', description: 'Recomendações automáticas' },
      { icon: Bell, label: 'Comunicação IA', path: '/ia/comunicacao', description: 'Otimização de timing' },
      { icon: Settings, label: 'Aprendizado', path: '/ia/aprendizado', description: 'Sistema de feedback' },
    ]
  }
]

const miscItems = [
  { icon: Settings, label: 'Funcionalidades', path: '/funcionalidades', description: 'Configurações do sistema' },
]

interface UserProfile {
  id: number
  name: string
  email: string
  photo_url: string | null
  role: number
}

const getRoleName = (role: number | string) => {
  const roles: Record<number, string> = {
    1: 'Morador',
    2: 'Síndico',
    3: 'Porteiro',
    4: 'Administrador',
    5: 'Super Admin',
    9: 'Agente AGP',
  }
  if (typeof role === 'number') return roles[role] || 'Usuário'
  return role || 'Usuário'
}

const getRoleGradient = (role: number | string) => {
  const gradients: Record<number, string> = {
    1: 'from-blue-500 to-blue-600',
    2: 'from-amber-500 to-amber-600',
    3: 'from-green-500 to-green-600',
    4: 'from-red-500 to-red-600',
    5: 'from-purple-500 to-purple-600',
    9: 'from-cyan-500 to-cyan-600',
  }
  if (typeof role === 'number') return gradients[role] || 'from-gray-500 to-gray-600'
  return 'from-gray-500 to-gray-600'
}

interface ModernSidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function ModernSidebar({ isMobileOpen = false, onMobileClose }: ModernSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { effectiveTheme } = useTheme()

  const [collapsed, setCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // 📱 Mobile breakpoint detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 👤 Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/auth/me')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    fetchProfile()
  }, [])

  // 📊 User data processing
  const userName = profile?.name || user?.name || 'Usuário'
  const userInitials = userName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
  const userRole = profile?.role ?? user?.role ?? 1
  const userPhoto = profile?.photo_url ? `${API_BASE.replace('/api/v1', '')}${profile.photo_url}` : null

  // 🎨 Animation variants
  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 80 },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    hover: { x: 4, scale: 1.02 }
  }

  const categoryVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.05 }
    }
  }

  // 🔄 Handle navigation
  const handleNavigation = (path: string) => {
    router.push(path)
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
    setShowUserMenu(false)
  }

  // 🚪 Handle logout
  const handleLogout = () => {
    logout()
    if (isMobile && onMobileClose) {
      onMobileClose()
    }
  }

  return (
    <>
      {/* 📱 Mobile Backdrop */}
      {isMobile && isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* 📟 Main Sidebar */}
      <TooltipProvider delayDuration={300}>
        <motion.div
          initial={false}
          animate={collapsed ? 'collapsed' : 'expanded'}
          variants={sidebarVariants}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn(
            "fixed left-0 top-0 z-50 flex h-screen flex-col",
            "glass-card border-r border-border/50 backdrop-blur-xl",
            "bg-background/80 dark:bg-background/60",
            isMobile && !isMobileOpen && "translate-x-[-100%]",
            isMobile && "w-72",
            "md:translate-x-0 md:static"
          )}
        >
          {/* 🏠 Header */}
          <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
            <AnimatePresence mode="wait">
              {!collapsed ? (
                <motion.div
                  key="expanded-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="gradient-primary p-2 rounded-xl shadow-lg">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-fluid-sm font-bold text-foreground">
                      Agente Administrativo
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      <span>Versão 2025</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed-logo"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="gradient-primary p-2 rounded-xl shadow-lg mx-auto"
                >
                  <Building2 className="h-6 w-6 text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              {!collapsed && <ThemeToggle variant="glass" size="sm" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCollapsed(!collapsed)
                  setShowUserMenu(false)
                }}
                className="hover:bg-accent/50 p-2"
                aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMobileClose}
                  className="hover:bg-accent/50 p-2"
                  aria-label="Fechar menu"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 👤 User Section */}
          <div className="border-b border-border/50 p-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => !collapsed && setShowUserMenu(!showUserMenu)}
                  className={cn(
                    "glass-card relative cursor-pointer overflow-hidden p-3 transition-all duration-300",
                    "hover:bg-accent/20 active:bg-accent/30",
                    showUserMenu && "bg-accent/20",
                    collapsed ? "flex items-center justify-center" : "flex items-center gap-3"
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "relative overflow-hidden rounded-full shadow-lg ring-2 ring-border/50",
                    collapsed ? "h-10 w-10" : "h-11 w-11"
                  )}>
                    {userPhoto ? (
                      <Image
                        src={userPhoto}
                        alt={userName}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={cn(
                        "flex h-full w-full items-center justify-center bg-gradient-to-br text-white font-bold",
                        getRoleGradient(userRole)
                      )}>
                        {userInitials}
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background shadow-sm" />
                  </div>

                  {!collapsed && (
                    <div className="min-w-0 flex-1">
                      <div className="text-fluid-sm font-semibold text-foreground truncate">
                        {userName.split(' ')[0]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getRoleName(userRole)}
                      </div>
                    </div>
                  )}

                  {!collapsed && (
                    <motion.div
                      animate={{ rotate: showUserMenu ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right" hidden={!collapsed}>
                <p>{userName} - {getRoleName(userRole)}</p>
              </TooltipContent>
            </Tooltip>

            {/* 📱 User Menu Dropdown */}
            <AnimatePresence>
              {showUserMenu && !collapsed && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card absolute left-4 right-4 top-20 z-50 overflow-hidden border border-border/50 shadow-xl"
                >
                  <div className="p-2 space-y-1">
                    <UserMenuItem
                      icon={<User className="h-4 w-4" />}
                      label="Meu Perfil"
                      onClick={() => handleNavigation('/profile')}
                    />
                    <UserMenuItem
                      icon={<Bell className="h-4 w-4" />}
                      label="Notificações"
                      onClick={() => handleNavigation('/notifications')}
                      badge={3}
                    />
                    <UserMenuItem
                      icon={<Settings className="h-4 w-4" />}
                      label="Configurações"
                      onClick={() => handleNavigation('/settings')}
                    />
                    <Separator className="my-2" />
                    <UserMenuItem
                      icon={<LogOut className="h-4 w-4" />}
                      label="Sair da conta"
                      onClick={handleLogout}
                      danger
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 🧭 Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6" role="navigation" aria-label="Navegação principal">
            <AnimatePresence>
              {menuCategories.map((category, categoryIndex) => (
                <motion.div
                  key={category.title}
                  initial="hidden"
                  animate="visible"
                  variants={categoryVariants}
                  transition={{ delay: categoryIndex * 0.1 }}
                >
                  {/* Category Header */}
                  {!collapsed && (
                    <motion.div
                      className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                      variants={itemVariants}
                    >
                      <category.icon className="h-3 w-3" />
                      <span>{category.title}</span>
                    </motion.div>
                  )}

                  {/* Category Items */}
                  <div className="space-y-1">
                    {category.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')

                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>
                            <motion.button
                              variants={itemVariants}
                              whileHover="hover"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleNavigation(item.path)}
                              onMouseEnter={() => setHoveredItem(item.path)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={cn(
                                "relative w-full overflow-hidden rounded-lg transition-all duration-200",
                                "flex items-center gap-3 p-3 text-left",
                                isActive
                                  ? "glass-card bg-primary/10 text-primary shadow-lg ring-1 ring-primary/20"
                                  : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                                collapsed ? "justify-center" : "justify-start"
                              )}
                              aria-label={item.label}
                              aria-current={isActive ? "page" : undefined}
                            >
                              {/* Active indicator */}
                              {isActive && (
                                <motion.div
                                  layoutId="active-indicator"
                                  className="absolute left-0 top-0 h-full w-1 bg-primary"
                                  transition={{ duration: 0.3 }}
                                />
                              )}

                              {/* Icon */}
                              <Icon className={cn(
                                "h-5 w-5 shrink-0 transition-colors",
                                isActive && "text-primary"
                              )} />

                              {/* Label & Badge */}
                              {!collapsed && (
                                <>
                                  <span className="flex-1 text-fluid-sm font-medium">
                                    {item.label}
                                  </span>
                                  {item.badge && (
                                    <Badge
                                      variant="destructive"
                                      className="animate-pulse-glow h-5 min-w-[20px] text-xs"
                                    >
                                      {item.badge > 99 ? '99+' : item.badge}
                                    </Badge>
                                  )}
                                  {item.isNew && (
                                    <Badge
                                      variant="secondary"
                                      className="gradient-primary text-white h-5 text-xs"
                                    >
                                      NOVO
                                    </Badge>
                                  )}
                                </>
                              )}

                              {/* Hover effect */}
                              {hoveredItem === item.path && !isActive && (
                                <motion.div
                                  layoutId="hover-indicator"
                                  className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                />
                              )}
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="right" hidden={!collapsed}>
                            <div>
                              <p className="font-medium">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* 🔧 Misc Items */}
            {miscItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Separator className="mb-4" />
                <div className="space-y-1">
                  {miscItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.path || pathname?.startsWith(item.path + '/')

                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>
                          <motion.button
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleNavigation(item.path)}
                            className={cn(
                              "relative w-full overflow-hidden rounded-lg transition-all duration-200",
                              "flex items-center gap-3 p-3 text-left",
                              isActive
                                ? "glass-card bg-primary/10 text-primary shadow-lg ring-1 ring-primary/20"
                                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
                              collapsed ? "justify-center" : "justify-start"
                            )}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            {!collapsed && (
                              <span className="text-fluid-sm font-medium">{item.label}</span>
                            )}
                          </motion.button>
                        </TooltipTrigger>
                        <TooltipContent side="right" hidden={!collapsed}>
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </nav>

          {/* 🚪 Footer */}
          <div className="border-t border-border/50 p-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className={cn(
                    "w-full text-destructive hover:bg-destructive/10 hover:text-destructive",
                    collapsed ? "justify-center px-3" : "justify-start"
                  )}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="ml-3 font-medium">Sair</span>}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" hidden={!collapsed}>
                <p>Sair da conta</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </motion.div>
      </TooltipProvider>
    </>
  )
}

// 👤 User Menu Item Component
function UserMenuItem({
  icon,
  label,
  onClick,
  badge,
  danger = false
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  badge?: number
  danger?: boolean
}) {
  return (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent/50"
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && badge > 0 && (
        <Badge variant="destructive" className="h-5 min-w-[18px] text-xs">
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}
    </motion.button>
  )
}