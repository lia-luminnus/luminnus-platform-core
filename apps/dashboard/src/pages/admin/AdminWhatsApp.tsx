
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart3,
    Users,
    MessageSquare,
    Settings,
    Activity,
    Search,
    Filter,
    Download,
    RefreshCw,
    Eye,
    ShieldCheck,
    Zap,
    History,
    AlertCircle,
    CheckCircle2,
    XCircle,
    MoreVertical,
    ChevronRight,
    ClipboardList
} from 'lucide-react';

// Mock types to simulate real data
interface WhatsAppTenant {
    id: string;
    name: string;
    plan: 'start' | 'plus' | 'pro';
    status: 'connected' | 'disconnected' | 'error' | 'provisioning';
    phoneNumber: string;
    lastWebhook: string | null;
    lastError: string | null;
    messagesToday: number;
    templatesToday: number;
    quality: 'ok' | 'risk' | 'critical';
}

const AdminWhatsApp: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [tenants, setTenants] = useState<WhatsAppTenant[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTenant, setSelectedTenant] = useState<WhatsAppTenant | null>(null);

    useEffect(() => {
        // Simulate API fetch
        const timer = setTimeout(() => {
            setTenants([
                { id: 't-001', name: 'Luminnus Tech', plan: 'pro', status: 'connected', phoneNumber: '+55 ** *****-9999', lastWebhook: '2026-01-19T10:00:00Z', lastError: null, messagesToday: 1240, templatesToday: 45, quality: 'ok' },
                { id: 't-002', name: 'Empresa Alpha', plan: 'plus', status: 'error', phoneNumber: '+55 ** *****-8888', lastWebhook: '2026-01-18T22:30:00Z', lastError: 'Auth Failure', messagesToday: 0, templatesToday: 0, quality: 'risk' },
                { id: 't-003', name: 'Beta Solutions', plan: 'start', status: 'connected', phoneNumber: '+55 ** *****-7777', lastWebhook: '2026-01-19T09:45:00Z', lastError: null, messagesToday: 156, templatesToday: 12, quality: 'ok' },
                { id: 't-004', name: 'Nova Corp', plan: 'pro', status: 'provisioning', phoneNumber: '+55 ** *****-1234', lastWebhook: null, lastError: null, messagesToday: 0, templatesToday: 0, quality: 'ok' },
            ]);
            setLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'provisioning': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-200/20';
        }
    };

    return (
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gray-50 dark:bg-[#0A0F1A]">
            {/* 2.1 Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="bg-brand-primary p-2 rounded-xl text-white">
                            <MessageSquare size={28} />
                        </span>
                        WhatsApp — Governança
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Visão global de números, status, qualidade e eventos</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm">
                        <Download size={18} />
                        Exportar CSV
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm">
                        <ClipboardList size={18} />
                        Logs Globais
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-xl text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-brand-primary/25">
                        <RefreshCw size={18} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* 2.2 KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-10">
                {[
                    { label: 'Tenants Conectados', value: '42', icon: Users, color: 'brand' },
                    { label: 'Tenants com Erro', value: '3', icon: AlertCircle, color: 'red' },
                    { label: 'Webhook 24h', value: '98%', icon: Activity, color: 'emerald' },
                    { label: 'Mensagens Hoje', value: '15.4k', icon: MessageSquare, color: 'blue' },
                    { label: 'Templates Hoje', value: '2.1k', icon: Zap, color: 'orange' },
                    { label: 'Alertas Ativos', value: '4', icon: ShieldCheck, color: 'amber' },
                ].map((kpi, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-xl bg-${kpi.color === 'brand' ? 'brand-primary/10' : kpi.color + '-500/10'} text-${kpi.color === 'brand' ? 'brand-primary' : kpi.color + '-500'}`}>
                                <kpi.icon size={20} />
                            </div>
                        </div>
                        {loading ? (
                            <div className="h-8 w-20 bg-gray-200 dark:bg-white/10 animate-pulse rounded-lg mb-1" />
                        ) : (
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{kpi.value}</h3>
                        )}
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{kpi.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* 2.3 Main Table */}
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-white/[0.02]">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Users size={20} className="text-brand-primary" />
                        Tenants & Números
                    </h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar tenant, ID ou número..."
                                className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">Todos Status</option>
                            <option value="connected">Conectado</option>
                            <option value="error">Erro</option>
                            <option value="provisioning">Implantação</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-white/10 divide-x divide-gray-200 dark:divide-white/5">
                                <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Empresa / ID</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center">Plano</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Número</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Msg Hoje</th>
                                <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-6"><div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" /></td>
                                        <td className="px-6 py-6"><div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded mx-auto" /></td>
                                        <td className="px-6 py-6"><div className="h-6 w-24 bg-gray-200 dark:bg-white/10 rounded-full" /></td>
                                        <td className="px-6 py-6"><div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" /></td>
                                        <td className="px-6 py-6 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-white/10 rounded ml-auto" /></td>
                                        <td className="px-6 py-6 text-right"><div className="h-4 w-12 bg-gray-200 dark:bg-white/10 rounded ml-auto" /></td>
                                    </tr>
                                ))
                            ) : (
                                tenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setSelectedTenant(tenant)}>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-gray-900 dark:text-white">{tenant.name}</div>
                                            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">{tenant.id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${tenant.plan === 'pro' ? 'text-purple-500 bg-purple-500/10' :
                                                    tenant.plan === 'plus' ? 'text-brand-primary bg-brand-primary/10' :
                                                        'text-gray-500 bg-gray-500/10'
                                                }`}>
                                                {tenant.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(tenant.status)}`}>
                                                <div className={`w-2 h-2 rounded-full bg-current ${tenant.status === 'connected' ? 'animate-pulse' : ''}`} />
                                                {tenant.status === 'connected' ? 'Conectado' :
                                                    tenant.status === 'error' ? 'Erro' :
                                                        tenant.status === 'provisioning' ? 'Implantação' : 'Desconectado'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                                            {tenant.phoneNumber}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold tabular-nums text-gray-900 dark:text-white">{tenant.messagesToday}</span>
                                            <div className="text-[10px] text-gray-500 uppercase">T: {tenant.templatesToday}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 hover:bg-brand-primary/20 hover:text-brand-primary rounded-lg transition-all text-gray-400">
                                                    <Eye size={18} />
                                                </button>
                                                <button className="p-2 hover:bg-emerald-500/20 hover:text-emerald-500 rounded-lg transition-all text-gray-400">
                                                    <Zap size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && tenants.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="inline-flex p-6 rounded-full bg-gray-100 dark:bg-white/5 mb-6">
                            <MessageSquare size={48} className="text-gray-300 dark:text-gray-700" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-white mb-2">Nenhum tenant encontrado</h3>
                        <p className="text-gray-500 font-medium">Não há empresas com WhatsApp configurado para os filtros selecionados.</p>
                    </div>
                )}
            </div>

            {/* 2.4 Tenant Details Drawer */}
            <AnimatePresence>
                {selectedTenant && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTenant(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-[#0D111C] shadow-2xl border-l border-white/10 overflow-y-auto"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-10">
                                    <div className={`p-4 rounded-3xl bg-brand-primary/10 text-brand-primary`}>
                                        <MessageSquare size={32} />
                                    </div>
                                    <button
                                        onClick={() => setSelectedTenant(null)}
                                        className="p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all"
                                    >
                                        <RefreshCw className="rotate-45" size={24} />
                                    </button>
                                </div>

                                <h2 className="text-3xl font-black tracking-tight mb-2 dark:text-white">{selectedTenant.name}</h2>
                                <div className="flex items-center gap-3 mb-10">
                                    <span className={`px-2 rounded text-[10px] font-black uppercase tracking-widest ${selectedTenant.plan === 'pro' ? 'text-purple-500 bg-purple-500/10' :
                                            selectedTenant.plan === 'plus' ? 'text-brand-primary bg-brand-primary/10' : 'text-gray-500 bg-gray-500/10'
                                        }`}>
                                        Plano {selectedTenant.plan}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 font-mono">ID: {selectedTenant.id}</span>
                                </div>

                                <div className="space-y-8">
                                    {/* Status Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">WhatsApp Webhook</p>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                                <span className="text-sm font-bold dark:text-gray-200">Saudável</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Qualidade WABA</p>
                                            <div className="flex items-center gap-2">
                                                <Activity size={16} className="text-emerald-500" />
                                                <span className="text-sm font-bold dark:text-gray-200 uppercase tracking-wider">{selectedTenant.quality}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta Details */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 border border-gray-200 dark:border-white/5">
                                        <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-brand-primary">
                                            <ShieldCheck size={18} />
                                            Dados de Integração
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Número Ativo', value: selectedTenant.phoneNumber },
                                                { label: 'Phone Number ID', value: '2541********884' },
                                                { label: 'WABA ID', value: 'wb_******lk01' },
                                                { label: 'Último Webhook', value: selectedTenant.lastWebhook ? new Date(selectedTenant.lastWebhook).toLocaleString() : 'N/A' },
                                                { label: 'Compliance Flags', value: 'opt-in: true, tpl: ok' },
                                            ].map((detail, idx) => (
                                                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-white/5 last:border-0">
                                                    <span className="text-xs font-bold text-gray-500">{detail.label}</span>
                                                    <span className="text-xs font-mono font-medium dark:text-gray-300">{detail.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Quotas */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 border border-gray-200 dark:border-white/5">
                                        <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 text-brand-primary">
                                            <Zap size={18} />
                                            Límites & Quotas
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                                    <span className="text-gray-500">Msg Outbound (Dia)</span>
                                                    <span className="text-gray-300">{selectedTenant.messagesToday} / 5,000</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-brand-primary transition-all duration-1000" style={{ width: `${(selectedTenant.messagesToday / 5000) * 100}%` }} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                                    <span className="text-gray-500">Msg Outbound (Minuto)</span>
                                                    <span className="text-gray-300">12 / 80</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: '15%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-200 dark:border-white/10">
                                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-brand-primary/10 text-brand-primary rounded-2xl text-sm font-black hover:bg-brand-primary/20 transition-all">
                                            <Zap size={18} />
                                            Testar Webhook
                                        </button>
                                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500/10 text-emerald-500 rounded-2xl text-sm font-black hover:bg-emerald-500/20 transition-all">
                                            <RefreshCw size={18} />
                                            Reconectar
                                        </button>
                                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl text-sm font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                                            <Activity size={18} />
                                            Healthcheck
                                        </button>
                                        <button className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-2xl text-sm font-black hover:bg-gray-200 dark:hover:bg-white/10 transition-all">
                                            <History size={18} />
                                            Ver Logs
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminWhatsApp;
