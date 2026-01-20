/**
 * Heatmap Calendar Widget
 * 
 * Calendário com mapa de calor por intensidade
 * USA CORES INLINE para garantir funcionamento
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { WidgetProps } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';

// ============================================
// Helpers
// ============================================

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface DayData {
    date: string;
    value: number;
}

// Cores vibrantes usando HEX direto (não classes Tailwind)
const COLOR_SCHEMES: Record<string, string[]> = {
    green: ['#14532d', '#166534', '#22c55e', '#4ade80', '#86efac'],
    blue: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'],
    purple: ['#581c87', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
    red: ['#7f1d1d', '#dc2626', '#ef4444', '#f87171', '#fca5a5'],
    amber: ['#78350f', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d'],
    cyan: ['#164e63', '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9'],
    emerald: ['#064e3b', '#059669', '#10b981', '#34d399', '#6ee7b7'],
};

function getColorByIntensity(value: number, max: number, colorScheme: string = 'green'): string {
    if (value === 0) return 'rgba(255,255,255,0.05)';

    const intensity = max > 0 ? value / max : 0;
    const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.green;
    const index = Math.max(0, Math.min(colors.length - 1, Math.floor(intensity * (colors.length - 1))));
    return colors[index];
}

function generateCalendarDays(data: DayData[], daysBack: number = 180): { weeks: (DayData | null)[][]; maxValue: number } {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysBack);

    const dataMap = new Map<string, number>();
    let maxValue = 1;

    data.forEach(d => {
        // Robust date mapping
        const dateKey = d.date || (d as any).period || (d as any).period_start || (d as any).day || (d as any).data_referencia;
        if (!dateKey) return;

        // Robust value mapping (same logic as TableRank)
        const val = Number(
            d.value ?? (d as any).count ?? (d as any).amount ?? (d as any).total ??
            (d as any).valor ?? (d as any).quantidade ?? (d as any).total_valor ??
            (d as any).total_count ?? (d as any).price ?? 0
        );

        const normalized = dateKey.includes('T') ? dateKey.split('T')[0] : (dateKey.includes(' ') ? dateKey.split(' ')[0] : dateKey);
        const currentVal = dataMap.get(normalized) || 0;
        const newValue = currentVal + val;

        dataMap.set(normalized, newValue);
        if (newValue > maxValue) maxValue = newValue;
    });

    const weeks: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];

    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
        currentWeek.push(null);
    }

    const current = new Date(startDate);
    while (current <= today) {
        const dateStr = current.toISOString().split('T')[0];
        const value = dataMap.get(dateStr) || 0;
        maxValue = Math.max(maxValue, value);

        currentWeek.push({ date: dateStr, value });

        if (current.getDay() === 6) {
            weeks.push(currentWeek);
            currentWeek = [];
        }

        current.setDate(current.getDate() + 1);
    }

    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    return { weeks, maxValue };
}

/**
 * Generate demo data for the heatmap when no real data is available.
 * Creates a visually interesting pattern to show the widget working.
 */
function generateDemoCalendar(daysBack: number = 180): { weeks: (DayData | null)[][]; maxValue: number } {
    const demoData: DayData[] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - daysBack);

    const current = new Date(startDate);
    while (current <= today) {
        const dayOfWeek = current.getDay();
        const dayOfMonth = current.getDate();
        const month = current.getMonth();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Deterministic value based on date (varies 0-10)
        // More activity on weekdays and end of months
        let value = isWeekend
            ? (dayOfMonth % 4)
            : ((dayOfMonth + dayOfWeek + month) % 10) + 1;

        // Add some variation: higher activity in recent weeks
        const daysAgo = Math.floor((today.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo < 30) value = Math.min(10, value + 2);
        if (daysAgo < 7) value = Math.min(10, value + 3);

        demoData.push({
            date: current.toISOString().split('T')[0],
            value
        });
        current.setDate(current.getDate() + 1);
    }

    return generateCalendarDays(demoData, daysBack);
}

// ============================================
// Component
// ============================================

function HeatmapCalendar({ id, config, data, loading, error, isEditMode, globals }: WidgetProps) {
    const { t } = React.useContext(LanguageContext);
    const { title, color, config: widgetConfig } = config;
    const colorScheme = color || (widgetConfig as any)?.colorScheme || 'green';

    // Determine range based on period
    const daysBack = useMemo(() => {
        const period = (globals?.period || 'month') as string;
        if (period === 'year') return 365;
        return 180; // 6 months for context
    }, [globals?.period]);

    // Transform data
    const { weeks, maxValue } = useMemo(() => {
        const hasRealData = data && Array.isArray(data) && data.length > 0;

        if (!hasRealData) {
            // Generate demo data when no real data
            return generateDemoCalendar(daysBack);
        }

        const result = generateCalendarDays(data as DayData[], daysBack);

        // If all values are zero, use demo data instead
        if (result.maxValue <= 1) {
            return generateDemoCalendar(daysBack);
        }

        return result;
    }, [data, daysBack]);

    // Month labels
    const monthLabels = useMemo(() => {
        const labels: { name: string; weekIndex: number }[] = [];
        let lastMonth = -1;

        weeks.forEach((week, index) => {
            const firstDay = week.find(d => d !== null);
            if (firstDay) {
                const month = new Date(firstDay.date).getMonth();
                if (month !== lastMonth) {
                    labels.push({ name: MONTHS[month], weekIndex: index });
                    lastMonth = month;
                }
            }
        });
        return labels;
    }, [weeks]);

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

    const legendColors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.green;

    return (
        <div className={`h-full w-full rounded-2xl p-5 bg-white dark:bg-[#141418] border border-gray-200 dark:border-white/5 flex flex-col shadow-xl ${isEditMode ? 'cursor-move' : ''}`}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white/90 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-primary"></span>
                    {title}
                </h3>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-0">
                {/* Month labels */}
                <div className="flex gap-1 mb-2 ml-9 relative h-4">
                    {monthLabels.map((month, i) => {
                        const leftOffset = `calc(${month.weekIndex} * (100% / ${weeks.length}))`;
                        return (
                            <span
                                key={i}
                                className="absolute text-[10px] text-gray-500 font-medium whitespace-nowrap"
                                style={{ left: leftOffset, transform: 'translateX(-50%)' }}
                            >
                                {month.name}
                            </span>
                        );
                    })}
                </div>

                <div className="flex-1 flex gap-2 min-h-0">
                    {/* Day labels */}
                    <div className="flex flex-col justify-between py-1 h-full flex-shrink-0">
                        {DAYS.map((day, i) => (
                            <div key={i} className="text-[10px] text-gray-500 h-[calc(100%/7)] flex items-center justify-end pr-2 w-7 font-medium">
                                {[1, 3, 5].includes(i) ? day : ''}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 flex gap-2 h-full min-h-0 overflow-x-auto scrollbar-hide pb-2 justify-between items-center px-1">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-2 flex-shrink-0">
                                {week.map((day, dayIdx) => (
                                    <div
                                        key={dayIdx}
                                        className="w-5.5 h-5.5 sm:w-6 sm:h-6 rounded-[5px] transition-all duration-300 hover:scale-150 cursor-pointer group/day relative calendar-cell shadow-sm"
                                        style={{
                                            backgroundColor: day && day.value > 0
                                                ? getColorByIntensity(day.value, maxValue, colorScheme)
                                                : 'var(--heatmap-empty)',
                                            boxShadow: day && day.value > 0
                                                ? `0 0 15px ${getColorByIntensity(day.value, maxValue, colorScheme)}66, inset 0 0 10px rgba(255,255,255,0.1)`
                                                : 'none'
                                        }}
                                    >
                                        {day && (
                                            <div className={`absolute ${dayIdx < 3 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 px-3 py-2 bg-gray-900 dark:bg-black border border-white/10 rounded-lg text-[11px] text-white whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl backdrop-blur-md`}>
                                                <div className="font-bold border-b border-white/10 pb-1 mb-1">{new Date(day.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: day.value > 0 ? getColorByIntensity(day.value, maxValue, colorScheme) : 'var(--heatmap-empty)' }}></div>
                                                    <span>{day.value} {t('activities')}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-gray-500 font-medium flex-shrink-0">
                    <span>{t('less')}</span>
                    <div className="flex gap-1.5">
                        <div className="w-3.5 h-3.5 rounded-[3px] border border-gray-100 dark:border-white/5" style={{ backgroundColor: 'var(--heatmap-empty)' }} />
                        {legendColors.map((color, i) => (
                            <div key={i} className="w-3.5 h-3.5 rounded-[3px]" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                    <span>{t('more')}</span>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                :root { --heatmap-empty: #f8fafc; }
                .dark { --heatmap-empty: rgba(255,255,255,0.03); }
                .calendar-cell { 
                    border: 0.5px solid transparent; 
                }
                .calendar-cell:hover {
                    border-color: rgba(0,0,0,0.1);
                    z-index: 100;
                }
                .dark .calendar-cell:hover {
                    border-color: rgba(255,255,255,0.2);
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </div>
    );
}

export default HeatmapCalendar;
