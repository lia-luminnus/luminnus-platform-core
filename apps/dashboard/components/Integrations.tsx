import React, { useContext, useState, useEffect } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { completeIntegrationsOnboarding } from '../services/profileService';

// Sub-serviços do Google Workspace
interface GoogleService {
    id: string;
    name: string;
    icon: string;
    description: string;
    scopes: string[];
}

const GOOGLE_SERVICES: GoogleService[] = [
    { id: 'gmail', name: 'Gmail', icon: '📧', description: 'Ler, enviar e organizar emails', scopes: ['gmail.readonly', 'gmail.send', 'gmail.modify'] },
    { id: 'calendar', name: 'Calendar', icon: '📅', description: 'Sincronizar eventos e agendar reuniões', scopes: ['calendar.readonly', 'calendar.events'] },
    { id: 'meet', name: 'Meet', icon: '🎥', description: 'Criar e gerenciar videoconferências', scopes: ['calendar.events'] },
    { id: 'drive', name: 'Drive', icon: '📁', description: 'Acessar e organizar arquivos', scopes: ['drive.readonly', 'drive.file'] },
    { id: 'sheets', name: 'Sheets', icon: '📊', description: 'Ler e editar planilhas', scopes: ['spreadsheets.readonly', 'spreadsheets'] },
    { id: 'docs', name: 'Docs', icon: '📄', description: 'Criar e editar documentos', scopes: ['documents.readonly', 'documents'] },
    { id: 'slides', name: 'Slides', icon: '🎞️', description: 'Criar e editar apresentações', scopes: ['presentations.readonly', 'presentations'] },
    { id: 'maps', name: 'Maps', icon: '🗺️', description: 'Geolocalização e rotas', scopes: ['maps.readonly'] },
];

// Definição das integrações disponíveis
interface IntegrationDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    planRequired: 'start' | 'plus' | 'pro';
    permissions: string[];
    isComposite?: boolean; // Para integrações com sub-serviços
    subServices?: GoogleService[];
}

const INTEGRATIONS: IntegrationDef[] = [
    // === GOOGLE WORKSPACE (Consolidado) ===
    {
        id: 'google_workspace',
        name: 'Google Workspace',
        description: 'Gmail, Calendar, Meet, Drive, Sheets, Docs, Slides e Maps em uma única conexão',
        icon: '🔷',
        category: 'productivity',
        planRequired: 'start',
        permissions: ['Gmail', 'Calendar', 'Meet', 'Drive', 'Sheets', 'Docs', 'Slides', 'Maps'],
        isComposite: true,
        subServices: GOOGLE_SERVICES
    },

    // === COMUNICAÇÃO ===
    { id: 'whatsapp', name: 'WhatsApp Business', description: 'Atendimento automático via WhatsApp', icon: '💬', category: 'communication', planRequired: 'start', permissions: ['Enviar mensagens', 'Ler conversas', 'Gerenciar contatos'] },
    { id: 'slack', name: 'Slack', description: 'Integrar canais e notificações', icon: '💼', category: 'communication', planRequired: 'plus', permissions: ['Enviar mensagens', 'Ler canais', 'Gerenciar bots'] },
    { id: 'telegram', name: 'Telegram Bot', description: 'Automatizar respostas no Telegram', icon: '✈️', category: 'communication', planRequired: 'plus', permissions: ['Enviar mensagens', 'Receber comandos'] },
    { id: 'discord', name: 'Discord', description: 'Integrar servidores e bots', icon: '🎮', category: 'communication', planRequired: 'plus', permissions: ['Enviar mensagens', 'Gerenciar canais'] },
    { id: 'twilio', name: 'Twilio SMS', description: 'Enviar SMS e notificações', icon: '📱', category: 'communication', planRequired: 'pro', permissions: ['Enviar SMS', 'Receber mensagens'] },

    // === MICROSOFT 365 ===
    { id: 'microsoft_365', name: 'Microsoft 365', description: 'Outlook, Teams, OneDrive, Excel, Word', icon: '🟦', category: 'productivity', planRequired: 'plus', permissions: ['Outlook', 'Teams', 'OneDrive', 'Excel', 'Word'] },

    // === FINANÇAS ===
    { id: 'stripe', name: 'Stripe', description: 'Processar pagamentos e assinaturas', icon: '💳', category: 'finance', planRequired: 'plus', permissions: ['Ver transações', 'Criar cobranças', 'Gerenciar clientes'] },
    { id: 'pix', name: 'PIX API', description: 'Receber e enviar PIX automaticamente', icon: '🏦', category: 'finance', planRequired: 'plus', permissions: ['Gerar QR codes', 'Verificar pagamentos'] },
    { id: 'nfe', name: 'Nota Fiscal', description: 'Emitir notas fiscais automaticamente', icon: '🧾', category: 'finance', planRequired: 'pro', permissions: ['Emitir NF-e', 'Consultar status'] },
    { id: 'asaas', name: 'Asaas', description: 'Cobranças e gestão financeira', icon: '💰', category: 'finance', planRequired: 'plus', permissions: ['Criar cobranças', 'Gerenciar clientes'] },
    { id: 'mercadopago', name: 'Mercado Pago', description: 'Pagamentos e checkout', icon: '🛒', category: 'finance', planRequired: 'plus', permissions: ['Receber pagamentos', 'Ver saldo'] },

    // === VENDAS & CRM ===
    { id: 'hubspot', name: 'HubSpot', description: 'Sincronizar leads e oportunidades', icon: '🎯', category: 'sales', planRequired: 'plus', permissions: ['Ler contatos', 'Criar deals', 'Atualizar pipeline'] },
    { id: 'pipedrive', name: 'Pipedrive', description: 'Gerenciar funil de vendas', icon: '📊', category: 'sales', planRequired: 'plus', permissions: ['Ler deals', 'Criar atividades'] },
    { id: 'rdstation', name: 'RD Station', description: 'Marketing e automação de leads', icon: '🚀', category: 'sales', planRequired: 'plus', permissions: ['Gerenciar leads', 'Criar campanhas'] },
    { id: 'salesforce', name: 'Salesforce', description: 'CRM empresarial completo', icon: '☁️', category: 'sales', planRequired: 'pro', permissions: ['Gerenciar oportunidades', 'Relatórios'] },

    // === MARKETING ===
    { id: 'meta_ads', name: 'Meta Ads', description: 'Gerenciar campanhas Facebook/Instagram', icon: '📱', category: 'marketing', planRequired: 'pro', permissions: ['Ver métricas', 'Criar campanhas', 'Gerenciar anúncios'] },
    { id: 'google_ads', name: 'Google Ads', description: 'Automatizar campanhas de busca', icon: '🔍', category: 'marketing', planRequired: 'pro', permissions: ['Ver performance', 'Ajustar lances'] },
    { id: 'mailchimp', name: 'Mailchimp', description: 'Enviar campanhas de email marketing', icon: '📩', category: 'marketing', planRequired: 'plus', permissions: ['Gerenciar listas', 'Enviar campanhas'] },
    { id: 'activecampaign', name: 'ActiveCampaign', description: 'Automação de email e CRM', icon: '✉️', category: 'marketing', planRequired: 'plus', permissions: ['Gerenciar contatos', 'Criar automações'] },

    // === E-COMMERCE ===
    { id: 'shopify', name: 'Shopify', description: 'Integrar loja virtual', icon: '🛍️', category: 'ecommerce', planRequired: 'plus', permissions: ['Gerenciar produtos', 'Ver pedidos'] },
    { id: 'woocommerce', name: 'WooCommerce', description: 'Gerenciar loja WordPress', icon: '🏪', category: 'ecommerce', planRequired: 'plus', permissions: ['Gerenciar produtos', 'Processar pedidos'] },
    { id: 'mercadolivre', name: 'Mercado Livre', description: 'Vender e gerenciar anúncios', icon: '🤝', category: 'ecommerce', planRequired: 'plus', permissions: ['Gerenciar anúncios', 'Ver vendas'] },

    // === SUPORTE ===
    { id: 'zendesk', name: 'Zendesk', description: 'Gerenciar tickets de suporte', icon: '🎫', category: 'support', planRequired: 'plus', permissions: ['Ver tickets', 'Responder clientes'] },
    { id: 'intercom', name: 'Intercom', description: 'Chat ao vivo e suporte', icon: '💬', category: 'support', planRequired: 'plus', permissions: ['Chat ao vivo', 'Gerenciar conversas'] },
    { id: 'freshdesk', name: 'Freshdesk', description: 'Help desk e suporte', icon: '🆘', category: 'support', planRequired: 'plus', permissions: ['Gerenciar tickets', 'Base de conhecimento'] },

    // === ARMAZENAMENTO ===
    { id: 'dropbox', name: 'Dropbox', description: 'Sincronizar documentos', icon: '📦', category: 'storage', planRequired: 'plus', permissions: ['Ler arquivos', 'Upload'] },
    { id: 'aws_s3', name: 'AWS S3', description: 'Armazenamento em nuvem', icon: '☁️', category: 'storage', planRequired: 'pro', permissions: ['Upload', 'Download', 'Gerenciar buckets'] },

    // === ERPs & SISTEMAS ===
    { id: 'sap', name: 'SAP', description: 'Integrar ERP SAP', icon: '🏢', category: 'erp', planRequired: 'pro', permissions: ['Sincronizar dados', 'Relatórios'] },
    { id: 'totvs', name: 'TOTVS', description: 'Integrar sistemas TOTVS', icon: '🔧', category: 'erp', planRequired: 'pro', permissions: ['Sincronizar dados', 'Financeiro'] },
    { id: 'omie', name: 'Omie', description: 'ERP para pequenas empresas', icon: '📋', category: 'erp', planRequired: 'plus', permissions: ['Financeiro', 'Estoque', 'Vendas'] },
    { id: 'bling', name: 'Bling', description: 'Gestão empresarial', icon: '⚡', category: 'erp', planRequired: 'plus', permissions: ['Vendas', 'Estoque', 'Notas fiscais'] },
    { id: 'custom_erp', name: 'ERP Personalizado', description: 'Conectar seu sistema via API/Webhook', icon: '🔌', category: 'erp', planRequired: 'pro', permissions: ['Configuração customizada'] },
    { id: 'webhook', name: 'Webhook Genérico', description: 'Receber e enviar dados via webhook', icon: '🔗', category: 'erp', planRequired: 'pro', permissions: ['Receber eventos', 'Enviar dados'] },

    // === IA & AUTOMAÇÃO ===
    { id: 'openai', name: 'OpenAI', description: 'Integrar GPT e modelos de IA', icon: '🤖', category: 'ai', planRequired: 'pro', permissions: ['Chamadas API', 'Processamento de texto'] },
    { id: 'zapier', name: 'Zapier', description: 'Conectar milhares de apps', icon: '⚡', category: 'ai', planRequired: 'plus', permissions: ['Criar Zaps', 'Automações'] },
    { id: 'make', name: 'Make (Integromat)', description: 'Automações avançadas', icon: '🔄', category: 'ai', planRequired: 'plus', permissions: ['Criar cenários', 'Webhooks'] },
];

const CATEGORIES = [
    { id: 'all', label: 'Todos', icon: 'apps' },
    { id: 'productivity', label: 'Produtividade', icon: 'work' },
    { id: 'communication', label: 'Comunicação', icon: 'chat' },
    { id: 'finance', label: 'Finanças', icon: 'payments' },
    { id: 'sales', label: 'Vendas & CRM', icon: 'handshake' },
    { id: 'marketing', label: 'Marketing', icon: 'campaign' },
    { id: 'ecommerce', label: 'E-commerce', icon: 'store' },
    { id: 'support', label: 'Suporte', icon: 'support_agent' },
    { id: 'storage', label: 'Arquivos', icon: 'folder' },
    { id: 'erp', label: 'ERPs & Sistemas', icon: 'dns' },
    { id: 'ai', label: 'IA & Automação', icon: 'smart_toy' },
];

const PLAN_LEVELS = { start: 1, plus: 2, pro: 3 };

// Interface para dados do Supabase
interface UserIntegration {
    id: string;
    provider: string;
    services: string[];
    provider_email: string | null;
    status: string;
    connected_at: string;
}

interface ActivityLog {
    id: string;
    provider: string;
    action: string;
    status: string;
    message: string | null;
    created_at: string;
}

const Integrations: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const { profile, plan, session, refreshProfile } = useDashboardAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDef | null>(null);

    // v2.0: Detectar primeiro acesso pós-onboarding via URL
    const [isFirstAccess, setIsFirstAccess] = useState(false);
    const [completingOnboarding, setCompletingOnboarding] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        if (params.get('first_access') === 'true') {
            setIsFirstAccess(true);
            // Limpar parâmetro da URL para evitar reexibição
            const newUrl = window.location.pathname + '#/integrations';
            window.history.replaceState({}, document.title, newUrl);
        }
    }, []);

    // Estado para serviços Google selecionados (toggle individual)
    const [selectedGoogleServices, setSelectedGoogleServices] = useState<string[]>(
        GOOGLE_SERVICES.map(s => s.id) // Todos selecionados por padrão
    );

    // Estados para dados do Supabase
    const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [loadingIntegrations, setLoadingIntegrations] = useState(true);

    // Carregar integrações e logs do Supabase
    const loadData = async () => {
        if (!profile?.id) {
            console.log('[Integrations] loadData ignorado: Perfil sem ID');
            return;
        }

        console.log('[Integrations] Carregando dados para user_id:', profile.id);

        try {
            console.log('[Integrations] 🌉 Buscando dados via API de Ponte...');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch('/api/integrations', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Fallback para Supabase direto se a ponte falhar (ex: API offline)
                console.warn('[Integrations] Ponte indisponível, tentando Supabase direto...');
                return await loadDataDirect();
            }

            const result = await response.json();

            if (result.integrations) {
                console.log(`[Integrations] ✅ Sucesso via Ponte! ${result.integrations.length} integrações encontradas.`);
                setUserIntegrations(result.integrations);
                if (result.integrations.length > 0) {
                    toast.success(`${result.integrations.length} integrações ativas encontradas!`, { id: 'api-success' });
                }
            }

            if (result.logs) {
                setActivityLogs(result.logs);
            }
        } catch (error: any) {
            console.error('[Integrations] ❌ ERRO NA PONTE:', error.message);
            // Tentar direto se a ponte falhar por timeout ou rede
            return await loadDataDirect();
        } finally {
            setLoadingIntegrations(false);
        }
    };

    // Fallback: Busca direta no Supabase (o que estávamos usando antes)
    const loadDataDirect = async () => {
        try {
            console.log('[Integrations] ⚡ Tentando conexão direta com Supabase...');
            const { supabase } = await import('../lib/supabase');
            if (!supabase) return;

            const { data: integrations, error: fetchError } = await supabase
                .from('user_integrations')
                .select('id, provider, services, provider_email, status, connected_at')
                .eq('user_id', profile?.id);

            if (!fetchError && integrations) {
                setUserIntegrations(integrations);
            }
        } catch (error) {
            console.error('[Integrations] Falha total no carregamento:', error);
        }
    };

    // Função para diagnóstico manual via botão
    const runManualDiagnostic = async () => {
        toast.loading('Testando conexão com o banco...', { id: 'diagnostic' });
        console.log('[Integrations-Diagnostic] Iniciando teste manual...');
        await loadData();
        toast.dismiss('diagnostic');
    };

    useEffect(() => {
        loadData();
    }, [profile?.id]);

    // Verificar parâmetros de sucesso na URL (retorno do Google/OAuth)
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : window.location.search);
        const success = params.get('success');
        const provider = params.get('provider');
        console.log('[Integrations] Verificando parâmetros de sucesso na URL...', { success, provider, hash: window.location.hash });

        if (success === 'true' && provider) {
            console.log(`[Integrations] OAuth finalizado com sucesso para: ${provider}`);
            const providerName = INTEGRATIONS.find(i => i.id === provider)?.name || provider;
            toast.success(`${providerName} conectado com sucesso!`, { id: 'oauth-success' });

            // Limpar os parâmetros da URL sem recarregar a página
            const newUrl = window.location.pathname + window.location.hash.split('?')[0];
            window.history.replaceState({}, document.title, newUrl);

            // Recarregar os dados
            loadData();
        }
    }, [profile?.id]);

    // Toggle de serviço Google individual
    const toggleGoogleService = (serviceId: string) => {
        setSelectedGoogleServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    // Verificar se está acessando via painel admin (sessionStorage) ou é admin por role
    const isAdminAccess = sessionStorage.getItem('admin_access') === 'true' || profile?.role === 'admin';

    // Plano atual (em produção virá do contexto)
    const currentPlan = (plan?.name?.toLowerCase() || 'start') as 'start' | 'plus' | 'pro';

    // Verificar conexão real do Supabase
    const isConnected = (integrationId: string) => {
        return userIntegrations.some(ui => ui.provider === integrationId && ui.status === 'active');
    };

    // Obter dados da integração conectada
    const getConnectedIntegration = (integrationId: string) => {
        return userIntegrations.find(ui => ui.provider === integrationId);
    };

    // Função canAccess para verificar plano
    const canAccess = (integration: IntegrationDef) => {
        if (isAdminAccess) return true; // Admin ou acesso via painel admin tem acesso total
        return PLAN_LEVELS[currentPlan] >= PLAN_LEVELS[integration.planRequired];
    };

    // Total de integrações conectadas
    // v2.1: Google Workspace conta cada serviço individualmente (Gmail=1, Calendar=1, etc.)
    const connectedIntegrations = userIntegrations.filter(ui => ui.status === 'active');

    // Calcular total real considerando serviços Google
    const calculateActiveCount = () => {
        let count = 0;
        connectedIntegrations.forEach(ui => {
            if (ui.provider === 'google_workspace' && ui.services && ui.services.length > 0) {
                // Google Workspace: cada serviço conta como 1
                count += ui.services.length;
            } else {
                // Outras integrações: cada uma conta como 1
                count += 1;
            }
        });
        return count;
    };

    const filteredIntegrations = INTEGRATIONS.filter(int => {
        const matchesCategory = activeTab === 'all' || int.category === activeTab;
        const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            int.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const activeCount = calculateActiveCount();
    const pendingCount = INTEGRATIONS.filter(i => canAccess(i) && !isConnected(i.id)).length;
    const blockedCount = INTEGRATIONS.filter(i => !canAccess(i)).length;

    const handleConnect = (integration: IntegrationDef) => {
        if (!canAccess(integration)) {
            toast.error(`Upgrade para o plano ${integration.planRequired.toUpperCase()} para acessar`);
            return;
        }

        // v2.1: Pré-carregar serviços já conectados ao abrir modal do Google Workspace
        if (integration.id === 'google_workspace') {
            const googleInt = getConnectedIntegration('google_workspace');
            if (googleInt?.services && googleInt.services.length > 0) {
                setSelectedGoogleServices(googleInt.services);
            } else {
                // Se não tem conexão, selecionar todos por padrão
                setSelectedGoogleServices(GOOGLE_SERVICES.map(s => s.id));
            }
        }

        setSelectedIntegration(integration);
    };

    const handleRequestCustom = () => {
        toast.success('Solicitação de integração customizada enviada!');
        console.log('[Integrations] Custom integration request submitted');
    };

    // v2.0: Concluir onboarding de integrações
    const handleCompleteIntegrationsOnboarding = async () => {
        if (!profile?.id) return;

        setCompletingOnboarding(true);
        try {
            await completeIntegrationsOnboarding(profile.id, []);
            await refreshProfile();
            setIsFirstAccess(false);
            toast.success('Configuração inicial concluída! Bem-vindo ao seu painel de integrações.');
            navigate('/home');
        } catch (error) {
            console.error('[Integrations] Erro ao concluir onboarding:', error);
            // Continue anyway
            setIsFirstAccess(false);
            toast.success('Configuração salva!');
        } finally {
            setCompletingOnboarding(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0D111C]">
            <Header title={t('integrationsTitle')} />

            <div className="flex-1 p-8 pt-2 overflow-y-auto">
                {/* v2.0: Banner de Primeiro Acesso (Onboarding) */}
                {isFirstAccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-6 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent rounded-3xl border border-green-500/30"
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-3xl text-green-500">celebration</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-green-600 dark:text-green-400 mb-1">
                                        🎉 Parabéns! Seu painel está pronto.
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                        Conecte suas ferramentas favoritas para que a LIA possa automatizar tarefas,
                                        enviar lembretes e integrar seus dados. <strong>Você pode fazer isso agora ou depois.</strong>
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">info</span>
                                        Dica da LIA: Quanto mais conexões, mais inteligente eu fico!
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 flex-shrink-0">
                                <button
                                    onClick={handleCompleteIntegrationsOnboarding}
                                    disabled={completingOnboarding}
                                    className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-white/20 text-sm font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                                >
                                    Pular por agora
                                </button>
                                <button
                                    onClick={handleCompleteIntegrationsOnboarding}
                                    disabled={completingOnboarding}
                                    className="px-6 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {completingOnboarding ? (
                                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                            Concluir Onboarding
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Header com Badges */}
                <div className="mb-8 p-6 bg-gradient-to-r from-brand-primary/10 via-purple-500/5 to-transparent rounded-3xl border border-brand-primary/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-sm font-black text-brand-primary uppercase tracking-widest italic flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">hub</span>
                                    Central de Integrações
                                </h2>
                                <button
                                    onClick={runManualDiagnostic}
                                    className="p-1 px-2 rounded-md bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-all flex items-center gap-1"
                                    title="Testar Conexão com Banco"
                                >
                                    <span className="material-symbols-outlined text-xs">refresh</span>
                                    <span className="text-[10px] font-bold">RECARREGAR</span>
                                </button>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                {t('integrationsSubtitle')}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">{activeCount} Ativos</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">{pendingCount} Pendentes</span>
                            </div>
                            {blockedCount > 0 && !isAdminAccess && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <span className="material-symbols-outlined text-sm text-red-500">lock</span>
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{blockedCount} Bloqueadas</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Busca e Categorias */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar integração..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === cat.id
                                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30'
                                    : 'bg-white dark:bg-white/5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-100 dark:border-white/5'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid de Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {filteredIntegrations.map((integration) => {
                        const connected = isConnected(integration.id);
                        const accessible = canAccess(integration);

                        return (
                            <motion.div
                                key={integration.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`relative p-6 rounded-3xl border transition-all group ${connected
                                    ? 'bg-green-500/5 border-green-500/30 dark:bg-green-500/10'
                                    : accessible
                                        ? 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-brand-primary/40 hover:shadow-xl'
                                        : 'bg-gray-100 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 opacity-60'
                                    }`}
                            >
                                {/* Lock overlay for blocked */}
                                {!accessible && (
                                    <div className="absolute inset-0 rounded-3xl bg-gray-900/5 dark:bg-black/20 flex items-center justify-center z-10">
                                        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-yellow-500">lock</span>
                                            <span className="text-xs font-bold uppercase">Plano {integration.planRequired}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                    <div className="text-4xl">{integration.icon}</div>
                                    {connected && (
                                        <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-bold uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            {/* v2.1: Mostrar quantidade de serviços Google conectados */}
                                            {integration.id === 'google_workspace' ? (
                                                (() => {
                                                    const googleInt = getConnectedIntegration('google_workspace');
                                                    const serviceCount = googleInt?.services?.length || 0;
                                                    return `${serviceCount} serviço${serviceCount !== 1 ? 's' : ''}`;
                                                })()
                                            ) : 'Conectado'}
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-black text-lg tracking-tight mb-1">{integration.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{integration.description}</p>

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">
                                        {integration.permissions.length} permissões
                                    </span>
                                    <button
                                        onClick={() => handleConnect(integration)}
                                        disabled={!accessible && !isAdminAccess}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${connected
                                            ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-red-500/10 hover:text-red-500'
                                            : accessible
                                                ? 'bg-brand-primary text-white hover:opacity-90 shadow-lg shadow-brand-primary/20'
                                                : 'bg-gray-200 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {connected ? 'Gerenciar' : accessible ? 'Conectar' : 'Upgrade'}
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Seção Integrações Customizadas */}
                <div className="mb-10">
                    <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-brand-primary">extension</span>
                        Integrações do Seu Negócio
                    </h3>
                    <div className="p-8 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 bg-gradient-to-br from-gray-50 to-transparent dark:from-white/[0.02] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h4 className="font-bold text-lg mb-1">Precisa de uma integração específica?</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                ERPs locais, sistemas legados, softwares proprietários — conecte via API, Webhook ou importação de dados.
                            </p>
                        </div>
                        <button
                            onClick={handleRequestCustom}
                            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-primary text-white font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30 whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined">add_link</span>
                            Solicitar Integração
                        </button>
                    </div>
                </div>

                {/* Log de Atividades */}
                <div>
                    <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-brand-primary">history</span>
                        Log de Atividades
                    </h3>
                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10 divide-y divide-gray-100 dark:divide-white/5">
                        {activityLogs.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                                <p className="text-sm">Nenhuma atividade recente</p>
                                <p className="text-xs">Conecte uma integração para ver o histórico</p>
                            </div>
                        ) : (
                            activityLogs.map((log) => {
                                // Formatar tempo relativo
                                const timeAgo = (date: string) => {
                                    const diff = Date.now() - new Date(date).getTime();
                                    const minutes = Math.floor(diff / 60000);
                                    if (minutes < 60) return `Há ${minutes} min`;
                                    const hours = Math.floor(minutes / 60);
                                    if (hours < 24) return `Há ${hours} hora${hours > 1 ? 's' : ''}`;
                                    const days = Math.floor(hours / 24);
                                    return `Há ${days} dia${days > 1 ? 's' : ''}`;
                                };

                                // Mapear ação para texto legível
                                const actionText = {
                                    connected: 'conectado com sucesso',
                                    disconnected: 'desconectado',
                                    synced: 'sincronizado',
                                    error: 'erro na conexão',
                                    token_refreshed: 'token renovado'
                                }[log.action] || log.action;

                                // Nome do provedor formatado
                                const providerName = INTEGRATIONS.find(i => i.id === log.provider)?.name || log.provider;

                                return (
                                    <div key={log.id} className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-green-500' :
                                                log.status === 'error' ? 'bg-red-500' :
                                                    'bg-yellow-500'
                                                }`}></span>
                                            <span className="text-sm font-medium">
                                                {providerName} {actionText}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Conexão */}
            <AnimatePresence>
                {selectedIntegration && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedIntegration(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-[#1A1F2E] rounded-3xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="text-center mb-6">
                                <div className="text-6xl mb-4">{selectedIntegration.icon}</div>
                                <h2 className="text-2xl font-black tracking-tight">{selectedIntegration.name}</h2>
                                <p className="text-gray-500 text-sm mt-1">{selectedIntegration.description}</p>
                                {/* v2.1: Mostrar status conectado se já tiver conexão */}
                                {isConnected(selectedIntegration.id) && (
                                    <div className="mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-xs font-bold text-green-600 dark:text-green-400">
                                            {selectedIntegration.id === 'google_workspace' ? (
                                                `${getConnectedIntegration('google_workspace')?.services?.length || 0} serviços conectados`
                                            ) : 'Conectado'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Renderização especial para Google Workspace */}
                            {selectedIntegration.isComposite && selectedIntegration.subServices ? (
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                            {isConnected('google_workspace') ? 'Gerenciar Serviços' : 'Selecione os Serviços'}
                                        </h4>
                                        <span className="text-xs text-brand-primary font-bold">
                                            {selectedGoogleServices.length} de {selectedIntegration.subServices.length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedIntegration.subServices.map((service) => {
                                            const isSelected = selectedGoogleServices.includes(service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => toggleGoogleService(service.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                                                        ? 'bg-brand-primary/10 border-brand-primary'
                                                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                                        }`}
                                                >
                                                    <div className="text-2xl">{service.icon}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className={`font-bold text-sm truncate ${isSelected ? 'text-brand-primary' : ''}`}>
                                                            {service.name}
                                                        </h5>
                                                        <p className="text-[10px] text-gray-500 truncate">{service.description}</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected
                                                        ? 'border-brand-primary bg-brand-primary'
                                                        : 'border-gray-300 dark:border-white/20 bg-transparent'
                                                        }`}>
                                                        {isSelected && (
                                                            <span className="material-symbols-outlined text-white text-sm">check</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-3 text-center">
                                        Clique para selecionar/desselecionar. Uma única autenticação OAuth conectará todos os selecionados.
                                    </p>
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Permissões Solicitadas</h4>
                                    <div className="space-y-2">
                                        {selectedIntegration.permissions.map((perm, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                                                <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                                <span className="text-sm font-medium">{perm}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    <strong>Transparência:</strong> A LIA usará essas permissões apenas para automatizar tarefas conforme suas configurações. Você pode revogar o acesso a qualquer momento.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedIntegration(null)}
                                    className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={async () => {
                                        if (selectedIntegration.id === 'google_workspace') {
                                            // Validar se pelo menos 1 serviço selecionado
                                            if (selectedGoogleServices.length === 0) {
                                                toast.error('Selecione pelo menos um serviço');
                                                return;
                                            }
                                            // Validar se o perfil está carregado corretamente
                                            if (!profile || profile.id === 'unknown') {
                                                console.error('[Integrations] Perfil inválido para OAuth:', profile);
                                                toast.error('Erro de sessão: Perfil não identificado. Recarregue a página e tente novamente.', { id: 'google-oauth' });
                                                return;
                                            }

                                            toast.loading('Preparando conexão com Google...', { id: 'google-oauth' });
                                            console.log('[Integrations] Serviços selecionados:', selectedGoogleServices);

                                            try {
                                                // Construir redirect_uri apontando para o Dashboard atual
                                                const dashboardRedirectUri = `${window.location.origin}/#/oauth/callback`;
                                                console.log('[Integrations] Usando redirect_uri:', dashboardRedirectUri);

                                                const response = await fetch(
                                                    `/api/auth/google?services=${selectedGoogleServices.join(',')}&user_id=${profile.id}&redirect_uri=${encodeURIComponent(dashboardRedirectUri)}`
                                                );

                                                if (!response.ok) {
                                                    const errorData = await response.json().catch(() => ({}));
                                                    throw new Error(errorData.error || 'Erro ao iniciar OAuth');
                                                }

                                                const data = await response.json();

                                                if (data.authUrl) {
                                                    toast.success('Redirecionando para Google...', { id: 'google-oauth' });
                                                    window.location.href = data.authUrl;
                                                    setSelectedIntegration(null);
                                                } else {
                                                    throw new Error('URL de autorização não encontrada');
                                                }
                                            } catch (error) {
                                                console.error('[Integrations] Erro OAuth:', error);
                                                toast.error('Erro ao conectar com Google. Verifique as configurações.', { id: 'google-oauth' });
                                            }
                                        } else {
                                            toast.success(`${selectedIntegration.name} conectado com sucesso!`);
                                            setSelectedIntegration(null);
                                        }
                                    }}
                                    disabled={selectedIntegration.id === 'google_workspace' && selectedGoogleServices.length === 0}
                                    className={`flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${selectedIntegration.id === 'google_workspace' && selectedGoogleServices.length === 0
                                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-brand-primary text-white hover:opacity-90 shadow-brand-primary/30'
                                        }`}
                                >
                                    {selectedIntegration.id === 'google_workspace' && (
                                        <span className="text-lg">🔷</span>
                                    )}
                                    Conectar com {selectedIntegration.id === 'google_workspace' ? 'Google' : selectedIntegration.name}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Integrations;
