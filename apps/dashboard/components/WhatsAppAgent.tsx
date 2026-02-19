import React, { useState, useContext } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import WhatsAppConfig from './whatsapp/WhatsAppConfig';
import WhatsAppInbox from './whatsapp/WhatsAppInbox';
import WhatsAppSummaries from './whatsapp/WhatsAppSummaries';
import WhatsAppConnection from './whatsapp/WhatsAppConnection';

const WhatsAppAgent: React.FC = () => {
    const { t } = useContext(LanguageContext);
    const [activeTab, setActiveTab] = useState<'connection' | 'config' | 'inbox' | 'summaries'>('connection');

    const tabs = [
        { id: 'connection', label: 'Conexão', icon: 'link' },
        { id: 'config', label: 'Configuração', icon: 'settings' },
        { id: 'inbox', label: 'Mensagens', icon: 'chat' },
        { id: 'summaries', label: 'Resumos', icon: 'description' },
    ];

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-dark-bg overflow-hidden">
            <Header title={t('whatsappAgent' as any) || 'WhatsApp (Agente)'} />

            {/* Status Header Unificado (Prompt 2.1) */}
            <div className="px-8 py-4 bg-white dark:bg-[#0D111C] border-b border-gray-200 dark:border-white/10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Conectado</span>
                    </div>
                    <p className="text-xs font-bold text-gray-400">+55 11 99999-9999</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
                        <span className="material-symbols-outlined text-sm">terminal</span>
                        Ver Logs
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-brand-primary">
                        <span className="material-symbols-outlined text-sm">api</span>
                        Testar Webhook
                    </button>
                    <button className="px-6 py-2 rounded-xl bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all">
                        Reconectar
                    </button>
                </div>
            </div>

            {/* Sub-menu Interno */}
            <div className="px-8 pt-2 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#0A0F1A]">
                <div className="flex gap-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 text-sm font-bold transition-all relative flex items-center gap-2 ${activeTab === tab.id ? 'text-brand-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                                }`}
                        >
                            <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.span
                                    layoutId="whatsappTabIndicator"
                                    className="absolute bottom-0 left-0 w-full h-[3px] bg-brand-primary rounded-t-full shadow-[0_-4px_10px_rgba(139,92,246,0.5)]"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto relative p-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {activeTab === 'connection' && <WhatsAppConnection />}
                        {activeTab === 'config' && <WhatsAppConfig />}
                        {activeTab === 'inbox' && <WhatsAppInbox />}
                        {activeTab === 'summaries' && <WhatsAppSummaries />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WhatsAppAgent;
