/**
 * Radar Multidim Widget
 * 
 * Análise comparativa multidimensional (Radar/Spider Chart)
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import { WidgetProps, MetricBreakdownItem } from '../types';

const COLOR = '#8b5cf6';

function formatValue(value: number): string {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
}

function RadarMultidim({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;

    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data as MetricBreakdownItem[];
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

            <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                        <PolarAngleAxis
                            dataKey="dimension_value"
                            tick={{
                                fill: '#ffffff',
                                fontSize: 13,
                                fontWeight: 600,
                                dy: 4
                            }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 'auto']}
                            tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#111827',
                                border: '1px solid #374151',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#fff', marginBottom: '4px' }}
                            formatter={(value: number) => [formatValue(value), 'Valor']}
                        />
                        <Radar
                            name={title}
                            dataKey="value"
                            stroke={COLOR}
                            fill={COLOR}
                            fillOpacity={0.5}
                            strokeWidth={3}
                            animationDuration={1500}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default RadarMultidim;
