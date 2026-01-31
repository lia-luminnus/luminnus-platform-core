import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../Header';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
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
    const { t } = useContext(LanguageContext);
    const { user } = useDashboardAuth();

    const [activeTab, setActiveTab] = useState<'quick' | 'manual'>('quick');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [status, setStatus] = useState<IntegrationStatus | null>(null);

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

    const tenantId = (user as any)?.user_metadata?.tenant_id || (user as any)?.tenant_id || localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';

    // Meta App ID - Should be configured in environment
    const META_APP_ID = import.meta.env.VITE_META_APP_ID || '1234567890';

    // Initialize Meta SDK on component mount
    useEffect(() => {
        // Load Facebook SDK
        if (!window.FB) {
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.onload = () => {
                window.FB?.init({
                    appId: META_APP_ID,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
            };
            document.body.appendChild(script);
        }
    }, []);

    // Fetch current status
    useEffect(() => {
        fetchStatus();
    }, [tenantId]);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/integrations/whatsapp/status?tenantId=${tenantId}`);
            const data = await response.json();
            if (data.status === 'ok') {
                setStatus(data.data);
            }
        } catch (error) {
            console.error('❌ Error fetching status:', error);
        } finally {
            setLoading(false);
        }
    };

    // Quick connection using Meta Embedded Signup
    const handleQuickConnect = async () => {
        if (!quickPhone) {
            toast.error('Por favor, insira o número de telefone');
            return;
        }

        // Clean phone number to E.164 format
        const cleanPhone = quickPhone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            toast.error('Número de telefone inválido');
            return;
        }

        setQuickConnecting(true);

        try {
            // Check if Facebook SDK is loaded
            if (window.FB) {
                // Use Facebook Login for Business with WhatsApp permissions
                window.FB.login((response: any) => {
                    if (response.authResponse) {
                        const { accessToken, userID } = response.authResponse;
                        console.log('✅ Meta login success:', { userID, hasToken: !!accessToken });

                        // Save the connection with basic auth token
                        // The full setup requires exchanging tokens server-side
                        handleSaveQuickConnection(cleanPhone, accessToken);
                    } else {
                        console.log('❌ Meta login cancelled or failed');
                        toast.error('Conexão cancelada pelo usuário');
                        setQuickConnecting(false);
                    }
                }, {
                    scope: 'whatsapp_business_management,whatsapp_business_messaging',
                    extras: {
                        setup: {
                            // Pre-fill phone number
                            phone_number: cleanPhone
                        }
                    }
                });
            } else {
                // Fallback: Direct API connection without Meta SDK
                console.log('📱 Meta SDK not available, using direct API mode');
                toast.loading('Iniciando conexão...', { id: 'quick-connect' });

                // Save as pending connection - requires manual token entry later
                const response = await fetch('/api/integrations/whatsapp/quick-start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        phone_number: cleanPhone
                    })
                });

                const data = await response.json();

                if (data.status === 'ok') {
                    toast.success('Número registrado! Complete a configuração no Meta Business Suite.', { id: 'quick-connect' });
                    setActiveTab('manual');
                    setFormData(prev => ({ ...prev, phone_e164: cleanPhone }));
                } else {
                    toast.error(data.reason || 'Erro ao iniciar conexão', { id: 'quick-connect' });
                }

                setQuickConnecting(false);
            }
        } catch (error) {
            console.error('❌ Quick connect error:', error);
            toast.error('Erro ao conectar. Tente o modo manual.');
            setQuickConnecting(false);
        }
    };

    const handleSaveQuickConnection = async (phone: string, token: string) => {
        try {
            const response = await fetch('/api/integrations/whatsapp/save-quick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    phone_number: phone,
                    access_token: token
                })
            });

            const data = await response.json();

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
            const response = await fetch('/api/integrations/whatsapp/save-manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    ...formData
                })
            });

            const data = await response.json();
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
            const response = await fetch('/api/integrations/whatsapp/test-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId })
            });

            const data = await response.json();
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
            const response = await fetch('/api/integrations/whatsapp/reconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId })
            });

            const data = await response.json();
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
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
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
                                    className={`flex-1 px-6 py-4 text-sm font-bold transition-all ${activeTab === 'quick'
                                        ? 'bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm mr-2">bolt</span>
                                    Conexão Rápida (Recomendado)
                                </button>
                                <button
                                    onClick={() => setActiveTab('manual')}
                                    className={`flex-1 px-6 py-4 text-sm font-bold transition-all ${activeTab === 'manual'
                                        ? 'bg-brand-primary/10 text-brand-primary border-b-2 border-brand-primary'
                                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-sm mr-2">settings</span>
                                    Conexão Manual (Avançado)
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
                                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                                <p className="text-sm text-blue-400">
                                                    <strong>💡 Modo assistido:</strong> Insira seu número e siga as instruções para conectar automaticamente.
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                                    Número WhatsApp Business (E.164)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={quickPhone}
                                                    onChange={(e) => setQuickPhone(e.target.value)}
                                                    placeholder="Ex: +55 11 99999-9999"
                                                    className="w-full bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/50"
                                                />
                                            </div>
                                            <button
                                                onClick={handleQuickConnect}
                                                disabled={quickConnecting}
                                                className="w-full px-6 py-3 rounded-xl bg-brand-primary text-white font-bold text-sm shadow-lg shadow-brand-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {quickConnecting ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Conectando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined">rocket_launch</span>
                                                        Iniciar Conexão
                                                    </>
                                                )}
                                            </button>
                                        </motion.div>
                                    ) : (
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
