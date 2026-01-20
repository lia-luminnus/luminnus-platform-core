
import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Sparkles, Zap, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface LiaFloatingChatProps {
    tenantId: string;
}

const LiaFloatingChat: React.FC<LiaFloatingChatProps> = ({ tenantId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'lia', content: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPrompt, setShowPrompt] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const handleOpenChat = (e: any) => {
            const anomaly = e.detail;
            setIsOpen(true);
            if (anomaly) {
                setChatHistory(prev => [...prev, {
                    role: 'lia',
                    content: `Detectei uma anomalia: "${anomaly.alert_message}". Como deseja proceder?`
                }]);
            }
        };

        window.addEventListener('lia-open-chat', handleOpenChat);
        return () => window.removeEventListener('lia-open-chat', handleOpenChat);
    }, []);

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;

        const userMsg = message.trim();
        setMessage('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/briefing/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    question: userMsg,
                    context: 'dashboard_floating_chat'
                })
            });

            if (response.ok) {
                const data = await response.json();
                setChatHistory(prev => [...prev, { role: 'lia', content: data.answer }]);
            } else {
                toast.error('Erro ao consultar a LIA');
            }
        } catch (err) {
            console.error('Chat error:', err);
            toast.error('Erro de conexão com a LIA');
        } finally {
            setIsLoading(false);
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
                                    <span className="text-[10px] text-white/70 uppercase font-black">Online agora</span>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-transparent">
                            {chatHistory.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                    <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles className="w-8 h-8 text-brand-primary" />
                                    </div>
                                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">Como posso ajudar?</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Pergunte sobre vendas, tendências ou anomalias detectadas hoje.
                                    </p>
                                </div>
                            )}
                            {chatHistory.map((chat, idx) => (
                                <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${chat.role === 'user'
                                        ? 'bg-brand-primary text-white rounded-tr-none'
                                        : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-tl-none'
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
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
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
                onClick={() => setIsOpen(!isOpen)}
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
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-brand-primary border-2 border-white dark:border-[#0D111C]"></span>
                    </span>
                )}
            </motion.button>

            {/* Context Prompt (Optional) */}
            <AnimatePresence>
                {!isOpen && showPrompt && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="absolute right-20 bottom-3 px-4 py-2 bg-white dark:bg-[#0D111C] rounded-xl shadow-xl border border-gray-200 dark:border-white/10 hidden sm:flex items-center gap-2 whitespace-nowrap cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 group"
                        onClick={() => {
                            setIsOpen(true);
                            setShowPrompt(false);
                        }}
                    >
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Resumo da análise diária pronto!</span>
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
