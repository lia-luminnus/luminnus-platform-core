/**
 * Widget Registry
 * 
 * Mapeia tipos de widget para componentes React
 * Cada widget é um componente isolado que recebe WidgetProps
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { WidgetType, WidgetProps, WidgetRegistryEntry } from './types';
import { Loader2 } from 'lucide-react';
import { LanguageContext } from '../../contexts/LanguageContext';

// ============================================
// Widget Components (Lazy Loaded)
// ============================================

const KPICard = lazy(() => import('./widgets/KPICard.tsx'));
const LineTimeseries = lazy(() => import('./widgets/LineTimeseries.tsx'));
const BarGrouped = lazy(() => import('./widgets/BarGrouped.tsx'));
const DonutBreakdown = lazy(() => import('./widgets/DonutBreakdown.tsx'));
const TableRank = lazy(() => import('./widgets/TableRank.tsx'));
const TableTransactions = lazy(() => import('./widgets/TableTransactions.tsx'));
const Funnel = lazy(() => import('./widgets/Funnel.tsx'));
const Gauge = lazy(() => import('./widgets/Gauge.tsx'));
const HeatmapCalendar = lazy(() => import('./widgets/HeatmapCalendar.tsx'));
const AlertsList = lazy(() => import('./widgets/AlertsList.tsx'));
const RadarMultidim = lazy(() => import('./widgets/RadarMultidim.tsx'));
const BarHorizontal = lazy(() => import('./widgets/BarHorizontal.tsx'));
const AreaTimeseries = lazy(() => import('./widgets/AreaTimeseries.tsx'));
const PieChartWidget = lazy(() => import('./widgets/PieChartWidget.tsx'));

// ============================================
// Registry Map
// ============================================

const WIDGET_COMPONENTS: Record<WidgetType, ComponentType<WidgetProps>> = {
    kpi_card: KPICard,
    line_timeseries: LineTimeseries,
    bar_grouped: BarGrouped,
    donut_breakdown: DonutBreakdown,
    table_rank: TableRank,
    table_transactions: TableTransactions,
    funnel: Funnel,
    gauge: Gauge,
    heatmap_calendar: HeatmapCalendar,
    alerts_list: AlertsList,
    radar_multidim: RadarMultidim,
    bar_horizontal: BarHorizontal,
    area_timeseries: AreaTimeseries,
    pie_chart: PieChartWidget, // Use dedicated Pie Chart component
};

import { WIDGET_METADATA, WIDGET_METRIC_DEFAULTS } from './widgetTypes';
export { WIDGET_METADATA, WIDGET_METRIC_DEFAULTS };

// ============================================
// Widget Loader Component
// ============================================

function WidgetLoader() {
    return (
        <div className="flex items-center justify-center h-full w-full bg-white/5 rounded-xl animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
    );
}

// ============================================
// Main Registry Functions
// ============================================

/**
 * Retorna o componente React para um tipo de widget
 */
export function getWidgetComponent(type: WidgetType): ComponentType<WidgetProps> | null {
    return WIDGET_COMPONENTS[type] || null;
}

/**
 * Renderiza um widget com Suspense wrapper
 */
export function renderWidget(type: WidgetType, props: WidgetProps) {
    const { t } = React.useContext(LanguageContext);
    const Component = getWidgetComponent(type);


    if (!Component) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-red-500/10 rounded-xl border border-red-500/30">
                <span className="text-red-400 text-sm">{t('error')}: {type}</span>
            </div>
        );
    }


    return (
        <Suspense fallback={<WidgetLoader />}>
            <Component {...props} />
        </Suspense>
    );
}

/**
 * Retorna lista de widgets disponíveis por categoria
 */
export function getWidgetsByCategory(category?: 'kpi' | 'chart' | 'table' | 'special') {
    const entries = Object.entries(WIDGET_METADATA) as [WidgetType, typeof WIDGET_METADATA[WidgetType]][];

    if (!category) {
        return entries
            .map(([key, meta]) => ({
                widget_key: key,
                ...meta,
            }));
    }

    return entries
        .filter(([key, meta]) => meta.category === category)
        .map(([key, meta]) => ({
            widget_key: key,
            ...meta,
        }));
}

/**
 * Verifica se um widget está disponível para um plano
 */
export function isWidgetAvailableForPlan(type: WidgetType, plan: 'start' | 'plus' | 'pro'): boolean {
    const meta = WIDGET_METADATA[type];
    if (!meta) return false;

    const planLevels: Record<string, number> = { start: 1, plus: 2, pro: 3 };
    return planLevels[plan] >= planLevels[meta.plan_min];
}

/**
 * Retorna métricas suportadas por um widget
 */
export function getSupportedMetrics(type: WidgetType): string[] {
    return WIDGET_METADATA[type]?.supported_metrics || [];
}

// Omit default export for Fast Refresh compatibility
/*
export default {
    getWidgetComponent,
    renderWidget,
    getWidgetsByCategory,
    isWidgetAvailableForPlan,
    getSupportedMetrics,
    WIDGET_METADATA,
};
*/
