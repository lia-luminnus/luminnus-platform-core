/**
 * Aba de métricas Gemini (Multimodal IA)
 * - Tokens consumidos (Input/Output)
 * - Custo total do mês
 * - Consumo por empresa/usuário
 * - Alertas
 */

import { useMemo } from "react";
import { Sparkles, Cpu, DollarSign, AlertTriangle, Gauge, Zap, Settings } from "lucide-react";
import MetricCard from "../MetricCard";
import MetricsLineChart from "../MetricsLineChart";
import MetricsTable from "../MetricsTable";
import AlertBadge from "../AlertBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMetricsGemini, useMetricsGeminiByCompany } from "@/hooks/useMetrics";
import { useMetricsAlerts, useResolveAlert } from "@/hooks/useMetrics";
import { useChartData } from "@/hooks/useMetrics";

const GeminiMetricsTab = () => {
    const { data: metricsData, isLoading: metricsLoading } = useMetricsGemini(30);
    const { data: byCompanyData, isLoading: byCompanyLoading } = useMetricsGeminiByCompany();
    const { data: chartData, isLoading: chartLoading } = useChartData('gemini');
    const { data: alerts } = useMetricsAlerts(false);
    const resolveAlert = useResolveAlert();

    const geminiAlerts = alerts?.filter(a => a.fonte === 'gemini') || [];

    // Calcular métricas agregadas
    const aggregatedMetrics = useMemo(() => {
        if (!metricsData || metricsData.length === 0) {
            return {
                tokensInput: 0,
                tokensOutput: 0,
                tokensTotal: 0,
                custoTotal: 0,
                mediaDiaria: 0,
            };
        }

        const tokensInput = metricsData.reduce((acc, m) => acc + (m.tokens_input || 0), 0);
        const tokensOutput = metricsData.reduce((acc, m) => acc + (m.tokens_output || 0), 0);
        const tokensTotal = tokensInput + tokensOutput;
        const custoTotal = metricsData.reduce((acc, m) => acc + (m.custo_estimado || m.cost || 0), 0);

        // Calcular média diária (tokens)
        const diasComDados = new Set(metricsData.map(m => m.data)).size || 1;
        const mediaDiaria = tokensTotal / diasComDados;

        return {
            tokensInput,
            tokensOutput,
            tokensTotal,
            custoTotal,
            mediaDiaria,
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

    return (
        <div className="space-y-6">
            {/* Alertas */}
            {geminiAlerts.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            Alertas Ativos ({geminiAlerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {geminiAlerts.map(alert => (
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
                    title="Total de Tokens"
                    value={formatTokens(aggregatedMetrics.tokensTotal)}
                    subtitle="Input + Output"
                    icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
                />
                <MetricCard
                    title="Tokens Input"
                    value={formatTokens(aggregatedMetrics.tokensInput)}
                    subtitle="Prompt / Contexto"
                    icon={<Zap className="w-5 h-5 text-blue-500" />}
                />
                <MetricCard
                    title="Tokens Output"
                    value={formatTokens(aggregatedMetrics.tokensOutput)}
                    subtitle="Resposta / Geração"
                    icon={<Cpu className="w-5 h-5 text-purple-500" />}
                />
                <MetricCard
                    title="Custo Estimado"
                    value={formatCost(aggregatedMetrics.custoTotal)}
                    subtitle="Acumulado este mês"
                    icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
                />
            </div>

            {/* Gráfico de Linha - 30 dias */}
            <MetricsLineChart
                title="Consumo Diário (30 dias)"
                description="Evolução do uso de tokens Gemini"
                data={chartData || []}
                isLoading={chartLoading}
                valueLabel="Tokens"
                costLabel="Custo ($)"
                showCost={true}
                valueColor="#6366f1"
                costColor="#10b981"
                formatValue={formatTokens}
                formatCost={formatCost}
            />

            {/* Tabela por Empresa */}
            {byCompanyData && byCompanyData.length > 0 && (
                <MetricsTable
                    title="Consumo por Empresa"
                    description="Detalhamento de tokens consumidos por empresa"
                    data={byCompanyData}
                    isLoading={byCompanyLoading}
                    type="company"
                    valueLabel="Tokens"
                    formatValue={formatTokens}
                    formatCost={formatCost}
                />
            )}
            {/* Ajuda / Configuração */}
            <Card className="bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <Settings className="w-4 h-4" />
                        Onde gerenciar as chaves Gemini?
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-indigo-600/80 dark:text-indigo-400/70 mb-3">
                        As chaves de API do Gemini e as Chaves Personalizadas são gerenciadas no menu
                        <strong> Configurações da LIA</strong> na barra lateral do Admin.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default GeminiMetricsTab;
