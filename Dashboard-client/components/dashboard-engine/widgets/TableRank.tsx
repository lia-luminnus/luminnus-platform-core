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
        return data.slice(0, limit) as MetricBreakdownItem[];
    }, [data, limit]);

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
    if (!items || items.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">leaderboard</span>
                        <p className="text-sm text-gray-500">Sem dados para ranking</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>

            <div className="flex-1 overflow-y-auto space-y-2">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        {/* Rank Badge */}
                        {showRank && (
                            <div className={`w-6 h-6 rounded-full ${RANK_COLORS[Math.min(index, 3)]} flex items-center justify-center`}>
                                <span className="text-xs font-bold text-white">{index + 1}</span>
                            </div>
                        )}

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.dimension_value}</p>
                        </div>

                        {/* Value */}
                        <div className="text-right">
                            <p className="text-sm font-semibold text-white">{formatCurrency(item.value || 0)}</p>
                            <p className="text-[10px] text-gray-400">{(item.percentage || 0).toFixed(1)}%</p>
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
