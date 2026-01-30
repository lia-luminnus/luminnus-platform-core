
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, Sparkles, ChevronRight, AlertCircle, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLIA } from './LIAContext';

interface LiaFloatingChatProps {
    tenantId: string;
}

const LiaFloatingChat: React.FC<LiaFloatingChatProps> = ({ tenantId }) => {
    const lia = useLIA();
    const navigate = useNavigate();
    
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [showPrompt, setShowPrompt] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Sincronizar com o histórico de chat da LIA (mente única)
    const activeConvId = lia.activeConversationIdByMode['chat'];
    const chatHistory = useMemo(() => {
        if (!activeConvId) return [];
        return lia.getMessagesForScope(activeConvId);
    }, [lia.messagesByScope, activeConvId]);

    const isLoading = lia.isTyping || lia.isThinking;

    // Scroll suave para o fim do chat
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isOpen, isLoading]);

    // Lógica de alerta dinâmico proativo
    const activeInsight = useMemo(() => {
        if (lia.urgentAlerts.length > 0) {
            return {
                text: lia.urgentAlerts[0].alert_message,
                type: 'alert',
                icon: <AlertCircle className="w-3 h-3 text-red-500" />
            };
        }
        if (lia.suggestions.length > 0) {
            return {
                text: lia.suggestions[0].title,
                type: 'suggestion',
                icon: <Sparkles className="w-3 h-3 text-brand-primary" />
            };
        }
        return {
            text: "Como posso ajudar você hoje?",
            type: 'default',
            icon: <ChevronRight className="w-3 h-3 text-brand-primary" />
        };
    }, [lia.urgentAlerts, lia.suggestions]);

    useEffect(() => {
        const handleOpenChat = (e: any) => {
            const anomaly = e.detail;
            setIsOpen(true);
            if (anomaly) {
                // Injetar contexto de anomalia se necessário (opcional pois a LIA já deve estar ciente)
                console.log('🔔 [FloatingChat] Anomalia recebida:', anomaly);
            }
        };

        window.addEventListener('lia-open-chat', handleOpenChat);
        return () => window.removeEventListener('lia-open-chat', handleOpenChat);
    }, []);

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;
        const userMsg = message.trim();
        setMessage('');
        
        try {
            await lia.sendTextMessage(userMsg, 'chat');
        } catch (err) {
            console.error('Chat error:', err);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="mb-4 w-80 sm:w-96 h-[500px] bg-white dark:bg-[#0D111C] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-brand-primary text-white flex items-center justify-between">
                            <div
                                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => navigate('/lia')}
                            >
                                <div className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-white/10 shrink-0">
                                    <img src="/images/lia-bust.png" alt="LIA" className="w-full h-full object-cover scale-150 transform translate-y-1" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold tracking-tight text-sm">LIA</span>
                                    <span className="text-[10px] text-white/70 uppercase font-black">Mente Única Ativa</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => {
                                        lia.refreshOperationalAwareness();
                                        setIsOpen(false);
                                    }} 
                                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-transparent custom-scrollbar">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                    <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles className="w-8 h-8 text-brand-primary" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Consciência Operacional</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Estou monitorando seu negócio. Pergunte-me qualquer coisa sobre vendas, tarefas ou métricas.
                                    </p>
                                </div>
                            )}
                            
                            {chatHistory.map((chat, idx) => (
                                <div key={chat.id || idx} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${chat.type === 'user'
                                        ? 'bg-brand-primary text-white rounded-tr-none'
                                        : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                                        }`}>
                                        {chat.content}
                                    </div>
                                </div>
                            ))}
                            
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-2xl rounded-tl-none">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0D111C]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Digite sua dúvida..."
                                    className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!message.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all shadow-md"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Float Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setShowPrompt(false);
                }}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden border-2 ${isOpen
                    ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white border-white/20'
                    : 'bg-brand-primary text-white border-brand-primary/50'
                    }`}
            >
                {isOpen ? (
                    <X className="w-7 h-7" />
                ) : (
                    <img
                        src="/images/lia-bust.png"
                        alt="LIA"
                        className="w-full h-full object-cover scale-[1.3] transform translate-y-1"
                    />
                )}
                {!isOpen && (lia.urgentAlerts.length > 0 || lia.suggestions.length > 0) && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${lia.urgentAlerts.length > 0 ? 'bg-red-500' : 'bg-brand-primary'}`}></span>
                        <span className={`relative inline-flex rounded-full h-5 w-5 border-2 border-white dark:border-[#0D111C] items-center justify-center text-[10px] font-bold text-white ${lia.urgentAlerts.length > 0 ? 'bg-red-500' : 'bg-brand-primary'}`}>
                            {lia.urgentAlerts.length > 0 ? <Bell className="w-3 h-3" /> : (lia.suggestions.length + lia.urgentAlerts.length)}
                        </span>
                    </span>
                )}
            </motion.button>

            {/* Context Prompt (Dynamic Insight Bubble) */}
            <AnimatePresence>
                {!isOpen && showPrompt && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`absolute right-20 bottom-3 px-4 py-2 bg-white dark:bg-[#0D111C] rounded-xl shadow-xl border ${activeInsight.type === 'alert' ? 'border-red-500/50' : 'border-gray-200 dark:border-white/10'} hidden sm:flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors`}
                        onClick={() => {
                            setIsOpen(true);
                            setShowPrompt(false);
                        }}
                    >
                        {activeInsight.icon}
                        <span className={`text-xs font-bold ${activeInsight.type === 'alert' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                            {activeInsight.text}
                        </span>
                        <ChevronRight className="w-3 h-3 text-brand-primary" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowPrompt(false);
                            }}
                            className="ml-1 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X className="w-3 h-3 text-gray-400" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiaFloatingChat;
