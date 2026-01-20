/**
 * 🏛️ WIDGET TYPES - Single Source of Truth (SSOT)
 * 
 * Este arquivo é a ÚNICA fonte de verdade para todos os tipos de widget.
 * Todos os outros arquivos (Registry, Manifest, ActionHandler) devem importar daqui.
 */

import { WIDGET_METRIC_DEFAULTS } from '../../../packages/lia-runtime/system/systemManifest';

// Re-exportando para acesso nomeado
export { WIDGET_METRIC_DEFAULTS };

// ============================================
// CANONICAL WIDGET TYPES
// ============================================

export const WIDGET_TYPES = [
    'kpi_card',
    'line_timeseries',
    'bar_grouped',
    'donut_breakdown',
    'table_rank',
    'table_transactions',
    'funnel',
    'gauge',
    'heatmap_calendar',
    'alerts_list',
    'radar_multidim',
    'bar_horizontal',
    'area_timeseries',
    'pie_chart',
] as const;

export type WidgetType = typeof WIDGET_TYPES[number];
export type WidgetCategory = 'kpi' | 'chart' | 'table' | 'special' | 'other';

// ============================================
// WIDGET METADATA - Category + Display Info
// ============================================

export interface WidgetMeta {
    type: WidgetType;
    name: string;
    category: 'kpi' | 'chart' | 'table' | 'special' | 'other';
    description: string;
    icon: string;
    plan_min: 'start' | 'plus' | 'pro';
    default_config: Record<string, any>;
    supported_metrics: string[];
}

export const WIDGET_METADATA: Record<WidgetType, WidgetMeta> = {
    kpi_card: {
        type: 'kpi_card',
        name: 'Cartão KPI',
        description: 'Exibe valor de métrica com delta vs período anterior',
        category: 'kpi',
        icon: 'trending_up',
        plan_min: 'start',
        default_config: { showTrend: true, showPrevious: true, formatType: 'currency' },
        supported_metrics: ['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'deals_count', 'deals_value', 'invoices_pending', 'contacts_count'],
    },
    line_timeseries: {
        type: 'line_timeseries',
        name: 'Gráfico de Linha',
        description: 'Série temporal com linha ou área',
        category: 'chart',
        icon: 'show_chart',
        plan_min: 'start',
        default_config: { chartType: 'line', showArea: false, showPoints: true, smoothCurve: true },
        supported_metrics: ['cash_in', 'cash_out', 'net_cash', 'transaction_count', 'revenue_by_category'],
    },
    bar_grouped: {
        type: 'bar_grouped',
        name: 'Barras Agrupadas',
        description: 'Gráfico de barras por categoria ou canal',
        category: 'chart',
        icon: 'bar_chart',
        plan_min: 'start',
        default_config: { orientation: 'vertical', showLabels: true, stacked: false },
        supported_metrics: ['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
    },
    bar_horizontal: {
        type: 'bar_horizontal',
        name: 'Barras Horizontais',
        description: 'Gráfico de barras horizontais para comparação',
        category: 'chart',
        icon: 'align_horizontal_left',
        plan_min: 'start',
        default_config: { showLabels: true },
        supported_metrics: ['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
    },
    donut_breakdown: {
        type: 'donut_breakdown',
        name: 'Gráfico de Rosca',
        description: 'Gráfico donut com breakdown por dimensão',
        category: 'chart',
        icon: 'donut_large',
        plan_min: 'start',
        default_config: { showLegend: true, showPercentage: true, innerRadius: 40 },
        supported_metrics: ['expenses_by_category', 'revenue_by_category', 'deals_by_stage', 'contacts_by_type'],
    },
    pie_chart: {
        type: 'pie_chart',
        name: 'Gráfico de Pizza',
        description: 'Gráfico de pizza clássico (Legado)',
        category: 'chart',
        icon: 'pie_chart',
        plan_min: 'start',
        default_config: { showLegend: true },
        supported_metrics: ['expenses_by_category', 'revenue_by_category'],
    },
    area_timeseries: {
        type: 'area_timeseries',
        name: 'Série Temporal (Área)',
        description: 'Gráfico de área para evolução de métricas',
        category: 'chart',
        icon: 'area_chart',
        plan_min: 'start',
        default_config: { showTrend: true },
        supported_metrics: ['cash_in', 'cash_out', 'net_cash'],
    },
    heatmap_calendar: {
        type: 'heatmap_calendar',
        name: 'Mapa de Calor',
        description: 'Calendário com intensidade por dia',
        category: 'chart',
        icon: 'calendar_month',
        plan_min: 'plus',
        default_config: { colorScheme: 'green', showTooltip: true },
        supported_metrics: ['transaction_count', 'cash_in', 'cash_out'],
    },
    funnel: {
        type: 'funnel',
        name: 'Funil de Vendas',
        description: 'Visualização de pipeline/funil CRM',
        category: 'special',
        icon: 'filter_alt',
        plan_min: 'plus',
        default_config: { showPercentages: true, showValues: true, colorScheme: 'gradient' },
        supported_metrics: ['deals_funnel'],
    },
    gauge: {
        type: 'gauge',
        name: 'Medidor de Meta',
        description: 'Gauge circular mostrando progresso vs meta',
        category: 'kpi',
        icon: 'speed',
        plan_min: 'start',
        default_config: { min: 0, max: 100, target: 80, showTarget: true },
        supported_metrics: ['goal_progress', 'conversion_rate', 'satisfaction_score'],
    },
    radar_multidim: {
        type: 'radar_multidim',
        name: 'Gráfico Radar',
        description: 'Análise multidimensional (ex: Satisfação, Desempenho)',
        category: 'chart',
        icon: 'hexagon',
        plan_min: 'plus',
        default_config: { showLegend: true },
        supported_metrics: ['revenue_by_category', 'expenses_by_category', 'deals_by_stage'],
    },
    table_rank: {
        type: 'table_rank',
        name: 'Tabela Ranking',
        description: 'Top N itens ordenados por métrica',
        category: 'table',
        icon: 'leaderboard',
        plan_min: 'start',
        default_config: { limit: 5, showRank: true, showChange: false },
        supported_metrics: ['top_categories', 'top_customers', 'top_products'],
    },
    table_transactions: {
        type: 'table_transactions',
        name: 'Transações Recentes',
        description: 'Lista detalhada',
        category: 'table',
        icon: 'receipt_long',
        plan_min: 'start',
        default_config: { pageSize: 10, showFilters: true, columns: ['date', 'description', 'category', 'amount'] },
        supported_metrics: ['transactions_recent'],
    },
    alerts_list: {
        type: 'alerts_list',
        name: 'Lista de Alertas',
        description: 'Notificações e alertas',
        category: 'special',
        icon: 'notifications',
        plan_min: 'pro',
        default_config: { maxItems: 5, showTimestamp: true, groupByType: false },
        supported_metrics: ['insights', 'alerts', 'recommendations'],
    },
};

// ============================================
// CATEGORY FILTERS
// ============================================

export function getWidgetsByCategory(category: WidgetCategory): WidgetType[] {
    return Object.values(WIDGET_METADATA)
        .filter(w => w.category === category)
        .map(w => w.type);
}

export function getChartWidgets(): WidgetType[] {
    return getWidgetsByCategory('chart');
}

export function getTableWidgets(): WidgetType[] {
    return getWidgetsByCategory('table');
}

export function getKpiWidgets(): WidgetType[] {
    return getWidgetsByCategory('kpi');
}

export function getWidgetMeta(type: WidgetType): WidgetMeta | undefined {
    return WIDGET_METADATA[type];
}


// ============================================
// WIDGET ALIASES - Normalização de input
// ============================================

const WIDGET_ALIASES: Record<string, WidgetType> = {
    // Pizza / Pie
    'pizza': 'pie_chart',
    'pie': 'pie_chart',
    'pie_chart': 'pie_chart',
    'gráfico de pizza': 'pie_chart',
    'grafico de pizza': 'pie_chart',

    // Rosca / Donut
    'rosca': 'donut_breakdown',
    'donut': 'donut_breakdown',
    'donut_breakdown': 'donut_breakdown',
    'gráfico de rosca': 'donut_breakdown',
    'grafico de rosca': 'donut_breakdown',

    // Linha / Line
    'linha': 'line_timeseries',
    'line': 'line_timeseries',
    'line_timeseries': 'line_timeseries',
    'gráfico de linha': 'line_timeseries',

    // Barras / Bar
    'barras': 'bar_grouped',
    'bar': 'bar_grouped',
    'bar_grouped': 'bar_grouped',
    'gráfico de barras': 'bar_grouped',
    'barras horizontais': 'bar_horizontal',
    'bar_horizontal': 'bar_horizontal',

    // Área / Area
    'area': 'area_timeseries',
    'área': 'area_timeseries',
    'area_timeseries': 'area_timeseries',

    // KPI
    'kpi': 'kpi_card',
    'kpi_card': 'kpi_card',
    'cartão': 'kpi_card',
    'card': 'kpi_card',

    // Tabelas
    'tabela': 'table_transactions',
    'table': 'table_transactions',
    'table_transactions': 'table_transactions',
    'ranking': 'table_rank',
    'table_rank': 'table_rank',

    // Especiais
    'funil': 'funnel',
    'funnel': 'funnel',
    'gauge': 'gauge',
    'velocímetro': 'gauge',
    'mapa de calor': 'heatmap_calendar',
    'heatmap': 'heatmap_calendar',
    'heatmap_calendar': 'heatmap_calendar',
    'radar': 'radar_multidim',
    'radar_multidim': 'radar_multidim',
    'alertas': 'alerts_list',
    'alerts_list': 'alerts_list',
};

// ============================================
// VALIDATION & NORMALIZATION
// ============================================

/**
 * Verifica se um tipo de widget é válido (canônico)
 */
export function isValidWidgetType(type: string): type is WidgetType {
    return WIDGET_TYPES.includes(type as WidgetType);
}

/**
 * Normaliza um input de usuário para um WidgetType canônico
 * Retorna null se não conseguir mapear
 */
export function normalizeWidgetType(input: string): WidgetType | null {
    if (!input) return null;

    const normalized = input.toLowerCase().trim();

    // Primeiro, tenta match direto
    if (isValidWidgetType(normalized)) {
        return normalized;
    }

    // Segundo, tenta via alias
    const alias = WIDGET_ALIASES[normalized];
    if (alias) {
        return alias;
    }

    // Terceiro, tenta match parcial
    for (const [key, value] of Object.entries(WIDGET_ALIASES)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }

    return null;
}

/**
 * Retorna lista de widgets disponíveis formatada para mensagem
 */
export function getAvailableWidgetsMessage(): string {
    return `Widgets disponíveis: ${WIDGET_TYPES.join(', ')}`;
}

/**
 * Sugere o widget mais próximo para um input inválido
 */
export function suggestClosestWidget(input: string): WidgetType | null {
    const normalized = input.toLowerCase();

    // Prioridades de sugestão
    if (normalized.includes('pizza') || normalized.includes('pie')) return 'pie_chart';
    if (normalized.includes('rosca') || normalized.includes('donut')) return 'donut_breakdown';
    if (normalized.includes('linha') || normalized.includes('line')) return 'line_timeseries';
    if (normalized.includes('barra') || normalized.includes('bar')) return 'bar_grouped';
    if (normalized.includes('tabela') || normalized.includes('table')) return 'table_transactions';
    if (normalized.includes('kpi') || normalized.includes('card')) return 'kpi_card';

    return 'donut_breakdown'; // Default seguro
}

export default {
    WIDGET_TYPES,
    isValidWidgetType,
    normalizeWidgetType,
    getAvailableWidgetsMessage,
    suggestClosestWidget,
};
