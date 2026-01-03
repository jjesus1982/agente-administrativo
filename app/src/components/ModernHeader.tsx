"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'
import {
  Search, Bell, Menu, User, Settings, LogOut, Clock,
  FileText, BarChart3, DollarSign, Wrench, Calendar,
  Package, Megaphone, Users, AlertTriangle, Building2,
  ChevronRight, ArrowRight, Command, Sparkles, Star,
  Home, Zap, TrendingUp, Activity, Shield, Brain, Filter
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command as CommandPrimitive,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// 🔍 COMANDO PALETTE DATA
const commandData = [
  {
    group: "Navegação",
    items: [
      { icon: Home, label: "Dashboard", value: "/dashboard", description: "Visão geral do sistema", keywords: ["dashboard", "início", "home", "principal"] },
      { icon: DollarSign, label: "Financeiro", value: "/management", description: "Gestão financeira", keywords: ["financeiro", "dinheiro", "pagamento", "cobrança"] },
      { icon: Calendar, label: "Reservas", value: "/reservas", description: "Reservas de espaços", keywords: ["reservas", "agendamento", "espaços"] },
      { icon: Wrench, label: "Manutenção", value: "/maintenance", description: "Solicitações de manutenção", keywords: ["manutenção", "reparo", "conserto"] },
      { icon: Package, label: "Encomendas", value: "/encomendas", description: "Controle de encomendas", keywords: ["encomendas", "correio", "entrega"] },
      { icon: AlertTriangle, label: "Ocorrências", value: "/occurrences", description: "Registro de ocorrências", keywords: ["ocorrências", "problemas", "incidentes"] },
      { icon: Megaphone, label: "Comunicados", value: "/announcements", description: "Comunicados gerais", keywords: ["comunicados", "avisos", "notícias"] },
      { icon: Users, label: "Entre Vizinhos", value: "/entre-vizinhos", description: "Rede social interna", keywords: ["vizinhos", "social", "comunidade"] },
      { icon: BarChart3, label: "Relatórios", value: "/reports", description: "Relatórios e estatísticas", keywords: ["relatórios", "estatísticas", "dados"] },
      { icon: Brain, label: "IA Overview", value: "/ia/overview", description: "Insights inteligentes", keywords: ["ia", "inteligência", "artificial", "insights"] }
    ]
  },
  {
    group: "Ações Rápidas",
    items: [
      { icon: FileText, label: "Nova Ocorrência", value: "action:new-occurrence", description: "Registrar nova ocorrência", keywords: ["nova", "ocorrência", "criar"] },
      { icon: Calendar, label: "Nova Reserva", value: "action:new-reservation", description: "Fazer nova reserva", keywords: ["nova", "reserva", "agendar"] },
      { icon: Megaphone, label: "Novo Comunicado", value: "action:new-announcement", description: "Criar comunicado", keywords: ["novo", "comunicado", "aviso"] },
      { icon: Wrench, label: "Solicitar Manutenção", value: "action:new-maintenance", description: "Nova solicitação de manutenção", keywords: ["manutenção", "solicitar", "reparo"] },
      { icon: Users, label: "Convidar Morador", value: "action:invite-resident", description: "Convidar novo morador", keywords: ["convidar", "morador", "novo"] }
    ]
  },
  {
    group: "Configurações",
    items: [
      { icon: User, label: "Meu Perfil", value: "/profile", description: "Editar perfil", keywords: ["perfil", "conta", "configurações"] },
      { icon: Bell, label: "Notificações", value: "/notifications", description: "Central de notificações", keywords: ["notificações", "alertas"] },
      { icon: Settings, label: "Configurações", value: "/settings", description: "Configurações do sistema", keywords: ["configurações", "preferências"] },
      { icon: Shield, label: "Funcionalidades", value: "/funcionalidades", description: "Gerenciar funcionalidades", keywords: ["funcionalidades", "recursos"] }
    ]
  }
]

// 📊 Recent items mock (in real app, this would come from localStorage or API)
const recentItems = [
  { icon: BarChart3, label: "Relatório Financeiro", value: "/reports/financial", timestamp: "2 min atrás" },
  { icon: Users, label: "Lista de Moradores", value: "/residents", timestamp: "5 min atrás" },
  { icon: AlertTriangle, label: "Ocorrência #1234", value: "/occurrences/1234", timestamp: "10 min atrás" }
]

// 📈 Popular actions mock
const popularActions = [
  { icon: Calendar, label: "Reservar Salão", value: "action:reserve-hall" },
  { icon: Wrench, label: "Manutenção Elevador", value: "action:elevator-maintenance" },
  { icon: FileText, label: "Visualizar Boletos", value: "/financial/boletos" }
]

// 📢 Notification data mock
const notifications = [
  {
    id: 1,
    icon: AlertTriangle,
    title: "Nova Ocorrência Registrada",
    description: "Ocorrência #1234 foi registrada",
    time: "5 min atrás",
    type: "warning",
    unread: true
  },
  {
    id: 2,
    icon: DollarSign,
    title: "Boleto Vencendo",
    description: "Boleto da taxa condominial vence amanhã",
    time: "1 hora atrás",
    type: "info",
    unread: true
  },
  {
    id: 3,
    icon: Calendar,
    title: "Reserva Confirmada",
    description: "Salão de festas reservado para 15/01",
    time: "2 horas atrás",
    type: "success",
    unread: false
  }
]

interface ModernHeaderProps {
  onMobileMenuToggle?: () => void
  title?: string
  subtitle?: string
}

interface BreadcrumbItem {
  label: string
  href?: string
}

export default function ModernHeader({ onMobileMenuToggle, title, subtitle }: ModernHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { effectiveTheme } = useTheme()

  const [commandOpen, setCommandOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [filteredItems, setFilteredItems] = useState(commandData)

  // 🔍 Command palette keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // 🏠 Generate breadcrumbs from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/dashboard' }]

    const pathMap: Record<string, string> = {
      'dashboard': 'Dashboard',
      'management': 'Financeiro',
      'reservas': 'Reservas',
      'maintenance': 'Manutenção',
      'occurrences': 'Ocorrências',
      'encomendas': 'Encomendas',
      'announcements': 'Comunicados',
      'entre-vizinhos': 'Entre Vizinhos',
      'reports': 'Relatórios',
      'ia': 'Inteligência Artificial',
      'overview': 'Visão Geral',
      'profile': 'Meu Perfil',
      'settings': 'Configurações',
      'notifications': 'Notificações',
      'funcionalidades': 'Funcionalidades'
    }

    pathSegments.forEach((segment, index) => {
      const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      const href = index === pathSegments.length - 1 ? undefined : `/${pathSegments.slice(0, index + 1).join('/')}`
      breadcrumbs.push({ label, href })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // 🔍 Handle command execution
  const handleCommandSelect = (value: string) => {
    setIsLoading(true)
    setCommandOpen(false)

    if (value.startsWith('action:')) {
      // Handle quick actions
      const action = value.replace('action:', '')
      toast.success(`Executando: ${action}`)

      // Here you would handle the specific action
      setTimeout(() => setIsLoading(false), 1000)
    } else {
      // Handle navigation
      router.push(value)
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  // 📱 Filter command items based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredItems(commandData)
      return
    }

    const filtered = commandData.map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(group => group.items.length > 0)

    setFilteredItems(filtered)
  }, [searchQuery])

  const unreadNotifications = notifications.filter(n => n.unread).length

  return (
    <>
      {/* 🎯 Main Header */}
      <header className="glass-card sticky top-0 z-40 border-b border-border/50 backdrop-blur-xl bg-background/80">
        <div className="flex h-16 items-center gap-4 px-4 md:px-6">

          {/* 📱 Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileMenuToggle}
            className="md:hidden hover:bg-accent/50"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* 🍞 Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="hidden md:flex">
            <ol className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground" />}
                  {crumb.href ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => router.push(crumb.href!)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </motion.button>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* 📱 Mobile title */}
          <div className="md:hidden flex-1">
            <h1 className="text-fluid-lg font-semibold text-foreground">
              {title || breadcrumbs[breadcrumbs.length - 1]?.label}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>

          {/* 🔍 Search Command Button */}
          <div className="flex-1 max-w-lg hidden md:block">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCommandOpen(true)}
              className="glass-button w-full flex items-center gap-3 px-4 py-2 text-left text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1">Buscar...</span>
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </motion.button>
          </div>

          {/* 🔍 Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="md:hidden hover:bg-accent/50"
            aria-label="Abrir busca"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* 🔔 Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative hover:bg-accent/50">
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 min-w-[20px] text-xs animate-pulse-glow"
                  >
                    {unreadNotifications}
                  </Badge>
                )}
                <span className="sr-only">
                  Notificações {unreadNotifications > 0 && `(${unreadNotifications} não lidas)`}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-card w-80 border-border/50"
              sideOffset={8}
            >
              <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-semibold">Notificações</span>
                {unreadNotifications > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs">
                    Marcar todas como lida
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex gap-3 p-3">
                    <div className={cn(
                      "mt-1 rounded-full p-2",
                      notification.type === 'warning' && "bg-amber-100 text-amber-600 dark:bg-amber-900/20",
                      notification.type === 'info' && "bg-blue-100 text-blue-600 dark:bg-blue-900/20",
                      notification.type === 'success' && "bg-green-100 text-green-600 dark:bg-green-900/20"
                    )}>
                      <notification.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {notification.unread && (
                          <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.description}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-sm">
                <Button variant="ghost" size="sm" className="w-full">
                  Ver todas as notificações
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 👤 User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-accent/50">
                <User className="h-5 w-5" />
                <span className="sr-only">Menu do usuário</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card w-56 border-border/50">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ⏳ Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary via-primary/50 to-primary"
          >
            <motion.div
              className="h-full bg-primary/50"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </header>

      {/* 🎯 Command Palette */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <div className="glass-card border-0">
          <CommandInput
            placeholder="Digite um comando ou faça uma busca..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-0 focus:ring-0"
          />
          <CommandList className="max-h-96 overflow-y-auto scrollbar-thin">
            <CommandEmpty className="py-6 text-center text-sm">
              <div className="flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-muted-foreground" />
                <span>Nenhum resultado encontrado</span>
                <span className="text-xs text-muted-foreground">
                  Tente usar palavras-chave diferentes
                </span>
              </div>
            </CommandEmpty>

            {/* 📈 Recent items */}
            {searchQuery === "" && (
              <>
                <CommandGroup heading="Recentes">
                  {recentItems.map((item, index) => (
                    <CommandItem
                      key={`recent-${index}`}
                      value={item.value}
                      onSelect={handleCommandSelect}
                      className="flex items-center gap-3"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />

                <CommandGroup heading="Ações Populares">
                  {popularActions.map((item, index) => (
                    <CommandItem
                      key={`popular-${index}`}
                      value={item.value}
                      onSelect={handleCommandSelect}
                      className="flex items-center gap-3"
                    >
                      <Star className="h-4 w-4 text-amber-500" />
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* 🔍 Filtered results */}
            {filteredItems.map((group) => (
              <CommandGroup key={group.group} heading={group.group}>
                {group.items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={handleCommandSelect}
                    className="flex items-center gap-3"
                  >
                    <item.icon className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{item.label}</span>
                        {item.value.startsWith('action:') && (
                          <Badge variant="secondary" className="text-xs">AÇÃO</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>

          {/* 💡 Command palette footer */}
          <div className="border-t border-border/50 p-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Command className="h-3 w-3" />
                <span>para buscar</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 flex">
                  ESC
                </kbd>
                <span>para fechar</span>
              </div>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  )
}