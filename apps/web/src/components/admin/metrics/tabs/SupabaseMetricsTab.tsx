/**
 * Aba de métricas Supabase (Database)
 * - Leituras/escritas por segundo
 * - Consumo por tabela
 * - Tamanho do banco
 * - Conexões abertas
 * - Taxa de erros
 * - Previsão de capacidade
 * - Alertas
 */

import { useMemo } from "react";
import { Database, HardDrive, AlertTriangle, Activity, Clock, Gauge, Table2 } from "lucide-react";
import MetricCard from "../MetricCard";
import MetricsLineChart from "../MetricsLineChart";
import MetricsBarChart from "../MetricsBarChart";
import AlertBadge from "../AlertBadge";
import StatusIndicator from "../StatusIndicator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useMetricsSupabase,
  useMetricsSupabaseLatest,
  useChartData,
} from "@/hooks/useMetrics";
import { useMetricsAlerts, useResolveAlert } from "@/hooks/useMetrics";
import { SUPABASE_PRICES } from "@/types/metrics";

const SupabaseMetricsTab = () => {
  const { data: metricsData, isLoading: metricsLoading } = useMetricsSupabase(30);
  const { data: latestMetrics } = useMetricsSupabaseLatest();
  const { data: chartData, isLoading: chartLoading } = useChartData('supabase');
  const { data: alerts } = useMetricsAlerts(false);
  const resolveAlert = useResolveAlert();

  const supabaseAlerts = alerts?.filter(a => a.fonte === 'supabase') || [];

  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!metricsData || metricsData.length === 0) {
      return {
        leiturasPorSegundo: 0,
        escritasPorSegundo: 0,
        tamanhoBancoMb: 0,
        conexoesAbertas: 0,
        taxaErros: 0,
        consultasLentas: 0,
        storageUsadoMb: 0,
        storageLimiteMb: 500,
        storagePercentual: 0,
        custoTotal: 0,
        consumoPorTabela: {} as Record<string, { leituras: number; escritas: number; tamanho_mb: number }>,
      };
    }

    // Usar dados mais recentes para métricas instantâneas
    const latest = latestMetrics || metricsData[0];

    const leiturasPorSegundo = latest?.leituras_segundo || 0;
    const escritasPorSegundo = latest?.escritas_segundo || 0;
    const tamanhoBancoMb = latest?.tamanho_banco_mb || 0;
    const conexoesAbertas = latest?.conexoes_abertas || 0;
    const taxaErros = latest?.taxa_erros || 0;
    const storageUsadoMb = latest?.storage_usado_mb || 0;
    const storageLimiteMb = latest?.storage_limite_mb || 500;
    const storagePercentual = storageLimiteMb > 0
      ? (storageUsadoMb / storageLimiteMb) * 100
      : 0;

    // Somar consultas lentas do período
    const consultasLentas = metricsData.reduce((acc, m) => acc + (m.consultas_lentas || 0), 0);

    // Custo total
    const custoTotal = metricsData.reduce((acc, m) => acc + (m.custo_estimado || 0), 0);

    // Agregar consumo por tabela
    const consumoPorTabela: Record<string, { leituras: number; escritas: number; tamanho_mb: number }> = {};
    metricsData.forEach(m => {
      if (m.consumo_tabela) {
        Object.entries(m.consumo_tabela).forEach(([tabela, dados]) => {
          if (!consumoPorTabela[tabela]) {
            consumoPorTabela[tabela] = { leituras: 0, escritas: 0, tamanho_mb: 0 };
          }
          consumoPorTabela[tabela].leituras += dados.leituras || 0;
          consumoPorTabela[tabela].escritas += dados.escritas || 0;
          consumoPorTabela[tabela].tamanho_mb = Math.max(
            consumoPorTabela[tabela].tamanho_mb,
            dados.tamanho_mb || 0
          );
        });
      }
    });

    return {
      leiturasPorSegundo,
      escritasPorSegundo,
      tamanhoBancoMb,
      conexoesAbertas,
      taxaErros,
      consultasLentas,
      storageUsadoMb,
      storageLimiteMb,
      storagePercentual,
      custoTotal,
      consumoPorTabela,
    };
  }, [metricsData, latestMetrics]);

  // Formatar números
  const formatNumber = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(value < 10 ? 2 : 0);
  };

  const formatMb = (value: number) => {
    if (value >= 1024) return `${(value / 1024).toFixed(2)} GB`;
    return `${value.toFixed(2)} MB`;
  };

  const formatCost = (value: number) => `$${value.toFixed(4)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // Dados para gráfico de tabelas
  const tableChartData = useMemo(() => {
    return Object.entries(aggregatedMetrics.consumoPorTabela)
      .map(([tabela, dados]) => ({
        name: tabela,
        value: dados.leituras + dados.escritas,
        custo: dados.tamanho_mb * SUPABASE_PRICES.storage_per_gb / 1024,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [aggregatedMetrics.consumoPorTabela]);

  // Determinar status
  const getStatus = () => {
    if (aggregatedMetrics.storagePercentual >= 90) return 'red';
    if (aggregatedMetrics.storagePercentual >= 80) return 'yellow';
    if (aggregatedMetrics.taxaErros > 0.01) return 'yellow';
    if (aggregatedMetrics.consultasLentas > 50) return 'yellow';
    return 'green';
  };

  // Previsão de capacidade
  const capacityForecast = useMemo(() => {
    if (!metricsData || metricsData.length < 7) return null;

    // Calcular taxa de crescimento (últimos 7 dias)
    const recentData = metricsData.slice(0, 7);
    const oldestStorage = recentData[recentData.length - 1]?.storage_usado_mb || 0;
    const newestStorage = recentData[0]?.storage_usado_mb || 0;

    if (oldestStorage === 0) return null;

    const growthRate = (newestStorage - oldestStorage) / 7; // MB por dia
    const remainingSpace = aggregatedMetrics.storageLimiteMb - aggregatedMetrics.storageUsadoMb;

    if (growthRate <= 0) {
      return { daysRemaining: null, growthRate: 0 };
    }

    const daysRemaining = Math.ceil(remainingSpace / growthRate);
    return { daysRemaining, growthRate };
  }, [metricsData, aggregatedMetrics]);

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {supabaseAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alertas Ativos ({supabaseAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {supabaseAlerts.map(alert => (
              <AlertBadge
                key={alert.id}
                alert={alert}
                onResolve={(id) => resolveAlert.mutate(id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status Principal */}
      <Card className={`border-l-4 ${
        getStatus() === 'green'
          ? 'border-l-green-500'
          : getStatus() === 'yellow'
          ? 'border-l-yellow-500'
          : 'border-l-red-500'
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Database className="w-8 h-8 text-emerald-600" />
              <div>
                <h3 className="font-semibold text-lg">Supabase Database</h3>
                <p className="text-sm text-gray-500">PostgreSQL</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator
                status={getStatus()}
                label={
                  getStatus() === 'green'
                    ? 'Saudável'
                    : getStatus() === 'yellow'
                    ? 'Atenção'
                    : 'Crítico'
                }
                size="lg"
              />
              <Badge variant="outline" className="text-lg px-3 py-1">
                {formatCost(aggregatedMetrics.custoTotal)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Leituras/seg"
          value={formatNumber(aggregatedMetrics.leiturasPorSegundo)}
          subtitle="Média atual"
          icon={<Activity className="w-5 h-5 text-emerald-500" />}
        />
        <MetricCard
          title="Escritas/seg"
          value={formatNumber(aggregatedMetrics.escritasPorSegundo)}
          subtitle="Média atual"
          icon={<Activity className="w-5 h-5 text-blue-500" />}
        />
        <MetricCard
          title="Conexões Abertas"
          value={aggregatedMetrics.conexoesAbertas.toString()}
          subtitle="Ativas agora"
          icon={<Gauge className="w-5 h-5 text-purple-500" />}
          status={aggregatedMetrics.conexoesAbertas > 50 ? 'yellow' : 'green'}
        />
        <MetricCard
          title="Consultas Lentas"
          value={aggregatedMetrics.consultasLentas.toString()}
          subtitle="Últimos 30 dias"
          icon={<Clock className="w-5 h-5 text-orange-500" />}
          status={aggregatedMetrics.consultasLentas > 50 ? 'red' : 'green'}
        />
      </div>

      {/* Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-500" />
              Storage do Banco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-emerald-600">
                  {formatMb(aggregatedMetrics.storageUsadoMb)}
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  de {formatMb(aggregatedMetrics.storageLimiteMb)}
                </p>
              </div>
              <Progress
                value={aggregatedMetrics.storagePercentual}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className={aggregatedMetrics.storagePercentual > 80 ? 'text-yellow-600 font-medium' : ''}>
                  80%
                </span>
                <span className={aggregatedMetrics.storagePercentual > 90 ? 'text-red-600 font-medium' : ''}>
                  90%
                </span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="w-5 h-5 text-blue-500" />
              Previsão de Capacidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {capacityForecast && capacityForecast.daysRemaining !== null ? (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <span className={`text-4xl font-bold ${
                    capacityForecast.daysRemaining < 30 ? 'text-red-600' :
                    capacityForecast.daysRemaining < 90 ? 'text-yellow-600' :
                    'text-emerald-600'
                  }`}>
                    {capacityForecast.daysRemaining}
                  </span>
                  <p className="text-sm text-gray-500">dias até limite</p>
                </div>
                <div className="text-center text-sm text-gray-600">
                  <p>Taxa de crescimento: {formatMb(capacityForecast.growthRate)}/dia</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Dados insuficientes para previsão</p>
                <p className="text-xs mt-2">Mínimo de 7 dias de histórico necessário</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Erros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Taxa de Erros</CardTitle>
          <CardDescription>Percentual de queries com erro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-3xl font-bold text-gray-800">
                {formatPercent(aggregatedMetrics.taxaErros * 100)}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {aggregatedMetrics.taxaErros > 0.01
                  ? 'Acima do normal - investigar'
                  : 'Dentro do esperado'}
              </p>
            </div>
            <div className="w-24 h-24">
              <div className={`w-full h-full rounded-full border-8 flex items-center justify-center ${
                aggregatedMetrics.taxaErros > 0.01
                  ? 'border-red-500'
                  : 'border-green-500'
              }`}>
                <span className="text-sm font-medium">
                  {aggregatedMetrics.taxaErros <= 0.01 ? 'OK' : '!'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração de Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${
              aggregatedMetrics.storagePercentual >= 90
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${
                  aggregatedMetrics.storagePercentual >= 90
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm">Storage quase cheio</span>
              </div>
              <p className="text-xs text-gray-500">
                {aggregatedMetrics.storagePercentual >= 90
                  ? `${formatPercent(aggregatedMetrics.storagePercentual)} usado!`
                  : 'Alerta quando > 90%'}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              aggregatedMetrics.consultasLentas > 50
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${
                  aggregatedMetrics.consultasLentas > 50
                    ? 'text-yellow-500'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm">Consultas lentas detectadas</span>
              </div>
              <p className="text-xs text-gray-500">
                {aggregatedMetrics.consultasLentas > 50
                  ? `${aggregatedMetrics.consultasLentas} consultas lentas!`
                  : 'Monitorando performance...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Operações */}
      <MetricsLineChart
        title="Operações do Banco (30 dias)"
        description="Leituras + Escritas por dia"
        data={chartData || []}
        isLoading={chartLoading}
        valueLabel="Operações"
        costLabel="Custo ($)"
        showCost={true}
        valueColor="#10b981"
        costColor="#3b82f6"
        formatValue={formatNumber}
        formatCost={formatCost}
      />

      {/* Consumo por Tabela */}
      {tableChartData.length > 0 && (
        <MetricsBarChart
          title="Consumo por Tabela"
          description="Top 10 tabelas por operações"
          data={tableChartData}
          isLoading={metricsLoading}
          valueLabel="Operações"
          formatValue={formatNumber}
          layout="vertical"
        />
      )}

      {/* Detalhes por Tabela */}
      {Object.keys(aggregatedMetrics.consumoPorTabela).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Table2 className="w-5 h-5 text-emerald-500" />
              Detalhamento por Tabela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Leituras</TableHead>
                    <TableHead className="text-right">Escritas</TableHead>
                    <TableHead className="text-right">Tamanho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(aggregatedMetrics.consumoPorTabela)
                    .sort((a, b) => (b[1].leituras + b[1].escritas) - (a[1].leituras + a[1].escritas))
                    .slice(0, 10)
                    .map(([tabela, dados]) => (
                      <TableRow key={tabela}>
                        <TableCell className="font-mono text-sm">{tabela}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(dados.leituras)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(dados.escritas)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMb(dados.tamanho_mb)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informação de Preços */}
      <Card className="bg-emerald-50 border-emerald-200">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-700 font-medium">Preços Supabase:</span>
            <div className="flex gap-4 text-emerald-600">
              <span>Storage: ${SUPABASE_PRICES.storage_per_gb}/GB/mês</span>
              <span>Bandwidth: ${SUPABASE_PRICES.bandwidth_per_gb}/GB</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseMetricsTab;
