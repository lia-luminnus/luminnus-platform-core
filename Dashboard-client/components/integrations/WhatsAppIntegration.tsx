import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../Header';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { getApiUrl } from '../../config/api';
import toast from 'react-hot-toast';


const WhatsAppIntegration: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useContext(LanguageContext);
    const { user, isAdmin, profile } = useDashboardAuth();

    const [loading, setLoading] = useState(true);

    // Connection state
    const [twilioStatus, setTwilioStatus] = useState<any>(null);
    const [twilioLoading, setTwilioLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [friendlyName, setFriendlyName] = useState('');

    // v14.0: Admin uses admin tenant, clients use profile.tenant_id
    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const tenantId = isAdmin ? ADMIN_TENANT_ID : (profile?.tenant_id || user?.id || null);

    // 🛡️ SECURITY: Block ONLY if not admin AND no tenant - ensures no client data leakage
    if (!tenantId && !isAdmin) {
        console.warn('⚠️ [WhatsApp] No tenant_id found for non-admin user - blocking to prevent data leak');
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
                <Header />
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

    // Clear status when tenant changes to prevent cross-tenant data leakage
    useEffect(() => {
        setLoading(true);
        fetchStatus();
    }, [tenantId]);

    // Fetch connection status
    const fetchStatus = async () => {
        if (!tenantId) return;
        try {
            setTwilioLoading(true);
            const res = await fetch(`${getApiUrl()}/api/twilio/subaccount/status?tenant_id=${tenantId}`);

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                if (text.includes('<!DOCTYPE html>') || res.status === 404) {
                    throw new Error('Servidor retornou erro 404 ou HTML. Verifique se as rotas estão deployadas no backend.');
                }
                throw new Error('Resposta do servidor não é JSON válido.');
            }

            if (res.ok) {
                const json = await res.json();
                if (json.ok) setTwilioStatus(json.data);
            } else if (res.status === 404) {
                console.warn('[WhatsApp] Status endpoint not found (404)');
            }
        } catch (err: any) {
            console.warn('[WhatsApp] Status fetch failed:', err);
        } finally {
            setTwilioLoading(false);
            setLoading(false);
        }
    };

    // Handle WhatsApp connection with user's own number
    const handleConnect = async () => {
        if (!tenantId) return;

        if (!phoneNumber) {
            toast.error('❌ Por favor, informe o número do seu WhatsApp.');
            return;
        }

        setConnecting(true);
        try {
            // Step 1: Create subaccount
            const body: any = {
                tenant_id: tenantId,
                phone_number: phoneNumber,
            };
            if (friendlyName) body.friendly_name = friendlyName;

            const res = await fetch(`${getApiUrl()}/api/twilio/onboard/byon/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                if (text.includes('<!DOCTYPE html>') || res.status === 404) {
                    throw new Error('O backend retornou uma página de erro (404). As rotas podem não estar configuradas no servidor.');
                }
                throw new Error('Erro de comunicação com o servidor. Resposta inválida.');
            }

            const json = await res.json();
            if (json.ok) {
                toast.success('✅ Subconta criada! Registrando seu número...');

                // Step 2: Register phone number via callback
                try {
                    const callbackRes = await fetch(`${getApiUrl()}/api/twilio/onboard/byon/callback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tenant_id: tenantId,
                            phone_number: phoneNumber,
                        }),
                    });
                    const callbackJson = await callbackRes.json();
                    if (callbackRes.ok && callbackJson.ok) {
                        toast.success(`✅ WhatsApp conectado com ${phoneNumber}!`);
                    } else {
                        toast.error(`❌ Erro ao registrar número: ${callbackJson.error || 'Erro desconhecido'}`);
                    }
                } catch (cbErr: any) {
                    toast.error(`❌ Erro na finalização: ${cbErr.message}`);
                }
                fetchStatus();
            } else {
                toast.error(`❌ ${json.error || 'Erro ao conectar WhatsApp'}`);
            }
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`);
        } finally {
            setConnecting(false);
        }
    };

    // Handle suspend/reactivate
    const handleAction = async (action: 'suspend' | 'reactivate') => {
        if (!tenantId) return;
        try {
            const res = await fetch(`${getApiUrl()}/api/twilio/subaccount/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId }),
            });
            const json = await res.json();
            if (json.ok) {
                toast.success(action === 'suspend' ? '⏸️ Conexão suspensa' : '▶️ Conexão reativada');
                fetchStatus();
            } else {
                toast.error(json.error || 'Erro na ação');
            }
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-[#f1f5f9] dark:bg-[#06080f]">
                <Header title="WhatsApp Business" />
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500">Carregando status da integração...</p>
                    <button
                        onClick={() => {
                            setLoading(false);
                            setTimeout(() => fetchStatus(), 100);
                        }}
                        className="mt-4 px-4 py-2 text-xs font-bold text-brand-primary border border-brand-primary/20 rounded-xl hover:bg-brand-primary/10 transition-all"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    const isConnected = twilioStatus?.has_subaccount && twilioStatus?.onboarding_status === 'active';

    return (
        <div className="flex h-full bg-[#0D0D14] overflow-hidden relative">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-[160px] -z-0 pointer-events-none" />

            {/* Sidebar */}
            <aside className="w-72 border-r border-white/10 flex flex-col p-6 gap-6 bg-[#12121A]/90 backdrop-blur-2xl z-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

                {/* Sidebar header */}
                <div className="space-y-1">
                    <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] px-3">WhatsApp Business</h3>
                </div>

                {/* Navigation items */}
                <div className="space-y-2">
                    <button
                        onClick={() => navigate('/integrations')}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white border border-transparent transition-all group"
                    >
                        <span className="material-symbols-outlined text-base text-white/50 group-hover:text-brand-primary transition-colors">arrow_back</span>
                        <span className="text-[11px] font-black uppercase tracking-widest">Voltar</span>
                    </button>

                    <button
                        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-white border border-purple-500/30 shadow-lg shadow-purple-500/10 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-base text-purple-400">phone_iphone</span>
                            <span className="text-[11px] font-black uppercase tracking-widest">Conexão WhatsApp</span>
                        </div>
                        {isConnected && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-green-500 text-white">Ativo</span>
                        )}
                    </button>
                </div>

                {/* Connection info */}
                <div className="mt-auto space-y-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                                {isConnected ? 'Conectado' : 'Desconectado'}
                            </span>
                        </div>
                        {twilioStatus?.phone_number && (
                            <p className="text-xs text-white/60 font-mono">{twilioStatus.phone_number}</p>
                        )}
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                        <p className="text-[9px] text-indigo-300/60 leading-relaxed">
                            <span className="material-symbols-outlined text-xs align-middle mr-1">info</span>
                            Conecte seu WhatsApp Business para a LIA atender seus clientes automaticamente com IA.
                        </p>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header bar */}
                <header className="p-6 border-b border-white/10 flex justify-between items-center bg-[#15151F]/80 backdrop-blur-xl">
                    <div className="space-y-0.5">
                        <h2 className="text-xl font-black text-white tracking-tight">Integração WhatsApp</h2>
                        <p className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                            Conecte seu número WhatsApp Business
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchStatus()}
                            disabled={twilioLoading}
                            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <span className={`material-symbols-outlined text-sm ${twilioLoading ? 'animate-spin' : ''}`}>refresh</span>
                            Atualizar
                        </button>
                    </div>
                </header>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto space-y-6">

                        {/* Status Card */}
                        {twilioStatus?.has_subaccount && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-6 rounded-2xl border ${twilioStatus.onboarding_status === 'active'
                                    ? 'bg-green-500/5 border-green-500/20'
                                    : twilioStatus.onboarding_status === 'failed'
                                        ? 'bg-red-500/5 border-red-500/20'
                                        : 'bg-amber-500/5 border-amber-500/20'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${twilioStatus.onboarding_status === 'active'
                                            ? 'bg-green-500/20'
                                            : twilioStatus.onboarding_status === 'failed'
                                                ? 'bg-red-500/20'
                                                : 'bg-amber-500/20'
                                            }`}>
                                            <span className={`material-symbols-outlined text-3xl ${twilioStatus.onboarding_status === 'active'
                                                ? 'text-green-500'
                                                : twilioStatus.onboarding_status === 'failed'
                                                    ? 'text-red-500'
                                                    : 'text-amber-500'
                                                }`}>
                                                {twilioStatus.onboarding_status === 'active' ? 'check_circle'
                                                    : twilioStatus.onboarding_status === 'failed' ? 'error'
                                                        : 'hourglass_top'}
                                            </span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white">
                                                {twilioStatus.onboarding_status === 'active' ? 'WhatsApp Conectado'
                                                    : twilioStatus.onboarding_status === 'failed' ? 'Falha na Conexão'
                                                        : twilioStatus.onboarding_status === 'suspended' ? 'Suspenso'
                                                            : 'Conectando...'}
                                            </h2>
                                            {twilioStatus.phone_number && (
                                                <p className="text-sm text-gray-400 font-mono mt-1">{twilioStatus.phone_number}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {twilioStatus.onboarding_status === 'active' && (
                                            <button
                                                onClick={() => handleAction('suspend')}
                                                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all uppercase tracking-widest"
                                            >
                                                Suspender
                                            </button>
                                        )}
                                        {twilioStatus.onboarding_status === 'suspended' && (
                                            <button
                                                onClick={() => handleAction('reactivate')}
                                                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all uppercase tracking-widest"
                                            >
                                                Reativar
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {twilioStatus.error && (
                                    <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                        <strong>Último erro:</strong> {twilioStatus.error}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Connection Form - Only if no subaccount */}
                        {!twilioStatus?.has_subaccount && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#15151F] rounded-2xl border border-white/10 overflow-hidden"
                            >
                                {/* Card header */}
                                <div className="p-6 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-xl text-purple-400">phone_iphone</span>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-white">Conectar seu WhatsApp</h3>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                                Use seu próprio número WhatsApp Business
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Info banner */}
                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <p className="text-sm text-purple-300">
                                            <strong>📱 WhatsApp Business:</strong> Conecte seu número de WhatsApp Business para a LIA atender
                                            seus clientes automaticamente com inteligência artificial.
                                        </p>
                                    </div>

                                    {/* Phone Number Input */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                            Número do WhatsApp Business
                                        </label>
                                        <input
                                            type="text"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="Ex: +5511999999999"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                        <p className="text-[9px] text-white/30 mt-1 font-medium">Use o formato internacional com +, DDD e número.</p>
                                    </div>

                                    {/* Friendly Name */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                            Nome da Conexão (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={friendlyName}
                                            onChange={(e) => setFriendlyName(e.target.value)}
                                            placeholder="Ex: Atendimento Principal"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                    </div>

                                    {/* Connect Button */}
                                    <button
                                        onClick={handleConnect}
                                        disabled={connecting}
                                        className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {connecting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Conectando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-xl">link</span>
                                                Conectar WhatsApp
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Benefits */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-5 rounded-2xl bg-[#15151F] border border-white/5 text-center group hover:border-purple-500/30 transition-all">
                                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all">
                                    <span className="material-symbols-outlined text-purple-400 text-2xl">shield</span>
                                </div>
                                <p className="text-xs font-bold text-white mb-1">100% Seguro</p>
                                <p className="text-[10px] text-gray-500">Dados criptografados e isolados</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-[#15151F] border border-white/5 text-center group hover:border-purple-500/30 transition-all">
                                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all">
                                    <span className="material-symbols-outlined text-purple-400 text-2xl">phone_iphone</span>
                                </div>
                                <p className="text-xs font-bold text-white mb-1">Seu Número</p>
                                <p className="text-[10px] text-gray-500">Use o número que seus clientes já conhecem</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-[#15151F] border border-white/5 text-center group hover:border-purple-500/30 transition-all">
                                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all">
                                    <span className="material-symbols-outlined text-purple-400 text-2xl">smart_toy</span>
                                </div>
                                <p className="text-xs font-bold text-white mb-1">IA Integrada</p>
                                <p className="text-[10px] text-gray-500">LIA atende seus clientes 24/7</p>
                            </div>
                        </div>

                        {/* Help Section */}
                        <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                                <span className="material-symbols-outlined text-indigo-400">help</span>
                                Como funciona?
                            </h3>
                            <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                                <li>Informe o número do seu <strong className="text-white/80">WhatsApp Business</strong> no formato internacional</li>
                                <li>A LIA configura automaticamente os webhooks e segurança</li>
                                <li>Personalize o perfil e playbooks da LIA na aba de <strong className="text-white/80">Configuração</strong></li>
                                <li>Comece a receber e responder mensagens automaticamente!</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default WhatsAppIntegration;
