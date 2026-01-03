'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  FileText,
  Vote,
  Clock,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Send,
  Eye,
  Download,
  Plus,
  Edit,
  Trash2,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Activity,
  Building,
  Gavel,
  PieChart,
  UserCheck,
  Hash,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

// Tipos TypeScript
interface Assembly {
  id: string;
  title: string;
  description: string;
  type: 'ordinary' | 'extraordinary' | 'emergency';
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';
  scheduledDate: string;
  startTime: string;
  endTime?: string;
  location: string;
  quorum: number;
  requiredQuorum: number;
  attendees: number;
  totalUnits: number;
  convocationSent: boolean;
  convocationDate?: string;
  agenda: AgendaItem[];
  documents: AssemblyDocument[];
  createdBy: string;
  notes?: string;
}

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  type: 'discussion' | 'voting' | 'information' | 'election';
  duration: number;
  speaker?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'postponed';
  votes?: VotingResult;
  order: number;
}

interface VotingResult {
  totalVotes: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  result: 'approved' | 'rejected' | 'pending';
  quorumMet: boolean;
}

interface AssemblyDocument {
  id: string;
  name: string;
  type: 'agenda' | 'minutes' | 'proposal' | 'financial' | 'legal' | 'other';
  url: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface AssemblyStats {
  totalAssemblies: number;
  thisYear: number;
  averageAttendance: number;
  averageQuorum: number;
  totalVotings: number;
  approvalRate: number;
  nextAssembly: string;
  pendingVotings: number;
}

const Assembleias = () => {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [stats, setStats] = useState<AssemblyStats>({
    totalAssemblies: 0,
    thisYear: 0,
    averageAttendance: 0,
    averageQuorum: 0,
    totalVotings: 0,
    approvalRate: 0,
    nextAssembly: '',
    pendingVotings: 0
  });

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUpcoming, setShowOnlyUpcoming] = useState(false);

  // Mock data initialization
  useEffect(() => {
    const mockAssemblies: Assembly[] = [
      {
        id: 'asm-001',
        title: 'Assembleia Ordinária - Janeiro 2025',
        description: 'Assembleia ordinária para discussão do orçamento 2025 e melhorias do condomínio',
        type: 'ordinary',
        status: 'scheduled',
        scheduledDate: '2025-01-15',
        startTime: '19:00',
        location: 'Salão de Festas - Térreo',
        quorum: 0,
        requiredQuorum: 51,
        attendees: 0,
        totalUnits: 120,
        convocationSent: true,
        convocationDate: '2024-12-15',
        agenda: [
          {
            id: 'agenda-001',
            title: 'Aprovação da Ata da Assembleia Anterior',
            description: 'Leitura e aprovação da ata da assembleia de dezembro de 2024',
            type: 'voting',
            duration: 15,
            status: 'pending',
            order: 1
          },
          {
            id: 'agenda-002',
            title: 'Prestação de Contas 2024',
            description: 'Apresentação do relatório financeiro do exercício de 2024',
            type: 'information',
            duration: 30,
            speaker: 'Síndico João Silva',
            status: 'pending',
            order: 2
          },
          {
            id: 'agenda-003',
            title: 'Orçamento 2025',
            description: 'Discussão e aprovação do orçamento previsto para o exercício de 2025',
            type: 'voting',
            duration: 45,
            status: 'pending',
            order: 3
          },
          {
            id: 'agenda-004',
            title: 'Projeto de Modernização dos Elevadores',
            description: 'Proposta de modernização dos elevadores sociais',
            type: 'discussion',
            duration: 30,
            status: 'pending',
            order: 4
          }
        ],
        documents: [
          {
            id: 'doc-001',
            name: 'Convocação_Assembleia_Jan2025.pdf',
            type: 'agenda',
            url: '/documents/convocacao_jan2025.pdf',
            size: '2.3 MB',
            uploadedAt: '2024-12-15T10:00:00',
            uploadedBy: 'Administração'
          },
          {
            id: 'doc-002',
            name: 'Relatório_Financeiro_2024.pdf',
            type: 'financial',
            url: '/documents/relatorio_2024.pdf',
            size: '5.8 MB',
            uploadedAt: '2025-01-02T14:30:00',
            uploadedBy: 'Contador'
          }
        ],
        createdBy: 'Administração'
      },
      {
        id: 'asm-002',
        title: 'Assembleia Extraordinária - Reforma da Piscina',
        description: 'Assembleia extraordinária para aprovação da reforma da área de lazer',
        type: 'extraordinary',
        status: 'completed',
        scheduledDate: '2024-12-10',
        startTime: '20:00',
        endTime: '22:30',
        location: 'Salão de Festas - Térreo',
        quorum: 68,
        requiredQuorum: 51,
        attendees: 85,
        totalUnits: 120,
        convocationSent: true,
        convocationDate: '2024-11-25',
        agenda: [
          {
            id: 'agenda-005',
            title: 'Proposta de Reforma da Piscina',
            description: 'Apresentação do projeto de reforma da área de lazer',
            type: 'voting',
            duration: 60,
            status: 'completed',
            order: 1,
            votes: {
              totalVotes: 82,
              votesFor: 65,
              votesAgainst: 12,
              abstentions: 5,
              result: 'approved',
              quorumMet: true
            }
          },
          {
            id: 'agenda-006',
            title: 'Aprovação do Orçamento da Reforma',
            description: 'Votação do valor de R$ 85.000 para a reforma completa',
            type: 'voting',
            duration: 30,
            status: 'completed',
            order: 2,
            votes: {
              totalVotes: 82,
              votesFor: 58,
              votesAgainst: 18,
              abstentions: 6,
              result: 'approved',
              quorumMet: true
            }
          }
        ],
        documents: [
          {
            id: 'doc-003',
            name: 'Ata_Assembleia_Extraordinária_Dez2024.pdf',
            type: 'minutes',
            url: '/documents/ata_dez2024.pdf',
            size: '1.9 MB',
            uploadedAt: '2024-12-15T09:00:00',
            uploadedBy: 'Secretário'
          }
        ],
        createdBy: 'Síndico',
        notes: 'Assembleia realizada com sucesso. Quórum atingido e propostas aprovadas.'
      },
      {
        id: 'asm-003',
        title: 'Assembleia de Prestação de Contas',
        description: 'Apresentação anual das contas do condomínio',
        type: 'ordinary',
        status: 'completed',
        scheduledDate: '2024-11-20',
        startTime: '19:30',
        endTime: '21:45',
        location: 'Salão de Festas - Térreo',
        quorum: 62,
        requiredQuorum: 51,
        attendees: 78,
        totalUnits: 120,
        convocationSent: true,
        convocationDate: '2024-10-20',
        agenda: [
          {
            id: 'agenda-007',
            title: 'Apresentação das Contas 2024',
            description: 'Relatório detalhado de receitas e despesas',
            type: 'information',
            duration: 45,
            speaker: 'Contador Responsável',
            status: 'completed',
            order: 1
          },
          {
            id: 'agenda-008',
            title: 'Aprovação das Contas',
            description: 'Votação para aprovação das contas apresentadas',
            type: 'voting',
            duration: 20,
            status: 'completed',
            order: 2,
            votes: {
              totalVotes: 75,
              votesFor: 69,
              votesAgainst: 4,
              abstentions: 2,
              result: 'approved',
              quorumMet: true
            }
          }
        ],
        documents: [],
        createdBy: 'Administração'
      },
      {
        id: 'asm-004',
        title: 'Assembleia Emergencial - Vazamento',
        description: 'Assembleia emergencial para tratar do vazamento no subsolo',
        type: 'emergency',
        status: 'completed',
        scheduledDate: '2024-10-05',
        startTime: '18:00',
        endTime: '19:30',
        location: 'Salão de Festas - Térreo',
        quorum: 45,
        requiredQuorum: 25,
        attendees: 55,
        totalUnits: 120,
        convocationSent: true,
        convocationDate: '2024-10-03',
        agenda: [
          {
            id: 'agenda-009',
            title: 'Situação do Vazamento',
            description: 'Apresentação do problema e soluções propostas',
            type: 'discussion',
            duration: 30,
            status: 'completed',
            order: 1
          },
          {
            id: 'agenda-010',
            title: 'Aprovação do Reparo Emergencial',
            description: 'Autorização para reparo imediato no valor de R$ 15.000',
            type: 'voting',
            duration: 20,
            status: 'completed',
            order: 2,
            votes: {
              totalVotes: 52,
              votesFor: 48,
              votesAgainst: 2,
              abstentions: 2,
              result: 'approved',
              quorumMet: true
            }
          }
        ],
        documents: [],
        createdBy: 'Síndico'
      }
    ];

    const mockStats: AssemblyStats = {
      totalAssemblies: 12,
      thisYear: 4,
      averageAttendance: 72,
      averageQuorum: 58,
      totalVotings: 28,
      approvalRate: 85,
      nextAssembly: '2025-01-15',
      pendingVotings: 4
    };

    setAssemblies(mockAssemblies);
    setStats(mockStats);
  }, []);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'ongoing': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'completed': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'postponed': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'ongoing': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'postponed': return <Clock className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ordinary': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'extraordinary': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'emergency': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getAgendaTypeIcon = (type: string) => {
    switch (type) {
      case 'voting': return <Vote className="w-4 h-4" />;
      case 'discussion': return <MessageSquare className="w-4 h-4" />;
      case 'information': return <FileText className="w-4 h-4" />;
      case 'election': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'agenda': return <Calendar className="w-4 h-4" />;
      case 'minutes': return <FileText className="w-4 h-4" />;
      case 'proposal': return <Edit className="w-4 h-4" />;
      case 'financial': return <BarChart3 className="w-4 h-4" />;
      case 'legal': return <Gavel className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const filteredAssemblies = assemblies.filter(assembly => {
    const matchesStatus = selectedStatus === 'all' || assembly.status === selectedStatus;
    const matchesType = selectedType === 'all' || assembly.type === selectedType;
    const matchesUpcoming = !showOnlyUpcoming ||
      (assembly.status === 'scheduled' && new Date(assembly.scheduledDate) >= new Date());
    const matchesSearch = searchTerm === '' ||
      assembly.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assembly.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesUpcoming && matchesSearch;
  });

  const scheduledAssemblies = assemblies.filter(a => a.status === 'scheduled');
  const completedAssemblies = assemblies.filter(a => a.status === 'completed');
  const ongoingAssemblies = assemblies.filter(a => a.status === 'ongoing');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              Assembleias
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestão de assembleias e votações do condomínio
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Próximas</span>
              <Switch
                checked={showOnlyUpcoming}
                onCheckedChange={setShowOnlyUpcoming}
                size="sm"
              />
            </div>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Relatório
            </Button>

            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Assembleia
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assembleias Este Ano</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisYear}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">+33%</span>
                  </div>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-full">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Participação Média</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.averageAttendance}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">Quórum: {stats.averageQuorum}%</span>
                  </div>
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Votações Pendentes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingVotings}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Vote className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-yellow-600">Próxima assembleia</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <Vote className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Aprovação</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approvalRate}%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Progress value={stats.approvalRate} className="w-16 h-1" />
                  </div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full justify-start" variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Convocação
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <Vote className="w-4 h-4 mr-2" />
                  Iniciar Votação
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Ata
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Relatório de Participação
                </Button>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-3">
                    Próxima Assembleia
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>Assembleia Ordinária</div>
                    <div>15 de Janeiro, 19:00</div>
                    <div>Salão de Festas</div>
                    <Button size="sm" className="w-full mt-2">
                      <Eye className="w-3 h-3 mr-1" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Assemblies List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3"
          >
            <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/20 shadow-xl">
              <CardContent className="p-6">
                <Tabs defaultValue="scheduled" className="w-full">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <TabsList className="grid w-full lg:w-auto grid-cols-4">
                      <TabsTrigger value="scheduled" className="text-xs">
                        Agendadas ({scheduledAssemblies.length})
                      </TabsTrigger>
                      <TabsTrigger value="ongoing" className="text-xs">
                        Em Andamento ({ongoingAssemblies.length})
                      </TabsTrigger>
                      <TabsTrigger value="completed" className="text-xs">
                        Concluídas ({completedAssemblies.length})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="text-xs">
                        Todas ({assemblies.length})
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        placeholder="Buscar assembleias..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64"
                      />

                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="ordinary">Ordinária</SelectItem>
                          <SelectItem value="extraordinary">Extraordinária</SelectItem>
                          <SelectItem value="emergency">Emergencial</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="scheduled">Agendadas</SelectItem>
                          <SelectItem value="ongoing">Em Andamento</SelectItem>
                          <SelectItem value="completed">Concluídas</SelectItem>
                          <SelectItem value="cancelled">Canceladas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <TabsContent value="scheduled" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAssemblies
                      .filter(a => a.status === 'scheduled')
                      .map((assembly) => (
                      <AssemblyCard key={assembly.id} assembly={assembly} />
                    ))}
                  </TabsContent>

                  <TabsContent value="ongoing" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAssemblies
                      .filter(a => a.status === 'ongoing')
                      .map((assembly) => (
                      <AssemblyCard key={assembly.id} assembly={assembly} />
                    ))}
                  </TabsContent>

                  <TabsContent value="completed" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAssemblies
                      .filter(a => a.status === 'completed')
                      .map((assembly) => (
                      <AssemblyCard key={assembly.id} assembly={assembly} />
                    ))}
                  </TabsContent>

                  <TabsContent value="all" className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredAssemblies.map((assembly) => (
                      <AssemblyCard key={assembly.id} assembly={assembly} />
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Componente para card de assembleia
interface AssemblyCardProps {
  assembly: Assembly;
}

const AssemblyCard: React.FC<AssemblyCardProps> = ({ assembly }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'ongoing': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'completed': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'postponed': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'ongoing': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'postponed': return <Clock className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ordinary': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'extraordinary': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'emergency': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getAgendaTypeIcon = (type: string) => {
    switch (type) {
      case 'voting': return <Vote className="w-4 h-4" />;
      case 'discussion': return <MessageSquare className="w-4 h-4" />;
      case 'information': return <FileText className="w-4 h-4" />;
      case 'election': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      layout
      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
            <Users className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {assembly.title}
              </h4>
              <Badge className={`text-xs ${getTypeColor(assembly.type)}`}>
                {assembly.type === 'ordinary' ? 'Ordinária' :
                 assembly.type === 'extraordinary' ? 'Extraordinária' : 'Emergencial'}
              </Badge>
              <Badge className={`text-xs ${getStatusColor(assembly.status)}`}>
                {getStatusIcon(assembly.status)}
                {assembly.status === 'scheduled' ? 'Agendada' :
                 assembly.status === 'ongoing' ? 'Em Andamento' :
                 assembly.status === 'completed' ? 'Concluída' :
                 assembly.status === 'cancelled' ? 'Cancelada' : 'Adiada'}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{assembly.description}</p>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(assembly.scheduledDate).toLocaleDateString('pt-BR')} às {assembly.startTime}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {assembly.location}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {assembly.attendees > 0 ? `${assembly.attendees} presentes` : `${assembly.totalUnits} unidades`}
              </div>
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Quórum: {assembly.quorum || 0}% ({assembly.requiredQuorum}% necessário)
              </div>
            </div>

            {assembly.quorum > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>Participação</span>
                  <span>{assembly.quorum}%</span>
                </div>
                <Progress value={assembly.quorum} className="h-1" />
              </div>
            )}

            {/* Agenda Items */}
            <div className="space-y-2">
              <h5 className="font-medium text-sm text-gray-900 dark:text-white">
                Pauta ({assembly.agenda.length} itens)
              </h5>
              <div className="space-y-1">
                {assembly.agenda.slice(0, 3).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {getAgendaTypeIcon(item.type)}
                    <span>{index + 1}. {item.title}</span>
                    {item.votes && (
                      <Badge className={`text-xs ${item.votes.result === 'approved' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                        {item.votes.result === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                    )}
                  </div>
                ))}
                {assembly.agenda.length > 3 && (
                  <div className="text-xs text-indigo-600 cursor-pointer hover:underline">
                    +{assembly.agenda.length - 3} itens adicionais
                  </div>
                )}
              </div>
            </div>

            {assembly.documents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <FileText className="w-3 h-3" />
                  <span>{assembly.documents.length} documento(s) anexo(s)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 ml-4">
          <Button size="sm" variant="outline">
            <Eye className="w-3 h-3 mr-1" />
            Visualizar
          </Button>

          {assembly.status === 'scheduled' && (
            <>
              <Button size="sm" variant="outline">
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Send className="w-3 h-3 mr-1" />
                Convocar
              </Button>
            </>
          )}

          {assembly.status === 'ongoing' && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
              <Vote className="w-3 h-3 mr-1" />
              Gerenciar
            </Button>
          )}

          {assembly.status === 'completed' && (
            <Button size="sm" variant="outline">
              <Download className="w-3 h-3 mr-1" />
              Ata
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Assembleias;