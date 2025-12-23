/**
 * Gráfico de linha para métricas (últimos 30 dias)
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyMetric } from "@/types/metrics";
import { Loader2 } from "lucide-react";

interface MetricsLineChartProps {
  title: string;
  description?: string;
  data: DailyMetric[];
  isLoading?: boolean;
  valueLabel?: string;
  costLabel?: string;
  showCost?: boolean;
  valueColor?: string;
  costColor?: string;
  formatValue?: (value: number) => string;
  formatCost?: (value: number) => string;
}

const MetricsLineChart = ({
  title,
  description,
  data,
  isLoading,
  valueLabel = "Valor",
  costLabel = "Custo",
  showCost = true,
  valueColor = "#8b5cf6",
  costColor = "#06b6d4",
  formatValue,
  formatCost,
}: MetricsLineChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Preencher dias faltantes com zeros
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 29);

    const dataMap = new Map(data.map(d => [d.data, d]));
    const filledData: DailyMetric[] = [];

    for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const existing = dataMap.get(dateStr);
      filledData.push({
        data: dateStr,
        valor: existing?.valor || 0,
        custo: existing?.custo || 0,
      });
    }

    return filledData.map(item => ({
      ...item,
      dataFormatted: new Date(item.data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));
  }, [data]);

  const defaultFormatValue = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const defaultFormatCost = (value: number) => {
    return `$${value.toFixed(4)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{' '}
            {entry.dataKey === 'valor'
              ? (formatValue || defaultFormatValue)(entry.value)
              : (formatCost || defaultFormatCost)(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Nenhum dado disponível
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dataFormatted"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  tickFormatter={formatValue || defaultFormatValue}
                />
                {showCost && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={formatCost || defaultFormatCost}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="valor"
                  name={valueLabel}
                  stroke={valueColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {showCost && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="custo"
                    name={costLabel}
                    stroke={costColor}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsLineChart;
