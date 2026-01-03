"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  AlertTriangle, Camera, UserX, Shield, AlertOctagon, Bell,
  Eye, CheckCircle2, XCircle, Clock, Filter, Search,
  Video, Wrench, CreditCard, Activity, CircleIcon, Calendar,
  Trash2, MoreVertical, RefreshCw, MessageCircle,
  CameraOff, Power, AlertCircle, Zap, Volume2, VolumeX
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { safeFetch } from '@/lib/apiUtils'

// 🚨 INTERFACES DE ALERTAS
interface Alerta {
  id: number
  tipo: 'camera_offline' | 'visitante_aguardando' | 'acesso_negado' | 'movimento_detectado' |
        'alarme_acionado' | 'manutencao_urgente' | 'boleto_vencido' | 'sistema_offline'
  titulo: string
  descricao: string
  timestamp: string
  prioridade: 'critica' | 'alta' | 'media' | 'baixa'
  status: 'pendente' | 'reconhecido' | 'resolvido' | 'ignorado'
  localizacao?: string
  dados_adicionais?: Record<string, any>
  usuario_responsavel?: string
}

interface AlertaStats {
  total: number
  pendentes: number
  reconhecidos: number
  resolvidos: number
  criticos: number
  por_tipo: Record<string, number>
}

// 🎨 CONFIGURAÇÕES DOS TIPOS DE ALERTA
const ALERT_CONFIG = {
  camera_offline: {
    icon: CameraOff,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    label: 'Câmera Offline'
  },
  visitante_aguardando: {
    icon: UserX,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    label: 'Visitante Aguardando'
  },
  acesso_negado: {
    icon: Shield,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    label: 'Acesso Negado'
  },
  movimento_detectado: {
    icon: Activity,
    color: 'text-chart-2',
    bgColor: 'bg-chart-2/10',
    borderColor: 'border-chart-2/20',
    label: 'Movimento Detectado'
  },
  alarme_acionado: {
    icon: AlertOctagon,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    label: 'Alarme Acionado'
  },
  manutencao_urgente: {
    icon: Wrench,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    label: 'Manutenção Urgente'
  },
  boleto_vencido: {
    icon: CreditCard,
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
    borderColor: 'border-chart-5/20',
    label: 'Boleto Vencido'
  },
  sistema_offline: {
    icon: Power,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    label: 'Sistema Offline'
  }
}

const PRIORITY_CONFIG = {
  critica: {
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    label: 'Crítica',
    icon: AlertOctagon
  },
  alta: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Alta',
    icon: AlertTriangle
  },
  media: {
    color: 'text-chart-2',
    bg: 'bg-chart-2/10',
    label: 'Média',
    icon: AlertCircle
  },
  baixa: {
    color: 'text-muted-foreground',
    bg: 'bg-muted/10',
    label: 'Baixa',
    icon: CircleIcon
  }
}

// 📊 COMPONENTE DE ESTATÍSTICAS
function AlertaStatCard({
  title,
  value,
  icon: Icon,
  color,
  delay = 0
}: {
  title: string
  value: number
  icon: any
  color: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2 }}
    >
      <Card className="glass-card hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className={cn("p-3 rounded-xl", color)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🚨 COMPONENTE DE ITEM DE ALERTA
function AlertaItem({
  alerta,
  onAction,
  delay = 0
}: {
  alerta: Alerta
  onAction: (id: number, action: string) => void
  delay?: number
}) {
  const alertConfig = ALERT_CONFIG[alerta.tipo]
  const priorityConfig = PRIORITY_CONFIG[alerta.prioridade]
  const Icon = alertConfig.icon
  const PriorityIcon = priorityConfig.icon

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / (1000 * 60))

      if (minutes < 1) return 'Agora mesmo'
      if (minutes < 60) return `${minutes}min atrás`

      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h atrás`

      return date.toLocaleDateString()
    } catch {
      return 'Data inválida'
    }
  }

  const getStatusIcon = () => {
    switch (alerta.status) {
      case 'reconhecido': return <Eye className="h-4 w-4 text-chart-2" />
      case 'resolvido': return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'ignorado': return <XCircle className="h-4 w-4 text-muted-foreground" />
      default: return <AlertTriangle className="h-4 w-4 text-warning" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ x: 4 }}
    >
      <Card className={cn(
        "relative group cursor-pointer transition-all duration-300 hover:shadow-lg",
        alertConfig.bgColor,
        alertConfig.borderColor,
        "border-l-4"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Ícone do Tipo */}
            <div className={cn("p-2 rounded-lg", alertConfig.bgColor)}>
              <Icon className={cn("h-5 w-5", alertConfig.color)} />
            </div>

            {/* Conteúdo Principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-sm">
                    {alerta.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {alerta.descricao}
                  </p>
                </div>

                {/* Prioridade */}
                <div className="flex items-center gap-1 ml-2">
                  <PriorityIcon className={cn("h-3 w-3", priorityConfig.color)} />
                  <span className={cn("text-xs font-medium", priorityConfig.color)}>
                    {priorityConfig.label}
                  </span>
                </div>
              </div>

              {/* Metadados */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(alerta.timestamp)}
                </div>

                {alerta.localizacao && (
                  <div className="flex items-center gap-1">
                    <CircleIcon className="h-2 w-2 fill-current" />
                    {alerta.localizacao}
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {getStatusIcon()}
                  <span className="capitalize">{alerta.status}</span>
                </div>
              </div>
            </div>

            {/* Ações */}
            {alerta.status === 'pendente' && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction(alerta.id, 'reconhecer')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction(alerta.id, 'resolver')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAction(alerta.id, 'ignorar')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🎯 COMPONENTE PRINCIPAL
export default function AlertasPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [stats, setStats] = useState<AlertaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    status: 'todos',
    prioridade: 'todos',
    tipo: 'todos',
    busca: ''
  })
  const [refreshing, setRefreshing] = useState(false)

  // 🔄 FETCH DE DADOS
  const fetchAlertas = useCallback(async () => {
    if (!refreshing) setLoading(true)
    setRefreshing(true)

    try {
      const tenantId = currentTenant?.tenant_id || 1

      const [alertasResult, statsResult] = await Promise.allSettled([
        safeFetch(`/alertas?tenant_id=${tenantId}&status=${filtros.status}&prioridade=${filtros.prioridade}&tipo=${filtros.tipo}&busca=${filtros.busca}`),
        safeFetch(`/alertas/stats?tenant_id=${tenantId}`)
      ])

      // Se APIs não existirem, usar dados mockados
      if (alertasResult.status === 'rejected' || statsResult.status === 'rejected') {
        // MOCK DE ALERTAS
        const mockAlertas: Alerta[] = [
          {
            id: 1,
            tipo: 'camera_offline',
            titulo: 'Câmera da Portaria Principal Offline',
            descricao: 'A câmera da portaria principal parou de responder há 15 minutos',
            timestamp: '2026-01-03T14:45:00Z',
            prioridade: 'alta',
            status: 'pendente',
            localizacao: 'Portaria Principal',
            dados_adicionais: { camera_id: 'CAM_001', ultima_comunicacao: '2026-01-03T14:30:00Z' }
          },
          {
            id: 2,
            tipo: 'visitante_aguardando',
            titulo: 'Visitante Aguardando Autorização',
            descricao: 'Carlos Silva aguarda autorização para visita no Apto 1205',
            timestamp: '2026-01-03T15:00:00Z',
            prioridade: 'media',
            status: 'pendente',
            localizacao: 'Portão Social',
            dados_adicionais: { visitante: 'Carlos Silva', destino: 'Apto 1205', documento: 'CPF: ***123456' }
          },
          {
            id: 3,
            tipo: 'acesso_negado',
            titulo: 'Tentativa de Acesso Negada',
            descricao: 'Cartão não reconhecido no acesso da garagem',
            timestamp: '2026-01-03T14:20:00Z',
            prioridade: 'alta',
            status: 'reconhecido',
            localizacao: 'Garagem',
            dados_adicionais: { cartao_id: 'UNKNOWN', tentativas: 3 }
          },
          {
            id: 4,
            tipo: 'movimento_detectado',
            titulo: 'Movimento em Área Restrita',
            descricao: 'Movimento detectado na área da piscina fora do horário permitido',
            timestamp: '2026-01-03T13:30:00Z',
            prioridade: 'media',
            status: 'resolvido',
            localizacao: 'Área da Piscina',
            dados_adicionais: { sensor: 'MOV_PISCINA_001', duracao: '5min' }
          },
          {
            id: 5,
            tipo: 'alarme_acionado',
            titulo: 'Alarme de Incêndio Ativado',
            descricao: 'Detector de fumaça acionado no 12º andar',
            timestamp: '2026-01-03T12:15:00Z',
            prioridade: 'critica',
            status: 'resolvido',
            localizacao: '12º Andar - Corredor',
            dados_adicionais: { detector: 'SMOKE_12_003', tipo: 'fumaça', bombeiros_acionados: true },
            usuario_responsavel: 'Sistema de Emergência'
          },
          {
            id: 6,
            tipo: 'manutencao_urgente',
            titulo: 'Elevador Social Parado',
            descricao: 'Elevador social apresentou falha e está fora de operação',
            timestamp: '2026-01-03T11:45:00Z',
            prioridade: 'alta',
            status: 'reconhecido',
            localizacao: 'Elevador Social',
            dados_adicionais: { elevador: 'ELV_SOCIAL_01', erro: 'FALHA_MOTOR', tecnico_acionado: true }
          },
          {
            id: 7,
            tipo: 'boleto_vencido',
            titulo: 'Múltiplos Boletos Vencidos',
            descricao: '15 boletos de condomínio venceram hoje sem pagamento',
            timestamp: '2026-01-03T10:00:00Z',
            prioridade: 'media',
            status: 'pendente',
            dados_adicionais: { quantidade: 15, valor_total: 'R$ 12.750,00' }
          },
          {
            id: 8,
            tipo: 'sistema_offline',
            titulo: 'Sistema de Backup Offline',
            descricao: 'O sistema de backup automático não está respondendo',
            timestamp: '2026-01-03T09:30:00Z',
            prioridade: 'alta',
            status: 'pendente',
            dados_adicionais: { ultimo_backup: '2026-01-02T22:00:00Z', status: 'OFFLINE' }
          }
        ]

        // MOCK DE ESTATÍSTICAS
        const mockStats: AlertaStats = {
          total: mockAlertas.length,
          pendentes: mockAlertas.filter(a => a.status === 'pendente').length,
          reconhecidos: mockAlertas.filter(a => a.status === 'reconhecido').length,
          resolvidos: mockAlertas.filter(a => a.status === 'resolvido').length,
          criticos: mockAlertas.filter(a => a.prioridade === 'critica').length,
          por_tipo: {
            camera_offline: 1,
            visitante_aguardando: 1,
            acesso_negado: 1,
            movimento_detectado: 1,
            alarme_acionado: 1,
            manutencao_urgente: 1,
            boleto_vencido: 1,
            sistema_offline: 1
          }
        }

        setAlertas(mockAlertas)
        setStats(mockStats)
      } else {
        // Usar dados das APIs quando disponíveis
        if (alertasResult.status === 'fulfilled') {
          setAlertas(alertasResult.value.items || [])
        }
        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value)
        }
      }
    } catch (error) {
      console.error('Erro ao buscar alertas:', error)
    }

    setLoading(false)
    setRefreshing(false)
  }, [currentTenant, filtros])

  useEffect(() => {
    fetchAlertas()
    // Auto-refresh a cada 30 segundos para alertas em tempo real
    const interval = setInterval(fetchAlertas, 30000)
    return () => clearInterval(interval)
  }, [fetchAlertas])

  // 🎯 AÇÕES DOS ALERTAS
  const handleAlertAction = async (alertaId: number, action: string) => {
    try {
      await safeFetch(`/alertas/${alertaId}/${action}`, 'POST')

      // Atualizar estado localmente
      setAlertas(prev => prev.map(alerta =>
        alerta.id === alertaId
          ? { ...alerta, status: action === 'reconhecer' ? 'reconhecido' : action === 'resolver' ? 'resolvido' : 'ignorado' }
          : alerta
      ))
    } catch (error) {
      console.error(`Erro ao ${action} alerta:`, error)
      // Em caso de erro na API, ainda atualiza o estado localmente (para demo)
      setAlertas(prev => prev.map(alerta =>
        alerta.id === alertaId
          ? { ...alerta, status: action === 'reconhecer' ? 'reconhecido' : action === 'resolver' ? 'resolvido' : 'ignorado' }
          : alerta
      ))
    }
  }

  // 🔍 FILTROS
  const alertasFiltrados = alertas.filter(alerta => {
    if (filtros.status !== 'todos' && alerta.status !== filtros.status) return false
    if (filtros.prioridade !== 'todos' && alerta.prioridade !== filtros.prioridade) return false
    if (filtros.tipo !== 'todos' && alerta.tipo !== filtros.tipo) return false
    if (filtros.busca && !alerta.titulo.toLowerCase().includes(filtros.busca.toLowerCase())
        && !alerta.descricao.toLowerCase().includes(filtros.busca.toLowerCase())) return false
    return true
  })

  const firstName = user?.name?.split(' ')[0] || 'Usuário'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 🚨 HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-fluid-2xl font-bold gradient-primary bg-clip-text text-transparent">
              Central de Alertas 🚨
            </h1>
            <p className="text-muted-foreground text-fluid-lg">
              Monitoramento em tempo real •
              <span className="text-primary font-medium"> {alertasFiltrados.length} alertas</span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlertas}
            disabled={refreshing}
            className="glass-button"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </motion.div>

      {/* 📊 ESTATÍSTICAS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <AlertaStatCard
            title="Total de Alertas"
            value={stats.total}
            icon={Bell}
            color="bg-gradient-to-br from-primary to-chart-1"
            delay={0.1}
          />
          <AlertaStatCard
            title="Pendentes"
            value={stats.pendentes}
            icon={AlertTriangle}
            color="bg-gradient-to-br from-warning to-warning/80"
            delay={0.2}
          />
          <AlertaStatCard
            title="Reconhecidos"
            value={stats.reconhecidos}
            icon={Eye}
            color="bg-gradient-to-br from-chart-2 to-chart-2/80"
            delay={0.3}
          />
          <AlertaStatCard
            title="Resolvidos"
            value={stats.resolvidos}
            icon={CheckCircle2}
            color="bg-gradient-to-br from-success to-success/80"
            delay={0.4}
          />
          <AlertaStatCard
            title="Críticos"
            value={stats.criticos}
            icon={AlertOctagon}
            color="bg-gradient-to-br from-destructive to-destructive/80"
            delay={0.5}
          />
        </div>
      )}

      {/* 🔍 FILTROS */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar alertas..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filtros.status}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="reconhecido">Reconhecidos</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                  <SelectItem value="ignorado">Ignorados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select
                value={filtros.prioridade}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, prioridade: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={filtros.tipo}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="camera_offline">Câmera Offline</SelectItem>
                  <SelectItem value="visitante_aguardando">Visitante Aguardando</SelectItem>
                  <SelectItem value="acesso_negado">Acesso Negado</SelectItem>
                  <SelectItem value="movimento_detectado">Movimento Detectado</SelectItem>
                  <SelectItem value="alarme_acionado">Alarme Acionado</SelectItem>
                  <SelectItem value="manutencao_urgente">Manutenção Urgente</SelectItem>
                  <SelectItem value="boleto_vencido">Boleto Vencido</SelectItem>
                  <SelectItem value="sistema_offline">Sistema Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-transparent">Ações</label>
              <Button
                variant="outline"
                onClick={() => setFiltros({ status: 'todos', prioridade: 'todos', tipo: 'todos', busca: '' })}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📋 LISTA DE ALERTAS */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Timeline de Alertas
            {alertasFiltrados.length > 0 && (
              <Badge variant="secondary">{alertasFiltrados.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence>
            {loading ? (
              // Loading skeleton
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted/10 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : alertasFiltrados.length > 0 ? (
              alertasFiltrados.map((alerta, index) => (
                <AlertaItem
                  key={alerta.id}
                  alerta={alerta}
                  onAction={handleAlertAction}
                  delay={index * 0.1}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  Nenhum alerta encontrado
                </h3>
                <p className="text-muted-foreground">
                  {filtros.status !== 'todos' || filtros.prioridade !== 'todos' || filtros.tipo !== 'todos' || filtros.busca
                    ? 'Tente ajustar os filtros para ver mais resultados'
                    : 'Tudo tranquilo! Não há alertas no momento.'
                  }
                </p>
                {(filtros.status !== 'todos' || filtros.prioridade !== 'todos' || filtros.tipo !== 'todos' || filtros.busca) && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setFiltros({ status: 'todos', prioridade: 'todos', tipo: 'todos', busca: '' })}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}