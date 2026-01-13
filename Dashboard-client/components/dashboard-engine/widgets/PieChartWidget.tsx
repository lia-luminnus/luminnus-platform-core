/**
 * Pie Chart Widget - Premium Edition
 * 
 * Gráfico de pizza com design premium e legendas claras
 */

import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Sector
} from 'recharts';
import { WidgetProps, MetricBreakdownItem } from '../types';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#84cc16'];

function formatCurrency(value: number): string {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Active shape for hover effect
const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 10}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" className="text-sm font-bold">
                {payload.name}
            </text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="#fff" className="text-xs">
                {formatCurrency(value)}
            </text>
            <text x={cx} y={cy + 28} textAnchor="middle" fill="#9ca3af" className="text-[10px]">
                {(percent * 100).toFixed(1)}%
            </text>
        </g>
    );
};

function PieChartWidget({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title } = config;
    const [activeIndex, setActiveIndex] = useState(-1);

    // Transform and group data
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        const grouped: Record<string, { name: string; value: number }> = {};
        data.forEach((item: any) => {
            const name = item.name || item.dimension_value || "Outros";
            const val = Number(item.value) || 0;
            if (grouped[name]) grouped[name].value += val;
            else grouped[name] = { name, value: val };
        });

        const sorted = Object.values(grouped).sort((a, b) => b.value - a.value);
        const total = sorted.reduce((sum, item) => sum + item.value, 0);

        return sorted.map((item, index) => ({
            ...item,
            percentage: total > 0 ? (item.value / total) * 100 : 0,
            fill: COLORS[index % COLORS.length],
        }));
    }, [data]);

    const total = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData]);

    if (loading) return <div className="h-full w-full flex items-center justify-center bg-white/5 rounded-2xl"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
    if (error) return <div className="h-full w-full flex items-center justify-center bg-red-500/10 rounded-2xl text-red-400 text-xs">{error}</div>;

    return (
        <div className={`h-full w-full rounded-2xl p-5 bg-[#141418] border border-white/5 flex flex-col shadow-xl ${isEditMode ? 'cursor-move' : ''}`}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                <h3 className="text-sm font-medium text-white/90">{title}</h3>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Chart */}
                <div className="flex-1 min-h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={0}
                                outerRadius="80%"
                                dataKey="value"
                                nameKey="name"
                                activeIndex={activeIndex}
                                activeShape={renderActiveShape}
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(-1)}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={entry.fill}
                                        stroke="rgba(0,0,0,0.3)"
                                        strokeWidth={2}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1a1a1f',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    padding: '12px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: '#fff' }}
                                labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                                formatter={(value: number, name: string) => {
                                    return [<span style={{ color: '#fff' }}>{formatCurrency(value)}</span>, <span style={{ color: '#9ca3af' }}>{name}</span>];
                                }}
                                wrapperStyle={{ zIndex: 1000 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Total */}
                    {activeIndex === -1 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-lg font-bold text-white">{formatCurrency(total)}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend - Clean and Readable */}
                <div className="w-32 flex flex-col justify-center gap-2 overflow-y-auto">
                    {chartData.map((item, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-2 p-2 rounded-lg transition-all cursor-pointer ${activeIndex === index ? 'bg-white/10' : 'hover:bg-white/5'}`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(-1)}
                        >
                            <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: item.fill }}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate">{item.name}</p>
                                <p className="text-[10px] text-gray-400">{item.percentage.toFixed(1)}%</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PieChartWidget;
