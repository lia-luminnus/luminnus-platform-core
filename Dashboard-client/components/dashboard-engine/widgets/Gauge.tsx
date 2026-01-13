/**
 * Gauge Widget
 * 
 * Medidor circular para metas/progresso
 */

import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { WidgetProps } from '../types';

// ============================================
// Component
// ============================================

function Gauge({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const min = widgetConfig?.min || 0;
    const max = widgetConfig?.max || 100;
    const target = widgetConfig?.target;
    const showTarget = widgetConfig?.showTarget !== false;

    // Calculate values
    const value = data?.value ?? data?.current_value ?? 0;
    const percentage = Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
    const targetPercentage = target ? ((target - min) / (max - min)) * 100 : null;

    // SVG arc calculations
    const size = 120;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * Math.PI; // Semi-circle
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Color based on performance
    const getColor = () => {
        if (targetPercentage !== null) {
            if (percentage >= targetPercentage) return '#10b981'; // green
            if (percentage >= targetPercentage * 0.7) return '#f59e0b'; // amber
            return '#ef4444'; // red
        }
        if (percentage >= 80) return '#10b981';
        if (percentage >= 50) return '#f59e0b';
        return '#ef4444';
    };

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

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col items-center justify-center ${isEditMode ? 'cursor-move' : ''}`}>
            <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>

            {/* Gauge SVG */}
            <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
                <svg width={size} height={size / 2 + 10} className="transform -rotate-0">
                    {/* Background arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${size / 2} 
                A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                        fill="none"
                        stroke="#374151"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Value arc */}
                    <path
                        d={`M ${strokeWidth / 2} ${size / 2} 
                A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
                        fill="none"
                        stroke={getColor()}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />

                    {/* Target marker */}
                    {showTarget && targetPercentage !== null && (
                        <circle
                            cx={strokeWidth / 2 + (radius * 2 * (targetPercentage / 100))}
                            cy={size / 2 - Math.sin(Math.PI * (targetPercentage / 100)) * radius}
                            r={3}
                            fill="#fff"
                            stroke="#374151"
                            strokeWidth={1}
                        />
                    )}
                </svg>

                {/* Center value */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
                    <p className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</p>
                    {showTarget && target !== undefined && (
                        <p className="text-[10px] text-gray-400">Meta: {target}%</p>
                    )}
                </div>
            </div>

            {/* Scale labels */}
            <div className="flex justify-between w-full px-2 mt-1">
                <span className="text-[10px] text-gray-500">{min}</span>
                <span className="text-[10px] text-gray-500">{max}</span>
            </div>
        </div>
    );
}

export default Gauge;
