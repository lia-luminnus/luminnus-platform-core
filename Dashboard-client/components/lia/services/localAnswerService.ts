/**
 * 🧠 LOCAL ANSWER SERVICE v4.0
 * 
 * Responde perguntas internas de forma determinística, sem LLM.
 * Conforme LIA-Core-Architecture v4.0, Section 9.
 * 
 * Regra: Se for "factual e interno", responde local na hora. Zero LLM.
 */

import {
    getSystemManifest,
    generateWidgetCountResponse,
    generateChartListResponse,
    PLANS,
    MODULES,
    INTEGRATIONS,
} from './systemManifest';

// ============================================
// PATTERN MATCHERS - Detecção de perguntas locais
// ============================================

interface LocalQueryPattern {
    patterns: RegExp[];
    handler: (context?: LocalAnswerContext) => string;
    category: 'widgets' | 'charts' | 'plan' | 'dashboard' | 'math' | 'capabilities';
}

export interface LocalAnswerContext {
    snapshot?: {
        widgetCount: number;
        widgets: Array<{ id: string; type: string; title: string }>;
        active_widget_types?: string[];
    };
    plan?: string;
    tenantId?: string;
}

const LOCAL_QUERY_PATTERNS: LocalQueryPattern[] = [
    // Widgets do sistema (catálogo)
    {
        patterns: [
            /quantos\s*(tipos?\s*de\s*)?(widgets?|gráficos?|graficos?)\s*(existem|tem|há|disponíveis?)/i,
            /quais\s*(tipos?\s*de\s*)?(widgets?)\s*(existem|disponíveis?)/i,
            /o\s*que\s*(você\s*)?pode\s*(fazer|mostrar)/i,
            /capacidades/i,
        ],
        handler: () => generateWidgetCountResponse(),
        category: 'widgets',
    },

    // Lista de gráficos específicos
    {
        patterns: [
            /quais\s*(tipos?\s*de\s*)?(gráficos?|graficos?|charts?)\s*(existem|disponíveis?|posso\s*usar)/i,
            /liste\s*(os\s*)?(gráficos?|graficos?|charts?)/i,
            /me\s*mostre?\s*os\s*gráficos/i,
        ],
        handler: () => generateChartListResponse(),
        category: 'charts',
    },

    // Dashboard atual (estado) - PADRÕES MAIS FLEXÍVEIS E DE ACOMPANHAMENTO
    {
        patterns: [
            /quantos\s*(widgets?|gráficos?|graficos?|itens?|cards?)?\s*(eu\s*)?(tenho|tem|há|existem)/i,
            /o\s*que\s*(está|tem|há)\s*(no\s*)?(meu\s*)?(dashboard|painel|tela|aqui|aí|ai)/i,
            /quais\s*(widgets?|gráficos?|graficos?|itens?|cards?)?\s*(estão\s*)?(aparecendo|ativos?|no\s*dashboard|na\s*tela|tenho|tem|há)/i,
            /meu\s*dashboard\s*(tem|possui|mostra)\s*o\s*que/i,
            /me\s*(diz|fala|mostra|lista)\s*(os|quais)\s*(widgets?|gráficos?|graficos?|que\s*tem)/i,
            /^quantos\??$/i,
            /^quais\??$/i,
            /^o\s*que\s*(tem|há)\??$/i,
            /lista\s*(pra\s*mim|aí|ai)?/i,
        ],
        handler: (ctx) => {
            if (!ctx?.snapshot) {
                // v4.1: Retornar null para permitir fallback ao backend
                return null as any;
            }

            const { widgetCount, widgets } = ctx.snapshot;

            if (widgetCount === 0 || !widgets || widgets.length === 0) {
                return '📊 Seu dashboard está vazio no momento. Deseja que eu adicione algum gráfico específico (receitas, despesas, etc.)?';
            }

            const list = widgets
                .map((w, i) => `• **${w.title || 'Sem título'}** (tipo: \`${w.type}\`)`)
                .join('\n');

            return `📊 **Status do seu Dashboard**

Você tem **${widgetCount} widgets** ativos na tela:

${list}

---
*Posso ajudar a trocar algum gráfico ou adicionar novos?*`;
        },
        category: 'dashboard',
    },

    // Plano e limites
    {
        patterns: [
            /(qual|meu)\s*(é\s*)?(o\s*)?(meu\s*)?plano/i,
            /limites?\s*(do\s*plano)?/i,
            /quantos\s*(widgets?|dashboards?)\s*(posso|consigo)\s*(ter|criar)/i,
        ],
        handler: (ctx) => {
            const planId = ctx?.plan || 'start';
            const plan = PLANS[planId];

            if (!plan) {
                return `Você está no plano **Luminnus Start** (padrão).`;
            }

            return `📋 **Seu Plano: ${plan.name}**

• Widgets máximos: **${plan.maxWidgets}**
• Dashboards máximos: **${plan.maxDashboards}**
• Recursos: ${plan.features.join(', ')}`;
        },
        category: 'plan',
    },

    // Cálculos matemáticos simples
    {
        patterns: [
            /^quanto\s*é\s*(\d+)\s*[\+\-\*\/x]\s*(\d+)/i,
            /^(\d+)\s*[\+\-\*\/x]\s*(\d+)\s*[=\?]?$/,
        ],
        handler: () => {
            // Handler especial - processado separadamente no tryLocalAnswer
            return '';
        },
        category: 'math',
    },
];

// ============================================
// MAIN FUNCTION - Tentar responder localmente
// ============================================

export interface LocalAnswerResult {
    answered: boolean;
    response?: string;
    category?: string;
    reason?: string;
}

/**
 * Tenta responder uma pergunta localmente (sem LLM).
 * Retorna { answered: true, response: '...' } se encontrou resposta.
 * Retorna { answered: false, reason: '...' } se precisa do backend.
 */
export function tryLocalAnswer(
    text: string,
    context?: LocalAnswerContext
): LocalAnswerResult {
    if (!text || text.length < 3) {
        return { answered: false, reason: 'INPUT_TOO_SHORT' };
    }

    const normalized = text.trim().toLowerCase();

    // 1. Primeiro, tenta cálculo matemático (mais específico)
    const mathMatch = normalized.match(/^(?:quanto\s*é\s*)?(\d+)\s*([\+\-\*\/x])\s*(\d+)\s*[=\?]?$/);
    if (mathMatch) {
        const a = parseInt(mathMatch[1]);
        const op = mathMatch[2] === 'x' ? '*' : mathMatch[2];
        const b = parseInt(mathMatch[3]);

        let result = 0;
        switch (op) {
            case '+': result = a + b; break;
            case '-': result = a - b; break;
            case '*': result = a * b; break;
            case '/': result = a / b; break;
        }

        return {
            answered: true,
            response: `O resultado de ${a} ${op} ${b} é **${result}**.`,
            category: 'math',
        };
    }

    // 2. Depois, tenta os padrões de query
    for (const pattern of LOCAL_QUERY_PATTERNS) {
        if (pattern.category === 'math') continue; // Já tratado acima

        for (const regex of pattern.patterns) {
            if (regex.test(text)) {
                const response = pattern.handler(context);

                // v4.1: Se o handler retornou vazio/null, significa que não pôde responder localmente
                if (!response) {
                    return { answered: false, reason: 'LOCAL_DATA_MISSING' };
                }

                return {
                    answered: true,
                    response,
                    category: pattern.category,
                };
            }
        }
    }

    // 3. Não é uma pergunta local
    return {
        answered: false,
        reason: 'NOT_LOCAL_QUERY',
    };
}

/**
 * Verifica se uma pergunta DEVERIA ser respondida localmente
 * (mesmo se ainda não temos o contexto completo)
 */
export function isLocalQuery(text: string): boolean {
    if (!text || text.length < 3) return false;

    for (const pattern of LOCAL_QUERY_PATTERNS) {
        for (const regex of pattern.patterns) {
            if (regex.test(text)) {
                return true;
            }
        }
    }

    return false;
}

export default {
    tryLocalAnswer,
    isLocalQuery,
    LOCAL_QUERY_PATTERNS,
};
