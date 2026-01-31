/**
 * Dashboard Context
 * 
 * Gerencia estado global do dashboard config-driven
 * Integra com LIA-Actions e persiste mudanças no backend
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect, useState, ReactNode } from 'react';
import {
    DashboardConfig,
    DashboardState,
    DashboardAction,
    GlobalFilters,
    LayoutItem,
    WidgetConfig,
    WidgetType,
    LiaAction,
    DashboardSnapshot,
    LiaActionAck,
    LayoutPatch,
    WidgetReplacePatch,
    WidgetAddPatch,
    LiaActionReasonCode,
    PatchValidationResult
} from './types';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../store/useAppStore';
import toast from 'react-hot-toast';
import { normalizeWidgetType, isValidWidgetType, getAvailableWidgetsMessage, suggestClosestWidget, WIDGET_METRIC_DEFAULTS } from './widgetTypes';

// ============================================
// Initial State
// ============================================

const initialState: DashboardState = {
    config: null,
    isLoading: true,
    isEditMode: false,
    highlightedWidgetId: null,
    pendingChanges: false,
    error: null,
};

// ============================================
// Reducer
// ============================================

// Helper to migrate legacy widgets (Premium styling updates)
const migrateConfig = (config: DashboardConfig): DashboardConfig => {
    if (!config || !config.widgets) return config;

    const newWidgets = { ...config.widgets };
    let hasChanges = false;

    Object.keys(newWidgets).forEach(id => {
        // Update existing donuts that use the old default radius of 60
        if (newWidgets[id].type === 'donut_breakdown' && (!newWidgets[id].config?.innerRadius || newWidgets[id].config?.innerRadius === 60)) {
            newWidgets[id] = {
                ...newWidgets[id],
                config: {
                    ...newWidgets[id].config,
                    innerRadius: 40
                }
            };
            hasChanges = true;
        }
    });

    if (!hasChanges) return config;

    if (typeof window !== 'undefined' && !(window as any)._dashboard_migrated) {
        (window as any)._dashboard_migrated = true;
    }

    return {
        ...config,
        widgets: newWidgets
    };
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
    switch (action.type) {
        case 'SET_CONFIG':
            return {
                ...state,
                config: migrateConfig(action.payload),
                isLoading: false,
                pendingChanges: false,
                error: null,
            };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_EDIT_MODE':
            return { ...state, isEditMode: action.payload };

        case 'HIGHLIGHT_WIDGET':
            return { ...state, highlightedWidgetId: action.payload };

        case 'UPDATE_LAYOUT':
            if (!state.config) return state;
            return {
                ...state,
                config: { ...state.config, layout: action.payload },
                pendingChanges: true,
            };

        case 'UPDATE_WIDGET':
            if (!state.config) return state;
            return {
                ...state,
                config: {
                    ...state.config,
                    widgets: {
                        ...state.config.widgets,
                        [action.payload.id]: {
                            ...state.config.widgets[action.payload.id],
                            ...action.payload.config,
                        },
                    },
                },
                pendingChanges: true,
            };

        case 'ADD_WIDGET':
            if (!state.config) return state;
            return {
                ...state,
                config: {
                    ...state.config,
                    layout: [...state.config.layout, action.payload.layout],
                    widgets: {
                        ...state.config.widgets,
                        [action.payload.id]: action.payload.config,
                    },
                },
                pendingChanges: true,
            };

        case 'REMOVE_WIDGET':
            if (!state.config) return state;
            const { [action.payload]: _, ...remainingWidgets } = state.config.widgets;
            return {
                ...state,
                config: {
                    ...state.config,
                    layout: state.config.layout.filter(l => l.id !== action.payload),
                    widgets: remainingWidgets,
                },
                pendingChanges: true,
            };

        case 'UPDATE_GLOBALS':
            if (!state.config) return state;
            return {
                ...state,
                config: {
                    ...state.config,
                    globals: { ...state.config.globals, ...action.payload },
                },
                pendingChanges: true,
            };

        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };

        case 'MARK_SAVED':
            return { ...state, pendingChanges: false };

        default:
            return state;
    }
}

// ============================================
// Context Type
// ============================================

interface DashboardContextType {
    state: DashboardState;

    // Actions
    setConfig: (config: DashboardConfig) => void;
    toggleEditMode: () => void;
    updateLayout: (layout: LayoutItem[]) => void;
    updateWidget: (id: string, config: Partial<WidgetConfig>) => void;
    addWidget: (id: string, config: WidgetConfig, layout: LayoutItem) => void;
    removeWidget: (id: string) => void;
    updateGlobals: (globals: Partial<GlobalFilters>) => void;
    highlightWidget: (widgetId: string | null, duration?: number) => void;

    // LIA Action Handler
    handleLiaAction: (action: LiaAction) => void;

    // Persistence
    saveDashboard: () => Promise<void>;
    loadDashboard: (tenantId: string, forceTemplate?: boolean) => Promise<void>;

    // ============================================
    // LIA Action Protocol v3.0 - Transactional Methods
    // ============================================

    /** Retorna snapshot do estado atual do dashboard */
    getSnapshot: () => DashboardSnapshot | null;

    /** Retorna hash SHA-256 do config atual para detecção de conflitos */
    getSnapshotHash: () => string;

    /** Valida um patch de layout sem aplicar */
    validateLayoutPatch: (patch: LayoutPatch) => PatchValidationResult;

    /** Aplica um patch de layout com validação de concorrência */
    applyLayoutPatch: (patch: LayoutPatch, preHash: string) => LiaActionAck;

    /** Substitui um widget por outro, mantendo posição */
    replaceWidget: (patch: WidgetReplacePatch, preHash: string) => LiaActionAck;

    /** Adiciona um novo widget de forma transacional */
    addWidgetTransactional: (patch: WidgetAddPatch, preHash: string) => LiaActionAck;

    /** Encontra widgets por tipo */
    findWidgetsByType: (type: WidgetType) => string[];

    /** Encontra widgets por padrão de título */
    findWidgetsByTitle: (titlePattern: string) => string[];
}

const DashboardContext = createContext<DashboardContextType | null>(null);

// ============================================
// Provider
// ============================================

interface DashboardProviderProps {
    children: ReactNode;
    tenantId: string;
    plan?: string;
    onNavigate?: (route: string) => void;
    onOpenIntegration?: (provider: string) => void;
}

export function DashboardProvider({
    children,
    tenantId,
    plan,
    onNavigate,
    onOpenIntegration
}: DashboardProviderProps) {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);

    // ============================================
    // Actions
    // ============================================

    const setConfig = useCallback((config: DashboardConfig) => {
        dispatch({ type: 'SET_CONFIG', payload: config });
    }, []);

    const toggleEditMode = useCallback(() => {
        dispatch({ type: 'SET_EDIT_MODE', payload: !state.isEditMode });
    }, [state.isEditMode]);

    const updateLayout = useCallback((layout: LayoutItem[]) => {
        dispatch({ type: 'UPDATE_LAYOUT', payload: layout });
    }, []);

    const updateWidget = useCallback((id: string, config: Partial<WidgetConfig>) => {
        dispatch({ type: 'UPDATE_WIDGET', payload: { id, config } });
    }, []);

    const addWidget = useCallback((id: string, config: WidgetConfig, layout: LayoutItem) => {
        dispatch({ type: 'ADD_WIDGET', payload: { id, config, layout } });
    }, []);

    const removeWidget = useCallback((id: string) => {
        dispatch({ type: 'REMOVE_WIDGET', payload: id });
    }, []);

    const updateGlobals = useCallback((globals: Partial<GlobalFilters>) => {
        dispatch({ type: 'UPDATE_GLOBALS', payload: globals });
    }, []);

    const highlightWidget = useCallback((widgetId: string | null, duration = 3000) => {
        dispatch({ type: 'HIGHLIGHT_WIDGET', payload: widgetId });

        if (widgetId && duration > 0) {
            setTimeout(() => {
                dispatch({ type: 'HIGHLIGHT_WIDGET', payload: null });
            }, duration);
        }
    }, []);

    // ============================================
    // LIA Action Handler - Chat-to-Dashboard Control
    // ============================================

    const handleLiaAction = useCallback((action: LiaAction) => {
        // LIA Action debug removed

        switch (action.type) {
            // ========== Date/Filter Actions ==========
            case 'SET_DATE_RANGE':
                updateGlobals({
                    dateRange: action.payload.value,
                    customDateStart: action.payload.customStart,
                    customDateEnd: action.payload.customEnd,
                });
                break;

            case 'FILTER_UPDATE':
                updateGlobals({
                    filters: {
                        ...state.config?.globals.filters,
                        [action.payload.key]: action.payload.value,
                    },
                });
                break;

            // ========== Widget Control Actions (NEW - LIA-Action Protocol) ==========
            case 'DASHBOARD_ADD_WIDGET': {
                const { widgetType: rawWidgetType, config: widgetConfig, position } = action.payload;
                if (!state.config) break;

                // 🛡️ GUARDRAIL: Normalizar e validar widget type via SSOT
                // Import já feito no topo do arquivo

                let widgetType = rawWidgetType;

                // Tentar normalizar se não for um tipo válido
                if (!isValidWidgetType(rawWidgetType)) {
                    const normalized = normalizeWidgetType(rawWidgetType);
                    if (normalized) {
                        console.log(`🔄 [LIA] Widget type normalizado: ${rawWidgetType} → ${normalized}`);
                        widgetType = normalized;
                    } else {
                        // Tipo inválido - rejeitar ação e informar
                        const suggestion = suggestClosestWidget(rawWidgetType);
                        console.error(`❌ [LIA] Widget type inválido: ${rawWidgetType}. ${getAvailableWidgetsMessage()}`);
                        toast.error(`Widget "${rawWidgetType}" não existe. Tente: ${suggestion}`, {
                            icon: '⚠️',
                            duration: 4000,
                        });
                        break; // NÃO adiciona widget inválido
                    }
                }

                // Gerar ID único
                const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Calcular posição no grid
                const existingLayout = state.config.layout || [];
                const maxY = existingLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

                // v4.5: Aplicar métricas padrão se não fornecidas (Fix: Empty Widgets)
                const defaultMetrics = WIDGET_METRIC_DEFAULTS[widgetType]?.metrics || [];
                const finalMetric = widgetConfig?.metric || (defaultMetrics.length > 0 ? defaultMetrics[0] : undefined);
                const finalMetrics = widgetConfig?.metrics || (defaultMetrics.length > 1 ? defaultMetrics : undefined);

                const newConfig: WidgetConfig = {
                    type: widgetType,
                    title: widgetConfig?.title || 'Novo Widget',
                    color: widgetConfig?.color || 'green',
                    metric: finalMetric,
                    metrics: finalMetrics,
                    config: widgetConfig?.config || {}
                };

                const newLayout: LayoutItem = {
                    id: widgetId,
                    i: widgetId, // For react-grid-layout
                    x: position?.x ?? 0,
                    y: position?.y ?? maxY,
                    w: widgetConfig?.width || 6,
                    h: widgetConfig?.height || 4,
                    minW: 2,
                    minH: 2
                };

                addWidget(widgetId, newConfig, newLayout);
                // Widget added

                // 🎯 Feedback visual para o usuário
                toast.success(`Widget ${widgetType} adicionado!`, {
                    icon: '➕',
                    duration: 2500,
                });
                break;
            }

            case 'DASHBOARD_REMOVE_WIDGET': {
                const { widgetId } = action.payload;
                removeWidget(widgetId);
                console.log('✅ [LIA] Widget removido:', widgetId);

                // 🎯 Feedback visual
                toast.success('Widget removido', { icon: '🗑️', duration: 2000 });
                break;
            }

            case 'DASHBOARD_UPDATE_WIDGET': {
                const { widgetId, config: updatedConfig } = action.payload;
                updateWidget(widgetId, updatedConfig);
                console.log('✅ [LIA] Widget atualizado:', widgetId);
                break;
            }

            case 'DASHBOARD_SET_PERIOD': {
                const { range } = action.payload;
                updateGlobals({ dateRange: range });
                console.log('✅ [LIA] Período alterado:', range);
                break;
            }

            case 'DASHBOARD_REORGANIZE': {
                const { layout: layoutType } = action.payload;
                if (!state.config || !state.config.layout) break;

                // Reorganizar baseado no tipo
                let newLayout = [...state.config.layout];
                if (layoutType === 'kpis-top') {
                    // KPIs primeiro (widgets pequenos), depois gráficos
                    newLayout.sort((a, b) => a.h - b.h);
                } else if (layoutType === 'charts-first') {
                    // Gráficos primeiro (widgets grandes)
                    newLayout.sort((a, b) => b.h - a.h);
                }
                updateLayout(newLayout);
                console.log('✅ [LIA] Layout reorganizado:', layoutType);

                // 🎯 Feedback visual
                toast.success(`Dashboard reorganizado: ${layoutType}`, { icon: '📐', duration: 2500 });
                break;
            }

            // ========== LIA Action Protocol v3.0 - Transactional Actions ==========
            case 'DASHBOARD_REPLACE_WIDGET': {
                const { targetWidgetType, targetWidgetTitle, targetWidgetId, newWidgetType, newWidgetConfig } = action.payload;

                if (!state.config) {
                    console.error('❌ [LIA] Dashboard não carregado');
                    break;
                }

                // Encontrar widget alvo
                let targetId = targetWidgetId;

                if (!targetId && targetWidgetType) {
                    // Buscar por tipo (v3.1: Case-insensitive)
                    const pattern = targetWidgetType.toLowerCase();
                    const matches = Object.entries(state.config.widgets)
                        .filter(([_, w]) => w.type.toLowerCase() === pattern)
                        .map(([id]) => id);

                    if (matches.length >= 1) {
                        targetId = matches[0];
                    } else {
                        // 🧠 BUSCA FUZZY: Se não achou exato, tenta por "conceito"
                        // Ex: "table_rank" -> busca qualquer widget que tenha "table"
                        const concept = pattern.split('_')[0]; // Pega a primeira parte se houver underscore
                        const fuzzyMatches = Object.entries(state.config.widgets)
                            .filter(([_, w]) => w.type.toLowerCase().includes(concept) || w.type.toLowerCase().includes(pattern))
                            .map(([id]) => id);

                        if (fuzzyMatches.length >= 1) {
                            console.log(`🔍 [LIA] Widget não encontrado por tipo exato (${pattern}), mas conceito "${concept}" mapeou para:`, fuzzyMatches[0]);
                            targetId = fuzzyMatches[0];
                        } else {
                            console.error(`❌ [LIA] Nenhum widget do tipo ${targetWidgetType} encontrado (buscado: ${pattern})`);
                        }
                    }
                }

                if (!targetId && targetWidgetTitle) {
                    // Buscar por título
                    const pattern = targetWidgetTitle.toLowerCase();
                    const matches = Object.entries(state.config.widgets)
                        .filter(([_, w]) => w.title.toLowerCase().includes(pattern))
                        .map(([id]) => id);

                    if (matches.length >= 1) {
                        targetId = matches[0];
                    } else {
                        console.error(`❌ [LIA] Nenhum widget com título "${targetWidgetTitle}" encontrado`);
                        break;
                    }
                }

                if (!targetId) {
                    console.error('❌ [LIA] Não foi possível identificar o widget alvo');
                    break;
                }

                // Obter layout do widget alvo para manter posição
                const targetLayout = state.config.layout.find(l => l.id === targetId);
                const targetWidget = state.config.widgets[targetId];

                // Remover widget antigo
                removeWidget(targetId);

                // 🛡️ GUARDRAIL: Validar e normalizar newWidgetType
                let finalNewWidgetType = newWidgetType;
                if (!isValidWidgetType(newWidgetType)) {
                    const normalized = normalizeWidgetType(newWidgetType);
                    if (normalized) {
                        console.log(`🔄 [LIA] newWidgetType normalizado: ${newWidgetType} → ${normalized}`);
                        finalNewWidgetType = normalized;
                    } else {
                        const suggestion = suggestClosestWidget(newWidgetType);
                        console.error(`❌ [LIA] newWidgetType inválido: ${newWidgetType}. ${getAvailableWidgetsMessage()}`);
                        toast.error(`Widget "${newWidgetType}" não existe. Tente: ${suggestion}`, { icon: '⚠️', duration: 4000 });
                        break;
                    }
                }

                // Criar novo widget com mesma posição
                const newWidgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newConfig: WidgetConfig = {
                    type: finalNewWidgetType,
                    title: newWidgetConfig?.title || `Novo ${finalNewWidgetType}`,
                    color: newWidgetConfig?.color || targetWidget?.color || 'blue',
                    metric: newWidgetConfig?.metric || targetWidget?.metric,
                    config: newWidgetConfig?.config || {}
                };

                const newLayout: LayoutItem = targetLayout
                    ? { ...targetLayout, id: newWidgetId, i: newWidgetId }
                    : { id: newWidgetId, i: newWidgetId, x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 2 };

                addWidget(newWidgetId, newConfig, newLayout);
                console.log('✅ [LIA] Widget substituído:', targetId, '→', newWidgetId, '(', newWidgetType, ')');

                // 🎯 Feedback visual para o usuário
                toast.success(`✅ Widget substituído por ${newWidgetType}`, {
                    icon: '🔄',
                    duration: 3000,
                });
                break;
            }

            case 'DASHBOARD_GET_SNAPSHOT': {
                // Retornar snapshot - principalmente para LIA ter consciência do que está na tela
                if (!state.config) {
                    console.log('📦 [LIA] Dashboard não carregado - snapshot vazio');
                    break;
                }
                const snapshot = getSnapshot();
                console.log('📦 [DASHBOARD] Snapshot gerado para LIA:', snapshot);

                // v8.0: Cache global para respostas locais do localAnswerService
                (window as any).__liaLastSnapshot = snapshot;

                // Emitir evento de volta para LIAContext capturar e enviar ao backend
                window.dispatchEvent(new CustomEvent('lia-dashboard-snapshot-ready', {
                    detail: snapshot
                }));

                // Feedback visual discreto (opcional)
                toast.success('Visualizando dashboard...', { icon: '👁️', duration: 1500 });
                break;
            }

            // ========== Highlight/Navigation ==========
            case 'HIGHLIGHT_WIDGET':
                highlightWidget(action.payload.widgetId, action.payload.duration);
                break;

            case 'NAVIGATE':
                onNavigate?.(action.payload.route);
                break;

            case 'REFRESH_WIDGET':
                console.log('🔄 Refresh widget:', action.payload.widgetId);
                break;

            case 'OPEN_INTEGRATION_MODAL':
                onOpenIntegration?.(action.payload.provider);
                break;

            default:
                console.warn('Unknown LIA action type:', action.type);
        }
    }, [updateGlobals, highlightWidget, onNavigate, onOpenIntegration, state.config, addWidget, removeWidget, updateWidget, updateLayout]);

    // ============================================
    // Persistence
    // ============================================

    const saveDashboard = useCallback(async () => {
        if (!tenantId || !state.config) {
            console.warn('[DashboardContext] Cannot save: missing tenantId or config');
            return;
        }

        try {
            dispatch({ type: 'SET_LOADING', payload: true });

            // POST /api/dashboard/tenant/:tenantId/dashboard/save-version
            // Use relative path to leverage Vite proxy consistently
            const response = await fetch(`/api/dashboard/tenant/${tenantId}/dashboard/save-version`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config_json: state.config }),
            });

            if (!response.ok) {
                throw new Error('Failed to save dashboard');
            }

            dispatch({ type: 'MARK_SAVED' });
            // Saved
        } catch (error) {
            console.error('❌ Error saving dashboard:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Erro ao salvar dashboard' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, [tenantId, state.config]);

    const loadDashboard = useCallback(async (tId: string, forceTemplate: boolean = false) => {
        try {
            dispatch({ type: 'SET_LOADING', payload: true });

            if (!forceTemplate) {
                // Use relative path for environment independence (proxied to 5000)
                console.log('[DashboardContext] 🔍 Tentando carregar dashboard do API para tenant:', tId);
                const response = await fetch(`/api/dashboard/tenant/${tId}/dashboard/active`);

                if (response.ok) {
                    const data = await response.json();
                    console.log('[DashboardContext] 📦 Resposta da API:', { hasConfig: !!data.config_json, widgetCount: data.config_json?.widgets ? Object.keys(data.config_json.widgets).length : 0 });
                    if (data.config_json && Object.keys(data.config_json.widgets || {}).length > 0) {
                        console.log('✅ [DashboardContext] Loaded dashboard from API');
                        dispatch({ type: 'SET_CONFIG', payload: data.config_json });
                        return;
                    } else {
                        console.warn('[DashboardContext] ⚠️ API retornou config vazio ou sem widgets');
                    }
                } else {
                    console.warn('[DashboardContext] ⚠️ API não retornou dashboard:', response.status);
                }
            }

            // API failed or returned no dashboard - try to load template from Supabase directly
            console.warn('[DashboardContext] No saved dashboard, trying to load segment template from Supabase');


            // Get business type from local storage (set during onboarding)
            let businessType = useAppStore.getState().businessType;

            // Map Onboarding IDs to database segment_keys
            const segmentKeyMap: Record<string, string> = {
                'professionals': 'liberal_professionals',
                'services_technical': 'technical_services',
                'health_wellbeing': 'health_wellness',
                'real_estate_construction': 'real_estate',
                'commerce_retail': 'retail',
                'food_restaurants': 'food',
                'transport_logistics': 'logistics',
                'tech_software': 'tech',
                'content_creatives': 'creative',
                'education_training': 'education',
                'custom_other': 'other',
            };
            businessType = segmentKeyMap[businessType || ''] || businessType;

            if (supabase && businessType) {
                // Try to get the segment-specific template
                const { data: segmentTemplate } = await supabase
                    .from('dashboard_templates')
                    .select('*, template_json')
                    .eq('segment_key', businessType)
                    .single();

                if (segmentTemplate?.template_json) {
                    console.log('🔍 [DashboardContext] Found segment template for:', businessType);

                    // Check if it has a base template to merge with
                    if (segmentTemplate.base_template_key && segmentTemplate.template_json?.overrides) {
                        console.log('🔗 [DashboardContext] Merging with base template:', segmentTemplate.base_template_key);
                        const { data: baseTemplate } = await supabase
                            .from('dashboard_templates')
                            .select('template_json')
                            .eq('segment_key', segmentTemplate.base_template_key)
                            .single();

                        if (baseTemplate?.template_json) {
                            // Merge base + segment overrides
                            const overrides = segmentTemplate.template_json.overrides || {};
                            const baseLayout = baseTemplate.template_json.layout || [];
                            const baseWidgets = baseTemplate.template_json.widgets || {};
                            const baseGlobals = baseTemplate.template_json.globals || {};

                            // Merge layout: use override layout if provided, otherwise use base layout
                            const mergedLayout = overrides.layout || baseLayout;

                            // Merge widgets: deep merge base widgets with override widgets
                            const overrideWidgets = overrides.widgets || {};
                            const mergedWidgets: Record<string, any> = { ...baseWidgets };
                            for (const [key, val] of Object.entries(overrideWidgets)) {
                                mergedWidgets[key] = {
                                    ...(baseWidgets[key] || {}),
                                    ...(val as Record<string, any>)
                                };
                            }

                            // Full template merge with properly structured result
                            const merged = {
                                globals: { ...baseGlobals, ...(overrides.globals || {}) },
                                layout: mergedLayout,
                                widgets: mergedWidgets,
                                enabledMetrics: overrides.enabledMetrics || baseTemplate.template_json.enabledMetrics,
                                enabledWidgets: overrides.enabledWidgets || baseTemplate.template_json.enabledWidgets
                            };

                            console.log('✅ [DashboardContext] Loaded merged template for:', businessType);
                            dispatch({ type: 'SET_CONFIG', payload: merged });
                            return;
                        } else {
                            console.warn('⚠️ [DashboardContext] Base template not found:', segmentTemplate.base_template_key);
                        }
                    }

                    // In case of no overrides or base template not found, use segment template directly if it's full
                    if (!segmentTemplate.template_json?.overrides) {
                        console.log('✅ [DashboardContext] Loaded direct/base template:', businessType);
                        dispatch({ type: 'SET_CONFIG', payload: segmentTemplate.template_json });
                        return;
                    }
                } else {
                    console.warn('⚠️ [DashboardContext] No template found in database for segment:', businessType);
                }
            }

            // Final fallback to default config
            console.warn('[DashboardContext] Using default config fallback');
            dispatch({ type: 'SET_CONFIG', payload: getDefaultConfig() });

        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            dispatch({ type: 'SET_CONFIG', payload: getDefaultConfig() });
        }
    }, []);

    // Load dashboard on mount or when tenantId/businessType changes
    const businessType = useAppStore.getState().businessType;
    const [currentBusinessType, setCurrentBusinessType] = useState(businessType);

    // Subscribe to businessType changes
    useEffect(() => {
        const unsubscribe = useAppStore.subscribe((state) => {
            if (state.businessType !== currentBusinessType) {
                setCurrentBusinessType(state.businessType);
            }
        });
        return () => unsubscribe();
    }, [currentBusinessType]);

    // Subscribe to store changes to keep sync
    const setPlanType = useAppStore(s => s.setPlanType);
    const storePlanType = useAppStore(s => s.planType);

    // Unified Load Effect
    // Reacts to tenantId, businessType (onboarding) or plan changes
    useEffect(() => {
        if (tenantId) {
            const currentPlan = (plan?.toLowerCase() || 'pro');
            const storePlan = storePlanType.toLowerCase();

            if (storePlan !== currentPlan) {
                console.log(`🔄 [DashboardContext] Syncing plan: ${storePlan} -> ${currentPlan}`);
                setPlanType((currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)) as any);
            }

            // Lifecycle silenced
            loadDashboard(tenantId);
        }
    }, [tenantId, plan, currentBusinessType, loadDashboard]); // Syncs everything at once

    // Listen for LIA Actions from parent/iframe messages
    useEffect(() => {
        const handleWindowMessage = (event: MessageEvent) => {
            // Validate origin if needed, but for now we trust LIA_ACTION type
            if (event.data?.type === 'LIA_ACTION' && event.data.action) {
                // PostMessage action received
                handleLiaAction(event.data.action);
            }
        };

        window.addEventListener('message', handleWindowMessage);
        return () => window.removeEventListener('message', handleWindowMessage);
    }, [handleLiaAction]);

    // Listen for LIA Dashboard Actions via custom event (from LIAContext chat/voice)
    React.useEffect(() => {
        const handleLiaDashboardAction = (event: CustomEvent) => {
            const { type, payload } = event.detail || {};
            if (type && payload) {
                console.log('🎯 [DashboardContext] Received LIA Dashboard Action:', type, payload);
                handleLiaAction({ type, payload });
            }
        };

        window.addEventListener('lia-dashboard-action', handleLiaDashboardAction as EventListener);
        return () => window.removeEventListener('lia-dashboard-action', handleLiaDashboardAction as EventListener);
    }, [handleLiaAction]);

    // Process pending actions from Zustand queue (cross-page communication)
    // IMPORTANTE: Executar apenas UMA VEZ quando config carrega (sem dependências que causam loop)
    const hasProcessedQueueRef = React.useRef(false);
    React.useEffect(() => {
        // Aguardar config estar carregada e processar apenas uma vez
        if (!state.config || hasProcessedQueueRef.current) return;
        hasProcessedQueueRef.current = true;

        try {
            const store = (window as any).__LUMINNUS_STORE__;
            if (store?.pendingDashboardActions && store.pendingDashboardActions.length > 0) {
                const pendingActions = [...store.pendingDashboardActions];
                // Limpar fila ANTES de processar para evitar loops
                store.clearDashboardActions?.();

                console.log(`🚀 [DashboardContext] Processando ${pendingActions.length} ação(ões) pendente(s) da fila`);
                pendingActions.forEach((action: { type: string; payload: any }) => {
                    handleLiaAction({ type: action.type, payload: action.payload } as LiaAction);
                });
                toast.success(`${pendingActions.length} ação(ões) da LIA aplicada(s)!`, { icon: '🤖' });
            }
        } catch (e) {
            console.warn('⚠️ [DashboardContext] Falha ao processar fila pendente:', e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.config]);

    // ============================================
    // LIA Action Protocol v3.0 - Transactional Methods
    // ============================================

    /**
     * Calcula hash simples do config para detecção de conflitos
     * Usa JSON stringify + hash básico (suficiente para concorrência)
     */
    const computeConfigHash = useCallback((config: DashboardConfig | null): string => {
        if (!config) return 'empty';
        const json = JSON.stringify(config);
        // Simple hash function (djb2)
        let hash = 5381;
        for (let i = 0; i < json.length; i++) {
            hash = ((hash << 5) + hash) + json.charCodeAt(i);
        }
        return Math.abs(hash).toString(16);
    }, []);

    const getSnapshotHash = useCallback((): string => {
        return computeConfigHash(state.config);
    }, [state.config, computeConfigHash]);

    const getSnapshot = useCallback((): DashboardSnapshot | null => {
        if (!state.config) return null;

        const widgets = Object.entries(state.config.widgets).map(([id, w]) => {
            const layout = state.config!.layout.find(l => l.id === id);
            return {
                id,
                type: w.type,
                title: w.title,
                position: layout
                    ? { x: layout.x, y: layout.y, w: layout.w, h: layout.h }
                    : { x: 0, y: 0, w: 4, h: 2 }
            };
        });

        const activeTypes = Array.from(new Set(widgets.map(w => w.type)));
        const hash = getSnapshotHash();

        // Calcular próxima posição disponível (simplificado: abaixo do último widget)
        const maxY = widgets.length > 0
            ? Math.max(...widgets.map(w => w.position.y + w.position.h))
            : 0;

        return {
            hash,
            widgets,
            widgetCount: widgets.length,
            active_widget_types: activeTypes,
            next_suggested_position: { x: 0, y: maxY, w: 6, h: 4 },
            layout_summary: `${widgets.length} widgets ativos em grid de 12 colunas.`,
            summary: `Dashboard com ${widgets.length} widgets ativos: ${activeTypes.join(', ')}. Próximo espaço sugerido em Y=${maxY}.`
        };
    }, [state.config, getSnapshotHash]);

    const findWidgetsByType = useCallback((type: WidgetType): string[] => {
        if (!state.config) return [];
        return Object.entries(state.config.widgets)
            .filter(([_, w]) => w.type === type)
            .map(([id]) => id);
    }, [state.config]);

    const findWidgetsByTitle = useCallback((titlePattern: string): string[] => {
        if (!state.config) return [];
        const pattern = titlePattern.toLowerCase();
        return Object.entries(state.config.widgets)
            .filter(([_, w]) => w.title.toLowerCase().includes(pattern))
            .map(([id]) => id);
    }, [state.config]);

    const validateLayoutPatch = useCallback((patch: LayoutPatch): PatchValidationResult => {
        const errors: string[] = [];

        if (!state.config) {
            errors.push('Dashboard não carregado');
            return { ok: false, errors };
        }

        // Validar que IDs existem
        for (const move of patch.moves) {
            if (!state.config.widgets[move.id]) {
                errors.push(`Widget "${move.id}" não existe`);
            }
        }

        // Validar colisões se no_overlap = true
        if (patch.constraints.no_overlap) {
            for (let i = 0; i < patch.moves.length; i++) {
                for (let j = i + 1; j < patch.moves.length; j++) {
                    const a = patch.moves[i], b = patch.moves[j];
                    const overlap = !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
                        a.y + a.h <= b.y || b.y + b.h <= a.y);
                    if (overlap) {
                        errors.push(`Colisão entre "${a.id}" e "${b.id}"`);
                    }
                }
            }
        }

        console.log('✅ [VALIDATION]', errors.length === 0 ? 'ok' : `errors: ${errors.join(', ')}`);
        return { ok: errors.length === 0, errors };
    }, [state.config]);

    const createAck = useCallback((
        actionId: string,
        status: 'applied' | 'rejected' | 'partial',
        preHash: string,
        reasonCode: LiaActionReasonCode,
        reason?: string
    ): LiaActionAck => {
        const postHash = getSnapshotHash();
        const snapshot = status === 'rejected' ? getSnapshot() || undefined : undefined;

        const ack: LiaActionAck = {
            action_id: actionId,
            status,
            reason_code: reasonCode,
            reason,
            pre_state_hash: preHash,
            post_state_hash: postHash,
            snapshot,
            timestamp: Date.now()
        };

        console.log('📣 [ACK]', `status=${status}`, `code=${reasonCode}`, reason ? `reason=${reason}` : '');
        return ack;
    }, [getSnapshotHash, getSnapshot]);

    const applyLayoutPatch = useCallback((patch: LayoutPatch, preHash: string): LiaActionAck => {
        const actionId = `layout_${Date.now()}`;
        console.log('🧩 [LIA-ACTION] received', { action_id: actionId, action: 'LAYOUT_PATCH' });

        // Verificar concorrência
        const currentHash = getSnapshotHash();
        console.log('📦 [DASHBOARD] pre_hash:', preHash, 'current_hash:', currentHash);

        if (preHash && preHash !== currentHash) {
            return createAck(actionId, 'rejected', preHash, 'HASH_MISMATCH', 'CONFLICT_STALE_STATE: Dashboard mudou desde sua última verificação');
        }

        // Validar patch
        const validation = validateLayoutPatch(patch);
        if (!validation.ok) {
            return createAck(actionId, 'rejected', preHash, 'VALIDATION_ERROR', `VALIDATION_ERROR: ${validation.errors.join(', ')}`);
        }

        // Aplicar moves
        if (state.config) {
            const newLayout = state.config.layout.map(item => {
                const move = patch.moves.find(m => m.id === item.id);
                if (move) {
                    return { ...item, x: move.x, y: move.y, w: move.w, h: move.h };
                }
                return item;
            });
            updateLayout(newLayout);
        }

        return createAck(actionId, 'applied', preHash, 'SUCCESS');
    }, [state.config, getSnapshotHash, validateLayoutPatch, createAck, updateLayout]);

    const replaceWidget = useCallback((patch: WidgetReplacePatch, preHash: string): LiaActionAck => {
        const actionId = `replace_${Date.now()}`;
        console.log('🧩 [LIA-ACTION] received', { action_id: actionId, action: 'REPLACE_WIDGET', target: patch.target_widget_id });

        // Verificar concorrência
        const currentHash = getSnapshotHash();
        console.log('📦 [DASHBOARD] pre_hash:', preHash, 'current_hash:', currentHash);

        if (preHash && preHash !== currentHash) {
            return createAck(actionId, 'rejected', preHash, 'HASH_MISMATCH', 'CONFLICT_STALE_STATE: Dashboard mudou desde sua última verificação');
        }

        if (!state.config) {
            return createAck(actionId, 'rejected', preHash, 'VALIDATION_ERROR', 'Dashboard não carregado');
        }

        // Verificar widget alvo existe
        const targetWidget = state.config.widgets[patch.target_widget_id];
        if (!targetWidget) {
            return createAck(actionId, 'rejected', preHash, 'WIDGET_NOT_FOUND', `Widget "${patch.target_widget_id}" não encontrado`);
        }

        // Obter layout do widget alvo
        const targetLayout = state.config.layout.find(l => l.id === patch.target_widget_id);

        // Remover widget antigo
        removeWidget(patch.target_widget_id);

        // Criar novo widget com mesma posição
        const newWidgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // v4.5: Aplicar métricas padrão se não fornecidas (Fix: Empty Widgets)
        const defaultMetrics = WIDGET_METRIC_DEFAULTS[patch.new_widget_type]?.metrics || [];
        const finalMetric = patch.new_widget_config?.metric || (defaultMetrics.length > 0 ? defaultMetrics[0] : targetWidget.metric);
        const finalMetrics = patch.new_widget_config?.metrics || (defaultMetrics.length > 1 ? defaultMetrics : undefined);

        const newConfig: WidgetConfig = {
            type: patch.new_widget_type,
            title: patch.new_widget_config?.title || `Novo ${patch.new_widget_type}`,
            color: patch.new_widget_config?.color || targetWidget.color || 'blue',
            metric: finalMetric,
            metrics: finalMetrics,
            icon: patch.new_widget_config?.icon,
            config: patch.new_widget_config?.config || {}
        };

        const newLayout: LayoutItem = patch.keep_position && targetLayout
            ? { ...targetLayout, id: newWidgetId, i: newWidgetId }
            : { id: newWidgetId, i: newWidgetId, x: 0, y: 0, w: 6, h: 4, minW: 2, minH: 2 };

        addWidget(newWidgetId, newConfig, newLayout);
        console.log('✅ [LIA] Widget substituído:', patch.target_widget_id, '→', newWidgetId, '(', patch.new_widget_type, ')');

        return createAck(actionId, 'applied', preHash, 'SUCCESS');
    }, [state.config, getSnapshotHash, createAck, removeWidget, addWidget]);

    const addWidgetTransactional = useCallback((patch: WidgetAddPatch, preHash: string): LiaActionAck => {
        const actionId = `add_${Date.now()}`;

        // Verificar concorrência
        const currentHash = getSnapshotHash();
        if (preHash && preHash !== currentHash) {
            return createAck(actionId, 'rejected', preHash, 'HASH_MISMATCH', 'CONFLICT_STALE_STATE: Dashboard mudou');
        }

        if (!state.config) {
            return createAck(actionId, 'rejected', preHash, 'VALIDATION_ERROR', 'Dashboard não carregado');
        }

        const newWidgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const defaultMetrics = WIDGET_METRIC_DEFAULTS[patch.widget_type]?.metrics || [];
        const finalMetric = patch.widget_config?.metric || (defaultMetrics.length > 0 ? defaultMetrics[0] : undefined);
        const finalMetrics = patch.widget_config?.metrics || (defaultMetrics.length > 1 ? defaultMetrics : undefined);

        const newConfig: WidgetConfig = {
            type: patch.widget_type,
            title: patch.widget_config?.title || `Novo ${patch.widget_type}`,
            color: patch.widget_config?.color || 'blue',
            metric: finalMetric,
            metrics: finalMetrics,
            icon: patch.widget_config?.icon,
            config: patch.widget_config?.config || {}
        };

        // --- LÓGICA DE POSICIONAMENTO INTELIGENTE ---
        let x = patch.position?.x;
        let y = patch.position?.y;
        let w = patch.position?.w || (patch.widget_type.includes('kpi') ? 3 : 6);
        let h = patch.position?.h || (patch.widget_type.includes('kpi') ? 2 : 4);

        // Se x ou y não forem fornecidos, calcular automático
        if (x === undefined || y === undefined) {
            const maxY = state.config.layout.length > 0
                ? Math.max(...state.config.layout.map(l => l.y + l.h))
                : 0;
            x = 0;
            y = maxY;
            console.log(`🧠 [DASHBOARD] Posição automática calculada: x=${x}, y=${y}`);
        }

        const newLayout: LayoutItem = {
            id: newWidgetId,
            i: newWidgetId,
            x: x,
            y: y,
            w: w,
            h: h,
            minW: 2,
            minH: 2
        };

        addWidget(newWidgetId, newConfig, newLayout);

        return createAck(actionId, 'applied', preHash, 'SUCCESS');
    }, [state.config, getSnapshotHash, createAck, addWidget]);

    // ============================================
    // Context Value
    // ============================================

    const value: DashboardContextType = {
        state,
        setConfig,
        toggleEditMode,
        updateLayout,
        updateWidget,
        addWidget,
        removeWidget,
        updateGlobals,
        highlightWidget,
        handleLiaAction,
        saveDashboard,
        loadDashboard,
        // LIA Action Protocol v3.0
        getSnapshot,
        getSnapshotHash,
        validateLayoutPatch,
        applyLayoutPatch,
        replaceWidget,
        addWidgetTransactional,
        findWidgetsByType,
        findWidgetsByTitle,
    };

    // v8.0: Listener para atualizar cache do snapshot quando LIAContext solicitar
    React.useEffect(() => {
        const handleSnapshotRequest = () => {
            const snapshot = getSnapshot();
            if (snapshot) {
                (window as any).__liaLastSnapshot = snapshot;
            }
        };

        // Inicializar cache ao montar
        handleSnapshotRequest();

        // Listener para requisições
        window.addEventListener('lia-request-snapshot', handleSnapshotRequest);

        return () => {
            window.removeEventListener('lia-request-snapshot', handleSnapshotRequest);
        };
    }, [getSnapshot, state.config]);

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}

// ============================================
// Default Config (fallback)
// ============================================

function getDefaultConfig(): DashboardConfig {
    return {
        globals: {
            dateRange: 'last_30_days',
            currency: 'BRL',
            timezone: 'America/Sao_Paulo',
        },
        layout: [
            // Row 1: KPIs
            { id: 'kpi_revenue', x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
            { id: 'kpi_expenses', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
            { id: 'kpi_net', x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
            { id: 'kpi_clients', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },

            // Row 2: Main Chart and Breakdown
            { id: 'chart_performance', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
            { id: 'chart_breakdown', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },

            // Row 3: Table and Alerts
            { id: 'table_activity', x: 0, y: 6, w: 8, h: 4, minW: 4, minH: 3 },
            { id: 'alerts_insights', x: 8, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
        ],
        widgets: {
            kpi_revenue: { type: 'kpi_card', title: 'Receitas', metric: 'cash_in', icon: 'trending_up', color: 'green' },
            kpi_expenses: { type: 'kpi_card', title: 'Despesas', metric: 'cash_out', icon: 'trending_down', color: 'red' },
            kpi_net: { type: 'kpi_card', title: 'Saldo', metric: 'net_cash', icon: 'account_balance', color: 'blue' },
            kpi_clients: { type: 'kpi_card', title: 'Clientes', metric: 'contacts_count', icon: 'people', color: 'purple' },

            chart_performance: {
                type: 'line_timeseries',
                title: 'Desempenho Financeiro',
                metric: 'cash_in',
                icon: 'show_chart',
                color: 'blue'
            },
            chart_breakdown: {
                type: 'donut_breakdown',
                title: 'Distribuição de Gastos',
                metric: 'expenses_by_category',
                icon: 'pie_chart',
            },
            table_activity: {
                type: 'table_transactions',
                title: 'Transações Recentes',
                metric: 'transactions_recent',
                icon: 'list_alt',
                color: 'cyan'
            },
            alerts_insights: {
                type: 'alerts_list',
                title: 'LIA Insights',
                metric: 'insights',
                icon: 'auto_awesome',
                color: 'amber'
            },
        },
    };
}

export default DashboardContext;
