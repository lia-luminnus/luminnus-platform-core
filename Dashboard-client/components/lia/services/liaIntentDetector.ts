/**
 * LIA Intent Detector v3.2
 * 
 * Detecta intenções de controle do dashboard no texto da LIA
 * Suporta: Adição, Substituição e Período via Voz (Gemini Live)
 */

interface DetectedIntent {
    action: string;
    payload: Record<string, any>;
    confidence: number;
}

const DASHBOARD_ACTION_PATTERNS = [
    // 1. ADICIONAR WIDGET (ADD) - Prioritário para comandos simples
    {
        patterns: [
            /(?:adicione|coloque|insira|crie|mostre|visualizar|plote|incluir|tenho|tem).{1,30}(?:gráfico|widget|kpi|card|pizza|pie|barra|linha|tabela|area|funil)/i,
        ],
        action: 'DASHBOARD_ADD_WIDGET',
        handler: (text: string) => {
            const low = text.toLowerCase();
            let widgetType = 'pie_chart';

            if (low.includes('pizza') || low.includes('pie') || low.includes('rosca') || low.includes('donut')) widgetType = 'pie_chart';
            else if (low.includes('barra') || low.includes('bar')) widgetType = 'bar_grouped';
            else if (low.includes('linha') || low.includes('line')) widgetType = 'line_timeseries';
            else if (low.includes('tabela') || low.includes('rank')) widgetType = 'table_rank';
            else if (low.includes('area')) widgetType = 'area_timeseries';
            else if (low.includes('funil')) widgetType = 'funnel';

            return { widgetType };
        }
    },

    // 2. SUBSTITUIR WIDGET (REPLACE) - Exige verbos de TROCA claros
    {
        patterns: [
            /(?:troque|substitua|trocar|substituir|no lugar de).{1,30}(?:pelo|por|pela|para).{1,20}(?:gráfico|pizza|pie|rosca|donut|barra|linha|tabela|area|funil)/i,
        ],
        action: 'DASHBOARD_REPLACE_WIDGET',
        handler: (text: string) => {
            const low = text.toLowerCase();

            // Determinar o Alvo (Target)
            let targetType: string | undefined = undefined;
            if (low.includes('ranking') || low.includes('tabela')) targetType = 'table_rank';
            else if (low.includes('pizza') || low.includes('pie')) targetType = 'pie_chart';
            else if (low.includes('barra')) targetType = 'bar_grouped';

            // Determinar o Novo (New)
            let newType = 'pie_chart';
            if (low.includes('pizza') || low.includes('pie') || low.includes('rosca') || low.includes('donut')) newType = 'pie_chart';
            else if (low.includes('barra') || low.includes('bar')) newType = 'bar_grouped';
            else if (low.includes('linha') || low.includes('line')) newType = 'line_timeseries';
            else if (low.includes('tabela') || low.includes('rank')) newType = 'table_rank';
            else if (low.includes('area')) newType = 'area_timeseries';
            else if (low.includes('funil')) newType = 'funnel';

            return {
                targetWidgetType: targetType,
                newWidgetType: newType
            };
        }
    },

    // 3. ALTERAR PERÍODO
    {
        patterns: [/(?:alterei|mudei|configurei|coloquei|mostrando|coloque).{0,30}(?:período|period|data).{0,20}(?:hoje|today)/i],
        action: 'DASHBOARD_SET_PERIOD',
        payload: { range: 'today' }
    },
    {
        patterns: [/(?:alterei|mudei|configurei|coloquei|mostrando|coloque).{0,30}(?:período|period|data).{0,20}(?:semana|week)/i],
        action: 'DASHBOARD_SET_PERIOD',
        payload: { range: 'week' }
    }
];

const UNABLE_PATTERNS = [
    /não (?:tenho|consigo).{0,20}acesso/i,
    /não (?:posso|é possível)/i,
    /você mesmo.{0,20}(?:fazer|criar|adicionar)/i,
];

function normalizeText(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function normalizePattern(pattern: RegExp): RegExp {
    const source = pattern.source.replace(/\\s\+/g, "").replace(/\\s\*/g, "").replace(/\.\{0,30\}/g, ".*").replace(/\s/g, "");
    return new RegExp(source, "i");
}

export function detectDashboardIntent(text: string): DetectedIntent | null {
    if (!text || text.length < 5) return null;
    const normalizedText = normalizeText(text);

    for (const pattern of UNABLE_PATTERNS) {
        if (pattern.test(text)) return null;
    }

    for (const config of DASHBOARD_ACTION_PATTERNS) {
        for (const pattern of config.patterns) {
            if (pattern.test(text) || normalizePattern(pattern).test(normalizedText)) {
                let payload = config.payload || {};
                if (config.handler) {
                    payload = { ...payload, ...config.handler(text) };
                }
                return { action: config.action, payload, confidence: 0.9 };
            }
        }
    }
    return null;
}

export default { detectDashboardIntent };
