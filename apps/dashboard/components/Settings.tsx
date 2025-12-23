
import React, { useContext, useState, useEffect } from 'react';
import Header from './Header';
import { ThemeContext, LanguageContext, Language } from '../App';
import { useAppStore } from '../store/useAppStore';
import { MODULE_REGISTRY } from '../config/modules';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const businessSectors = [
  { id: 'technical_services', title: 'Serviços Técnicos', icon: 'build' },
  { id: 'liberal_professionals', title: 'Profissionais Liberais', icon: 'gavel' },
  { id: 'health_wellness', title: 'Saúde & Bem-Estar', icon: 'monitor_heart' },
  { id: 'real_estate', title: 'Imobiliária & Construção', icon: 'apartment' },
  { id: 'retail', title: 'Comércio & Lojas', icon: 'storefront' },
  { id: 'logistics', title: 'Transporte & Logística', icon: 'local_shipping' },
  { id: 'tech', title: 'Tecnologia & Software', icon: 'terminal' },
  { id: 'creative', title: 'Conteúdo & Criativos', icon: 'palette' },
  { id: 'other', title: 'Outros', icon: 'auto_awesome' },
];

const Settings: React.FC = () => {
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const { activeModules, toggleModule, setBusinessInfo, businessType, resetOnboarding } = useAppStore();
  
  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [activeTab, setActiveTab] = useState<'general' | 'modules' | 'sector'>('general');

  useEffect(() => {
    setSelectedLang(language);
  }, [language]);

  const handleSave = () => {
    setLanguage(selectedLang);
    toast.success(t('saved'));
  };

  const handleReset = () => {
      if(confirm("Deseja realmente resetar o onboarding? Suas preferências atuais serão perdidas.")) {
          resetOnboarding();
          window.location.href = "/";
      }
  }

  const handleSectorChange = (id: string, title: string) => {
      setBusinessInfo(id, title);
      toast.success(`Ramo alterado para: ${title}. Seus módulos foram atualizados.`);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-bg">
      <Header title={t('configTitle')} />
      
      {/* Abas com Animação Profissional */}
      <div className="px-8 pt-4 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0F1A]">
          <div className="flex gap-8">
              {[
                { id: 'general', label: t('appearance'), icon: 'palette' },
                { id: 'sector', label: 'Ramo de Atuação', icon: 'category' },
                { id: 'modules', label: 'Módulos & Apps', icon: 'extension' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${
                    activeTab === tab.id ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.span 
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-primary rounded-t-full shadow-[0_-4px_10px_rgba(139,92,246,0.5)]"
                    />
                  )}
                </button>
              ))}
          </div>
      </div>

      <div className="flex-1 p-8 pt-6 overflow-y-auto max-w-5xl mx-auto w-full scroll-smooth">
         <AnimatePresence mode="wait">
           {activeTab === 'general' && (
               <motion.div 
                  key="general"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
               >
                  <div className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl hover-lift">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-black mb-1 tracking-tight">{t('theme')}</h3>
                            <p className="text-sm text-gray-500 font-medium">Defina como o Luminnus deve aparecer para você.</p>
                        </div>
                        <div className="flex gap-2 bg-gray-100 dark:bg-black/30 p-1.5 rounded-2xl shadow-inner">
                            <button 
                                onClick={() => !isDark && toggleTheme()}
                                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isDark ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-800'}`}
                            >
                                {t('darkMode')}
                            </button>
                            <button 
                                onClick={() => isDark && toggleTheme()}
                                className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isDark ? 'bg-brand-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                {t('lightMode')}
                            </button>
                        </div>
                      </div>
                  </div>

                  <div className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl hover-lift">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-xl font-black mb-1 tracking-tight">{t('language')}</h3>
                            <p className="text-sm text-gray-500 font-medium">{t('chooseLanguage')}</p>
                        </div>
                        <select 
                            value={selectedLang}
                            onChange={(e) => setSelectedLang(e.target.value as Language)}
                            className="bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-3 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all cursor-pointer"
                        >
                            <option value="en">English (US)</option>
                            <option value="pt">Português (BR)</option>
                            <option value="es">Español</option>
                        </select>
                      </div>
                  </div>

                  <div className="glass-panel bg-white dark:bg-white/5 rounded-3xl p-8 border border-gray-200 dark:border-white/10 shadow-xl hover-lift border-red-500/10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div>
                              <h3 className="text-xl font-black mb-1 tracking-tight text-red-500">Zerar Preferências</h3>
                              <p className="text-sm text-gray-500 font-medium">Voltar para o estado inicial de boas-vindas.</p>
                          </div>
                          <button onClick={handleReset} className="px-8 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-500/5">
                              Reiniciar
                          </button>
                      </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-10">
                      <button 
                          onClick={handleSave}
                          className="px-12 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-brand-primary/30 active:scale-95"
                      >
                          {t('saveChanges')}
                      </button>
                  </div>
               </motion.div>
           )}

           {activeTab === 'sector' && (
               <motion.div 
                  key="sector"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-6"
               >
                  <div className="mb-8">
                     <h3 className="text-2xl font-black tracking-tight mb-2">Seu Ramo de Atuação</h3>
                     <p className="text-gray-500 font-medium">Mude sua profissão para que a LIA ajuste as ferramentas automaticamente.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {businessSectors.map((sector) => {
                          const isCurrent = businessType === sector.id;
                          return (
                              <button
                                  key={sector.id}
                                  onClick={() => handleSectorChange(sector.id, sector.title)}
                                  className={`p-6 rounded-3xl border text-left premium-transition flex items-center gap-4 group hover-lift ${
                                      isCurrent 
                                      ? 'bg-brand-primary border-brand-primary shadow-2xl shadow-brand-primary/20 text-white' 
                                      : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-brand-primary/40'
                                  }`}
                              >
                                  <div className={`p-4 rounded-2xl flex-shrink-0 transition-transform group-hover:rotate-6 ${isCurrent ? 'bg-white/20' : 'bg-gray-100 dark:bg-white/10 text-brand-primary'}`}>
                                      <span className="material-symbols-outlined text-3xl">{sector.icon}</span>
                                  </div>
                                  <div>
                                      <h4 className="font-black text-sm uppercase tracking-wider">{sector.title}</h4>
                                      <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isCurrent ? 'text-white/60' : 'text-gray-400'}`}>
                                          {isCurrent ? 'Ativo Agora' : 'Clique para Escolher'}
                                      </p>
                                  </div>
                                  {isCurrent && <span className="material-symbols-outlined ml-auto text-white">check_circle</span>}
                              </button>
                          );
                      })}
                  </div>
               </motion.div>
           )}

           {activeTab === 'modules' && (
               <motion.div 
                  key="modules"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
               >
                  <div className="mb-8">
                     <h3 className="text-2xl font-black tracking-tight mb-2">Painel de Módulos</h3>
                     <p className="text-gray-500 font-medium">Ative ou oculte as abas da sua barra lateral.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-in">
                      {Object.values(MODULE_REGISTRY).filter(m => !m.isCore).map((module) => {
                          const isActive = activeModules.includes(module.id);
                          return (
                              <div key={module.id} className="glass-panel bg-white dark:bg-white/5 p-6 rounded-3xl flex items-center justify-between border border-gray-200 dark:border-white/10 shadow-sm hover:border-brand-primary/30 premium-transition">
                                  <div className="flex items-center gap-4">
                                      <div className={`p-3 rounded-2xl premium-transition ${isActive ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110' : 'bg-gray-100 dark:bg-white/10 text-gray-400'}`}>
                                          <span className="material-symbols-outlined">{module.icon}</span>
                                      </div>
                                      <div>
                                          <h4 className="font-black text-sm uppercase tracking-tight">{t(module.translationKey as any)}</h4>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Módulo {isActive ? 'Ativo' : 'Oculto'}</p>
                                      </div>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer group">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={isActive}
                                        onChange={() => toggleModule(module.id)}
                                    />
                                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary shadow-inner"></div>
                                </label>
                              </div>
                          )
                      })}
                  </div>
               </motion.div>
           )}
         </AnimatePresence>
      </div>
    </div>
  );
};

export default Settings;
