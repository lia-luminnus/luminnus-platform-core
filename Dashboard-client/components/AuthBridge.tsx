import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, configError } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

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

    useEffect(() => {
        if (syncStarted.current) return;

        const syncSession = async () => {
            console.log('[AuthBridge] ===== Sincronizando Acesso Admin =====');

            const extractParams = () => {
                const searchParams = new URLSearchParams(window.location.search);
                const hash = window.location.hash;
                const hashSearchParams = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');

                return {
                    access: searchParams.get('access_token') || hashSearchParams.get('access_token'),
                    refresh: searchParams.get('refresh_token') || hashSearchParams.get('refresh_token'),
                    adminAccess: searchParams.get('admin_access') === 'true' || hashSearchParams.get('admin_access') === 'true'
                };
            };

            const { access: accessToken, refresh: refreshToken, adminAccess } = extractParams();

            if (adminAccess) {
                console.log('[AuthBridge] Flag admin_access detectada. Forçando reset do onboarding para teste...');
                resetOnboarding();
            }

            if (configError || !supabase) {
                console.error('[AuthBridge] Erro de configuração:', configError || 'Supabase não inicializado');
                setError(configError || 'Configuração do Supabase incompleta.');
                syncStarted.current = true;

                if (adminAccess) {
                    setTimeout(() => {
                        console.log('[AuthBridge] Redirecionando admin para modo mock...');
                        navigate('/', { replace: true });
                    }, 3000);
                }
                return;
            }

            if (syncStarted.current) return;
            syncStarted.current = true;

            if (!accessToken) {
                console.error('[AuthBridge] ERRO: access_token ausente');
                setError('Token de acesso não encontrado. Tente novamente via Admin Panel.');
                return;
            }

            try {
                const { data, error: syncError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });

                if (syncError) throw syncError;
                if (!data?.session) throw new Error('Falha ao criar sessão.');

                console.log('[AuthBridge] ✓ Sessão sincronizada para:', data.session.user?.email);
                setStatus('✅ Pronto! LIA está te levando para o dashboard...');

                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 800);

            } catch (err: any) {
                console.error('[AuthBridge] Falha na sincronização:', err.message);
                setError(`Erro ao sincronizar sessão: ${err.message}`);
                setTimeout(() => navigate('/'), 2000);
            }
        };

        syncSession();
    }, [navigate, resetOnboarding]);

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
