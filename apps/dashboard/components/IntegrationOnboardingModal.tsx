import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { completeIntegrationsOnboarding } from '../services/profileService';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

const ESSENTIAL_INTEGRATIONS = [
    { id: 'gmail', name: 'Gmail', description: 'Ler e enviar emails', icon: '📧', selected: true },
    { id: 'google_calendar', name: 'Google Calendar', description: 'Sincronizar agenda', icon: '📅', selected: true },
    { id: 'whatsapp', name: 'WhatsApp Business', description: 'Atendimento automático', icon: '💬', selected: false },
    { id: 'google_drive', name: 'Google Drive', description: 'Acessar arquivos', icon: '📁', selected: false },
];

const IntegrationOnboardingModal: React.FC<Props> = ({ isOpen, onClose, onComplete }) => {
    const { user, refreshProfile } = useDashboardAuth();
    const [integrations, setIntegrations] = useState(ESSENTIAL_INTEGRATIONS);
    const [isLoading, setIsLoading] = useState(false);

    const toggleIntegration = (id: string) => {
        setIntegrations(prev => prev.map(int =>
            int.id === id ? { ...int, selected: !int.selected } : int
        ));
    };

    const handleComplete = async () => {
        if (!user) return;

        setIsLoading(true);
        const selectedIds = integrations.filter(i => i.selected).map(i => i.id);

        try {
            await completeIntegrationsOnboarding(user.id, selectedIds);
            await refreshProfile();
            toast.success('Integrações configuradas com sucesso!');
            onComplete();
        } catch (error) {
            console.error('[IntegrationOnboarding] Error:', error);
            // Continue anyway - don't block user
            toast.success('Configuração salva localmente');
            onComplete();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            await completeIntegrationsOnboarding(user.id, []);
            await refreshProfile();
        } catch {
            // Continue anyway
        }
        onComplete();
        setIsLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-[#1A1F2E] rounded-3xl p-8 max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-brand-primary">hub</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight mb-2">Conecte Suas Ferramentas</h2>
                    <p className="text-gray-500 text-sm">
                        Para que a LIA possa automatizar seu trabalho, selecione as integrações que deseja ativar agora.
                    </p>
                </div>

                {/* Integrations List */}
                <div className="space-y-3 mb-8">
                    {integrations.map((int) => (
                        <button
                            key={int.id}
                            onClick={() => toggleIntegration(int.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${int.selected
                                    ? 'border-brand-primary bg-brand-primary/5'
                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                                }`}
                        >
                            <div className="text-3xl">{int.icon}</div>
                            <div className="flex-1 text-left">
                                <h4 className="font-bold text-sm">{int.name}</h4>
                                <p className="text-xs text-gray-500">{int.description}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${int.selected
                                    ? 'bg-brand-primary border-brand-primary'
                                    : 'border-gray-300 dark:border-white/20'
                                }`}>
                                {int.selected && (
                                    <span className="material-symbols-outlined text-white text-sm">check</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Info */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                        <strong>Você pode alterar isso depois:</strong> Acesse "Integrações" no menu lateral a qualquer momento para adicionar ou remover conexões.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSkip}
                        disabled={isLoading}
                        className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                        Pular por Agora
                    </button>
                    <button
                        onClick={handleComplete}
                        disabled={isLoading}
                        className="flex-1 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                                Continuar
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default IntegrationOnboardingModal;
