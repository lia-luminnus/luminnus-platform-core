/**
 * Dashboard Engine - Types
 * 
 * Tipos TypeScript para o sistema de dashboard config-driven
 * Estes tipos espelham a estrutura do config_json armazenado no banco
 */

// ============================================
// Widget Types
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

export type MetricKey =
    | 'cash_in'
    | 'cash_out'
    | 'net_cash'
    | 'transaction_count'
    | 'revenue_by_category'
    | 'expenses_by_category'
    | 'transactions_recent'
    | 'deals_funnel'
    | 'deals_count'
    | 'deals_value'
    | 'contacts_count'
    | 'invoices_pending'
    | string; // Permite métricas custom

export type DateRangePreset =
    | 'today'
    | 'yesterday'
    | 'last_7_days'
    | 'last_30_days'
    | 'this_month'
    | 'last_month'
    | 'this_quarter'
    | 'this_year'
    | 'custom';

// ============================================
// Layout
// ============================================

export interface LayoutItem {
    id: string;
    i?: string; // Alias for react-grid-layout compatibility
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
}

// ============================================
// Widget Config
// ============================================

export interface WidgetConfig {
    type: WidgetType;
    title: string;
    metric?: MetricKey;
    metrics?: MetricKey[];
    dimension?: string;
    icon?: string;
    color?: string;
    compareTo?: 'previous_period' | 'same_period_last_year' | 'none';
    config?: Record<string, any>; // Configurações específicas do widget
}

// ============================================
// Global Filters
// ============================================

export interface GlobalFilters {
    dateRange: DateRangePreset;
    customDateStart?: string;
    customDateEnd?: string;
    currency: string;
    timezone: string;
    filters?: Record<string, string | string[]>;
}

// ============================================
// Dashboard Config (main structure)
// ============================================

export interface DashboardConfig {
    globals: GlobalFilters;
    layout: LayoutItem[];
    widgets: Record<string, WidgetConfig>;
    enabledWidgets?: WidgetType[];
    enabledMetrics?: MetricKey[];
}

// ============================================
// Template Override (for inheritance)
// ============================================

export interface TemplateOverrides {
    widgets?: Record<string, Partial<WidgetConfig>>;
    labels?: Record<string, string>;
    ctas?: Record<string, string>;
    layout?: LayoutItem[];
}

export interface DashboardTemplate {
    id: string;
    segment_key: string;
    name: string;
    description?: string;
    is_base: boolean;
    base_template_key?: string;
    template_json: DashboardConfig & { overrides?: TemplateOverrides };
    plan_min: string;
}

// ============================================
// Tenant Dashboard
// ============================================

export interface TenantDashboard {
    id: string;
    tenant_id: string;
    segment_key: string;
    name: string;
    version: number;
    config_json: DashboardConfig;
    is_active: boolean;
    created_from_template_id?: string;
    created_at: string;
    updated_at: string;
}

// ============================================
// Widget Props (passed to widget components)
// ============================================

export interface WidgetProps {
    id: string;
    config: WidgetConfig;
    globals: GlobalFilters;
    data?: any;
    loading?: boolean;
    error?: string | null;
    lockedReason?: string;
    isEditMode?: boolean;
    onEdit?: () => void;
    onRemove?: () => void;
}

// ============================================
// Metric Data Response
// ============================================

export interface MetricTimeseriesPoint {
    period: string;
    period_start: string;
    period_end: string;
    value: number;
    previous_value: number;
    change_percent: number;
}

export interface MetricBreakdownItem {
    dimension_value: string;
    value: number;
    percentage: number;
    count: number;
}

export interface MetricKPISummary {
    metric_key: string;
    current_value: number;
    previous_value: number;
    change_percent: number;
    trend: 'up' | 'down' | 'stable';
}

// ============================================
// LIA Actions (Chat-to-UI)
// ============================================

export type LiaActionType =
    | 'SET_DATE_RANGE'
    | 'FILTER_UPDATE'
    | 'HIGHLIGHT_WIDGET'
    | 'NAVIGATE'
    | 'REFRESH_WIDGET'
    | 'OPEN_INTEGRATION_MODAL'
    // New Dashboard Control Actions (LIA-Action Protocol)
    | 'DASHBOARD_ADD_WIDGET'
    | 'DASHBOARD_REMOVE_WIDGET'
    | 'DASHBOARD_UPDATE_WIDGET'
    | 'DASHBOARD_SET_PERIOD'
    | 'DASHBOARD_REORGANIZE'
    | 'DASHBOARD_EXPORT'
    // LIA Action Protocol v3.0 - Transactional Actions
    | 'DASHBOARD_REPLACE_WIDGET'
    | 'DASHBOARD_GET_SNAPSHOT';

export interface LiaAction {
    type: LiaActionType;
    payload: Record<string, any>;
}

export interface SetDateRangeAction extends LiaAction {
    type: 'SET_DATE_RANGE';
    payload: {
        value: DateRangePreset;
        customStart?: string;
        customEnd?: string;
    };
}

export interface FilterUpdateAction extends LiaAction {
    type: 'FILTER_UPDATE';
    payload: {
        key: string;
        value: string | string[] | null;
    };
}

export interface HighlightWidgetAction extends LiaAction {
    type: 'HIGHLIGHT_WIDGET';
    payload: {
        widgetId: string;
        duration?: number;
    };
}

export interface NavigateAction extends LiaAction {
    type: 'NAVIGATE';
    payload: {
        route: string;
    };
}

export interface RefreshWidgetAction extends LiaAction {
    type: 'REFRESH_WIDGET';
    payload: {
        widgetId: string;
    };
}

export interface OpenIntegrationModalAction extends LiaAction {
    type: 'OPEN_INTEGRATION_MODAL';
    payload: {
        provider: string;
    };
}

// ============================================
// Widget Registry Entry
// ============================================

export interface WidgetRegistryEntry {
    widget_key: WidgetType;
    name: string;
    description?: string;
    category: 'kpi' | 'chart' | 'table' | 'special';
    icon: string;
    default_config: Record<string, any>;
    supported_metrics: MetricKey[];
    plan_min: string;
}

// ============================================
// Dashboard Context State
// ============================================

export interface DashboardState {
    config: DashboardConfig | null;
    isLoading: boolean;
    isEditMode: boolean;
    highlightedWidgetId: string | null;
    pendingChanges: boolean;
    error: string | null;
}

export type DashboardAction =
    | { type: 'SET_CONFIG'; payload: DashboardConfig }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_EDIT_MODE'; payload: boolean }
    | { type: 'HIGHLIGHT_WIDGET'; payload: string | null }
    | { type: 'UPDATE_LAYOUT'; payload: LayoutItem[] }
    | { type: 'UPDATE_WIDGET'; payload: { id: string; config: Partial<WidgetConfig> } }
    | { type: 'ADD_WIDGET'; payload: { id: string; config: WidgetConfig; layout: LayoutItem } }
    | { type: 'REMOVE_WIDGET'; payload: string }
    | { type: 'UPDATE_GLOBALS'; payload: Partial<GlobalFilters> }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'MARK_SAVED' };

// ============================================
// LIA Action Protocol v3.0 - Transactional Types
// ============================================

/**
 * Snapshot do estado atual do dashboard
 * Enviado para a LIA para que ela saiba quais widgets existem
 */
export interface DashboardSnapshot {
    hash: string;
    widgets: Array<{
        id: string;
        type: WidgetType;
        title: string;
        position: { x: number; y: number; w: number; h: number };
    }>;
    widgetCount: number;
    active_widget_types: WidgetType[];
    layout_summary: string;
    summary: string;
}

/**
 * Requisição de ação estruturada da LIA
 * Inclui hash para detecção de conflito de concorrência
 */
export interface LiaActionRequest {
    action_id: string;
    action: LiaActionType | 'DASHBOARD_REPLACE_WIDGET' | 'DASHBOARD_GET_SNAPSHOT';
    scope: {
        tenant_id: string;
        dashboard_id: 'active' | string;
    };
    pre_state_hash: string;
    params: Record<string, any>;
    policy: {
        plan: 'start' | 'plus' | 'pro';
        mode: 'copilot' | 'autopilot';
        dry_run: boolean;
    };
}

/**
 * Códigos de motivo padronizados para o protocolo ACK
 */
export type LiaActionReasonCode =
    | 'SUCCESS'
    | 'SNAPSHOT_TIMEOUT'
    | 'HASH_MISMATCH'
    | 'WIDGET_TYPE_UNKNOWN'
    | 'WIDGET_NOT_FOUND'
    | 'REGISTRY_DIVERGENCE'
    | 'ACTION_NOT_SUPPORTED'
    | 'PERMISSION_DENIED'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';

/**
 * ACK de resposta para a LIA
 * Informa sucesso/falha e o novo estado
 */
export interface LiaActionAck {
    action_id: string;
    status: 'applied' | 'rejected' | 'partial';
    reason?: string;
    reason_code?: LiaActionReasonCode;
    pre_state_hash: string;
    post_state_hash: string;
    snapshot?: DashboardSnapshot;
    timestamp: number;
}

/**
 * Patch de layout incremental
 * Não substitui o layout inteiro, apenas move widgets específicos
 */
export interface LayoutPatch {
    type: 'layout_patch';
    moves: Array<{
        id: string;
        x: number;
        y: number;
        w: number;
        h: number;
    }>;
    constraints: {
        grid_cols: number;
        no_overlap: boolean;
        compact_type: 'vertical' | 'horizontal' | 'none';
    };
}

/**
 * Patch para substituir um widget por outro
 * Mantém a posição original se keep_position = true
 */
export interface WidgetReplacePatch {
    type: 'widget_replace';
    target_widget_id: string;
    new_widget_type: WidgetType;
    new_widget_config?: Partial<WidgetConfig>;
    keep_position: boolean;
}

/**
 * Patch para adicionar um novo widget
 */
export interface WidgetAddPatch {
    type: 'widget_add';
    widget_type: WidgetType;
    widget_config?: Partial<WidgetConfig>;
    position?: { x: number; y: number; w?: number; h?: number };
}

/**
 * Resultado de validação de patch
 */
export interface PatchValidationResult {
    ok: boolean;
    errors: string[];
}

