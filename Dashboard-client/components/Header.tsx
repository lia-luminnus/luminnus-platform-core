import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../App';
import { LanguageContext } from '../contexts/LanguageContext';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { useSubscription } from '../hooks/useSubscription';
import toast from 'react-hot-toast';

const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { user, plan, profile } = useDashboardAuth();
  const { subscription } = useSubscription();
  const navigate = useNavigate();

  // Usar subscription.plan_name do Supabase como fonte primária
  const currentPlanName = subscription?.plan_name || plan?.name || 'Start';

  const handleAction = (action: string) => {
    toast.success(`${t('featureComingSoon')} (${action})`);
  };

  // Greeting personalization: "Bem-vindo, [FullName]!"
  // More robust name detection: Profile > Metadata > Email > Guest
  const metadata = user?.user_metadata || {};
  const userName = profile?.full_name || metadata.full_name || metadata.name || user?.email?.split('@')[0] || t('user') || 'Usuário';
  const greeting = `Bem-vindo, ${userName}!`;

  return (
    <header className="h-24 px-8 flex items-center justify-between flex-shrink-0 relative z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tighter">
          {title || greeting}
        </h1>
      </div>

      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative hidden md:block group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors">
            search
          </span>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-2.5 w-80 focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm font-medium transition-all shadow-sm"
          />
        </div>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors">
          <span className="material-symbols-outlined">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* Notifications */}
        <button
          onClick={() => handleAction('Notifications')}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-colors relative"
        >
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-bg"></span>
        </button>

        <div className="h-8 w-[1px] bg-gray-200 dark:bg-white/10 mx-2" />

        {/* Profile & Settings Section */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary px-1.5 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20">
                {currentPlanName}
              </span>
              <span className="text-sm font-black text-gray-800 dark:text-white max-w-[150px] truncate tracking-tight">
                {userName}
              </span>
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-bold text-gray-400 max-w-[180px] truncate">
                {user?.email}
              </span>
              <button
                onClick={() => navigate('/settings')}
                className="text-[9px] font-black uppercase tracking-widest text-brand-primary/60 hover:text-brand-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[10px]">settings</span>
                Configurações
              </button>
            </div>
          </div>

          <button onClick={() => navigate('/settings')} className="relative group focus:outline-none">
            <img
              src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${userName}&background=8b5cf6&color=fff`}
              alt="UserProfile"
              className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-white/10 object-cover group-hover:border-brand-primary transition-all shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-[#0A0F1A] rounded-full shadow-sm"></div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
