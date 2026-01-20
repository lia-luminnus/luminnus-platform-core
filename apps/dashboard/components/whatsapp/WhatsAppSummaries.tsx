import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WhatsAppSummaries: React.FC = () => {
    const [selectedSummary, setSelectedSummary] = useState<any>(null);

    const summaries = [
        {
            id: 1,
            name: 'Wendell Oliveira',
            phone: '+55 11 98888-7777',
            status: 'waiting_human',
            type: 'operational',
            date: 'Hoje, 14:20',
            snippet: 'Cliente buscou informações de preço e demonstrou urgência...',
            text: `**Resumo Profissional (Operacional)**\n\n- **Contexto**: Cliente entrou em contato para saber sobre preços e planos após ver anúncio.\n- **Necessidade / Dor**: Buscando otimização de custos no frete e integração com ERP externo.\n- **Status atual**: Aguardando retorno humano para negociação de volume.\n- **Ações realizadas**: LIA enviou catálogo PDF e explicou sobre o plano Pro.\n- **Pendências**: Wendell ficou de enviar a planilha de volumetria (Prazo: 24h).\n- **Alertas / Riscos**: Já utiliza concorrente e busca funcionalidade específica de rota.\n- **Próxima melhor ação**: Cobrar a planilha amanhã às 10h.`
        },
        {
            id: 2,
            name: 'Kathyrn Murphy',
            phone: '+55 41 97777-6666',
            status: 'resolved',
            type: 'executive',
            date: 'Ontem, 09:15',
            snippet: 'Caso resolvido. Cliente migrou para o plano Pro com sucesso.',
            text: `**Resumo Profissional (Executivo)**\n\nKathyrn Murphy solicitou upgrade para o plano Pro para utilizar o módulo de Prontuários Médicos. \n\n**Pontos Chave:**\n1. Atendimento ágil (menos de 5 min).\n2. Dúvida técnica sobre LGPD sanada.\n3. Upgrade confirmado e fatura emitida.\n\n**Status final**: Resolvido.`
        }
    ];

    return (
        <div className="flex h-full bg-gray-50 dark:bg-[#0A0F1A] overflow-hidden">
            {/* C1) Lista de Resumos (Feed) */}
            <div className="w-[400px] lg:w-[450px] border-r border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-black/20">
                <div className="p-6 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black tracking-tighter uppercase">Feed de Resumos</h3>
                        <div className="flex h-8 w-8 rounded-full bg-brand-primary/10 items-center justify-center text-brand-primary">
                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <select className="bg-gray-100 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-brand-primary">
                            <option>Todos os Status</option>
                            <option>Novos</option>
                            <option>Resolvidos</option>
                        </select>
                        <select className="bg-gray-100 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-brand-primary">
                            <option>Operacional</option>
                            <option>Executivo</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                    {summaries.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setSelectedSummary(item)}
                            className={`p-5 rounded-3xl border transition-all cursor-pointer group relative ${selectedSummary?.id === item.id
                                    ? 'bg-brand-primary border-brand-primary shadow-xl shadow-brand-primary/20 text-white scale-[1.02]'
                                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 hover:border-brand-primary/30'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm tracking-tight">{item.name}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${selectedSummary?.id === item.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'
                                        }`}>
                                        {item.status}
                                    </span>
                                </div>
                                <span className={`text-[9px] font-bold ${selectedSummary?.id === item.id ? 'text-white/60' : 'text-gray-400'}`}>
                                    {item.date}
                                </span>
                            </div>
                            <p className={`text-xs leading-relaxed line-clamp-2 ${selectedSummary?.id === item.id ? 'text-white/80' : 'text-gray-500 font-medium'}`}>
                                {item.snippet}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <span className={`material-symbols-outlined text-xs ${selectedSummary?.id === item.id ? 'text-white' : 'text-brand-primary'}`}>
                                    {item.type === 'operational' ? 'engineering' : 'leaderboard'}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Resumo {item.type}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* C2) Visual do Resumo Principal */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                <AnimatePresence mode="wait">
                    {selectedSummary ? (
                        <motion.div
                            key={selectedSummary.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="max-w-3xl mx-auto space-y-8 pb-20"
                        >
                            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-black text-2xl border border-brand-primary/20">
                                        {selectedSummary.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight mb-1">{selectedSummary.name}</h2>
                                        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">{selectedSummary.phone}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 hover:text-brand-primary transition-all shadow-sm">
                                        <span className="material-symbols-outlined">content_copy</span>
                                    </button>
                                    <button className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-400 hover:text-brand-primary transition-all shadow-sm">
                                        <span className="material-symbols-outlined">volume_up</span>
                                    </button>
                                    <button className="px-6 py-3 bg-brand-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all">
                                        Abrir Conversa
                                    </button>
                                </div>
                            </div>

                            <div className="glass-panel bg-white dark:bg-white/5 p-10 rounded-[40px] border border-gray-200 dark:border-white/10 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <span className="material-symbols-outlined text-9xl">format_quote</span>
                                </div>

                                <div className="relative z-10 prose dark:prose-invert prose-brand max-w-none">
                                    {selectedSummary.text.split('\n').map((line: string, i: number) => {
                                        if (line.startsWith('- **')) {
                                            const [label, content] = line.substring(2).split('**: ');
                                            return (
                                                <div key={i} className="mb-6 last:mb-0">
                                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-primary mb-1">{label}</span>
                                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200 leading-relaxed m-0">{content}</p>
                                                </div>
                                            );
                                        }
                                        if (line.startsWith('**')) return <h3 className="text-2xl font-black mb-10 tracking-tight text-gray-900 dark:text-white" key={i}>{line.replace(/\*\*/g, '')}</h3>;
                                        return <p key={i} className="text-gray-600 dark:text-gray-400 mb-4">{line}</p>;
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-bold text-gray-400 justify-center uppercase tracking-widest italic border-t border-gray-100 dark:border-white/5 pt-8">
                                <span className="material-symbols-outlined text-sm">history</span>
                                Gerado pela LIA via Agent Intelligence v5.0
                            </div>
                        </motion.div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-12">
                            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-5xl">description</span>
                            </div>
                            <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Selecione um resumo</h3>
                            <p className="text-xs font-medium max-w-xs">Clique em algum cartão da lista à esquerda para carregar a visão estruturada do atendimento.</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default WhatsAppSummaries;
