import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../Header';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { getApiUrl } from '../../config/api';
import toast from 'react-hot-toast';
import CustomSelect from '../ui/CustomSelect';


const WhatsAppIntegration: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useContext(LanguageContext);
    const { user, isAdmin, profile } = useDashboardAuth();

    const [loading, setLoading] = useState(true);

    // Twilio onboarding state
    const [twilioStatus, setTwilioStatus] = useState<any>(null);
    const [twilioLoading, setTwilioLoading] = useState(false);
    const [twilioProvisioning, setTwilioProvisioning] = useState(false);
    const [twilioFlow, setTwilioFlow] = useState<'new_number' | 'byon'>('new_number');
    const [twilioCountry, setTwilioCountry] = useState('BR');
    const [twilioFriendlyName, setTwilioFriendlyName] = useState('');
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');

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
        fetchTwilioStatus();
    }, [tenantId]);

    // Fetch Twilio subaccount status
    const fetchTwilioStatus = async () => {
        if (!tenantId) return;
        try {
            setTwilioLoading(true);
            const res = await fetch(`${getApiUrl()}/api/twilio/subaccount/status?tenant_id=${tenantId}`);

            // Check content type before parsing
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                if (text.includes('<!DOCTYPE html>') || res.status === 404) {
                    throw new Error('Servidor retornou erro 404 ou HTML. Verifique se as rotas Twilio estão deployadas no backend.');
                }
                throw new Error('Resposta do servidor não é JSON válido.');
            }

            if (res.ok) {
                const json = await res.json();
                if (json.ok) setTwilioStatus(json.data);
            } else if (res.status === 404) {
                console.warn('[WhatsApp] Twilio status endpoint not found (404)');
            }
        } catch (err: any) {
            console.warn('[WhatsApp] Twilio status fetch failed:', err);
            // Don't show toast for background status check unless it's a critical error
        } finally {
            setTwilioLoading(false);
            setLoading(false);
        }
    };

    // Handle Twilio onboarding
    const handleTwilioOnboard = async () => {
        if (!tenantId) return;

        // Validation for BYON
        if (twilioFlow === 'byon' && !twilioPhoneNumber) {
            toast.error('❌ Por favor, informe o número do seu WhatsApp.');
            return;
        }

        setTwilioProvisioning(true);
        try {
            const endpoint = twilioFlow === 'new_number'
                ? `${getApiUrl()}/api/twilio/onboard/new-number`
                : `${getApiUrl()}/api/twilio/onboard/byon/start`;

            const body: any = { tenant_id: tenantId };
            if (twilioFlow === 'new_number') {
                body.country_code = twilioCountry;
            } else {
                body.phone_number = twilioPhoneNumber;
            }

            if (twilioFriendlyName) {
                body.friendly_name = twilioFriendlyName;
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                if (text.includes('<!DOCTYPE html>') || res.status === 404) {
                    throw new Error('O backend retornou uma página de erro (404). As rotas Twilio podem não estar configuradas no servidor.');
                }
                throw new Error('Erro de comunicação com o servidor. Resposta inválida.');
            }

            const json = await res.json();
            if (json.ok) {
                if (twilioFlow === 'new_number') {
                    toast.success(`✅ Número Twilio provisionado: ${json.data.phone_number}`);
                    fetchTwilioStatus();
                } else {
                    // BYON: after creating subaccount, call callback to register the phone number
                    toast.success('✅ Subconta criada! Registrando seu número...');
                    try {
                        const callbackRes = await fetch(`${getApiUrl()}/api/twilio/onboard/byon/callback`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                tenant_id: tenantId,
                                phone_number: twilioPhoneNumber,
                            }),
                        });
                        const callbackJson = await callbackRes.json();
                        if (callbackRes.ok && callbackJson.ok) {
                            toast.success(`✅ WhatsApp conectado com ${twilioPhoneNumber}!`);
                        } else {
                            toast.error(`❌ Erro ao registrar número: ${callbackJson.error || 'Erro desconhecido'}`);
                        }
                    } catch (cbErr: any) {
                        toast.error(`❌ Erro na finalização BYON: ${cbErr.message}`);
                    }
                    fetchTwilioStatus();
                }
            } else {
                toast.error(`❌ ${json.error || 'Erro no onboarding Twilio'}`);
            }
        } catch (err: any) {
            toast.error(`Erro: ${err.message}`);
        } finally {
            setTwilioProvisioning(false);
        }
    };

    // Handle Twilio suspend/reactivate
    const handleTwilioAction = async (action: 'suspend' | 'reactivate') => {
        if (!tenantId) return;
        try {
            const res = await fetch(`${getApiUrl()}/api/twilio/subaccount/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId }),
            });
            const json = await res.json();
            if (json.ok) {
                toast.success(action === 'suspend' ? '⏸️ Subconta suspensa' : '▶️ Subconta reativada');
                fetchTwilioStatus();
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
                            setTimeout(() => fetchTwilioStatus(), 100);
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
                            <span className="material-symbols-outlined text-base text-purple-400">cell_tower</span>
                            <span className="text-[11px] font-black uppercase tracking-widest">WhatsApp Dedicado</span>
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
                            Canal oficial de WhatsApp com número dedicado, isolamento total e alta performance via Twilio.
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
                            WhatsApp — Número Dedicado
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchTwilioStatus()}
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
                                                {twilioStatus.onboarding_status === 'active' ? 'Twilio Ativo'
                                                    : twilioStatus.onboarding_status === 'failed' ? 'Falha na Conexão'
                                                        : twilioStatus.onboarding_status === 'suspended' ? 'Suspenso'
                                                            : 'Provisionando...'}
                                            </h2>
                                            {twilioStatus.phone_number && (
                                                <p className="text-sm text-gray-400 font-mono mt-1">{twilioStatus.phone_number}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {twilioStatus.onboarding_status === 'active' && (
                                            <button
                                                onClick={() => handleTwilioAction('suspend')}
                                                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all uppercase tracking-widest"
                                            >
                                                Suspender
                                            </button>
                                        )}
                                        {twilioStatus.onboarding_status === 'suspended' && (
                                            <button
                                                onClick={() => handleTwilioAction('reactivate')}
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

                        {/* Onboarding Form - Only if no subaccount */}
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
                                            <span className="material-symbols-outlined text-xl text-purple-400">rocket_launch</span>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-white">Configurar WhatsApp</h3>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                                Via Twilio — Número Dedicado com Isolamento Total
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-5">
                                    {/* Info banner */}
                                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                        <p className="text-sm text-purple-300">
                                            <strong>🔮 WhatsApp Dedicado:</strong> Número oficial de WhatsApp com isolamento total de dados e custos,
                                            operando sobre a infraestrutura Twilio para controle avançado.
                                        </p>
                                    </div>

                                    {/* Flow Selection */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                            Tipo de Conexão
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setTwilioFlow('new_number')}
                                                className={`p-4 rounded-xl border text-left transition-all ${twilioFlow === 'new_number'
                                                    ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-purple-400 mb-2">add_call</span>
                                                <p className="text-sm font-bold text-white">Número Novo</p>
                                                <p className="text-[10px] text-gray-500 mt-1">A LIA provisiona um número dedicado automaticamente</p>
                                            </button>
                                            <button
                                                onClick={() => setTwilioFlow('byon')}
                                                className={`p-4 rounded-xl border text-left transition-all ${twilioFlow === 'byon'
                                                    ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                                                    : 'border-white/10 hover:border-white/20'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-purple-400 mb-2">phone_forwarded</span>
                                                <p className="text-sm font-bold text-white">Usar meu número</p>
                                                <p className="text-[10px] text-gray-500 mt-1">Traga seu próprio número WhatsApp Business</p>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Country (only for new number) */}
                                    {twilioFlow === 'new_number' && (
                                        <div className="z-50 relative"> {/* High z-index for dropdown stacking context */}
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                País do Número
                                            </label>
                                            <CustomSelect
                                                value={twilioCountry}
                                                onChange={(val) => setTwilioCountry(val)}
                                                variant="glass"
                                                options={[
                                                    { label: '🇧🇷 Brasil (+55)', value: 'BR' },
                                                    { label: '🇺🇸 Estados Unidos (+1)', value: 'US' },
                                                    { label: '🇵🇹 Portugal (+351)', value: 'PT' },
                                                    { label: '🇬🇧 Reino Unido (+44)', value: 'GB' },
                                                    { label: '🇩🇪 Alemanha (+49)', value: 'DE' },
                                                    { label: '🇫🇷 França (+33)', value: 'FR' },
                                                    { label: '🇪🇸 Espanha (+34)', value: 'ES' },
                                                    { label: '🇮🇹 Itália (+39)', value: 'IT' },
                                                    { label: '🇲🇽 México (+52)', value: 'MX' },
                                                    { label: '🇦🇷 Argentina (+54)', value: 'AR' }
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {/* Phone Number (only for BYON) */}
                                    {twilioFlow === 'byon' && (
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                Número do WhatsApp Business
                                            </label>
                                            <input
                                                type="text"
                                                value={twilioPhoneNumber}
                                                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                                                placeholder="Ex: +5511999999999"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50"
                                            />
                                            <p className="text-[9px] text-white/30 mt-1 font-medium">Use o formato internacional com +, DDD e número.</p>
                                        </div>
                                    )}

                                    {/* Friendly Name */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                            Nome da Conexão (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={twilioFriendlyName}
                                            onChange={(e) => setTwilioFriendlyName(e.target.value)}
                                            placeholder="Ex: Atendimento Principal"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-purple-500/50"
                                        />
                                    </div>

                                    {/* Start Onboarding */}
                                    <button
                                        onClick={handleTwilioOnboard}
                                        disabled={twilioProvisioning}
                                        className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {twilioProvisioning ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Provisionando...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-xl">rocket_launch</span>
                                                {twilioFlow === 'new_number' ? 'Provisionar Número' : 'Iniciar Conexão BYON'}
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
                                <p className="text-xs font-bold text-white mb-1">Dados Isolados</p>
                                <p className="text-[10px] text-gray-500">Cada tenant tem sua própria subconta</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-[#15151F] border border-white/5 text-center group hover:border-purple-500/30 transition-all">
                                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all">
                                    <span className="material-symbols-outlined text-purple-400 text-2xl">payments</span>
                                </div>
                                <p className="text-xs font-bold text-white mb-1">Custo Separado</p>
                                <p className="text-[10px] text-gray-500">Billing independente por conta</p>
                            </div>
                            <div className="p-5 rounded-2xl bg-[#15151F] border border-white/5 text-center group hover:border-purple-500/30 transition-all">
                                <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:bg-purple-500/20 transition-all">
                                    <span className="material-symbols-outlined text-purple-400 text-2xl">speed</span>
                                </div>
                                <p className="text-xs font-bold text-white mb-1">Alta Performance</p>
                                <p className="text-[10px] text-gray-500">Infraestrutura dedicada Twilio</p>
                            </div>
                        </div>

                        {/* Help Section */}
                        <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-white">
                                <span className="material-symbols-outlined text-indigo-400">help</span>
                                Como funciona?
                            </h3>
                            <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                                <li>Escolha entre provisionar um <strong className="text-white/80">Número Novo</strong> ou usar o <strong className="text-white/80">Seu Próprio Número</strong></li>
                                <li>A LIA cria uma subconta Twilio isolada para sua empresa</li>
                                <li>O número é configurado automaticamente com webhooks e segurança</li>
                                <li>Comece a receber e enviar mensagens pelo WhatsApp via LIA</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default WhatsAppIntegration;
