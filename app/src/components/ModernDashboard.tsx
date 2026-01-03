"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { cn } from '@/lib/utils'
import {
  Home, Users, Car, AlertTriangle, UserPlus, Wrench, Package, Calendar,
  Clock, ArrowRight, Bell, Megaphone, BarChart3, KeyRound, Vote, FolderOpen,
  ShoppingBag, PawPrint, UserCheck, RefreshCw, TrendingUp, Activity, Zap,
  Sparkles, ArrowUp, ArrowDown, Minus, Eye, MessageCircle, FileText,
  Building2, Coffee, Shield, Brain, ChevronRight, Monitor, Unlock, Plus,
  Video, UserX, Gauge, CheckCircle2, XCircle, Timer, MapPin,
  AlertOctagon, Heart, Star, PlayCircle, PlusCircle, Send, CameraOff
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { safeFetch } from '@/lib/apiUtils'
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

// 📊 INTERFACES DE DADOS
interface StatsCompleto {
  gestao: { unidades: number; moradores: number; dependentes: number; veiculos: number; pets: number }
  visitantes: { total: number; hoje: number; semana: number }
  manutencao: { total: number; abertos: number; em_andamento: number; concluidos: number }
  ocorrencias: { total: number; abertas: number; em_andamento: number; resolvidas: number }
  comunicados: { total: number; fixados: number; visualizacoes: number; comentarios: number }
  pesquisas: { total: number; ativas: number; votos: number }
  documentos: { arquivos: number; pastas: number; tamanho_bytes: number }
  classificados: { total: number; ativos: number }
  acessos: { pendentes: number; aprovados: number }
  reservas: { areas_comuns: number; futuras: number }
  encomendas: { pendentes: number; entregues: number; total: number }
  votacoes: { ativas: number; total: number; participacao: number }
}

interface Atividade {
  tipo: string
  id: number
  titulo: string
  data: string
  icone: string
}

interface VisitanteAtivo {
  id: number
  nome: string
  foto?: string
  destino: string
  unidade: string
  timestamp: string
  status: 'aguardando' | 'autorizado' | 'negado'
}

interface ProximaReserva {
  id: number
  area: string
  solicitante: string
  unidade: string
  data: string
  horario: string
  status: 'confirmada' | 'pendente'
}

interface EnqueteAtiva {
  id: number
  titulo: string
  descricao: string
  votos_total: number
  prazo: string
  participacao: number
}

interface SolicitacaoAcesso {
  id: number
  tipo: string
  solicitante: string
  unidade: string
  timestamp: string
  urgencia: 'baixa' | 'media' | 'alta'
}

interface DashboardScore {
  valor: number
  situacao: string
  fatores: Array<{
    nome: string
    valor: number
    status: 'bom' | 'atencao' | 'critico'
  }>
}

interface StatCardModernProps {
  title: string
  value: number
  icon: React.ReactNode
  gradient: string
  trend?: {
    value: number
    positive: boolean
  }
  sparklineData?: number[]
  badge?: string
  onClick?: () => void
  delay?: number
}

// 🎨 COMPONENTE STATS CARD MODERNO
function ModernStatCard({
  title,
  value,
  icon,
  gradient,
  trend,
  sparklineData,
  badge,
  onClick,
  delay = 0
}: StatCardModernProps) {
  const [isHovered, setIsHovered] = useState(false)

  const chartData = sparklineData?.map((val, index) => ({ value: val, index })) || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          "glass-card relative overflow-hidden cursor-pointer transition-all duration-300",
          "hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.02]",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        {/* Gradient Background */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `linear-gradient(135deg, ${gradient})`
          }}
        />

        {/* Glass overlay */}
        <div className="absolute inset-0 glass-card bg-background/20" />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: isHovered ? "100%" : "-100%" }}
          transition={{ duration: 0.8 }}
        />

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              {icon}
            </div>

            <div className="flex flex-col items-end gap-1">
              {badge && (
                <Badge variant="secondary" className="text-xs bg-white/20 text-white">
                  {badge}
                </Badge>
              )}
              {trend && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.positive ? "text-green-300" : "text-red-300"
                )}>
                  {trend.positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>

          {/* Value */}
          <motion.div
            className="text-3xl font-bold text-white mb-1"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            {value.toLocaleString()}
          </motion.div>

          {/* Title */}
          <div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-3">
            {title}
          </div>

          {/* Sparkline */}
          {chartData.length > 0 && (
            <div className="h-8 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="rgba(255,255,255,0.8)"
                    fill="rgba(255,255,255,0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Action indicator */}
          <motion.div
            className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowRight className="h-4 w-4 text-white/60" />
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🎯 COMPONENTE SCORE DO CONDOMÍNIO
interface ScoreCardProps {
  score: DashboardScore
  delay?: number
}

function CondomínioScoreCard({ score, delay = 0 }: ScoreCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getScoreColor = (valor: number) => {
    if (valor >= 85) return { color: 'hsl(var(--success))', text: 'Excelente', emoji: '🏆' }
    if (valor >= 70) return { color: 'hsl(var(--chart-2))', text: 'Bom', emoji: '✅' }
    if (valor >= 50) return { color: 'hsl(var(--warning))', text: 'Atenção', emoji: '⚠️' }
    return { color: 'hsl(var(--destructive))', text: 'Crítico', emoji: '🚨' }
  }

  const scoreInfo = getScoreColor(score.valor)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="glass-card relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `linear-gradient(135deg, ${scoreInfo.color}, ${scoreInfo.color}/50)`
          }}
        />

        <CardContent className="relative p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-white/20">
                <Gauge className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Score do Condomínio</h3>
                <p className="text-sm text-muted-foreground">{score.situacao}</p>
              </div>
            </div>
            <div className="text-2xl">{scoreInfo.emoji}</div>
          </div>

          {/* Score Circular */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                className="stroke-muted"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke={scoreInfo.color}
                strokeWidth="3"
                strokeDasharray={`${score.valor}, 100`}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                className="text-3xl font-bold text-foreground"
                animate={{ scale: isHovered ? 1.1 : 1 }}
              >
                {score.valor}
              </motion.div>
              <div className="text-sm text-muted-foreground">de 100</div>
              <div className={`text-xs font-medium`} style={{ color: scoreInfo.color }}>
                {scoreInfo.text}
              </div>
            </div>
          </div>

          {/* Fatores */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground mb-3">Principais Fatores:</p>
            {score.fatores.slice(0, 3).map((fator, index) => (
              <motion.div
                key={fator.nome}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + (index * 0.1) }}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-muted-foreground">{fator.nome}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{fator.valor}%</span>
                  {fator.status === 'bom' && <CheckCircle2 className="h-3 w-3 text-success" />}
                  {fator.status === 'atencao' && <AlertTriangle className="h-3 w-3 text-warning" />}
                  {fator.status === 'critico' && <XCircle className="h-3 w-3 text-destructive" />}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🏢 COMPONENTE MODULE CARD MODERNO
interface ModuleCardProps {
  title: string
  icon: React.ReactNode
  gradient: string
  stats: Array<{ label: string; value: number; color: string }>
  onClick?: () => void
  delay?: number
}

function ModernModuleCard({ title, icon, gradient, stats, onClick, delay = 0 }: ModuleCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className="glass-card relative overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-2xl"
        onClick={onClick}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${gradient})`
          }}
        />

        <div className="absolute inset-0 glass-card bg-background/60" />

        <CardContent className="relative p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 backdrop-blur-sm">
                {icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            </div>

            <motion.div
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: delay + (index * 0.1) }}
                className="p-4 rounded-lg neu-inset bg-background/20"
              >
                <div
                  className="text-xs font-semibold mb-2 uppercase tracking-wider"
                  style={{ color: stat.color }}
                >
                  {stat.label}
                </div>
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  animate={{ scale: isHovered ? 1.1 : 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  {stat.value.toLocaleString()}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 👥 WIDGET VISITANTES ATIVOS
interface VisitantesWidgetProps {
  visitantes: VisitanteAtivo[]
  delay?: number
}

function VisitantesAtivosWidget({ visitantes, delay = 0 }: VisitantesWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-success" />
            Visitantes Ativos
            <Badge variant="secondary" className="ml-2">
              {visitantes.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto">
          {visitantes.length > 0 ? (
            <div className="space-y-3">
              {visitantes.map((visitante, index) => (
                <motion.div
                  key={visitante.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + (index * 0.1) }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/20"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{visitante.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {visitante.destino} • {visitante.unidade}
                    </p>
                  </div>
                  <Badge
                    variant={
                      visitante.status === 'autorizado'
                        ? 'default'
                        : visitante.status === 'aguardando'
                        ? 'secondary'
                        : 'destructive'
                    }
                    className="text-xs"
                  >
                    {visitante.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum visitante ativo</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 📅 WIDGET PRÓXIMAS RESERVAS
interface ReservasWidgetProps {
  reservas: ProximaReserva[]
  delay?: number
}

function ProximasReservasWidget({ reservas, delay = 0 }: ReservasWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-chart-2" />
            Próximas Reservas
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto">
          {reservas.length > 0 ? (
            <div className="space-y-3">
              {reservas.map((reserva, index) => (
                <motion.div
                  key={reserva.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + (index * 0.1) }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/20"
                >
                  <div className="w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-chart-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{reserva.area}</p>
                    <p className="text-xs text-muted-foreground">
                      {reserva.solicitante} • {reserva.horario}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{reserva.data}</p>
                    <Badge
                      variant={reserva.status === 'confirmada' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {reserva.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma reserva próxima</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🗳️ WIDGET ENQUETES ATIVAS
interface EnquetesWidgetProps {
  enquetes: EnqueteAtiva[]
  delay?: number
}

function EnquetesAtivasWidget({ enquetes, delay = 0 }: EnquetesWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5 text-chart-5" />
            Enquetes Ativas
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto">
          {enquetes.length > 0 ? (
            <div className="space-y-3">
              {enquetes.map((enquete, index) => (
                <motion.div
                  key={enquete.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + (index * 0.1) }}
                  className="p-3 rounded-lg bg-background/20 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{enquete.titulo}</h4>
                    <Badge variant="outline" className="text-xs">
                      {enquete.participacao}% participação
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {enquete.descricao}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {enquete.votos_total} votos
                    </span>
                    <span className="text-xs font-medium">
                      Prazo: {enquete.prazo}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Vote className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma enquete ativa</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🔑 WIDGET SOLICITAÇÕES DE ACESSO
interface SolicitacoesWidgetProps {
  solicitacoes: SolicitacaoAcesso[]
  delay?: number
}

function SolicitacoesAcessoWidget({ solicitacoes, delay = 0 }: SolicitacoesWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-warning" />
            Solicitações de Acesso
            {solicitacoes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {solicitacoes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-64 overflow-y-auto">
          {solicitacoes.length > 0 ? (
            <div className="space-y-3">
              {solicitacoes.map((solicitacao, index) => (
                <motion.div
                  key={solicitacao.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delay + (index * 0.1) }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/20"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      {
                        'bg-destructive/20': solicitacao.urgencia === 'alta',
                        'bg-warning/20': solicitacao.urgencia === 'media',
                        'bg-success/20': solicitacao.urgencia === 'baixa'
                      }
                    )}
                  >
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{solicitacao.tipo}</p>
                    <p className="text-xs text-muted-foreground">
                      {solicitacao.solicitante} • {solicitacao.unidade}
                    </p>
                  </div>
                  <Badge
                    variant={
                      solicitacao.urgencia === 'alta'
                        ? 'destructive'
                        : solicitacao.urgencia === 'media'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-xs"
                  >
                    {solicitacao.urgencia}
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma solicitação pendente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ⚡ WIDGET AÇÕES RÁPIDAS
function AcoesRapidasWidget({ delay = 0 }: { delay?: number }) {
  const router = useRouter()

  const acoes = [
    {
      titulo: "Ver Câmeras CFTV",
      icone: Video,
      cor: "text-primary",
      gradiente: "hsl(var(--primary) / 0.1)",
      acao: () => router.push('/seguranca/cftv')
    },
    {
      titulo: "Liberar Acesso",
      icone: Unlock,
      cor: "text-success",
      gradiente: "hsl(var(--success) / 0.1)",
      acao: () => router.push('/seguranca/acesso')
    },
    {
      titulo: "Nova Ocorrência",
      icone: PlusCircle,
      cor: "text-destructive",
      gradiente: "hsl(var(--destructive) / 0.1)",
      acao: () => router.push('/ocorrencias')
    },
    {
      titulo: "Novo Comunicado",
      icone: Send,
      cor: "text-chart-2",
      gradiente: "hsl(var(--chart-2) / 0.1)",
      acao: () => router.push('/comunicados')
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {acoes.map((acao, index) => (
            <motion.div
              key={acao.titulo}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + (index * 0.1) }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-auto p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg transition-all",
                  "bg-gradient-to-br from-background/50 to-background/20 hover:to-background/40"
                )}
                style={{ background: `linear-gradient(135deg, ${acao.gradiente}, transparent)` }}
                onClick={acao.acao}
              >
                <acao.icone className={cn("h-6 w-6", acao.cor)} />
                <span className="text-xs font-medium">{acao.titulo}</span>
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🎯 COMPONENTE PRINCIPAL DO DASHBOARD
export default function ModernDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const [stats, setStats] = useState<StatsCompleto | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [score, setScore] = useState<DashboardScore | null>(null)
  const [visitantesAtivos, setVisitantesAtivos] = useState<VisitanteAtivo[]>([])
  const [proximasReservas, setProximasReservas] = useState<ProximaReserva[]>([])
  const [enquetesAtivas, setEnquetesAtivas] = useState<EnqueteAtiva[]>([])
  const [solicitacoesAcesso, setSolicitacoesAcesso] = useState<SolicitacaoAcesso[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // 📊 Mock data para sparklines
  const generateSparklineData = () => Array.from({ length: 12 }, () => Math.floor(Math.random() * 100))

  const fetchData = useCallback(async () => {
    if (!refreshing) setLoading(true)
    setRefreshing(true)

    try {
      const tenantId = currentTenant?.tenant_id || 1

      const [statsResult, atividadesResult, widgetsResult] = await Promise.allSettled([
        safeFetch(`/dashboard/stats-completo?tenant_id=${tenantId}`),
        safeFetch(`/dashboard/atividades-recentes?tenant_id=${tenantId}`),
        safeFetch(`/dashboard/widgets?tenant_id=${tenantId}`)
      ])

      if (statsResult.status === 'fulfilled') {
        const statsData = statsResult.value
        if (!statsData.error) {
          setStats(statsData)
        } else {
          // Fallback com dados de demonstração
          setStats({
            gestao: { unidades: 145, moradores: 342, dependentes: 89, veiculos: 198, pets: 67 },
            visitantes: { total: 1250, hoje: 23, semana: 156 },
            manutencao: { total: 89, abertos: 12, em_andamento: 8, concluidos: 69 },
            ocorrencias: { total: 34, abertas: 5, em_andamento: 3, resolvidas: 26 },
            comunicados: { total: 45, fixados: 3, visualizacoes: 1890, comentarios: 127 },
            pesquisas: { total: 12, ativas: 2, votos: 234 },
            documentos: { arquivos: 156, pastas: 23, tamanho_bytes: 45000000 },
            classificados: { total: 67, ativos: 23 },
            acessos: { pendentes: 8, aprovados: 145 },
            reservas: { areas_comuns: 12, futuras: 18 },
            encomendas: { pendentes: 15, entregues: 89, total: 104 },
            votacoes: { ativas: 1, total: 5, participacao: 78 }
          })

          // Mock do score do condomínio
          setScore({
            valor: 87,
            situacao: "Situação excelente do condomínio",
            fatores: [
              { nome: "Financeiro", valor: 92, status: 'bom' },
              { nome: "Segurança", valor: 85, status: 'bom' },
              { nome: "Manutenção", valor: 78, status: 'atencao' },
              { nome: "Convivência", valor: 94, status: 'bom' },
              { nome: "Sustentabilidade", valor: 83, status: 'bom' }
            ]
          })

          // Mock de visitantes ativos
          setVisitantesAtivos([
            {
              id: 1,
              nome: "Ana Silva",
              destino: "Visita social",
              unidade: "Apto 1205",
              timestamp: "2026-01-03T14:30:00Z",
              status: 'aguardando'
            },
            {
              id: 2,
              nome: "Carlos Mendes",
              destino: "Entrega",
              unidade: "Apto 305",
              timestamp: "2026-01-03T13:45:00Z",
              status: 'autorizado'
            },
            {
              id: 3,
              nome: "Maria Santos",
              destino: "Manutenção",
              unidade: "Apto 1501",
              timestamp: "2026-01-03T15:10:00Z",
              status: 'autorizado'
            }
          ])

          // Mock de próximas reservas
          setProximasReservas([
            {
              id: 1,
              area: "Salão de Festas",
              solicitante: "João Pedro",
              unidade: "Apto 1205",
              data: "Hoje",
              horario: "19:00-23:00",
              status: 'confirmada'
            },
            {
              id: 2,
              area: "Churrasqueira 1",
              solicitante: "Ana Lima",
              unidade: "Apto 705",
              data: "Amanhã",
              horario: "12:00-18:00",
              status: 'confirmada'
            },
            {
              id: 3,
              area: "Quadra",
              solicitante: "Marcos Silva",
              unidade: "Apto 401",
              data: "03/01",
              horario: "08:00-10:00",
              status: 'pendente'
            }
          ])

          // Mock de enquetes ativas
          setEnquetesAtivas([
            {
              id: 1,
              titulo: "Horário da Academia",
              descricao: "Qual o melhor horário para funcionamento da academia?",
              votos_total: 67,
              prazo: "15/01",
              participacao: 45
            },
            {
              id: 2,
              titulo: "Nova Área de Lazer",
              descricao: "Aprovação para construção de playground infantil",
              votos_total: 89,
              prazo: "20/01",
              participacao: 72
            }
          ])

          // Mock de solicitações de acesso
          setSolicitacoesAcesso([
            {
              id: 1,
              tipo: "Acesso Garagem",
              solicitante: "Pedro Costa",
              unidade: "Apto 1105",
              timestamp: "2026-01-03T14:20:00Z",
              urgencia: 'alta'
            },
            {
              id: 2,
              tipo: "Chave Extra",
              solicitante: "Sandra Oliveira",
              unidade: "Apto 902",
              timestamp: "2026-01-03T13:30:00Z",
              urgencia: 'media'
            },
            {
              id: 3,
              tipo: "Cartão Visitante",
              solicitante: "Lucas Ferreira",
              unidade: "Apto 603",
              timestamp: "2026-01-03T12:15:00Z",
              urgencia: 'baixa'
            }
          ])
        }
      }

      if (atividadesResult.status === 'fulfilled') {
        const data = atividadesResult.value
        setAtividades(data.items || [])
      }
    } catch (error) {
      console.error('Dashboard error:', error)
    }

    setLoading(false)
    setRefreshing(false)
  }, [currentTenant])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const formatDate = (dateStr: string) => {
    try {
      const agora = new Date()
      const passado = new Date(dateStr)
      const diferencaMin = Math.floor((agora.getTime() - passado.getTime()) / 60000)

      if (diferencaMin < 1) return 'Agora mesmo'
      if (diferencaMin < 60) return `${diferencaMin}min atrás`

      const diferencaHoras = Math.floor(diferencaMin / 60)
      if (diferencaHoras < 24) return `${diferencaHoras}h atrás`

      const diferencaDias = Math.floor(diferencaHoras / 24)
      return `${diferencaDias}d atrás`
    } catch {
      return 'Data inválida'
    }
  }

  // 🎨 Loading State Moderno
  if (loading && !stats) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 bg-muted/20" />
          <Skeleton className="h-6 w-96 bg-muted/10" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="h-12 w-12 rounded-xl bg-muted/20" />
                  <Skeleton className="h-4 w-8 bg-muted/10" />
                </div>
                <Skeleton className="h-8 w-16 mb-2 bg-muted/20" />
                <Skeleton className="h-4 w-20 mb-3 bg-muted/10" />
                <Skeleton className="h-8 w-full bg-muted/5" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Module Cards Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl bg-muted/20" />
                    <Skeleton className="h-6 w-24 bg-muted/10" />
                  </div>
                  <Skeleton className="h-5 w-5 bg-muted/10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="p-4 rounded-lg bg-muted/5">
                      <Skeleton className="h-3 w-16 mb-2 bg-muted/10" />
                      <Skeleton className="h-6 w-12 bg-muted/20" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    )
  }

  const firstName = user?.name?.split(' ')[0] || 'Usuário'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* 🌅 Header Moderno */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <motion.h1
              className="text-fluid-2xl font-bold gradient-primary bg-clip-text text-transparent"
              animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              Olá, {firstName}! 👋
            </motion.h1>
            <p className="text-muted-foreground text-fluid-lg">
              Resumo em tempo real do condomínio •
              <span className="text-primary font-medium"> Atualizado agora</span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="glass-button"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* 📊 Quick Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Building2 className="h-4 w-4 text-primary" />
            <span>{stats?.gestao?.unidades || 0} unidades</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span>{stats?.gestao?.moradores || 0} moradores</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Sistema ativo</span>
          </div>
        </div>
      </motion.div>

      {/* 🎯 Score do Condomínio + Ações Rápidas */}
      {score && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CondomínioScoreCard score={score} delay={0.1} />
          </div>
          <AcoesRapidasWidget delay={0.2} />
        </div>
      )}

      {/* 📈 Stats Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <ModernStatCard
          title="Unidades"
          value={stats?.gestao?.unidades || 0}
          icon={<Home className="h-6 w-6 text-white" />}
          gradient="hsl(var(--warning)), hsl(var(--warning) / 0.8)"
          trend={{ value: 12, positive: true }}
          sparklineData={generateSparklineData()}
          delay={0.1}
          onClick={() => router.push('/management')}
        />

        <ModernStatCard
          title="Moradores"
          value={stats?.gestao?.moradores || 0}
          icon={<Users className="h-6 w-6 text-white" />}
          gradient="hsl(var(--primary)), hsl(var(--primary) / 0.8)"
          trend={{ value: 5, positive: true }}
          sparklineData={generateSparklineData()}
          delay={0.2}
          onClick={() => router.push('/management')}
        />

        <ModernStatCard
          title="Dependentes"
          value={stats?.gestao?.dependentes || 0}
          icon={<UserPlus className="h-6 w-6 text-white" />}
          gradient="hsl(var(--chart-5)), hsl(var(--chart-4))"
          trend={{ value: 8, positive: true }}
          sparklineData={generateSparklineData()}
          delay={0.3}
          onClick={() => router.push('/management')}
        />

        <ModernStatCard
          title="Veículos"
          value={stats?.gestao?.veiculos || 0}
          icon={<Car className="h-6 w-6 text-white" />}
          gradient="hsl(var(--success)), hsl(var(--success) / 0.8)"
          trend={{ value: 3, positive: false }}
          sparklineData={generateSparklineData()}
          delay={0.4}
          onClick={() => router.push('/management')}
        />

        <ModernStatCard
          title="Pets"
          value={stats?.gestao?.pets || 0}
          icon={<PawPrint className="h-6 w-6 text-white" />}
          gradient="hsl(var(--chart-1)), hsl(var(--chart-2))"
          sparklineData={generateSparklineData()}
          badge="NOVO"
          delay={0.5}
          onClick={() => router.push('/management')}
        />
      </div>

      {/* 🏢 Módulos Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <ModernModuleCard
          title="Manutenção"
          icon={<Wrench className="h-6 w-6 text-warning" />}
          gradient="hsl(var(--warning) / 0.2), hsl(var(--warning) / 0.05)"
          stats={[
            { label: "Abertos", value: stats?.manutencao?.abertos || 0, color: "hsl(var(--destructive))" },
            { label: "Em Andamento", value: stats?.manutencao?.em_andamento || 0, color: "hsl(var(--warning))" },
            { label: "Concluídos", value: stats?.manutencao?.concluidos || 0, color: "hsl(var(--success))" },
            { label: "Total", value: stats?.manutencao?.total || 0, color: "hsl(var(--muted-foreground))" }
          ]}
          onClick={() => router.push('/maintenance')}
          delay={0.1}
        />

        <ModernModuleCard
          title="Ocorrências"
          icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
          gradient="hsl(var(--destructive) / 0.2), hsl(var(--destructive) / 0.05)"
          stats={[
            { label: "Abertas", value: stats?.ocorrencias?.abertas || 0, color: "hsl(var(--destructive))" },
            { label: "Em Andamento", value: stats?.ocorrencias?.em_andamento || 0, color: "hsl(var(--warning))" },
            { label: "Resolvidas", value: stats?.ocorrencias?.resolvidas || 0, color: "hsl(var(--success))" },
            { label: "Total", value: stats?.ocorrencias?.total || 0, color: "hsl(var(--muted-foreground))" }
          ]}
          onClick={() => router.push('/occurrences')}
          delay={0.2}
        />

        <ModernModuleCard
          title="Comunicados"
          icon={<Megaphone className="h-6 w-6 text-primary" />}
          gradient="hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05)"
          stats={[
            { label: "Total", value: stats?.comunicados?.total || 0, color: "hsl(var(--primary))" },
            { label: "Fixados", value: stats?.comunicados?.fixados || 0, color: "hsl(var(--chart-5))" },
            { label: "Views", value: stats?.comunicados?.visualizacoes || 0, color: "hsl(var(--success))" },
            { label: "Comentários", value: stats?.comunicados?.comentarios || 0, color: "hsl(var(--warning))" }
          ]}
          onClick={() => router.push('/announcements')}
          delay={0.3}
        />
      </div>

      {/* 📊 Widgets Interativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <VisitantesAtivosWidget visitantes={visitantesAtivos} delay={0.1} />
        <ProximasReservasWidget reservas={proximasReservas} delay={0.2} />
        <EnquetesAtivasWidget enquetes={enquetesAtivas} delay={0.3} />
        <SolicitacoesAcessoWidget solicitacoes={solicitacoesAcesso} delay={0.4} />
      </div>

      {/* 📋 Módulos Secundários */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          {
            title: "Pesquisas",
            icon: <Vote className="h-5 w-5 text-chart-5" />,
            value: stats?.pesquisas?.ativas || 0,
            subtitle: "ativas",
            detail: `${stats?.pesquisas?.votos || 0} votos`,
            gradient: "hsl(var(--chart-5) / 0.2), hsl(var(--chart-5) / 0.05)",
            path: "/surveys"
          },
          {
            title: "Documentos",
            icon: <FolderOpen className="h-5 w-5 text-success" />,
            value: stats?.documentos?.arquivos || 0,
            subtitle: "arquivos",
            detail: formatBytes(stats?.documentos?.tamanho_bytes || 0),
            gradient: "hsl(var(--success) / 0.2), hsl(var(--success) / 0.05)",
            path: "/documents"
          },
          {
            title: "Entre Vizinhos",
            icon: <ShoppingBag className="h-5 w-5 text-warning" />,
            value: stats?.classificados?.ativos || 0,
            subtitle: "anúncios ativos",
            detail: `${stats?.classificados?.total || 0} total`,
            gradient: "hsl(var(--warning) / 0.2), hsl(var(--warning) / 0.05)",
            path: "/entre-vizinhos"
          },
          {
            title: "Visitantes",
            icon: <UserCheck className="h-5 w-5 text-chart-2" />,
            value: stats?.visitantes?.hoje || 0,
            subtitle: "hoje",
            detail: `${stats?.visitantes?.semana || 0} na semana`,
            gradient: "hsl(var(--chart-2) / 0.2), hsl(var(--chart-2) / 0.05)",
            path: "/reports/visitors"
          }
        ].map((module, index) => (
          <motion.div
            key={module.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
          >
            <Card
              className="glass-card cursor-pointer group hover:shadow-xl hover:scale-105 transition-all duration-300"
              onClick={() => router.push(module.path)}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${module.gradient})`
                }}
              />

              <CardContent className="relative p-6 text-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-background/20">
                      {module.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">{module.title}</h3>
                  </div>
                  <motion.div
                    animate={{ x: 0 }}
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </div>

                <div className="text-3xl font-bold text-foreground mb-2">
                  {module.value.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mb-2">{module.subtitle}</div>
                <div className="text-sm text-foreground">{module.detail}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* 🎯 Atividades Recentes */}
      {atividades.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atividades.slice(0, 5).map((atividade, index) => {
                  const iconMap: Record<string, any> = {
                    'manutencao': Wrench,
                    'ocorrencia': AlertTriangle,
                    'comunicado': Megaphone,
                    'visitante': UserCheck,
                    'encomenda': Package,
                    'reserva': Calendar
                  }

                  const Icon = iconMap[atividade.tipo] || Bell

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div className="p-3 rounded-xl bg-primary/20">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {atividade.titulo}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(atividade.data)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}