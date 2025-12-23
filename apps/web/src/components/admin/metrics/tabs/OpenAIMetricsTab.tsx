/**
 * Aba de métricas OpenAI
 * - Tokens consumidos (input, output, total)
 * - Custo estimado (GPT-4o-mini)
 * - Tokens por empresa/usuário
 * - Gráfico dos últimos 30 dias
 * - Previsão de consumo mensal
 * - Alertas de limites
 */

import { useMemo } from "react";
import { Zap, DollarSign, TrendingUp, AlertTriangle, Building, User } from "lucide-react";
import MetricCard from "../MetricCard";
import MetricsLineChart from "../MetricsLineChart";
import MetricsBarChart from "../MetricsBarChart";
import MetricsTable from "../MetricsTable";
import AlertBadge from "../AlertBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMetricsOpenAI,
  useMetricsOpenAIByCompany,
  useMetricsOpenAIByUser,
  useChartData,
  calcularCustoOpenAI,
} from "@/hooks/useMetrics";
import { useMetricsAlerts, useResolveAlert } from "@/hooks/useMetrics";
import { ALERT_THRESHOLDS, OPENAI_PRICES } from "@/types/metrics";

const OpenAIMetricsTab = () => {
  const { data: metricsData, isLoading: metricsLoading } = useMetricsOpenAI(30);
  const { data: byCompanyData, isLoading: byCompanyLoading } = useMetricsOpenAIByCompany();
  const { data: byUserData, isLoading: byUserLoading } = useMetricsOpenAIByUser();
  const { data: chartData, isLoading: chartLoading } = useChartData('openai');
  const { data: alerts } = useMetricsAlerts(false);
  const resolveAlert = useResolveAlert();

  const openaiAlerts = alerts?.filter(a => a.fonte === 'openai') || [];

  // Calcular métricas agregadas
  const aggregatedMetrics = useMemo(() => {
    if (!metricsData || metricsData.length === 0) {
      return {
        tokensInput: 0,
        tokensOutput: 0,
        tokensTotal: 0,
        custoTotal: 0,
        mediaDialia: 0,
        previsaoMensal: 0,
        percentualMensal: 0,
      };
    }

    const tokensInput = metricsData.reduce((acc, m) => acc + (m.tokens_input || 0), 0);
    const tokensOutput = metricsData.reduce((acc, m) => acc + (m.tokens_output || 0), 0);
    const tokensTotal = tokensInput + tokensOutput;
    const custoTotal = metricsData.reduce((acc, m) => acc + (m.custo_estimado || 0), 0);

    // Calcular média diária (baseado nos dias com dados)
    const diasComDados = new Set(metricsData.map(m => m.data)).size;
    const mediaDialia = diasComDados > 0 ? tokensTotal / diasComDados : 0;

    // Calcular previsão mensal
    const hoje = new Date();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasRestantes = diasNoMes - hoje.getDate();
    const previsaoMensal = tokensTotal + (mediaDialia * diasRestantes);

    // Limite mensal fictício (pode ser configurável)
    const limiteMensal = 10_000_000; // 10M tokens
    const percentualMensal = (tokensTotal / limiteMensal) * 100;

    return {
      tokensInput,
      tokensOutput,
      tokensTotal,
      custoTotal,
      mediaDialia,
      previsaoMensal,
      percentualMensal,
    };
  }, [metricsData]);

  // Formatar números
  const formatTokens = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const formatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  // Preparar dados para gráfico de barras por empresa
  const companyChartData = useMemo(() => {
    return (byCompanyData || []).map(item => ({
      name: item.empresa_nome.length > 15
        ? item.empresa_nome.substring(0, 15) + '...'
        : item.empresa_nome,
      value: item.total,
      custo: item.custo,
    }));
  }, [byCompanyData]);

  // Determinar status baseado no percentual
  const getStatus = () => {
    if (aggregatedMetrics.percentualMensal >= 90) return 'red';
    if (aggregatedMetrics.percentualMensal >= 70) return 'yellow';
    return 'green';
  };

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {openaiAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Alertas Ativos ({openaiAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openaiAlerts.map(alert => (
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
          title="Tokens de Entrada"
          value={formatTokens(aggregatedMetrics.tokensInput)}
          subtitle="Últimos 30 dias"
          icon={<Zap className="w-5 h-5 text-purple-500" />}
          status={getStatus()}
        />
        <MetricCard
          title="Tokens de Saída"
          value={formatTokens(aggregatedMetrics.tokensOutput)}
          subtitle="Últimos 30 dias"
          icon={<Zap className="w-5 h-5 text-cyan-500" />}
        />
        <MetricCard
          title="Total de Tokens"
          value={formatTokens(aggregatedMetrics.tokensTotal)}
          subtitle={`Média: ${formatTokens(aggregatedMetrics.mediaDialia)}/dia`}
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
        <MetricCard
          title="Custo Estimado"
          value={formatCost(aggregatedMetrics.custoTotal)}
          subtitle="GPT-4o-mini"
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
        />
      </div>

      {/* Informação de Preços */}
      <Card className="bg-purple-500/10 border-purple-500/20">
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-600 dark:text-purple-400 font-medium">Preços GPT-4o-mini:</span>
            <div className="flex gap-4 text-muted-foreground">
              <span>Input: $0.15 / 1M tokens</span>
              <span>Output: $0.60 / 1M tokens</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previsão Mensal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Previsão de Consumo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Consumo atual:</span>
                <span className="font-bold text-lg text-foreground">
                  {formatTokens(aggregatedMetrics.tokensTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Previsão fim do mês:</span>
                <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                  {formatTokens(aggregatedMetrics.previsaoMensal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Custo previsto:</span>
                <span className="font-bold text-lg text-green-600 dark:text-green-400">
                  {formatCost(calcularCustoOpenAI(
                    aggregatedMetrics.previsaoMensal * 0.3, // Estimativa input
                    aggregatedMetrics.previsaoMensal * 0.7  // Estimativa output
                  ))}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Progresso do mês</span>
                  <span>{aggregatedMetrics.percentualMensal.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${aggregatedMetrics.percentualMensal >= 90
                        ? 'bg-red-500'
                        : aggregatedMetrics.percentualMensal >= 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                    style={{ width: `${Math.min(aggregatedMetrics.percentualMensal, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Limites de Alerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <span className="text-sm text-foreground">70% da previsão mensal</span>
                <span className={`text-sm font-medium ${aggregatedMetrics.percentualMensal >= 70 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/40'
                  }`}>
                  {aggregatedMetrics.percentualMensal >= 70 ? 'Atingido' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-sm text-foreground">90% da previsão mensal</span>
                <span className={`text-sm font-medium ${aggregatedMetrics.percentualMensal >= 90 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground/40'
                  }`}>
                  {aggregatedMetrics.percentualMensal >= 90 ? 'Atingido' : 'Pendente'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <span className="text-sm text-foreground">Ultrapassou limite</span>
                <span className={`text-sm font-medium ${aggregatedMetrics.percentualMensal >= 100 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground/40'
                  }`}>
                  {aggregatedMetrics.percentualMensal >= 100 ? 'Atingido' : 'Pendente'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Linha - 30 dias */}
      <MetricsLineChart
        title="Consumo de Tokens (30 dias)"
        description="Evolução do consumo diário de tokens da OpenAI"
        data={chartData || []}
        isLoading={chartLoading}
        valueLabel="Tokens"
        costLabel="Custo ($)"
        showCost={true}
        valueColor="#8b5cf6"
        costColor="#10b981"
        formatValue={formatTokens}
        formatCost={formatCost}
      />

      {/* Gráficos por Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricsBarChart
          title="Tokens por Empresa"
          description="Consumo de tokens por empresa no mês"
          data={companyChartData}
          isLoading={byCompanyLoading}
          valueLabel="Tokens"
          formatValue={formatTokens}
        />

        <MetricsTable
          title="Detalhamento por Empresa"
          description="Ranking de consumo por empresa"
          data={byCompanyData || []}
          isLoading={byCompanyLoading}
          type="company"
          valueLabel="Tokens"
          formatValue={formatTokens}
          formatCost={formatCost}
        />
      </div>

      {/* Tabela por Usuário */}
      <MetricsTable
        title="Consumo por Usuário"
        description="Detalhamento de tokens consumidos por usuário"
        data={byUserData || []}
        isLoading={byUserLoading}
        type="user"
        valueLabel="Tokens"
        formatValue={formatTokens}
        formatCost={formatCost}
      />
    </div>
  );
};

export default OpenAIMetricsTab;
