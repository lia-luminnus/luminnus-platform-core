import React from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const ROLES_INFO = [
    {
        role: 'Admin',
        description: 'Acesso total ao sistema, faturamento e configurações.',
        icon: 'diamond',
        color: 'text-brand-primary'
    },
    {
        role: 'Gestor',
        description: 'Pode gerenciar membros, CRM e aprovar orçamentos.',
        icon: 'manage_accounts',
        color: 'text-blue-500'
    },
    {
        role: 'Contador',
        description: 'Acesso restrito ao módulo Financeiro e Relatórios.',
        icon: 'account_balance',
        color: 'text-green-500'
    },
    {
        role: 'Atendente / Recepcionista',
        description: 'Gerencia Agenda, Prontuários básicos e CRM (Apenas visualização financeira).',
        icon: 'support_agent',
        color: 'text-orange-500'
    },
    {
        role: 'Developer',
        description: 'Acesso a LIA Automations e Integrações (Webhooks).',
        icon: 'code',
        color: 'text-cyan-500'
    },
    {
        role: 'Marketing',
        description: 'Acesso aos módulos de CRM, Relatórios e Ferramentas Sociais.',
        icon: 'campaign',
        color: 'text-pink-500'
    }
];

export const ManageRolesModal: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-white dark:bg-[#0A0F1A] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-gray-100 dark:border-white/10 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="relative p-6 border-b border-gray-100 dark:border-white/10 shrink-0">
                    <div className="pr-8">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-primary">policy</span>
                            Funções e Permissões
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Conheça o que cada perfil pode acessar dentro da Plataforma Luminnus.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-xl transition-colors bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="p-4 bg-brand-primary/10 rounded-xl border border-brand-primary/20 mb-6 flex items-start gap-3">
                        <span className="material-symbols-outlined text-brand-primary">info</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            Atualmente as permissões de acesso são gerenciadas automaticamente pela Inteligência (LIA Governor) com base no cargo definido. Futuras atualizações permitirão controle granular (RBAC).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ROLES_INFO.map((info, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex gap-4 items-start">
                                <div className={`p-3 rounded-lg bg-white dark:bg-black/20 shadow-sm ${info.color}`}>
                                    <span className="material-symbols-outlined">{info.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-1">{info.role}</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">{info.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};
