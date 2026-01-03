"use client";

import React, { useState, useEffect } from 'react';
import {
  Settings, Webhook, Activity, Database, CheckCircle2, AlertCircle,
  XCircle, Clock, Send, Download, Upload, RefreshCw, Plus, Trash2,
  Eye, EyeOff, ExternalLink, Save, TestTube, Zap
} from 'lucide-react';

import {
  ConnectaConfig,
  TenantMapping,
  IntegrationHealth,
  SyncStatus,
  WebhookLog,
  configureIntegration,
  getIntegrationConfig,
  testConnection,
  getTenantMappings,
  createTenantMapping,
  createBulkTenantMappings,
  deleteTenantMapping,
  getIntegrationHealth,
  getSyncStatus,
  getWebhookLogs,
  triggerFullSync,
  formatTimestamp,
  getHealthStatusColor,
  getHealthStatusText,
  getWebhookDirectionColor,
  getWebhookDirectionText,
  validateIntegrationConfig,
  getDefaultConfig
} from '@/lib/conectaplus-integration';

export default function ConnectaPlusAdminPage() {
  const [activeTab, setActiveTab] = useState<'config' | 'tenants' | 'monitoring' | 'logs'>('config');

  // Configuration
  const [config, setConfig] = useState<Partial<ConnectaConfig>>(getDefaultConfig());
  const [showSecrets, setShowSecrets] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Tenant mappings
  const [tenantMappings, setTenantMappings] = useState<TenantMapping[]>([]);
  const [newMapping, setNewMapping] = useState<Omit<TenantMapping, 'enabled'>>({
    supersistema_id: '',
    conecta_id: '',
    nome: ''
  });

  // Monitoring
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'monitoring') {
      const interval = setInterval(loadMonitoringData, 10000); // Refresh a cada 10s
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);

      const [configData, mappingsData, healthData] = await Promise.allSettled([
        getIntegrationConfig(),
        getTenantMappings(),
        getIntegrationHealth()
      ]);

      if (configData.status === 'fulfilled' && configData.value) {
        setConfig(configData.value);
      }

      if (mappingsData.status === 'fulfilled') {
        setTenantMappings(mappingsData.value.mappings);
      }

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      }

    } catch (err) {
      setError('Erro ao carregar dados: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonitoringData() {
    try {
      const [healthData, syncData, logsData] = await Promise.allSettled([
        getIntegrationHealth(),
        getSyncStatus(),
        getWebhookLogs(20)
      ]);

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      }

      if (syncData.status === 'fulfilled') {
        setSyncStatus(syncData.value);
      }

      if (logsData.status === 'fulfilled') {
        setWebhookLogs(logsData.value.logs);
      }

    } catch (err) {
      console.error('Error loading monitoring data:', err);
    }
  }

  // =============================================================================
  // HANDLERS
  // =============================================================================

  async function handleSaveConfig() {
    try {
      setIsSaving(true);
      setError(null);

      const errors = validateIntegrationConfig(config);
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      await configureIntegration(config as ConnectaConfig);
      setSuccess('Configuração salva com sucesso!');

      // Reload data
      await loadInitialData();

    } catch (err) {
      setError('Erro ao salvar configuração: ' + (err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setIsTestingConnection(true);
      setError(null);

      const result = await testConnection();
      setSuccess(`Conexão testada com sucesso! Status: ${result.conecta_plus_status?.status}`);

    } catch (err) {
      setError('Erro ao testar conexão: ' + (err as Error).message);
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function handleAddTenantMapping() {
    try {
      if (!newMapping.supersistema_id || !newMapping.conecta_id || !newMapping.nome) {
        setError('Todos os campos do mapeamento são obrigatórios');
        return;
      }

      await createTenantMapping(newMapping);
      setSuccess('Mapeamento criado com sucesso!');

      // Reset form and reload
      setNewMapping({ supersistema_id: '', conecta_id: '', nome: '' });
      const mappingsData = await getTenantMappings();
      setTenantMappings(mappingsData.mappings);

    } catch (err) {
      setError('Erro ao criar mapeamento: ' + (err as Error).message);
    }
  }

  async function handleDeleteTenantMapping(supersistemaId: string) {
    if (!confirm('Tem certeza que deseja remover este mapeamento?')) {
      return;
    }

    try {
      await deleteTenantMapping(supersistemaId);
      setSuccess('Mapeamento removido com sucesso!');

      // Reload mappings
      const mappingsData = await getTenantMappings();
      setTenantMappings(mappingsData.mappings);

    } catch (err) {
      setError('Erro ao remover mapeamento: ' + (err as Error).message);
    }
  }

  async function handleFullSync() {
    try {
      await triggerFullSync();
      setSuccess('Sincronização completa iniciada!');

      // Refresh monitoring data
      setTimeout(loadMonitoringData, 2000);

    } catch (err) {
      setError('Erro ao iniciar sincronização: ' + (err as Error).message);
    }
  }

  // =============================================================================
  // COMPONENTS
  // =============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-violet-400 mx-auto mb-4 animate-spin" />
            <p className="text-slate-400">Carregando configuração da integração...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
              Conecta Plus
            </h1>
            <p className="text-slate-400 text-lg">Configuração da integração bidirecional</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-400/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-green-300">{success}</p>
            </div>
          </div>
        )}

        {/* Status Overview */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${health.status === 'healthy' ? 'bg-green-500' : health.status === 'not_configured' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Status</div>
                  <div className={`text-sm font-semibold ${getHealthStatusColor(health.status)}`}>
                    {getHealthStatusText(health.status)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Send className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Enviados</div>
                  <div className="text-blue-400 text-sm font-semibold">{health.webhooks_sent}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Recebidos</div>
                  <div className="text-green-400 text-sm font-semibold">{health.webhooks_received}</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-violet-400" />
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wide">Condomínios</div>
                  <div className="text-violet-400 text-sm font-semibold">{health.total_tenants}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-800/30 p-1 rounded-xl mb-6">
          {[
            { key: 'config', label: 'Configuração', icon: Settings },
            { key: 'tenants', label: 'Condomínios', icon: Database },
            { key: 'monitoring', label: 'Monitoramento', icon: Activity },
            { key: 'logs', label: 'Logs', icon: Webhook }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">

          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Configuração da Integração</h3>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-blue-300 font-medium transition-all disabled:opacity-50"
                >
                  <TestTube className="w-4 h-4" />
                  {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL do Conecta Plus
                  </label>
                  <input
                    type="url"
                    value={config.url || ''}
                    onChange={e => setConfig({...config, url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                    placeholder="http://91.108.124.140:8002"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Campo do Tenant
                  </label>
                  <input
                    type="text"
                    value={config.tenant_field || ''}
                    onChange={e => setConfig({...config, tenant_field: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                    placeholder="tenant_id"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={config.api_key || ''}
                      onChange={e => setConfig({...config, api_key: e.target.value})}
                      className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                      placeholder="Chave de API (opcional)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                    >
                      {showSecrets ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Webhook Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets ? "text" : "password"}
                      value={config.webhook_secret || ''}
                      onChange={e => setConfig({...config, webhook_secret: e.target.value})}
                      className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                      placeholder="Secret para validar webhooks"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecrets(!showSecrets)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-300"
                    >
                      {showSecrets ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL para Receber Webhooks
                  </label>
                  <input
                    type="url"
                    value={config.webhook_receive_url || ''}
                    onChange={e => setConfig({...config, webhook_receive_url: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                    placeholder="http://91.108.124.140:8002/api/webhooks/agente"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 rounded-lg text-violet-300 font-semibold transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          )}

          {/* Tenant Mappings Tab */}
          {activeTab === 'tenants' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Mapeamento de Condomínios</h3>

              {/* Add new mapping */}
              <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-4">
                <h4 className="text-lg font-medium text-slate-200 mb-4">Adicionar Mapeamento</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={newMapping.supersistema_id}
                    onChange={e => setNewMapping({...newMapping, supersistema_id: e.target.value})}
                    className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                    placeholder="ID no Supersistema"
                  />
                  <input
                    type="text"
                    value={newMapping.conecta_id}
                    onChange={e => setNewMapping({...newMapping, conecta_id: e.target.value})}
                    className="px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                    placeholder="ID no Conecta Plus"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMapping.nome}
                      onChange={e => setNewMapping({...newMapping, nome: e.target.value})}
                      className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none"
                      placeholder="Nome do Condomínio"
                    />
                    <button
                      onClick={handleAddTenantMapping}
                      className="px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-lg text-green-300 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Mappings list */}
              <div className="space-y-3">
                {tenantMappings.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum mapeamento configurado</p>
                  </div>
                ) : (
                  tenantMappings.map(mapping => (
                    <div
                      key={mapping.supersistema_id}
                      className="flex items-center justify-between p-4 bg-slate-700/20 border border-slate-600/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-white font-medium">{mapping.nome}</div>
                        <div className="text-sm text-slate-400">
                          {mapping.supersistema_id} → {mapping.conecta_id}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTenantMapping(mapping.supersistema_id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Monitoring Tab */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Monitoramento da Integração</h3>
                <div className="flex gap-2">
                  <button
                    onClick={loadMonitoringData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600/30 hover:bg-slate-600/50 border border-slate-500/30 rounded-lg text-slate-300 font-medium transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </button>
                  <button
                    onClick={handleFullSync}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 rounded-lg text-violet-300 font-medium transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    Sync Completo
                  </button>
                </div>
              </div>

              {syncStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-200 font-medium">Última Sincronização</span>
                    </div>
                    <div className="text-sm text-slate-400">
                      {formatTimestamp(syncStatus.last_sync)}
                    </div>
                  </div>

                  <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Upload className="w-5 h-5 text-green-400" />
                      <span className="text-slate-200 font-medium">Items Sincronizados</span>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {syncStatus.total_synced_items}
                    </div>
                  </div>

                  <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-slate-200 font-medium">Erros</span>
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                      {syncStatus.total_errors}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent errors */}
              {syncStatus && syncStatus.last_errors.length > 0 && (
                <div className="bg-red-500/5 border border-red-400/20 rounded-xl p-4">
                  <h4 className="text-red-300 font-medium mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Erros Recentes
                  </h4>
                  <div className="space-y-2">
                    {syncStatus.last_errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-200 bg-red-500/10 p-2 rounded">
                        <div className="font-medium">{error.operation}</div>
                        <div className="text-red-300/80">{error.error}</div>
                        <div className="text-xs text-red-400 mt-1">
                          {formatTimestamp(error.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Logs de Webhooks</h3>
                <button
                  onClick={() => loadMonitoringData()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600/30 hover:bg-slate-600/50 border border-slate-500/30 rounded-lg text-slate-300 font-medium transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Atualizar
                </button>
              </div>

              <div className="space-y-3">
                {webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum webhook registrado</p>
                  </div>
                ) : (
                  webhookLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-slate-700/20 border border-slate-600/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-white font-medium">{log.event_type}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.direction === 'sent'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-green-500/20 text-green-300'
                          }`}>
                            {getWebhookDirectionText(log.direction)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            log.status === 'processed'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="text-sm text-slate-400">
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}