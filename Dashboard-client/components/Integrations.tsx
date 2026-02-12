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
import { getApiUrl } from '../config/api';

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
    planRequired: 'start' | 'plus' | 'pro';
}

const GOOGLE_SERVICES: GoogleService[] = [
    { id: 'gmail', name: 'Gmail', icon: <Mail className="w-4 h-4 text-red-500" />, description: 'E-mails', planRequired: 'start' },
    { id: 'calendar', name: 'Calendar', icon: <Calendar className="w-4 h-4 text-blue-500" />, description: 'Eventos', planRequired: 'start' },
    { id: 'meet', name: 'Meet', icon: <Video className="w-4 h-4 text-green-500" />, description: 'Reuniões', planRequired: 'plus' },
    { id: 'drive', name: 'Drive', icon: <Folder className="w-4 h-4 text-yellow-500" />, description: 'Arquivos', planRequired: 'plus' },
    { id: 'sheets', name: 'Sheets', icon: <FileText className="w-4 h-4 text-green-600" />, description: 'Planilhas', planRequired: 'plus' },
    { id: 'docs', name: 'Docs', icon: <FileText className="w-4 h-4 text-blue-600" />, description: 'Documentos', planRequired: 'plus' },
    { id: 'slides', name: 'Slides', icon: <Globe className="w-4 h-4 text-orange-500" />, description: 'Apresentações', planRequired: 'plus' },
    { id: 'maps', name: 'Maps', icon: <Map className="w-4 h-4 text-green-500" />, description: 'Rotas', planRequired: 'plus' },
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
    // === START ===
    {
        id: 'google_workspace',
        name: 'Google Workspace',
        description: 'Conecte o Calendar para a LIA gerenciar seus compromissos e agenda.',
        icon: <div className="flex gap-1 items-center"><span className="text-blue-500 font-black">G</span><span className="text-red-500 font-black">o</span><span className="text-yellow-500 font-black">o</span><span className="text-blue-400 font-black">g</span><span className="text-green-500 font-black">l</span><span className="text-red-400 font-black whitespace-nowrap">e</span></div>,
        category: 'productivity',
        planRequired: 'start',
        permissions: ['Calendar'],
        isComposite: true
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        description: 'Atendimento inteligente e proativo via WhatsApp oficial.',
        icon: <MessageCircle className="text-green-500" />,
        category: 'communication',
        planRequired: 'start',
        permissions: ['Enviar mensagens', 'Ler conversas']
    },

    // === PRO/HUB ===
    {
        id: 'sap',
        name: 'SAP Enterprise',
        description: 'Integração nativa com ecossistema SAP para grandes operações.',
        icon: <Building className="text-blue-800" />,
        category: 'erp',
        planRequired: 'pro',
        permissions: ['Sincronizar dados']
    },
    {
        id: 'hub',
        name: 'Hub de Integrações',
        description: 'Conecte qualquer sistema via API, Webhooks e mapeamento universal.',
        icon: <Zap className="text-indigo-400" />,
        category: 'core',
        planRequired: 'plus',
        permissions: ['API Keys', 'Webhooks', 'Endpoints']
    },
];

const CATEGORIES = [
    { id: 'all', label: 'Todos', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: 'productivity', label: 'Produtividade', icon: <Briefcase className="w-3.5 h-3.5" /> },
    { id: 'communication', label: 'Comunicação', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'erp', label: 'Empresarial', icon: <Building className="w-3.5 h-3.5" /> },
    { id: 'core', label: 'Desenvolvedor', icon: <Zap className="w-3.5 h-3.5" /> },
];

const Integrations: React.FC = () => {
    const { user, session, profile, loading: authLoading, initialized, plan: authPlan, setPlanName, isAdmin } = useDashboardAuth();
    const { completeIntegrations, planType } = useAppStore();
    const navigate = useNavigate();

    // Se ainda não inicializou, mostra loading spinner
    if (!initialized) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    // Se não há sessão/usuário/perfil após inicialização, redirecionar para login
    // v2.5: Aceitar session OU profile como fallback se user estiver temporariamente null
    if (initialized && !user && !session && !profile && !authLoading) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-6 p-8 text-center bg-[#0A0F1A]/50 backdrop-blur-md rounded-3xl border border-white/5">
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center animate-pulse">
                    <Lock className="h-10 w-10 text-yellow-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Login Necessário</h2>
                    <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                        Para acessar as integrações inteligentes da LIA, sua sessão precisa ser validada com segurança pelo painel principal.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-white/5 text-gray-400 font-bold rounded-xl hover:bg-white/10 transition-all border border-white/10"
                    >
                        Tentar Novamente
                    </button>
                    <button
                        onClick={() => {
                            const landingPage = import.meta.env.VITE_LANDING_PAGE_URL || 'http://localhost:8080';
                            window.location.href = `${landingPage}/dashboard?redirect_to=integrations`;
                        }}
                        className="px-6 py-3 bg-brand-primary text-white font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">sync</span>
                        Sincronizar Acesso
                    </button>
                </div>
            </div>
        );
    }


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
            // v2.1: Usar rota unificada sem prefixo /lia (porte 3000 via proxy)
            const response = await fetch(`${getApiUrl()}/api/integrations`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setUserIntegrations(data.integrations || []);
            } else {
                console.warn('[Integrations] API retornou erro:', response.status);
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
            const response = await fetch(`${getApiUrl()}/api/auth/google/callback`, {
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
                const errorData = await response.json().catch(() => ({ error: 'Falha desconhecida' }));
                throw new Error(errorData.error || 'Falha ao validar tokens');
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
        const service = GOOGLE_SERVICES.find(s => s.id === serviceId);
        const currentPlan = (authPlan?.name?.toLowerCase() || 'start') as 'start' | 'plus' | 'pro';
        const planHierarchy = { start: 0, plus: 1, pro: 2 };

        if (service && planHierarchy[currentPlan] < planHierarchy[service.planRequired]) {
            toast(`O serviço ${service.name} está disponível apenas no plano ${service.planRequired.toUpperCase()}.`, {
                icon: '🔒'
            });
            return;
        }

        setSelectedGoogleServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    };

    const handleConnect = (integration: IntegrationDef) => {
        if (integration.id === 'hub') {
            navigate('/integrations/hub');
            return;
        }

        if (integration.id === 'sap') {
            toast('Implantação Assistida: Nossa equipe entrará em contato para agendar o setup enterprise.', {
                icon: '🏢',
                duration: 5000
            });
            return;
        }

        if (integration.isComposite) {
            setSelectedIntegration(integration);

            // Se for Google Workspace, verificar se já está conectado e carregar serviços salvos
            if (integration.id === 'google_workspace') {
                const existingIntegration = userIntegrations.find(ui => ui.provider === 'google_workspace');
                if (existingIntegration && existingIntegration.services && existingIntegration.services.length > 0) {
                    // Carregar serviços já salvos, filtrando pelo plano atual
                    const currentPlan = (authPlan?.name?.toLowerCase() || 'start') as 'start' | 'plus' | 'pro';
                    const planHierarchy = { start: 0, plus: 1, pro: 2 };
                    const allowedServices = GOOGLE_SERVICES.filter(s =>
                        planHierarchy[currentPlan] >= planHierarchy[s.planRequired]
                    ).map(s => s.id);

                    setSelectedGoogleServices(existingIntegration.services.filter((s: string) => allowedServices.includes(s)));
                } else {
                    // Se não conectado, selecionar apenas os básicos por padrão
                    setSelectedGoogleServices(['calendar']);
                }
            }
            setSelectedIntegration(integration);
            if (integration.id === 'whatsapp') {
                navigate('/integrations/whatsapp');
                return;
            }
        }
    };

    const startGoogleOAuth = async () => {
        // Validar user_id de forma robusta
        const userId = user?.id || profile?.id;

        console.log('[Integrations] startGoogleOAuth chamado:', {
            userId,
            userObj: user ? { id: user.id, email: user.email } : null,
            profileObj: profile ? { id: profile.id } : null,
            sessionExists: !!session,
            initialized
        });

        if (!userId || userId === 'unknown') {
            console.error('[Integrations] Perfil não carregado para OAuth:', {
                user: user ? { id: user.id, email: user.email } : null,
                profile: profile ? { id: profile.id } : null,
                sessionAccessToken: session?.access_token ? 'presente' : 'ausente',
                initialized
            });
            toast.error('Erro de sessão: Perfil não identificado. Recarregue a página.');
            return;
        }


        if (selectedGoogleServices.length === 0) {
            toast.error('Selecione pelo menos um serviço');
            return;
        }


        const loadToast = toast.loading('Redirecionando para Google...');
        try {
            // v2.3: Redirecionamento unificado (porta 3000 via proxy) sem prefixo /lia
            const callbackUrl = window.location.origin + '/#/integrations';

            // 🔒 SECURITY: Get tenant from user context
            const userTenantId = (user as any)?.user_metadata?.tenant_id || (user as any)?.tenant_id || null;
            const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
            const tenantId = userTenantId || (isAdmin ? ADMIN_TENANT_ID : null);

            // Passamos redirect_to no state para o unificado (3000) saber para onde voltar
            const apiUrl = `${getApiUrl()}/api/auth/google?services=${selectedGoogleServices.join(',')}&user_id=${userId}&tenant_id=${tenantId || 'undefined'}&redirect_to=${encodeURIComponent(callbackUrl)}&redirect_uri=${encodeURIComponent(getApiUrl() + '/api/auth/google/callback')}`;
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
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0A0F1A] overflow-hidden">
            <Header title="Hub de Integrações" />

            <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-transparent border border-white/5 p-8 shadow-2xl">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Ecossistema LIA</h1>
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
                    <div className="flex flex-col xl:flex-row gap-4 items-center justify-between sticky top-0 z-20 py-2 bg-gray-50 dark:bg-[#0A0F1A]">
                        <div className="relative w-full xl:flex-1">
                            {/* Indicador de scroll à esquerda */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 dark:from-[#0A0F1A] to-transparent z-10 pointer-events-none" />
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
                                                : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                                        )}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            {/* Indicador de scroll à direita */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-[#0A0F1A] to-transparent z-10 pointer-events-none" />
                        </div>

                        <div className="relative w-full xl:w-80 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                placeholder="Buscar ferramentas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
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
                                                ? "bg-indigo-50 dark:bg-indigo-900/10 border-indigo-500/30"
                                                : "bg-white dark:bg-[#0F1420] border-gray-200 dark:border-white/5 hover:border-indigo-500/40"
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

                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{item.name}</h3>
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
                    <div className="p-8 rounded-3xl bg-white dark:bg-[#0F1420] border border-gray-200 dark:border-white/5 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Plus className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Não encontrou sua ferramenta?</h3>
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
                                    <div className="h-16 px-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner shrink-0 overflow-visible">
                                        <div className="flex gap-2 items-center px-4 leading-none">
                                            <span className="text-blue-500 font-black">G</span>
                                            <span className="text-red-500 font-black">o</span>
                                            <span className="text-yellow-500 font-black">o</span>
                                            <span className="text-blue-400 font-black">g</span>
                                            <span className="text-green-500 font-black">l</span>
                                            <span className="text-red-400 font-black">e</span>
                                        </div>
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-600 font-bold uppercase">{selectedGoogleServices.length} Selecionados</span>
                                            {(authPlan?.name?.toLowerCase() || 'start') === 'start' && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                                    <Lock className="w-2.5 h-2.5 text-amber-500" />
                                                    <span className="text-[9px] font-black text-amber-500 uppercase">Plus Requerido para extras</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {GOOGLE_SERVICES.map((service) => {
                                            const isSelected = selectedGoogleServices.includes(service.id);
                                            const currentPlan = (authPlan?.name?.toLowerCase() || 'start') as 'start' | 'plus' | 'pro';
                                            const planHierarchy = { start: 0, plus: 1, pro: 2 };
                                            const isLocked = planHierarchy[currentPlan] < planHierarchy[service.planRequired];

                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => {
                                                        if (isLocked) {
                                                            toast(`O serviço ${service.name} está disponível apenas no plano ${service.planRequired.toUpperCase()}.`, {
                                                                icon: '🔒',
                                                                duration: 3000
                                                            });
                                                            return;
                                                        }
                                                        toggleGoogleService(service.id);
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer group relative",
                                                        isSelected
                                                            ? "bg-indigo-500/10 border-indigo-500/40"
                                                            : isLocked
                                                                ? "bg-black/20 border-white/5 opacity-60 grayscale cursor-not-allowed"
                                                                : "bg-white/5 border-white/5 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="p-2 bg-white/5 rounded-xl group-hover:scale-110 transition-transform">
                                                        {service.icon}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-bold text-white text-xs truncate uppercase tracking-wider">{service.name}</h5>
                                                        {isLocked && (
                                                            <div className="mt-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-full inline-flex">
                                                                <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">Plano Plus</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-lg flex items-center justify-center border transition-all",
                                                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-white/20",
                                                        isLocked && "border-amber-500/20 bg-amber-500/5"
                                                    )}>
                                                        {isLocked ? (
                                                            <Lock className="w-2.5 h-2.5 text-amber-500" />
                                                        ) : isSelected && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                        )}
                                                    </div>
                                                    {isLocked && (
                                                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 rounded text-[8px] font-black text-black">
                                                            {service.planRequired.toUpperCase()}
                                                        </div>
                                                    )}
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
                                        {isConnected('google_workspace') ? 'Salvar Alterações' : 'Conectar Agora'}
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
