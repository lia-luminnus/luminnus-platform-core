import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../Header';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { getApiUrl } from '../../config/api';
import toast from 'react-hot-toast';

interface IntegrationStatus {
    connected: boolean;
    status: 'connected' | 'disconnected' | 'provisioning' | 'error';
    phone_masked: string | null;
    waba_id: string | null;
    last_webhook_at: string | null;
    last_error: string | null;
}

const WhatsAppIntegration: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useContext(LanguageContext);
    const { user, isAdmin } = useDashboardAuth();

    const [activeTab, setActiveTab] = useState<'quick' | 'manual' | 'twilio'>('quick');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [status, setStatus] = useState<IntegrationStatus | null>(null);

    // Twilio onboarding state
    const [twilioStatus, setTwilioStatus] = useState<any>(null);
    const [twilioLoading, setTwilioLoading] = useState(false);
    const [twilioProvisioning, setTwilioProvisioning] = useState(false);
    const [twilioFlow, setTwilioFlow] = useState<'new_number' | 'byon'>('new_number');
    const [twilioCountry, setTwilioCountry] = useState('BR');
    const [twilioFriendlyName, setTwilioFriendlyName] = useState('');

    // Form state for manual connection
    const [formData, setFormData] = useState({
        waba_id: '',
        phone_number_id: '',
        access_token: '',
        phone_e164: ''
    });

    // Quick connection state
    const [quickPhone, setQuickPhone] = useState('');
    const [quickConnecting, setQuickConnecting] = useState(false);

    // 🔒 SECURITY: Get tenant from user context
    const userTenantId = (user as any)?.user_metadata?.tenant_id || (user as any)?.tenant_id || null;

    // 🔒 SECURITY: Admin uses admin tenant, clients use their own tenant_id OR user.id as fallback
    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const tenantId = userTenantId || (isAdmin ? ADMIN_TENANT_ID : user?.id || null);

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
        setStatus(null);
        setLoading(true);
        fetchStatus();
        fetchTwilioStatus();
    }, [tenantId]);

    // Fetch Twilio subaccount status
    const fetchTwilioStatus = async () => {
        if (!tenantId) return;
        try {
            setTwilioLoading(true);
            const res = await fetch(`${getApiUrl()}/api/twilio/subaccount/status?tenant_id=${tenantId}`);
            if (res.ok) {
                const json = await res.json();
                if (json.ok) setTwilioStatus(json.data);
            }
        } catch (err) {
            console.warn('[WhatsApp] Twilio status fetch failed:', err);
        } finally {
            setTwilioLoading(false);
        }
    };

    // Handle Twilio onboarding
    const handleTwilioOnboard = async () => {
        if (!tenantId) return;
        setTwilioProvisioning(true);
        try {
            const endpoint = twilioFlow === 'new_number'
                ? `${getApiUrl()}/api/twilio/onboard/new-number`
                : `${getApiUrl()}/api/twilio/onboard/byon/start`;

            const body: any = { tenant_id: tenantId };
            if (twilioFlow === 'new_number') {
                body.country_code = twilioCountry;
            }
            if (twilioFriendlyName) {
                body.friendly_name = twilioFriendlyName;
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const json = await res.json();
            if (json.ok) {
                toast.success(twilioFlow === 'new_number'
                    ? `✅ Número Twilio provisionado: ${json.data.phone_number}`
                    : '✅ Subconta criada! Associe seu número agora.');
                fetchTwilioStatus();
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

    // ✅ Handle OAuth callback result from URL params
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        const statusParam = searchParams.get('status');

        console.log('🔗 [WhatsApp] URL Parameters detected:', { success, error, statusParam });

        if (success === 'true') {
            toast.success('✅ WhatsApp conectado com sucesso!', { id: 'whatsapp-status-toast' });
            fetchStatus();
            // Clean URL params definitively using history to avoid loops
            const url = new URL(window.location.href);
            url.searchParams.delete('success');
            url.searchParams.delete('status');
            window.history.replaceState({}, '', url.toString());
        } else if (error) {
            toast.error(`❌ Erro na conexão: ${decodeURIComponent(error)}`, { id: 'whatsapp-status-toast' });
            const url = new URL(window.location.href);
            url.searchParams.delete('error');
            window.history.replaceState({}, '', url.toString());
        } else if (statusParam === 'pending') {
            toast('⏳ Conexão em andamento... Aguarde a configuração completar.', { icon: '⏳', id: 'whatsapp-status-toast' });
            fetchStatus();
            const url = new URL(window.location.href);
            url.searchParams.delete('status');
            window.history.replaceState({}, '', url.toString());
        }
    }, [searchParams]); // Depend on searchParams to catch changes

    const fetchStatus = async () => {
        setLoading(true);
        try {
            // ✅ CORREÇÃO: Adicionar timeout de 10s na requisição
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `${getApiUrl()}/api/integrations/whatsapp/status?tenantId=${tenantId}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error('Failed to fetch status:', response.status);
                setStatus(null);
                return;
            }

            const data = await response.json().catch(() => ({ status: 'error' }));
            console.log('📡 [WhatsApp] API Response:', data);

            if (data.status === 'ok' && data.data) {
                // 🔒 SECURITY: Optional validation if tenant_id exists in response
                if (data.data.tenant_id && data.data.tenant_id !== tenantId) {
                    console.error('🚨 [WhatsApp] TENANT MISMATCH! SECURITY BLOCK.');
                    setStatus(null);
                    return;
                }
                setStatus(data.data);
            } else {
                setStatus(null);
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('⏱️ [WhatsApp] Status fetch timeout after 10s');
                toast.error('Tempo limite excedido ao carregar status do WhatsApp');
            } else {
                console.error('❌ Error fetching status:', error);
            }
            setStatus(null);
        } finally {
            // ✅ GARANTIR QUE SEMPRE EXECUTA
            setLoading(false);
        }
    };

    // Quick connection - Official Meta Embedded Signup flow
    const handleQuickConnect = async () => {
        setQuickConnecting(true);
        toast.loading('Iniciando conexão...', { id: 'quick-connect' });

        try {
            // 1. Get the signup URL from backend
            const response = await fetch(`${getApiUrl()}/api/whatsapp/embedded/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId })
            });

            if (!response.ok) {
                toast.error('Erro ao iniciar conexão', { id: 'quick-connect' });
                return;
            }

            const data = await response.json().catch(() => ({ status: 'error' }));

            if (data.status === 'ok' && data.data?.signupUrl) {
                toast.success('Abrindo Meta Business Suite...', { id: 'quick-connect' });

                // 2. Open the Meta OAuth dialog in a popup
                const popup = window.open(
                    data.data.signupUrl,
                    'meta-whatsapp-signup',
                    'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
                );

                // ✅ NOVO: Ouvir mensagem de sucesso do popup
                const handleMessage = (event: MessageEvent) => {
                    if (event.data?.type === 'WA_EMBEDDED_SUCCESS') {
                        toast.success('Conexão realizada com sucesso!', { id: 'quick-connect' });
                        fetchStatus(); // Atualiza UI imediatamente
                        window.removeEventListener('message', handleMessage);
                    }
                    if (event.data?.type === 'WA_EMBEDDED_ERROR') {
                        toast.error(`Erro na conexão: ${event.data.reason}`, { id: 'quick-connect' });
                        window.removeEventListener('message', handleMessage);
                    }
                };
                window.addEventListener('message', handleMessage);

                // 3. Monitor popup for close (callback will redirect back)
                if (popup) {
                    const checkPopup = setInterval(() => {
                        if (popup.closed) {
                            clearInterval(checkPopup);
                            window.removeEventListener('message', handleMessage); // Limpa listener
                            // Refresh status after popup closes
                            setTimeout(() => {
                                fetchStatus();
                                toast.dismiss('quick-connect');
                            }, 1000);
                        }
                    }, 500);
                } else {
                    // Popup blocked - open in same tab
                    toast('O popup foi bloqueado. Redirecionando...', {
                        icon: '⚠️',
                        duration: 3000
                    });
                    window.location.href = data.data.signupUrl;
                }
            } else {
                toast.error(data.reason || 'Erro ao iniciar conexão', { id: 'quick-connect' });
            }
        } catch (error) {
            console.error('❌ Quick connect error:', error);
            toast.error('Erro ao conectar. Tente novamente.', { id: 'quick-connect' });
        } finally {
            setQuickConnecting(false);
        }
    };

    const handleSaveQuickConnection = async (phone: string, token: string) => {
        try {
            const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/save-quick`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    phone_number: phone,
                    access_token: token
                })
            });

            if (!response.ok) {
                toast.error('Erro ao salvar conexão');
                return;
            }

            const data = await response.json().catch(() => ({ status: 'error' }));

            if (data.status === 'ok') {
                toast.success('WhatsApp conectado com sucesso!');
                fetchStatus();
            } else {
                toast.error(data.reason || 'Erro ao salvar conexão');
            }
        } catch (error) {
            console.error('❌ Error saving quick connection:', error);
            toast.error('Erro ao salvar conexão');
        } finally {
            setQuickConnecting(false);
        }
    };

    const handleSaveManual = async () => {
        if (!formData.waba_id || !formData.phone_number_id || !formData.access_token) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/save-manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    ...formData
                })
            });

            if (!response.ok) {
                toast.error('Erro ao salvar integração');
                return;
            }

            const data = await response.json().catch(() => ({ status: 'error' }));

            if (data.status === 'ok') {
                toast.success('Integração salva com sucesso!');
                fetchStatus();
                // Clear form
                setFormData({ waba_id: '', phone_number_id: '', access_token: '', phone_e164: '' });
            } else {
                toast.error(data.reason || 'Erro ao salvar integração');
            }
        } catch (error) {
            console.error('❌ Error saving:', error);
            toast.error('Erro ao salvar integração');
        } finally {
            setSaving(false);
        }
    };

    const handleTestWebhook = async () => {
        setTesting(true);
        try {
            const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/test-webhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId })
            });

            if (!response.ok) {
                toast.error('Erro ao testar webhook');
                return;
            }

            const data = await response.json().catch(() => ({ status: 'error' }));

            if (data.status === 'ok') {
                toast.success(`Webhook OK! Latência: ${data.data.latency_ms}ms`);
            } else {
                toast.error(data.reason || 'Erro ao testar webhook');
            }
        } catch (error) {
            console.error('❌ Error testing webhook:', error);
            toast.error('Erro ao testar webhook');
        } finally {
            setTesting(false);
        }
    };

    const handleReconnect = async () => {
        try {
            const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/reconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId })
            });

            if (!response.ok) {
                toast.error('Erro ao reconectar');
                return;
            }

            const data = await response.json().catch(() => ({ status: 'error' }));

            if (data.status === 'ok') {
                toast.success('Reconectado com sucesso!');
                fetchStatus();
            } else {
                toast.error(data.reason || 'Erro ao reconectar');
            }
        } catch (error) {
            console.error('❌ Error reconnecting:', error);
            toast.error('Erro ao reconectar');
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

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9] dark:bg-[#06080f] overflow-hidden">
            <Header title="WhatsApp Business" />

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Back button */}
                    <button
                        onClick={() => navigate('/integrations')}
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-brand-primary transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Voltar para Integrações
                    </button>

                    {/* Status Card */}
                    <div className={`p-6 rounded-2xl border ${status?.connected
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-white/5 border-white/10'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status?.connected ? 'bg-green-500/20' : 'bg-gray-500/20'
                                    }`}>
                                    <span className="material-symbols-outlined text-3xl text-green-500">
                                        {status?.connected ? 'check_circle' : 'link_off'}
                                    </span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black">
                                        {status?.connected ? 'Conectado' : 'Desconectado'}
                                    </h2>
                                    {status?.phone_masked && (
                                        <p className="text-sm text-gray-400 font-mono">{status.phone_masked}</p>
                                    )}
                                    {status?.last_webhook_at && (
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                                            Último evento: {new Date(status.last_webhook_at).toLocaleString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {status?.connected && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleTestWebhook}
                                        disabled={testing}
                                        className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">api</span>
                                        {testing ? 'Testando...' : 'Testar Webhook'}
                                    </button>
                                    <button
                                        onClick={handleReconnect}
                                        className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">refresh</span>
                                        Reconectar
                                    </button>
                                </div>
                            )}
                        </div>
                        {status?.last_error && (
                            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                                <strong>Último erro:</strong> {status.last_error}
                            </div>
                        )}
                    </div>

                    {/* Connection Form - Only show if not connected */}
                    {!status?.connected && (
                        <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 dark:border-white/10">
                                <button
                                    onClick={() => setActiveTab('quick')}
                                    className={`flex-1 px-4 py-4 text-sm font-bold transition-all ${activeTab === 'quick'
                                        ? 'bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm mr-2">bolt</span>
                                    Meta (Rápido)
                                </button>
                                <button
                                    onClick={() => setActiveTab('manual')}
                                    className={`flex-1 px-4 py-4 text-sm font-bold transition-all ${activeTab === 'manual'
                                        ? 'bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm mr-2">settings</span>
                                    Manual
                                </button>
                                <button
                                    onClick={() => setActiveTab('twilio')}
                                    className={`flex-1 px-4 py-4 text-sm font-bold transition-all ${activeTab === 'twilio'
                                        ? 'bg-purple-500/10 text-purple-400 border-b-2 border-purple-500'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm mr-2">cell_tower</span>
                                    Twilio Pro
                                </button>
                            </div>

                            <div className="p-6">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'quick' ? (
                                        <motion.div
                                            key="quick"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-4"
                                        >
                                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                                <p className="text-sm text-green-400">
                                                    <strong>🚀 Conexão em 1 clique:</strong> Você só precisa autorizar sua conta Meta e escolher o número.
                                                    A parte técnica é configurada automaticamente.
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                    Número do WhatsApp Business (Opcional)
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={quickPhone}
                                                    onChange={(e) => setQuickPhone(e.target.value)}
                                                    placeholder="Ex: +55 11 99999-9999"
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/50"
                                                />
                                                <p className="text-[9px] text-gray-500 mt-1">
                                                    Informe o número que você usará ou deixe em branco para escolher no Meta Business Suite.
                                                </p>
                                            </div>

                                            <div className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                                <p className="flex items-start gap-2">
                                                    <span className="mt-0.5 text-brand-primary">1.</span>
                                                    Clique no botão abaixo para abrir o Meta Business Suite
                                                </p>
                                                <p className="flex items-start gap-2">
                                                    <span className="mt-0.5 text-brand-primary">2.</span>
                                                    Faça login com sua conta Facebook/Meta
                                                </p>
                                                <p className="flex items-start gap-2">
                                                    <span className="mt-0.5 text-brand-primary">3.</span>
                                                    Selecione ou crie sua conta WhatsApp Business
                                                </p>
                                                <p className="flex items-start gap-2">
                                                    <span className="mt-0.5 text-brand-primary">4.</span>
                                                    Pronto! A conexão será configurada automaticamente
                                                </p>
                                            </div>

                                            <button
                                                onClick={handleQuickConnect}
                                                disabled={quickConnecting}
                                                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {quickConnecting ? (
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
                                        </motion.div>
                                    ) : activeTab === 'manual' ? (
                                        <motion.div
                                            key="manual"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-4"
                                        >
                                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                <p className="text-sm text-amber-400">
                                                    <strong>⚠️ Modo avançado:</strong> Você precisará das credenciais do Meta Business Suite.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                        WABA Business ID *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.waba_id}
                                                        onChange={(e) => setFormData({ ...formData, waba_id: e.target.value })}
                                                        placeholder="Ex: 123456789012345"
                                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                        Phone Number ID *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={formData.phone_number_id}
                                                        onChange={(e) => setFormData({ ...formData, phone_number_id: e.target.value })}
                                                        placeholder="Ex: 10987654321"
                                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/50"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                    Access Token (Permanente) *
                                                </label>
                                                <input
                                                    type="password"
                                                    value={formData.access_token}
                                                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                                                    placeholder="EAAB..."
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/50"
                                                />
                                                <p className="text-[9px] text-gray-500 mt-1">
                                                    Este token nunca será exibido novamente após salvar.
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                    Número de Telefone (E.164)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.phone_e164}
                                                    onChange={(e) => setFormData({ ...formData, phone_e164: e.target.value })}
                                                    placeholder="Ex: 5511999999999"
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/50"
                                                />
                                            </div>

                                            <button
                                                onClick={handleSaveManual}
                                                disabled={saving}
                                                className="w-full px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {saving ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Salvando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined">save</span>
                                                        Salvar e Conectar
                                                    </>
                                                )}
                                            </button>
                                        </motion.div>
                                    ) : (
                                        /* ========== TWILIO TAB ========== */
                                        <motion.div
                                            key="twilio"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-5"
                                        >
                                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                                <p className="text-sm text-purple-300">
                                                    <strong>🔮 Twilio Pro:</strong> Número dedicado com isolamento total de dados e custos.
                                                    Ideal para empresas que precisam de controle avançado.
                                                </p>
                                            </div>

                                            {/* Twilio Active Status */}
                                            {twilioStatus?.has_subaccount && (
                                                <div className={`p-5 rounded-xl border ${twilioStatus.onboarding_status === 'active'
                                                        ? 'bg-green-500/5 border-green-500/20'
                                                        : twilioStatus.onboarding_status === 'failed'
                                                            ? 'bg-red-500/5 border-red-500/20'
                                                            : 'bg-amber-500/5 border-amber-500/20'
                                                    }`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-3 h-3 rounded-full ${twilioStatus.onboarding_status === 'active' ? 'bg-green-500 animate-pulse'
                                                                    : twilioStatus.onboarding_status === 'failed' ? 'bg-red-500'
                                                                        : 'bg-amber-500 animate-pulse'
                                                                }`} />
                                                            <div>
                                                                <p className="text-sm font-bold capitalize">
                                                                    {twilioStatus.onboarding_status === 'active' ? '✅ Ativo'
                                                                        : twilioStatus.onboarding_status === 'failed' ? '❌ Falhou'
                                                                            : twilioStatus.onboarding_status === 'suspended' ? '⏸️ Suspenso'
                                                                                : `⏳ ${twilioStatus.onboarding_status}`}
                                                                </p>
                                                                {twilioStatus.phone_number && (
                                                                    <p className="text-xs text-gray-400 font-mono">{twilioStatus.phone_number}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {twilioStatus.onboarding_status === 'active' && (
                                                                <button
                                                                    onClick={() => handleTwilioAction('suspend')}
                                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all"
                                                                >
                                                                    Suspender
                                                                </button>
                                                            )}
                                                            {twilioStatus.onboarding_status === 'suspended' && (
                                                                <button
                                                                    onClick={() => handleTwilioAction('reactivate')}
                                                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                                                                >
                                                                    Reativar
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {twilioStatus.error && (
                                                        <p className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">{twilioStatus.error}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Onboarding Form - Only if no subaccount */}
                                            {!twilioStatus?.has_subaccount && (
                                                <>
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
                                                                <p className="text-sm font-bold">Número Novo</p>
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
                                                                <p className="text-sm font-bold">Usar meu número</p>
                                                                <p className="text-[10px] text-gray-500 mt-1">Traga seu próprio número WhatsApp Business</p>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Country (only for new number) */}
                                                    {twilioFlow === 'new_number' && (
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                                País do Número
                                                            </label>
                                                            <select
                                                                value={twilioCountry}
                                                                onChange={(e) => setTwilioCountry(e.target.value)}
                                                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50"
                                                            >
                                                                <option value="BR">🇧🇷 Brasil (+55)</option>
                                                                <option value="US">🇺🇸 Estados Unidos (+1)</option>
                                                                <option value="PT">🇵🇹 Portugal (+351)</option>
                                                                <option value="GB">🇬🇧 Reino Unido (+44)</option>
                                                                <option value="DE">🇩🇪 Alemanha (+49)</option>
                                                                <option value="FR">🇫🇷 França (+33)</option>
                                                                <option value="ES">🇪🇸 Espanha (+34)</option>
                                                                <option value="IT">🇮🇹 Itália (+39)</option>
                                                                <option value="MX">🇲🇽 México (+52)</option>
                                                                <option value="AR">🇦🇷 Argentina (+54)</option>
                                                            </select>
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
                                                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/50"
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
                                                </>
                                            )}

                                            {/* Twilio Benefits */}
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                                    <span className="material-symbols-outlined text-purple-400 text-2xl">shield</span>
                                                    <p className="text-[10px] text-gray-400 mt-1">Dados Isolados</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                                    <span className="material-symbols-outlined text-purple-400 text-2xl">payments</span>
                                                    <p className="text-[10px] text-gray-400 mt-1">Custo Separado</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                                    <span className="material-symbols-outlined text-purple-400 text-2xl">speed</span>
                                                    <p className="text-[10px] text-gray-400 mt-1">Alta Performance</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Help Section */}
                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-400">help</span>
                            Como obter as credenciais?
                        </h3>
                        <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                            <li>Acesse o <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-brand-primary hover:underline">Meta Business Suite</a></li>
                            <li>Vá em Configurações → WhatsApp → API Setup</li>
                            <li>Copie o Phone Number ID e WABA ID</li>
                            <li>Gere um Access Token permanente em Configurações → Tokens</li>
                            <li>Configure o Webhook URL: <code className="bg-black/20 px-2 py-0.5 rounded">https://api.luminnus.ai/api/whatsapp/webhook</code></li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppIntegration;
