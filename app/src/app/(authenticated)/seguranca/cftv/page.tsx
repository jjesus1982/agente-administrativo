"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Video, VideoOff, Monitor, Grid3X3, Maximize2, Minimize2,
  RotateCcw, Camera, Zap, AlertTriangle, CheckCircle2,
  Settings, RefreshCw, Play, Square, Circle, MapPin,
  Volume2, VolumeX, Download, MoreVertical, Eye,
  Expand, Shrink, SkipBack, SkipForward, Calendar,
  Clock, Filter, Search, Power, Wifi, WifiOff
} from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/context/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import { safeFetch } from '@/lib/apiUtils'

// 📹 INTERFACES DE CÂMERAS
interface Camera {
  id: string
  nome: string
  localizacao: string
  url_stream: string
  status: 'online' | 'offline' | 'manutencao'
  tipo: 'fixa' | 'ptz' | 'dome'
  resolucao: string
  fps: number
  possui_audio: boolean
  possui_ptz: boolean
  possui_zoom: boolean
  gravacao_ativa: boolean
  deteccao_movimento: boolean
  visao_noturna: boolean
  ultima_atividade: string
  coordenadas?: { x: number; y: number }
}

interface CameraStats {
  total: number
  online: number
  offline: number
  gravando: number
  com_movimento: number
  armazenamento_usado: number
  armazenamento_total: number
}

interface GravacaoEvento {
  id: string
  camera_id: string
  timestamp: string
  duracao: number
  tipo: 'movimento' | 'manual' | 'agendada'
  tamanho_mb: number
  thumbnail?: string
}

// 🎛️ COMPONENTE DE CONTROLES PTZ
function PTZControls({
  camera,
  onPTZ
}: {
  camera: Camera
  onPTZ: (action: string, value?: number) => void
}) {
  const [zoom, setZoom] = useState(1)

  if (!camera.possui_ptz) return null

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <RotateCcw className="h-4 w-4" />
          Controles PTZ - {camera.nome}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direcionais */}
        <div className="grid grid-cols-3 gap-2">
          <div></div>
          <Button
            variant="outline"
            size="sm"
            onMouseDown={() => onPTZ('up')}
            onMouseUp={() => onPTZ('stop')}
          >
            ↑
          </Button>
          <div></div>

          <Button
            variant="outline"
            size="sm"
            onMouseDown={() => onPTZ('left')}
            onMouseUp={() => onPTZ('stop')}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPTZ('center')}
          >
            ●
          </Button>
          <Button
            variant="outline"
            size="sm"
            onMouseDown={() => onPTZ('right')}
            onMouseUp={() => onPTZ('stop')}
          >
            →
          </Button>

          <div></div>
          <Button
            variant="outline"
            size="sm"
            onMouseDown={() => onPTZ('down')}
            onMouseUp={() => onPTZ('stop')}
          >
            ↓
          </Button>
          <div></div>
        </div>

        {/* Zoom */}
        {camera.possui_zoom && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newZoom = Math.max(1, zoom - 0.5)
                  setZoom(newZoom)
                  onPTZ('zoom', newZoom)
                }}
              >
                -
              </Button>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => {
                  setZoom(value)
                  onPTZ('zoom', value)
                }}
                max={10}
                min={1}
                step={0.1}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newZoom = Math.min(10, zoom + 0.5)
                  setZoom(newZoom)
                  onPTZ('zoom', newZoom)
                }}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</p>
          </div>
        )}

        {/* Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Posições Predefinidas</label>
          <div className="grid grid-cols-2 gap-2">
            {['Portão', 'Garagem', 'Piscina', 'Playground'].map((preset) => (
              <Button
                key={preset}
                variant="ghost"
                size="sm"
                onClick={() => onPTZ('preset', preset)}
                className="text-xs"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 📹 COMPONENTE DE VISUALIZADOR DE CÂMERA
function CameraViewer({
  camera,
  isFullscreen = false,
  onFullscreen,
  onSnapshot,
  onRecord
}: {
  camera: Camera
  isFullscreen?: boolean
  onFullscreen: () => void
  onSnapshot: () => void
  onRecord: () => void
}) {
  const [isRecording, setIsRecording] = useState(camera.gravacao_ativa)
  const [hasAudio, setHasAudio] = useState(false)

  return (
    <Card className={cn(
      "relative group overflow-hidden",
      isFullscreen ? "fixed inset-4 z-50 bg-black" : "aspect-video"
    )}>
      {/* Stream de Vídeo */}
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
        {camera.status === 'online' ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">{camera.nome}</p>
              <p className="text-sm opacity-75">{camera.resolucao} • {camera.fps}fps</p>
              <p className="text-xs opacity-50 mt-2">Stream: {camera.url_stream}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="text-center text-gray-400">
              <VideoOff className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg font-medium">Câmera Offline</p>
              <p className="text-sm">{camera.nome}</p>
            </div>
          </div>
        )}

        {/* Overlay de Informações */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30">
          {/* Header */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant={camera.status === 'online' ? 'default' : 'destructive'}
                className="text-xs"
              >
                <Circle className={cn(
                  "h-2 w-2 mr-1",
                  camera.status === 'online' ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
                )} />
                {camera.status.toUpperCase()}
              </Badge>
              {camera.gravacao_ativa && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  <Circle className="h-2 w-2 mr-1 fill-red-500 text-red-500" />
                  REC
                </Badge>
              )}
              {camera.deteccao_movimento && (
                <Badge variant="secondary" className="text-xs">
                  <Eye className="h-2 w-2 mr-1" />
                  MOTION
                </Badge>
              )}
            </div>

            {/* Timestamp */}
            <div className="text-white text-sm font-mono bg-black/50 px-2 py-1 rounded">
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Footer com informações */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">{camera.nome}</h3>
                <p className="text-white/75 text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {camera.localizacao}
                </p>
              </div>

              {/* Controles */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {camera.possui_audio && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0"
                    onClick={() => setHasAudio(!hasAudio)}
                  >
                    {hasAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={onSnapshot}
                  title="Capturar"
                >
                  <Camera className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant={isRecording ? "destructive" : "secondary"}
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setIsRecording(!isRecording)
                    onRecord()
                  }}
                  title={isRecording ? "Parar Gravação" : "Iniciar Gravação"}
                >
                  {isRecording ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0"
                  onClick={onFullscreen}
                  title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// 📊 COMPONENTE DE ESTATÍSTICAS DE CÂMERAS
function CameraStatCard({
  title,
  value,
  total,
  icon: Icon,
  color,
  delay = 0
}: {
  title: string
  value: number
  total?: number
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
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", color)}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {value}{total && `/${total}`}
              </p>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🎯 COMPONENTE PRINCIPAL
export default function CFTVPage() {
  const { user } = useAuth()
  const { currentTenant } = useTenant()

  const [cameras, setCameras] = useState<Camera[]>([])
  const [stats, setStats] = useState<CameraStats | null>(null)
  const [gravacoes, setGravacoes] = useState<GravacaoEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // UI States
  const [layout, setLayout] = useState<'2x2' | '3x3' | '4x4'>('2x2')
  const [filtroLocalizacao, setFiltroLocalizacao] = useState('todas')
  const [filtroStatus, setFiltroStatus] = useState('todas')
  const [busca, setBusca] = useState('')
  const [cameraFullscreen, setCameraFullscreen] = useState<string | null>(null)
  const [cameraSelecionada, setCameraSelecionada] = useState<string | null>(null)

  // 🔄 FETCH DE DADOS
  const fetchDados = useCallback(async () => {
    if (!refreshing) setLoading(true)
    setRefreshing(true)

    try {
      const tenantId = currentTenant?.tenant_id || 1

      // Mock de câmeras para desenvolvimento
      const mockCameras: Camera[] = [
        {
          id: 'CAM_001',
          nome: 'Portaria Principal',
          localizacao: 'Entrada Principal',
          url_stream: 'rtsp://192.168.1.100:554/stream1',
          status: 'online',
          tipo: 'ptz',
          resolucao: '1920x1080',
          fps: 30,
          possui_audio: true,
          possui_ptz: true,
          possui_zoom: true,
          gravacao_ativa: true,
          deteccao_movimento: true,
          visao_noturna: true,
          ultima_atividade: '2026-01-03T15:30:00Z'
        },
        {
          id: 'CAM_002',
          nome: 'Garagem',
          localizacao: 'Subsolo - Garagem',
          url_stream: 'rtsp://192.168.1.101:554/stream1',
          status: 'online',
          tipo: 'fixa',
          resolucao: '1920x1080',
          fps: 25,
          possui_audio: false,
          possui_ptz: false,
          possui_zoom: false,
          gravacao_ativa: true,
          deteccao_movimento: true,
          visao_noturna: true,
          ultima_atividade: '2026-01-03T15:25:00Z'
        },
        {
          id: 'CAM_003',
          nome: 'Piscina',
          localizacao: 'Área de Lazer',
          url_stream: 'rtsp://192.168.1.102:554/stream1',
          status: 'offline',
          tipo: 'dome',
          resolucao: '1280x720',
          fps: 30,
          possui_audio: false,
          possui_ptz: true,
          possui_zoom: true,
          gravacao_ativa: false,
          deteccao_movimento: true,
          visao_noturna: false,
          ultima_atividade: '2026-01-03T14:15:00Z'
        },
        {
          id: 'CAM_004',
          nome: 'Hall Social',
          localizacao: '1º Andar',
          url_stream: 'rtsp://192.168.1.103:554/stream1',
          status: 'online',
          tipo: 'fixa',
          resolucao: '1920x1080',
          fps: 30,
          possui_audio: true,
          possui_ptz: false,
          possui_zoom: false,
          gravacao_ativa: true,
          deteccao_movimento: true,
          visao_noturna: true,
          ultima_atividade: '2026-01-03T15:28:00Z'
        },
        {
          id: 'CAM_005',
          nome: 'Playground',
          localizacao: 'Área Infantil',
          url_stream: 'rtsp://192.168.1.104:554/stream1',
          status: 'online',
          tipo: 'fixa',
          resolucao: '1280x720',
          fps: 25,
          possui_audio: false,
          possui_ptz: false,
          possui_zoom: false,
          gravacao_ativa: true,
          deteccao_movimento: true,
          visao_noturna: false,
          ultima_atividade: '2026-01-03T15:20:00Z'
        },
        {
          id: 'CAM_006',
          nome: 'Academia',
          localizacao: 'Academia',
          url_stream: 'rtsp://192.168.1.105:554/stream1',
          status: 'online',
          tipo: 'dome',
          resolucao: '1920x1080',
          fps: 30,
          possui_audio: false,
          possui_ptz: true,
          possui_zoom: true,
          gravacao_ativa: true,
          deteccao_movimento: true,
          visao_noturna: true,
          ultima_atividade: '2026-01-03T15:32:00Z'
        },
        {
          id: 'CAM_007',
          nome: 'Portão Fundos',
          localizacao: 'Entrada de Serviço',
          url_stream: 'rtsp://192.168.1.106:554/stream1',
          status: 'online',
          tipo: 'fixa',
          resolucao: '1280x720',
          fps: 25,
          possui_audio: true,
          possui_ptz: false,
          possui_zoom: false,
          gravacao_ativa: true,
          deteccao_movimento: true,
          visao_noturna: true,
          ultima_atividade: '2026-01-03T15:18:00Z'
        },
        {
          id: 'CAM_008',
          nome: 'Cobertura',
          localizacao: 'Terraço',
          url_stream: 'rtsp://192.168.1.107:554/stream1',
          status: 'manutencao',
          tipo: 'ptz',
          resolucao: '1920x1080',
          fps: 30,
          possui_audio: false,
          possui_ptz: true,
          possui_zoom: true,
          gravacao_ativa: false,
          deteccao_movimento: false,
          visao_noturna: true,
          ultima_atividade: '2026-01-03T12:45:00Z'
        }
      ]

      const mockStats: CameraStats = {
        total: mockCameras.length,
        online: mockCameras.filter(c => c.status === 'online').length,
        offline: mockCameras.filter(c => c.status === 'offline' || c.status === 'manutencao').length,
        gravando: mockCameras.filter(c => c.gravacao_ativa).length,
        com_movimento: mockCameras.filter(c => c.deteccao_movimento).length,
        armazenamento_usado: 156.7, // GB
        armazenamento_total: 500 // GB
      }

      setCameras(mockCameras)
      setStats(mockStats)

    } catch (error) {
      console.error('Erro ao buscar dados CFTV:', error)
    }

    setLoading(false)
    setRefreshing(false)
  }, [currentTenant])

  useEffect(() => {
    fetchDados()
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(fetchDados, 30000)
    return () => clearInterval(interval)
  }, [fetchDados])

  // 🎛️ AÇÕES DE CÂMERAS
  const handlePTZ = async (cameraId: string, action: string, value?: any) => {
    console.log('PTZ Action:', cameraId, action, value)
    // Implementar controles PTZ
  }

  const handleSnapshot = async (cameraId: string) => {
    console.log('Snapshot:', cameraId)
    // Implementar captura de imagem
  }

  const handleRecord = async (cameraId: string) => {
    console.log('Record toggle:', cameraId)
    // Implementar gravação manual
  }

  // 🔍 FILTROS
  const camerasFiltradas = cameras.filter(camera => {
    if (filtroStatus !== 'todas' && camera.status !== filtroStatus) return false
    if (filtroLocalizacao !== 'todas' && !camera.localizacao.toLowerCase().includes(filtroLocalizacao.toLowerCase())) return false
    if (busca && !camera.nome.toLowerCase().includes(busca.toLowerCase()) && !camera.localizacao.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const getGridCols = () => {
    switch (layout) {
      case '2x2': return 'grid-cols-2'
      case '3x3': return 'grid-cols-3'
      case '4x4': return 'grid-cols-4'
      default: return 'grid-cols-2'
    }
  }

  const localizacoes = [...new Set(cameras.map(c => c.localizacao))]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* 📹 HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-fluid-2xl font-bold gradient-primary bg-clip-text text-transparent">
              Sistema de CFTV 📹
            </h1>
            <p className="text-muted-foreground text-fluid-lg">
              Monitoramento em tempo real •
              <span className="text-primary font-medium"> {stats?.online || 0} câmeras online</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDados}
              disabled={refreshing}
              className="glass-button"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 📊 ESTATÍSTICAS */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <CameraStatCard
            title="Total"
            value={stats.total}
            icon={Video}
            color="bg-gradient-to-br from-primary to-chart-1"
            delay={0.1}
          />
          <CameraStatCard
            title="Online"
            value={stats.online}
            total={stats.total}
            icon={CheckCircle2}
            color="bg-gradient-to-br from-success to-success/80"
            delay={0.2}
          />
          <CameraStatCard
            title="Offline"
            value={stats.offline}
            total={stats.total}
            icon={AlertTriangle}
            color="bg-gradient-to-br from-destructive to-destructive/80"
            delay={0.3}
          />
          <CameraStatCard
            title="Gravando"
            value={stats.gravando}
            icon={Circle}
            color="bg-gradient-to-br from-warning to-warning/80"
            delay={0.4}
          />
          <CameraStatCard
            title="Movimento"
            value={stats.com_movimento}
            icon={Eye}
            color="bg-gradient-to-br from-chart-2 to-chart-2/80"
            delay={0.5}
          />
          <CameraStatCard
            title="Storage"
            value={Math.round(stats.armazenamento_usado)}
            total={stats.armazenamento_total}
            icon={Monitor}
            color="bg-gradient-to-br from-chart-5 to-chart-5/80"
            delay={0.6}
          />
        </div>
      )}

      {/* 🎛️ CONTROLES E FILTROS */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar câmeras..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-48"
                />
              </div>

              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroLocalizacao} onValueChange={setFiltroLocalizacao}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {localizacoes.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Layout Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Layout:</span>
              {(['2x2', '3x3', '4x4'] as const).map((layoutOption) => (
                <Button
                  key={layoutOption}
                  variant={layout === layoutOption ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout(layoutOption)}
                  className="text-xs"
                >
                  <Grid3X3 className="h-3 w-3 mr-1" />
                  {layoutOption}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🖥️ GRID DE CÂMERAS */}
      <div className={cn("grid gap-4", getGridCols())}>
        {camerasFiltradas.map((camera, index) => (
          <motion.div
            key={camera.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <CameraViewer
              camera={camera}
              onFullscreen={() => setCameraFullscreen(cameraFullscreen === camera.id ? null : camera.id)}
              onSnapshot={() => handleSnapshot(camera.id)}
              onRecord={() => handleRecord(camera.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* 🎛️ CONTROLES PTZ */}
      {cameraSelecionada && (
        <PTZControls
          camera={cameras.find(c => c.id === cameraSelecionada)!}
          onPTZ={(action, value) => handlePTZ(cameraSelecionada, action, value)}
        />
      )}

      {/* 🌃 FULLSCREEN VIEWER */}
      <AnimatePresence>
        {cameraFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
            onClick={() => setCameraFullscreen(null)}
          >
            <CameraViewer
              camera={cameras.find(c => c.id === cameraFullscreen)!}
              isFullscreen={true}
              onFullscreen={() => setCameraFullscreen(null)}
              onSnapshot={() => handleSnapshot(cameraFullscreen)}
              onRecord={() => handleRecord(cameraFullscreen)}
            />
            {cameras.find(c => c.id === cameraFullscreen)?.possui_ptz && (
              <div className="absolute bottom-4 right-4">
                <PTZControls
                  camera={cameras.find(c => c.id === cameraFullscreen)!}
                  onPTZ={(action, value) => handlePTZ(cameraFullscreen, action, value)}
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPTY STATE */}
      {!loading && camerasFiltradas.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Video className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Nenhuma câmera encontrada
          </h3>
          <p className="text-muted-foreground">
            {busca || filtroStatus !== 'todas' || filtroLocalizacao !== 'todas'
              ? 'Tente ajustar os filtros para ver mais resultados'
              : 'Nenhuma câmera configurada no sistema.'
            }
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}