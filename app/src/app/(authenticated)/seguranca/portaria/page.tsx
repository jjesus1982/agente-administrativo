"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOff, UserCheck, Clock,
  MapPin, Shield, Volume2, VolumeX, Video, VideoOff,
  CheckCircle, XCircle, Bell, AlertTriangle, Users, Settings
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// 📞 PÁGINA PORTARIA VIRTUAL
// Inspirado no CONECTA PLUS - WebSocket para chamadas em tempo real

interface ActiveCall {
  id: string
  type: 'incoming' | 'outgoing'
  caller_name: string
  caller_unit?: string
  destination?: string
  start_time: string
  duration?: number
  status: 'ringing' | 'active' | 'hold' | 'ended'
  has_video: boolean
  has_audio: boolean
}

interface CallLog {
  id: string
  type: 'incoming' | 'outgoing' | 'missed'
  caller_name: string
  caller_unit?: string
  destination?: string
  timestamp: string
  duration?: number
  outcome: 'answered' | 'missed' | 'declined' | 'busy'
}

interface PortariaStats {
  total_calls_today: number
  answered_calls: number
  missed_calls: number
  average_response_time: number
  active_calls: number
}

export default function PortariaPage() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [callLog, setCallLog] = useState<CallLog[]>([])
  const [stats, setStats] = useState<PortariaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(false)
  const [selectedCall, setSelectedCall] = useState<string | null>(null)

  // 📡 Mock data - integração futura com WebSocket /ws/portaria
  useEffect(() => {
    const mockActiveCalls: ActiveCall[] = [
      {
        id: '1',
        type: 'incoming',
        caller_name: 'Visitante - João Silva',
        caller_unit: 'Solicita Apto 1205',
        start_time: '2024-01-02T10:45:00',
        status: 'ringing',
        has_video: true,
        has_audio: true
      },
      {
        id: '2',
        type: 'active',
        caller_name: 'Entregador - Express Log',
        caller_unit: 'Para Apto 804',
        start_time: '2024-01-02T10:40:00',
        duration: 120,
        status: 'active',
        has_video: false,
        has_audio: true
      }
    ]

    const mockCallLog: CallLog[] = [
      {
        id: '1',
        type: 'incoming',
        caller_name: 'Maria Santos',
        caller_unit: 'Apto 1205',
        timestamp: '2024-01-02T10:30:00',
        duration: 45,
        outcome: 'answered'
      },
      {
        id: '2',
        type: 'missed',
        caller_name: 'Técnico Manutenção',
        destination: 'Administração',
        timestamp: '2024-01-02T10:15:00',
        outcome: 'missed'
      },
      {
        id: '3',
        type: 'outgoing',
        destination: 'Apto 602',
        caller_name: 'Ana Costa',
        timestamp: '2024-01-02T09:45:00',
        duration: 30,
        outcome: 'answered'
      }
    ]

    const mockStats: PortariaStats = {
      total_calls_today: 23,
      answered_calls: 18,
      missed_calls: 5,
      average_response_time: 12,
      active_calls: 2
    }

    setTimeout(() => {
      setActiveCalls(mockActiveCalls)
      setCallLog(mockCallLog)
      setStats(mockStats)
      setLoading(false)
    }, 1000)

    // Simular WebSocket updates
    const interval = setInterval(() => {
      // Mock: atualizar duração das chamadas ativas
      setActiveCalls(prev => prev.map(call => ({
        ...call,
        duration: call.status === 'active' ? (call.duration || 0) + 1 : call.duration
      })))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleAnswerCall = (callId: string) => {
    setActiveCalls(prev => prev.map(call =>
      call.id === callId ? { ...call, status: 'active', duration: 0 } : call
    ))
  }

  const handleDeclineCall = (callId: string) => {
    setActiveCalls(prev => prev.filter(call => call.id !== callId))
    // Add to call log
    const declinedCall = activeCalls.find(call => call.id === callId)
    if (declinedCall) {
      const logEntry: CallLog = {
        id: Date.now().toString(),
        type: 'incoming',
        caller_name: declinedCall.caller_name,
        caller_unit: declinedCall.caller_unit,
        timestamp: declinedCall.start_time,
        outcome: 'declined'
      }
      setCallLog(prev => [logEntry, ...prev])
    }
  }

  const handleHangUp = (callId: string) => {
    const call = activeCalls.find(c => c.id === callId)
    setActiveCalls(prev => prev.filter(c => c.id !== callId))

    if (call && call.status === 'active') {
      const logEntry: CallLog = {
        id: Date.now().toString(),
        type: call.type,
        caller_name: call.caller_name,
        caller_unit: call.caller_unit,
        destination: call.destination,
        timestamp: call.start_time,
        duration: call.duration,
        outcome: 'answered'
      }
      setCallLog(prev => [logEntry, ...prev])
    }
  }

  const getCallTypeIcon = (type: CallLog['type']) => {
    switch (type) {
      case 'incoming': return <PhoneIncoming className="h-4 w-4" />
      case 'outgoing': return <PhoneCall className="h-4 w-4" />
      case 'missed': return <PhoneOff className="h-4 w-4" />
      default: return <Phone className="h-4 w-4" />
    }
  }

  const getCallTypeColor = (type: CallLog['type']) => {
    switch (type) {
      case 'incoming': return 'text-blue-500'
      case 'outgoing': return 'text-green-500'
      case 'missed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getOutcomeColor = (outcome: CallLog['outcome']) => {
    switch (outcome) {
      case 'answered': return 'text-green-500'
      case 'missed': return 'text-red-500'
      case 'declined': return 'text-orange-500'
      case 'busy': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted/20 rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 w-full bg-muted/20 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div className="space-y-2">
          <h1 className="text-fluid-2xl font-bold gradient-primary bg-clip-text text-transparent">
            Portaria Virtual
          </h1>
          <p className="text-muted-foreground">
            Central de chamadas em tempo real • {stats?.active_calls || 0} chamadas ativas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={audioEnabled ? "bg-primary/20" : ""}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={videoEnabled ? "bg-primary/20" : ""}
          >
            {videoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Chamadas Hoje', value: stats?.total_calls_today || 0, icon: Phone, color: 'text-blue-500', bg: 'bg-blue-500/20' },
          { label: 'Atendidas', value: stats?.answered_calls || 0, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/20' },
          { label: 'Perdidas', value: stats?.missed_calls || 0, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/20' },
          { label: 'Tempo Médio', value: `${stats?.average_response_time || 0}s`, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/20' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
          >
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bg}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Calls */}
      {activeCalls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Chamadas Ativas
          </h2>

          <div className="grid gap-4">
            <AnimatePresence>
              {activeCalls.map((call) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className={`glass-card ${
                    call.status === 'ringing' ? 'ring-2 ring-blue-500/50 animate-pulse' :
                    call.status === 'active' ? 'ring-2 ring-green-500/50' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-xl ${
                            call.status === 'ringing' ? 'bg-blue-500/20 animate-pulse' :
                            call.status === 'active' ? 'bg-green-500/20' : 'bg-gray-500/20'
                          }`}>
                            {call.status === 'ringing' ? (
                              <PhoneIncoming className="h-8 w-8 text-blue-500" />
                            ) : (
                              <Phone className="h-8 w-8 text-green-500" />
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{call.caller_name}</h3>
                              <Badge className={
                                call.status === 'ringing' ? 'bg-blue-500/20 text-blue-300' :
                                call.status === 'active' ? 'bg-green-500/20 text-green-300' :
                                'bg-gray-500/20 text-gray-300'
                              }>
                                {call.status === 'ringing' ? 'Chamando' :
                                 call.status === 'active' ? 'Em Chamada' : 'Aguardando'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {call.caller_unit && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {call.caller_unit}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {call.status === 'active' && call.duration ?
                                  formatDuration(call.duration) :
                                  formatTime(call.start_time)
                                }
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {call.has_audio && (
                                <Badge variant="outline" className="text-xs">
                                  <Volume2 className="h-3 w-3 mr-1" />
                                  Áudio
                                </Badge>
                              )}
                              {call.has_video && (
                                <Badge variant="outline" className="text-xs">
                                  <Video className="h-3 w-3 mr-1" />
                                  Vídeo
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Call Actions */}
                        <div className="flex items-center gap-3">
                          {call.status === 'ringing' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAnswerCall(call.id)}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Atender
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeclineCall(call.id)}
                                className="text-red-500 border-red-500 hover:bg-red-500/20"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Recusar
                              </Button>
                            </>
                          )}

                          {call.status === 'active' && (
                            <>
                              <Button variant="outline" size="sm">
                                <Users className="h-4 w-4 mr-2" />
                                Hold
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleHangUp(call.id)}
                                className="text-red-500 border-red-500 hover:bg-red-500/20"
                              >
                                <PhoneOff className="h-4 w-4 mr-2" />
                                Desligar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Call Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Histórico de Chamadas
        </h2>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="space-y-4">
              {callLog.map((call, index) => (
                <motion.div
                  key={call.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * index }}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent/20 transition-colors"
                >
                  <div className={`p-3 rounded-xl bg-muted/20 ${getCallTypeColor(call.type)}`}>
                    {getCallTypeIcon(call.type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{call.caller_name}</h4>
                      <Badge variant="outline" className={getOutcomeColor(call.outcome)}>
                        {call.outcome === 'answered' ? 'Atendida' :
                         call.outcome === 'missed' ? 'Perdida' :
                         call.outcome === 'declined' ? 'Recusada' : 'Ocupado'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatTime(call.timestamp)}</span>
                      {call.caller_unit && <span>{call.caller_unit}</span>}
                      {call.destination && <span>→ {call.destination}</span>}
                      {call.duration && (
                        <span className="text-green-500">
                          {formatDuration(call.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm">
                    <Phone className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}

              {callLog.length === 0 && (
                <div className="text-center py-8">
                  <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma chamada hoje</h3>
                  <p className="text-muted-foreground">
                    O histórico de chamadas aparecerá aqui
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}