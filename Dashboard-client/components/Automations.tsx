import React, { useContext, useState, useEffect, useCallback } from 'react';
import Header from './Header';
import { Automation } from '../types';
import { LanguageContext } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Trash2, Copy, History, Plus, Search, AlertCircle, CheckCircle2, MoreVertical, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import AutomationWizard from './automations/AutomationWizard';
import AutomationDrawer from './automations/AutomationDrawer';

const Automations: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [stats, setStats] = useState<any>({ total: 0, active: 0, error: 0, paused: 0 });
    const [loading, setLoading] = useState(true);

    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedAutoId, setSelectedAutoId] = useState<string | null>(null);

    const { user } = useDashboardAuth();

    // 🔒 SECURITY: Get tenant from user context
    const userTenantId = (user as any)?.user_metadata?.tenant_id || (user as any)?.tenant_id || null;

    // 🔑 Admin detection (same logic as DashboardAuthContext)
    const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || 'luminnus.lia.ai@gmail.com';
    const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase());
    const isAdmin = adminEmails.includes(user?.email?.toLowerCase() || '');

    // 🔒 SECURITY: Admin uses default admin tenant, clients require their own tenant
    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const tenantId = userTenantId || (isAdmin ? ADMIN_TENANT_ID : null);

    const API_URL = import.meta.env.VITE_API_URL || 'https://luminnus-platform-core.onrender.com';

    const fetchData = useCallback(async () => {
        // 🔒 SECURITY: Block fetch if no tenant (non-admin users only)
        if (!tenantId) {
            console.warn('⚠️ [Automations] No tenant_id for non-admin user - blocking fetch');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            console.log(`📡 [Automations] Carregando dados para tenant: ${tenantId}`);

            const [autoRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/api/automations?tenantId=${tenantId}`),
                fetch(`${API_URL}/api/automations/stats/summary?tenantId=${tenantId}`)
            ]);

            // 🛡️ Verificar se as respostas são válidas antes de dar parse no JSON
            // Nota: Algumas APIs retornam 200 com corpo vazio, precisamos verificar o texto primeiro
            if (!autoRes.ok || autoRes.status === 204) {
                console.warn('⚠️ [Automations] Lista de automações vazia ou erro no servidor');
                setAutomations([]);
            } else {
                const autoText = await autoRes.text();
                if (!autoText || autoText.trim() === '') {
                    console.warn('⚠️ [Automations] Resposta vazia da API de automações');
                    setAutomations([]);
                } else {
                    try {
                        const autoData = JSON.parse(autoText);
                        if (autoData.success) setAutomations(autoData.data || []);
                        else setAutomations([]);
                    } catch (parseErr) {
                        console.error('❌ [Automations] Erro ao parsear resposta:', parseErr);
                        setAutomations([]);
                    }
                }
            }

            if (!statsRes.ok || statsRes.status === 204) {
                console.warn('⚠️ [Automations] Estatísticas não disponíveis');
            } else {
                const statsText = await statsRes.text();
                if (!statsText || statsText.trim() === '') {
                    console.warn('⚠️ [Automations] Resposta vazia da API de estatísticas');
                } else {
                    try {
                        const statsData = JSON.parse(statsText);
                        if (statsData.success) setStats(statsData.data || { total: 0, active: 0, error: 0, paused: 0 });
                    } catch (parseErr) {
                        console.error('❌ [Automations] Erro ao parsear estatísticas:', parseErr);
                    }
                }
            }

        } catch (err) {
            console.error('❌ [Automations] Erro fatal no fetch:', err);
            // Não mostrar toast de erro se for apenas resposta vazia
            if (err instanceof SyntaxError) {
                console.warn('⚠️ [Automations] Servidor retornou resposta inválida');
            } else {
                toast.error('Erro de sincronização. Verifique se o servidor está online.');
            }
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = async (id: string, action: 'activate' | 'pause' | 'run' | 'delete' | 'duplicate') => {
        const loadingToast = toast.loading('Processando...');
        try {
            let res;
            if (action === 'run') {
                res = await fetch(`${API_URL}/api/automations/${id}/run?tenantId=${tenantId}`, { method: 'POST' });
            } else if (action === 'delete') {
                res = await fetch(`${API_URL}/api/automations/${id}?tenantId=${tenantId}`, { method: 'DELETE' });
            } else if (action === 'activate') {
                res = await fetch(`${API_URL}/api/automations/${id}?tenantId=${tenantId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'active', is_enabled: true })
                });
            } else if (action === 'pause') {
                res = await fetch(`${API_URL}/api/automations/${id}?tenantId=${tenantId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'paused', is_enabled: false })
                });
            }

            if (!res || !res.ok) {
                throw new Error('Falha na resposta do servidor');
            }

            const data = await res.json();
            if (data?.success) {
                toast.success('Operação concluída!', { id: loadingToast });
                fetchData();
            } else {
                toast.error(data?.error || 'Falha na operação', { id: loadingToast });
            }
        } catch (err) {
            console.error('Action error:', err);
            toast.error('Erro de conexão com o servidor', { id: loadingToast });
        }
    };

    const filteredAutomations = automations.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || a.status === filter;
        return matchesSearch && matchesFilter;
    });

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'error': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'paused': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0A0F1A]">
            <Header title={t('automationsTitle')} />

            <div className="flex-1 p-8 pt-4 overflow-y-auto no-scrollbar">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Gerenciador de Automações</h1>
                        <p className="text-sm text-gray-500">Crie fluxos inteligentes orquestrados pela LIA</p>
                    </div>
                    <button
                        onClick={() => setIsWizardOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-primary text-white hover:shadow-xl hover:shadow-brand-primary/20 transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-primary/10"
                    >
                        <Plus size={18} />
                        Nova Automação
                    </button>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    {[
                        { label: 'Total', value: stats.total, icon: <Terminal size={24} />, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                        { label: 'Ativas', value: stats.active, icon: <CheckCircle2 size={24} />, color: 'text-green-400', bg: 'bg-green-400/10' },
                        { label: 'Pausadas', value: stats.paused, icon: <Pause size={24} />, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                        { label: 'Erros', value: stats.error, icon: <AlertCircle size={24} />, color: 'text-red-400', bg: 'bg-red-400/10' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            whileHover={{ y: -4 }}
                            className="glass-panel bg-white dark:bg-white/5 p-6 rounded-3xl flex items-center gap-5 shadow-sm border border-gray-200 dark:border-white/5"
                        >
                            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                                <p className="text-3xl font-black dark:text-white tracking-tighter">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Filters & Table */}
                <div className="glass-panel bg-white dark:bg-[#0D111C] rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
                    <div className="p-8 border-b border-gray-200 dark:border-white/10 flex flex-col xl:flex-row justify-between items-center gap-6">
                        <div className="relative w-full xl:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou gatilho..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm w-full focus:ring-2 focus:ring-brand-primary outline-none transition-all dark:text-white font-medium"
                            />
                        </div>

                        <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-200 dark:border-white/10 overflow-x-auto no-scrollbar max-w-full">
                            {['all', 'active', 'paused', 'error', 'draft'].map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFilter(s)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all whitespace-nowrap ${filter === s
                                        ? 'bg-white dark:bg-brand-primary shadow-xl font-bold text-brand-primary dark:text-white'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    {s === 'all' ? 'Ver Todos' : s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-white/2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Nome da Automação</th>
                                    <th className="px-8 py-5">Gatilho (Trigger)</th>
                                    <th className="px-8 py-5">Última Atividade</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-gray-500 font-bold animate-pulse">Sincronizando com o Core...</td></tr>
                                ) : filteredAutomations.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-gray-500 font-bold">Nenhuma automação encontrada.</td></tr>
                                ) : filteredAutomations.map((auto) => (
                                    <tr key={auto.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-gray-900 dark:text-white text-sm uppercase tracking-tighter">{auto.name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono mt-1">ID: {auto.id.split('-')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Zap size={14} className="text-brand-primary" />
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-tighter">{auto.trigger_type || auto.trigger}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <History size={14} />
                                                <span className="text-xs font-medium">{auto.lastRun || 'Nunca executada'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(auto.status)}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${auto.status === 'active' ? 'bg-green-500 animate-pulse' : auto.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                                {auto.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => handleAction(auto.id, 'run')}
                                                    title="Executar Agora"
                                                    className="p-3 rounded-xl bg-brand-primary/5 text-brand-primary hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                                                >
                                                    <Play size={16} fill="currentColor" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedAutoId(auto.id)}
                                                    title="Ver Logs"
                                                    className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                                >
                                                    <History size={16} />
                                                </button>
                                                {auto.status === 'active' ? (
                                                    <button onClick={() => handleAction(auto.id, 'pause')} className="p-3 rounded-xl bg-amber-500/5 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"><Pause size={16} /></button>
                                                ) : (
                                                    <button onClick={() => handleAction(auto.id, 'activate')} className="p-3 rounded-xl bg-green-500/5 text-green-500 hover:bg-green-500 hover:text-white transition-all"><Play size={16} /></button>
                                                )}
                                                <button onClick={() => handleAction(auto.id, 'delete')} className="p-3 rounded-xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals & Drawers */}
            <AutomationWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={fetchData}
            />

            <AnimatePresence>
                {selectedAutoId && (
                    <AutomationDrawer
                        automationId={selectedAutoId}
                        onClose={() => setSelectedAutoId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Automations;
