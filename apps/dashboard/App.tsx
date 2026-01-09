
import React, { useState, createContext, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LiaChat from './components/LiaChat';
import Calendar from './components/Calendar';
import Files from './components/Files';
import Automations from './components/Automations';
import Financial from './components/Financial';
import Team from './components/Team';
import Settings from './components/Settings';
import Plan from './components/Plan';
import Support from './components/Support';
import CRM from './components/CRM';
import Logistics from './components/Logistics';
import Sales from './components/Sales';
import Stock from './components/Stock';
import Properties from './components/Properties';
import MedicalRecords from './components/MedicalRecords';
import Onboarding from './components/Onboarding';
import Integrations from './components/Integrations';
import IntegrationOnboardingModal from './components/IntegrationOnboardingModal';
import { supabase, configError } from './lib/supabase';
import AuthBridge from './pages/AuthBridge';
import OAuthCallback from './pages/OAuthCallback';
import { useAppStore } from './store/useAppStore';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardAuthProvider, useDashboardAuth } from './contexts/DashboardAuthContext';
import { DashboardAuthGuard } from './components/DashboardAuthGuard';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const PlaceholderModule: React.FC<{ title: string, icon: string }> = ({ title, icon }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col h-full items-center justify-center p-8 text-center"
  >
    <div className="w-32 h-32 rounded-full bg-brand-primary/10 flex items-center justify-center mb-8 animate-pulse shadow-2xl">
      <span className="material-symbols-outlined text-6xl text-brand-primary">{icon}</span>
    </div>
    <h1 className="text-4xl font-black mb-4 tracking-tighter">{title}</h1>
    <p className="text-gray-500 max-w-md font-medium">Este módulo de elite foi ativado. Em breve, a LIA integrará funcionalidades avançadas aqui.</p>
  </motion.div>
);

export type Language = 'en' | 'pt' | 'es';

export const translations = {
  pt: {
    dashboard: 'Dashboard', crm: 'CRM', lia: 'LIA', calendar: 'Calendário', files: 'Arquivos', automations: 'Automações', financial: 'Financeiro', team: 'Equipe', settings: 'Configurações', plan: 'Plano', support: 'Suporte', liaOnline: 'LIA Online', featureComingSoon: 'Brevemente!', helloUser: 'Olá, Kathryn!', searchPlaceholder: 'Busca Universal...', planLabel: 'Plano:', upgrade: 'Upgrade', crmTitle: 'CRM', pipeline: 'Pipeline', listView: 'Lista', newDeal: 'Novo Negócio', searchDeals: 'Buscar...', stageLead: 'Leads', stageContacted: 'Contatado', stageProposal: 'Proposta', stageNegotiation: 'Negociação', stageClosed: 'Fechado', totalValue: 'Total Pipeline', openDeals: 'Abertos', conversionRate: 'Conversão', client: 'Cliente', company: 'Empresa', value: 'Valor', stage: 'Etapa', email: 'Email', lastContact: 'Contato', moveStage: 'Mover', editDeal: 'Editar', deleteDeal: 'Excluir', saveDeal: 'Salvar', cancel: 'Cancelar', dealDetails: 'Detalhes', configTitle: 'Ajustes', settingsDesc: 'Personalize seu painel.', appearance: 'Aparência', theme: 'Tema', language: 'Idioma', accentColor: 'Cor', saveChanges: 'Salvar', darkMode: 'Dark', lightMode: 'Light', customizeAppearance: 'Aparência.', chooseLanguage: 'Idioma.', selectAccent: 'Cor.', saved: 'Salvo!', companyActivity: 'Atividade', newClients: 'Novos', conversions: 'Conversões', messages: 'Msgs', attendances: 'Atd', sales: 'Vendas', tickets: 'Tkt', generalPerformance: 'Performance', daily: 'Dia', weekly: 'Semana', monthly: 'Mês', yearly: 'Ano', threatAlert: 'Alertas', pending: 'Pendente', delays: 'Atrasos', problems: 'Probs', opportunities: 'Oportunidades', dailySummary: 'Resumo', liaOverview: '(LIA)', tasksToday: 'Hoje', liaActions: "Autônomas", liaSuggestion: 'LIA', execute: 'Executar', liaInsights: 'Insights', liaInsightsText: "78% de chance de bater metas.", investigate: 'Investigar', remindLater: 'Depois', quickActions: 'Ações', mon: 'S', tue: 'T', wed: 'Q', thu: 'Q', fri: 'S', sat: 'S', sun: 'D', alertApprovals: 'Aprovações.', alertZenith: "Atraso.", alertNexus: "Falha.", alertEngagement: "Engajamento.", conversationsTitle: 'Chat LIA', recentConversations: 'Recentes', newConversation: 'Novo', howCanIHelp: 'Ajudo hoje?', liaIntro: "Sou a LIA.", typeMessage: 'Fale com LIA...', analyzeData: 'Analisar', draftEmail: 'Email', summarizePDF: 'Resumir', myTasks: 'Minhas', chatHistory1: 'Q3', chatHistorySnippet1: 'Resumo...', chatHistory2: 'Campanha', chatHistorySnippet2: 'Slogans...', chatHistory3: 'Reunião', chatHistorySnippet3: 'Foco...', agendaTitle: 'Agenda', createEvent: 'Novo Evento', upcomingEvents: 'Próximos', liaSuggestions: 'Sugestões', reviewSuggestions: 'Revisar', eventModalTitle: 'Evento', editEvent: 'Editar', newEvent: 'Novo', eventTitleLabel: 'Título', dayLabel: 'Dia', timeLabel: 'Hora', typeLabel: 'Tipo', delete: 'Excluir', saveEvent: 'Salvar', today: 'Hoje', filesTitle: 'Arquivos', searchFiles: 'Buscar...', newFolder: 'Pasta', upload: 'Subir', automationsTitle: 'Automações', totalAutomations: 'Total', active: 'Ativo', paused: 'Pausado', error: 'Erro', errors24h: 'Erros', workflowList: 'Lista', searchWorkflow: 'Buscar...', workflowName: 'Nome', trigger: 'Gatilho', lastRun: 'Execução', status: 'Status', actions: 'Ações', financialTitle: 'Financeiro', totalBalance: 'Saldo', totalRevenue: 'Receita', totalExpenses: 'Despesas', revenueVsExpenses: 'Fluxo', expenseBreakdown: 'Detalhamento', recentTransactions: 'Transações', description: 'Descrição', date: 'Data', amount: 'Valor', invoice: 'Invoice', completed: 'OK', inProgress: 'In Progress', failed: 'Falhou', teamTitle: 'Equipe', manageRoles: 'Funções', inviteMember: 'Convidar', pendingInvitation: 'Pendente', awaiting: 'Aguardando', resend: 'Reenviar', addNewMember: 'Novo Membro', expandTeam: 'Expandir', admin: 'Admin', developer: 'Dev', projectManager: 'PM', marketing: 'Marketing', designer: 'Designer', supportRole: 'Suporte', planTitle: 'Plano', essentialPlan: 'Essencial', nextBilling: 'Cobrança em', manageSubscription: 'Gerenciar', cancelPlan: 'Cancelar', upgradePlan: 'Upgrade', recommended: 'TOP', choosePro: 'Escolher Pro', enterprise: 'Enterprise', custom: 'Custom', contactSales: 'Vendas', paymentHistory: 'Pagamentos', supportTitle: 'Suporte', howCanWeHelp: 'Ajuda?', searchKeywords: 'Busca...', quickAccess: 'Acesso', gettingStarted: 'Início', billing: 'Fatura', techSupport: 'TI', faq: 'FAQ', activated: 'OK', stock: 'Estoque', stockTitle: 'Estoque', addProduct: 'Novo', searchStock: 'Busca...', stockAdded: 'OK', stockUpdated: 'OK', projects: 'Projetos', logistics: 'Logística', logisticsTitle: 'Logística', logisticsDesc: 'Painel Logístico.', ongoingDeliveries: 'Entregas', delivered: 'Entregue', onHold: 'Espera', newShipment: 'Novo Envio', liveTracking: 'Live Map', warehouseStatus: 'Armazém', optimizeRoutes: 'Rotas', checkWarehouse: 'Estoque', generateReport: 'Relatório', last30Days: '30 dias', fromLastMonth: 'vs anterior', properties: 'Imóveis', medicalRecords: 'Prontuários', reports: 'Relatórios',
    integrations: 'Integrações', integrationsTitle: 'Integrações & Permissões', integrationsSubtitle: 'Conecte suas ferramentas para que a LIA possa automatizar processos, atender clientes e gerar inteligência para o seu negócio.'
  },
  en: {},
  es: {}
};

export const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => { },
});

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['pt']) => string;
}>({
  language: 'pt',
  setLanguage: () => { },
  t: (key: any) => key,
});

/**
 * Smart redirect component that checks Supabase profile for onboarding status
 * This replaces the old localStorage-based check
 */
const RootRedirect: React.FC = () => {
  const { onboardingCompleted, loading, profile } = useDashboardAuth();

  // Still loading profile from Supabase
  if (loading || profile === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0F1A]">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  console.log('[RootRedirect] Checking onboarding status:', { onboardingCompleted, profileId: profile?.id });

  // Not completed onboarding -> go to onboarding flow
  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding completed -> go to dashboard
  return <Navigate to="/home" replace />;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const { onboardingCompleted, profile, refreshProfile } = useDashboardAuth();
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);

  // Sync local store with Supabase profile for UI components that depend on it
  const { setModules } = useAppStore();

  useEffect(() => {
    // Keep local store in sync with Supabase profile modules
    if (profile?.modules && Array.isArray(profile.modules)) {
      setModules(profile.modules as any);
    }
  }, [profile?.modules, setModules]);

  // Detectar primeiro acesso pós-onboarding para redirecionar ao Hub de Integrações (v2.0)
  // Substitui o modal genérico pelo Hub completo
  useEffect(() => {
    if (
      profile &&
      profile.onboarding_completed &&
      !profile.onboarding_integrations_done &&
      location.pathname !== '/onboarding' &&
      location.pathname !== '/integrations'
    ) {
      // Redirecionar diretamente para o Hub de Integrações completo
      console.log('[App] Primeiro acesso pós-onboarding → Redirecionando para Hub de Integrações');
      window.location.hash = '#/integrations?first_access=true';
    }
  }, [profile, location.pathname]);

  const handleIntegrationModalClose = () => {
    setShowIntegrationModal(false);
    refreshProfile(); // Atualizar profile para refletir o novo estado
  };

  // Hide sidebar on onboarding page
  const showSidebar = location.pathname !== '/onboarding';

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-[#0A0F1A] text-gray-900 dark:text-gray-100 font-sans overflow-hidden">
      {showSidebar && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="h-full flex flex-col"
          >
            <Routes location={location}>
              {/* Root redirect - checks Supabase for onboarding status */}
              <Route path="/" element={<RootRedirect />} />

              {/* Onboarding flow */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Main dashboard (after onboarding) */}
              <Route path="/home" element={<Dashboard />} />

              {/* All other modules */}
              <Route path="/crm" element={<CRM />} />
              <Route path="/lia" element={<LiaChat />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/files" element={<Files />} />
              <Route path="/automations" element={<Automations />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan" element={<Plan />} />
              <Route path="/support" element={<Support />} />
              <Route path="/stock" element={<Stock />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/logistics" element={<Logistics />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/records" element={<MedicalRecords />} />
              <Route path="/projects" element={<PlaceholderModule title="Projetos" icon="rocket_launch" />} />
              <Route path="/reports" element={<PlaceholderModule title="Relatórios" icon="bar_chart" />} />
              <Route path="/integrations" element={<Integrations />} />

              {/* Fallback - redirect to root which will check onboarding */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modal de Integrações - Primeiro Acesso */}
      <IntegrationOnboardingModal
        isOpen={showIntegrationModal}
        onClose={handleIntegrationModalClose}
        onComplete={handleIntegrationModalClose}
      />
    </div>
  );
}

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [language, setLanguage] = useState<Language>('pt');

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const t = (key: keyof typeof translations['pt']) => {
    return (translations[language] as any)[key] || key;
  };

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  if (configError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0F1A] text-white p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full mb-6 text-red-500">
          <AlertCircle size={48} />
        </div>
        <h1 className="text-2xl font-bold mb-4">Erro de Configuração</h1>
        <p className="text-gray-400 mb-8 max-w-lg leading-relaxed">
          {configError}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
        >
          <RefreshCw size={20} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <DashboardAuthProvider>
      <ThemeContext.Provider value={{ isDark, toggleTheme }}>
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
          <div className={isDark ? 'dark' : ''}>
            <Router>
              <Toaster position="top-right" />
              <Routes>
                {/* PUBLIC ROUTES (Bridge e OAuth) */}
                <Route path="/auth-bridge" element={<AuthBridge />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                {/* PROTECTED ROUTES */}
                <Route path="/*" element={
                  <DashboardAuthGuard>
                    <AppContent />
                  </DashboardAuthGuard>
                } />
              </Routes>
            </Router>
          </div>
        </LanguageContext.Provider>
      </ThemeContext.Provider>
    </DashboardAuthProvider>
  );
};

export default App;
