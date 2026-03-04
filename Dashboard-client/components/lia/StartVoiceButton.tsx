/**
 * ✅ StartVoiceButton - Botão para ativar/desativar Gemini Live
 * Com gate de plano: Chamada por Voz disponível apenas a partir do Plus
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLIA } from './LIAContext';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { Radio, Mic, MicOff, Square, Lock, X, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface StartVoiceButtonProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    variant?: 'default' | 'icon';
}

const PLAN_LEVELS: Record<string, number> = {
    'start': 1,
    'plus': 2,
    'pro': 3,
};

export function StartVoiceButton({
    size = 'md',
    className = '',
    variant = 'default'
}: StartVoiceButtonProps) {
    const {
        isLiveActive,
        isListening,
        startLiveMode,
        stopLiveMode,
        isConnected,
        activeConversationIdByMode,
        createConversation
    } = useLIA();

    const { plan, profile } = useDashboardAuth();
    const navigate = useNavigate();
    const [showUpgradePopover, setShowUpgradePopover] = useState(false);

    // Check plan level
    const getUserPlanLevel = (): number => {
        const contextPlanName = plan?.name?.toLowerCase();
        if (contextPlanName && PLAN_LEVELS[contextPlanName]) return PLAN_LEVELS[contextPlanName];
        const profilePlanType = (profile as any)?.plan_type?.toLowerCase();
        if (profilePlanType && PLAN_LEVELS[profilePlanType]) return PLAN_LEVELS[profilePlanType];
        return 1; // Default: Start
    };

    const userPlanLevel = getUserPlanLevel();
    const hasVoiceAccess = userPlanLevel >= PLAN_LEVELS['plus'];

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };

    const handleToggle = async () => {
        // Plan gate: show upgrade popover for Start plan users
        if (!hasVoiceAccess) {
            setShowUpgradePopover(true);
            return;
        }

        if (isLiveActive) {
            await stopLiveMode();
        } else {
            const activeMode = 'multimodal';
            if (!activeConversationIdByMode[activeMode]) {
                console.log('🆕 [StartVoiceButton] Criando conversa automaticamente para modo:', activeMode);
                await createConversation(activeMode);
            }
            await startLiveMode();
        }
    };

    // Estilos base do botão
    const baseStyles = `
        transition-all font-medium whitespace-nowrap relative
        ${isLiveActive
            ? 'bg-[rgba(255,0,255,0.2)] border border-[#ff00ff] text-[#ff00ff] shadow-[0_0_10px_rgba(255,0,255,0.3)]'
            : !hasVoiceAccess
                ? 'bg-white/5 border border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                : 'bg-[rgba(0,243,255,0.1)] border-2 border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.8)] hover:text-[#00f3ff] hover:border-[#00f3ff]'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'icon' ? 'p-3 rounded-xl flex items-center justify-center' : `rounded-lg ${sizeClasses[size]}`}
        ${className}
    `;

    return (
        <>
            <button
                onClick={handleToggle}
                disabled={!isConnected && !isLiveActive && hasVoiceAccess}
                className={baseStyles}
                title={!hasVoiceAccess ? 'Chamada por Voz — Disponível no Plano Plus' : isLiveActive ? 'Parar conversa por voz' : 'Iniciar conversa por voz (Gemini Live)'}
            >
                {isLiveActive ? (
                    variant === 'icon' ? (
                        <div className="relative">
                            <Square className="w-5 h-5 fill-current" />
                            {isListening && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ff00ff] rounded-full animate-ping" />
                            )}
                        </div>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            Ouvindo... 🔇
                            {isListening && (
                                <span className="inline-block w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-ping" />
                            )}
                        </span>
                    )
                ) : (
                    variant === 'icon' ? (
                        <div className="relative">
                            <Radio className="w-5 h-5" />
                            {!hasVoiceAccess && (
                                <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-yellow-500" />
                            )}
                        </div>
                    ) : (
                        <span className="flex items-center gap-1.5">
                            Falar 🗣️
                            {!hasVoiceAccess && <Lock className="w-3 h-3 text-yellow-500" />}
                        </span>
                    )
                )}
            </button>

            {/* Upgrade Popover */}
            <AnimatePresence>
                {showUpgradePopover && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setShowUpgradePopover(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0D111C] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-[60px]" />
                            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px]" />

                            {/* Close */}
                            <button
                                onClick={() => setShowUpgradePopover(false)}
                                className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>

                            <div className="relative z-10 text-center">
                                {/* Icon */}
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                    <Radio className="w-8 h-8 text-indigo-400" />
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">
                                    Chamada por Voz
                                </h3>
                                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                    Converse com a LIA usando sua voz em tempo real.
                                    Disponível a partir do <strong className="text-indigo-400">Plano Plus</strong>.
                                </p>

                                {/* Features */}
                                <div className="space-y-2 mb-6 text-left">
                                    {[
                                        'Conversa natural por voz',
                                        'Respostas em tempo real',
                                        'Controle hands-free'
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                            <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                                            {feat}
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <button
                                    onClick={() => {
                                        setShowUpgradePopover(false);
                                        navigate('/plan');
                                    }}
                                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-sm rounded-xl hover:from-indigo-500 hover:to-indigo-400 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    Assinar Plano Plus
                                </button>
                                <button
                                    onClick={() => setShowUpgradePopover(false)}
                                    className="w-full mt-2 px-6 py-2 text-gray-500 text-xs font-medium hover:text-gray-300 transition-colors"
                                >
                                    Agora não
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
