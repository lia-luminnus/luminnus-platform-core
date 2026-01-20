/**
 * Donut Breakdown Widget
 * 
 * Gráfico donut com breakdown por dimensão
 */

import React, { useMemo, useState, useContext } from 'react';
import { Loader2 } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { WidgetProps, MetricBreakdownItem } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';

// ============================================
// Helpers
// ============================================

const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

function formatCurrency(value: number): string {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value.toFixed(0)}`;
}

// ============================================
// Custom Label
// ============================================

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't render labels for slices < 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={600}
        >
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

// ============================================
// Component
// ============================================

function DonutBreakdown({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const showLegend = widgetConfig?.showLegend !== false;
    const showPercentage = widgetConfig?.showPercentage !== false;
    const innerRadius = widgetConfig?.innerRadius || '60%';

    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const { t } = useContext(LanguageContext);

    // Transform data for recharts - Group duplicates, then group small slices for clarity
    const chartData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        // First pass: normalize names and group duplicates
        const grouped: Record<string, { name: string; value: number }> = {};
        data.forEach((item: any, index: number) => {
            const rawName = item.name || item.dimension_value || `categoria ${index + 1}`;
            const name = t(`cat_${rawName.toLowerCase()}`);
            const val = Number(item.value) || 0;
            if (grouped[name]) {
                grouped[name].value += val;
            } else {
                grouped[name] = { name, value: val };
            }
        });

        // Convert to array and sort by value descending
        const sortedData = Object.values(grouped).sort((a, b) => b.value - a.value);

        // Calculate raw total for manual percentage calculation
        const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);

        // Take top 8 and group the rest
        const topN = 8;
        if (sortedData.length <= topN) {
            return sortedData.map((item, index) => ({
                name: item.name,
                value: item.value,
                percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
                fill: COLORS[index % COLORS.length],
            }));
        }

        const mainSlices = sortedData.slice(0, topN);
        const otherSlices = sortedData.slice(topN);
        const othersValue = otherSlices.reduce((sum, item) => sum + item.value, 0);

        const processed = mainSlices.map((item, index) => ({
            name: item.name,
            value: item.value,
            percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
            fill: COLORS[index % COLORS.length],
        }));

        processed.push({
            name: t('cat_outros'),
            value: othersValue,
            percentage: totalValue > 0 ? (othersValue / totalValue) * 100 : 0,
            fill: '#94a3b8',
        });

        return processed;
    }, [data]);

    // Calculate total from processed data
    const total = useMemo(() => {
        return chartData.reduce((sum, item) => sum + item.value, 0);
    }, [chartData]);

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
                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 mb-2">donut_large</span>
                        <p className="text-sm text-gray-500">{t('noDataForPeriod')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col relative overflow-hidden group shadow-xl ${isEditMode ? 'cursor-move' : ''}`}>
            {/* Background Glow */}
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-primary/10 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary text-lg">donut_large</span>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight uppercase opacity-80">{title}</h3>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col sm:flex-row items-center relative z-10 gap-4">
                <div className="flex-1 h-full min-h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {chartData.map((entry, index) => (
                                    <linearGradient key={`grad-${index}`} id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                                        <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                                    </linearGradient>
                                ))}
                                <filter id="shadow" height="200%">
                                    <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                                    <feOffset dx="0" dy="4" result="offsetblur" />
                                    <feComponentTransfer>
                                        <feFuncA type="linear" slope="0.5" />
                                    </feComponentTransfer>
                                    <feMerge>
                                        <feMergeNode />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={innerRadius}
                                outerRadius="90%"
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                onMouseEnter={(_, index) => setActiveIndex(index)}
                                onMouseLeave={() => setActiveIndex(null)}
                                animationBegin={0}
                                animationDuration={1000}
                                animationEasing="ease-out"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={`url(#grad-${index})`}
                                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                                        style={{
                                            transition: 'all 0.3s ease',
                                            filter: activeIndex === index ? 'url(#shadow)' : 'none'
                                        }}
                                        className="outline-none focus:outline-none"
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                wrapperStyle={{ zIndex: 1000 }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const item = payload[0].payload;
                                        return (
                                            <div className="bg-[#111827]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl z-[110] relative no-drag">
                                                <p className="text-xs font-bold text-gray-400 mb-1">{item.name}</p>
                                                <p className="text-sm font-black text-white">{formatCurrency(item.value)}</p>
                                                <p className="text-[10px] text-brand-primary mt-1 font-mono">{item.percentage.toFixed(1)}% {t('fromTotal') || 'do total'}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Label - Enhanced */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center bg-gray-50/80 dark:bg-[#0a0f1a]/40 backdrop-blur-sm w-20 h-20 rounded-full flex flex-col items-center justify-center border border-gray-200 dark:border-white/5 shadow-inner">
                            <p className="text-sm font-black text-gray-900 dark:text-white leading-none mb-0.5">{formatCurrency(total)}</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">{t('total')}</p>
                        </div>
                    </div>
                </div>

                {/* Legend - Premium Styling */}
                {showLegend && (
                    <div className="flex-1 sm:w-1/2 pl-0 sm:pl-6 overflow-y-auto max-h-full scrollbar-hide">
                        <div className="space-y-1.5">
                            {chartData.map((item, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center gap-3 p-1.5 rounded-xl border border-transparent transition-all duration-300 ${activeIndex === index
                                        ? 'bg-white/5 border-white/10 shadow-lg translate-x-1'
                                        : activeIndex !== null ? 'opacity-30' : 'opacity-100'
                                        }`}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(null)}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full ring-2 ring-white/5"
                                        style={{ backgroundColor: item.fill, boxShadow: `0 0 10px ${item.fill}44` }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-300 truncate tracking-tight">{item.name}</p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[9px] text-gray-500 font-mono">{formatCurrency(item.value ?? 0)}</span>
                                            <span className="text-[9px] text-brand-primary font-black ml-2">{(item.percentage ?? 0).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DonutBreakdown;
