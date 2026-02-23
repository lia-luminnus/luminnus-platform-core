/**
 * LIA Action Handler
 * 
 * Sistema que permite a LIA controlar o dashboard via comandos estruturados.
 * Dispara eventos para atualizar filtros, adicionar widgets, etc.
 */

import {
    WidgetType,
    WidgetConfig,
    DashboardSnapshot,
    LiaActionAck,
    LayoutPatch,
    WidgetReplacePatch,
    WidgetAddPatch,
    PatchValidationResult
} from '../../dashboard-engine/types';

// v4.0: SSOT imports for validation
import {
    isValidWidgetType,
    normalizeWidgetType,
    getWidgetMeta,
    WIDGET_METADATA,
} from '../../dashboard-engine/widgetTypes';
import { isWidgetAllowedInPlan } from './systemManifest';

// ============================================
// Types
// ============================================

export type LiaActionType =
    // Dashboard Control
    | 'DASHBOARD_ADD_WIDGET'
    | 'DASHBOARD_REMOVE_WIDGET'
    | 'DASHBOARD_UPDATE_WIDGET'
    | 'DASHBOARD_SET_PERIOD'
    | 'DASHBOARD_SET_FILTER'
    | 'DASHBOARD_HIGHLIGHT_WIDGET'
    | 'DASHBOARD_REORGANIZE'
    | 'DASHBOARD_EXPORT'
    // LIA Action Protocol v3.0
    | 'DASHBOARD_REPLACE_WIDGET'
    | 'DASHBOARD_GET_SNAPSHOT'
    // Workspace
    | 'WORKSPACE_CREATE_SHEET'
    | 'WORKSPACE_UPDATE_SHEET'
    | 'WORKSPACE_CREATE_DOC'
    | 'WORKSPACE_SEND_EMAIL'
    | 'WORKSPACE_CREATE_EVENT'
    // Data
    | 'DATA_GET_METRIC'
    | 'DATA_GET_BREAKDOWN'
    // Meta
    | 'META_LIST_CAPABILITIES'
    | 'META_EXPLAIN_FUNCTION';

export interface LiaAction {
    action: LiaActionType;
    params: Record<string, any>;
    confidence?: number;
    message?: string; // Mensagem opcional para exibir ao usuário
}

export interface LiaActionResult {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
}

// ============================================
// Dashboard Actions Interface
// ============================================

export interface DashboardControlActions {
    // Original methods
    addWidget: (type: WidgetType, config?: Partial<WidgetConfig>, position?: { x: number; y: number }) => string | null;
    removeWidget: (widgetId: string) => void;
    updateWidget: (widgetId: string, config: Partial<WidgetConfig>) => void;
    setPeriod: (range: 'today' | 'week' | 'month' | 'year' | 'custom') => void;
    setFilter: (dimension: string, value: any) => void;
    highlightWidget: (widgetId: string) => void;
    reorganize: (layout: 'kpis-top' | 'charts-first' | 'auto') => void;
    exportDashboard: (format: 'pdf' | 'excel') => Promise<void>;
    getAvailableWidgets: () => WidgetType[];
    getCurrentWidgets: () => string[];

    // LIA Action Protocol v3.0 - Transactional Methods
    getSnapshot: () => DashboardSnapshot | null;
    getSnapshotHash: () => string;
    validateLayoutPatch: (patch: LayoutPatch) => PatchValidationResult;
    applyLayoutPatch: (patch: LayoutPatch, preHash: string) => LiaActionAck;
    replaceWidget: (patch: WidgetReplacePatch, preHash: string) => LiaActionAck;
    addWidgetTransactional: (patch: WidgetAddPatch, preHash: string) => LiaActionAck;
    findWidgetsByType: (type: WidgetType) => string[];
    findWidgetsByTitle: (titlePattern: string) => string[];
}

// ============================================
// LIA Capabilities Registry
// ============================================

export const LIA_CAPABILITIES = {
    dashboard: {
        name: 'Controle do Dashboard',
        description: 'Adicionar, remover e modificar widgets do painel',
        functions: [
            { name: 'DASHBOARD_ADD_WIDGET', desc: 'Adiciona um novo gráfico ou KPI' },
            { name: 'DASHBOARD_REMOVE_WIDGET', desc: 'Remove um widget existente' },
            { name: 'DASHBOARD_UPDATE_WIDGET', desc: 'Altera configurações de um widget' },
            { name: 'DASHBOARD_REPLACE_WIDGET', desc: 'Substitui um widget por outro tipo (mantém posição)' },
            { name: 'DASHBOARD_SET_PERIOD', desc: 'Muda o período de análise (hoje, semana, mês, ano)' },
            { name: 'DASHBOARD_SET_FILTER', desc: 'Aplica filtros aos dados' },
            { name: 'DASHBOARD_HIGHLIGHT_WIDGET', desc: 'Destaca e faz scroll para um widget' },
            { name: 'DASHBOARD_GET_SNAPSHOT', desc: 'Obtém snapshot do estado atual do dashboard' },
            { name: 'DASHBOARD_REORGANIZE', desc: 'Reorganiza layout dos widgets' },
        ]
    },
    workspace: {
        name: 'Google Workspace',
        description: 'Criar e editar arquivos no Google Drive',
        functions: [
            { name: 'WORKSPACE_CREATE_SHEET', desc: 'Cria uma nova planilha' },
            { name: 'WORKSPACE_UPDATE_SHEET', desc: 'Atualiza planilha existente' },
            { name: 'WORKSPACE_CREATE_DOC', desc: 'Cria um documento' },
            { name: 'WORKSPACE_SEND_EMAIL', desc: 'Envia email via Gmail' },
            { name: 'WORKSPACE_CREATE_EVENT', desc: 'Agenda evento no Calendar' },
        ]
    },
    data: {
        name: 'Consulta de Dados',
        description: 'Buscar e analisar dados do sistema',
        functions: [
            { name: 'DATA_GET_METRIC', desc: 'Consulta métrica específica' },
            { name: 'DATA_GET_BREAKDOWN', desc: 'Consulta com agrupamento' },
        ]
    },
    meta: {
        name: 'Autoconsciência',
        description: 'Informações sobre capacidades da LIA',
        functions: [
            { name: 'META_LIST_CAPABILITIES', desc: 'Lista todas as capacidades' },
            { name: 'META_EXPLAIN_FUNCTION', desc: 'Explica uma função específica' },
        ]
    }
};

// ============================================
// Action Handler Class
// ============================================

export class LiaActionHandler {
    private dashboardActions: DashboardControlActions | null = null;
    private workspaceService: any = null;
    private onActionExecuted: ((action: LiaAction, result: LiaActionResult) => void) | null = null;

    constructor() {
        console.log('[LiaActionHandler] Initialized');
    }

    /**
     * Conecta o handler às ações do dashboard
     */
    setDashboardActions(actions: DashboardControlActions) {
        this.dashboardActions = actions;
        console.log('[LiaActionHandler] Dashboard actions connected');
    }

    /**
     * Conecta o handler ao serviço de workspace
     */
    setWorkspaceService(service: any) {
        this.workspaceService = service;
        console.log('[LiaActionHandler] Workspace service connected');
    }

    /**
     * Define callback para quando uma ação for executada
     */
    onAction(callback: (action: LiaAction, result: LiaActionResult) => void) {
        this.onActionExecuted = callback;
    }

    /**
     * Despacha uma ação da LIA
     */
    async dispatch(action: LiaAction): Promise<LiaActionResult> {
        console.log('[LiaActionHandler] Dispatching:', action.action, action.params);

        try {
            let result: LiaActionResult;

            switch (action.action) {
                // Dashboard Actions
                case 'DASHBOARD_ADD_WIDGET':
                    result = this.handleAddWidget(action.params);
                    break;
                case 'DASHBOARD_REMOVE_WIDGET':
                    result = this.handleRemoveWidget(action.params);
                    break;
                case 'DASHBOARD_UPDATE_WIDGET':
                    result = this.handleUpdateWidget(action.params);
                    break;
                case 'DASHBOARD_SET_PERIOD':
                    result = this.handleSetPeriod(action.params);
                    break;
                case 'DASHBOARD_SET_FILTER':
                    result = this.handleSetFilter(action.params);
                    break;
                case 'DASHBOARD_HIGHLIGHT_WIDGET':
                    result = this.handleHighlightWidget(action.params);
                    break;

                // LIA Action Protocol v3.0 - Transactional Actions
                case 'DASHBOARD_GET_SNAPSHOT':
                    result = this.handleGetSnapshot();
                    break;
                case 'DASHBOARD_REPLACE_WIDGET':
                    result = this.handleReplaceWidget(action.params);
                    break;
                case 'DASHBOARD_REORGANIZE':
                    result = this.handleReorganize(action.params);
                    break;

                // Meta Actions
                case 'META_LIST_CAPABILITIES':
                    result = this.handleListCapabilities();
                    break;
                case 'META_EXPLAIN_FUNCTION':
                    result = this.handleExplainFunction(action.params);
                    break;

                // Workspace Actions (delegated to service)
                case 'WORKSPACE_CREATE_SHEET':
                case 'WORKSPACE_UPDATE_SHEET':
                case 'WORKSPACE_CREATE_DOC':
                case 'WORKSPACE_SEND_EMAIL':
                case 'WORKSPACE_CREATE_EVENT':
                    result = await this.handleWorkspaceAction(action);
                    break;

                default:
                    result = { success: false, error: `Ação desconhecida: ${action.action}` };
            }

            // Notify listeners
            if (this.onActionExecuted) {
                this.onActionExecuted(action, result);
            }

            return result;

        } catch (error: any) {
            console.error('[LiaActionHandler] Error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // Dashboard Handlers
    // ============================================

    private handleAddWidget(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const { type, widgetType, config, position } = params;
        const rawType = type || widgetType;

        // v4.0: Validação SSOT - Normalizar e verificar tipo
        console.log('🧩 [LIA-ACTION] DASHBOARD_ADD_WIDGET (Transactional)', { rawType, config });

        const normalizedType = normalizeWidgetType(rawType);
        if (!normalizedType) {
            console.log('❌ [VALIDATION] UNKNOWN_WIDGET_TYPE:', rawType);
            return {
                success: false,
                error: `Widget tipo "${rawType}" não reconhecido.`,
                data: {
                    suggestion: 'Tipos disponíveis: pie_chart, bar_grouped, line_timeseries, table_rank, kpi_card'
                }
            };
        }

        // v4.0: Verificar permissão no plano (default: start)
        const plan = (window as any).__liaTenantPlan || 'start';
        if (!isWidgetAllowedInPlan(normalizedType, plan)) {
            const meta: any = getWidgetMeta(normalizedType);
            console.log('❌ [VALIDATION] NOT_ALLOWED_BY_PLAN:', normalizedType, 'requires', meta?.planRequired);
            return {
                success: false,
                error: `Widget "${meta?.name || normalizedType}" requer plano ${meta?.planRequired || 'superior'}.`,
                data: { suggestion: `Faça upgrade para o plano ${meta?.planRequired} para usar este widget.` }
            };
        }

        console.log('✅ [VALIDATION] ok - type:', normalizedType);

        // v8.5: Execução Transacional com Protocolo de ACK
        const preHash = this.dashboardActions.getSnapshotHash();
        const patch: WidgetAddPatch = {
            type: 'widget_add',
            widget_type: normalizedType,
            widget_config: config,
            position
        };

        const ack = this.dashboardActions.addWidgetTransactional(patch, preHash);

        if (ack.status === 'applied') {
            const meta = getWidgetMeta(normalizedType);
            console.log('📣 [ACK] status=applied action=ADD type=', normalizedType);
            return {
                success: true,
                message: `✅ Widget "${meta?.name || normalizedType}" adicionado ao dashboard com sucesso!`,
                data: { ack, type: normalizedType }
            };
        } else {
            console.log('📣 [ACK] status=rejected reason=', ack.reason);
            return {
                success: false,
                error: ack.reason || 'Falha ao adicionar widget (conflito de estado)',
                data: { ack }
            };
        }
    }

    private handleRemoveWidget(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const { widgetId } = params;
        this.dashboardActions.removeWidget(widgetId);

        return {
            success: true,
            message: `Widget removido do dashboard`
        };
    }

    private handleUpdateWidget(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const { widgetId, config } = params;
        this.dashboardActions.updateWidget(widgetId, config);

        return {
            success: true,
            message: `Widget atualizado`
        };
    }

    private handleSetPeriod(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const { range } = params;
        this.dashboardActions.setPeriod(range);

        const rangeLabels: Record<string, string> = {
            today: 'hoje',
            week: 'esta semana',
            month: 'este mês',
            year: 'este ano'
        };

        return {
            success: true,
            message: `Período alterado para ${rangeLabels[range] || range}`
        };
    }

    private handleSetFilter(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const { dimension, value } = params;
        this.dashboardActions.setFilter(dimension, value);

        return {
            success: true,
            message: `Filtro aplicado: ${dimension} = ${value}`
        };
    }

    private handleHighlightWidget(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const { widgetId } = params;
        this.dashboardActions.highlightWidget(widgetId);

        return {
            success: true,
            message: `Widget destacado`
        };
    }

    // ============================================
    // Meta Handlers
    // ============================================

    private handleListCapabilities(): LiaActionResult {
        const capabilities = Object.values(LIA_CAPABILITIES).map(cat => ({
            name: cat.name,
            description: cat.description,
            functionCount: cat.functions.length
        }));

        return {
            success: true,
            data: capabilities,
            message: this.formatCapabilitiesMessage()
        };
    }

    private formatCapabilitiesMessage(): string {
        let msg = 'Minhas capacidades:\n\n';
        Object.values(LIA_CAPABILITIES).forEach(cat => {
            msg += `📌 **${cat.name}**\n`;
            cat.functions.forEach(fn => {
                msg += `  • ${fn.desc}\n`;
            });
            msg += '\n';
        });
        return msg;
    }

    private handleExplainFunction(params: any): LiaActionResult {
        const { functionName } = params;

        for (const cat of Object.values(LIA_CAPABILITIES)) {
            const fn = cat.functions.find(f => f.name === functionName);
            if (fn) {
                return {
                    success: true,
                    message: `**${fn.name}**\n${fn.desc}\n\nCategoria: ${cat.name}`
                };
            }
        }

        return {
            success: false,
            error: `Função "${functionName}" não encontrada`
        };
    }

    // ============================================
    // LIA Action Protocol v3.0 - Transactional Handlers
    // ============================================

    private handleGetSnapshot(): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        const snapshot = this.dashboardActions.getSnapshot();
        if (!snapshot) {
            return { success: false, error: 'Dashboard não carregado' };
        }

        console.log('🧩 [LIA-ACTION] DASHBOARD_GET_SNAPSHOT', { widgetCount: snapshot.widgetCount });

        // Formatar lista de widgets para a LIA
        const widgetList = snapshot.widgets.map(w =>
            `- **${w.title}** (tipo: ${w.type}, id: ${w.id})`
        ).join('\n');

        return {
            success: true,
            data: snapshot,
            message: `Dashboard atual tem ${snapshot.widgetCount} widgets:\n${widgetList}`
        };
    }

    private handleReplaceWidget(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        console.log('🧩 [LIA-ACTION] DASHBOARD_REPLACE_WIDGET', params);

        // Se não tem targetWidgetId, tentar encontrar por tipo ou título
        let targetId = params.targetWidgetId;

        if (!targetId && params.targetWidgetType) {
            const matches = this.dashboardActions.findWidgetsByType(params.targetWidgetType);
            if (matches.length === 1) {
                targetId = matches[0];
            } else if (matches.length > 1) {
                return {
                    success: false,
                    error: `Encontrei ${matches.length} widgets do tipo "${params.targetWidgetType}". Qual você quer substituir?`,
                    data: { matches }
                };
            } else {
                return {
                    success: false,
                    error: `Não encontrei nenhum widget do tipo "${params.targetWidgetType}"`
                };
            }
        }

        if (!targetId && params.targetWidgetTitle) {
            const matches = this.dashboardActions.findWidgetsByTitle(params.targetWidgetTitle);
            if (matches.length === 1) {
                targetId = matches[0];
            } else if (matches.length > 1) {
                return {
                    success: false,
                    error: `Encontrei ${matches.length} widgets com "${params.targetWidgetTitle}" no título. Qual você quer substituir?`,
                    data: { matches }
                };
            } else {
                return {
                    success: false,
                    error: `Não encontrei nenhum widget com "${params.targetWidgetTitle}" no título`
                };
            }
        }

        if (!targetId) {
            return {
                success: false,
                error: 'Preciso saber qual widget substituir. Informe o ID, tipo ou título do widget.'
            };
        }

        // Criar patch e aplicar
        const patch: WidgetReplacePatch = {
            type: 'widget_replace',
            target_widget_id: targetId,
            new_widget_type: params.newWidgetType,
            new_widget_config: params.newWidgetConfig,
            keep_position: params.keepPosition !== false
        };

        const preHash = this.dashboardActions.getSnapshotHash();
        const ack = this.dashboardActions.replaceWidget(patch, preHash);

        if (ack.status === 'applied') {
            return {
                success: true,
                message: `Widget substituído com sucesso! Agora você tem um ${params.newWidgetType} no lugar do widget anterior.`,
                data: { ack }
            };
        } else {
            return {
                success: false,
                error: ack.reason || 'Falha ao substituir widget',
                data: { ack }
            };
        }
    }

    private handleReorganize(params: any): LiaActionResult {
        if (!this.dashboardActions) {
            return { success: false, error: 'Dashboard não conectado' };
        }

        console.log('🧩 [LIA-ACTION] DASHBOARD_REORGANIZE', params);

        const { layout } = params;
        this.dashboardActions.reorganize(layout || 'auto');

        return {
            success: true,
            message: `Dashboard reorganizado no modo "${layout || 'auto'}".`
        };
    }

    // ============================================
    // Workspace Handler
    // ============================================

    private async handleWorkspaceAction(action: LiaAction): Promise<LiaActionResult> {
        if (!this.workspaceService) {
            return { success: false, error: 'Serviço de Workspace não conectado' };
        }

        // Delega para o serviço de workspace existente
        try {
            const result = await this.workspaceService.execute(action.action, action.params);
            return {
                success: true,
                data: result,
                message: action.message || 'Ação executada com sucesso'
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

// ============================================
// Singleton Instance
// ============================================

export const liaActionHandler = new LiaActionHandler();

export default LiaActionHandler;
