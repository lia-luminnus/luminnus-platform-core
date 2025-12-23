
import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LanguageContext } from '../App';
import { useAppStore } from '../store/useAppStore';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { getModules } from '../config/modules';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { t } = useContext(LanguageContext);
  const { isSidebarCollapsed, toggleSidebar, activeModules } = useAppStore();
  const { signOut } = useDashboardAuth();

  const navItems = getModules(activeModules);

  return (
    <aside
      className={`${isSidebarCollapsed ? 'w-16' : 'w-20 lg:w-64'} flex-shrink-0 bg-white dark:bg-[#0D111C] border-r border-gray-200 dark:border-white/5 flex flex-col premium-transition z-20 relative`}
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
        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0 transition-transform hover:rotate-6">
          <img src="/favicon.png" alt="Luminnus" className="w-full h-full object-contain" />
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

        <button onClick={() => signOut()} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start px-4'} p-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-500 premium-transition`}>
          <span className="material-symbols-outlined">logout</span>
          {!isSidebarCollapsed && <span className="ml-3 text-sm font-bold hidden lg:block">LOGOUT</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
