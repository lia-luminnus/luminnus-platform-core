import React, { useMemo, useContext } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { WidgetProps } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';

// ============================================
// Helpers
// ============================================

const COLOR_CLASSES: Record<string, { bg: string; text: string; glow: string }> = {
    green: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', glow: 'shadow-green-500/20' },
    red: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', glow: 'shadow-red-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', glow: 'shadow-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', glow: 'shadow-purple-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', glow: 'shadow-amber-500/20' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', glow: 'shadow-cyan-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', glow: 'shadow-emerald-500/20' },
};

function formatValue(value: number | undefined, formatType: string = 'currency', language: string = 'pt'): string {
    if (value === undefined || value === null) return '--';

    const locale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';
    const currency = language === 'en' ? 'USD' : language === 'es' ? 'EUR' : 'BRL';

    switch (formatType) {
        case 'currency':
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(value);
        case 'number':
            return new Intl.NumberFormat(locale).format(value);
        case 'percent':
            return `${value.toFixed(1)}%`;
        default:
            return String(value);
    }
}

function getTrendIcon(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
        case 'up':
            return <TrendingUp className="w-4 h-4" />;
        case 'down':
            return <TrendingDown className="w-4 h-4" />;
        default:
            return <Minus className="w-4 h-4" />;
    }
}

// ============================================
// Component
// ============================================

function KPICard({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { t, language } = useContext(LanguageContext);
    const { title, icon, color = 'blue', config: widgetConfig } = config;
    const showTrend = widgetConfig?.showTrend !== false;
    const showPrevious = widgetConfig?.showPrevious !== false;
    const formatType = widgetConfig?.formatType || 'currency';

    const colors = COLOR_CLASSES[color] || COLOR_CLASSES.blue;

    // Extract data
    const currentValue = data?.current_value;
    const previousValue = data?.previous_value;
    const changePercent = data?.change_percent;
    const trend = data?.trend || 'stable';

    // Determine if change is positive (for styling)
    const isPositiveChange = useMemo(() => {
        // For expenses, down is good
        if (config.metric === 'cash_out' || config.metric === 'expenses_by_category') {
            return trend === 'down';
        }
        return trend === 'up';
    }, [config.metric, trend]);

    if (loading) {
        return (
            <div className={`h-full w-full rounded-2xl p-4 ${colors.bg} border border-gray-200 dark:border-white/10 flex items-center justify-center`}>
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
        <div
            className={`h-full w-full rounded-3xl p-6 glass-panel flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover-lift ${colors.glow} ${isEditMode ? 'cursor-move border-dashed border-brand-primary/40' : ''}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 font-black uppercase tracking-[0.2em] mb-1">
                        {t(`metric_${config.metric}` as any) || title}
                    </p>
                </div>
                {icon && (
                    <div className={`p-2 rounded-xl bg-white dark:bg-white/10 ${colors.text} shadow-sm transition-transform group-hover:rotate-12`}>
                        <span className={`material-symbols-outlined text-lg`}>{icon}</span>
                    </div>
                )}
            </div>

            {/* Value */}
            <div className="flex-1 flex flex-col justify-center my-2">
                <p className={`text-2xl sm:text-3xl lg:text-4xl font-black ${colors.text} tracking-tighter transition-all duration-500`}>
                    {formatValue(currentValue, formatType, language)}
                </p>
            </div>

            {/* Trend & Previous */}
            {showTrend && (
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-white/5">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${isPositiveChange
                        ? 'bg-green-500/20 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                        : trend === 'stable'
                            ? 'bg-gray-500/20 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400'
                            : 'bg-red-500/20 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                        {getTrendIcon(trend)}
                        <span>{changePercent !== undefined ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%` : '--'}</span>
                    </div>
                    {showPrevious && previousValue !== undefined && (
                        <span className="text-[10px] text-gray-600 dark:text-gray-500 font-medium">
                            <span className="opacity-50">{t('vs')}</span> {formatValue(previousValue, formatType, language)}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export default KPICard;

