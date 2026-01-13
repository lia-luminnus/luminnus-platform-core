/**
 * Dashboard Renderer - LAYOUT LIMPO (Conforme Imagem 2)
 * 
 * Header compacto sem ocupar espaço desnecessário
 * - Apenas "Dashboard" + botão "Editar" no canto
 * - 4 KPIs lado a lado
 * - Gráficos lado a lado
 */

import React, { useState, useCallback, useMemo } from 'react';
import GridLayout, { WidthProvider, Layout } from 'react-grid-layout';
import DashboardEditor from './DashboardEditor';
import { Loader2, Settings, Save, X, Plus, Edit3 } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { renderWidget, WIDGET_METADATA, isWidgetAvailableForPlan } from './WidgetRegistry';
import { LayoutItem, WidgetConfig } from './types';
import { useEffect } from 'react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const PureGridLayout = WidthProvider(GridLayout);

// ============================================
// Data Fetching Hook
// ============================================

function useWidgetData(tenantId: string, widgetId: string, config: WidgetConfig, globals: any) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!tenantId || !config) return;
        try {
            setLoading(true);
            const metricKey = config.metric || config.metrics?.[0];
            if (!metricKey) return;

            const today = new Date();
            const endDate = today.toISOString().split('T')[0];
            const start = new Date(today);
            const range = globals?.dateRange || 'last_30_days';

            if (range === 'last_7_days') start.setDate(start.getDate() - 7);
            else if (range === 'last_30_days') start.setDate(start.getDate() - 30);

            const startDate = start.toISOString().split('T')[0];
            const queryType = getQueryType(config.type);

            const params = new URLSearchParams({
                tenant_id: tenantId,
                metric_key: metricKey,
                start_date: startDate,
                end_date: endDate,
                type: queryType,
            });

            const response = await fetch(`/api/metrics/query?${params}`);
            if (response.ok) {
                const result = await response.json();
                let finalData = result.data !== undefined ? result.data : result;

                if (queryType === 'kpi' && Array.isArray(finalData)) {
                    finalData = finalData.find((m: any) => m.metric_key === metricKey) || null;
                }
                setData(finalData);
            }
        } catch (err) {
            console.error(`[WidgetData] Error loading ${widgetId}:`, err);
        } finally {
            setLoading(false);
        }
    }, [tenantId, config, globals]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 120000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return { data, loading, refetch: fetchData };
}

function getQueryType(t: string) {
    if (t === 'kpi_card') return 'kpi';
    if (t === 'funnel') return 'funnel';
    if (['donut_breakdown', 'bar_grouped', 'bar_horizontal', 'pie_chart'].includes(t)) return 'breakdown';
    if (t.includes('table')) return 'table';
    return 'timeseries';
}

// ============================================
// Widget Wrapper
// ============================================

function WidgetWrapper({ id, config, tenantId, globals, plan, isEditMode, onEdit, onRemove, isHighlighted }: any) {
    const { data, loading } = useWidgetData(tenantId, id, config, globals);
    const isAvailable = isWidgetAvailableForPlan(config.type, plan);
    const lockedReason = !isAvailable ? `Disponível no plano ${WIDGET_METADATA[config.type]?.plan_min}` : undefined;

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('[WidgetWrapper] Abrindo editor para:', id);
        onEdit();
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove();
    };

    return (
        <div className={`h-full w-full relative group ${isEditMode ? 'rounded-2xl border-2 border-brand-primary/30' : ''} ${isHighlighted ? 'ring-4 ring-brand-primary animate-pulse' : ''}`}>
            {renderWidget(config.type, { id, config, globals, data, loading, lockedReason, isEditMode, onEdit, onRemove })}

            {isEditMode && (
                <div className="absolute top-2 right-2 flex gap-1.5" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
                    <button
                        onClick={handleEdit}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1.5 bg-brand-primary/90 hover:bg-brand-primary text-white rounded-lg shadow cursor-pointer"
                        title="Editar Widget"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleRemove}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-lg shadow cursor-pointer"
                        title="Remover Widget"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================
// Main Dashboard Renderer
// ============================================

export default function DashboardRenderer({ tenantId, plan = 'pro', isEditable = true }: { tenantId: string; plan?: any; isEditable?: boolean }) {
    const { state, updateLayout, saveDashboard, removeWidget, toggleEditMode } = useDashboard();
    const { config, isLoading, isEditMode } = state;
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    const onLayoutChange = useCallback((current: Layout[]) => {
        if (!isEditMode) return;
        updateLayout(current.map(l => ({ id: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
    }, [isEditMode, updateLayout]);

    // Layout: 4 KPIs no topo, gráficos embaixo lado a lado
    const displayLayout = useMemo(() => {
        if (!config?.layout) return [];

        const items = config.layout.filter(item => !!config.widgets[item.id]);
        const kpis = items.filter(i => config.widgets[i.id]?.type === 'kpi_card');
        const charts = items.filter(i => config.widgets[i.id]?.type !== 'kpi_card');

        // Detecta layout corrompido
        const needsReset = items.length > 1 && items.every(item => item.x === 0);

        if (needsReset) {
            const fixed: Layout[] = [];

            kpis.forEach((item, idx) => {
                fixed.push({ i: item.id, x: (idx % 4) * 3, y: Math.floor(idx / 4) * 2, w: 3, h: 2, minW: 2, static: !isEditMode });
            });

            const kpiRows = Math.ceil(kpis.length / 4);
            charts.forEach((item, idx) => {
                fixed.push({ i: item.id, x: (idx % 2) * 6, y: (kpiRows * 2) + Math.floor(idx / 2) * 4, w: 6, h: 4, minW: 4, static: !isEditMode });
            });

            return fixed;
        }

        return items.map(item => ({
            i: item.id,
            x: item.x ?? 0,
            y: item.y ?? 0,
            w: item.w || (config.widgets[item.id]?.type === 'kpi_card' ? 3 : 6),
            h: item.h || (config.widgets[item.id]?.type === 'kpi_card' ? 2 : 4),
            minW: config.widgets[item.id]?.type === 'kpi_card' ? 2 : 4,
            static: !isEditMode
        }));
    }, [config?.layout, config?.widgets, isEditMode]);

    if (isLoading) return <div className="h-full flex items-center justify-center bg-[#0a0d14]"><Loader2 className="w-10 h-10 animate-spin text-brand-primary" /></div>;
    if (!config) return <div className="h-full flex items-center justify-center bg-[#0a0d14] text-gray-500">Carregando...</div>;

    const today = new Date();
    const dateString = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="flex flex-col h-full bg-[#0a0d14] text-white overflow-hidden">
            {/* Header Compacto - Igual à Imagem 2 */}
            <div className="flex-none px-6 py-3 flex items-center justify-between border-b border-white/5">
                <span className="text-sm text-gray-400">Dashboard</span>
                {isEditable && !isEditMode && (
                    <button onClick={toggleEditMode} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                    </button>
                )}
                {isEditMode && (
                    <div className="flex items-center gap-3">
                        {state.pendingChanges && (
                            <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 rounded-lg">
                                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                <span className="text-[10px] text-amber-500 uppercase font-bold">Não salvo</span>
                            </div>
                        )}
                        <button onClick={toggleEditMode} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
                        <button onClick={() => saveDashboard().then(toggleEditMode)} disabled={!state.pendingChanges} className={`h-8 px-4 rounded-lg bg-brand-primary text-white text-sm font-medium flex items-center gap-1.5 ${!state.pendingChanges ? 'opacity-50' : ''}`}><Save className="w-3.5 h-3.5" />Salvar</button>
                        <button onClick={() => setShowAddModal(true)} className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

            {/* Título */}
            <div className="px-6 pt-4 pb-2">
                <h1 className="text-xl font-bold tracking-tight">RELATÓRIO DE INTELIGÊNCIA</h1>
                <p className="text-xs text-gray-500 capitalize">{dateString}</p>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-6">
                <PureGridLayout
                    className="layout"
                    layout={displayLayout}
                    cols={12}
                    rowHeight={85}
                    margin={[12, 12]}
                    isDraggable={isEditMode}
                    isResizable={isEditMode}
                    onLayoutChange={onLayoutChange}
                    useCSSTransforms={true}
                >
                    {displayLayout.map((item) => (
                        <div key={item.i} className={isEditMode ? 'cursor-move' : ''}>
                            <WidgetWrapper
                                id={item.i}
                                config={config.widgets[item.i]}
                                tenantId={tenantId}
                                globals={config.globals}
                                plan={plan}
                                isEditMode={isEditMode}
                                onEdit={() => setEditingWidgetId(item.i)}
                                onRemove={() => removeWidget(item.i)}
                                isHighlighted={state.highlightedWidgetId === item.i}
                            />
                        </div>
                    ))}
                </PureGridLayout>

                {/* Botão Adicionar Widget no Final */}
                {isEditMode && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full mt-4 p-6 border-2 border-dashed border-white/20 rounded-2xl text-gray-400 hover:text-white hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all flex items-center justify-center gap-3"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="text-sm font-medium">Adicionar Widget</span>
                    </button>
                )}
            </div>

            <DashboardEditor isOpen={showAddModal || !!editingWidgetId} onClose={() => { setShowAddModal(false); setEditingWidgetId(null); }} plan={plan} mode={editingWidgetId ? 'edit' : 'add'} editingWidgetId={editingWidgetId || undefined} />

            <style dangerouslySetInnerHTML={{ __html: `.react-grid-item.react-grid-placeholder{background:rgba(139,92,246,0.1)!important;border-radius:1rem!important;border:2px dashed rgba(139,92,246,0.4)!important}.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}` }} />
        </div>
    );
}
