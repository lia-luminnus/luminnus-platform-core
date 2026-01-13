/**
 * LIA Action Dispatcher
 * 
 * React component that listens for LIA Actions and dispatches them to the dashboard
 * Integrates with DashboardContext and handles side effects
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from './DashboardContext';
import { LiaAction, LiaActionType, parseLiaIntent, isValidAction } from './liaActions';

// ============================================
// Types
// ============================================

interface LiaActionDispatcherProps {
    onOpenWidgetPicker?: () => void;
    onOpenIntegration?: (provider: string) => void;
    onExportData?: (format: 'csv' | 'xlsx' | 'pdf', widgetId?: string) => Promise<void>;
    onShowDetail?: (entityType: string, entityId: string) => void;

    // Optional: subscribe to external action source
    actionSource?: {
        subscribe: (callback: (action: LiaAction) => void) => () => void;
    };
}

// ============================================
// Global Event Bus for LIA Actions
// ============================================

type ActionListener = (action: LiaAction) => void;

class LiaActionBus {
    private listeners: Set<ActionListener> = new Set();

    subscribe(listener: ActionListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    dispatch(action: LiaAction) {
        console.log('🎯 [LiaActionBus] Dispatching:', action.type, action.payload);
        this.listeners.forEach(listener => listener(action));
    }

    // Convenience method to dispatch from text input
    dispatchFromText(text: string): boolean {
        const action = parseLiaIntent(text);
        if (action) {
            this.dispatch(action);
            return true;
        }
        return false;
    }
}

// Singleton export
export const liaActionBus = new LiaActionBus();

// ============================================
// Hook for external components to dispatch actions
// ============================================

export function useLiaActionDispatch() {
    return useCallback((action: LiaAction | string) => {
        if (typeof action === 'string') {
            liaActionBus.dispatchFromText(action);
        } else {
            liaActionBus.dispatch(action);
        }
    }, []);
}

// ============================================
// Component
// ============================================

function LiaActionDispatcher({
    onOpenWidgetPicker,
    onOpenIntegration,
    onExportData,
    onShowDetail,
    actionSource,
}: LiaActionDispatcherProps) {
    const navigate = useNavigate();
    const {
        state,
        updateGlobals,
        highlightWidget,
        toggleEditMode,
        addWidget
    } = useDashboard();

    // Main action handler
    const handleAction = useCallback((action: LiaAction) => {
        if (!isValidAction(action)) {
            console.warn('[LiaActionDispatcher] Invalid action:', action);
            return;
        }

        console.log('🎮 [LiaActionDispatcher] Handling action:', action.type);

        switch (action.type) {
            case LiaActionType.SET_DATE_RANGE:
                updateGlobals({
                    dateRange: action.payload.value,
                    customDateStart: action.payload.customStart,
                    customDateEnd: action.payload.customEnd,
                });
                break;

            case LiaActionType.FILTER_UPDATE:
                updateGlobals({
                    filters: {
                        ...state.config?.globals?.filters,
                        [action.payload.key]: action.payload.value,
                    },
                });
                break;

            case LiaActionType.CLEAR_FILTERS:
                updateGlobals({
                    filters: {},
                });
                break;

            case LiaActionType.HIGHLIGHT_WIDGET:
                highlightWidget(action.payload.widgetId, action.payload.duration || 3000);

                // Scroll into view if requested
                if (action.payload.scrollIntoView) {
                    const widgetElement = document.getElementById(`widget-${action.payload.widgetId}`);
                    widgetElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                break;

            case LiaActionType.REFRESH_WIDGET:
                // Trigger refetch by updating a timestamp in widget config
                // Widget components should react to this
                console.log('🔄 Refresh widget:', action.payload.widgetId);
                break;

            case LiaActionType.ZOOM_WIDGET:
                // Open widget in modal/fullscreen view
                console.log('🔍 Zoom widget:', action.payload.widgetId);
                break;

            case LiaActionType.NAVIGATE:
                navigate(action.payload.route);
                break;

            case LiaActionType.OPEN_TAB:
                window.open(action.payload.url, '_blank');
                break;

            case LiaActionType.OPEN_INTEGRATION_MODAL:
                onOpenIntegration?.(action.payload.provider);
                break;

            case LiaActionType.OPEN_WIDGET_PICKER:
                onOpenWidgetPicker?.();
                break;

            case LiaActionType.SHOW_DETAIL_VIEW:
                onShowDetail?.(action.payload.entityType, action.payload.entityId);
                break;

            case LiaActionType.TOGGLE_EDIT_MODE:
                toggleEditMode();
                break;

            case LiaActionType.ADD_WIDGET:
                const widgetId = `widget_${Date.now()}`;
                const widgetConfig = {
                    type: action.payload.widgetType,
                    title: action.payload.config?.title || 'Novo Widget',
                    ...action.payload.config,
                };
                const layout = {
                    id: widgetId,
                    x: action.payload.position?.x || 0,
                    y: action.payload.position?.y || 0,
                    w: 6,
                    h: 4,
                };
                addWidget(widgetId, widgetConfig as any, layout);
                break;

            case LiaActionType.REMOVE_WIDGET:
                // Handled by DashboardContext directly
                break;

            case LiaActionType.EXPORT_DATA:
                onExportData?.(action.payload.format, action.payload.widgetId);
                break;

            case LiaActionType.REFRESH_ALL:
                // Trigger global refetch
                window.location.reload(); // Simple approach
                break;

            default:
                console.warn('[LiaActionDispatcher] Unhandled action type:', action.type);
        }
    }, [
        navigate,
        updateGlobals,
        highlightWidget,
        toggleEditMode,
        addWidget,
        onOpenWidgetPicker,
        onOpenIntegration,
        onExportData,
        onShowDetail,
        state.config?.globals?.filters,
    ]);

    // Subscribe to action bus
    useEffect(() => {
        const unsubscribe = liaActionBus.subscribe(handleAction);
        return unsubscribe;
    }, [handleAction]);

    // Subscribe to external action source if provided
    useEffect(() => {
        if (actionSource) {
            const unsubscribe = actionSource.subscribe(handleAction);
            return unsubscribe;
        }
    }, [actionSource, handleAction]);

    // This component doesn't render anything
    return null;
}

export default LiaActionDispatcher;
