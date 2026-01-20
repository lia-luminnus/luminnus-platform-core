import React, { useState } from 'react';
import { motion } from 'framer-motion';

const WhatsAppConfig: React.FC = () => {
    const [config, setConfig] = useState({
        objective: 'vendas',
        tone: 'consultivo',
        language: 'pt-BR',
        handoffRules: {
            sensitiveWords: true,
            angryCustomer: true,
            legalRequest: true
        }
    });

    return (
        <div className="p-8 h-full overflow-y-auto max-w-5xl mx-auto w-full space-y-8 no-scrollbar pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* A1) Perfil do Agente */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-brand-primary">person_search</span>
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-500">Perfil do Agente</h4>
                    </div>

                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Objetivo do Canal</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                value={config.objective}
                                onChange={(e) => setConfig({ ...config, objective: e.target.value })}
                            >
                                <option value="vendas">Vendas</option>
                                <option value="suporte">Suporte</option>
                                <option value="agendamento">Agendamento</option>
                                <option value="financeiro">Financeiro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Tom de Voz</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                                value={config.tone}
                                onChange={(e) => setConfig({ ...config, tone: e.target.value })}
                            >
                                <option value="consultivo">Consultivo</option>
                                <option value="formal">Formal</option>
                                <option value="direto">Direto</option>
                                <option value="leve">Leve / Descontraído</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* A2) Handoff Rules */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-brand-primary">hail</span>
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-500">Regras de Handoff</h4>
                    </div>

                    <div className="glass-panel bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 space-y-4">
                        {[
                            { id: 'sensitiveWords', label: 'Palavras Sensíveis' },
                            { id: 'angryCustomer', label: 'Cliente Irritado (Sentimento)' },
                            { id: 'legalRequest', label: 'Pedido Jurídico / Reclamação' }
                        ].map((rule) => (
                            <label key={rule.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer group">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-brand-primary transition-colors">{rule.label}</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* A3) Playbooks - MVP Preview */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-brand-primary">auto_stories</span>
                        <h4 className="font-black text-sm uppercase tracking-widest text-gray-500">Playbooks Operacionais</h4>
                    </div>
                    <button className="text-xs font-black text-brand-primary hover:underline uppercase tracking-tighter">Restaurar Templates</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {['Qualificação Lead', 'Suporte Técnico', 'Agendamento'].map((playbook) => (
                        <div key={playbook} className="glass-panel bg-white dark:bg-white/10 p-5 rounded-3xl border border-dashed border-gray-300 dark:border-white/20 hover:border-brand-primary/50 transition-all group cursor-pointer">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-gray-400 group-hover:text-brand-primary">edit_note</span>
                            </div>
                            <h5 className="font-bold text-sm mb-1">{playbook}</h5>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Clique para editar</p>
                        </div>
                    ))}
                    <button className="flex flex-col items-center justify-center p-5 rounded-3xl border border-dashed border-gray-300 dark:border-white/20 hover:bg-brand-primary/5 text-gray-400 hover:text-brand-primary transition-all">
                        <span className="material-symbols-outlined text-3xl mb-2">add_circle</span>
                        <span className="font-bold text-xs uppercase tracking-widest">Novo Playbook</span>
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 border-t border-gray-200 dark:border-white/10 pt-8">
                <button className="px-10 py-4 bg-brand-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all">
                    Salvar Alterações
                </button>
            </div>
        </div>
    );
};

export default WhatsAppConfig;
