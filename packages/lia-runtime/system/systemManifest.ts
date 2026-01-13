/**
 * 🏛️ SYSTEM MANIFEST v4.2 - Single Source of Truth (SSOT)
 * 
 * Este arquivo define TUDO que a LIA pode saber e fazer no sistema Luminnus.
 * Localização: packages/lia-runtime/system/systemManifest.ts
 */

// ============================================
// WIDGET TYPES - Tipos Canônicos Suportados
// ============================================

export type WidgetType =
    | 'kpi_card'
    | 'line_timeseries'
    | 'bar_grouped'
    | 'donut_breakdown'
    | 'table_rank'
    | 'table_transactions'
    | 'funnel'
    | 'gauge'
    | 'heatmap_calendar'
    | 'alerts_list'
    | 'radar_multidim'
    | 'bar_horizontal'
    | 'area_timeseries'
    | 'pie_chart';

// ============================================
// ALIASES - Linguagem Natural -> Tipo Canônico
// ============================================

export const WIDGET_ALIASES: Record<string, WidgetType> = {
    // Pizza / Pie / Rosca
    "pizza": "pie_chart",
    "pie": "pie_chart",
    "pie chart": "pie_chart",
    "gráfico de pizza": "pie_chart",
    "rosca": "donut_breakdown",
    "donut": "donut_breakdown",
    "anel": "donut_breakdown",

    // Barras
    "barra": "bar_grouped",
    "barras": "bar_grouped",
    "bar": "bar_grouped",
    "barras agrupadas": "bar_grouped",
    "barra horizontal": "bar_horizontal",

    // Linhas / Area
    "linha": "line_timeseries",
    "linhas": "line_timeseries",
    "line": "line_timeseries",
    "area": "area_timeseries",
    "evolutivo": "line_timeseries",
    "histórico": "line_timeseries",

    // Tabelas / Rankings
    "tabela": "table_transactions",
    "lista": "table_transactions",
    "ranking": "table_rank",
    "top 10": "table_rank",
    "melhores": "table_rank",

    // Especiais
    "funil": "funnel",
    "conversion": "funnel",
    "velocímetro": "gauge",
    "gauge": "gauge",
    "mapa de calor": "heatmap_calendar",
    "calendário": "heatmap_calendar",
    "radar": "radar_multidim",
    "teia": "radar_multidim"
};

// ============================================
// PLANS - Planos e Permissões
// ============================================

export type PlanLevel = 'start' | 'plus' | 'pro';

export interface PlanInfo {
    id: PlanLevel;
    name: string;
    maxWidgets: number;
    allowedWidgets: WidgetType[];
}

export const PLANS: Record<PlanLevel, PlanInfo> = {
    start: {
        id: 'start',
        name: 'Luminnus Start',
        maxWidgets: 8,
        allowedWidgets: ['kpi_card', 'line_timeseries', 'bar_grouped', 'pie_chart', 'table_transactions'],
    },
    plus: {
        id: 'plus',
        name: 'Luminnus Plus',
        maxWidgets: 20,
        allowedWidgets: ['kpi_card', 'line_timeseries', 'bar_grouped', 'pie_chart', 'table_transactions', 'donut_breakdown', 'table_rank', 'funnel', 'area_timeseries'],
    },
    pro: {
        id: 'pro',
        name: 'Luminnus Pro',
        maxWidgets: 50,
        allowedWidgets: ['kpi_card', 'line_timeseries', 'bar_grouped', 'pie_chart', 'table_transactions', 'donut_breakdown', 'table_rank', 'funnel', 'area_timeseries', 'gauge', 'heatmap_calendar', 'radar_multidim', 'bar_horizontal'],
    },
};

// ============================================
// LIA CAPABILITIES - Ações Permitidas
// ============================================

export type LiaActionType =
    | 'DASHBOARD_ADD_WIDGET'
    | 'DASHBOARD_REMOVE_WIDGET'
    | 'DASHBOARD_UPDATE_WIDGET'
    | 'DASHBOARD_REPLACE_WIDGET'
    | 'DASHBOARD_SET_PERIOD'
    | 'DASHBOARD_GET_SNAPSHOT';

export const LIA_CAPABILITIES: LiaActionType[] = [
    'DASHBOARD_ADD_WIDGET',
    'DASHBOARD_REMOVE_WIDGET',
    'DASHBOARD_UPDATE_WIDGET',
    'DASHBOARD_REPLACE_WIDGET',
    'DASHBOARD_SET_PERIOD',
    'DASHBOARD_GET_SNAPSHOT'
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Normaliza termo de linguagem natural para tipo canônico */
export function normalizeWidgetType(input: string): WidgetType | null {
    if (!input) return null;
    const low = input.toLowerCase().trim();

    // Verifica alias exato
    if (WIDGET_ALIASES[low]) return WIDGET_ALIASES[low];

    // Verifica se já é o tipo canônico
    const types = ['kpi_card', 'line_timeseries', 'bar_grouped', 'donut_breakdown', 'table_rank', 'table_transactions', 'funnel', 'gauge', 'heatmap_calendar', 'radar_multidim', 'bar_horizontal', 'area_timeseries', 'pie_chart'];
    if (types.includes(low)) return low as WidgetType;

    return null;
}

export default {
    WIDGET_ALIASES,
    PLANS,
    LIA_CAPABILITIES,
    normalizeWidgetType
};
