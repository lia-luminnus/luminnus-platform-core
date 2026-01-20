import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, configError } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

// Mensagens da LIA durante loading
const LIA_LOADING_MESSAGES = [
    '🔐 Autenticando sua sessão...',
    '🧠 LIA está preparando seu ambiente...',
    '📊 Montando seu dashboard personalizado...',
    '✨ Carregando módulos de inteligência...',
    '🚀 Finalizando configurações...',
];

const AuthBridge: React.FC = () => {
    const navigate = useNavigate();
    const { resetOnboarding } = useAppStore();
    const [error, setError] = useState<string | null>(configError);
    const [status, setStatus] = useState(LIA_LOADING_MESSAGES[0]);
    const [messageIndex, setMessageIndex] = useState(0);
    const syncStarted = useRef(false);

    // Animação de mensagens da LIA
    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prev => {
                const next = (prev + 1) % LIA_LOADING_MESSAGES.length;
                setStatus(LIA_LOADING_MESSAGES[next]);
                return next;
            });
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    const { initialized, user } = useDashboardAuth();

    useEffect(() => {
        // Se já inicializou e tem usuário, podemos ir para a home
        if (initialized && user) {
            console.log('[AuthBridge] DashboardAuthContext inicializado com sucesso. Redirecionando...');
            setStatus('✅ Pronto! Redirecionando...');
            setTimeout(() => navigate('/', { replace: true }), 500);
        }
    }, [initialized, user, navigate]);

    useEffect(() => {
        // Timeout de fallback: se demorar demais, tenta ir para a home
        const timeout = setTimeout(() => {
            if (!initialized) {
                console.warn('[AuthBridge] Timeout de inicialização detectado. Forçando carregamento...');
                navigate('/', { replace: true });
            }
        }, 10000);
        return () => clearTimeout(timeout);
    }, [initialized, navigate]);


    if (error) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0F1A] text-white p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4 animate-pulse">error</span>
                <h1 className="text-2xl font-bold mb-2">Erro de Autenticação</h1>
                <p className="text-gray-400 mb-8 max-w-md">{error}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3 bg-brand-primary text-white rounded-xl font-bold"
                >
                    Tentar Novamente
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0F1A] text-white">
            {/* Avatar da LIA animado */}
            <div className="relative mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary/30 to-purple-500/30 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center animate-pulse">
                    <span className="text-xs">🧠</span>
                </div>
            </div>

            {/* Mensagem animada */}
            <p className="text-lg font-medium text-white mb-2 transition-all duration-300">{status}</p>
            <p className="text-sm text-gray-500">LIA está preparando tudo para você</p>

            {/* Barra de progresso */}
            <div className="mt-8 w-64 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-brand-primary to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${((messageIndex + 1) / LIA_LOADING_MESSAGES.length) * 100}%` }}
                />
            </div>

            <div className="mt-8 flex items-center gap-2 text-[10px] text-white/20 font-mono tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping"></span>
                LIA Auth Bridge v2.0
            </div>
        </div>
    );
};

export default AuthBridge;
