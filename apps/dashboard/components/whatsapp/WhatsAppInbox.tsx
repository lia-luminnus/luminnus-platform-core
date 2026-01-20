import React, { useState } from 'react';

const WhatsAppInbox: React.FC = () => {
    const [selectedConv, setSelectedConv] = useState<any>(null);
    const [copilotMode, setCopilotMode] = useState(true);

    const conversations = [
        { id: 1, name: 'Wendell Oliveira', phone: '+55 11 98888-7777', lastMsg: 'Qual o valor da mensalidade?', status: 'waiting_human', time: '14:20', unread: 2 },
        { id: 2, name: 'Kathyrn Murphy', phone: '+55 41 97777-6666', lastMsg: 'Vou enviar o comprovante agora.', status: 'agent', time: 'Ontem', unread: 0 },
        { id: 3, name: 'Robert Fox', phone: '+55 21 96666-5555', lastMsg: 'Obrigado pelo atendimento!', status: 'resolved', time: 'Segunda', unread: 0 },
    ];

    const messages = [
        { id: 1, role: 'user', type: 'text', content: 'Bom dia, gostaria de saber sobre os planos.', time: '10:00' },
        { id: 2, role: 'agent', type: 'text', content: 'Olá! Sou a LIA, assistente virtual. Temos os planos Start, Plus e Pro. Qual seu ramo de atuação?', time: '10:01' },
        { id: 3, role: 'user', type: 'text', content: 'Sou da área de logística.', time: '10:05' },
        { id: 4, role: 'agent', type: 'text', content: 'Perfeito! Para logística, o plano Plus é o mais indicado pois inclui módulos de estoque e frota. Deseja ver os valores?', time: '10:06' },
        { id: 5, role: 'user', type: 'text', content: 'Sim, por favor.', time: '10:10' },
    ];

    return (
        <div className="flex h-full bg-white dark:bg-[#0A0F1A] overflow-hidden">
            {/* B1) Lista de Conversas */}
            <div className="w-80 lg:w-96 border-r border-gray-200 dark:border-white/10 flex flex-col bg-gray-50/50 dark:bg-black/20">
                <div className="p-4 border-b border-gray-200 dark:border-white/10 space-y-4">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Buscar conversa..."
                            className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/50 transition-all"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {['Todos', 'Aguardando', 'IA'].map((f) => (
                            <button key={f} className="px-4 py-1.5 rounded-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:border-brand-primary transition-all">
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => setSelectedConv(conv)}
                            className={`p-4 flex gap-4 cursor-pointer hover:bg-white dark:hover:bg-white/5 transition-all border-b border-gray-100 dark:border-white/5 relative ${selectedConv?.id === conv.id ? 'bg-white dark:bg-white/10 shadow-sm' : ''}`}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex-shrink-0 flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                                {conv.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h4 className="font-bold text-sm truncate">{conv.name}</h4>
                                    <span className="text-[10px] font-bold text-gray-400">{conv.time}</span>
                                </div>
                                <p className="text-xs text-gray-500 truncate font-medium">{conv.lastMsg}</p>
                            </div>
                            {conv.unread > 0 && (
                                <div className="absolute right-4 bottom-4 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] font-black text-white">
                                    {conv.unread}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* B2) Painel da Conversa */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#0D111C]">
                {selectedConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary font-black">
                                    {selectedConv.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{selectedConv.name}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedConv.status}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${copilotMode ? 'text-brand-primary' : 'text-gray-400'}`}>Modo Copiloto</span>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={copilotMode}
                                            onChange={() => setCopilotMode(!copilotMode)}
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                                    </div>
                                </label>
                                <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-2"></div>
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-brand-primary">
                                    <span className="material-symbols-outlined">summarize</span>
                                </button>
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-red-500">
                                    <span className="material-symbols-outlined">person_off</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-[url('https://wweb.dev/assets/whatsapp-wallpaper-dark.png')] bg-opacity-5 dark:bg-opacity-10">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[70%] p-4 rounded-2xl shadow-sm text-sm relative group ${msg.role === 'user'
                                            ? 'bg-white dark:bg-[#1A1F2E] text-gray-800 dark:text-gray-200 rounded-tl-none'
                                            : 'bg-brand-primary text-white rounded-tr-none'
                                        }`}>
                                        {msg.content}
                                        <div className={`text-[9px] mt-1 font-bold uppercase opacity-50 text-right`}>
                                            {msg.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Composer */}
                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#0A0F1A]">
                            <div className="flex items-center gap-4 bg-white dark:bg-white/5 rounded-2xl p-2 border border-gray-200 dark:border-white/10 shadow-inner">
                                <button className="p-2 text-gray-400 hover:text-brand-primary transition-all">
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                                <input
                                    type="text"
                                    placeholder="Escreva sua resposta..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium px-2"
                                />
                                <button className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:scale-110 active:scale-95 transition-all">
                                    <span className="material-symbols-outlined text-xl">send</span>
                                </button>
                            </div>
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
