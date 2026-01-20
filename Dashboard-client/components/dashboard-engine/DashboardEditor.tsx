/**
 * Dashboard Editor - COMPLETO
 * 
 * Drawer lateral para:
 * - Adicionar novos widgets
 * - Editar widgets existentes (cores, métricas, etc.)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, Search, Palette, BarChart3, Settings2, Trash2, Save } from 'lucide-react';
import { useDashboard } from './DashboardContext';
import { WIDGET_METADATA, getWidgetsByCategory, isWidgetAvailableForPlan } from './WidgetRegistry';
import { WidgetType, WidgetConfig, LayoutItem } from './types';
import { LanguageContext } from '../../contexts/LanguageContext';


// ============================================
// Types
// ============================================

interface DashboardEditorProps {
    isOpen: boolean;
    onClose: () => void;
    plan: 'start' | 'plus' | 'pro';
    mode: 'add' | 'edit';
    editingWidgetId?: string;
}

// Cores disponíveis para widgets
const WIDGET_COLORS = [
    { id: 'green', label: 'Verde', class: 'bg-green-500', value: 'green' },
    { id: 'blue', label: 'Azul', class: 'bg-blue-500', value: 'blue' },
    { id: 'purple', label: 'Roxo', class: 'bg-purple-500', value: 'purple' },
    { id: 'amber', label: 'Âmbar', class: 'bg-amber-500', value: 'amber' },
    { id: 'red', label: 'Vermelho', class: 'bg-red-500', value: 'red' },
    { id: 'cyan', label: 'Ciano', class: 'bg-cyan-500', value: 'cyan' },
    { id: 'emerald', label: 'Esmeralda', class: 'bg-emerald-500', value: 'emerald' },
    { id: 'pink', label: 'Rosa', class: 'bg-pink-500', value: 'pink' },
];

// ============================================
// Add Widget Panel
// ============================================

function AddWidgetPanel({ plan, onAdd }: { plan: string; onAdd: (key: WidgetType) => void }) {
    const { t } = React.useContext(LanguageContext);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = [
        { id: 'kpi', label: t('kpiWidgets'), icon: 'trending_up' },
        { id: 'chart', label: t('chartWidgets'), icon: 'bar_chart' },
        { id: 'table', label: t('tableWidgets'), icon: 'table_chart' },
        { id: 'special', label: t('specialWidgets'), icon: 'auto_awesome' },
    ];


    const filteredWidgets = useMemo(() => {
        let widgets = getWidgetsByCategory(selectedCategory as any);
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            widgets = widgets.filter(w => w.name.toLowerCase().includes(query) || w.description?.toLowerCase().includes(query));
        }
        return widgets;
    }, [selectedCategory, searchQuery]);

    return (
        <>
            {/* Search */}
            <div className="p-4 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchWidgets')}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 p-4 overflow-x-auto border-b border-white/10">
                <button onClick={() => setSelectedCategory(null)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === null ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t('allWidgets')}</button>

                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${selectedCategory === cat.id ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Widget List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {filteredWidgets.map(widget => {
                    const isAvailable = isWidgetAvailableForPlan(widget.widget_key, plan as any);
                    return (
                        <button key={widget.widget_key} onClick={() => onAdd(widget.widget_key)} disabled={!isAvailable} className={`w-full p-4 rounded-xl text-left transition-all ${isAvailable ? 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-primary/50' : 'bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isAvailable ? 'bg-brand-primary/10 text-brand-primary' : 'bg-gray-500/10 text-gray-500'}`}>
                                    <span className="material-symbols-outlined">{widget.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-white">{t(`widget_${widget.widget_key}_name` as any)}</h3>
                                        {!isAvailable && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">{widget.plan_min}</span>}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t(`widget_${widget.widget_key}_desc` as any)}</p>

                                </div>
                                {isAvailable && <Plus className="w-5 h-5 text-gray-400 shrink-0" />}
                            </div>
                        </button>
                    );
                })}

                {filteredWidgets.length === 0 && (
                    <div className="text-center py-8">
                        <span className="material-symbols-outlined text-4xl text-gray-600">widgets</span>
                        <p className="text-gray-500 text-sm mt-2">{t('noWidgetsFound')}</p>
                    </div>
                )}

            </div>
        </>
    );
}

// ============================================
// Edit Widget Panel
// ============================================

function EditWidgetPanel({ widgetId, onClose, onRemove }: { widgetId: string; onClose: () => void; onRemove: () => void }) {
    const { t } = React.useContext(LanguageContext);
    const { state, updateWidget } = useDashboard();
    const widgetConfig = state.config?.widgets[widgetId];


    const [title, setTitle] = useState(widgetConfig?.title || '');
    const [color, setColor] = useState(widgetConfig?.color || 'blue');
    const [metric, setMetric] = useState(widgetConfig?.metric || '');

    useEffect(() => {
        if (widgetConfig) {
            setTitle(widgetConfig.title || '');
            setColor(widgetConfig.color || 'blue');
            setMetric(widgetConfig.metric || '');
        }
    }, [widgetConfig]);

    if (!widgetConfig) return <div className="p-4 text-gray-500">{t('widgetNotFound')}</div>;

    const metadata = WIDGET_METADATA[widgetConfig.type];
    const supportedMetrics = metadata?.supported_metrics || [];

    const handleSave = () => {
        updateWidget(widgetId, { title, color, metric });
        onClose();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Widget Info */}
            <div className="p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-brand-primary">{metadata?.icon || 'widgets'}</span>
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Settings2 className="w-4 h-4 inline mr-2" />
                        {t('widgetTitle')}
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    />
                </div>

                {/* Color */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        <Palette className="w-4 h-4 inline mr-2" />
                        {t('widgetColor')}
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {WIDGET_COLORS.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setColor(c.value)}
                                className={`w-8 h-8 rounded-md ${c.class} transition-all ${color === c.value ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'}`}
                                title={t(`color_${c.id}` as any)}
                            />
                        ))}
                    </div>
                </div>

                {/* Metric */}
                {supportedMetrics.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <BarChart3 className="w-4 h-4 inline mr-2" />
                            {t('widgetMetric')}
                        </label>
                        <select
                            value={metric}
                            onChange={(e) => setMetric(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        >
                            {supportedMetrics.map(m => (
                                <option key={m} value={m} className="bg-gray-900">{t(`metric_${m}` as any)}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Replace Widget */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t('replaceWidget')}</label>
                    <p className="text-xs text-gray-500 mb-3">{t('replaceWidgetDesc')}</p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                        {getWidgetsByCategory(null).map(w => (
                            <button
                                key={w.widget_key}
                                onClick={() => updateWidget(widgetId, { type: w.widget_key, title: w.name, icon: w.icon })}
                                className={`p-2 rounded-lg text-left border transition-all ${widgetConfig.type === w.widget_key ? 'border-brand-primary bg-brand-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                            >
                                <span className="material-symbols-outlined text-sm text-brand-primary">{w.icon}</span>
                                <p className="text-[10px] text-white mt-0.5 truncate">{t(`widget_${w.widget_key}_name` as any)}</p>
                            </button>
                        ))}
                    </div>
                </div>

            </div>

            {/* Actions */}
            <div className="p-4 border-t border-white/10 flex gap-3">
                <button onClick={onRemove} className="flex-1 h-10 px-4 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all">
                    <Trash2 className="w-4 h-4" />
                    {t('removeWidget')}
                </button>
                <button onClick={handleSave} className="flex-1 h-10 px-4 rounded-lg bg-brand-primary text-white hover:brightness-110 flex items-center justify-center gap-2 transition-all">
                    <Save className="w-4 h-4" />
                    {t('saveWidget')}
                </button>
            </div>

        </div >
    );
}

// ============================================
// Main Editor Component
// ============================================

function DashboardEditor({ isOpen, onClose, plan, mode, editingWidgetId }: DashboardEditorProps) {
    const { t } = React.useContext(LanguageContext);
    const { state, addWidget, removeWidget } = useDashboard();


    const handleAddWidget = (widgetKey: WidgetType) => {
        const metadata = WIDGET_METADATA[widgetKey];
        const widgetId = `widget_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

        const config: WidgetConfig = {
            type: widgetKey,
            title: t(`widget_${widgetKey}_name` as any),
            icon: metadata.icon,
            metric: metadata.supported_metrics[0],
            config: { ...metadata.default_config },
        };

        const existingLayout = state.config?.layout || [];
        const maxY = existingLayout.reduce((max, item) => Math.max(max, item.y + item.h), 0);

        const layout: LayoutItem = {
            id: widgetId,
            x: 0,
            y: maxY,
            w: widgetKey === 'kpi_card' ? 3 : 6,
            h: widgetKey === 'kpi_card' ? 2 : 4,
        };

        addWidget(widgetId, config, layout);
        onClose();
    };

    const handleRemoveWidget = () => {
        if (editingWidgetId) {
            removeWidget(editingWidgetId);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-[#111827] border-l border-white/10 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">
                        {mode === 'add' ? t('addWidget') : t('editWidget')}
                    </h2>

                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                {mode === 'add' ? (
                    <AddWidgetPanel plan={plan} onAdd={handleAddWidget} />
                ) : (
                    <EditWidgetPanel widgetId={editingWidgetId!} onClose={onClose} onRemove={handleRemoveWidget} />
                )}
            </div>
        </div>
    );
}

export default DashboardEditor;
