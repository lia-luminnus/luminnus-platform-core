
import React, { useState, createContext, useEffect, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LIAHub from './components/lia/LIAHub';
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
import Integrations from './components/Integrations';
import Reports from './components/Reports';
import IntegrationsHub from './components/integrations/IntegrationsHub';
import WhatsAppIntegration from './components/integrations/WhatsAppIntegration';
import Onboarding from './components/Onboarding';
import AuthBridge from './components/AuthBridge';
import WhatsAppAgent from './components/WhatsAppAgent';
import Emails from './components/Emails';
import { useDashboardAuth } from './contexts/DashboardAuthContext';
import { useAppStore } from './store/useAppStore';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PlaceholderModule: React.FC<{ title: string, icon: string }> = ({ title, icon }) => {
  const { t } = React.useContext(LanguageContext);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col h-full items-center justify-center p-8 text-center"
    >
      <div className="w-32 h-32 rounded-full bg-brand-primary/10 flex items-center justify-center mb-8 animate-pulse shadow-2xl">
        <span className="material-symbols-outlined text-6xl text-brand-primary">{icon}</span>
      </div>
      <h1 className="text-4xl font-black mb-4 tracking-tighter">{title}</h1>
      <p className="text-gray-500 max-w-md font-medium">{t('eliteModuleActivated')}</p>
    </motion.div>
  );
};

import { Language, translations, LanguageContext } from './contexts/LanguageContext';




export const ThemeContext = createContext({
  isDark: true,
  toggleTheme: () => { },
});



const DashboardProvider = lazy(() =>
  import('./components/dashboard-engine').then(m => ({ default: m.DashboardProvider }))
);

const AppContent: React.FC = () => {
  const { t } = React.useContext(LanguageContext);
  const { user, onboardingCompleted, loading, initialized, plan: authPlan } = useDashboardAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { resetOnboarding, planType: storePlanType } = useAppStore();
  const [updateAvailable, setUpdateAvailable] = useState<{ version?: string, force?: boolean } | null>(null);

  const tenantId = (user as any)?.user_metadata?.tenant_id || (user as any)?.tenant_id || localStorage.getItem('tenant_id') || '00000000-0000-0000-0000-000000000001';
  const userPlan = (authPlan?.name?.toLowerCase() as 'start' | 'plus' | 'pro') || (storePlanType?.toLowerCase() as 'start' | 'plus' | 'pro') || 'pro';

  useEffect(() => {
    const handleUpdate = (e: any) => {
      setUpdateAvailable(e.detail);
    };
    window.addEventListener('lia-system-update' as any, handleUpdate);
    return () => window.removeEventListener('lia-system-update' as any, handleUpdate);
  }, []);

  // 🔑 ADMIN ACCESS DETECTION - Runs on every location/hash change
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    const hasAdminAccess = hash.includes('admin_access=true') || search.includes('admin_access=true');

    if (hasAdminAccess) {
      console.log('[App] 🔐 Admin access detectado! Forçando onboarding...');

      // Reset local store
      resetOnboarding();

      // Limpar o parâmetro da URL
      const cleanHash = hash.replace(/[?&]admin_access=true/, '').replace('?&', '?').replace(/\?$/, '');
      window.history.replaceState({}, document.title, window.location.pathname + cleanHash);

      // Reset no banco de dados - MAS preservar dados pessoais do admin!
      if (user?.id) {
        import('./lib/supabase').then(({ supabase }) => {
          if (supabase) {
            supabase
              .from('profiles')
              .update({
                onboarding_completed: false,
                segment: null,
                modules: [],
                // Preservar nome de admin se não existir
                full_name: 'Administrador Luminnus',
                plan_type: 'Pro'
              })
              .eq('id', user.id)
              .then(({ error }) => {
                if (error) {
                  console.warn('[App] Falha ao resetar onboarding:', error.code);
                } else {
                  console.log('[App] ✅ Onboarding resetado (dados admin preservados)!');
                }
              });
          }
        });
      }

      // Navegar para onboarding
      navigate('/onboarding', { replace: true });
    }
  }, [location, user?.id, resetOnboarding, navigate]);

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0F1A]">
        <div className="text-center">
          <div className="relative mb-6 mx-auto w-20 h-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary/30 to-purple-500/30 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xs">🧠</span>
            </div>
          </div>
          <p className="text-white font-medium mb-1">🚀 {t('initializing')}</p>
          <p className="text-white/50 text-sm">{t('preparingEnvironment')}</p>
        </div>
      </div>
    );
  }



  if (!onboardingCompleted && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen w-screen bg-gray-50 dark:bg-[#0A0F1A] text-gray-900 dark:text-gray-100 font-sans overflow-hidden flex-col">
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-brand-primary text-white py-2 px-4 flex items-center justify-between text-sm font-medium z-[100] shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">rocket_launch</span>
              <span>{t('updateAvailable')} {updateAvailable.version ? `(v${updateAvailable.version})` : ''}.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUpdateAvailable(null)}
                className="px-3 py-1 hover:bg-white/10 rounded-md transition-colors"
              >
                {t('later')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-white text-black px-3 py-1 rounded-md hover:bg-gray-100 transition-colors flex items-center gap-1 font-bold"
              >
                {t('updateNow')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {location.pathname !== '/onboarding' && <Sidebar />}
        <main className="flex-1 flex flex-col min-w-0 relative min-h-0">
          <Suspense fallback={<div className="flex-1" />}>
            <DashboardProvider
              tenantId={tenantId}
              plan={userPlan}
              onNavigate={(route) => navigate(route)}
              onOpenIntegration={(provider) => navigate(`/integrations?provider=${provider}`)}
            >
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
                    <Route path="/auth-bridge" element={<AuthBridge />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/crm" element={<CRM />} />
                    <Route path="/lia/*" element={<LIAHub />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/integrations/hub" element={<IntegrationsHub />} />
                    <Route path="/integrations/whatsapp" element={<WhatsAppIntegration />} />
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
                    <Route path="/whatsapp" element={<WhatsAppAgent />} />
                    <Route path="/projects" element={<PlaceholderModule title={t('projects')} icon="rocket_launch" />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/emails" element={<Emails />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </DashboardProvider>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

import { DashboardAuthProvider } from './contexts/DashboardAuthContext';
import { SubscriptionGate } from './components/SubscriptionGate';
import { LIAProvider } from './components/lia/LIAContext';

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [language, setLanguage] = useState<Language>('pt');

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const t = (key: string) => {
    return (translations[language] as any)[key] || key;
  };

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  return (
    <DashboardAuthProvider>
      <LIAProvider>
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
          <LanguageContext.Provider value={{ language, setLanguage, t }}>
            <div className={isDark ? 'dark' : ''}>
              <Router>
                <Toaster position="top-right" />
                <SubscriptionGate>
                  <AppContent />
                </SubscriptionGate>
              </Router>
            </div>
          </LanguageContext.Provider>
        </ThemeContext.Provider>
      </LIAProvider>
    </DashboardAuthProvider>
  );
};

export default App;
