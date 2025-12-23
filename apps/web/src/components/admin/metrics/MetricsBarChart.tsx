/**
 * Gráfico de barras para métricas comparativas
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface BarChartData {
  name: string;
  value: number;
  custo?: number;
}

interface MetricsBarChartProps {
  title: string;
  description?: string;
  data: BarChartData[];
  isLoading?: boolean;
  valueLabel?: string;
  costLabel?: string;
  showCost?: boolean;
  barColor?: string;
  costColor?: string;
  formatValue?: (value: number) => string;
  formatCost?: (value: number) => string;
  layout?: 'horizontal' | 'vertical';
}

const COLORS = [
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#6366f1',
  '#14b8a6',
];

const MetricsBarChart = ({
  title,
  description,
  data,
  isLoading,
  valueLabel = "Valor",
  costLabel = "Custo",
  showCost = false,
  barColor = "#8b5cf6",
  costColor = "#06b6d4",
  formatValue,
  formatCost,
  layout = 'horizontal',
}: MetricsBarChartProps) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.slice(0, 10); // Limitar a 10 itens
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
            {entry.dataKey === 'value'
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
              <BarChart
                data={chartData}
                layout={layout === 'vertical' ? 'vertical' : 'horizontal'}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                {layout === 'vertical' ? (
                  <>
                    <XAxis type="number" tickFormatter={formatValue || defaultFormatValue} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 12 }}
                      width={100}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      tickFormatter={formatValue || defaultFormatValue}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                  </>
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="value"
                  name={valueLabel}
                  fill={barColor}
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
                {showCost && (
                  <Bar
                    dataKey="custo"
                    name={costLabel}
                    fill={costColor}
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsBarChart;
