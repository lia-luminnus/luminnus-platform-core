import React, { useState, useContext, useEffect } from 'react';
import Header from './Header';
import { LanguageContext } from '../contexts/LanguageContext';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import WhatsAppConfig from './whatsapp/WhatsAppConfig.tsx';
import WhatsAppInbox from './whatsapp/WhatsAppInbox.tsx';
import WhatsAppSummaries from './whatsapp/WhatsAppSummaries.tsx';
import WhatsAppKanban from './whatsapp/WhatsAppKanban.tsx';
import WhatsAppAudioInbox from './whatsapp/WhatsAppAudioInbox.tsx';
import WhatsAppBriefingConfig from './whatsapp/WhatsAppBriefingConfig.tsx';
import { getApiUrl } from '../config/api';
import { supabase } from '../lib/supabase';

import { LIAProvider } from './lia/LIAContext';

type ChannelType = 'whatsapp' | 'telegram' | 'web_widget';

const CHANNEL_OPTIONS: { id: ChannelType; label: string; icon: string; color: string }[] = [
    // WhatsApp oculto no lançamento
    // { id: 'whatsapp', label: 'WhatsApp', icon: '📱', color: 'from-green-500 to-green-600' },
    { id: 'telegram', label: 'Telegram', icon: '✈️', color: 'from-blue-400 to-blue-500' },
    { id: 'web_widget', label: 'Web Widget', icon: '🌐', color: 'from-purple-500 to-purple-600' }
];
const WhatsAppAgentContent: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const { user, isAdmin, profile } = useDashboardAuth();
    const [activeTab, setActiveTab] = useState<'config' | 'inbox' | 'summaries' | 'kanban' | 'audio' | 'briefings'>('config');
    const [activeChannel, setActiveChannel] = useState<ChannelType>('telegram');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);
    const [status, setStatus] = useState<any>(null);
    const [loadingStatus, setLoadingStatus] = useState(true);

    // v14.0: Use profile.tenant_id as primary, fallback to user.id
    const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
    const tenantId = isAdmin ? ADMIN_TENANT_ID : (profile?.tenant_id || user?.id || null);

    /**
     * v15.1: Frontend fallback — if backend says disconnected,
     * check twilio_subaccounts directly via Supabase for active numbers.
     */
    const checkTwilioFallback = async (): Promise<any | null> => {
        if (!supabase || !tenantId) return null;
        try {
            const { data, error } = await supabase
                .from('twilio_subaccounts')
                .select('twilio_phone_number, onboarding_status, twilio_account_sid')
                .eq('tenant_id', tenantId)
                .eq('onboarding_status', 'active')
                .limit(1)
                .maybeSingle();

            if (error || !data?.twilio_phone_number) return null;

            const phone = data.twilio_phone_number;
            const phoneMasked = phone.length > 6
                ? phone.slice(0, 4) + '*'.repeat(phone.length - 6) + phone.slice(-2)
                : phone;

            console.log(`[WhatsAppAgent] ✅ Fallback: Twilio ativo encontrado → ${phoneMasked}`);
            return {
                tenant_id: tenantId,
                connected: true,
                status: 'active',
                provider: 'twilio',
                phone_masked: phoneMasked,
                phone: phone,
                last_webhook_at: null,
                last_error: null,
                _source: 'twilio_fallback'
            };
        } catch (err) {
            console.warn('[WhatsAppAgent] Twilio fallback error:', err);
            return null;
        }
    };

    const fetchStatus = async () => {
        // 🔒 SECURITY: Block fetch if no tenant (non-admin users only)
        if (!tenantId) {
            console.warn('⚠️ [WhatsAppAgent] No tenant_id for non-admin user - blocking status fetch');
            setStatus(null);
            setLoadingStatus(false);
            return;
        }

        try {
            // 🔒 SECURITY: Always include tenantId in API calls
            const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/status?tenantId=${tenantId}`);

            if (!response.ok) {
                console.error('Failed to fetch status:', response.status);
                // v15.1: Try Twilio fallback even when backend fails
                const fallback = await checkTwilioFallback();
                if (fallback) { setStatus(fallback); return; }
                setStatus(null);
                return;
            }

            const data = await response.json().catch(() => ({}));

            // 🔒 SECURITY: Validate response belongs to current tenant
            if (data.status === 'ok' && data.data) {
                if (data.data.tenant_id && data.data.tenant_id !== tenantId) {
                    console.error('🚨 [WhatsAppAgent] TENANT MISMATCH! Blocking data leak.');
                    setStatus(null);
                    return;
                }

                // v15.1: If backend says disconnected, try Twilio fallback
                if (!data.data.connected && data.data.status === 'disconnected') {
                    const fallback = await checkTwilioFallback();
                    if (fallback) {
                        setStatus(fallback);
                        return;
                    }
                }

                setStatus(data.data);
            } else {
                // v15.1: Backend returned no data, try Twilio fallback
                const fallback = await checkTwilioFallback();
                if (fallback) { setStatus(fallback); return; }
                setStatus(null);
            }
        } catch (err) {
            console.error('Failed to fetch status:', err);
            // v15.1: Network error — try Twilio fallback
            const fallback = await checkTwilioFallback();
            if (fallback) { setStatus(fallback); return; }
            setStatus(null);
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        // 🔒 SECURITY: Clear status when tenant changes
        setStatus(null);
        setLoadingStatus(true);
        fetchStatus();
    }, [tenantId]);

    const showNotify = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleAction = async (action: string) => {
        if (action === 'hub') {
            window.location.hash = '#/integrations/whatsapp';
            return;
        }

        // 🔒 SECURITY: Block actions if no tenant
        if (!tenantId) {
            showNotify('Tenant não identificado.', 'error');
            return;
        }

        switch (action) {
            case 'reconnect':
                showNotify(t('waReconnecting'), 'info');
                try {
                    const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/reconnect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenant_id: tenantId })
                    });
                    if (response.ok) {
                        const data = await response.json().catch(() => ({}));
                        showNotify(t('waReconnected'), 'success');
                        fetchStatus();
                    } else {
                        showNotify('Erro ao reconectar.', 'error');
                    }
                } catch (err) {
                    showNotify('Falha na comunicação com o servidor.', 'error');
                }
                break;
            case 'webhook':
                showNotify(t('waTestingWebhook'), 'info');
                try {
                    const response = await fetch(`${getApiUrl()}/api/integrations/whatsapp/test-webhook`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenant_id: tenantId })
                    });

                    if (!response.ok) {
                        showNotify('⚠️ Erro no webhook: resposta inválida', 'error');
                        return;
                    }

                    const data = await response.json().catch(() => ({ ok: false }));
                    if (data.data?.webhook_ok) {
                        showNotify('✅ Webhook funcionando!', 'success');
                        fetchStatus();
                    } else {
                        const msg = data.data?.message || data.error || 'desconhecido';
                        showNotify('⚠️ ' + msg, 'error');
                    }
                } catch (err) {
                    showNotify('Falha ao testar webhook.', 'error');
                }
                break;
            case 'logs':
                window.location.hash = '#/integrations/whatsapp';
                break;
            default:
                break;
        }
    };

    const allTabs = [
        { id: 'config', label: t('waConfig'), icon: 'settings_suggest' },
        { id: 'inbox', label: t('waInbox'), icon: 'inbox' },
        { id: 'kanban', label: t('waPipeline'), icon: 'view_kanban' },
        { id: 'audio', label: t('waAudios'), icon: 'headphones' },
        { id: 'briefings', label: t('waBriefings'), icon: 'schedule_send' },
        { id: 'summaries', label: t('waSummaries'), icon: 'description' }
    ];

    const tabs = allTabs.filter(tab => {
        if (activeChannel === 'whatsapp') return true; // WhatsApp tem tudo
        if (activeChannel === 'web_widget') {
            return ['config', 'inbox', 'kanban'].includes(tab.id); // Web foca em venda/conversão
        }
        if (activeChannel === 'telegram') {
            return ['config', 'inbox'].includes(tab.id); // Telegram foca em operações internas (node)
        }
        return false;
    });

    const isOnline = status?.connected === true || ['online', 'active', 'connected'].includes(status?.status);

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9] dark:bg-[#06080f] overflow-hidden">
            <Header title={t('whatsappAgent' as any) || 'LIA (Treinamento)'} />

            {/* === SELETOR DE CANAL === */}
            <div className="px-6 py-3 bg-white dark:bg-[#0a0d14] border-b border-gray-200 dark:border-white/5 flex items-center gap-3 z-20">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mr-2">Canal:</span>
                {CHANNEL_OPTIONS.map((ch) => {
                    const isActive = activeChannel === ch.id;
                    return (
                        <button
                            key={ch.id}
                            onClick={() => {
                                setActiveChannel(ch.id);
                                setActiveTab('config');
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${isActive
                                ? `bg-gradient-to-r ${ch.color} text-white shadow-lg scale-105`
                                : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                        >
                            <span className="text-sm">{ch.icon}</span>
                            {ch.label}
                        </button>
                    );
                })}
            </div>

            {/* Status Header — só para WhatsApp */}
            {activeChannel === 'whatsapp' && (
                <div className="px-6 py-2 bg-white dark:bg-[#0a0d14] border-b border-gray-200 dark:border-white/5 flex items-center justify-between shadow-sm z-10 transition-colors">
                    <div className="flex items-center gap-4">
                        {loadingStatus ? (
                            <div className="w-20 h-6 bg-gray-200 dark:bg-white/5 animate-pulse rounded-full"></div>
                        ) : (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isOnline
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isOnline ? t('waConnected') : 'Desconectado'}
                                </span>
                            </div>
                        )}
                        <p className="text-[10px] font-bold text-gray-400 font-mono">
                            {status && (!status.tenant_id || status.tenant_id === tenantId)
                                ? (status.phone_masked || status.phone || 'Número não definido')
                                : 'Número não definido'
                            }
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction('hub')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-gray-700 dark:text-gray-300"
                        >
                            <span className="material-symbols-outlined text-xs">settings_ethernet</span>
                            Gerenciar Conexão
                        </button>
                        {!isOnline && (
                            <button
                                onClick={() => handleAction('hub')}
                                className="px-4 py-1.5 rounded-lg bg-brand-primary text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                Configurar Agora
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Banner de Erro/CTA — só para WhatsApp */}
            {activeChannel === 'whatsapp' && !loadingStatus && !isOnline && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-lg">warning</span>
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-500">
                            Integração Pendente: Seu agente não pode responder mensagens até que a conexão seja configurada.
                        </p>
                    </div>
                    <button
                        onClick={() => handleAction('hub')}
                        className="text-[10px] font-black text-amber-700 dark:text-amber-500 underline underline-offset-4 hover:opacity-70"
                    >
                        IR PARA HUB DE INTEGRAÇÕES
                    </button>
                </div>
            )}

            {/* Sub-menu Interno */}
            <div className="px-6 pt-1 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#07090e] shadow-sm transition-colors">
                <div className="flex gap-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-2.5 text-xs font-bold transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-brand-primary' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.span
                                    layoutId="whatsappTabIndicator"
                                    className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-primary rounded-t-full shadow-[0_-4px_10px_rgba(139,92,246,0.5)]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {activeTab === 'config' && <WhatsAppConfig channel={activeChannel} onSave={() => showNotify('Configurações salvas com sucesso!', 'success')} />}
                        {activeTab === 'inbox' && <WhatsAppInbox activeLeadId={selectedLeadId} />}
                        {activeTab === 'kanban' && <WhatsAppKanban onOpenChat={(leadId) => {
                            setSelectedLeadId(leadId);
                            setActiveTab('inbox');
                        }} />}
                        {activeTab === 'audio' && <WhatsAppAudioInbox />}
                        {activeTab === 'briefings' && <WhatsAppBriefingConfig />}
                        {activeTab === 'summaries' && <WhatsAppSummaries onOpenChat={() => setActiveTab('inbox')} />}
                    </motion.div>
                </AnimatePresence>

                {/* Notificações Float */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: 50, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: 20, x: '-50%' }}
                            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 z-[100] ${notification.type === 'success' ? 'bg-green-500 text-white border-green-400' :
                                notification.type === 'info' ? 'bg-brand-primary text-white border-brand-primary/20' :
                                    'bg-red-500 text-white border-red-400'
                                }`}
                        >
                            <span className="material-symbols-outlined">
                                {notification.type === 'success' ? 'check_circle' : notification.type === 'info' ? 'info' : 'error'}
                            </span>
                            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
};

const WhatsAppAgent: React.FC = () => {
    return (
        <WhatsAppAgentContent />
    );
};

export default WhatsAppAgent;
