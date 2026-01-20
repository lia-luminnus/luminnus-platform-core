/**
 * ✅ StartVoiceButton - Botão para ativar/desativar Gemini Live
 * PARIDADE TOTAL com lia-live-view/src/components/StartVoiceButton.tsx
 * Usado em Multi-Modal Mode e Live Mode
 */

import React from 'react';
import { useLIA } from './LIAContext';

interface StartVoiceButtonProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function StartVoiceButton({ size = 'md', className = '' }: StartVoiceButtonProps) {
    const {
        isLiveActive,
        isListening,
        startLiveMode,
        stopLiveMode,
        isConnected,
        activeConversationIdByMode,
        createConversation
    } = useLIA();

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };

    const handleToggle = async () => {
        if (isLiveActive) {
            await stopLiveMode();
        } else {
            // Garantir que existe uma conversa antes de iniciar o modo de voz
            // O modo multimodal é onde o StartVoiceButton é mais usado
            const activeMode = 'multimodal';
            if (!activeConversationIdByMode[activeMode]) {
                console.log('🆕 [StartVoiceButton] Criando conversa automaticamente para modo:', activeMode);
                await createConversation(activeMode);
            }
            await startLiveMode();
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={!isConnected && !isLiveActive}
            className={`
        rounded-lg transition-all font-medium whitespace-nowrap
        ${isLiveActive
                    ? 'bg-[rgba(255,0,255,0.2)] border border-[#ff00ff] text-[#ff00ff] shadow-[0_0_10px_rgba(255,0,255,0.3)]'
                    : 'bg-[rgba(0,243,255,0.1)] border-2 border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.8)] hover:text-[#00f3ff] hover:border-[#00f3ff]'
                }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]}
        ${className}
      `}
            title={isLiveActive ? 'Parar conversa por voz' : 'Iniciar conversa por voz (Gemini Live)'}
        >
            {isLiveActive ? (
                <span className="flex items-center gap-1.5">
                    Ouvindo... 🔇
                    {isListening && (
                        <span className="inline-block w-1.5 h-1.5 bg-[#ff00ff] rounded-full animate-ping" />
                    )}
                </span>
            ) : (
                <span>Falar 🗣️</span>
            )}
        </button>
    );
}
