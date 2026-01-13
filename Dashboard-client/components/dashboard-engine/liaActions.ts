/**
 * LIA Actions
 * 
 * Define ações que a LIA pode disparar para controlar a UI do dashboard
 * Protocolo LIA-Action: Chat → Intent → Action → UI Update
 */

// ============================================
// Action Types
// ============================================

export enum LiaActionType {
    // Date/Filter Actions
    SET_DATE_RANGE = 'SET_DATE_RANGE',
    FILTER_UPDATE = 'FILTER_UPDATE',
    CLEAR_FILTERS = 'CLEAR_FILTERS',

    // Widget Actions
    HIGHLIGHT_WIDGET = 'HIGHLIGHT_WIDGET',
    REFRESH_WIDGET = 'REFRESH_WIDGET',
    ZOOM_WIDGET = 'ZOOM_WIDGET',

    // Navigation Actions
    NAVIGATE = 'NAVIGATE',
    OPEN_TAB = 'OPEN_TAB',

    // Modal/Dialog Actions
    OPEN_INTEGRATION_MODAL = 'OPEN_INTEGRATION_MODAL',
    OPEN_WIDGET_PICKER = 'OPEN_WIDGET_PICKER',
    SHOW_DETAIL_VIEW = 'SHOW_DETAIL_VIEW',

    // Dashboard Layout Actions
    TOGGLE_EDIT_MODE = 'TOGGLE_EDIT_MODE',
    ADD_WIDGET = 'ADD_WIDGET',
    REMOVE_WIDGET = 'REMOVE_WIDGET',

    // Data Actions
    EXPORT_DATA = 'EXPORT_DATA',
    REFRESH_ALL = 'REFRESH_ALL',
}

// ============================================
// Action Payloads
// ============================================

export interface SetDateRangePayload {
    value: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
    customStart?: string;
    customEnd?: string;
}

export interface FilterUpdatePayload {
    key: string;
    value: string | string[] | null;
}

export interface HighlightWidgetPayload {
    widgetId: string;
    duration?: number; // ms
    scrollIntoView?: boolean;
}

export interface NavigatePayload {
    route: string;
    params?: Record<string, string>;
}

export interface OpenIntegrationModalPayload {
    provider: string;
}

export interface AddWidgetPayload {
    widgetType: string;
    position?: { x: number; y: number };
    config?: Record<string, any>;
}

export interface ShowDetailViewPayload {
    entityType: 'transaction' | 'deal' | 'contact' | 'invoice';
    entityId: string;
}

export interface ExportDataPayload {
    format: 'csv' | 'xlsx' | 'pdf';
    widgetId?: string; // If null, export all
}

// ============================================
// Unified Action Interface
// ============================================

export interface LiaAction<T = any> {
    type: LiaActionType;
    payload: T;
    meta?: {
        timestamp: string;
        conversationId?: string;
        intentSource?: 'voice' | 'text' | 'system';
    };
}

// ============================================
// Intent-to-Action Mapping
// ============================================

interface IntentPattern {
    patterns: RegExp[];
    action: LiaActionType;
    payloadExtractor?: (match: RegExpMatchArray, text: string) => any;
}

const INTENT_PATTERNS: IntentPattern[] = [
    // Date Range
    {
        patterns: [
            /mostr(?:e|a)\s+(?:os\s+)?(?:dados\s+)?(?:de\s+)?hoje/i,
            /filtrar?\s+(?:por\s+)?hoje/i,
            /dados\s+de\s+hoje/i,
        ],
        action: LiaActionType.SET_DATE_RANGE,
        payloadExtractor: () => ({ value: 'today' }),
    },
    {
        patterns: [
            /mostr(?:e|a)\s+(?:os\s+)?(?:dados\s+)?(?:de\s+)?ontem/i,
            /dados\s+de\s+ontem/i,
        ],
        action: LiaActionType.SET_DATE_RANGE,
        payloadExtractor: () => ({ value: 'yesterday' }),
    },
    {
        patterns: [
            /últim(?:os|a)\s+7\s+dias/i,
            /semana/i,
            /essa\s+semana/i,
        ],
        action: LiaActionType.SET_DATE_RANGE,
        payloadExtractor: () => ({ value: 'last_7_days' }),
    },
    {
        patterns: [
            /últim(?:os|a)\s+30\s+dias/i,
            /último\s+mês/i,
            /mês\s+passado/i,
        ],
        action: LiaActionType.SET_DATE_RANGE,
        payloadExtractor: () => ({ value: 'last_30_days' }),
    },
    {
        patterns: [
            /esse\s+mês/i,
            /este\s+mês/i,
            /mês\s+atual/i,
        ],
        action: LiaActionType.SET_DATE_RANGE,
        payloadExtractor: () => ({ value: 'this_month' }),
    },

    // Highlight/Focus Widget
    {
        patterns: [
            /mostr(?:e|a)\s+(?:o\s+)?(?:widget\s+de\s+)?receitas?/i,
            /destaque\s+receitas?/i,
        ],
        action: LiaActionType.HIGHLIGHT_WIDGET,
        payloadExtractor: () => ({ widgetId: 'kpi_revenue', duration: 5000, scrollIntoView: true }),
    },
    {
        patterns: [
            /mostr(?:e|a)\s+(?:o\s+)?(?:widget\s+de\s+)?despesas?/i,
            /destaque\s+despesas?/i,
        ],
        action: LiaActionType.HIGHLIGHT_WIDGET,
        payloadExtractor: () => ({ widgetId: 'kpi_expenses', duration: 5000, scrollIntoView: true }),
    },
    {
        patterns: [
            /mostr(?:e|a)\s+(?:o\s+)?funil/i,
            /ver\s+(?:o\s+)?funil/i,
        ],
        action: LiaActionType.HIGHLIGHT_WIDGET,
        payloadExtractor: () => ({ widgetId: 'funnel', duration: 5000, scrollIntoView: true }),
    },

    // Navigation
    {
        patterns: [
            /(?:ir\s+para|abr(?:ir|a)|acess(?:ar|e))\s+(?:as?\s+)?integrações?/i,
        ],
        action: LiaActionType.NAVIGATE,
        payloadExtractor: () => ({ route: '/integrations' }),
    },
    {
        patterns: [
            /(?:ir\s+para|abr(?:ir|a)|acess(?:ar|e))\s+(?:o\s+)?dashboard/i,
        ],
        action: LiaActionType.NAVIGATE,
        payloadExtractor: () => ({ route: '/dashboard' }),
    },
    {
        patterns: [
            /(?:ir\s+para|abr(?:ir|a)|acess(?:ar|e))\s+(?:a\s+)?lia/i,
            /conversar\s+com\s+(?:a\s+)?lia/i,
        ],
        action: LiaActionType.NAVIGATE,
        payloadExtractor: () => ({ route: '/lia' }),
    },

    // Integrations
    {
        patterns: [
            /conect(?:ar|e)\s+(?:o\s+)?google/i,
            /integrar\s+(?:o\s+)?google/i,
        ],
        action: LiaActionType.OPEN_INTEGRATION_MODAL,
        payloadExtractor: () => ({ provider: 'google' }),
    },
    {
        patterns: [
            /conect(?:ar|e)\s+(?:o\s+)?whatsapp/i,
        ],
        action: LiaActionType.OPEN_INTEGRATION_MODAL,
        payloadExtractor: () => ({ provider: 'whatsapp' }),
    },

    // Edit Mode
    {
        patterns: [
            /edit(?:ar|e)\s+(?:o\s+)?dashboard/i,
            /modo\s+de?\s+edição/i,
            /personaliz(?:ar|e)\s+(?:o\s+)?dashboard/i,
        ],
        action: LiaActionType.TOGGLE_EDIT_MODE,
        payloadExtractor: () => ({}),
    },

    // Widget Picker
    {
        patterns: [
            /adicion(?:ar|e)\s+(?:um\s+)?widget/i,
            /(?:novo|nova)\s+widget/i,
        ],
        action: LiaActionType.OPEN_WIDGET_PICKER,
        payloadExtractor: () => ({}),
    },

    // Export
    {
        patterns: [
            /export(?:ar|e)\s+(?:os\s+)?dados/i,
            /baix(?:ar|e)\s+(?:os\s+)?dados/i,
            /download\s+(?:dos\s+)?dados/i,
        ],
        action: LiaActionType.EXPORT_DATA,
        payloadExtractor: () => ({ format: 'xlsx' }),
    },

    // Refresh
    {
        patterns: [
            /atualiz(?:ar|e)\s+(?:os\s+)?dados/i,
            /refresh/i,
            /recarreg(?:ar|ue)/i,
        ],
        action: LiaActionType.REFRESH_ALL,
        payloadExtractor: () => ({}),
    },
];

// ============================================
// Action Parser
// ============================================

/**
 * Parses natural language to extract potential LIA Actions
 */
export function parseLiaIntent(text: string): LiaAction | null {
    const normalizedText = text.toLowerCase().trim();

    for (const intent of INTENT_PATTERNS) {
        for (const pattern of intent.patterns) {
            const match = normalizedText.match(pattern);
            if (match) {
                const payload = intent.payloadExtractor ? intent.payloadExtractor(match, text) : {};

                return {
                    type: intent.action,
                    payload,
                    meta: {
                        timestamp: new Date().toISOString(),
                        intentSource: 'text',
                    },
                };
            }
        }
    }

    return null;
}

/**
 * Creates an action programmatically
 */
export function createAction<T>(type: LiaActionType, payload: T): LiaAction<T> {
    return {
        type,
        payload,
        meta: {
            timestamp: new Date().toISOString(),
            intentSource: 'system',
        },
    };
}

// ============================================
// Action Validators
// ============================================

export function isValidAction(action: LiaAction): boolean {
    if (!action.type || !Object.values(LiaActionType).includes(action.type)) {
        return false;
    }
    return true;
}

// ============================================
// Exports
// ============================================

export default {
    LiaActionType,
    parseLiaIntent,
    createAction,
    isValidAction,
};
