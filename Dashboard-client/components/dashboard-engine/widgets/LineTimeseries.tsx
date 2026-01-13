/**
 * Line Timeseries Widget
 * 
 * Gráfico de linha/área para séries temporais
 * Suporta múltiplas métricas sobrepostas
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart,
} from 'recharts';
import { WidgetProps, MetricTimeseriesPoint } from '../types';

// ============================================
// Helpers
// ============================================

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

function formatCurrency(value: number): string {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ============================================
// Component
// ============================================

function LineTimeseries({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, metrics, config: widgetConfig } = config;
    const showArea = widgetConfig?.showArea !== false;
    const smoothCurve = widgetConfig?.smoothCurve !== false;

    // Transform data for recharts
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        return data.map((point: MetricTimeseriesPoint) => ({
            name: formatDate(point.period),
            value: point.value,
            previous: point.previous_value,
        }));
    }, [data]);

    if (loading) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-red-500/10 border border-red-500/30 flex flex-col items-center justify-center">
                <span className="text-red-400 text-sm">{error}</span>
            </div>
        );
    }

    // Empty state
    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">show_chart</span>
                        <p className="text-sm text-gray-500">Sem dados para o período</p>
                    </div>
                </div>
            </div>
        );
    }

    const ChartComponent = showArea ? AreaChart : LineChart;
    const DataComponent = showArea ? Area : Line;

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ChartComponent data={chartData}>
                        <defs>
                            <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#6b7280"
                            fontSize={10}
                            tickFormatter={formatCurrency}
                            tickLine={false}
                            axisLine={false}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                            formatter={(value: number) => [formatCurrency(value), 'Valor']}
                            labelStyle={{ color: '#9ca3af' }}
                        />
                        {showArea ? (
                            <Area
                                type={smoothCurve ? 'monotone' : 'linear'}
                                dataKey="value"
                                stroke={COLORS[0]}
                                strokeWidth={2}
                                fill={`url(#gradient-${id})`}
                            />
                        ) : (
                            <Line
                                type={smoothCurve ? 'monotone' : 'linear'}
                                dataKey="value"
                                stroke={COLORS[0]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: COLORS[0] }}
                            />
                        )}
                    </ChartComponent>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default LineTimeseries;
