// ======================================================================
// 🌟 LUMINNUS LOADING - Animação futurista com logo
// ======================================================================
// Exibe logo animado da Luminnus com mensagens rotativas
// Usado no Dynamic Content Area e Live Mode
// ======================================================================

import React, { useState, useEffect } from 'react';

// Mensagens rotativas
const LOADING_MESSAGES = [
    'Lia Thinking',
    'Lia Generating',
    'Analisando',
    'Criando',
    'Processando',
];

interface LuminnusLoadingProps {
    message?: string;
    className?: string;
}

export function LuminnusLoading({ message, className = '' }: LuminnusLoadingProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [dots, setDots] = useState('');

    // Rotacionar mensagens
    useEffect(() => {
        if (message) return; // Se mensagem fixa, não rotacionar

        const interval = setInterval(() => {
            setCurrentMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [message]);

    // Animar pontos
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 400);

        return () => clearInterval(interval);
    }, []);

    const displayMessage = message || LOADING_MESSAGES[currentMessageIndex];

    return (
        <div className={`flex flex-col items-center justify-center ${className}`}>
            {/* Logo Container com animações */}
            <div className="relative">
                {/* Glow pulsante de fundo */}
                <div className="absolute inset-0 blur-xl opacity-50 animate-pulse">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                        <defs>
                            <linearGradient id="logoGradientGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#00f3ff" />
                                <stop offset="50%" stopColor="#bc13fe" />
                                <stop offset="100%" stopColor="#00ff88" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points="50,5 95,75 75,75 50,35 25,75 5,75"
                            fill="url(#logoGradientGlow)"
                        />
                    </svg>
                </div>

                {/* Logo principal com animação de rotação */}
                <div className="relative animate-logo-pulse">
                    <svg viewBox="0 0 100 100" className="w-24 h-24">
                        <defs>
                            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4DA8DA">
                                    <animate attributeName="stop-color"
                                        values="#4DA8DA;#bc13fe;#00ff88;#4DA8DA"
                                        dur="3s" repeatCount="indefinite" />
                                </stop>
                                <stop offset="50%" stopColor="#bc13fe">
                                    <animate attributeName="stop-color"
                                        values="#bc13fe;#00ff88;#4DA8DA;#bc13fe"
                                        dur="3s" repeatCount="indefinite" />
                                </stop>
                                <stop offset="100%" stopColor="#00ff88">
                                    <animate attributeName="stop-color"
                                        values="#00ff88;#4DA8DA;#bc13fe;#00ff88"
                                        dur="3s" repeatCount="indefinite" />
                                </stop>
                            </linearGradient>
                        </defs>

                        {/* Forma do logo Luminnus (L estilizado) */}
                        <polygon
                            points="50,5 95,75 75,75 50,35 25,75 5,75"
                            fill="url(#logoGradient)"
                            className="drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                        />
                    </svg>
                </div>

                {/* Círculos orbitando */}
                <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#00f3ff] rounded-full shadow-[0_0_10px_#00f3ff]" />
                </div>
                <div className="absolute inset-0 animate-spin-reverse">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#bc13fe] rounded-full shadow-[0_0_10px_#bc13fe]" />
                </div>
            </div>

            {/* Mensagem de loading */}
            <div className="mt-6 text-center">
                <p className="text-lg font-medium bg-gradient-to-r from-[#00f3ff] via-[#bc13fe] to-[#00ff88] bg-clip-text text-transparent animate-gradient">
                    {displayMessage}
                    <span className="inline-block w-8 text-left">{dots}</span>
                </p>

                {/* Barra de progresso animada */}
                <div className="mt-3 w-48 h-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-[#00f3ff] via-[#bc13fe] to-[#00ff88] rounded-full animate-loading-bar"
                    />
                </div>
            </div>

            {/* Estilos de animação */}
            <style>{`
        @keyframes logo-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animate-logo-pulse {
          animation: logo-pulse 2s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 3s linear infinite;
        }
        
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out infinite;
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
        </div>
    );
}

// Versão compacta para usar em botões ou áreas pequenas
export function LuminnusLoadingSmall({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className="relative w-5 h-5">
                <svg viewBox="0 0 100 100" className="w-full h-full animate-pulse">
                    <defs>
                        <linearGradient id="logoGradientSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#00f3ff" />
                            <stop offset="100%" stopColor="#bc13fe" />
                        </linearGradient>
                    </defs>
                    <polygon
                        points="50,5 95,75 75,75 50,35 25,75 5,75"
                        fill="url(#logoGradientSmall)"
                    />
                </svg>
            </div>
            <span className="text-sm text-[#00f3ff]">Processando...</span>
        </div>
    );
}
