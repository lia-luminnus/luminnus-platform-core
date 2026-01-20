import React, { useState, useContext, useEffect, useCallback } from 'react';
import Header from './Header';
import { Deal } from '../types';
import { LanguageContext } from '../contexts/LanguageContext';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { crmService, DealFilters, DealSort } from '../services/crmService';

const emptyDeal: Partial<Deal> = {
    stage: 'lead',
    value: 0,
    clientName: '',
    company: '',
    email: '',
    phone: '',
    priority: 'medium',
    probability: 0,
    expectedCloseDate: null,
    source: 'manual',
    tags: [],
    notes: '',
    assignedTo: null
};

const CRM: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const { user } = useDashboardAuth();
    const tenantId = user?.id || null; // Use user.id as tenantId

    // State
    const [deals, setDeals] = useState<Deal[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDeal, setCurrentDeal] = useState<Partial<Deal>>(emptyDeal);
    const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

    // Filters and Sort
    const [stageFilter, setStageFilter] = useState<string>('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [sortBy, setSortBy] = useState<DealSort>({ field: 'updated_at', direction: 'desc' });

    // Fetch deals from Supabase
    const fetchDeals = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        const filters: DealFilters = {
            search: searchTerm || undefined,
            stage: stageFilter || undefined,
            priority: priorityFilter || undefined
        };

        const result = await crmService.listDeals(tenantId, filters, sortBy);
        setDeals(result);
        setLoading(false);
    }, [tenantId, searchTerm, stageFilter, priorityFilter, sortBy]);

    useEffect(() => {
        fetchDeals();
    }, [fetchDeals]);

    useEffect(() => {
        console.log('🔍 [CRM] Componente Montado');
        return () => console.log('🔍 [CRM] Componente DESMONTADO');
    }, []);

    const closeModal = () => {
        console.log('🔍 [CRM] Fechando modal via closeModal');
        setIsModalOpen(false);
        setCurrentDeal(emptyDeal);
    };

    // Filter locally for immediate feedback (Supabase handles main filtering)
    const filteredDeals = deals;

    const stages: { key: Deal['stage'], label: string, color: string, borderColor: string }[] = [
        { key: 'lead', label: t('stageLead'), color: 'bg-blue-500', borderColor: 'border-blue-500' },
        { key: 'contacted', label: t('stageContacted'), color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
        { key: 'proposal', label: t('stageProposal'), color: 'bg-purple-500', borderColor: 'border-purple-500' },
        { key: 'negotiation', label: t('stageNegotiation'), color: 'bg-orange-500', borderColor: 'border-orange-500' },
        { key: 'closed', label: t('stageClosed'), color: 'bg-green-500', borderColor: 'border-green-500' },
    ];

    const handleSave = async () => {
        if (!currentDeal.clientName || !tenantId) return;

        try {
            if (currentDeal.id) {
                // Update existing deal
                const updated = await crmService.updateDeal(currentDeal.id, currentDeal);
                if (updated) {
                    setDeals(prev => prev.map(d => d.id === currentDeal.id ? updated : d));
                    toast.success(t('dealUpdated'));
                } else {
                    toast.error('Erro ao atualizar negócio');
                }
            } else {
                // Create new deal
                const created = await crmService.createDeal(tenantId, currentDeal);
                if (created) {
                    setDeals(prev => [...prev, created]);
                    toast.success(t('dealCreated'));
                } else {
                    toast.error('Erro ao criar negócio');
                }
            }
            closeModal();
        } catch (error) {
            console.error('🔍 [CRM] Erro ao salvar deal:', error);
            toast.error('Erro ao salvar negócio');
        }
    };

    const handleDelete = async () => {
        if (!currentDeal.id) return;

        try {
            const success = await crmService.deleteDeal(currentDeal.id);
            if (success) {
                setDeals(prev => prev.filter(d => d.id !== currentDeal.id));
                toast.success(t('dealDeleted'));
            } else {
                toast.error('Erro ao excluir negócio');
            }
            closeModal();
        } catch (error) {
            console.error('🔍 [CRM] Erro ao excluir deal:', error);
            toast.error('Erro ao excluir negócio');
        }
    };

    const openNewDealModal = () => {
        setCurrentDeal(emptyDeal);
        setIsModalOpen(true);
    };

    const openEditDealModal = (deal: Deal) => {
        setCurrentDeal(deal);
        setIsModalOpen(true);
    };

    const handleDragStart = (e: React.DragEvent, dealId: string) => {
        setDraggedDealId(dealId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = async (e: React.DragEvent, stage: Deal['stage']) => {
        e.preventDefault();
        if (draggedDealId) {
            const deal = deals.find(d => d.id === draggedDealId);
            if (deal && deal.stage !== stage) {
                // Optimistic update
                setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, stage } : d));

                // Persist to database
                const success = await crmService.updateDealStage(draggedDealId, stage);
                if (success) {
                    toast.success(`${t('movedTo')} ${stages.find(s => s.key === stage)?.label || stage}`);
                } else {
                    // Revert on failure
                    setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, stage: deal.stage } : d));
                    toast.error('Erro ao mover negócio');
                }
            }
        }
        setDraggedDealId(null);
    };

    const totalPipelineValue = deals.filter(d => d.stage !== 'closed').reduce((acc, curr) => acc + curr.value, 0);
    const conversionRate = Math.round((deals.filter(d => d.stage === 'closed').length / deals.length) * 100) || 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0a0a0c] transition-colors duration-500">
            <Header title={t('crmTitle')} />
            <div className="flex-1 p-6 pt-2 overflow-y-auto scroll-smooth">

                {/* Stats Row with Stagger Animation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 stagger-in">
                    <div className="glass-panel bg-white dark:bg-white/[0.03] p-4 rounded-[1.5rem] flex items-center gap-3 shadow-xl dark:shadow-black/50 hover-lift brand-glow-hover border border-gray-200 dark:border-white/10">
                        <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary animate-glow-pulse shadow-lg shadow-brand-primary/10">
                            <span className="material-symbols-outlined text-2xl">monetization_on</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">{t('totalValue')}</p>
                            <p className="text-xl font-black dark:text-white tracking-tighter">${totalPipelineValue.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="glass-panel bg-white dark:bg-white/5 p-4 rounded-[1.5rem] flex items-center gap-3 shadow-xl hover-lift brand-glow-hover">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shadow-lg shadow-blue-500/10">
                            <span className="material-symbols-outlined text-2xl">work</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">{t('openDeals')}</p>
                            <p className="text-xl font-black dark:text-white tracking-tighter">{deals.filter(d => d.stage !== 'closed').length}</p>
                        </div>
                    </div>
                    <div className="glass-panel bg-white dark:bg-white/5 p-4 rounded-[1.5rem] flex items-center gap-3 shadow-xl hover-lift brand-glow-hover">
                        <div className="p-2 rounded-xl bg-green-500/10 text-green-500 shadow-lg shadow-green-500/10">
                            <span className="material-symbols-outlined text-2xl">trending_up</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">{t('conversionRate')}</p>
                            <p className="text-xl font-black dark:text-white tracking-tighter">{conversionRate}%</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative w-full md:w-[450px] group">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary premium-transition">search</span>
                        <input
                            type="text"
                            placeholder={t('searchDeals')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-6 py-2.5 focus:ring-2 focus:ring-brand-primary outline-none text-sm premium-transition shadow-sm"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-inner">
                            <button
                                onClick={() => setViewMode('kanban')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'kanban' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                {t('pipeline')}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                {t('listView')}
                            </button>
                        </div>
                        <button onClick={openNewDealModal} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary text-white font-black uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 premium-transition shadow-xl shadow-brand-primary/20 whitespace-nowrap">
                            <span className="material-symbols-outlined text-sm">add</span>
                            {t('newDeal')}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {viewMode === 'kanban' ? (
                        <motion.div
                            key="kanban"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex overflow-x-auto pb-4 gap-2 h-[calc(100vh-280px)] no-scrollbar pr-10"
                        >
                            {stages.map((stage, sIdx) => (
                                <div
                                    key={stage.key}
                                    className="min-w-[245px] w-[245px] flex flex-col"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.key)}
                                >
                                    <div className="flex items-center justify-between mb-4 px-3 pb-3 border-b border-gray-200 dark:border-white/10">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${stage.color} animate-pulse`}></span>
                                            <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">{stage.label}</h4>
                                        </div>
                                        <span className="text-[9px] font-black text-gray-400 bg-gray-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10">
                                            {filteredDeals.filter(d => d.stage === stage.key).length}
                                        </span>
                                    </div>
                                    <div className="flex-1 space-y-4 overflow-y-auto px-2 no-scrollbar">
                                        {filteredDeals.filter(d => d.stage === stage.key).map((deal, dIdx) => (
                                            <motion.div
                                                key={deal.id}
                                                layoutId={deal.id}
                                                draggable
                                                onDragStart={(e: any) => handleDragStart(e, deal.id)}
                                                onClick={() => openEditDealModal(deal)}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: dIdx * 0.05 + sIdx * 0.1 }}
                                                className={`bg-white dark:bg-[#121216] p-4 rounded-2xl shadow-xl dark:shadow-black/40 hover:shadow-2xl cursor-grab active:cursor-grabbing border border-gray-200 dark:border-white/10 group hover:border-brand-primary/40 premium-transition hover-lift min-h-[110px] flex flex-col justify-between`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h5 className="font-black text-xs text-gray-800 dark:text-white truncate pr-2 tracking-tight group-hover:text-brand-primary transition-colors">
                                                            {deal.clientName}
                                                        </h5>
                                                        <div className="p-1 rounded-lg bg-gray-50 dark:bg-white/[0.08] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2 min-h-[10px]">
                                                        {deal.company || '—'}
                                                    </p>
                                                </div>

                                                <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-white/10 mt-auto">
                                                    <span className="font-black text-sm text-brand-primary tracking-tighter">${deal.value.toLocaleString()}</span>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 rounded-md">{deal.lastContact || 'NUNCA'}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-panel bg-white dark:bg-white/[0.03] rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10"
                        >
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-200 dark:border-white/10">
                                    <tr>
                                        <th className="px-6 py-4">{t('client')}</th>
                                        <th className="px-6 py-4">{t('company')}</th>
                                        <th className="px-6 py-4">{t('value')}</th>
                                        <th className="px-6 py-4">{t('stage')}</th>
                                        <th className="px-6 py-4">{t('email')}</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                    {filteredDeals.map((deal, idx) => (
                                        <motion.tr
                                            key={deal.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            onClick={() => openEditDealModal(deal)}
                                            className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-black text-gray-800 dark:text-white tracking-tight group-hover:text-brand-primary transition-colors">{deal.clientName}</td>
                                            <td className="px-6 py-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">{deal.company}</td>
                                            <td className="px-6 py-4 font-black text-brand-primary text-base tracking-tighter">${deal.value.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-black/10 ${stages.find(s => s.key === deal.stage)?.color}`}>
                                                    {stages.find(s => s.key === deal.stage)?.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 font-medium">{deal.email}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="p-2 rounded-xl hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-sm">more_vert</span>
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    console.log('🔍 [CRM] Fechando modal via clique no fundo');
                                    closeModal();
                                }
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 40, rotateX: 10 }}
                                animate={{ scale: 1, y: 0, rotateX: 0 }}
                                exit={{ scale: 0.9, y: 40, rotateX: 10 }}
                                className="glass-panel bg-white dark:bg-[#2a2a32] border border-gray-200 dark:border-white/30 rounded-3xl w-full max-w-lg p-5 lg:p-6 shadow-2xl dark:shadow-[0_0_100px_rgba(0,0,0,0.95)] relative flex flex-col max-h-[85vh] perspective-[2000px]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-tight">
                                            {currentDeal.id ? t('dealSheet') : t('newPipeline')}
                                        </h2>
                                        <p className="text-gray-500 text-[8px] font-bold uppercase tracking-[0.2em]">{t('crmManagement')}</p>
                                    </div>
                                    <button
                                        onClick={closeModal}
                                        className="text-gray-400 hover:text-brand-primary transition-all bg-gray-50 dark:bg-white/5 p-2 rounded-xl hover:rotate-90"
                                    >
                                        <span className="material-symbols-outlined text-xl">close</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
                                    <div className="flex flex-col gap-4">
                                        {/* Form Fields */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 ml-1">{t('clientIdentification')}</label>
                                                <input
                                                    type="text"
                                                    value={currentDeal.clientName}
                                                    onChange={(e) => setCurrentDeal({ ...currentDeal, clientName: e.target.value })}
                                                    placeholder="Nome ou Razão Social"
                                                    className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/20 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-semibold text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 ml-1">{t('relatedCompany')}</label>
                                                <input
                                                    type="text"
                                                    value={currentDeal.company}
                                                    onChange={(e) => setCurrentDeal({ ...currentDeal, company: e.target.value })}
                                                    placeholder="Grupo Econômico"
                                                    className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/20 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-semibold text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 ml-1">{t('estimatedValue')}</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-primary font-black text-sm">$</span>
                                                        <input
                                                            type="number"
                                                            value={currentDeal.value}
                                                            onChange={(e) => setCurrentDeal({ ...currentDeal, value: Number(e.target.value) })}
                                                            className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/20 rounded-xl pl-8 pr-3 py-2.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-black text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1 ml-1">{t('salesStatus')}</label>
                                                    <select
                                                        value={currentDeal.stage}
                                                        onChange={(e) => setCurrentDeal({ ...currentDeal, stage: e.target.value as Deal['stage'] })}
                                                        className="w-full bg-white dark:bg-black/30 border border-gray-200 dark:border-white/20 rounded-xl px-4 py-2.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all font-semibold text-sm appearance-none cursor-pointer"
                                                    >
                                                        {stages.map(s => (
                                                            <option key={s.key} value={s.key}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline / History */}
                                        <div className="bg-white dark:bg-black/20 rounded-2xl p-4 border border-gray-200 dark:border-white/10 shadow-inner">
                                            <h3 className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-primary mb-3 ml-1">{t('interactionTimeline')}</h3>
                                            <div className="space-y-3 relative">
                                                <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-brand-primary/20 -z-10"></div>

                                                {[
                                                    { time: 'Hoje, 10:30', title: 'Proposta enviada via email', color: 'bg-green-500' },
                                                    { time: 'Ontem, 14:00', title: 'Reunião de alinhamento', color: 'bg-blue-500', desc: 'Cliente demonstrou interesse no plano de expansão Pro.' },
                                                    { time: '2 dias atrás', title: 'Lead originado via LIA AI', color: 'bg-purple-500' }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex gap-3 items-start">
                                                        <div className={`w-3 h-3 rounded-full ${item.color} mt-0.5 border-2 border-white dark:border-[#2a2a32] shadow`}></div>
                                                        <div className="flex-1">
                                                            <p className="text-[7px] font-black text-gray-500 uppercase tracking-widest">{item.time}</p>
                                                            <p className="text-xs font-bold text-gray-800 dark:text-white tracking-tight">{item.title}</p>
                                                            {item.desc && <p className="text-[10px] text-gray-500 font-medium mt-1 leading-snug bg-gray-50 dark:bg-black/30 p-2 rounded-lg">{item.desc}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between mt-5 pt-4 border-t border-gray-100 dark:border-white/10">
                                    {currentDeal.id ? (
                                        <button
                                            onClick={handleDelete}
                                            className="px-6 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {t('deleteDealBtn')}
                                        </button>
                                    ) : <div></div>}

                                    <div className="flex gap-3">
                                        <button
                                            onClick={closeModal}
                                            className="px-6 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            {t('cancel')}
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-8 py-2.5 rounded-xl bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/30 hover:scale-105 active:scale-95 premium-transition"
                                        >
                                            {currentDeal.id ? t('saveDealChanges') : t('saveChanges')}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CRM;
