
import React, { useContext } from 'react';
import { ThemeContext, LanguageContext } from '../App';

const Header: React.FC<{ title?: string }> = ({ title }) => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);

  const handleAction = (action: string) => {
    alert(`${t('featureComingSoon')} (${action})`);
  };

  return (
    <header className="h-20 px-8 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {title || t('helloUser')}
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
            className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-2.5 w-80 focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm transition-all shadow-sm"
          />
        </div>

        {/* Plan Badge */}
        <div className="hidden lg:flex items-center gap-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-xl text-sm shadow-sm">
          <span className="text-gray-500 dark:text-gray-300">{t('planLabel')} <strong className="text-gray-800 dark:text-white">Pro</strong></span>
          <button 
            onClick={() => handleAction(t('upgrade'))}
            className="ml-2 text-xs font-semibold py-1 px-3 rounded-lg bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white hover:opacity-90 transition-opacity"
          >
            {t('upgrade')}
          </button>
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

        {/* Profile */}
        <div className="flex items-center gap-3">
           <button onClick={() => handleAction('Profile')} className="focus:outline-none">
             <img 
               src="https://picsum.photos/seed/kathryn/200" 
               alt="User" 
               className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700 object-cover hover:border-brand-primary transition-colors"
             />
           </button>
           {/* LIA Magic Button */}
           <button 
             onClick={() => handleAction('LIA Assistant')}
             className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform lia-glow"
           >
             <span className="material-symbols-outlined">auto_awesome</span>
           </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
