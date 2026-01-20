/**
 * 🏛️ SYSTEM MANIFEST v5.0 - Single Source of Truth (SSOT)
 * 
 * Este arquivo define TUDO que o sistema Luminnus pode saber e fazer.
 * Localização: packages/lia-runtime/system/systemManifest.ts
 */

// ============================================
// WIDGET TYPES
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

export type WidgetCategory = 'kpi' | 'chart' | 'table' | 'special' | 'other';

export interface WidgetMeta {
    type: WidgetType;
    name: string;
    description: string;
    category: WidgetCategory;
    icon: string;
    plan_min: 'start' | 'plus' | 'pro';
    default_config: Record<string, any>;
    supported_metrics: string[];
}

// ============================================
// PLANS
// ============================================

export type PlanLevel = 'start' | 'plus' | 'pro';

export interface PlanInfo {
    id: PlanLevel;
    name: string;
    maxWidgets: number;
    maxDashboards: number;
    features: string[];
    allowedWidgets: WidgetType[];
}

// ============================================
// INTEGRATIONS & MODULES
// ============================================

export interface IntegrationInfo {
    id: string;
    name: string;
    category: 'workspace' | 'messaging' | 'erp' | 'crm' | 'analytics';
    capabilities: string[];
    planRequired: PlanLevel;
}

export interface ModuleInfo {
    id: string;
    name: string;
    description: string;
    planRequired: PlanLevel;
}

// ============================================
// WIDGET DEFAULTS & ALIASES
// ============================================

export const WIDGET_METRIC_DEFAULTS: Record<string, { metrics: string[] }> = {
    'kpi_card': { metrics: ['faturamento_total'] },
    'line_timeseries': { metrics: ['faturamento_por_dia'] },
    'bar_grouped': { metrics: ['vendas_por_categoria'] },
    'pie_chart': { metrics: ['faturamento_por_categoria'] },
    'donut_breakdown': { metrics: ['faturamento_por_canal'] },
    'table_rank': { metrics: ['top_produtos_vendas'] },
    'table_transactions': { metrics: ['ultimas_vendas'] },
    'funnel': { metrics: ['conversao_vendas'] },
    'gauge': { metrics: ['meta_mensal'] },
    'heatmap_calendar': { metrics: ['transaction_count'] },
    'radar_multidim': { metrics: ['satisfacao_cliente'] },
    'bar_horizontal': { metrics: ['vendas_por_regiao'] },
    'area_timeseries': { metrics: ['lucro_estimado'] },
    'alerts_list': { metrics: ['alerta_estoque'] },
};

export const WIDGET_ALIASES: Record<string, WidgetType> = {
    "pizza": "pie_chart", "pie": "pie_chart", "rosca": "donut_breakdown", "donut": "donut_breakdown",
    "barra": "bar_grouped", "bar": "bar_grouped", "linha": "line_timeseries", "line": "line_timeseries",
    "tabela": "table_transactions", "ranking": "table_rank", "funil": "funnel", "velocímetro": "gauge"
};

// ============================================
// MASTER DATA
// ============================================

export const WIDGET_TYPES: WidgetType[] = [
    'kpi_card', 'line_timeseries', 'bar_grouped', 'donut_breakdown', 'table_rank',
    'table_transactions', 'funnel', 'gauge', 'heatmap_calendar', 'alerts_list',
    'radar_multidim', 'bar_horizontal', 'area_timeseries', 'pie_chart'
];

export const PLANS: Record<PlanLevel, PlanInfo> = {
    start: {
        id: 'start', name: 'Luminnus Start', maxWidgets: 8, maxDashboards: 1,
        features: ['chat', 'voice', 'basic_widgets'],
        allowedWidgets: ['kpi_card', 'line_timeseries', 'bar_grouped', 'pie_chart', 'table_transactions'],
    },
    plus: {
        id: 'plus', name: 'Luminnus Plus', maxWidgets: 20, maxDashboards: 5,
        features: ['chat', 'voice', 'all_widgets', 'integrations', 'whatsapp'],
        allowedWidgets: ['kpi_card', 'line_timeseries', 'bar_grouped', 'pie_chart', 'table_transactions', 'donut_breakdown', 'table_rank', 'funnel', 'area_timeseries'],
    },
    pro: {
        id: 'pro', name: 'Luminnus Pro', maxWidgets: 50, maxDashboards: 20,
        features: ['chat', 'voice', 'all_widgets', 'integrations', 'whatsapp', 'api', 'custom_branding'],
        allowedWidgets: [...WIDGET_TYPES],
    },
};

export const INTEGRATIONS: IntegrationInfo[] = [
    { id: 'google_workspace', name: 'Google Workspace', category: 'workspace', capabilities: ['gmail_read', 'gmail_send', 'calendar_manage', 'drive_read'], planRequired: 'start' },
    { id: 'whatsapp_cloud', name: 'WhatsApp Cloud API', category: 'messaging', capabilities: ['send_message', 'webhook_receive', 'pipeline_agent'], planRequired: 'plus' },
    { id: 'sap_erp', name: 'SAP ERP', category: 'erp', capabilities: ['sync_data', 'read_records'], planRequired: 'pro' },
    { id: 'hub_integrations', name: 'Hub de Integrações', category: 'analytics', capabilities: ['webhooks', 'api_keys', 'custom_endpoints'], planRequired: 'plus' },
];

export const MODULES: ModuleInfo[] = [
    { id: 'dashboard', name: 'Dashboard', description: 'Visão geral de KPIs e gráficos', planRequired: 'start' },
    { id: 'lia_chat', name: 'LIA Chat/Voz', description: 'Assistente inteligente multimodal', planRequired: 'start' },
    { id: 'whatsapp_agent', name: 'WhatsApp Agente', description: 'Gestão de leads e automação de inbox', planRequired: 'plus' },
    { id: 'financeiro', name: 'Financeiro', description: 'Receitas, despesas e cobranças', planRequired: 'start' },
    { id: 'relatorios', name: 'Relatórios', description: 'Geração de análises e PDFs', planRequired: 'plus' },
    { id: 'calendario', name: 'Calendário', description: 'Agendamentos e eventos', planRequired: 'start' },
    { id: 'arquivos', name: 'Arquivos', description: 'Gestão de documentos e anexos', planRequired: 'start' },
    { id: 'configuracoes', name: 'Configurações', description: 'Ajustes de conta e tenant', planRequired: 'start' },
];

// v5.0 Master Templates
export const BUSINESS_TEMPLATES = [
    { id: 'clinica', name: 'Clínica / Médico', goals: ['Agendamento', 'Lembretes'], fields: ['paciente', 'especialidade', 'data'] },
    { id: 'barbearia', name: 'Barbearia / Salão', goals: ['Agendamento', 'Fidelidade'], fields: ['cliente', 'servico', 'horario'] },
    { id: 'loja', name: 'Loja / Retalho', goals: ['Vendas', 'Estoque'], fields: ['produto', 'valor', 'cliente'] },
    { id: 'imobiliaria', name: 'Imobiliária', goals: ['Leads', 'Visitas'], fields: ['imovel', 'interessado', 'corretor'] },
];

// ============================================
// HELPERS
// ============================================

export function normalizeWidgetType(input: string): WidgetType | null {
    if (!input) return null;
    const low = input.toLowerCase().trim();
    if (WIDGET_ALIASES[low]) return WIDGET_ALIASES[low];
    for (let i = 0; i < WIDGET_TYPES.length; i++) {
        if (WIDGET_TYPES[i] === low) return low as WidgetType;
    }
    return null;
}

export function isWidgetAllowedInPlan(widgetType: WidgetType, planId: string): boolean {
    const plan = PLANS[planId as PlanLevel];
    if (!plan) return false;
    for (let i = 0; i < plan.allowedWidgets.length; i++) {
        if (plan.allowedWidgets[i] === widgetType) return true;
    }
    return false;
}

export function generateWidgetCountResponse(metadata: Record<WidgetType, WidgetMeta>): string {
    const charts = WIDGET_TYPES.filter(t => metadata[t]?.category === 'chart');
    const tables = WIDGET_TYPES.filter(t => metadata[t]?.category === 'table');
    const kpis = WIDGET_TYPES.filter(t => metadata[t]?.category === 'kpi');

    return `📊 **Widgets Disponíveis no Sistema Luminnus**
O sistema possui **${WIDGET_TYPES.length} tipos de widgets**:
• **Gráficos (${charts.length})**: ${charts.map(t => metadata[t]?.name || t).join(', ')}
• **Tabelas (${tables.length})**: ${tables.map(t => metadata[t]?.name || t).join(', ')}
• **KPIs (${kpis.length})**: ${kpis.map(t => metadata[t]?.name || t).join(', ')}`;
}

export default {
    WIDGET_TYPES,
    PLANS,
    INTEGRATIONS,
    MODULES,
    WIDGET_METRIC_DEFAULTS,
    normalizeWidgetType,
    isWidgetAllowedInPlan,
    generateWidgetCountResponse
};
