/**
 * Aba de métricas Render (Servidor)
 * - Status do servidor (online/offline)
 * - Tempo de resposta médio
 * - CPU/RAM
 * - Logs de erros
 * - Número de chamadas por dia
 * - Uso mensal estimado
 * - Alertas
 */

import { useMemo } from "react";
import { Server, Clock, Cpu, HardDrive, AlertTriangle, Activity, Bug } from "lucide-react";
import MetricCard from "../MetricCard";
import MetricsLineChart from "../MetricsLineChart";
import StatusIndicator from "../StatusIndicator";
import AlertBadge from "../AlertBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useMetricsRender,
  useMetricsRenderLatest,
  useChartData,
} from "@/hooks/useMetrics";
import { useMetricsAlerts, useResolveAlert } from "@/hooks/useMetrics";
import { RENDER_INSTANCE_PRICES, RenderErrorLog } from "@/types/metrics";

const RenderMetricsTab = () => {
  const { data: metricsData, isLoading: metricsLoading } = useMetricsRender(30);
  const { data: latestMetrics } = useMetricsRenderLatest();
  const { data: chartData, isLoading: chartLoading } = useChartData('render');
  const { data: alerts } = useMetricsAlerts(false);
  const resolveAlert = useResolveAlert();

  const renderAlerts = alerts?.filter(a => a.fonte === 'render') || [];

  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!metricsData || metricsData.length === 0) {
      return {
        status: 'online' as const,
        tempoRespostaMedio: 0,
        cpuPercent: 0,
        ramPercent: 0,
        chamadasTotal: 0,
        chamadasDia: 0,
        erros500Total: 0,
        erros4xxTotal: 0,
        instanciaTipo: 'Starter',
        custoMensal: 0,
        uptimePercent: 100,
        logsErro: [] as RenderErrorLog[],
      };
    }

    const status = latestMetrics?.status || 'online';

    // Média de tempo de resposta
    const temposResposta = metricsData.filter(m => m.tempo_resposta_ms > 0);
    const tempoRespostaMedio = temposResposta.length > 0
      ? temposResposta.reduce((acc, m) => acc + m.tempo_resposta_ms, 0) / temposResposta.length
      : 0;

    // CPU e RAM atuais
    const cpuPercent = latestMetrics?.cpu_percent || 0;
    const ramPercent = latestMetrics?.ram_percent || 0;

    // Total de chamadas
    const chamadasTotal = metricsData.reduce((acc, m) => acc + (m.chamadas_dia || 0), 0);
    const chamadasDia = metricsData.length > 0
      ? Math.round(chamadasTotal / metricsData.length)
      : 0;

    // Total de erros
    const erros500Total = metricsData.reduce((acc, m) => acc + (m.erros_500 || 0), 0);
    const erros4xxTotal = metricsData.reduce((acc, m) => acc + (m.erros_4xx || 0), 0);

    // Calcular uptime (dias online / total de dias)
    const diasOnline = metricsData.filter(m => m.status === 'online').length;
    const uptimePercent = metricsData.length > 0
      ? (diasOnline / metricsData.length) * 100
      : 100;

    // Instância e custo
    const instanciaTipo = latestMetrics?.instancia_tipo || 'Starter';
    const custoMensal = RENDER_INSTANCE_PRICES[instanciaTipo] || 0;

    // Logs de erro (últimos 10)
    const logsErro = latestMetrics?.logs_erro?.slice(0, 10) || [];

    return {
      status,
      tempoRespostaMedio,
      cpuPercent,
      ramPercent,
      chamadasTotal,
      chamadasDia,
      erros500Total,
      erros4xxTotal,
      instanciaTipo,
      custoMensal,
      uptimePercent,
      logsErro,
    };
  }, [metricsData, latestMetrics]);

  // Formatar números
  const formatMs = (value: number) => `${value.toFixed(0)}ms`;
  const formatNumber = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  // Determinar status geral
  const getOverallStatus = () => {
    if (aggregatedMetrics.status === 'offline') return 'red';
    if (aggregatedMetrics.status === 'degraded') return 'yellow';
    if (aggregatedMetrics.cpuPercent > 80 || aggregatedMetrics.ramPercent > 80) return 'yellow';
    if (aggregatedMetrics.erros500Total > 10) return 'yellow';
    return 'green';
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {renderAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alertas Ativos ({renderAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderAlerts.map(alert => (
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
        getOverallStatus() === 'green'
          ? 'border-l-green-500'
          : getOverallStatus() === 'yellow'
          ? 'border-l-yellow-500'
          : 'border-l-red-500'
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Server className="w-8 h-8 text-gray-600" />
              <div>
                <h3 className="font-semibold text-lg">Servidor Render</h3>
                <p className="text-sm text-gray-500">
                  Instância: {aggregatedMetrics.instanciaTipo}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator
                status={aggregatedMetrics.status}
                size="lg"
              />
              <Badge variant="outline" className="text-lg px-3 py-1">
                ${aggregatedMetrics.custoMensal}/mês
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tempo de Resposta"
          value={formatMs(aggregatedMetrics.tempoRespostaMedio)}
          subtitle="Média dos últimos 30 dias"
          icon={<Clock className="w-5 h-5 text-purple-500" />}
          status={aggregatedMetrics.tempoRespostaMedio > 1000 ? 'yellow' : 'green'}
        />
        <MetricCard
          title="Uptime"
          value={`${aggregatedMetrics.uptimePercent.toFixed(1)}%`}
          subtitle="Últimos 30 dias"
          icon={<Activity className="w-5 h-5 text-green-500" />}
          status={aggregatedMetrics.uptimePercent < 99 ? 'yellow' : 'green'}
        />
        <MetricCard
          title="Chamadas/Dia"
          value={formatNumber(aggregatedMetrics.chamadasDia)}
          subtitle={`Total: ${formatNumber(aggregatedMetrics.chamadasTotal)}`}
          icon={<Server className="w-5 h-5 text-cyan-500" />}
        />
        <MetricCard
          title="Erros 500"
          value={aggregatedMetrics.erros500Total.toString()}
          subtitle={`4xx: ${aggregatedMetrics.erros4xxTotal}`}
          icon={<Bug className="w-5 h-5 text-red-500" />}
          status={aggregatedMetrics.erros500Total > 10 ? 'red' : 'green'}
        />
      </div>

      {/* CPU e RAM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-500" />
              Uso de CPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-purple-600">
                  {aggregatedMetrics.cpuPercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={aggregatedMetrics.cpuPercent}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className={aggregatedMetrics.cpuPercent > 70 ? 'text-yellow-600 font-medium' : ''}>
                  70%
                </span>
                <span className={aggregatedMetrics.cpuPercent > 90 ? 'text-red-600 font-medium' : ''}>
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
              <HardDrive className="w-5 h-5 text-cyan-500" />
              Uso de RAM
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-cyan-600">
                  {aggregatedMetrics.ramPercent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={aggregatedMetrics.ramPercent}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span className={aggregatedMetrics.ramPercent > 70 ? 'text-yellow-600 font-medium' : ''}>
                  70%
                </span>
                <span className={aggregatedMetrics.ramPercent > 90 ? 'text-red-600 font-medium' : ''}>
                  90%
                </span>
                <span>100%</span>
              </div>
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
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm">Instabilidade nas últimas 24h</span>
              </div>
              <p className="text-xs text-gray-500">
                Alerta quando há 3+ eventos de instabilidade
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              aggregatedMetrics.erros500Total > 5
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${
                  aggregatedMetrics.erros500Total > 5
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm">Erro 500 acima do normal</span>
              </div>
              <p className="text-xs text-gray-500">
                {aggregatedMetrics.erros500Total > 5
                  ? `${aggregatedMetrics.erros500Total} erros detectados!`
                  : 'Monitorando...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Chamadas */}
      <MetricsLineChart
        title="Chamadas por Dia (30 dias)"
        description="Volume de chamadas ao servidor"
        data={chartData || []}
        isLoading={chartLoading}
        valueLabel="Chamadas"
        costLabel="Custo ($)"
        showCost={false}
        valueColor="#06b6d4"
        formatValue={formatNumber}
      />

      {/* Logs de Erro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" />
            Logs de Erro Recentes
          </CardTitle>
          <CardDescription>
            Últimos erros registrados no backend
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aggregatedMetrics.logsErro.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bug className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum erro recente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="w-[40%]">Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregatedMetrics.logsErro.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{log.code}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.endpoint || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preços das Instâncias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preços das Instâncias Render</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(RENDER_INSTANCE_PRICES).map(([tipo, preco]) => (
              <div
                key={tipo}
                className={`p-3 rounded-lg border text-center ${
                  tipo === aggregatedMetrics.instanciaTipo
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200'
                }`}
              >
                <p className="font-medium text-sm">{tipo}</p>
                <p className="text-lg font-bold text-purple-600">
                  ${preco}
                </p>
                <p className="text-xs text-gray-500">/mês</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RenderMetricsTab;
