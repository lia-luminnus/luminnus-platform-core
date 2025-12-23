/**
 * Aba de métricas Cloudflare (Workers e Automations)
 * - Requests por dia
 * - Requests por empresa
 * - Tempo de execução dos workers
 * - Custos estimados (free/paid)
 * - Erros 4xx/5xx
 * - Tráfego por rota
 * - Alertas
 */

import { useMemo } from "react";
import { Cloud, Zap, Clock, AlertTriangle, Activity, Route, DollarSign } from "lucide-react";
import MetricCard from "../MetricCard";
import MetricsLineChart from "../MetricsLineChart";
import MetricsTable from "../MetricsTable";
import MetricsBarChart from "../MetricsBarChart";
import AlertBadge from "../AlertBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useMetricsCloudflare,
  useMetricsCloudflareByCompany,
  useChartData,
} from "@/hooks/useMetrics";
import { useMetricsAlerts, useResolveAlert } from "@/hooks/useMetrics";
import { CLOUDFLARE_PRICES } from "@/types/metrics";

const CloudflareMetricsTab = () => {
  const { data: metricsData, isLoading: metricsLoading } = useMetricsCloudflare(30);
  const { data: byCompanyData, isLoading: byCompanyLoading } = useMetricsCloudflareByCompany();
  const { data: chartData, isLoading: chartLoading } = useChartData('cloudflare');
  const { data: alerts } = useMetricsAlerts(false);
  const resolveAlert = useResolveAlert();

  const cloudflareAlerts = alerts?.filter(a => a.fonte === 'cloudflare') || [];

  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!metricsData || metricsData.length === 0) {
      return {
        requestsTotal: 0,
        requestsDia: 0,
        workersExecutados: 0,
        tempoExecucaoMedio: 0,
        erros4xx: 0,
        erros5xx: 0,
        custoTotal: 0,
        plano: 'free' as const,
        trafegoRota: {} as Record<string, number>,
        percentualFreeTier: 0,
      };
    }

    const requestsTotal = metricsData.reduce((acc, m) => acc + (m.requests_dia || 0), 0);
    const requestsDia = metricsData.length > 0
      ? Math.round(requestsTotal / metricsData.length)
      : 0;

    const workersExecutados = metricsData.reduce((acc, m) => acc + (m.workers_executados || 0), 0);

    // Média de tempo de execução
    const temposExecucao = metricsData.filter(m => m.tempo_execucao_ms > 0);
    const tempoExecucaoMedio = temposExecucao.length > 0
      ? temposExecucao.reduce((acc, m) => acc + m.tempo_execucao_ms, 0) / temposExecucao.length
      : 0;

    const erros4xx = metricsData.reduce((acc, m) => acc + (m.erros_4xx || 0), 0);
    const erros5xx = metricsData.reduce((acc, m) => acc + (m.erros_5xx || 0), 0);
    const custoTotal = metricsData.reduce((acc, m) => acc + (m.custo_estimado || 0), 0);

    // Plano atual (do último registro)
    const plano = metricsData[0]?.plano || 'free';

    // Agregar tráfego por rota
    const trafegoRota: Record<string, number> = {};
    metricsData.forEach(m => {
      if (m.trafego_rota) {
        Object.entries(m.trafego_rota).forEach(([rota, count]) => {
          trafegoRota[rota] = (trafegoRota[rota] || 0) + count;
        });
      }
    });

    // Percentual do free tier (100k requests/dia)
    const percentualFreeTier = (requestsDia / CLOUDFLARE_PRICES.free_tier_requests) * 100;

    return {
      requestsTotal,
      requestsDia,
      workersExecutados,
      tempoExecucaoMedio,
      erros4xx,
      erros5xx,
      custoTotal,
      plano,
      trafegoRota,
      percentualFreeTier,
    };
  }, [metricsData]);

  // Formatar números
  const formatNumber = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatMs = (value: number) => `${value.toFixed(0)}ms`;
  const formatCost = (value: number) => `$${value.toFixed(4)}`;

  // Dados para gráfico de rotas
  const routeChartData = useMemo(() => {
    return Object.entries(aggregatedMetrics.trafegoRota)
      .map(([rota, count]) => ({
        name: rota.length > 20 ? rota.substring(0, 20) + '...' : rota,
        value: count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [aggregatedMetrics.trafegoRota]);

  // Determinar status
  const getStatus = () => {
    if (aggregatedMetrics.percentualFreeTier >= 95) return 'red';
    if (aggregatedMetrics.percentualFreeTier >= 80) return 'yellow';
    if (aggregatedMetrics.erros5xx > 50) return 'yellow';
    return 'green';
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {cloudflareAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alertas Ativos ({cloudflareAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cloudflareAlerts.map(alert => (
              <AlertBadge
                key={alert.id}
                alert={alert}
                onResolve={(id) => resolveAlert.mutate(id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status do Plano */}
      <Card className={`border-l-4 ${
        aggregatedMetrics.plano === 'free' ? 'border-l-gray-400' : 'border-l-orange-500'
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Cloud className="w-8 h-8 text-orange-500" />
              <div>
                <h3 className="font-semibold text-lg">Cloudflare Workers</h3>
                <p className="text-sm text-gray-500">Automações e APIs</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant={aggregatedMetrics.plano === 'free' ? 'secondary' : 'default'}
                className="text-lg px-3 py-1 capitalize"
              >
                {aggregatedMetrics.plano}
              </Badge>
              <span className="text-lg font-bold text-green-600">
                {formatCost(aggregatedMetrics.custoTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Requests/Dia"
          value={formatNumber(aggregatedMetrics.requestsDia)}
          subtitle={`Total: ${formatNumber(aggregatedMetrics.requestsTotal)}`}
          icon={<Activity className="w-5 h-5 text-orange-500" />}
          status={getStatus()}
        />
        <MetricCard
          title="Workers Executados"
          value={formatNumber(aggregatedMetrics.workersExecutados)}
          subtitle="Últimos 30 dias"
          icon={<Zap className="w-5 h-5 text-purple-500" />}
        />
        <MetricCard
          title="Tempo de Execução"
          value={formatMs(aggregatedMetrics.tempoExecucaoMedio)}
          subtitle="Média por request"
          icon={<Clock className="w-5 h-5 text-cyan-500" />}
        />
        <MetricCard
          title="Custo Estimado"
          value={formatCost(aggregatedMetrics.custoTotal)}
          subtitle="Este mês"
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
      </div>

      {/* Uso do Free Tier */}
      {aggregatedMetrics.plano === 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uso do Free Tier</CardTitle>
            <CardDescription>
              {formatNumber(CLOUDFLARE_PRICES.free_tier_requests)} requests/dia inclusos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Utilização diária</span>
                <span className="font-medium">
                  {aggregatedMetrics.percentualFreeTier.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(aggregatedMetrics.percentualFreeTier, 100)}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className={aggregatedMetrics.percentualFreeTier > 80 ? 'text-yellow-600 font-medium' : ''}>
                  80%
                </span>
                <span className={aggregatedMetrics.percentualFreeTier > 95 ? 'text-red-600 font-medium' : ''}>
                  95%
                </span>
                <span>100%</span>
              </div>
              {aggregatedMetrics.percentualFreeTier > 80 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    Você está se aproximando do limite do free tier.
                    Considere fazer upgrade para o plano Pro.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Erros 4xx</CardTitle>
            <CardDescription>Erros do cliente (bad request, not found, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <span className={`text-4xl font-bold ${
                aggregatedMetrics.erros4xx > 100 ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {formatNumber(aggregatedMetrics.erros4xx)}
              </span>
              <p className="text-sm text-gray-500 mt-2">nos últimos 30 dias</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Erros 5xx</CardTitle>
            <CardDescription>Erros do servidor (internal error, timeout, etc.)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <span className={`text-4xl font-bold ${
                aggregatedMetrics.erros5xx > 50 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {formatNumber(aggregatedMetrics.erros5xx)}
              </span>
              <p className="text-sm text-gray-500 mt-2">nos últimos 30 dias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração de Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${
              aggregatedMetrics.percentualFreeTier >= 95
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${
                  aggregatedMetrics.percentualFreeTier >= 95
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm">Worker atingiu limite de execução</span>
              </div>
              <p className="text-xs text-gray-500">
                {aggregatedMetrics.percentualFreeTier >= 95
                  ? 'Limite atingido! Upgrade necessário.'
                  : 'Monitorando uso do free tier...'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm">API atingiu throttling</span>
              </div>
              <p className="text-xs text-gray-500">
                Detecta quando requests são bloqueados por rate limiting
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Requests */}
      <MetricsLineChart
        title="Requests por Dia (30 dias)"
        description="Volume de requests aos Workers"
        data={chartData || []}
        isLoading={chartLoading}
        valueLabel="Requests"
        costLabel="Custo ($)"
        showCost={true}
        valueColor="#f97316"
        costColor="#10b981"
        formatValue={formatNumber}
        formatCost={formatCost}
      />

      {/* Tráfego por Rota */}
      {routeChartData.length > 0 && (
        <MetricsBarChart
          title="Tráfego por Rota"
          description="Top 10 rotas mais acessadas"
          data={routeChartData}
          isLoading={metricsLoading}
          valueLabel="Requests"
          formatValue={formatNumber}
          layout="vertical"
        />
      )}

      {/* Tabela por Empresa */}
      <MetricsTable
        title="Requests por Empresa"
        description="Detalhamento de requests por empresa"
        data={byCompanyData || []}
        isLoading={byCompanyLoading}
        type="company"
        valueLabel="Requests"
        formatValue={formatNumber}
        formatCost={formatCost}
      />

      {/* Informação de Preços */}
      <Card className="bg-orange-50 border-orange-200">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-orange-700 font-medium">Preços Cloudflare Workers:</span>
            <div className="flex gap-4 text-orange-600">
              <span>Free: {formatNumber(CLOUDFLARE_PRICES.free_tier_requests)} req/dia</span>
              <span>Paid: ${CLOUDFLARE_PRICES.requests_per_million}/1M requests</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CloudflareMetricsTab;
