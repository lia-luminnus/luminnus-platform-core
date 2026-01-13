/**
 * Heatmap Calendar Widget
 * 
 * Calendário com mapa de calor por intensidade
 * USA CORES INLINE para garantir funcionamento
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { WidgetProps } from '../types';

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

function generateCalendarDays(data: DayData[]): { weeks: (DayData | null)[][]; maxValue: number } {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 84);

    const dataMap = new Map<string, number>();
    let maxValue = 1;

    data.forEach(d => {
        if (!d.date) return;
        const normalized = d.date.includes('T') ? d.date.split('T')[0] : d.date;
        const currentVal = dataMap.get(normalized) || 0;
        const newValue = currentVal + d.value;
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

// ============================================
// Component
// ============================================

function HeatmapCalendar({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, color, config: widgetConfig } = config;
    const colorScheme = color || (widgetConfig as any)?.colorScheme || 'green';

    // Transform data - gera dados de exemplo se não houver dados reais
    const { weeks, maxValue } = useMemo(() => {
        // Sempre gerar dados de demonstração por enquanto para debug
        const hasRealData = data && Array.isArray(data) && data.length > 0;

        if (!hasRealData) {
            // Gerar dados de demonstração determinísticos
            const demoData: DayData[] = [];
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - 84);

            const current = new Date(startDate);
            while (current <= today) {
                const dayOfWeek = current.getDay();
                const dayOfMonth = current.getDate();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                // Valor determinístico: varia de 0-10 baseado no dia
                const value = isWeekend ? (dayOfMonth % 4) : ((dayOfMonth + dayOfWeek) % 10) + 1;
                demoData.push({
                    date: current.toISOString().split('T')[0],
                    value
                });
                current.setDate(current.getDate() + 1);
            }

            console.log('[HeatmapCalendar] Demo data sample:', demoData.slice(0, 5));
            return generateCalendarDays(demoData);
        }
        return generateCalendarDays(data as DayData[]);
    }, [data]);

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

    const legendColors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.green;

    return (
        <div className={`h-full w-full rounded-2xl p-5 bg-[#141418] border border-white/5 flex flex-col shadow-xl ${isEditMode ? 'cursor-move' : ''}`}>
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
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
                                className="absolute text-[10px] text-gray-500 font-medium"
                                style={{ left: leftOffset }}
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

                    {/* Calendar grid */}
                    <div className="flex-1 flex gap-1 h-full min-h-0">
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex-1 h-full flex flex-col gap-1 min-w-[8px]">
                                {week.map((day, dayIdx) => (
                                    <div
                                        key={dayIdx}
                                        className="flex-1 w-full min-h-[10px] rounded-[3px] transition-all duration-300 hover:scale-110 cursor-pointer group/day relative"
                                        style={{
                                            backgroundColor: day
                                                ? getColorByIntensity(day.value, maxValue, colorScheme)
                                                : 'rgba(255,255,255,0.03)'
                                        }}
                                    >
                                        {day && (
                                            <div className={`absolute ${dayIdx < 3 ? 'top-full mt-2' : 'bottom-full mb-2'} left-1/2 -translate-x-1/2 px-2 py-1 bg-black/95 border border-white/10 rounded text-[10px] text-white whitespace-nowrap opacity-0 group-hover/day:opacity-100 transition-all pointer-events-none z-[100] shadow-2xl`}>
                                                <div className="font-bold">{new Date(day.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</div>
                                                <div style={{ color: legendColors[4] }}>{day.value} atividades</div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend with actual colors */}
                <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-gray-500 font-medium flex-shrink-0">
                    <span>Menos</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                        {legendColors.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                    <span>Mais</span>
                </div>
            </div>
        </div>
    );
}

export default HeatmapCalendar;
