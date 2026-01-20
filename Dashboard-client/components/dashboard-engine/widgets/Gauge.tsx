/**
 * Gauge Widget
 * 
 * Medidor circular para metas/progresso
 */

import React, { useContext } from 'react';
import { Loader2 } from 'lucide-react';
import { WidgetProps } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';

function Gauge({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { t } = useContext(LanguageContext);
    const { title, config: widgetConfig } = config;
    const min = Number(widgetConfig?.min || 0);
    const max = Number(widgetConfig?.max || 100);
    const target = widgetConfig?.target !== undefined ? Number(widgetConfig.target) : undefined;
    const showTarget = widgetConfig?.showTarget !== false;

    // SVG Dimensions
    const size = 180;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;

    // Values & Math
    const value = Number(data?.value ?? data?.current_value ?? 0);
    const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
    const targetPercentage = target !== undefined ? ((target - min) / (max - min)) * 100 : null;

    // Arc calculations
    const circumference = radius * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    // Color Logic
    const getColor = (p: number) => {
        if (targetPercentage !== null) {
            if (p >= targetPercentage) return { from: '#10b981', to: '#059669', glow: 'rgba(16,185,129,0.3)' }; // Green
            if (p >= targetPercentage * 0.7) return { from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.3)' }; // Amber
            return { from: '#ef4444', to: '#dc2626', glow: 'rgba(239,68,68,0.3)' }; // Red
        }
        if (p >= 80) return { from: '#10b981', to: '#059669', glow: 'rgba(16,185,129,0.3)' };
        if (p >= 50) return { from: '#f59e0b', to: '#d97706', glow: 'rgba(245,158,11,0.3)' };
        return { from: '#ef4444', to: '#dc2626', glow: 'rgba(239,68,68,0.3)' };
    };

    const colors = getColor(percentage);

    // Target Marker position (Polar to Cartesian)
    const getTargetPos = (p: number) => {
        const angle = Math.PI - (p / 100) * Math.PI;
        return {
            x: center + Math.cos(angle) * (radius),
            y: center - Math.sin(angle) * (radius)
        };
    };

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
        <div className={`h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col items-center justify-center relative overflow-hidden group shadow-xl ${isEditMode ? 'cursor-move' : ''}`}>
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-20 blur-3xl rounded-full pointer-events-none" style={{ backgroundColor: colors.from }} />

            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-8 uppercase tracking-widest relative z-10">{title}</h3>

            {/* Gauge SVG */}
            <div className="relative z-10" style={{ width: size, height: size / 2 + 10 }}>
                <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`} fill="none" className="overflow-visible">
                    <defs>
                        <linearGradient id={`gaugeGradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={colors.from} />
                            <stop offset="100%" stopColor={colors.to} />
                        </linearGradient>
                        <filter id={`glow-${id}`}>
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Track Background */}
                    <path
                        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
                        stroke="currentColor"
                        className="text-gray-300 dark:text-white/10"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Progress Arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${center}`}
                        stroke={`url(#gaugeGradient-${id})`}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        filter={`url(#glow-${id})`}
                        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />

                    {/* Target Marker */}
                    {showTarget && targetPercentage !== null && (
                        (() => {
                            const pos = getTargetPos(targetPercentage);
                            return (
                                <g transform={`translate(${pos.x}, ${pos.y})`}>
                                    <circle r="4" fill="#fff" className="shadow-lg" />
                                    <circle r="2" fill={colors.to} />
                                </g>
                            );
                        })()
                    )}
                </svg>

                {/* Legend Values */}
                <div className="absolute top-1/2 left-0 w-full flex justify-between px-1 translate-y-4 pointer-events-none">
                    <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 tracking-tighter">{min}</span>
                    <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 tracking-tighter">{max}</span>
                </div>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
                    <div className="animate-in fade-in zoom-in duration-1000">
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-1">
                            {percentage.toFixed(0)}%
                        </p>
                        {showTarget && targetPercentage !== null && (
                            <div className="flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                                <span className={`w-2 h-2 rounded-full ${percentage >= targetPercentage ? 'bg-green-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`} />
                                <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest leading-none">
                                    Meta: {target}%
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Gauge;
