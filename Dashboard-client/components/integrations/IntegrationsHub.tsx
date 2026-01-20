import React, { useState, useEffect } from 'react';
import Header from '../Header';
import {
    Key, Webhook, Globe, ArrowRightLeft, ScrollText,
    TestTube2, Plus, RefreshCw, Trash2, Copy, CheckCircle2,
    AlertCircle, Info, Send, Loader2, ChevronRight, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import toast from 'react-hot-toast';

type HubTab = 'keys' | 'webhooks' | 'endpoints' | 'mapping' | 'logs' | 'sandbox';

const IntegrationsHub: React.FC = () => {
    const { session, user, plan: authPlan } = useDashboardAuth();
    const [activeTab, setActiveTab] = useState<HubTab>('keys');
    const [loading, setLoading] = useState(false);

    // Quotas e Planos
    const userPlan = authPlan?.name?.toLowerCase() || 'start';
    const isStart = userPlan === 'start';
    const profile = (user as any)?.profile;
    const minutesUsed = profile?.daily_lia_minutes_used || 0;
    const reportsCount = profile?.monthly_reports_count || 0;

    const [keys, setKeys] = useState<any[]>([]);
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [endpoints, setEndpoints] = useState<any[]>([]);

    useEffect(() => {
        loadTabData();
    }, [activeTab]);

    const loadTabData = async () => {
        if (!session?.access_token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/integrations/hub/${activeTab}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const json = await res.json();
                if (activeTab === 'keys') setKeys(json);
                if (activeTab === 'webhooks') setWebhooks(json);
                if (activeTab === 'endpoints') setEndpoints(json);
            }
        } catch (err) {
            console.error('Error loading hub data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async () => {
        const name = prompt('Nome da chave (ex: ERP Interno):');
        if (!name) return;

        try {
            const res = await fetch('/api/integrations/hub/keys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                toast.success('Chave de API gerada com sucesso!');
                loadTabData();
            }
        } catch (err) {
            toast.error('Erro ao gerar chave');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado para a área de transferência!');
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0A0F1A] overflow-hidden">
            <Header title="Hub Universal de Integrações" />

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Navigation */}
                <div className="w-68 border-r border-gray-200 dark:border-white/5 bg-white dark:bg-[#0D111C] p-4 flex flex-col gap-2">
                    {/* Plan & Quotas */}
                    <div className="mb-6 p-4 rounded-2xl bg-indigo-600/5 border border-indigo-500/10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Plano {userPlan}</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <QuotaBar label="Conversa (Min)" used={minutesUsed} total={isStart ? 60 : 300} />
                            <QuotaBar label="Relatórios" used={reportsCount} total={isStart ? 5 : 50} />
                        </div>
                    </div>

                    <TabButton
                        active={activeTab === 'keys'}
                        onClick={() => setActiveTab('keys')}
                        icon={<Key className="w-4 h-4" />}
                        label="Credenciais API"
                        desc="Gerenciar chaves de acesso"
                    />
                    <TabButton
                        active={activeTab === 'webhooks'}
                        onClick={() => setActiveTab('webhooks')}
                        icon={<Webhook className="w-4 h-4" />}
                        label="Webhooks"
                        desc={isStart ? "Modo Básico (Limitado)" : "Inscrição em eventos"}
                    />
                    <TabButton
                        active={activeTab === 'endpoints'}
                        onClick={() => setActiveTab('endpoints')}
                        icon={<Globe className="w-4 h-4" />}
                        label="Endpoints Externos"
                        desc={isStart ? "Modo Básico (Limitado)" : "Consumir suas APIs"}
                    />
                    <TabButton
                        active={activeTab === 'mapping'}
                        onClick={() => setActiveTab('mapping')}
                        icon={<ArrowRightLeft className="w-4 h-4" />}
                        label="Mapeamento"
                        desc="Normalização de campos"
                    />
                    <TabButton
                        active={activeTab === 'logs'}
                        onClick={() => setActiveTab('logs')}
                        icon={<ScrollText className="w-4 h-4" />}
                        label="Logs & Diagnóstico"
                        desc="Histórico de chamadas"
                    />
                    <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/5">
                        <TabButton
                            active={activeTab === 'sandbox'}
                            onClick={() => setActiveTab('sandbox')}
                            icon={<TestTube2 className="w-4 h-4" />}
                            label="Sandbox"
                            desc="Ambiente de testes"
                            highlight
                        />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                    <div className="max-w-5xl mx-auto">
                        <AnimatePresence mode="wait">
                            {activeTab === 'keys' && (
                                <TabContent key="keys" title="Credenciais API" desc="Utilize estas chaves para enviar dados do seu sistema para a LIA via REST API.">
                                    <div className="flex justify-end mb-6">
                                        <button
                                            onClick={handleCreateKey}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all"
                                        >
                                            <Plus className="w-4 h-4" /> Nova Chave
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {keys.length === 0 ? (
                                            <EmptyState icon={<Key className="w-12 h-12" />} text="Nenhuma chave gerada ainda." />
                                        ) : (
                                            keys.map(key => (
                                                <div key={key.id} className="p-5 bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 flex items-center justify-between group">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">{key.name}</span>
                                                        <code className="text-xs text-gray-400 bg-black/20 px-2 py-1 rounded-md mt-1">{key.api_key.substring(0, 10)}*******************</code>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => copyToClipboard(key.api_key)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400"><Copy className="w-4 h-4" /></button>
                                                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </TabContent>
                            )}

                            {activeTab === 'webhooks' && (
                                <TabContent key="webhooks" title="Webhooks (Saída)" desc="Configure URLs para receber notificações automáticas da LIA quando eventos ocorrerem.">
                                    <EmptyState icon={<Webhook className="w-12 h-12" />} text="Configure seu primeiro webhook para receber alertas." />
                                </TabContent>
                            )}

                            {activeTab === 'endpoints' && (
                                <TabContent key="endpoints" title="Endpoints Externos" desc="Cadastre as APIs do seu sistema para que a LIA possa consultar dados sob demanda.">
                                    <EmptyState icon={<Globe className="w-12 h-12" />} text="Nenhum endpoint externo cadastrado." />
                                </TabContent>
                            )}

                            {activeTab === 'mapping' && (
                                <TabContent key="mapping" title="Mapeamento Universal" desc="Defina como os campos do seu sistema (ex: 'val_pedido') se traduzem para o padrão LIA (ex: 'order_value').">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {['Lead', 'Customer', 'Order', 'Appointment', 'Ticket'].map(model => (
                                            <div key={model} className="p-6 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl hover:border-indigo-500/50 transition-all cursor-pointer">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-bold text-white text-lg">{model}</h4>
                                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                                </div>
                                                <p className="text-sm text-gray-500">Mapeie 0 campos configurados</p>
                                            </div>
                                        ))}
                                    </div>
                                </TabContent>
                            )}

                            {activeTab === 'logs' && (
                                <TabContent key="logs" title="Logs & Diagnóstico" desc="Acompanhe o tráfego de dados e depure erros de integração em tempo real.">
                                    <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden">
                                        <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Últimas 50 chamadas</span>
                                            <button className="p-1 hover:rotate-180 transition-all duration-500"><RefreshCw className="w-3 h-3 text-gray-500" /></button>
                                        </div>
                                        <div className="p-8 text-center text-gray-500 text-sm">
                                            Nenhum log registrado nas últimas 24 horas.
                                        </div>
                                    </div>
                                </TabContent>
                            )}

                            {activeTab === 'sandbox' && (
                                <TabContent key="sandbox" title="Sandbox" desc="Simule disparos de dados e teste como a LIA interpreta suas informações antes do deploy.">
                                    <div className="bg-[#0D111C] p-6 rounded-3xl border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400"><Play className="w-5 h-5" /></div>
                                            <h4 className="font-bold text-white">Simulador de Evento</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">JSON Payload</label>
                                            <textarea
                                                className="w-full h-48 bg-black/40 border border-white/5 rounded-2xl p-4 text-xs font-mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                defaultValue={JSON.stringify({ "event": "order.created", "data": { "id": "123", "amount": 150.00 } }, null, 2)}
                                            />
                                            <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2">
                                                Testar agora <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </TabContent>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const TabButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string, desc: string, highlight?: boolean }> = ({ active, onClick, icon, label, desc, highlight }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-2xl transition-all border ${active
            ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
            : highlight
                ? "bg-amber-500/5 border-amber-500/20 text-amber-500 hover:bg-amber-500/10"
                : "bg-transparent border-transparent text-gray-500 hover:bg-white/5"
            }`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${active ? "bg-white/10" : "bg-gray-100 dark:bg-white/5"}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className={`text-sm font-bold ${active ? "text-white" : "text-gray-900 dark:text-gray-200"}`}>{label}</span>
                <span className={`text-[10px] ${active ? "text-white/70" : "text-gray-500 font-medium"}`}>{desc}</span>
            </div>
        </div>
    </button>
);

const TabContent: React.FC<{ children: React.ReactNode, title: string, desc: string }> = ({ children, title, desc }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-8"
    >
        <div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{title}</h2>
            <p className="text-gray-500 max-w-2xl">{desc}</p>
        </div>
        <div>{children}</div>
    </motion.div>
);

const EmptyState: React.FC<{ icon: React.ReactNode, text: string }> = ({ icon, text }) => (
    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
        <div className="mb-4 text-gray-500">{icon}</div>
        <p className="text-sm font-bold text-gray-500">{text}</p>
    </div>
);

const QuotaBar: React.FC<{ label: string, used: number, total: number }> = ({ label, used, total }) => {
    const percent = Math.min(Math.round((used / total) * 100), 100);
    const isWarning = percent > 80;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-gray-500">{label}</span>
                <span className={isWarning ? "text-amber-500" : "text-gray-400"}>{used}/{total}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    className={`h-full rounded-full ${isWarning ? "bg-amber-500" : "bg-indigo-500"}`}
                />
            </div>
        </div>
    );
};

export default IntegrationsHub;
