/**
 * Funnel Widget
 * 
 * Visualização de funil de vendas/CRM
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { WidgetProps } from '../types';

// ============================================
// Types
// ============================================

interface FunnelStage {
    stage: string;
    stage_order: number;
    count: number;
    total_value: number;
    avg_probability: number;
}

// ============================================
// Helpers
// ============================================

const STAGE_LABELS: Record<string, string> = {
    visitantes: 'Visitantes',
    leads: 'Leads',
    mqls: 'MQLs',
    sqls: 'SQLs',
    oportunidades: 'Oportunidades',
    vendas: 'Vendas',
    lead: 'Leads',
    contacted: 'Contactados',
    proposal: 'Proposta',
    negotiation: 'Negociação',
    won: 'Ganhos',
    lost: 'Perdidos',
};

const STAGE_COLORS: Record<string, string> = {
    visitantes: 'from-blue-400 to-blue-600',
    leads: 'from-cyan-400 to-cyan-600',
    mqls: 'from-indigo-400 to-indigo-600',
    sqls: 'from-purple-400 to-purple-600',
    oportunidades: 'from-amber-400 to-amber-600',
    vendas: 'from-green-400 to-green-600',
    lead: 'from-blue-500 to-blue-600',
    contacted: 'from-cyan-500 to-cyan-600',
    proposal: 'from-purple-500 to-purple-600',
    negotiation: 'from-amber-500 to-amber-600',
    won: 'from-green-500 to-green-600',
    lost: 'from-red-500 to-red-600',
};

function formatCurrency(value: number): string {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return `R$ ${value.toFixed(0)}`;
}

// ============================================
// Component
// ============================================

function Funnel({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const showPercentages = widgetConfig?.showPercentages !== false;
    const showValues = widgetConfig?.showValues !== false;

    // Transform data
    const stages = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        // Filter out lost from main funnel, support 'value' as 'count'
        return (data as any[])
            .map(s => ({
                ...s,
                count: Number(s.count ?? s.value ?? 0),
                total_value: Number(s.total_value ?? 0)
            }))
            .filter(s => s.stage !== 'lost')
            .sort((a, b) => a.stage_order - b.stage_order);
    }, [data]);

    const lostStage = useMemo(() => {
        if (!data || !Array.isArray(data)) return null;
        return (data as FunnelStage[]).find(s => s.stage === 'lost');
    }, [data]);

    // Calculate max count for width scaling
    const maxCount = useMemo(() => {
        return Math.max(...stages.map(s => s.count), 1);
    }, [stages]);

    // Calculate conversion rates
    const conversions = useMemo(() => {
        return stages.map((stage, idx) => {
            if (idx === 0) return 100;
            const prevCount = stages[idx - 1].count;
            if (!prevCount || prevCount === 0) return 0;
            const rate = (stage.count / prevCount) * 100;
            return isNaN(rate) ? 0 : rate;
        });
    }, [stages]);

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
    if (!stages || stages.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-600 mb-2">filter_alt</span>
                        <p className="text-sm text-gray-500">Sem dados de funil</p>
                        <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">Cadastre negócios para visualizar</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col relative overflow-hidden group shadow-xl ${isEditMode ? 'cursor-move' : ''}`}>
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/5 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary text-xl">filter_alt</span>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight uppercase opacity-80">{title}</h3>
                </div>
                <div className="text-[10px] text-gray-500 font-mono bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/5">
                    Live
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-between relative z-10 py-2">
                {stages.map((stage, idx) => {
                    const stageKey = stage.stage.toLowerCase().trim();
                    // Much more aggressive funnel shape
                    const widthPercent = 100 - (idx * 15);
                    const nextWidth = 100 - ((idx + 1) * 15);

                    const label = STAGE_LABELS[stageKey] || stage.stage;
                    const gradient = STAGE_COLORS[stageKey] || 'from-gray-400 to-gray-600';
                    const taper = 7.5; // Fixed taper for consistent trapezoid shape

                    return (
                        <div key={stage.stage} className="relative mb-1 flex flex-col items-center">
                            {/* Bar Container with Funnel Effect */}
                            <div className="w-full relative group/item">
                                <div
                                    className={`h-11 bg-gradient-to-br ${gradient} flex items-center justify-center gap-3 transition-all duration-700 ease-out shadow-lg hover:brightness-110 relative overflow-hidden border border-white/20`}
                                    style={{
                                        width: `${widthPercent}%`,
                                        margin: '0 auto',
                                        clipPath: `polygon(0% 0%, 100% 0%, ${100 - taper}% 100%, ${taper}% 100%)`
                                    }}
                                >
                                    {/* Glass reflection */}
                                    <div className="absolute inset-x-0 h-1/2 top-0 bg-white/10 pointer-events-none" />

                                    <span className="text-white text-[11px] font-black uppercase tracking-wider shadow-sm z-10">
                                        {label}
                                    </span>
                                    <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/20 z-10 flex items-center justify-center min-w-[32px]">
                                        <span className="text-white text-xs font-black">
                                            {stage.count || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Conversion Arrow/Badge */}
                            {showPercentages && idx < stages.length - 1 && (
                                <div className="z-20 -my-2 flex items-center justify-center">
                                    <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 scale-90">
                                        <span className="material-symbols-outlined text-[10px] text-green-500 dark:text-green-400 font-black">south</span>
                                        <span className="text-[10px] font-black text-gray-900 dark:text-white/90">
                                            {conversions[idx + 1].toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Value tooltip-like indicator */}
                            {showValues && stage.total_value > 0 && (
                                <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -mt-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-30 pointer-events-none">
                                    <div className="bg-brand-primary/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-black shadow-xl">
                                        {formatCurrency(stage.total_value)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Lost deals footer */}
            {lostStage && lostStage.count > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between relative z-10 transition-opacity hover:opacity-100 opacity-60">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Perdidos</span>
                    </div>
                    <span className="text-[11px] font-black text-red-500 dark:text-red-400">
                        {lostStage.count} deals • {formatCurrency(Number(lostStage.total_value ?? 0))}
                    </span>
                </div>
            )}
        </div>
    );

}

export default Funnel;
