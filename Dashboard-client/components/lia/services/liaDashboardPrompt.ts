/**
 * LIA System Prompt - Dashboard Control Capabilities
 * 
 * Este arquivo define o system prompt que dá à LIA consciência
 * das suas capacidades de controle do dashboard.
 * 
 * ARQUIVO NOVO - Não modifica nenhum arquivo existente
 */

// ============================================
// Dashboard Control Functions Definition
// ============================================

export const DASHBOARD_FUNCTIONS = [
    {
        name: "modify_dashboard",
        description: "Modifica o dashboard do usuário. Use quando o usuário pedir para adicionar, remover ou alterar widgets/gráficos.",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["add_widget", "remove_widget", "update_widget", "set_period", "reorganize"],
                    description: "Ação a executar no dashboard"
                },
                widget_type: {
                    type: "string",
                    enum: [
                        "kpi_card", "line_timeseries", "bar_grouped", "donut_breakdown",
                        "table_rank", "table_transactions", "pie_chart", "heatmap_calendar",
                        "funnel", "gauge", "area_timeseries", "bar_horizontal"
                    ],
                    description: "Tipo de widget (para add_widget)"
                },
                widget_id: {
                    type: "string",
                    description: "ID do widget (para remove/update)"
                },
                config: {
                    type: "object",
                    description: "Configurações do widget (título, cor, métrica)"
                },
                period: {
                    type: "string",
                    enum: ["today", "week", "month", "year"],
                    description: "Período para set_period"
                },
                layout: {
                    type: "string",
                    enum: ["kpis-top", "charts-first", "auto"],
                    description: "Tipo de reorganização"
                }
            },
            required: ["action"]
        }
    }
];

// ============================================
// System Prompt Extension for Dashboard Control
// ============================================

export const DASHBOARD_CONTROL_PROMPT = `

### Dashboard: Capacidades e Widgets Disponíveis

Você tem controle total sobre o dashboard do usuário. Atualmente, existem **12 tipos de widgets** disponíveis para uso:

1.  **kpi_card**: Cartão de métrica (Receita, Saldo, Clientes).
2.  **line_timeseries**: Gráfico de linha para tendências temporais.
3.  **bar_grouped**: Gráfico de barras agrupadas.
4.  **donut_breakdown**: Gráfico de rosca para distribuição (ex: Despesas por Categoria).
5.  **pie_chart**: Gráfico de pizza clássico.
6.  **table_rank**: Tabela de ranking (quem mais compra, produtos mais vendidos).
7.  **table_transactions**: Tabela detalhada de transações financeiras.
8.  **heatmap_calendar**: Mapa de calor para frequência de eventos.
9.  **funnel**: Gráfico de funil para conversões.
10. **gauge**: Medidor de performance (velocímetro).
11. **area_timeseries**: Gráfico de área preenchida para volume.
12. **bar_horizontal**: Barras horizontais para comparação.

### REGRAS CRÍTICAS DE INTERAÇÃO (GOVERNANÇA):
1. **Consciência do Sistema**: Se o usuário perguntar "quantos gráficos existem", sua resposta DEVE ser baseada no snapshot real do dashboard que você recebe.
2. **ADD vs REPLACE**: 
   - Use \`add_widget\` para novas inclusões (ex: "adicione", "coloque", "insira").
   - Use \`replace_widget\` APENAS se o usuário quiser TROCAR um específico (ex: "troque a tabela por pizza").
   - **IMPORTANTE**: \`replace_widget\` EXIGE que você identifique o alvo (targetWidgetId ou targetWidgetTitle) via snapshot. Se não houver alvo claro, use \`add_widget\`.
3. **Mapeamento de Nomes**: "Pizza" e "Donut" são ambos representados pelo tipo \`pie_chart\` ou \`donut_breakdown\`. Escolha o mais adequado.
4. **Confirmação Clara**: Confirme sempre qual ação executou.

### LIA Action Protocol v3.0:
Você pode usar a função \`modify_dashboard\` para:
- \`add_widget\`: Cria um NOVO widget em um espaço vazio. (Use para: "adicione", "coloque")
- \`replace_widget\`: SUBSTITUI um widget existente. **Exige target_widget_id**. (Use para: "troque esse por", "no lugar de X coloque Y")
- \`remove_widget\`: Remove pelo ID.
- \`reorganize\`: Mudar layout.
- \`dashboard_get_snapshot\`: Ver o que está na tela agora. (Use sempre antes de substituir)
`;

// ============================================
// Function to get full system prompt with dashboard capabilities
// ============================================

export function getEnhancedSystemPrompt(basePrompt: string): string {
    return basePrompt + DASHBOARD_CONTROL_PROMPT;
}

// ============================================
// Mapper: GPT Function Call → LIA Action
// ============================================

export interface GPTFunctionCall {
    name: string;
    arguments: string;
}

export interface LiaActionPayload {
    type: string;
    payload: Record<string, any>;
}

export function mapFunctionCallToLiaAction(call: GPTFunctionCall): LiaActionPayload | null {
    try {
        const args = typeof call.arguments === 'string'
            ? JSON.parse(call.arguments)
            : call.arguments;

        // ============================================
        // LIA Action Protocol v3.0 - Direct Actions from Backend
        // O backend retorna: { action: 'DASHBOARD_REPLACE_WIDGET', params: {...} }
        // ============================================
        if (args.action && args.action.startsWith('DASHBOARD_')) {
            return {
                type: args.action,
                payload: args.params || args
            };
        }

        // ============================================
        // Tool-based calls (dashboardReplaceWidget, etc)
        // ============================================
        switch (call.name) {
            case 'dashboardGetSnapshot':
            case 'DASHBOARD_GET_SNAPSHOT':
                return {
                    type: 'DASHBOARD_GET_SNAPSHOT',
                    payload: {}
                };

            case 'dashboardReplaceWidget':
            case 'DASHBOARD_REPLACE_WIDGET':
                return {
                    type: 'DASHBOARD_REPLACE_WIDGET',
                    payload: {
                        targetWidgetType: args.targetWidgetType,
                        targetWidgetTitle: args.targetWidgetTitle,
                        newWidgetType: args.newWidgetType,
                        newWidgetConfig: args.newWidgetConfig || { title: args.newWidgetTitle }
                    }
                };

            case 'dashboardReorganize':
            case 'DASHBOARD_REORGANIZE':
                return {
                    type: 'DASHBOARD_REORGANIZE',
                    payload: { layout: args.layout || 'auto' }
                };

            case 'DASHBOARD_ADD_WIDGET':
                return {
                    type: 'DASHBOARD_ADD_WIDGET',
                    payload: args
                };

            case 'DASHBOARD_REMOVE_WIDGET':
                return {
                    type: 'DASHBOARD_REMOVE_WIDGET',
                    payload: args
                };

            case 'DASHBOARD_UPDATE_WIDGET':
                return {
                    type: 'DASHBOARD_UPDATE_WIDGET',
                    payload: args
                };

            case 'DASHBOARD_SET_PERIOD':
                return {
                    type: 'DASHBOARD_SET_PERIOD',
                    payload: args
                };

            // ============================================
            // Legacy modify_dashboard function
            // ============================================
            case 'modify_dashboard':
                switch (args.action) {
                    case 'add_widget':
                        return {
                            type: 'DASHBOARD_ADD_WIDGET',
                            payload: {
                                widgetType: args.widget_type,
                                config: args.config || {}
                            }
                        };

                    case 'remove_widget':
                        return {
                            type: 'DASHBOARD_REMOVE_WIDGET',
                            payload: { widgetId: args.widget_id }
                        };

                    case 'update_widget':
                        return {
                            type: 'DASHBOARD_UPDATE_WIDGET',
                            payload: {
                                widgetId: args.widget_id,
                                config: args.config
                            }
                        };

                    case 'set_period':
                        return {
                            type: 'DASHBOARD_SET_PERIOD',
                            payload: { range: args.period }
                        };

                    case 'reorganize':
                        return {
                            type: 'DASHBOARD_REORGANIZE',
                            payload: { layout: args.layout }
                        };

                    case 'replace_widget':
                        return {
                            type: 'DASHBOARD_REPLACE_WIDGET',
                            payload: {
                                targetWidgetType: args.target_widget_type,
                                targetWidgetTitle: args.target_widget_title,
                                newWidgetType: args.new_widget_type,
                                newWidgetConfig: args.config
                            }
                        };

                    default:
                        console.warn('[LIA] Unknown dashboard action:', args.action);
                        return null;
                }

            default:
                // Não é uma função de dashboard conhecida
                return null;
        }
    } catch (err) {
        console.error('[LIA] Failed to parse function arguments:', err);
        return null;
    }
}

export default {
    DASHBOARD_FUNCTIONS,
    DASHBOARD_CONTROL_PROMPT,
    getEnhancedSystemPrompt,
    mapFunctionCallToLiaAction
};
