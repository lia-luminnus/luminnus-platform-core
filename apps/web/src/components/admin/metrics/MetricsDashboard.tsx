/**
 * Painel Geral Unificado de Métricas
 * Exibe resumo de todos os provedores:
 * - OpenAI, Cartesia, Render, Cloudflare, Supabase
 * - Custo total do mês
 * - Projeção de custo até fim do mês
 * - Status em tempo real dos provedores
 */

import { useMemo } from "react";
import {
  Zap,
  Mic,
  Server,
  Cloud,
  Database,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Clock,
  Wifi,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import StatusIndicator from "./StatusIndicator";
import { useDashboardMetrics } from "@/hooks/useMetrics";
import { useMetricsAlerts } from "@/hooks/useMetrics";
import { useProviderDashboard } from "@/hooks/useProviderMetrics";

const MetricsDashboard = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { data: alerts } = useMetricsAlerts(false);

  // Usar o novo hook para status real e refresh
  const {
    status: providerStatus,
    statusByProvider,
    projection,
    allOnline,
    onlineCount,
    totalProviders,
    refresh,
    isRefreshing,
  } = useProviderDashboard();

  const activeAlerts = alerts?.length || 0;

  // Formatar valores
  const formatNumber = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatCost = (value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    return `$${value.toFixed(4)}`;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const formatLatency = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms.toFixed(0)}ms`;
  };

  // Calcular dias restantes no mês
  const daysInfo = useMemo(() => {
    const hoje = new Date();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasPassados = hoje.getDate();
    const diasRestantes = diasNoMes - diasPassados;
    const percentualMes = (diasPassados / diasNoMes) * 100;
    return { diasNoMes, diasPassados, diasRestantes, percentualMes };
  }, []);

  // Obter status real de um provedor
  const getProviderStatus = (provider: string): 'green' | 'yellow' | 'red' => {
    const status = statusByProvider[provider];
    if (!status) return 'green';
    if (!status.online) return 'red';
    if (status.latency_ms > 2000) return 'yellow';
    return 'green';
  };

  // Obter latência de um provedor
  const getProviderLatency = (provider: string): number => {
    return statusByProvider[provider]?.latency_ms || 0;
  };

  // Última atualização de status
  const lastCheckTime = providerStatus?.[0]?.last_check
    ? new Date(providerStatus[0].last_check).toLocaleTimeString('pt-BR')
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge
            variant={allOnline ? "default" : "destructive"}
            className={allOnline ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20" : ""}
          >
            {allOnline ? (
              <><Wifi className="w-3 h-3 mr-1" /> {onlineCount}/{totalProviders} Online</>
            ) : (
              <><WifiOff className="w-3 h-3 mr-1" /> {onlineCount}/{totalProviders} Online</>
            )}
          </Badge>
          {lastCheckTime && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Última verificação: {lastCheckTime}
            </span>
          )}
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refresh()}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Executa coleta de métricas e status imediatamente</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Alertas Ativos */}
      {activeAlerts > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                {activeAlerts} alerta{activeAlerts > 1 ? 's' : ''} ativo{activeAlerts > 1 ? 's' : ''}
              </span>
              <span className="text-sm text-yellow-600">
                - Verifique as abas para mais detalhes
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards de Custo Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Custo Total do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {formatCost(metrics?.custo_total_mes || 0)}
            </p>
            <p className="opacity-80 text-sm mt-2 font-medium">
              {daysInfo.diasPassados} de {daysInfo.diasNoMes} dias ({formatPercent(daysInfo.percentualMes)})
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-700 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Projeção Fim do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {formatCost(projection?.total || metrics?.projecao_fim_mes || 0)}
            </p>
            <p className="text-cyan-200 text-sm mt-2">
              Baseado no consumo atual ({daysInfo.diasRestantes} dias restantes)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progresso do Mês */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Progresso do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Dia {daysInfo.diasPassados} de {daysInfo.diasNoMes}</span>
              <span className="font-medium">{formatPercent(daysInfo.percentualMes)}</span>
            </div>
            <Progress value={daysInfo.percentualMes} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Grid de Provedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* OpenAI */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                OpenAI
              </CardTitle>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <StatusIndicator
                        status={getProviderStatus('openai')}
                        showPulse={statusByProvider['openai']?.online}
                        size="sm"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {statusByProvider['openai']?.online ? 'Online' : 'Offline'}
                        {getProviderLatency('openai') > 0 && ` - ${formatLatency(getProviderLatency('openai'))}`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tokens</span>
                <span className="font-bold text-lg">
                  {formatNumber(metrics?.openai.tokens_mes || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Custo</span>
                <span className="font-bold text-green-600">
                  {formatCost(metrics?.openai.custo_mes || 0)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <p className="text-xs text-gray-500">Modelo: GPT-4o-mini</p>
                {getProviderLatency('openai') > 0 && (
                  <p className="text-xs text-gray-400">{formatLatency(getProviderLatency('openai'))}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartesia */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                Gemini
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <StatusIndicator
                      status={getProviderStatus('gemini')}
                      showPulse={statusByProvider['gemini']?.online}
                      size="sm"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {statusByProvider['gemini']?.online ? 'Online' : 'Offline'}
                      {getProviderLatency('gemini') > 0 && ` - ${formatLatency(getProviderLatency('gemini'))}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/70">Tokens Usados</span>
                <span className="font-bold text-lg">
                  {formatNumber((metrics?.gemini?.tokens_input || 0) + (metrics?.gemini?.tokens_output || 0))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground/70">Custo (Mês)</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatCost(metrics?.gemini?.custo_mes || 0)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <p className="text-xs text-gray-500">Modelo: Gemini 1.5 Flash</p>
                {getProviderLatency('gemini') > 0 && (
                  <p className="text-xs text-gray-400">{formatLatency(getProviderLatency('gemini'))}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Server className="w-5 h-5 text-blue-600" />
                </div>
                Render
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <StatusIndicator
                      status={getProviderStatus('render')}
                      showPulse={statusByProvider['render']?.online}
                      size="sm"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {statusByProvider['render']?.online ? 'Online' : 'Offline'}
                      {getProviderLatency('render') > 0 && ` - ${formatLatency(getProviderLatency('render'))}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <span className="font-bold capitalize">
                  {statusByProvider['render']?.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="font-bold text-green-600">
                  {formatPercent(metrics?.render.uptime_percent || 99.9)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chamadas</span>
                <span className="font-medium">
                  {formatNumber(metrics?.render.chamadas_mes || 0)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <div>
                  <span className="font-bold text-green-600">
                    {formatCost(metrics?.render.custo_mes || 0)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">/mês</span>
                </div>
                {getProviderLatency('render') > 0 && (
                  <p className="text-xs text-gray-400">{formatLatency(getProviderLatency('render'))}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cloudflare */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Cloud className="w-5 h-5 text-orange-600" />
                </div>
                Cloudflare
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <StatusIndicator
                      status={getProviderStatus('cloudflare')}
                      showPulse={statusByProvider['cloudflare']?.online}
                      size="sm"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {statusByProvider['cloudflare']?.online ? 'Online' : 'Offline'}
                      {getProviderLatency('cloudflare') > 0 && ` - ${formatLatency(getProviderLatency('cloudflare'))}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Requests</span>
                <span className="font-bold text-lg">
                  {formatNumber(metrics?.cloudflare.requests_mes || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Workers</span>
                <span className="font-medium">
                  {formatNumber(metrics?.cloudflare.workers_executados || 0)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="font-bold text-green-600">
                  {formatCost(metrics?.cloudflare.custo_mes || 0)}
                </span>
                {getProviderLatency('cloudflare') > 0 && (
                  <p className="text-xs text-gray-400">{formatLatency(getProviderLatency('cloudflare'))}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supabase */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Supabase
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <StatusIndicator
                      status={getProviderStatus('supabase')}
                      showPulse={statusByProvider['supabase']?.online}
                      size="sm"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {statusByProvider['supabase']?.online ? 'Online' : 'Offline'}
                      {getProviderLatency('supabase') > 0 && ` - ${formatLatency(getProviderLatency('supabase'))}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Leituras</span>
                <span className="font-bold text-lg text-foreground">
                  {formatNumber(metrics?.supabase.leituras_total || 0)}/s
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Escritas</span>
                <span className="font-bold text-lg text-foreground">
                  {formatNumber(metrics?.supabase.escritas_total || 0)}/s
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Storage</span>
                <span className="font-medium text-foreground">
                  {formatPercent(metrics?.supabase.storage_usado_percent || 0)}
                </span>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCost(metrics?.supabase.custo_mes || 0)}
                </span>
                {getProviderLatency('supabase') > 0 && (
                  <p className="text-xs text-muted-foreground">{formatLatency(getProviderLatency('supabase'))}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Status Geral */}
        <Card className="hover:shadow-md transition-shadow bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              Status Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Provedores</span>
                <span className={`font-bold text-lg ${allOnline ? 'text-green-600' : 'text-yellow-600'}`}>
                  {onlineCount}/{totalProviders}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Alertas</span>
                <span className={`font-bold ${activeAlerts > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {activeAlerts}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2">
                  {allOnline && activeAlerts === 0 ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Todos os sistemas operacionais</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">Requer atenção</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown de Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Breakdown de Custos</CardTitle>
          <CardDescription>Distribuição dos custos por provedor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'OpenAI', value: metrics?.openai.custo_mes || 0, color: 'bg-purple-500', projection: projection?.byProvider?.openai || 0 },
              { name: 'Gemini', value: metrics?.gemini?.custo_mes || 0, color: 'bg-indigo-500', projection: projection?.byProvider?.gemini || 0 },
              { name: 'Render', value: metrics?.render.custo_mes || 0, color: 'bg-blue-500', projection: projection?.byProvider?.render || 0 },
              { name: 'Cloudflare', value: metrics?.cloudflare.custo_mes || 0, color: 'bg-orange-500', projection: projection?.byProvider?.cloudflare || 0 },
              { name: 'Supabase', value: metrics?.supabase.custo_mes || 0, color: 'bg-emerald-500', projection: projection?.byProvider?.supabase || 0 },
            ].map((provider) => {
              const total = metrics?.custo_total_mes || 1;
              const percent = (provider.value / total) * 100;

              return (
                <div key={provider.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{provider.name}</span>
                    <div className="flex gap-3">
                      <span className="font-medium text-foreground">
                        {formatCost(provider.value)} ({formatPercent(percent)})
                      </span>
                      {provider.projection > 0 && (
                        <span className="text-muted-foreground opacity-50 text-xs">
                          Proj: {formatCost(provider.projection)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${provider.color}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsDashboard;
