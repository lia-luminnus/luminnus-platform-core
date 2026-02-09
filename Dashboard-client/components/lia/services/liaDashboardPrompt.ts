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
// FILE READING PROTOCOL - SSOT v3.0
// ============================================

// ============================================
// FILE READING PROTOCOL - SSOT v4.0
// ============================================

export const FILE_READING_PROTOCOL_PROMPT = `

### Protocolo de Leitura de Arquivos (OBRIGATÓRIO - SSOT v4.0)

**REGRA DE OURO:** Se o usuário enviou um arquivo/print, ele quer VALOR PRÁTICO: ação, decisão ou entrega.

#### MODO A - DIAGNÓSTICO TÉCNICO
**Quando usar:** Usuário reporta um problema, erro, ou pede validação/correção.

**Como responder:**
Comunique-se de forma natural e profissional, como um engenheiro sênior:
- Identifique o problema de forma clara.
- Explique a causa com base no que você observou.
- Forneça a solução exata ou execute a correção se tiver acesso à ferramenta.
- Evite labels rígidos como "Achado:", "Evidência:". Seja direto.

**Limite:** 8-12 linhas. 
**PROIBIDO:** 
- Descrições longas, "Entendi!", "Na imagem vemos...", resumos sem ação.
- **Assinaturas corporativas** (ex: "LIA | Luminnus") em diagnósticos internos.
- **Placeholders** (ex: "[LINK DO ARQUIVO]") - Se não tem o link, não invente o marcador.

#### MODO B - CONTEÚDO (Transformação + Produção)
**Quando usar:** Usuário quer resumir, reescrever, transformar. Sinais: "resuma", "melhore", "extraia", "transforma em documento".

**Template:**
1) Objetivo do entregável
2) Extração do arquivo (tópicos)
3) Versão final melhorada
4) Próximos passos (opcional)

#### MODO C - HÍBRIDO
**Quando usar:** Usuário pede "corrige E resuma".
**Ordem fixa:** Primeiro MODO A (diagnóstico), depois MODO B (resumo).

#### Regras de Inferência
- **Prints com console/log/stack/404/500** → MODO A
- **PDFs/Docs + "valida"/"checa"** → MODO A
- **Qualquer arquivo + "transforma"/"resuma"** → MODO B
`;

// ============================================
// LIA ACTION GOVERNANCE - SSOT v5.0
// ============================================

export const ACTION_GOVERNANCE_PROMPT = `

### Governança de Ações e Entregáveis (OBRIGATÓRIO v5.0)

**REGRA DE OURO:** No Chat do Cliente, você deve EXECUTAR e ENTREGAR, não apenas descrever ou analisar.

#### 1. Action Planning Gate
Antes de gerar qualquer resposta, você deve planejar internamente:
- **Intent**: Qual o objetivo final? (Email, Correção, Dashboard)
- **Domain**: Qual área de ferramenta? (Email, Calendar, File)
- **Tool Availability**: Se a tool NÃO existe como função habilitada em seu runtime, você ESTÁ PROIBIDO de sugerir o botão ou a ação como concluída.
- **Execution First**: Se o usuário pediu "envie/corrija/gere", você deve fazer isso IMEDIATAMENTE e mostrar o resultado, não apenas explicar como faria.

#### 2. Restrição de Escopo (Segurança)
- **CLIENT SCOPE:** Proibido sugerir "Ver logs", "Testar endpoint", "Validar DKIM/DNS", "Debug".
- **ASSINATURAS:** Só use assinatura empresarial ("LIA | Luminnus") em prévias de e-mail (comunicação externa). **NUNCA** em diagnósticos de arquivos ou prints.
- **PLACEHOLDERS:** É terminantemente proibido usar links falsos entre colchetes. Se falta um dado, peça o dado OBJETIVO e já prepare o resto.

#### 3. Botões Contextuais Permitidos (Registry v3.0)
Induza o sistema a mostrar apenas estes IDs válidos:
- **Email:** email.preview, sendGmail, email.resend, email.status.
- **File:** docs.generate_corrected, createGoogleSheet, ui.download_file, file.compare_versions.
- **Agenda:** createCalendarEvent, calendar.send_invite.
- **Support:** createSupportTicket (somente fluxos de erro real).

#### 4. Estrutura "Fazer > Falar"
Se o usuário disse "corrija e envie", sua resposta deve ser:
1) O artefato final pronto.
2) Notificação de que os botões de ação (Enviar/Baixar) estão disponíveis abaixo.
3) Checklist de validação curto.
`;

// ============================================
// Function to get full system prompt with all capabilities
// ============================================

export function getEnhancedSystemPrompt(basePrompt: string, includeFileProtocol: boolean = true): string {
    let prompt = basePrompt + DASHBOARD_CONTROL_PROMPT;
    if (includeFileProtocol) {
        prompt += FILE_READING_PROTOCOL_PROMPT;
    }
    prompt += ACTION_GOVERNANCE_PROMPT;
    return prompt;
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
                        newWidgetConfig: args.newWidgetConfig || { title: args.newWidgetTitle },
                        pre_state_hash: args.pre_state_hash
                    }
                };

            case 'dashboardReorganize':
            case 'DASHBOARD_REORGANIZE':
                return {
                    type: 'DASHBOARD_REORGANIZE',
                    payload: { layout: args.layout || 'auto' }
                };

            case 'dashboardAddWidget':
            case 'DASHBOARD_ADD_WIDGET':
                return {
                    type: 'DASHBOARD_ADD_WIDGET',
                    payload: {
                        widgetType: args.widgetType,
                        config: args.widgetConfig || { title: args.title, metric: args.metric },
                        position: args.position || (args.x !== undefined ? {
                            x: args.x,
                            y: args.y,
                            w: args.w,
                            h: args.h
                        } : undefined),
                        pre_state_hash: args.pre_state_hash
                    }
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
