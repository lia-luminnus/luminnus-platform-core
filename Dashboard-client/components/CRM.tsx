
import React, { useState, useContext } from 'react';
import Header from './Header';
import { Deal } from '../types';
import { LanguageContext } from '../App';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const initialDeals: Deal[] = [
    { id: '1', clientName: 'Acme Corp', company: 'Acme', value: 5000, stage: 'lead', email: 'contact@acme.com', phone: '555-0101', lastContact: '2 days ago' },
    { id: '2', clientName: 'John Doe', company: 'Doe Inc', value: 12000, stage: 'proposal', email: 'john@doe.com', phone: '555-0102', lastContact: '1 day ago' },
    { id: '3', clientName: 'TechStart', company: 'TechStart', value: 3500, stage: 'contacted', email: 'ceo@techstart.io', phone: '555-0103', lastContact: '3 hours ago' },
    { id: '4', clientName: 'Global Solutions', company: 'Global', value: 25000, stage: 'negotiation', email: 'sales@global.com', phone: '555-0104', lastContact: '1 week ago' },
    { id: '5', clientName: 'Local Coffee', company: 'Local Coffee', value: 1500, stage: 'lead', email: 'owner@coffee.com', phone: '555-0105', lastContact: 'Just now' },
    { id: '6', clientName: 'Enterprise Sys', company: 'EntSys', value: 50000, stage: 'closed', email: 'procurement@entsys.com', phone: '555-0199', lastContact: '1 month ago' },
];

const CRM: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const [deals, setDeals] = useState<Deal[]>(initialDeals);
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentDeal, setCurrentDeal] = useState<Partial<Deal>>({ stage: 'lead', value: 0 });
    const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

    const filteredDeals = deals.filter(deal =>
        deal.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stages: { key: Deal['stage'], label: string, color: string, borderColor: string }[] = [
        { key: 'lead', label: t('stageLead'), color: 'bg-blue-500', borderColor: 'border-blue-500' },
        { key: 'contacted', label: t('stageContacted'), color: 'bg-yellow-500', borderColor: 'border-yellow-500' },
        { key: 'proposal', label: t('stageProposal'), color: 'bg-purple-500', borderColor: 'border-purple-500' },
        { key: 'negotiation', label: t('stageNegotiation'), color: 'bg-orange-500', borderColor: 'border-orange-500' },
        { key: 'closed', label: t('stageClosed'), color: 'bg-green-500', borderColor: 'border-green-500' },
    ];

    const handleSave = () => {
        if (!currentDeal.clientName) return;

        if (currentDeal.id) {
            setDeals(prev => prev.map(d => d.id === currentDeal.id ? { ...d, ...currentDeal } as Deal : d));
            toast.success("Negócio atualizado");
        } else {
            const newId = Date.now().toString();
            const newDeal: Deal = {
                ...currentDeal as Deal,
                id: newId,
                lastContact: 'Just now'
            };
            setDeals(prev => [...prev, newDeal]);
            toast.success("Negócio criado");
        }
        setIsModalOpen(false);
    };

    const handleDelete = () => {
        if (currentDeal.id) {
            setDeals(prev => prev.filter(d => d.id !== currentDeal.id));
            toast.success("Negócio removido");
        }
        setIsModalOpen(false);
    };

    const openNewDealModal = () => {
        setCurrentDeal({ stage: 'lead', value: 0, clientName: '', company: '', email: '', phone: '' });
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

    const handleDrop = (e: React.DragEvent, stage: Deal['stage']) => {
        e.preventDefault();
        if (draggedDealId) {
            const deal = deals.find(d => d.id === draggedDealId);
            if (deal && deal.stage !== stage) {
                setDeals(prev => prev.map(d => d.id === draggedDealId ? { ...d, stage } : d));
                toast.success(`Movido para ${stage}`);
            }
        }
        setDraggedDealId(null);
    };

    const totalPipelineValue = deals.filter(d => d.stage !== 'closed').reduce((acc, curr) => acc + curr.value, 0);
    const conversionRate = Math.round((deals.filter(d => d.stage === 'closed').length / deals.length) * 100) || 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-bg transition-colors duration-500">
            <Header title={t('crmTitle')} />
            <div className="flex-1 p-8 pt-2 overflow-y-auto scroll-smooth">

                {/* Stats Row with Stagger Animation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 stagger-in">
                    <div className="glass-panel bg-white dark:bg-white/5 p-8 rounded-3xl flex items-center gap-6 shadow-xl hover-lift brand-glow-hover">
                        <div className="p-4 rounded-2xl bg-brand-primary/10 text-brand-primary animate-glow-pulse shadow-lg shadow-brand-primary/10">
                            <span className="material-symbols-outlined text-4xl">monetization_on</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('totalValue')}</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">${totalPipelineValue.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="glass-panel bg-white dark:bg-white/5 p-8 rounded-3xl flex items-center gap-6 shadow-xl hover-lift brand-glow-hover">
                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500 shadow-lg shadow-blue-500/10">
                            <span className="material-symbols-outlined text-4xl">work</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('openDeals')}</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{deals.filter(d => d.stage !== 'closed').length}</p>
                        </div>
                    </div>
                    <div className="glass-panel bg-white dark:bg-white/5 p-8 rounded-3xl flex items-center gap-6 shadow-xl hover-lift brand-glow-hover">
                        <div className="p-4 rounded-2xl bg-green-500/10 text-green-500 shadow-lg shadow-green-500/10">
                            <span className="material-symbols-outlined text-4xl">trending_up</span>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{t('conversionRate')}</p>
                            <p className="text-3xl font-black dark:text-white tracking-tighter">{conversionRate}%</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                    <div className="relative w-full md:w-[450px] group">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary premium-transition">search</span>
                        <input
                            type="text"
                            placeholder={t('searchDeals')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 focus:ring-2 focus:ring-brand-primary outline-none text-sm premium-transition shadow-sm"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-1 shadow-inner">
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
                        <button onClick={openNewDealModal} className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-brand-primary text-white font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 premium-transition shadow-xl shadow-brand-primary/20 whitespace-nowrap">
                            <span className="material-symbols-outlined">add</span>
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
                            className="flex overflow-x-auto pb-8 gap-8 h-[calc(100vh-320px)] no-scrollbar"
                        >
                            {stages.map((stage, sIdx) => (
                                <div
                                    key={stage.key}
                                    className="min-w-[320px] w-[320px] flex flex-col"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.key)}
                                >
                                    <div className="flex items-center justify-between mb-6 px-4 pb-4 border-b border-gray-200 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${stage.color} animate-pulse`}></span>
                                            <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{stage.label}</h4>
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-200 dark:border-white/10">
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
                                                className={`bg-white dark:bg-white/5 p-6 rounded-[2rem] shadow-xl hover:shadow-2xl cursor-grab active:cursor-grabbing border border-gray-200 dark:border-white/5 group hover:border-brand-primary/40 premium-transition hover-lift`}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <h5 className="font-black text-sm text-gray-800 dark:text-white truncate pr-2 tracking-tight group-hover:text-brand-primary transition-colors">{deal.clientName}</h5>
                                                    <div className="p-1.5 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{deal.company}</p>
                                                <div className="flex justify-between items-center pt-5 border-t border-gray-50 dark:border-white/5">
                                                    <span className="font-black text-base text-brand-primary tracking-tighter">${deal.value.toLocaleString()}</span>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-white/5 px-2 py-1 rounded-lg">{deal.lastContact}</span>
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
                            className="glass-panel bg-white dark:bg-white/5 rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/5"
                        >
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-200 dark:border-white/5">
                                    <tr>
                                        <th className="px-8 py-6">{t('client')}</th>
                                        <th className="px-8 py-6">{t('company')}</th>
                                        <th className="px-8 py-6">{t('value')}</th>
                                        <th className="px-8 py-6">{t('stage')}</th>
                                        <th className="px-8 py-6">{t('email')}</th>
                                        <th className="px-8 py-6 text-right"></th>
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
                                            <td className="px-8 py-6 font-black text-gray-800 dark:text-white tracking-tight group-hover:text-brand-primary transition-colors">{deal.clientName}</td>
                                            <td className="px-8 py-6 font-bold text-gray-500 uppercase text-[10px] tracking-widest">{deal.company}</td>
                                            <td className="px-8 py-6 font-black text-brand-primary text-base tracking-tighter">${deal.value.toLocaleString()}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-black/10 ${stages.find(s => s.key === deal.stage)?.color}`}>
                                                    {stages.find(s => s.key === deal.stage)?.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-gray-400 font-medium">{deal.email}</td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-3 rounded-2xl hover:bg-white dark:hover:bg-white/10 text-gray-400 hover:text-brand-primary transition-all shadow-sm">
                                                    <span className="material-symbols-outlined">more_vert</span>
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
                            onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 40, rotateX: 10 }}
                                animate={{ scale: 1, y: 0, rotateX: 0 }}
                                exit={{ scale: 0.9, y: 40, rotateX: 10 }}
                                className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-[3rem] w-full max-w-4xl p-10 lg:p-14 shadow-2xl relative flex flex-col max-h-[95vh] perspective-[2000px]"
                            >
                                <div className="flex justify-between items-center mb-12">
                                    <div>
                                        <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
                                            {currentDeal.id ? 'Ficha do Negócio' : 'Novo Pipeline'}
                                        </h2>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] mt-2">Gestão de CRM • Zenith Intelligence</p>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="text-gray-400 hover:text-brand-primary transition-all bg-gray-50 dark:bg-white/5 p-4 rounded-[2rem] hover:rotate-90"
                                    >
                                        <span className="material-symbols-outlined text-4xl">close</span>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-4 no-scrollbar">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                        {/* Form Fields */}
                                        <div className="space-y-10">
                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Identificação do Cliente</label>
                                                <input
                                                    type="text"
                                                    value={currentDeal.clientName}
                                                    onChange={(e) => setCurrentDeal({ ...currentDeal, clientName: e.target.value })}
                                                    placeholder="Nome ou Razão Social"
                                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[1.5rem] px-8 py-5 text-gray-800 dark:text-white focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold text-lg"
                                                />
                                            </div>
                                            <div className="space-y-4">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Empresa Relacionada</label>
                                                <input
                                                    type="text"
                                                    value={currentDeal.company}
                                                    onChange={(e) => setCurrentDeal({ ...currentDeal, company: e.target.value })}
                                                    placeholder="Grupo Econômico"
                                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[1.5rem] px-8 py-5 text-gray-800 dark:text-white focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-4">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Valor Estimado</label>
                                                    <div className="relative">
                                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-brand-primary text-xl">$</span>
                                                        <input
                                                            type="number"
                                                            value={currentDeal.value}
                                                            onChange={(e) => setCurrentDeal({ ...currentDeal, value: Number(e.target.value) })}
                                                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[1.5rem] pl-12 pr-6 py-5 text-gray-800 dark:text-white focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-black text-xl"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Status da Venda</label>
                                                    <select
                                                        value={currentDeal.stage}
                                                        onChange={(e) => setCurrentDeal({ ...currentDeal, stage: e.target.value as Deal['stage'] })}
                                                        className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-[1.5rem] px-8 py-5 text-gray-800 dark:text-white focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                    >
                                                        {stages.map(s => (
                                                            <option key={s.key} value={s.key}>{s.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline / History */}
                                        <div className="bg-gray-50 dark:bg-white/5 rounded-[2.5rem] p-10 border border-gray-200 dark:border-white/5 shadow-inner">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-8 ml-2">Cronologia de Interação</h3>
                                            <div className="space-y-8 relative">
                                                <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-brand-primary/20 -z-10"></div>

                                                {[
                                                    { time: 'Hoje, 10:30', title: 'Proposta enviada via email', color: 'bg-green-500' },
                                                    { time: 'Ontem, 14:00', title: 'Reunião de alinhamento', color: 'bg-blue-500', desc: 'Cliente demonstrou interesse no plano de expansão Pro.' },
                                                    { time: '2 dias atrás', title: 'Lead originado via LIA AI', color: 'bg-purple-500' }
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex gap-6 items-start">
                                                        <div className={`w-5 h-5 rounded-full ${item.color} mt-1 border-[4px] border-white dark:border-dark-card shadow-lg`}></div>
                                                        <div className="flex-1">
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.time}</p>
                                                            <p className="text-sm font-black text-gray-800 dark:text-white tracking-tight mt-1">{item.title}</p>
                                                            {item.desc && <p className="text-[11px] text-gray-500 font-medium mt-2 leading-relaxed bg-white dark:bg-black/20 p-3 rounded-2xl">{item.desc}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between mt-12 pt-10 border-t border-gray-100 dark:border-white/5">
                                    {currentDeal.id ? (
                                        <button
                                            onClick={handleDelete}
                                            className="px-10 py-4 rounded-2xl text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest transition-all shadow-sm"
                                        >
                                            Excluir Negócio
                                        </button>
                                    ) : <div></div>}

                                    <div className="flex gap-5">
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="px-10 py-4 rounded-2xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all"
                                        >
                                            {t('cancel')}
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-14 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 premium-transition shadow-2xl shadow-brand-primary/30"
                                        >
                                            {currentDeal.id ? 'Salvar Alterações' : 'Criar Novo Negócio'}
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
