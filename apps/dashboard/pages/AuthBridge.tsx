import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, configError } from '../lib/supabase';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

const AuthBridge: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(configError);
    const [status, setStatus] = useState('Capturando token...');
    const syncStarted = useRef(false);

    useEffect(() => {
        if (syncStarted.current) return;
        syncStarted.current = true;

        const syncSession = async () => {
            if (configError) {
                console.error('[AuthBridge] Erro de configuração:', configError);
                return;
            }

            console.log('[AuthBridge] ===== Início da Sincronização =====');
            console.log('[AuthBridge] URL Completa:', window.location.href);

            // Robust token extraction supporting multiple URL formats
            const extractTokens = (): { access: string | null; refresh: string | null; adminAccess: boolean } => {
                // Method 1: Standard query string (?access_token=...&refresh_token=...)
                const urlParams = new URLSearchParams(window.location.search);
                let access = urlParams.get('access_token');
                let refresh = urlParams.get('refresh_token');
                let adminAccess = urlParams.get('admin_access') === 'true';

                if (access) {
                    console.log('[AuthBridge] Tokens encontrados via query string');
                    return { access, refresh, adminAccess };
                }

                // Method 2: HashRouter format (#/auth-bridge?access_token=...&refresh_token=...)
                const hash = window.location.hash;
                if (hash.includes('?')) {
                    const hashQuery = hash.substring(hash.indexOf('?') + 1);
                    const hashParams = new URLSearchParams(hashQuery);
                    access = hashParams.get('access_token');
                    refresh = hashParams.get('refresh_token');
                    adminAccess = hashParams.get('admin_access') === 'true';

                    if (access) {
                        console.log('[AuthBridge] Tokens encontrados via hash query');
                        return { access, refresh, adminAccess };
                    }
                }

                // Method 3: Double hash format (#/auth-bridge#access_token=...)
                if (hash.includes('#', 1)) {
                    const secondHash = hash.substring(hash.indexOf('#', 1) + 1);
                    const hashParams = new URLSearchParams(secondHash);
                    access = hashParams.get('access_token');
                    refresh = hashParams.get('refresh_token');
                    adminAccess = hashParams.get('admin_access') === 'true';

                    if (access) {
                        console.log('[AuthBridge] Tokens encontrados via hash duplo');
                        return { access, refresh, adminAccess };
                    }
                }

                return { access: null, refresh: null, adminAccess: false };
            };

            const { access: accessToken, refresh: refreshToken, adminAccess } = extractTokens();

            console.log('[AuthBridge] Access Token:', accessToken ? 'SIM' : 'NÃO');
            console.log('[AuthBridge] Refresh Token:', refreshToken ? 'SIM' : 'NÃO');
            console.log('[AuthBridge] Admin Access:', adminAccess ? 'SIM' : 'NÃO');

            // Salvar flag de acesso admin no sessionStorage
            if (adminAccess) {
                sessionStorage.setItem('admin_access', 'true');
                console.log('[AuthBridge] Flag admin_access salva no sessionStorage');
            }

            if (!accessToken) {
                console.error('[AuthBridge] ERRO: access_token ausente na URL');
                setError('Token de acesso não encontrado. Por favor, tente fazer login novamente.');
                return;
            }

            setStatus('Sincronizando com Supabase...');

            try {
                console.log('[AuthBridge] Chamando setSession...');

                // Set session with shorter timeout (5s)
                const sessionPromise = supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken || ''
                });

                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('setSession timed out')), 5000)
                );

                const { data, error: syncError } = await Promise.race([sessionPromise, timeoutPromise]);

                console.log('[AuthBridge] setSession retornou:', {
                    hasData: !!data,
                    hasSession: !!data?.session,
                    hasError: !!syncError
                });

                if (syncError) {
                    console.error('[AuthBridge] Erro no setSession:', syncError.message);
                    throw new Error(`Erro ao sincronizar: ${syncError.message}`);
                }

                if (!data?.session) {
                    throw new Error('Sessão não foi criada. Token pode estar expirado.');
                }

                console.log('[AuthBridge] ✓ Sessão criada para:', data.session.user?.email);
                setStatus('Sessão criada! Entrando...');

                // Navigate almost immediately after session is set
                // 300ms is enough for the state to bubble up
                setTimeout(() => {
                    console.log('[AuthBridge] Navigating to /');
                    navigate('/', { replace: true });
                }, 300);

            } catch (err: any) {
                console.error('[AuthBridge] Falha crítica:', err.message);

                // On error, navigate even faster to allow recovery via DashboardAuthContext
                setStatus('Entrando (modo recuperação)...');
                setTimeout(() => {
                    console.log('[AuthBridge] Attempting recovery navigation');
                    navigate('/', { replace: true });
                }, 800);
            }
        };

        syncSession();
    }, [navigate]);

    if (error) {
        return (
            <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0F1A] text-white p-6 text-center animate-in fade-in duration-500">
                <div className="bg-red-500/10 p-4 rounded-full mb-6">
                    <AlertCircle className="h-16 w-16 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Erro de Autenticação</h1>
                <p className="text-gray-400 mb-8 max-w-md">{error}</p>

                <button
                    onClick={() => window.location.href = 'http://localhost:8080/auth'}
                    className="flex items-center gap-3 px-8 py-3 bg-brand-primary hover:bg-brand-primary/80 text-white rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-brand-primary/20"
                >
                    <ArrowLeft className="h-5 w-5" />
                    Voltar para Login
                </button>

                <p className="mt-8 text-xs text-gray-500 font-mono">
                    Ref: AuthBridge_Sync_Error
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0F1A] text-white">
            <Loader2 className="h-12 w-12 animate-spin text-brand-primary mb-4" />
            <p className="text-gray-400 font-medium">{status}</p>
        </div>
    );
};

export default AuthBridge;
