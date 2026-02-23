import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import WhatsAppConnection from '../whatsapp/WhatsAppConnection';

const WhatsAppIntegration: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useContext(LanguageContext);
    const { user, isAdmin, profile } = useDashboardAuth();

    // v14.0: Admin uses admin tenant, clients use profile.tenant_id
    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const tenantId = isAdmin ? ADMIN_TENANT_ID : (profile?.tenant_id || user?.id || null);

    // 🛡️ SECURITY: Block ONLY if not admin AND no tenant
    if (!tenantId && !isAdmin) {
        console.warn('⚠️ [WhatsApp] No tenant_id found for non-admin user - blocking to prevent data leak');
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
                <Header title="WhatsApp Business" />
                <div className="max-w-4xl mx-auto py-8 px-4">
                    <div className="p-8 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                        <h2 className="text-2xl font-bold mb-2">Tenant não identificado</h2>
                        <p className="text-gray-500 dark:text-gray-400">
                            Não foi possível identificar sua conta. Por favor, faça logout e login novamente.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0D0D14] overflow-hidden relative">
            <Header title="WhatsApp Business" />

            {/* Background glow */}
            <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-emerald-500/10 rounded-full blur-[160px] -z-0 pointer-events-none" />

            <div className="flex flex-1 overflow-hidden relative z-10">
                {/* Sidebar */}
                <aside className="w-72 border-r border-white/10 flex flex-col p-6 gap-6 bg-[#12121A]/90 backdrop-blur-2xl overflow-y-auto custom-scrollbar shrink-0">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-3">WhatsApp Business</h3>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/integrations')}
                            className="w-full flex items-center gap-3 p-3.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white border border-transparent transition-all group"
                        >
                            <span className="material-symbols-outlined text-base text-white/50 group-hover:text-emerald-400 transition-colors">arrow_back</span>
                            <span className="text-[11px] font-black uppercase tracking-widest">Voltar</span>
                        </button>

                        <button
                            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-base text-emerald-400">qr_code_scanner</span>
                                <span className="text-[11px] font-black uppercase tracking-widest">Conexão API</span>
                            </div>
                        </button>
                    </div>

                    <div className="mt-auto p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <p className="text-[9px] text-indigo-300/60 leading-relaxed">
                            <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
                            Conecte seu WhatsApp lendo o QR Code. A LIA começará a processar mensagens instantaneamente sem necessidade de verificação do Facebook.
                        </p>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-transparent relative">
                    <WhatsAppConnection tenantIdOverride={tenantId} />
                </main>
            </div>
        </div>
    );
};

export default WhatsAppIntegration;
