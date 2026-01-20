/**
 * Table Rank Widget
 * 
 * Tabela de ranking - Top N itens ordenados por métrica
 */

import React, { useMemo } from 'react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { WidgetProps, MetricBreakdownItem } from '../types';

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

const RANK_COLORS = [
    'bg-yellow-500', // 1st
    'bg-gray-400',   // 2nd
    'bg-amber-600',  // 3rd
    'bg-gray-600',   // others
];

// ============================================
// Component
// ============================================

function TableRank({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const limit = widgetConfig?.limit || 5;
    const showRank = widgetConfig?.showRank !== false;
    const showChange = widgetConfig?.showChange;

    // Transform data
    const items = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];

        const normalized = (data as any[]).map(item => {
            let name = '---';
            let val = 0;

            if (Array.isArray(item)) {
                // Support [name, value] or [value, name]
                if (typeof item[0] === 'string') {
                    name = item[0];
                    val = Number(item[1] || 0);
                } else {
                    val = Number(item[0] || 0);
                    name = item[1]?.toString() || '---';
                }
            } else if (typeof item === 'object' && item !== null) {
                // Support nested .data (common in recent records)
                const source = item.data || item;

                // Support multiple object keys (EN & PT)
                name = source.name || source.dimension_value || source.label || source.category ||
                    source.title || source.nome || source.descricao || source.text || source.description || '---';

                val = Number(
                    source.value ?? source.amount ?? source.count ?? source.total ??
                    source.valor ?? source.quantidade ?? source.price ?? source.total_valor ?? 0
                );
            }

            return {
                ...item,
                dimension_value: name,
                value: val
            };
        });

        const total = normalized.reduce((acc, curr) => acc + curr.value, 0);

        // Sort by value descending and slice
        return normalized
            .sort((a, b) => b.value - a.value)
            .slice(0, limit)
            .map(item => ({
                ...item,
                percentage: item.percentage ?? (total > 0 ? (item.value / total) * 100 : 0)
            })) as MetricBreakdownItem[];
    }, [data, limit]);

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
    if (!items || items.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 mb-2">leaderboard</span>
                        <p className="text-sm text-gray-500">Sem dados para ranking</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>

            <div className="flex-1 overflow-y-auto space-y-2">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 hover:bg-gray-200/50 dark:hover:bg-white/10 transition-all duration-200 group/row"
                    >
                        {/* Rank Badge */}
                        {showRank && (
                            <div className={`w-7 h-7 rounded-full ${RANK_COLORS[Math.min(index, 3)]} flex items-center justify-center shadow-lg transform group-hover/row:scale-110 transition-transform`}>
                                <span className="text-xs font-black text-white">{index + 1}</span>
                            </div>
                        )}

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white truncate">{item.dimension_value}</p>
                        </div>

                        {/* Value */}
                        <div className="text-right">
                            <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(item.value || 0)}</p>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{(item.percentage || 0).toFixed(1)}%</p>
                        </div>

                        {/* Change indicator */}
                        {showChange && (
                            <div className="w-4">
                                {Math.random() > 0.5 ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default TableRank;
