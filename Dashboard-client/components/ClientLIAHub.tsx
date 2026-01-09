import React from 'react';
import Header from './Header';
import { useAppStore } from '../store/useAppStore';
import { motion } from 'framer-motion';
import { useContext } from 'react';
import { LanguageContext } from '../App';

const ClientLIAHub: React.FC = () => {
    const { planType } = useAppStore();
    const { t } = useContext(LanguageContext);

    // Mapeamento de permissões por plano
    const permissions = {
        Start: ['chat'],
        Plus: ['chat', 'multimodal'],
        Pro: ['chat', 'multimodal', 'live', 'data']
    };

    const allowedModes = permissions[planType || 'Start'];

    const modes = [
        {
            id: 'chat',
            title: 'LIA Chat',
            description: 'Conversas inteligentes em texto e voz.',
            icon: 'forum',
            color: 'blue'
        },
        {
            id: 'multimodal',
            title: 'Multi-Modal',
            description: 'Análise de arquivos, imagens e criação de mídia.',
            icon: 'auto_awesome',
            color: 'purple'
        },
        {
            id: 'live',
            title: 'Live Mode',
            description: 'Interação em tempo real com avatar humanoide.',
            icon: 'videocam',
            color: 'pink'
        },
        {
            id: 'data',
            title: 'Data Insights',
            description: 'Análise profunda dos dados do seu negócio.',
            icon: 'analytics',
            color: 'emerald'
        }
    ];

    return (
        <div className="flex flex-col h-full bg-[#0A0F1A]">
            <Header title="LIA Intelligence Hub" />

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold mb-2">Bem-vindo à sua inteligência central</h1>
                        <p className="text-gray-400">
                            Seu plano atual: <span className="text-brand-primary font-bold">{planType}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {modes.map((mode) => {
                            const isAllowed = allowedModes.includes(mode.id);

                            return (
                                <motion.div
                                    key={mode.id}
                                    whileHover={isAllowed ? { y: -5, scale: 1.02 } : {}}
                                    className={`relative p-6 rounded-2xl border transition-all ${isAllowed
                                        ? 'bg-white/5 border-white/10 hover:border-brand-primary/50 cursor-pointer shadow-lg hover:shadow-brand-primary/10'
                                        : 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed grayscale'
                                        }`}
                                    onClick={() => {
                                        if (isAllowed) {
                                            // Redirecionamento real para o LIA Viva (porta 3000)
                                            // Passamos a view desejada via query param
                                            const LIA_VIVA_URL = "http://localhost:3000";
                                            window.open(`${LIA_VIVA_URL}?view=${mode.id}`, '_blank');
                                        }
                                    }}
                                >
                                    <div className={`w-12 h-12 rounded-xl bg-${mode.color}-500/20 text-${mode.color}-400 flex items-center justify-center mb-6`}>
                                        <span className="material-symbols-outlined text-3xl">{mode.icon}</span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2">{mode.title}</h3>
                                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                                        {mode.description}
                                    </p>

                                    {!isAllowed && (
                                        <div className="absolute top-4 right-4 bg-brand-primary/20 text-brand-primary text-[10px] font-bold px-2 py-1 rounded-full border border-brand-primary/30 uppercase tracking-widest">
                                            Upgrade Necessário
                                        </div>
                                    )}

                                    {isAllowed ? (
                                        <div className="flex items-center gap-2 text-brand-primary text-sm font-bold group">
                                            <span>Acessar</span>
                                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Redirecionar para upgrade
                                            }}
                                            className="text-xs text-gray-400 underline hover:text-white transition-colors"
                                        >
                                            Ver detalhes do upgrade
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* LIA Overview Banner */}
                    <div className="mt-12 rounded-3xl bg-gradient-to-br from-brand-primary/20 via-purple-900/10 to-transparent border border-brand-primary/20 p-8 flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-4">LIA: Sua assistente autônoma</h2>
                            <p className="text-gray-300 leading-relaxed mb-6">
                                A LIA não apenas responde perguntas. Ela analisa seu CRM, agenda reuniões,
                                gerencia seu estoque e prevê faturamento direto no Dashboard.
                            </p>
                            <div className="flex gap-4">
                                <button className="px-6 py-2 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity">
                                    Configurar LIA Engine
                                </button>
                                <button className="px-6 py-2 border border-white/20 text-white rounded-xl hover:bg-white/5 transition-colors">
                                    Ver documentação
                                </button>
                            </div>
                        </div>
                        <div className="w-48 h-48 rounded-2xl overflow-hidden glass-panel flex items-center justify-center relative group">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
                            <span className="material-symbols-outlined text-7xl text-brand-primary animate-pulse z-20">memory</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientLIAHub;
