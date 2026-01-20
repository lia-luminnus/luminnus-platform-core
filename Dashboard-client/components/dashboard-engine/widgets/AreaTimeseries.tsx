/**
 * Area Timeseries Widget
 * 
 * Versão aprimorada do gráfico de linha com foco em área preenchida
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { WidgetProps, MetricTimeseriesPoint } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';
import { useContext } from 'react';


const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

function formatCurrency(value: number): string {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function AreaTimeseries({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { t } = useContext(LanguageContext);
    const { metrics, type, config: widgetConfig } = config;
    const title = t(`widget_${type}_name` as any);

    const smoothCurve = widgetConfig?.smoothCurve !== false;
    const opacity = widgetConfig?.opacity || 0.4;

    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.map((point: MetricTimeseriesPoint) => ({
            name: formatDate(point.period),
            value: point.value,
        }));
    }, [data]);

    if (loading) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center">
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

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id={`areaGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[0]} stopOpacity={opacity} />
                                <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={20}
                        />
                        <YAxis
                            stroke="#6b7280"
                            fontSize={10}
                            tickFormatter={formatCurrency}
                            tickLine={false}
                            axisLine={false}
                            width={50}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111827',
                                border: '1px solid #374151',
                                borderRadius: '12px',
                                fontSize: '11px',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            formatter={(value: number) => [formatCurrency(value), t(`metric_${config.metric}` as any) || 'Valor']}
                        />

                        <Area
                            type={smoothCurve ? 'monotone' : 'linear'}
                            dataKey="value"
                            stroke={COLORS[0]}
                            strokeWidth={3}
                            fill={`url(#areaGrad-${id})`}
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default AreaTimeseries;
