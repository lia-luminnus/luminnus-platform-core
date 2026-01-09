import React, { useState, useEffect } from 'react';
import Header from './Header';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, Briefcase, MessageSquare, CreditCard, Users,
    Megaphone, Store, Headset, Folder, Server, Bot,
    Search, Lock, CheckCircle2, History, Puzzle,
    Mail, Calendar, MessageCircle, Video, FileText, Map, Rocket,
    Plus, X, Zap, Smartphone, Globe, Cloud, Building,
    Database, ShoppingBag, Receipt, BarChart2, Target, Gamepad2,
    RefreshCw, Loader2, ChevronRight
} from 'lucide-react';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// Helper para classes condicionais
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}

// Sub-serviços do Google Workspace
interface GoogleService {
    id: string;
    name: string;
    icon: React.ReactNode;
    description: string;
}

const GOOGLE_SERVICES: GoogleService[] = [
    { id: 'gmail', name: 'Gmail', icon: <Mail className="w-4 h-4 text-red-500" />, description: 'Emails' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-4 h-4 text-blue-500" />, description: 'Eventos' },
    { id: 'meet', name: 'Meet', icon: <Video className="w-4 h-4 text-green-500" />, description: 'Reuniões' },
    { id: 'drive', name: 'Drive', icon: <Folder className="w-4 h-4 text-yellow-500" />, description: 'Arquivos' },
    { id: 'sheets', name: 'Sheets', icon: <FileText className="w-4 h-4 text-green-600" />, description: 'Planilhas' },
    { id: 'docs', name: 'Docs', icon: <FileText className="w-4 h-4 text-blue-600" />, description: 'Documentos' },
    { id: 'slides', name: 'Slides', icon: <Globe className="w-4 h-4 text-orange-500" />, description: 'Apresentações' },
    { id: 'maps', name: 'Maps', icon: <Map className="w-4 h-4 text-green-500" />, description: 'Rotas' },
];

interface IntegrationDef {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    planRequired: 'start' | 'plus' | 'pro';
    permissions: string[];
    isComposite?: boolean;
    image?: string;
}

const INTEGRATIONS_LIST: IntegrationDef[] = [
    // === GOOGLE WORKSPACE ===
    {
        id: 'google_workspace',
        name: 'Google Workspace',
        description: 'Gmail, Calendar, Meet, Drive, Sheets, Docs, Slides e Maps em uma única conexão',
        icon: <div className="flex gap-1 items-center"><span className="text-blue-500 font-black">G</span><span className="text-red-500 font-black">o</span><span className="text-yellow-500 font-black">o</span><span className="text-blue-400 font-black">g</span><span className="text-green-500 font-black">l</span><span className="text-red-400 font-black">e</span></div>,
        category: 'productivity',
        planRequired: 'start',
        permissions: ['Gmail', 'Calendar', 'Meet', 'Drive', 'Sheets', 'Docs', 'Slides', 'Maps'],
        isComposite: true
    },

    // === COMUNICAÇÃO ===
    { id: 'whatsapp', name: 'WhatsApp Business', description: 'Atendimento automático via WhatsApp', icon: <MessageCircle className="text-green-500" />, category: 'communication', planRequired: 'start', permissions: ['Enviar mensagens', 'Ler conversas'] },
    { id: 'slack', name: 'Slack', description: 'Integrar canais e notificações', icon: <Briefcase className="text-indigo-400" />, category: 'communication', planRequired: 'plus', permissions: ['Enviar mensagens', 'Ler canais'] },
    { id: 'telegram', name: 'Telegram Bot', description: 'Automatizar respostas no Telegram', icon: <Rocket className="text-blue-400" />, category: 'communication', planRequired: 'plus', permissions: ['Enviar mensagens', 'Receber comandos'] },
    { id: 'discord', name: 'Discord', description: 'Integrar servidores e bots', icon: <Gamepad2 className="text-indigo-500" />, category: 'communication', planRequired: 'plus', permissions: ['Enviar mensagens', 'Gerenciar canais'] },
    { id: 'twilio', name: 'Twilio SMS', description: 'Enviar SMS e notificações', icon: <Smartphone className="text-red-500" />, category: 'communication', planRequired: 'pro', permissions: ['Enviar SMS', 'Receber mensagens'] },

    // === FINANÇAS ===
    { id: 'stripe', name: 'Stripe', description: 'Processar pagamentos e assinaturas', icon: <CreditCard className="text-indigo-500" />, category: 'finance', planRequired: 'plus', permissions: ['Ver transações', 'Gerenciar clientes'] },
    { id: 'pix', name: 'PIX API', description: 'Receber e enviar PIX automaticamente', icon: <Server className="text-teal-500" />, category: 'finance', planRequired: 'plus', permissions: ['Gerar QR codes', 'Verificar pagamentos'] },
    { id: 'asaas', name: 'Asaas', description: 'Cobranças e gestão financeira', icon: <span className="text-blue-500 font-bold">$</span>, category: 'finance', planRequired: 'plus', permissions: ['Criar cobranças'] },
    { id: 'nfe', name: 'Nota Fiscal', description: 'Emitir notas fiscais automaticamente', icon: <Receipt className="text-orange-500" />, category: 'finance', planRequired: 'pro', permissions: ['Emitir NF-e'] },
    { id: 'mercadopago', name: 'Mercado Pago', description: 'Pagamentos e checkout', icon: <ShoppingBag className="text-blue-600" />, category: 'finance', planRequired: 'plus', permissions: ['Receber pagamentos'] },

    // === VENDAS & CRM ===
    { id: 'hubspot', name: 'HubSpot', description: 'Sincronizar leads e oportunidades', icon: <Target className="text-orange-500" />, category: 'sales', planRequired: 'plus', permissions: ['Ler contatos', 'Criar deals'] },
    { id: 'pipedrive', name: 'Pipedrive', description: 'Gerenciar funil de vendas', icon: <BarChart2 className="text-green-600" />, category: 'sales', planRequired: 'plus', permissions: ['Ler deals', 'Criar atividades'] },
    { id: 'rdstation', name: 'RD Station', description: 'Marketing e automação de leads', icon: <Rocket className="text-blue-600" />, category: 'sales', planRequired: 'plus', permissions: ['Gerenciar leads'] },
    { id: 'salesforce', name: 'Salesforce', description: 'CRM empresarial completo', icon: <Cloud className="text-blue-400" />, category: 'sales', planRequired: 'pro', permissions: ['Gerenciar oportunidades'] },

    // === MARKETING ===
    { id: 'meta_ads', name: 'Meta Ads', description: 'Gerenciar campanhas Facebook/Instagram', icon: <Megaphone className="text-blue-500" />, category: 'marketing', planRequired: 'pro', permissions: ['Ver métricas', 'Criar anúncios'] },
    { id: 'google_ads', name: 'Google Ads', description: 'Automatizar campanhas de busca', icon: <Search className="text-yellow-500" />, category: 'marketing', planRequired: 'pro', permissions: ['Ver performance'] },
    { id: 'mailchimp', name: 'Mailchimp', description: 'Enviar campanhas de email marketing', icon: <Mail className="text-yellow-600" />, category: 'marketing', planRequired: 'plus', permissions: ['Gerenciar listas'] },
    { id: 'activecampaign', name: 'ActiveCampaign', description: 'Automação de email e CRM', icon: <Mail className="text-blue-700" />, category: 'marketing', planRequired: 'plus', permissions: ['Criar automações'] },

    // === E-COMMERCE ===
    { id: 'shopify', name: 'Shopify', description: 'Integrar loja virtual', icon: <Store className="text-green-500" />, category: 'ecommerce', planRequired: 'plus', permissions: ['Gerenciar produtos'] },
    { id: 'woocommerce', name: 'WooCommerce', description: 'Gerenciar loja WordPress', icon: <Store className="text-purple-600" />, category: 'ecommerce', planRequired: 'plus', permissions: ['Ver pedidos'] },

    // === SUPORTE ===
    { id: 'zendesk', name: 'Zendesk', description: 'Gerenciar tickets de suporte', icon: <Headset className="text-green-700" />, category: 'support', planRequired: 'plus', permissions: ['Responder tickets'] },
    { id: 'intercom', name: 'Intercom', description: 'Chat ao vivo e suporte', icon: <MessageSquare className="text-blue-500" />, category: 'support', planRequired: 'plus', permissions: ['Gerenciar conversas'] },

    // === ARMAZENAMENTO ===
    { id: 'dropbox', name: 'Dropbox', description: 'Sincronizar documentos', icon: <Folder className="text-blue-500" />, category: 'storage', planRequired: 'plus', permissions: ['Ler arquivos'] },
    { id: 'aws_s3', name: 'AWS S3', description: 'Armazenamento em nuvem', icon: <Server className="text-orange-400" />, category: 'storage', planRequired: 'pro', permissions: ['Upload/Download'] },

    // === ERPs & SISTEMAS ===
    { id: 'sap', name: 'SAP', description: 'Integrar ERP SAP', icon: <Building className="text-blue-800" />, category: 'erp', planRequired: 'pro', permissions: ['Sincronizar dados'] },
    { id: 'totvs', name: 'TOTVS', description: 'Integrar sistemas TOTVS', icon: <Database className="text-orange-600" />, category: 'erp', planRequired: 'pro', permissions: ['Financeiro'] },
    { id: 'bling', name: 'Bling', description: 'Gestão empresarial', icon: <Zap className="text-yellow-500" />, category: 'erp', planRequired: 'plus', permissions: ['Estoque', 'Vendas'] },

    // === IA & AUTOMAÇÃO ===
    { id: 'openai', name: 'OpenAI', description: 'Integrar GPT e modelos de IA', icon: <Bot className="text-green-500" />, category: 'ai', planRequired: 'pro', permissions: ['Chamadas API'] },
    { id: 'zapier', name: 'Zapier', description: 'Conectar milhares de apps', icon: <Zap className="text-orange-500" />, category: 'ai', planRequired: 'plus', permissions: ['Automações'] },
];

const CATEGORIES = [
    { id: 'all', label: 'Todos', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'productivity', label: 'Produtividade', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'communication', label: 'Comunicação', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'finance', label: 'Finanças', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'sales', label: 'Vendas', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'marketing', label: 'Marketing', icon: <Megaphone className="w-3.5 h-3.5" /> },
    { id: 'ecommerce', label: 'Online', icon: <Store className="w-3.5 h-3.5" /> },
    { id: 'support', label: 'Suporte', icon: <Headset className="w-3.5 h-3.5" /> },
    { id: 'storage', label: 'Arquivos', icon: <Folder className="w-3.5 h-3.5" /> },
    { id: 'erp', label: 'ERPs', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'IA', icon: <Bot className="w-3.5 h-3.5" /> },
];

const Integrations: React.FC = () => {
    const { user, session, profile } = useDashboardAuth();
    const { completeIntegrations, planType } = useAppStore();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDef | null>(null);
    const [selectedGoogleServices, setSelectedGoogleServices] = useState<string[]>(
        GOOGLE_SERVICES.map(s => s.id)
    );

    const [userIntegrations, setUserIntegrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        if (!user?.id || !session?.access_token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // v2.1: Usar rota unificada sem prefixo /lia (porte 5000 via proxy)
            const response = await fetch('/api/integrations', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUserIntegrations(data.integrations || []);
            }
        } catch (error) {
            console.error('[Integrations] Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    // v2.4: Detectar retorno do Google OAuth
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1]);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state && session?.access_token) {
            completeGoogleOAuth(code, state);
            // Limpar URL
            const newUrl = window.location.pathname + window.location.hash.split('?')[0];
            window.history.replaceState({}, document.title, newUrl);
        }
    }, [session]);

    const completeGoogleOAuth = async (code: string, state: string) => {
        const loadToast = toast.loading('Finalizando conexão com Google...');
        try {
            const response = await fetch('/api/auth/google/callback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ code, state })
            });

            if (response.ok) {
                toast.dismiss(loadToast);
                toast.success('Google Workspace conectado com sucesso!');
                loadData();
            } else {
                throw new Error('Falha ao validar tokens');
            }
        } catch (error: any) {
            toast.dismiss(loadToast);
            toast.error('Erro ao finalizar conexão');
            console.error('[Integrations] Callback error:', error);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.id]);

    const isConnected = (id: string) => userIntegrations.some(ui => ui.provider === id && (ui.status === 'active' || ui.status === 'connected'));

    // v2.2: Contagem granular para Google Workspace (cada serviço = 1)
    const calculateActiveCount = () => {
        let count = 0;
        userIntegrations.forEach(ui => {
            if (ui.status === 'active' || ui.status === 'connected') {
                if (ui.provider === 'google_workspace' && ui.services && ui.services.length > 0) {
                    count += ui.services.length;
                } else {
                    count += 1;
                }
            }
        });
        return count;
    };

    const activeCount = calculateActiveCount();

    const filteredIntegrations = INTEGRATIONS_LIST.filter(int => {
        const matchesCategory = activeTab === 'all' || int.category === activeTab;
        const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            int.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const toggleGoogleService = (serviceId: string) => {
        setSelectedGoogleServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleConnect = (integration: IntegrationDef) => {
        if (integration.isComposite) {
            setSelectedIntegration(integration);
        } else {
            toast.promise(
                new Promise((resolve) => setTimeout(resolve, 1500)),
                {
                    loading: `Conectando com ${integration.name}...`,
                    success: `${integration.name} conectado com sucesso!`,
                    error: `Falha ao conectar com ${integration.name}.`,
                }
            );
            // Simulação local
            setUserIntegrations(prev => [...prev, { provider: integration.id, status: 'active', services: [] }]);
        }
    };

    const startGoogleOAuth = async () => {
        // Validar user_id de forma robusta
        const userId = user?.id || profile?.id;

        if (!userId || userId === 'unknown') {
            console.error('[Integrations] Perfil não carregado para OAuth:', { user, profile });
            toast.error('Erro de sessão: Perfil não identificado. Recarregue a página.');
            return;
        }

        if (selectedGoogleServices.length === 0) {
            toast.error('Selecione pelo menos um serviço');
            return;
        }

        const loadToast = toast.loading('Redirecionando para Google...');
        try {
            // v2.3: Redirecionamento unificado (porta 5000 via proxy) sem prefixo /lia
            const callbackUrl = window.location.origin + '/#/integrations';

            // Passamos redirect_to no state para o unificado (3000) saber para onde voltar
            const apiUrl = `/api/auth/google?services=${selectedGoogleServices.join(',')}&user_id=${userId}&redirect_to=${encodeURIComponent(callbackUrl)}&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/google/callback')}`;
            console.log('[Integrations] Iniciando OAuth:', apiUrl);

            const response = await fetch(apiUrl);

            if (response.ok) {
                const data = await response.json();
                if (data.authUrl) {
                    window.location.href = data.authUrl;
                    return;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Erro no servidor de autenticação');
            }

        } catch (error: any) {
            toast.dismiss(loadToast);
            console.error('[Integrations] Erro Google OAuth:', error);
            toast.error(`Erro ao iniciar conexão: ${error.message}`);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0A0F1A] overflow-hidden">
            <Header title="Hub de Integrações" />

            <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent border border-white/5 p-8 shadow-2xl">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight mb-2">Ecossistema LIA</h1>
                                <p className="text-gray-400 max-w-xl">
                                    Conecte a LIA às suas ferramentas favoritas para desbloquear o poder total da automação inteligente.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-center px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="text-2xl font-black text-white">{activeCount}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Ativas</div>
                                </div>
                                <div className="text-center px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                                    <div className="text-2xl font-black text-indigo-400">{INTEGRATIONS_LIST.length}</div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Disponíveis</div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative Glow */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
                    </div>

                    {/* Filter & Search */}
                    <div className="flex flex-col xl:flex-row gap-4 items-center justify-between sticky top-0 z-20 py-2 bg-[#0A0F1A]">
                        <div className="relative w-full xl:flex-1">
                            {/* Indicador de scroll à esquerda */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0A0F1A] to-transparent z-10 pointer-events-none" />
                            <div
                                className="flex gap-2 overflow-x-auto py-3 px-1"
                                style={{
                                    scrollbarWidth: 'thin',
                                    msOverflowStyle: 'none',
                                    WebkitOverflowScrolling: 'touch'
                                } as any}
                            >
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border shrink-0",
                                            activeTab === cat.id
                                                ? "bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20"
                                                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            {/* Indicador de scroll à direita */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0A0F1A] to-transparent z-10 pointer-events-none" />
                        </div>

                        <div className="relative w-full xl:w-80 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                placeholder="Buscar ferramentas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Integrations Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                        <AnimatePresence mode="popLayout">
                            {filteredIntegrations.map((item) => {
                                const connected = isConnected(item.id);
                                return (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className={cn(
                                            "group relative flex flex-col p-6 rounded-3xl border transition-all duration-300",
                                            connected
                                                ? "bg-indigo-900/10 border-indigo-500/30"
                                                : "bg-[#0F1420] border-white/5 hover:border-indigo-500/40"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                {item.icon}
                                            </div>
                                            {connected ? (
                                                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                    {item.id === 'google_workspace'
                                                        ? `${userIntegrations.find(ui => ui.provider === 'google_workspace')?.services?.length || 0} Serviços`
                                                        : 'Ativo'
                                                    }
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                                                    item.planRequired === 'pro' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' :
                                                        item.planRequired === 'plus' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                                                            'bg-white/5 text-gray-500 border-white/5'
                                                )}>
                                                    Plano {item.planRequired}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-2">{item.name}</h3>
                                        <p className="text-xs text-gray-500 leading-relaxed mb-8 flex-1">
                                            {item.description}
                                        </p>

                                        <button
                                            onClick={() => handleConnect(item)}
                                            className={cn(
                                                "w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                connected
                                                    ? "bg-white/5 text-white hover:bg-white/10"
                                                    : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95"
                                            )}
                                        >
                                            {connected ? 'Configurar' : 'Conectar Agora'}
                                            {!connected && <ChevronRight className="w-4 h-4" />}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {/* Solicitar Nova Integração */}
                    <div className="p-8 rounded-3xl bg-[#0F1420] border border-white/5 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Plus className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">Não encontrou sua ferramenta?</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm">
                            Solicite uma nova integração e nossa equipe irá avaliar a viabilidade de adicionar ao ecossistema LIA.
                        </p>
                        <button
                            onClick={() => toast.success('Solicitação enviada! Entraremos em contato em breve.')}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20"
                        >
                            <span className="flex items-center gap-2 justify-center">
                                <Puzzle className="w-4 h-4" />
                                Solicitar Integração
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Google Workspace Logic Portal (Modal) */}
            <AnimatePresence>
                {selectedIntegration && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#0D111C] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner">
                                        {selectedIntegration.icon}
                                    </div>
                                    <button onClick={() => setSelectedIntegration(null)} className="p-3 hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">{selectedIntegration.name}</h2>
                                <p className="text-sm text-gray-500 mb-8 leading-relaxed">{selectedIntegration.description}</p>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Escopo da Conexão</h4>
                                        <span className="text-[10px] text-gray-600 font-bold uppercase">{selectedGoogleServices.length} Selecionados</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {GOOGLE_SERVICES.map((service) => {
                                            const isSelected = selectedGoogleServices.includes(service.id);
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => toggleGoogleService(service.id)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer group",
                                                        isSelected
                                                            ? "bg-indigo-500/10 border-indigo-500/40"
                                                            : "bg-white/5 border-white/5 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="p-2 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                                                        {service.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-white text-xs truncate uppercase tracking-wider">{service.name}</h5>
                                                    </div>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-lg flex items-center justify-center border transition-all",
                                                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-white/20"
                                                    )}>
                                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-10 flex gap-4">
                                    <button
                                        onClick={() => setSelectedIntegration(null)}
                                        className="flex-1 h-12 rounded-2xl bg-white/5 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={startGoogleOAuth}
                                        className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Conectar Agora
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Integrations;
