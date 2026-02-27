
import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LanguageContext } from '../contexts/LanguageContext';
import { useAppStore } from '../store/useAppStore';
import { getModules } from '../config/modules';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../config/api';

interface ChannelStatus {
  whatsapp: boolean;
  telegram: boolean;
  web_widget: boolean;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const { isSidebarCollapsed, toggleSidebar, activeModules } = useAppStore();
  const { user, session, signOut } = useDashboardAuth();

  const [channels, setChannels] = useState<ChannelStatus>({
    whatsapp: false,
    telegram: false,
    web_widget: false,
  });

  // Em desenvolvimento, sempre volta ao admin
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Fetch integration statuses
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user?.id || !session?.access_token) return;
      try {
        const response = await fetch(`${getApiUrl()}/api/integrations`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const integrations = data.integrations || [];
          setChannels({
            whatsapp: integrations.some((i: any) => i.provider === 'whatsapp' && (i.status === 'active' || i.status === 'connected')),
            telegram: integrations.some((i: any) => i.provider === 'telegram_manager' && (i.status === 'active' || i.status === 'connected')),
            web_widget: integrations.some((i: any) => i.provider === 'web_widget' && (i.status === 'active' || i.status === 'connected')),
          });
        }
      } catch (err) {
        console.warn('[Sidebar] Erro ao buscar status dos canais:', err);
      }
    };
    fetchStatus();
    // Refresh every 60s
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [user?.id, session?.access_token]);

  const handleLogout = async () => {
    try {
      toast.loading('Saindo...', { id: 'logout' });
      // O signOut do contexto já cuida do redirecionamento correto (Admin vs User)
      await signOut();
      toast.success('Até logo!', { id: 'logout' });
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
      toast.error('Erro ao sair. Redirecionando...', { id: 'logout' });
      // Fallback de emergência caso o signOut falhe
      const isProd = import.meta.env.PROD;
      const landingPage = import.meta.env.VITE_LANDING_PAGE_URL || (isProd ? 'https://luminnus.ai' : 'http://localhost:8080');
      window.location.href = landingPage;
    }
  };

  const navItems = getModules(activeModules);

  const CHANNEL_INDICATORS = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      color: 'green',
      connected: channels.whatsapp,
      route: '/integrations/whatsapp',
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: '✈️',
      color: 'blue',
      connected: channels.telegram,
      route: '/integrations/telegram',
    },
    {
      key: 'web_widget',
      label: 'Web Widget',
      icon: '🌐',
      color: 'purple',
      connected: channels.web_widget,
      route: '/integrations/widget',
    },
  ];

  return (
    <aside
      className={`${isSidebarCollapsed ? 'w-16 min-w-[64px]' : 'w-20 lg:w-64 lg:min-w-[256px]'} flex-shrink-0 bg-white dark:bg-[#0D111C] border-r border-gray-200 dark:border-white/5 flex flex-col premium-transition z-20 relative`}
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-9 bg-white dark:bg-[#1A1F2E] border border-gray-200 dark:border-white/10 rounded-full p-1.5 text-gray-500 hover:text-brand-primary shadow-xl z-50 hidden lg:block transition-transform hover:scale-110 active:scale-90"
      >
        <span className="material-symbols-outlined text-[10px] font-bold">
          {isSidebarCollapsed ? 'arrow_forward_ios' : 'arrow_back_ios'}
        </span>
      </button>

      <div className={`h-20 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start px-6'}`}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transform transition-transform hover:rotate-6 overflow-hidden">
          <img
            src="/images/luminnus-logo.png"
            alt="Luminnus"
            className="w-full h-full object-contain"
          />
        </div>
        {!isSidebarCollapsed && (
          <span className="ml-3 font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-500 hidden lg:block">Luminnus</span>
        )}
      </div>

      <nav className="flex-1 w-full flex flex-col gap-1.5 px-3 overflow-y-auto no-scrollbar py-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const label = t ? t(item.translationKey as any) : item.id;

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-start px-4 py-3'} rounded-xl premium-transition group relative ${isActive
                ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]'
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-brand-primary'
                }`}
            >
              <span className={`material-symbols-outlined text-xl transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              {!isSidebarCollapsed && (
                <span className="ml-3 text-[13px] font-semibold hidden lg:block truncate uppercase tracking-wider">{label}</span>
              )}
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full mr-2 hidden lg:block shadow-[0_0_10px_white]"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* === INDICADORES DE CONEXÃO DOS CANAIS === */}
      <div className={`px-3 pb-2 flex flex-col gap-1 ${isSidebarCollapsed ? 'items-center' : ''}`}>
        <div className={`text-[9px] font-black uppercase tracking-[0.15em] text-gray-500/60 mb-1 ${isSidebarCollapsed ? 'hidden' : 'px-2 hidden lg:block'}`}>
          Canais
        </div>
        {CHANNEL_INDICATORS.map((ch) => (
          <button
            key={ch.key}
            onClick={() => navigate(ch.route)}
            title={`${ch.label}: ${ch.connected ? 'Conectado' : 'Desconectado'}`}
            className={`flex items-center gap-2 rounded-xl transition-all duration-200 hover:bg-white/5 ${isSidebarCollapsed
                ? 'justify-center p-2'
                : 'justify-start px-3 py-1.5 w-full'
              }`}
          >
            {/* Status Dot */}
            <div className="relative flex h-2 w-2 flex-shrink-0">
              {ch.connected && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ch.connected ? 'bg-green-400' : ''
                  }`}></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${ch.connected ? 'bg-green-500' : 'bg-red-500/70'
                }`}></span>
            </div>

            {/* Icon + Label */}
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-1.5 hidden lg:flex">
                <span className="text-xs">{ch.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${ch.connected ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                  {ch.label}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 flex flex-col gap-4 items-center w-full mt-auto">
        <div className={`flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5 ${isSidebarCollapsed ? 'justify-center' : 'justify-start w-full px-4'}`}>
          <div className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          {!isSidebarCollapsed && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest hidden lg:block">{t ? t('liaOnline') : 'LIA Online'}</span>
          )}
        </div>

        <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start px-4'} p-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500 premium-transition`}>
          <span className="material-symbols-outlined">logout</span>
          {!isSidebarCollapsed && <span className="ml-3 text-sm font-bold hidden lg:block">LOGOUT</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
