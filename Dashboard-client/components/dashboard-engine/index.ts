/**
 * Dashboard Engine - Index
 * 
 * Exporta todos os componentes do Dashboard Engine
 */

// Types
export * from './types';

// Context
export { DashboardProvider, useDashboard } from './DashboardContext';

// Components
export { default as DashboardRenderer } from './DashboardRenderer';
export { default as DashboardEditor } from './DashboardEditor';
export { default as LiaActionDispatcher, liaActionBus, useLiaActionDispatch } from './LiaActionDispatcher';

// Widget Registry
export {
    renderWidget,
    getWidgetComponent,
    getWidgetsByCategory,
    isWidgetAvailableForPlan,
    getSupportedMetrics,
    WIDGET_METADATA
} from './WidgetRegistry';

// LIA Actions
export {
    LiaActionType,
    parseLiaIntent,
    createAction,
    isValidAction,
} from './liaActions';
export type { LiaAction, SetDateRangePayload, FilterUpdatePayload, HighlightWidgetPayload, NavigatePayload } from './liaActions';
