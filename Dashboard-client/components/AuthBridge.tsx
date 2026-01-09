import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, configError } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

const AuthBridge: React.FC = () => {
    const navigate = useNavigate();
    const { resetOnboarding } = useAppStore();
    const [error, setError] = useState<string | null>(configError);
    const [status, setStatus] = useState('Capturando token...');
    const syncStarted = useRef(false);

    useEffect(() => {
        if (syncStarted.current) return;

        const syncSession = async () => {
            console.log('[AuthBridge] ===== Sincronizando Acesso Admin =====');

            // 1. Extração robusta de tokens (Sempre fazemos isso primeiro)
            const extractParams = () => {
                const hash = window.location.hash;
                const queryString = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
                const urlParams = new URLSearchParams(queryString || window.location.search);

                return {
                    access: urlParams.get('access_token'),
                    refresh: urlParams.get('refresh_token'),
                    adminAccess: urlParams.get('admin_access') === 'true'
                };
            };

            const { access: accessToken, refresh: refreshToken, adminAccess } = extractParams();

            // 2. Se vier do admin, forçamos o reset IMEDIATO do onboarding
            // Fazemos isso antes do check de erro para garantir que o estado local mude
            if (adminAccess) {
                console.log('[AuthBridge] Flag admin_access detectada. Resetando onboarding local...');
                resetOnboarding();
            }

            // 3. Agora verificamos erros de configuração
            if (configError || !supabase) {
                console.error('[AuthBridge] Erro de configuração:', configError || 'Supabase não inicializado');
                setError(configError || 'Configuração do Supabase incompleta.');
                syncStarted.current = true;

                // Se for admin e falhou a config, redirecionamos para o dashboard (mock) 
                // após 3s para que ele veja o onboarding que acabamos de resetar.
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

            setStatus('Sincronizando com Supabase...');

            try {
                const { data, error: syncError } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });

                if (syncError) throw syncError;
                if (!data?.session) throw new Error('Falha ao criar sessão.');

                console.log('[AuthBridge] ✓ Sessão sincronizada para:', data.session.user?.email);
                setStatus('Pronto! Entrando...');

                // Pequeno delay para garantir que o estado do AuthContext atualize
                setTimeout(() => {
                    navigate('/', { replace: true });
                }, 500);

            } catch (err: any) {
                console.error('[AuthBridge] Falha na sincronização:', err.message);
                setError(`Erro ao sincronizar sessão: ${err.message}`);

                // Em caso de erro, tenta ir para o dashboard mesmo assim em 2s
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
            <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-gray-400 font-medium animate-pulse">{status}</p>
            <div className="mt-8 flex items-center gap-2 text-[10px] text-white/20 font-mono tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-ping"></span>
                LIA Auth Bridge v1.0
            </div>
        </div>
    );
};

export default AuthBridge;
