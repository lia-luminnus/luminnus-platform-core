/**
 * Bar Grouped Widget
 * 
 * Gráfico de barras agrupadas/empilhadas por categoria
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { WidgetProps, MetricBreakdownItem } from '../types';

// ============================================
// Helpers
// ============================================

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

function formatCurrency(value: number): string {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value.toFixed(0)}`;
}

// ============================================
// Component
// ============================================

function BarGrouped({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const orientation = widgetConfig?.orientation || 'vertical';
    const showLabels = widgetConfig?.showLabels !== false;

    // Transform data for recharts - Normalize and group duplicates
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        // First pass: normalize names
        const normalized = data.map((item: any, index: number) => ({
            name: item.name || item.dimension_value || `Categoria ${index + 1}`,
            value: Number(item.value) || 0,
            percentage: Number(item.percentage) || 0,
        }));

        // Second pass: group by name and sum values
        const grouped = normalized.reduce((acc: Record<string, { name: string; value: number; percentage: number }>, item) => {
            if (acc[item.name]) {
                acc[item.name].value += item.value;
                acc[item.name].percentage += item.percentage;
            } else {
                acc[item.name] = { ...item };
            }
            return acc;
        }, {});

        // Convert back to array and assign colors
        return Object.values(grouped)
            .sort((a, b) => b.value - a.value)
            .map((item, index) => ({
                ...item,
                fill: COLORS[index % COLORS.length],
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

    // Empty state
    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 mb-2">bar_chart</span>
                        <p className="text-sm text-gray-500">Sem dados para o período</p>
                    </div>
                </div>
            </div>
        );
    }

    const isHorizontal = orientation === 'horizontal';

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout={isHorizontal ? 'vertical' : 'horizontal'}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" opacity={0.1} vertical={false} />
                        {isHorizontal ? (
                            <>
                                <XAxis
                                    type="number"
                                    stroke="#9ca3af"
                                    fontSize={11}
                                    tickFormatter={formatCurrency}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#9ca3af"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                />
                            </>
                        ) : (
                            <>
                                <XAxis
                                    dataKey="name"
                                    type="category"
                                    stroke="#e5e7eb"
                                    fontSize={11}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    height={50}
                                    tick={{ fill: '#e5e7eb', dy: 10 }}
                                />
                                <YAxis
                                    type="number"
                                    stroke="#e5e7eb"
                                    fontSize={11}
                                    tickFormatter={formatCurrency}
                                    tickLine={false}
                                    axisLine={false}
                                    width={70}
                                />
                            </>
                        )}
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{
                                backgroundColor: '#111827',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                fontSize: '13px',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)'
                            } as React.CSSProperties}
                            itemStyle={{ color: '#f3f4f6', padding: '2px 0' }}
                            formatter={(value: number) => [formatCurrency(value), 'Valor']}
                            labelStyle={{ color: '#f3f4f6', fontWeight: '600', marginBottom: '4px' }}
                        />
                        <Bar
                            dataKey="value"
                            radius={isHorizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
                            barSize={32}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default BarGrouped;
