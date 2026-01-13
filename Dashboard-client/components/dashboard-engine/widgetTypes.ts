/**
 * 🏛️ WIDGET TYPES - Single Source of Truth (SSOT)
 * 
 * Este arquivo é a ÚNICA fonte de verdade para todos os tipos de widget.
 * Todos os outros arquivos (Registry, Manifest, ActionHandler) devem importar daqui.
 */

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
export type WidgetCategory = 'kpi' | 'chart' | 'table' | 'other';

// ============================================
// WIDGET METADATA - Category + Display Info
// ============================================

export interface WidgetMeta {
    type: WidgetType;
    name: string;
    category: WidgetCategory;
    description: string;
    icon: string;
    planRequired?: 'start' | 'plus' | 'pro';
}

export const WIDGET_METADATA: Record<WidgetType, WidgetMeta> = {
    kpi_card: { type: 'kpi_card', name: 'Cartão de Métrica', category: 'kpi', description: 'Métrica principal com comparação', icon: 'trending_up' },
    line_timeseries: { type: 'line_timeseries', name: 'Gráfico de Linha', category: 'chart', description: 'Tendências temporais', icon: 'show_chart' },
    bar_grouped: { type: 'bar_grouped', name: 'Gráfico de Barras', category: 'chart', description: 'Comparação entre categorias', icon: 'bar_chart' },
    bar_horizontal: { type: 'bar_horizontal', name: 'Barras Horizontais', category: 'chart', description: 'Comparação horizontal', icon: 'align_horizontal_left' },
    donut_breakdown: { type: 'donut_breakdown', name: 'Gráfico de Rosca', category: 'chart', description: 'Distribuição percentual', icon: 'donut_large' },
    pie_chart: { type: 'pie_chart', name: 'Gráfico de Pizza', category: 'chart', description: 'Distribuição em fatias', icon: 'pie_chart' },
    area_timeseries: { type: 'area_timeseries', name: 'Gráfico de Área', category: 'chart', description: 'Volume ao longo do tempo', icon: 'area_chart' },
    heatmap_calendar: { type: 'heatmap_calendar', name: 'Mapa de Calor', category: 'chart', description: 'Frequência em calendário', icon: 'calendar_today' },
    funnel: { type: 'funnel', name: 'Funil de Conversão', category: 'chart', description: 'Etapas de conversão', icon: 'filter_alt' },
    gauge: { type: 'gauge', name: 'Velocímetro', category: 'chart', description: 'Progresso ou meta', icon: 'speed' },
    radar_multidim: { type: 'radar_multidim', name: 'Gráfico Radar', category: 'chart', description: 'Comparação multidimensional', icon: 'radar', planRequired: 'plus' },
    table_rank: { type: 'table_rank', name: 'Tabela de Ranking', category: 'table', description: 'Top N de uma métrica', icon: 'leaderboard' },
    table_transactions: { type: 'table_transactions', name: 'Tabela de Transações', category: 'table', description: 'Lista detalhada', icon: 'receipt_long' },
    alerts_list: { type: 'alerts_list', name: 'Lista de Alertas', category: 'other', description: 'Notificações e alertas', icon: 'notifications', planRequired: 'pro' },
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
