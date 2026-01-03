"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Vote, Users, CheckCircle, XCircle, Clock, Calendar,
  UserCheck, AlertCircle, BarChart3, TrendingUp, Eye,
  Play, Pause, Square, Mic, MicOff, Volume2, Settings
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// 🗳️ PÁGINA ASSEMBLEIAS
// Inspirado no CONECTA PLUS - AGO + votações + quórum em tempo real

interface Assembly {
  id: string
  title: string
  type: 'AGO' | 'AGE' | 'Votação'
  date: string
  status: 'scheduled' | 'active' | 'paused' | 'finished'
  quorum_required: number
  quorum_present: number
  total_eligible: number
  start_time?: string
  duration?: number
  agenda_items: number
  current_item?: number
  voting_items: VotingItem[]
}

interface VotingItem {
  id: string
  title: string
  description: string
  type: 'simple_majority' | 'qualified_majority' | 'unanimous'
  status: 'pending' | 'voting' | 'finished'
  votes_favor: number
  votes_against: number
  votes_abstention: number
  votes_total: number
  required_percentage: number
  start_time?: string
  end_time?: string
}

interface Participant {
  id: string
  name: string
  unit: string
  type: 'owner' | 'proxy' | 'observer'
  status: 'present' | 'absent' | 'connected'
  arrival_time?: string
  voting_power: number
}

export default function AssembleiasPage() {
  const [activeAssembly, setActiveAssembly] = useState<Assembly | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState('active')
  const [currentVotingItem, setCurrentVotingItem] = useState<VotingItem | null>(null)

  // 📡 Mock data - integração futura com backend
  useEffect(() => {
    const mockAssembly: Assembly = {
      id: '1',
      title: 'AGO - Assembleia Geral Ordinária 2024',
      type: 'AGO',
      date: '2024-01-02T19:00:00',
      status: 'active',
      quorum_required: 50, // 50%
      quorum_present: 32,
      total_eligible: 50,
      start_time: '2024-01-02T19:00:00',
      duration: 45, // minutos
      agenda_items: 5,
      current_item: 2,
      voting_items: [
        {
          id: '1',
          title: 'Aprovação da Ata da Assembleia Anterior',
          description: 'Aprovação da ata da assembleia realizada em dezembro de 2023',
          type: 'simple_majority',
          status: 'finished',
          votes_favor: 28,
          votes_against: 2,
          votes_abstention: 2,
          votes_total: 32,
          required_percentage: 50,
          start_time: '2024-01-02T19:05:00',
          end_time: '2024-01-02T19:10:00'
        },
        {
          id: '2',
          title: 'Aprovação do Orçamento 2024',
          description: 'Aprovação da proposta orçamentária para o exercício de 2024',
          type: 'simple_majority',
          status: 'voting',
          votes_favor: 18,
          votes_against: 8,
          votes_abstention: 3,
          votes_total: 29,
          required_percentage: 50,
          start_time: '2024-01-02T19:15:00'
        },
        {
          id: '3',
          title: 'Instalação de Sistema de Energia Solar',
          description: 'Aprovação do investimento em sistema de energia solar no valor de R$ 250.000',
          type: 'qualified_majority',
          status: 'pending',
          votes_favor: 0,
          votes_against: 0,
          votes_abstention: 0,
          votes_total: 0,
          required_percentage: 66.7
        }
      ]
    }

    const mockParticipants: Participant[] = [
      { id: '1', name: 'Maria Santos', unit: 'Apto 1205', type: 'owner', status: 'present', arrival_time: '2024-01-02T18:55:00', voting_power: 1 },
      { id: '2', name: 'João Silva (Procuração)', unit: 'Apto 804', type: 'proxy', status: 'present', arrival_time: '2024-01-02T19:02:00', voting_power: 1 },
      { id: '3', name: 'Ana Costa', unit: 'Apto 602', type: 'owner', status: 'connected', arrival_time: '2024-01-02T19:00:00', voting_power: 1 },
      { id: '4', name: 'Carlos Oliveira', unit: 'Apto 1401', type: 'owner', status: 'present', arrival_time: '2024-01-02T18:58:00', voting_power: 1 }
    ]

    setTimeout(() => {
      setActiveAssembly(mockAssembly)
      setParticipants(mockParticipants)
      setCurrentVotingItem(mockAssembly.voting_items.find(item => item.status === 'voting') || null)
      setLoading(false)
    }, 1000)

    // Simular updates em tempo real
    const interval = setInterval(() => {
      if (activeAssembly) {
        setActiveAssembly(prev => prev ? {
          ...prev,
          duration: (prev.duration || 0) + 1
        } : null)
      }
    }, 60000) // Update a cada minuto

    return () => clearInterval(interval)
  }, [activeAssembly])

  const calculateQuorumPercentage = () => {
    if (!activeAssembly) return 0
    return (activeAssembly.quorum_present / activeAssembly.total_eligible) * 100
  }

  const getQuorumStatus = () => {
    const percentage = calculateQuorumPercentage()
    if (!activeAssembly) return { color: 'text-gray-500', status: 'Indisponível' }

    if (percentage >= activeAssembly.quorum_required) {
      return { color: 'text-green-500', status: 'Quórum Atingido' }
    } else if (percentage >= activeAssembly.quorum_required * 0.8) {
      return { color: 'text-yellow-500', status: 'Próximo do Quórum' }
    } else {
      return { color: 'text-red-500', status: 'Quórum Insuficiente' }
    }
  }

  const getVotingProgress = (item: VotingItem) => {
    if (item.votes_total === 0) return 0
    return (item.votes_favor / item.votes_total) * 100
  }

  const getVotingResult = (item: VotingItem) => {
    const favorPercentage = (item.votes_favor / item.votes_total) * 100
    const passed = favorPercentage >= item.required_percentage

    return {
      passed,
      color: passed ? 'text-green-500' : 'text-red-500',
      label: passed ? 'APROVADO' : 'REJEITADO'
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const quorumStatus = getQuorumStatus()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted/20 rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 w-full bg-muted/20 rounded" />
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
            Assembleias & Votações
          </h1>
          <p className="text-muted-foreground">
            {activeAssembly ?
              `${activeAssembly.title} • ${activeAssembly.status === 'active' ? 'Em andamento' : 'Agendada'}` :
              'Nenhuma assembleia ativa'
            }
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Agendar
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Assembly Status Cards */}
      {activeAssembly && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Quórum',
              value: `${activeAssembly.quorum_present}/${activeAssembly.total_eligible}`,
              subtitle: `${calculateQuorumPercentage().toFixed(1)}%`,
              icon: Users,
              color: quorumStatus.color.replace('text-', ''),
              bg: `bg-${quorumStatus.color.split('-')[1]}-500/20`
            },
            {
              label: 'Duração',
              value: formatDuration(activeAssembly.duration || 0),
              subtitle: `Desde ${formatTime(activeAssembly.start_time!)}`,
              icon: Clock,
              color: 'blue-500',
              bg: 'bg-blue-500/20'
            },
            {
              label: 'Pauta',
              value: `${activeAssembly.current_item}/${activeAssembly.agenda_items}`,
              subtitle: 'Itens discutidos',
              icon: BarChart3,
              color: 'purple-500',
              bg: 'bg-purple-500/20'
            },
            {
              label: 'Votações',
              value: activeAssembly.voting_items.filter(item => item.status === 'finished').length.toString(),
              subtitle: `${activeAssembly.voting_items.length} total`,
              icon: Vote,
              color: 'green-500',
              bg: 'bg-green-500/20'
            }
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
                      <stat.icon className={`h-6 w-6 text-${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      {stat.subtitle && (
                        <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quórum Status */}
      {activeAssembly && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className={`glass-card border-l-4 ${
            calculateQuorumPercentage() >= activeAssembly.quorum_required ?
            'border-l-green-500 bg-green-500/5' : 'border-l-yellow-500 bg-yellow-500/5'
          }`}>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className={`h-5 w-5 ${quorumStatus.color}`} />
                    Status do Quórum
                  </h3>
                  <Badge className={`${quorumStatus.color.replace('text-', 'bg-').replace('500', '500/20')} ${quorumStatus.color}`}>
                    {quorumStatus.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Presentes: {activeAssembly.quorum_present}</span>
                    <span>Necessário: {Math.ceil(activeAssembly.total_eligible * activeAssembly.quorum_required / 100)}</span>
                  </div>
                  <Progress
                    value={calculateQuorumPercentage()}
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="text-yellow-500">Mínimo: {activeAssembly.quorum_required}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Ativa</TabsTrigger>
          <TabsTrigger value="voting">Votações</TabsTrigger>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Current Voting */}
        <TabsContent value="voting" className="space-y-4">
          {currentVotingItem && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="glass-card ring-2 ring-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <Vote className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg">{currentVotingItem.title}</h3>
                      <p className="text-sm text-muted-foreground">Votação em andamento</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <p className="text-muted-foreground">{currentVotingItem.description}</p>

                    {/* Voting Progress */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Progresso da Votação</span>
                        <span className="text-sm text-muted-foreground">
                          {currentVotingItem.votes_total} de {activeAssembly?.quorum_present} votos
                        </span>
                      </div>

                      <Progress value={(currentVotingItem.votes_total / (activeAssembly?.quorum_present || 1)) * 100} />

                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="text-2xl font-bold text-green-500">{currentVotingItem.votes_favor}</div>
                          <div className="text-sm text-muted-foreground">A Favor</div>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="text-2xl font-bold text-red-500">{currentVotingItem.votes_against}</div>
                          <div className="text-sm text-muted-foreground">Contra</div>
                        </div>
                        <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <div className="text-2xl font-bold text-yellow-500">{currentVotingItem.votes_abstention}</div>
                          <div className="text-sm text-muted-foreground">Abstenção</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                        <span className="text-sm">
                          Maioria necessária: {currentVotingItem.required_percentage}%
                        </span>
                        <span className="text-sm">
                          Atual: {currentVotingItem.votes_total > 0 ?
                            ((currentVotingItem.votes_favor / currentVotingItem.votes_total) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Voting Controls */}
                    <div className="flex justify-center gap-3">
                      <Button className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        A Favor
                      </Button>
                      <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/20">
                        <XCircle className="h-4 w-4 mr-2" />
                        Contra
                      </Button>
                      <Button variant="outline">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Abstenção
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Voting History */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Votações da Assembleia</h3>
            {activeAssembly?.voting_items.map((item, index) => {
              const result = item.status === 'finished' ? getVotingResult(item) : null

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * index }}
                >
                  <Card className={`glass-card ${
                    item.status === 'voting' ? 'ring-2 ring-primary/20' :
                    item.status === 'finished' ? 'border-green-500/20' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{item.title}</h4>
                            <Badge variant={
                              item.status === 'finished' ? 'default' :
                              item.status === 'voting' ? 'destructive' : 'secondary'
                            }>
                              {item.status === 'finished' ? 'Concluída' :
                               item.status === 'voting' ? 'Votando' : 'Pendente'}
                            </Badge>
                            {result && (
                              <Badge className={`${result.color.replace('text-', 'bg-').replace('500', '500/20')} ${result.color}`}>
                                {result.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {item.status === 'finished' && (
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Favor: {item.votes_favor}</span>
                              <span>Contra: {item.votes_against}</span>
                              <span>Abstenção: {item.votes_abstention}</span>
                              <span>Total: {item.votes_total}</span>
                            </div>
                          )}
                        </div>

                        {item.status === 'finished' && (
                          <div className="text-right">
                            <div className={`text-sm font-semibold ${result?.color}`}>
                              {result?.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {((item.votes_favor / item.votes_total) * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* Participants */}
        <TabsContent value="participants" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Participantes Presentes ({participants.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {participants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * index }}
                    className="flex items-center justify-between p-4 rounded-lg hover:bg-accent/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        participant.status === 'present' ? 'bg-green-500' :
                        participant.status === 'connected' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{participant.name}</h4>
                          <Badge variant="outline" size="sm">
                            {participant.type === 'owner' ? 'Proprietário' :
                             participant.type === 'proxy' ? 'Procuração' : 'Observador'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{participant.unit}</span>
                          {participant.arrival_time && (
                            <span>Chegada: {formatTime(participant.arrival_time)}</span>
                          )}
                          <span>Poder de voto: {participant.voting_power}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={
                        participant.status === 'present' ? 'bg-green-500/20 text-green-400' :
                        participant.status === 'connected' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }>
                        {participant.status === 'present' ? 'Presente' :
                         participant.status === 'connected' ? 'Online' : 'Ausente'}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Histórico de Assembleias</h3>
                <p className="text-muted-foreground">
                  Visualize o histórico completo de assembleias e votações
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}