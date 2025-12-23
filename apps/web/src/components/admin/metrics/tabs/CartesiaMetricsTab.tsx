/**
 * Aba de métricas Cartesia (TTS - Text to Speech)
 * - Créditos consumidos/restantes
 * - Minutos de fala gerados
 * - Consumo por empresa/usuário
 * - Velocidade média de consumo
 * - Previsão de esgotamento
 * - Alertas
 */

import { useMemo } from "react";
import { Mic, Clock, DollarSign, AlertTriangle, Gauge, Calendar } from "lucide-react";
import MetricCard from "../MetricCard";
import MetricsLineChart from "../MetricsLineChart";
import MetricsTable from "../MetricsTable";
import AlertBadge from "../AlertBadge";
import StatusIndicator from "../StatusIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useMetricsCartesia,
  useMetricsCartesiaByCompany,
  useChartData,
  calcularMinutosCartesia,
} from "@/hooks/useMetrics";
import { useMetricsAlerts, useResolveAlert } from "@/hooks/useMetrics";
import { CARTESIA_CHARS_PER_MINUTE } from "@/types/metrics";

const CartesiaMetricsTab = () => {
  const { data: metricsData, isLoading: metricsLoading } = useMetricsCartesia(30);
  const { data: byCompanyData, isLoading: byCompanyLoading } = useMetricsCartesiaByCompany();
  const { data: chartData, isLoading: chartLoading } = useChartData('cartesia');
  const { data: alerts } = useMetricsAlerts(false);
  const resolveAlert = useResolveAlert();

  const cartesiaAlerts = alerts?.filter(a => a.fonte === 'cartesia') || [];

  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!metricsData || metricsData.length === 0) {
      return {
        creditosUsados: 0,
        creditosRestantes: 1000, // Valor padrão
        creditosTotais: 1000,
        percentualUsado: 0,
        minutosGerados: 0,
        custoTotal: 0,
        mediaDialia: 0,
        diasParaEsgotamento: null as number | null,
      };
    }

    const creditosUsados = metricsData.reduce((acc, m) => acc + (m.creditos_usados || 0), 0);
    const creditosRestantes = metricsData[0]?.creditos_restantes || 0;
    const creditosTotais = creditosUsados + creditosRestantes;
    const percentualUsado = creditosTotais > 0 ? (creditosUsados / creditosTotais) * 100 : 0;

    const caracteresTotal = metricsData.reduce((acc, m) => acc + (m.caracteres_enviados || 0), 0);
    const minutosGerados = calcularMinutosCartesia(caracteresTotal);
    const custoTotal = metricsData.reduce((acc, m) => acc + (m.custo_estimado || 0), 0);

    // Calcular média diária
    const diasComDados = new Set(metricsData.map(m => m.data)).size;
    const mediaDialia = diasComDados > 0 ? creditosUsados / diasComDados : 0;

    // Calcular dias para esgotamento
    const diasParaEsgotamento = mediaDialia > 0
      ? Math.ceil(creditosRestantes / mediaDialia)
      : null;

    return {
      creditosUsados,
      creditosRestantes,
      creditosTotais,
      percentualUsado,
      minutosGerados,
      custoTotal,
      mediaDialia,
      diasParaEsgotamento,
    };
  }, [metricsData]);

  // Formatar números
  const formatCredits = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatMinutes = (value: number) => {
    if (value >= 60) {
      const hours = Math.floor(value / 60);
      const mins = Math.round(value % 60);
      return `${hours}h ${mins}m`;
    }
    return `${value.toFixed(1)}m`;
  };

  const formatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  // Determinar status baseado no percentual restante
  const getStatus = () => {
    const percentualRestante = 100 - aggregatedMetrics.percentualUsado;
    if (percentualRestante <= 10) return 'red';
    if (percentualRestante <= 20) return 'yellow';
    return 'green';
  };

  // Data prevista de esgotamento
  const dataEsgotamento = useMemo(() => {
    if (!aggregatedMetrics.diasParaEsgotamento) return null;
    const data = new Date();
    data.setDate(data.getDate() + aggregatedMetrics.diasParaEsgotamento);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [aggregatedMetrics.diasParaEsgotamento]);

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {cartesiaAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alertas Ativos ({cartesiaAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cartesiaAlerts.map(alert => (
              <AlertBadge
                key={alert.id}
                alert={alert}
                onResolve={(id) => resolveAlert.mutate(id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Créditos Consumidos"
          value={formatCredits(aggregatedMetrics.creditosUsados)}
          subtitle={`de ${formatCredits(aggregatedMetrics.creditosTotais)} total`}
          icon={<Mic className="w-5 h-5 text-purple-500" />}
          status={getStatus()}
        />
        <MetricCard
          title="Créditos Restantes"
          value={formatCredits(aggregatedMetrics.creditosRestantes)}
          subtitle={`${(100 - aggregatedMetrics.percentualUsado).toFixed(1)}% disponível`}
          icon={<Gauge className="w-5 h-5 text-cyan-500" />}
        />
        <MetricCard
          title="Minutos de Fala"
          value={formatMinutes(aggregatedMetrics.minutosGerados)}
          subtitle={`~${CARTESIA_CHARS_PER_MINUTE} caracteres/minuto`}
          icon={<Clock className="w-5 h-5 text-green-500" />}
        />
        <MetricCard
          title="Custo Estimado"
          value={formatCost(aggregatedMetrics.custoTotal)}
          subtitle="Este mês"
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {/* Barra de Progresso de Créditos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status de Créditos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Utilização de Créditos</span>
              <span className="font-medium">{aggregatedMetrics.percentualUsado.toFixed(1)}%</span>
            </div>
            <Progress
              value={aggregatedMetrics.percentualUsado}
              className="h-3"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="text-yellow-600">80%</span>
              <span className="text-red-600">90%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previsão e Velocidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="w-5 h-5 text-purple-500" />
              Velocidade de Consumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Média diária:</span>
                <span className="font-bold text-lg">
                  {formatCredits(aggregatedMetrics.mediaDialia)} créditos
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Minutos/dia (média):</span>
                <span className="font-bold text-lg text-purple-600">
                  {formatMinutes(calcularMinutosCartesia(aggregatedMetrics.mediaDialia * CARTESIA_CHARS_PER_MINUTE / 100))}
                </span>
              </div>
              <div className="pt-4 border-t">
                <StatusIndicator
                  status={getStatus()}
                  label={
                    getStatus() === 'green'
                      ? 'Consumo normal'
                      : getStatus() === 'yellow'
                      ? 'Atenção ao consumo'
                      : 'Consumo crítico'
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-500" />
              Previsão de Esgotamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aggregatedMetrics.diasParaEsgotamento !== null ? (
                <>
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold text-purple-600">
                      {aggregatedMetrics.diasParaEsgotamento}
                    </p>
                    <p className="text-gray-500">dias restantes</p>
                  </div>
                  <div className="text-center text-sm">
                    <span className="text-gray-600">Data prevista: </span>
                    <span className="font-medium">{dataEsgotamento}</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Sem dados suficientes para previsão</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Limite */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração de Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${
              (100 - aggregatedMetrics.percentualUsado) <= 20
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${
                  (100 - aggregatedMetrics.percentualUsado) <= 20
                    ? 'text-yellow-500'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm">Créditos abaixo de 20%</span>
              </div>
              <p className="text-xs text-gray-500">
                {(100 - aggregatedMetrics.percentualUsado) <= 20
                  ? 'Alerta ativo - recarregue em breve'
                  : 'Monitorando...'}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${
              (100 - aggregatedMetrics.percentualUsado) <= 10
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 ${
                  (100 - aggregatedMetrics.percentualUsado) <= 10
                    ? 'text-red-500'
                    : 'text-gray-400'
                }`} />
                <span className="font-medium text-sm">Créditos abaixo de 10%</span>
              </div>
              <p className="text-xs text-gray-500">
                {(100 - aggregatedMetrics.percentualUsado) <= 10
                  ? 'Alerta crítico - recarregue agora!'
                  : 'Monitorando...'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm">Consumo anormal</span>
              </div>
              <p className="text-xs text-gray-500">
                Detecta picos de consumo acima de 2x a média
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Linha - 30 dias */}
      <MetricsLineChart
        title="Consumo de Créditos (30 dias)"
        description="Evolução do consumo diário de créditos Cartesia"
        data={chartData || []}
        isLoading={chartLoading}
        valueLabel="Créditos"
        costLabel="Custo ($)"
        showCost={true}
        valueColor="#8b5cf6"
        costColor="#10b981"
        formatValue={formatCredits}
        formatCost={formatCost}
      />

      {/* Tabela por Empresa */}
      <MetricsTable
        title="Consumo por Empresa"
        description="Detalhamento de créditos consumidos por empresa"
        data={byCompanyData || []}
        isLoading={byCompanyLoading}
        type="company"
        valueLabel="Créditos"
        formatValue={formatCredits}
        formatCost={formatCost}
      />
    </div>
  );
};

export default CartesiaMetricsTab;
