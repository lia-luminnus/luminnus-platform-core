/**
 * ✅ StartVoiceButton - Botão para ativar/desativar Gemini Live
 * PARIDADE TOTAL com lia-live-view/src/components/StartVoiceButton.tsx
 * Usado em Multi-Modal Mode e Live Mode
 */

import React from 'react';
import { useLIA } from './LIAContext';
import { Radio, Mic, MicOff, Square } from 'lucide-react';

interface StartVoiceButtonProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    variant?: 'default' | 'icon';
}

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

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };

    const handleToggle = async () => {
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
        transition-all font-medium whitespace-nowrap
        ${isLiveActive
            ? 'bg-[rgba(255,0,255,0.2)] border border-[#ff00ff] text-[#ff00ff] shadow-[0_0_10px_rgba(255,0,255,0.3)]'
            : 'bg-[rgba(0,243,255,0.1)] border-2 border-[rgba(0,243,255,0.3)] text-[rgba(224,247,255,0.8)] hover:text-[#00f3ff] hover:border-[#00f3ff]'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variant === 'icon' ? 'p-3 rounded-xl flex items-center justify-center' : `rounded-lg ${sizeClasses[size]}`}
        ${className}
    `;

    return (
        <button
            onClick={handleToggle}
            disabled={!isConnected && !isLiveActive}
            className={baseStyles}
            title={isLiveActive ? 'Parar conversa por voz' : 'Iniciar conversa por voz (Gemini Live)'}
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
                    <Radio className="w-5 h-5" />
                ) : (
                    <span>Falar 🗣️</span>
                )
            )}
        </button>
    );
}
