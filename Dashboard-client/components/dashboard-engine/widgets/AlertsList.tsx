/**
 * Alerts List Widget
 * 
 * Lista de alertas, insights e notificações
 */

import React, { useMemo, useContext } from 'react';
import { Loader2, AlertTriangle, Info, CheckCircle, XCircle, Bell } from 'lucide-react';
import { WidgetProps } from '../types';
import { LanguageContext } from '../../../contexts/LanguageContext';

// ============================================
// Types
// ============================================

interface Alert {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message?: string;
    timestamp?: string;
    metadata?: {
        source?: 'agendamentos' | 'anomaly' | 'insight';
        [key: string]: any;
    };
    action?: {
        label: string;
        route: string;
    };
}

// ============================================
// Helpers
// ============================================

const ALERT_ICONS = {
    info: Bell,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
    insight: Bell, // Robot will be added dynamically
    agendamentos: Bell, // Calendar will be added dynamically
};

import { Bot, Calendar, Zap } from 'lucide-react';

function getAlertIcon(alert: Alert) {
    const source = alert.metadata?.source;
    if (source === 'anomaly') return Zap;
    if (source === 'insight') return Bot;
    if (source === 'agendamentos') return Calendar;

    return ALERT_ICONS[alert.type] || Info;
}

const ALERT_COLORS = {
    info: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    success: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

import { useNavigate } from 'react-router-dom';

function formatTimeAgo(timestamp: string, t: (key: string) => string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}${t('minutesShort')} ${t('ago')}`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${t('hoursShort')} ${t('ago')}`;

    const days = Math.floor(hours / 24);
    return `${days}${t('daysShort')} ${t('ago')}`;
}

// ============================================
// Component
// ============================================

function AlertsList({ id, config, data, loading, error, isEditMode }: WidgetProps) {
    const { t } = useContext(LanguageContext);
    const { title, config: widgetConfig } = config;
    const maxItems = widgetConfig?.maxItems || 5;
    const showTimestamp = widgetConfig?.showTimestamp !== false;
    const navigate = useNavigate();

    // Transform data
    const alerts = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return (data as Alert[]).slice(0, maxItems);
    }, [data, maxItems]);

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
    if (!alerts || alerts.length === 0) {
        return (
            <div className="h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-2 overflow-hidden opacity-50">
                            <img src="/images/lia-bust.png" alt="LIA" className="w-full h-full object-cover scale-[1.3] grayscale transform translate-y-1" />
                        </div>
                        <p className="text-sm text-gray-500">{t('noAlerts')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-600 mt-1">{t('everythingOk')}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full w-full rounded-2xl p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex flex-col ${isEditMode ? 'cursor-move' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                {alerts.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {alerts.length}
                    </span>
                )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
                {alerts.map((item: any, idx) => {
                    const id = item.id || item.alert_id || `alert-${idx}`;
                    const type = item.type || item.alert_type || 'info';
                    const title = item.title || item.alert_title || 'Sem título';
                    const message = item.message || item.alert_message || '';
                    const timestamp = item.timestamp || item.alert_timestamp;
                    const metadata = item.metadata || item.alert_metadata || {};

                    const isLiaAlert = metadata.source === 'insight' || metadata.source === 'anomaly';
                    const colors = ALERT_COLORS[type as keyof typeof ALERT_COLORS] || ALERT_COLORS.info;

                    return (
                        <div
                            key={id}
                            onClick={() => navigate('/lia')}
                            className={`p-3 rounded-xl border ${colors.bg} ${colors.border} flex gap-3 transition-all hover:scale-[1.01] relative group/alert cursor-pointer shadow-sm hover:shadow-md`}
                        >
                            <div className={`mt-0.5 shrink-0 ${colors.text}`}>
                                {isLiaAlert ? (
                                    <div className="w-5 h-5 rounded-full overflow-hidden border border-current/20 bg-current/10">
                                        <img src="/images/lia-bust.png" alt="LIA" className="w-full h-full object-cover scale-[1.5] transform translate-y-0.5" />
                                    </div>
                                ) : metadata.source === 'agendamentos' ? (
                                    <Calendar className="w-4 h-4" />
                                ) : (
                                    <Info className="w-4 h-4" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>
                                        {metadata.source === 'insight' ? 'LIA Insight' :
                                            metadata.source === 'anomaly' ? 'Anomalia' :
                                                metadata.source === 'agendamentos' ? 'Prazo' :
                                                    type}
                                    </span>
                                    {showTimestamp && timestamp && (
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {formatTimeAgo(timestamp, t)}
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1">
                                    {title}
                                </h4>
                                {message && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-normal">
                                        {message}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AlertsList;
