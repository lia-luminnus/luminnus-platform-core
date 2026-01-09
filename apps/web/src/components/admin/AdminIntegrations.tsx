import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Briefcase, MessageSquare, CreditCard, Users,
  Megaphone, Store, Headset, Folder, Server, Bot,
  Search, Lock, CheckCircle2, History, Puzzle,
  Mail, Calendar, MessageCircle, Video, FileText, Map, Rocket,
  Plus, X, Zap, Smartphone, Globe, Cloud, Building,
  Database, ShoppingBag, Receipt, BarChart2, Target, Gamepad2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";

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
}

const INTEGRATIONS: IntegrationDef[] = [
  // === GOOGLE WORKSPACE ===
  {
    id: 'google_workspace',
    name: 'Google Workspace',
    description: 'Gmail, Calendar, Meet, Drive, Sheets, Docs, Slides e Maps em uma única conexão',
    icon: <span className="text-blue-500 font-black">G</span>,
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

interface UserIntegration {
  id: string;
  provider: string;
  services: string[];
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

const AdminIntegrations = () => {
  const { role, user, session } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationDef | null>(null);
  const [selectedGoogleServices, setSelectedGoogleServices] = useState<string[]>(
    GOOGLE_SERVICES.map(s => s.id)
  );

  // Estados reais do backend
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar dados do backend
  const loadData = async () => {
    if (!user?.id || !session?.access_token) return;
    setLoading(true);
    try {
      const response = await fetch('/api/integrations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserIntegrations(data.integrations || []);
        setActivityLogs(data.logs || []);
      }
    } catch (error) {
      console.error('[AdminIntegrations] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Verificar sucesso OAuth na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Integração conectada com sucesso!');
      loadData();
      // Limpa URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const isConnected = (id: string) => userIntegrations.some(ui => ui.provider === id && (ui.status === 'active' || ui.status === 'connected'));
  const getConnectedData = (id: string) => userIntegrations.find(ui => ui.provider === id);

  const activeCount = userIntegrations.filter(ui => ui.status === 'active' || ui.status === 'connected').length;
  const pendingCount = INTEGRATIONS.length - activeCount;

  const filteredIntegrations = INTEGRATIONS.filter(int => {
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

  const handleConnect = async (integration: IntegrationDef) => {
    if (integration.isComposite) {
      setSelectedIntegration(integration);
    } else {
      // Simulação ou conexão direta para outros
      toast.info(`Iniciando conexão para ${integration.name}...`);
    }
  };

  const startGoogleOAuth = async () => {
    if (selectedGoogleServices.length === 0) {
      toast.error('Selecione pelo menos um serviço');
      return;
    }

    toast.loading('Redirecionando para Google...', { id: 'google-oauth' });
    try {
      // IMPORTANTE: O redirect_uri deve corresponder EXATAMENTE ao configurado no Google Cloud Console
      // Google Cloud Console está configurado com: http://localhost:3000/api/auth/google/callback
      const callbackUrl = 'http://localhost:3000/api/auth/google/callback';
      const response = await fetch(
        `/api/auth/google?services=${selectedGoogleServices.join(',')}&user_id=${user?.id}&redirect_uri=${encodeURIComponent(callbackUrl)}`
      );
      if (!response.ok) throw new Error('Falha ao obter URL de autenticação');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      toast.error('Erro ao iniciar conexão com Google', { id: 'google-oauth' });
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500 overflow-x-hidden">
      {/* Header Compacto */}
      <div className="w-full relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-brand-primary/20 to-transparent border border-white/10 p-5 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
              <RefreshCw className={cn("w-5 h-5 text-indigo-400 cursor-pointer", loading && "animate-spin")} onClick={loadData} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Status do Hub</h1>
              <p className="text-[10px] text-indigo-300/60 uppercase tracking-widest font-bold">Ecossistema LIA v2.0</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase">{activeCount} Conectadas</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-[10px] font-bold text-white uppercase">{pendingCount} Disponíveis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca Compactos */}
      <div className="flex flex-col xl:flex-row gap-3 items-center justify-between w-full">
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar w-full xl:flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border shrink-0",
                activeTab === cat.id
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                  : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full xl:w-64 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <Input
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-white/5 border-white/10 text-white text-xs rounded-lg h-9 focus:ring-indigo-500/50 w-full"
          />
        </div>
      </div>

      {/* Grid de Integrações Compacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-10 w-full">
        <AnimatePresence mode='popLayout'>
          {filteredIntegrations.map((integration) => {
            const connected = isConnected(integration.id);
            const connectedData = getConnectedData(integration.id);
            const servicesCount = connectedData?.services?.length || (integration.isComposite ? 0 : integration.permissions.length);

            return (
              <motion.div
                key={integration.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn(
                  "group relative overflow-hidden bg-white/5 border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all duration-300 rounded-2xl h-full flex flex-col",
                  connected && "border-green-500/30 bg-green-500/[0.02]"
                )}>
                  <CardContent className="p-4 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        {integration.icon}
                      </div>
                      {connected ? (
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px] font-bold uppercase">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className={cn(
                          "border-white/10 text-[9px] font-bold uppercase tracking-wider",
                          integration.planRequired === 'pro' ? 'text-yellow-400 bg-yellow-400/10' :
                            integration.planRequired === 'plus' ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 bg-white/5'
                        )}>
                          Plano {integration.planRequired}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1">{integration.name}</h3>
                    <p className="text-[11px] text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                      {integration.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Escopo</span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {connected ? `${servicesCount} Ativos` : `${integration.permissions.length} Disponíveis`}
                        </span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleConnect(integration)}
                        className={cn(
                          "h-8 text-[10px] font-bold px-4 rounded-lg",
                          connected ? "bg-white/10 hover:bg-white/20 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"
                        )}
                      >
                        {connected ? 'Configurar' : 'Conectar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal de Detalhes Google Workspace */}
      <AnimatePresence>
        {selectedIntegration && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0F1117] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-3xl">
                    {selectedIntegration.icon}
                  </div>
                  <button onClick={() => setSelectedIntegration(null)} className="p-1.5 hover:bg-white/5 rounded-full text-gray-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-xl font-bold text-white mb-1">{selectedIntegration.name}</h2>
                <p className="text-xs text-gray-500 mb-6">{selectedIntegration.description}</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Serviços Disponíveis</h4>
                    <span className="text-[10px] text-white/40">{selectedGoogleServices.length} de {GOOGLE_SERVICES.length}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                    {GOOGLE_SERVICES.map((service) => {
                      const isSelected = selectedGoogleServices.includes(service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => toggleGoogleService(service.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all cursor-pointer",
                            isSelected ? "bg-indigo-500/10 border-indigo-500/30" : "bg-white/5 hover:bg-white/[0.08]"
                          )}
                        >
                          <div className="p-1.5 bg-white/5 rounded-lg">
                            {service.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-white text-[11px] truncate">{service.name}</h5>
                          </div>
                          <div className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border transition-all",
                            isSelected ? "bg-indigo-500 border-indigo-500" : "border-white/20"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Button variant="ghost" onClick={() => setSelectedIntegration(null)} className="flex-1 h-10 rounded-xl text-gray-500 text-xs font-bold uppercase">
                    Fechar
                  </Button>
                  <Button onClick={startGoogleOAuth} className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase shadow-lg shadow-indigo-600/30">
                    Conectar Agora
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Histórico Real */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-white/5 to-transparent border border-white/10">
        <div className="flex items-center gap-2.5 mb-5">
          <History className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">Atividades Recentes</h3>
        </div>

        <div className="space-y-2">
          {activityLogs.length === 0 ? (
            <p className="text-xs text-gray-600 italic">Nenhuma atividade registrada ainda.</p>
          ) : (
            activityLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    log.status === 'success' ? "bg-green-500" : "bg-red-500"
                  )} />
                  <span className="text-[11px] text-gray-400 font-medium">
                    <span className="text-white font-bold">{log.provider?.replace('_', ' ')}</span>: {log.action} - {log.message || 'Operação concluída'}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-gray-500 uppercase">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminIntegrations;
