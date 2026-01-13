/**
 * 🏛️ SYSTEM MANIFEST v4.0 - Single Source of Truth (SSOT)
 * 
 * Este arquivo define TUDO que existe no sistema Luminnus.
 * Importa do widgetTypes.ts para manter uma única fonte de verdade.
 * 
 * A LIA consulta este manifesto para responder perguntas como:
 * - "Quantos gráficos existem no sistema?"
 * - "Quais widgets posso usar?"
 * - "Qual meu plano e limites?"
 */

import {
    WIDGET_TYPES,
    WIDGET_METADATA,
    WidgetType,
    WidgetMeta,
    WidgetCategory,
    getWidgetsByCategory,
    getChartWidgets,
    getTableWidgets,
    getKpiWidgets,
    getWidgetMeta,
    normalizeWidgetType,
} from '../../dashboard-engine/widgetTypes';

// ============================================
// PLANS - Planos e Permissões
// ============================================

export interface PlanInfo {
    id: 'start' | 'plus' | 'pro';
    name: string;
    maxWidgets: number;
    maxDashboards: number;
    features: string[];
    allowedWidgets: WidgetType[];
}

export const PLANS: Record<string, PlanInfo> = {
    start: {
        id: 'start',
        name: 'Luminnus Start',
        maxWidgets: 8,
        maxDashboards: 1,
        features: ['chat', 'voice', 'basic_widgets'],
        allowedWidgets: WIDGET_TYPES.filter(t => !WIDGET_METADATA[t].planRequired),
    },
    plus: {
        id: 'plus',
        name: 'Luminnus Plus',
        maxWidgets: 20,
        maxDashboards: 5,
        features: ['chat', 'voice', 'all_widgets', 'integrations', 'whatsapp'],
        allowedWidgets: WIDGET_TYPES.filter(t =>
            !WIDGET_METADATA[t].planRequired || WIDGET_METADATA[t].planRequired === 'plus'
        ),
    },
    pro: {
        id: 'pro',
        name: 'Luminnus Pro',
        maxWidgets: 50,
        maxDashboards: 20,
        features: ['chat', 'voice', 'all_widgets', 'integrations', 'whatsapp', 'api', 'custom_branding'],
        allowedWidgets: [...WIDGET_TYPES], // All widgets
    },
};

// ============================================
// INTEGRATIONS - Providers e Capacidades
// ============================================

export interface IntegrationInfo {
    id: string;
    name: string;
    category: 'workspace' | 'messaging' | 'erp' | 'crm' | 'analytics';
    capabilities: string[];
    planRequired: 'start' | 'plus' | 'pro';
}

export const INTEGRATIONS: IntegrationInfo[] = [
    {
        id: 'google_workspace',
        name: 'Google Workspace',
        category: 'workspace',
        capabilities: ['sheets_read', 'sheets_write', 'docs_read', 'calendar_sync'],
        planRequired: 'plus',
    },
    {
        id: 'whatsapp_business',
        name: 'WhatsApp Business',
        category: 'messaging',
        capabilities: ['send_message', 'receive_message', 'templates', 'media'],
        planRequired: 'plus',
    },
    {
        id: 'slack',
        name: 'Slack',
        category: 'messaging',
        capabilities: ['send_message', 'channels', 'webhooks'],
        planRequired: 'pro',
    },
];

// ============================================
// MODULES - Módulos do Sistema
// ============================================

export interface ModuleInfo {
    id: string;
    name: string;
    description: string;
    planRequired: 'start' | 'plus' | 'pro';
}

export const MODULES: ModuleInfo[] = [
    { id: 'financeiro', name: 'Financeiro', description: 'Receitas, despesas, fluxo de caixa', planRequired: 'start' },
    { id: 'crm', name: 'CRM', description: 'Gestão de clientes e leads', planRequired: 'plus' },
    { id: 'relatorios', name: 'Relatórios', description: 'Relatórios personalizados e exportação', planRequired: 'plus' },
    { id: 'whatsapp', name: 'WhatsApp Agent', description: 'Atendimento automatizado via WhatsApp', planRequired: 'pro' },
];

// ============================================
// SYSTEM MANIFEST - Compilação Completa
// ============================================

export interface SystemManifest {
    version: string;
    widgets: {
        types: WidgetType[];
        count: number;
        byCategory: Record<WidgetCategory, WidgetType[]>;
        metadata: Record<WidgetType, WidgetMeta>;
    };
    plans: Record<string, PlanInfo>;
    integrations: IntegrationInfo[];
    modules: ModuleInfo[];
}

export function getSystemManifest(): SystemManifest {
    return {
        version: '4.0',
        widgets: {
            types: [...WIDGET_TYPES],
            count: WIDGET_TYPES.length,
            byCategory: {
                kpi: getKpiWidgets(),
                chart: getChartWidgets(),
                table: getTableWidgets(),
                other: getWidgetsByCategory('other'),
            },
            metadata: WIDGET_METADATA,
        },
        plans: PLANS,
        integrations: INTEGRATIONS,
        modules: MODULES,
    };
}

// ============================================
// HELPER FUNCTIONS - Respostas Locais
// ============================================

/**
 * Gera resposta para "quantos widgets existem no sistema?"
 */
export function generateWidgetCountResponse(): string {
    const manifest = getSystemManifest();
    const charts = manifest.widgets.byCategory.chart;
    const tables = manifest.widgets.byCategory.table;
    const kpis = manifest.widgets.byCategory.kpi;

    return `📊 **Widgets Disponíveis no Sistema Luminnus**

O sistema possui **${manifest.widgets.count} tipos de widgets**:

• **Gráficos (${charts.length})**: ${charts.map(t => WIDGET_METADATA[t].name).join(', ')}
• **Tabelas (${tables.length})**: ${tables.map(t => WIDGET_METADATA[t].name).join(', ')}
• **KPIs (${kpis.length})**: ${kpis.map(t => WIDGET_METADATA[t].name).join(', ')}`;
}

/**
 * Gera resposta para "quais gráficos existem?"
 */
export function generateChartListResponse(): string {
    const charts = getChartWidgets();
    const list = charts.map((t, i) => `${i + 1}. **${WIDGET_METADATA[t].name}** (\`${t}\`) - ${WIDGET_METADATA[t].description}`).join('\n');

    return `📈 **Gráficos Disponíveis**

${list}

Total: **${charts.length} tipos de gráficos**`;
}

/**
 * Verifica se um widget é permitido no plano
 */
export function isWidgetAllowedInPlan(widgetType: WidgetType, planId: string): boolean {
    const plan = PLANS[planId];
    if (!plan) return false;
    return plan.allowedWidgets.includes(widgetType);
}

/**
 * Normaliza input do usuário para tipo canônico (re-export)
 */
export { normalizeWidgetType, getWidgetMeta };

// ============================================
// LEGACY COMPATIBILITY - generateWidgetInfoResponse
// ============================================

export function generateWidgetInfoResponse(): string {
    return generateWidgetCountResponse();
}

export default {
    getSystemManifest,
    generateWidgetCountResponse,
    generateChartListResponse,
    isWidgetAllowedInPlan,
    normalizeWidgetType,
    PLANS,
    INTEGRATIONS,
    MODULES,
};
