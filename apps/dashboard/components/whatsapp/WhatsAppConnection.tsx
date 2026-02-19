import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageContext } from '../../App';
import toast from 'react-hot-toast';

interface ConnectionStatus {
    has_subaccount: boolean;
    tenant_id: string;
    onboarding_status: string;
    onboarding_flow: string;
    phone_number: string;
    webhook_configured: boolean;
    activated_at: string;
    error?: string;
}

const WhatsAppConnection: React.FC<{ onComplete?: () => void; tenantIdOverride?: string }> = ({ onComplete, tenantIdOverride }) => {
    const { activeTenantId: contextTenantId } = useContext(LanguageContext) as any;
    const activeTenantId = tenantIdOverride || contextTenantId;
    const [status, setStatus] = useState<ConnectionStatus | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        if (!activeTenantId) return;
        try {
            const res = await fetch(`/api/twilio/subaccount/status?tenant_id=${activeTenantId}`);
            const data = await res.json();
            if (data.ok) setStatus(data.data);
        } catch (error) {
            console.error('Erro ao buscar status:', error);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, [activeTenantId]);

    const handleSync = async () => {
        if (!activeTenantId) return;
        setLoading(true);
        try {
            const res = await fetch('/api/twilio/subaccount/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: activeTenantId })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('Conexão sincronizada com sucesso!');
                fetchStatus();
                if (onComplete) onComplete();
            } else {
                toast.error(data.error || 'Erro ao sincronizar conexão');
            }
        } catch (error) {
            toast.error('Erro na comunicação com o servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!status) return (
        <div className="p-8 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Verificando conexão...</span>
        </div>
    );

    return (
        <div className="p-8 space-y-8 max-w-4xl">
            {/* Bloco de Status Principal */}
            <div className="bg-white dark:bg-[#0D111C] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">Status da sua Lia</h2>
                        <p className="text-xs text-gray-400 font-medium">Gestão da conectividade do seu número comercial.</p>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${status.onboarding_status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${status.onboarding_status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                            {status.onboarding_status === 'active' ? 'Ativo' : 'Pendente'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 relative z-10">
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Número Online</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{status.phone_number || 'Não identificado'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status Interno</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            {status.webhook_configured ? 'Sincronizado e Operacional' : 'Aguardando Sincronização'}
                        </p>
                    </div>
                </div>

                {/* Sutaile Decorativo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            </div>

            {/* Banner de Sincronização Simplificada */}
            <AnimatePresence>
                {!status.webhook_configured && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-brand-primary/5 border border-brand-primary/20 p-8 rounded-3xl"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-brand-primary mb-2">Finalizar Ativação</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-md">
                                    Para que a sua Lia comece a receber e responder mensagens do seu negócio, clique no botão para sincronizar os canais de comunicação.
                                </p>
                            </div>

                            <button
                                onClick={handleSync}
                                disabled={loading}
                                className="whitespace-nowrap px-8 py-4 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin text-sm leading-none">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm leading-none">bolt</span>
                                )}
                                Ativar Agora
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ajuda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-brand-primary">lock</span>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Privacidade Total</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                        Luminnus utiliza conexões criptografadas de ponta a ponta com a Meta para garantir que os dados do seu negócio estejam sempre protegidos.
                    </p>
                </div>
                <div className="p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined text-brand-primary">support_agent</span>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Precisa de Ajuda?</h4>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                        Se a sincronização falhar, nossa equipe técnica pode ajudar a verificar os registros da Meta para você. Basta abrir um chamado.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConnection;
