/**
 * Widget Registry
 * 
 * Mapeia tipos de widget para componentes React
 * Cada widget é um componente isolado que recebe WidgetProps
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { WidgetType, WidgetProps, WidgetRegistryEntry } from './types';
import { Loader2 } from 'lucide-react';

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

// ============================================
// Widget Metadata (from database mirror)
// ============================================

export const WIDGET_METADATA: Record<WidgetType, Omit<WidgetRegistryEntry, 'widget_key'>> = {
    kpi_card: {
        name: 'Cartão KPI',
        description: 'Exibe valor de métrica com delta vs período anterior',
        category: 'kpi',
        icon: 'trending_up',
        default_config: { showTrend: true, showPrevious: true, formatType: 'currency' },
        supported_metrics: ['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'deals_count', 'deals_value', 'invoices_pending', 'contacts_count'],
        plan_min: 'start',
    },
    line_timeseries: {
        name: 'Gráfico de Linha',
        description: 'Série temporal com linha ou área',
        category: 'chart',
        icon: 'show_chart',
        default_config: { chartType: 'line', showArea: false, showPoints: true, smoothCurve: true },
        supported_metrics: ['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'revenue_by_category'],
        plan_min: 'start',
    },
    bar_grouped: {
        name: 'Barras Agrupadas',
        description: 'Gráfico de barras por categoria ou canal',
        category: 'chart',
        icon: 'bar_chart',
        default_config: { orientation: 'vertical', showLabels: true, stacked: false },
        supported_metrics: ['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
        plan_min: 'start',
    },
    donut_breakdown: {
        name: 'Gráfico de Rosca',
        description: 'Gráfico donut com breakdown por dimensão',
        category: 'chart',
        icon: 'donut_large',
        default_config: { showLegend: true, showPercentage: true, innerRadius: 40 },
        supported_metrics: ['expenses_by_category', 'revenue_by_category', 'deals_by_stage', 'contacts_by_type'],
        plan_min: 'start',
    },
    table_rank: {
        name: 'Tabela Ranking',
        description: 'Top N itens ordenados por métrica',
        category: 'table',
        icon: 'leaderboard',
        default_config: { limit: 5, showRank: true, showChange: false },
        supported_metrics: ['top_categories', 'top_customers', 'top_products'],
        plan_min: 'start',
    },
    table_transactions: {
        name: 'Transações Recentes',
        description: 'Lista paginada de transações',
        category: 'table',
        icon: 'receipt_long',
        default_config: { pageSize: 10, showFilters: true, columns: ['date', 'description', 'category', 'amount'] },
        supported_metrics: ['transactions_recent'],
        plan_min: 'start',
    },
    funnel: {
        name: 'Funil de Vendas',
        description: 'Visualização de pipeline/funil CRM',
        category: 'special',
        icon: 'filter_alt',
        default_config: { showPercentages: true, showValues: true, colorScheme: 'gradient' },
        supported_metrics: ['deals_funnel'],
        plan_min: 'plus',
    },
    gauge: {
        name: 'Medidor de Meta',
        description: 'Gauge circular mostrando progresso vs meta',
        category: 'kpi',
        icon: 'speed',
        default_config: { min: 0, max: 100, target: 80, showTarget: true },
        supported_metrics: ['goal_progress', 'conversion_rate', 'satisfaction_score'],
        plan_min: 'start',
    },
    heatmap_calendar: {
        name: 'Mapa de Calor',
        description: 'Calendário com intensidade por dia',
        category: 'chart',
        icon: 'calendar_month',
        default_config: { colorScheme: 'green', showTooltip: true },
        supported_metrics: ['activity_by_day', 'transactions_by_day'],
        plan_min: 'plus',
    },
    alerts_list: {
        name: 'Lista de Alertas',
        description: 'Insights e notificações importantes',
        category: 'special',
        icon: 'notifications',
        default_config: { maxItems: 5, showTimestamp: true, groupByType: false },
        supported_metrics: ['insights', 'alerts', 'recommendations'],
        plan_min: 'start',
    },
    radar_multidim: {
        name: 'Gráfico Radar',
        description: 'Análise multidimensional (ex: Satisfação, Desempenho)',
        category: 'chart',
        icon: 'hexagon',
        default_config: { showLegend: true },
        supported_metrics: ['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
        plan_min: 'plus',
    },
    bar_horizontal: {
        name: 'Barras Horizontais',
        description: 'Gráfico de barras horizontais para comparação',
        category: 'chart',
        icon: 'align_horizontal_left',
        default_config: { showLabels: true },
        supported_metrics: ['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
        plan_min: 'start',
    },
    area_timeseries: {
        name: 'Série Temporal (Área)',
        description: 'Gráfico de área para evolução de métricas',
        category: 'chart',
        icon: 'area_chart',
        default_config: { showTrend: true },
        supported_metrics: ['cash_in', 'cash_out', 'net_cash'],
        plan_min: 'start',
    },
    pie_chart: {
        name: 'Gráfico de Pizza',
        description: 'Gráfico de pizza clássico (Legado)',
        category: 'chart',
        icon: 'pie_chart',
        default_config: { showLegend: true },
        supported_metrics: ['expenses_by_category', 'revenue_by_category'],
        plan_min: 'start',
    },
};

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
    const Component = getWidgetComponent(type);

    if (!Component) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-red-500/10 rounded-xl border border-red-500/30">
                <span className="text-red-400 text-sm">Widget não encontrado: {type}</span>
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
