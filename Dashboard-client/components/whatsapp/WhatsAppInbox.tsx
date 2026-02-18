import React, { useState, useEffect, useCallback } from 'react';
import { backendService } from '../lia/services/backendService';
import { socketService } from '../lia/services/socketService';

interface WhatsAppInboxProps {
    activeLeadId?: string | null;
}

const WhatsAppInbox: React.FC<WhatsAppInboxProps> = ({ activeLeadId }) => {
    const [selectedConv, setSelectedConv] = useState<any>(null);
    const [copilotMode, setCopilotMode] = useState(false);
    const [filter, setFilter] = useState(() => localStorage.getItem('whatsapp_inbox_filter') || 'Todos');
    const [search, setSearch] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [conversations, setConversations] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Auto-seleção de lead quando activeLeadId muda
    useEffect(() => {
        if (activeLeadId && conversations.length > 0) {
            const leadConv = conversations.find(c => c.id === activeLeadId || c.contact?.id === activeLeadId || c.external_id === activeLeadId);
            if (leadConv) {
                setSelectedConv(leadConv);
            }
        }
    }, [activeLeadId, conversations]);

    const loadConversations = useCallback(async () => {
        const data = await backendService.listWhatsAppConversations();
        setConversations(data || []);
        setLoading(false);
    }, []);

    const loadMessages = useCallback(async (convId: string) => {
        const result = await backendService.getWhatsAppConversation(convId);
        if (result) {
            setMessages(result.messages || []);
            setSelectedConv(result.conversation);
            setCopilotMode(result.conversation.copiloto_enabled || false);
        }
    }, []);

    useEffect(() => {
        loadConversations();

        // Escutar eventos via Socket
        const socket = socketService.getSocket();
        if (socket) {
            const handleEvent = (event: any) => {
                console.log('📬 [Inbox] Evento recebido:', event);
                // Se for nova mensagem e for da conversa ativa, atualiza mensagens
                if (event.type === 'message_received' || event.type === 'message_sent') {
                    if (event.conversationId === selectedConv?.id) {
                        loadMessages(event.conversationId);
                    }
                    // Sempre atualiza a lista de conversas para mostrar a última msg
                    loadConversations();
                }
            };

            socket.on('whatsapp:event', handleEvent);
            return () => { socket.off('whatsapp:event', handleEvent); };
        }
    }, [loadConversations, loadMessages, selectedConv?.id]);

    useEffect(() => {
        if (selectedConv?.id) {
            loadMessages(selectedConv.id);
        }
    }, [selectedConv?.id, loadMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConv) return;

        const to = selectedConv.contact?.phone || selectedConv.external_id;
        const msgText = newMessage;
        setNewMessage('');

        const success = await backendService.sendWhatsAppMessage(to, msgText, selectedConv.id);
        if (success) {
            // A mensagem será atualizada via socket ou reload
            loadMessages(selectedConv.id);
        } else {
            alert('Erro ao enviar mensagem.');
        }
    };

    const handleToggleCopilot = async () => {
        if (!selectedConv) return;
        const newMode = !copilotMode;
        setCopilotMode(newMode);
        const success = await backendService.toggleWhatsAppCopilot(selectedConv.id, newMode);
        if (!success) {
            setCopilotMode(!newMode);
            alert('Erro ao alterar modo.');
        }
    };

    const filteredConversations = conversations.filter(c => {
        const status = c.copiloto_enabled ? 'IA' : 'Humano';
        const matchesFilter = filter === 'Todos' || status === filter;
        const name = c.contact?.name || c.external_id || '';
        const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || c.external_id?.includes(search);
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="flex h-full bg-[#f1f5f9] dark:bg-[#06080f] overflow-hidden">
            {/* B1) Lista de Conversas */}
            <div className="w-72 lg:w-80 border-r border-gray-300 dark:border-white/10 flex flex-col bg-slate-50 dark:bg-black/20">
                <div className="p-4 border-b border-gray-200 dark:border-white/10 space-y-4">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar conversa..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all text-gray-900 dark:text-white"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['Todos', 'Humano', 'IA'].map((f) => (
                            <button
                                key={f}
                                onClick={() => {
                                    setFilter(f);
                                    localStorage.setItem('whatsapp_inbox_filter', f);
                                }}
                                className={`px-3 py-1.5 rounded-full border transition-all text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${filter === f
                                    ? 'bg-brand-primary border-brand-primary text-white'
                                    : 'bg-white dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-500 hover:border-brand-primary/50'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center opacity-50 text-[10px] font-black uppercase tracking-widest">Carregando...</div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedConv(conv)}
                                className={`p-3 flex gap-3 cursor-pointer hover:bg-white dark:hover:bg-white/5 transition-all border-b border-gray-200 dark:border-white/5 relative ${selectedConv?.id === conv.id ? 'bg-white dark:bg-white/10 shadow-md ring-1 ring-brand-primary/10' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex-shrink-0 flex items-center justify-center text-brand-primary font-bold overflow-hidden text-sm uppercase">
                                    {(conv.contact?.name || conv.external_id || 'U').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="font-bold text-xs truncate">{conv.contact?.name || conv.external_id}</h4>
                                        <span className="text-[9px] font-bold text-gray-400">
                                            {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 truncate font-medium">{conv.metadata?.last_message_preview || 'Sem mensagens'}</p>
                                </div>
                                {conv.unread_count > 0 && (
                                    <div className="absolute right-4 bottom-4 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] font-black text-white">
                                        {conv.unread_count}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* B2) Painel da Conversa */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#080b12]">
                {selectedConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-3 border-b border-gray-300 dark:border-white/10 flex items-center justify-between bg-white dark:bg-white/5 shadow-sm z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary font-black text-xs uppercase">
                                    {(selectedConv.contact?.name || selectedConv.external_id || 'U').charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xs">{selectedConv.contact?.name || selectedConv.external_id}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{selectedConv.copiloto_enabled ? 'Modo IA Ativo' : 'Atendimento Humano'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${copilotMode ? 'text-brand-primary' : 'text-gray-400'}`}>Modo Inteligente (LIA)</span>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={copilotMode}
                                            onChange={handleToggleCopilot}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                                    </div>
                                </label>
                                <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-2"></div>
                                <button
                                    onClick={() => alert('Gerando resumo da conversa...')}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-brand-primary"
                                >
                                    <span className="material-symbols-outlined text-sm">summarize</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Deseja realmente encerrar esta conversa e bloquear o contato?')) {
                                            alert('Conversa encerrada e contato bloqueado.');
                                        }
                                    }}
                                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-red-500"
                                >
                                    <span className="material-symbols-outlined text-sm">person_off</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[url('https://wweb.dev/assets/whatsapp-wallpaper-dark.png')] bg-fixed dark:bg-opacity-[0.03] bg-opacity-[0.02]">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm text-sm relative group ${msg.direction === 'inbound'
                                        ? 'bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-transparent'
                                        : 'bg-brand-primary text-white rounded-tr-none'
                                        }`}>
                                        {msg.body_text}
                                        <div className={`text-[9px] mt-1 font-bold uppercase opacity-50 text-right`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Composer */}
                        <div className="p-3 border-t border-gray-300 dark:border-white/10 bg-white dark:bg-[#0A0F1A] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                            <form
                                onSubmit={handleSendMessage}
                                className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl p-1.5 border border-gray-300 dark:border-white/10 shadow-inner"
                            >
                                <button
                                    type="button"
                                    onClick={() => alert('Abrindo seletor de arquivos...')}
                                    className="p-1.5 text-gray-400 hover:text-brand-primary transition-all"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                                <input
                                    type="text"
                                    placeholder="Escreva sua resposta..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1 bg-transparent border-none outline-none text-xs font-medium px-1.5"
                                />
                                <button type="submit" className="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:scale-110 active:scale-95 transition-all">
                                    <span className="material-symbols-outlined text-lg">send</span>
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                        <div className="w-32 h-32 rounded-full bg-brand-primary/10 flex items-center justify-center mb-8">
                            <span className="material-symbols-outlined text-6xl text-brand-primary">chat_bubble</span>
                        </div>
                        <h3 className="text-xl font-black mb-2 tracking-tighter uppercase">Nenhuma conversa selecionada</h3>
                        <p className="text-sm font-medium max-w-xs">Selecione um cliente ao lado para visualizar o histórico e operar com o Agente LIA.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsAppInbox;
