/**
 * Alerts List Widget
 * 
 * Lista de alertas, insights e notificações
 */

import React, { useMemo } from 'react';
import { Loader2, AlertTriangle, Info, CheckCircle, XCircle, Bell } from 'lucide-react';
import { WidgetProps } from '../types';

// ============================================
// Types
// ============================================

interface Alert {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message?: string;
    timestamp?: string;
    action?: {
        label: string;
        route: string;
    };
}

// ============================================
// Helpers
// ============================================

const ALERT_ICONS = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
};

const ALERT_COLORS = {
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    success: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

function formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}min atrás`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;

    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
}

// ============================================
// Component
// ============================================

function AlertsList({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { title, config: widgetConfig } = config;
    const maxItems = widgetConfig?.maxItems || 5;
    const showTimestamp = widgetConfig?.showTimestamp !== false;

    // Transform data
    const alerts = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return (data as Alert[]).slice(0, maxItems);
    }, [data, maxItems]);

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
    if (!alerts || alerts.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Bell className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nenhum alerta</p>
                        <p className="text-xs text-gray-600 mt-1">Tudo em ordem por aqui!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white/5 border border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {alerts.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {alerts.length}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {alerts.map((alert, idx) => {
                    const Icon = ALERT_ICONS[alert.type] || Info;
                    const colors = ALERT_COLORS[alert.type] || ALERT_COLORS.info;

                    return (
                        <div
                            key={alert.id || idx}
                            className={`p-3 rounded-lg ${colors.bg} border ${colors.border} transition-all hover:scale-[1.01]`}
                        >
                            <div className="flex items-start gap-2">
                                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${colors.text}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{alert.title}</p>
                                    {alert.message && (
                                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{alert.message}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        {showTimestamp && alert.timestamp && (
                                            <span className="text-[10px] text-gray-500">{formatTimeAgo(alert.timestamp)}</span>
                                        )}
                                        {alert.action && (
                                            <button className={`text-[10px] font-medium ${colors.text} hover:underline`}>
                                                {alert.action.label} →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AlertsList;
