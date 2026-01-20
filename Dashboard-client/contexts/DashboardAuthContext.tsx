import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, configError } from '../lib/supabase';
import { getOrCreateProfile, UserProfile } from '../services/profileService';
import { useAppStore } from '../store/useAppStore';
import { UpdateService, UpdateAvailableEvent } from '../components/lia/services/geminiLiveService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    plan: any | null;
    loading: boolean;
    initialized: boolean;
    profile: UserProfile | null;
    onboardingCompleted: boolean;
    refreshProfile: (initialUser?: User | null, forceRefresh?: boolean) => Promise<void>;
    signOut: () => Promise<void>;
    setPlanName: (name: 'Start' | 'Plus' | 'Pro') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DashboardAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [plan, setPlan] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [showUpdateBanner, setShowUpdateBanner] = useState(false);
    const [newVersion, setNewVersion] = useState('');

    const localOnboardingCompleted = useAppStore((state) => state.onboarding_completed);
    const onboardingCompleted = localOnboardingCompleted || profile?.onboarding_completed || false;

    // v3.2: Semáforo + TTL para evitar chamadas concorrentes e permitir refresh legítimo
    const isRefreshingProfileRef = React.useRef(false);
    const lastProfileUserIdRef = React.useRef<string | null>(null);
    const lastProfileFetchTimeRef = React.useRef<number>(0);
    const PROFILE_TTL_MS = 60000; // 1 minuto - permite refresh se passou mais de 1 min

    const refreshProfile = async (initialUser?: User | null, forceRefresh = false) => {
        // Evitar chamadas concorrentes
        if (isRefreshingProfileRef.current) {
            console.log('[DashboardAuth] refreshProfile já em andamento, ignorando chamada duplicada');
            return;
        }

        console.log('[DashboardAuth] Iniciando refreshProfile...');
        if (!supabase) {
            console.warn('[DashboardAuth] Supabase não disponível no refreshProfile');
            return;
        }

        try {
            isRefreshingProfileRef.current = true;

            let currentUser = initialUser;
            if (!currentUser) {
                const { data: userData } = await supabase.auth.getUser();
                currentUser = userData?.user;
            }
            if (!currentUser) {
                console.log('[DashboardAuth] Sem usuário para carregar perfil');
                setProfile(null);
                return;
            }

            // v3.2: Evitar re-fetch se o mesmo usuário já foi processado E TTL ainda válido
            const now = Date.now();
            const ttlExpired = (now - lastProfileFetchTimeRef.current) > PROFILE_TTL_MS;

            if (!forceRefresh && lastProfileUserIdRef.current === currentUser.id && !ttlExpired) {
                console.log('[DashboardAuth] Perfil já carregado para este usuário (cache válido), pulando');
                return;
            }

            console.log('[DashboardAuth] Carregando perfil do banco...', { forceRefresh, ttlExpired });

            const profilePromise = getOrCreateProfile(currentUser.id, currentUser.email || '');
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 30000)
            );

            let userProfile;
            try {
                userProfile = await Promise.race([profilePromise, timeoutPromise]) as UserProfile;
                console.log('[DashboardAuth] Perfil carregado com sucesso');
                lastProfileUserIdRef.current = currentUser.id;
                lastProfileFetchTimeRef.current = Date.now();
            } catch (pErr: any) {
                console.error('[DashboardAuth] Erro ou Timeout ao carregar perfil:', pErr.message);
                userProfile = {
                    id: currentUser.id,
                    email: currentUser.email || '',
                    onboarding_completed: localOnboardingCompleted
                } as any;
            }

            setProfile(userProfile);

            const metadata = currentUser.app_metadata || {};
            const userPlanName = (metadata.plan || metadata.claims?.plan || "Start") as string;
            const isAdmin = currentUser.email === "luminnus.lia.ai@gmail.com";

            setPlan((prev: any) => {
                if (isAdmin && prev?.name) return prev;
                const effectivePlan = isAdmin ? "Pro" : userPlanName;
                return {
                    name: effectivePlan,
                    id: effectivePlan.toLowerCase() + "-plan"
                };
            });

            console.log('[DashboardAuth] Perfil e Plano inicializados');
        } catch (error) {
            console.error('[DashboardAuth] Erro fatal no refreshProfile:', error);
        } finally {
            isRefreshingProfileRef.current = false;
        }
    };

    const setPlanName = (name: 'Start' | 'Plus' | 'Pro') => {
        setPlan({
            name: name,
            id: name.toLowerCase() + "-plan"
        });
        console.log('[DashboardAuth] Plano alterado manualmente para:', name);
    };

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            setInitialized(true);
            return;
        }

        // ============================================================
        // 🔐 GLOBAL SESSION SYNC - Captura tokens de qualquer rota!
        // ============================================================
        const extractAndSyncTokens = async () => {
            try {
                const fullUrl = window.location.href;
                const hash = window.location.hash;
                const search = window.location.search;

                // Log completo para diagnóstico
                const hasTokenInHash = hash.includes('access_token=');
                const hasTokenInSearch = search.includes('access_token=');
                console.log('[AuthContext] 🔍 Analisando URL para tokens:', {
                    fullUrlLen: fullUrl.length,
                    hashLen: hash.length,
                    hasTokenInHash,
                    hasTokenInSearch,
                    hashPreview: hash.length > 100 ? hash.substring(0, 100) + '...' : hash
                });

                let accessToken: string | null = null;
                let refreshToken: string | null = null;
                let adminAccess = false;

                // Método 1: HashRouter com query após a rota (ex: /#/integrations?access_token=...)
                // O hash pode ser: #/integrations?access_token=xxx&refresh_token=yyy
                if (hash.includes('access_token=')) {
                    // Encontrar a parte da query dentro do hash
                    const queryStart = hash.indexOf('?');
                    if (queryStart !== -1) {
                        const queryString = hash.substring(queryStart + 1);
                        const params = new URLSearchParams(queryString);
                        accessToken = params.get('access_token');
                        refreshToken = params.get('refresh_token');
                        adminAccess = params.get('admin_access') === 'true';
                        console.log('[AuthContext] 📌 Tokens extraídos do hash (método 1):', {
                            hasAccess: !!accessToken,
                            hasRefresh: !!refreshToken,
                            accessLen: accessToken?.length
                        });
                    }
                }

                // Método 2: Query string normal (ex: ?access_token=...)
                if (!accessToken && search.includes('access_token')) {
                    const params = new URLSearchParams(search);
                    accessToken = params.get('access_token');
                    refreshToken = params.get('refresh_token');
                    adminAccess = params.get('admin_access') === 'true';
                    console.log('[AuthContext] 📌 Tokens extraídos do search (método 2)');
                }

                // Método 3: Fragmento hash puro do Supabase (ex: #access_token=...)
                if (!accessToken && hash.startsWith('#access_token=')) {
                    const params = new URLSearchParams(hash.substring(1));
                    accessToken = params.get('access_token');
                    refreshToken = params.get('refresh_token');
                    console.log('[AuthContext] 📌 Tokens extraídos do fragmento puro (método 3)');
                }

                if (accessToken && accessToken.length > 100) {
                    console.log('[AuthContext] 🔐 Tokens válidos detectados! Sincronizando sessão...');

                    // Tentar setSession, mas não bloquear se falhar
                    try {
                        const { data, error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken || ''
                        });

                        if (error) {
                            console.error('[AuthContext] ❌ setSession falhou:', error.message);
                            // Não bloquear - continuar com getSession() depois
                        } else {
                            console.log('[AuthContext] ✅ Sessão sincronizada com sucesso!', { userId: data.session?.user?.id });

                            // Limpar tokens da URL para segurança
                            const basePath = hash.split('?')[0] || '#/';
                            window.history.replaceState({}, document.title, window.location.pathname + basePath);

                            if (adminAccess) {
                                console.log('[AuthContext] Admin access detectado.');
                                localStorage.setItem('force_onboarding_reset', 'true');
                            }
                            return data.session;
                        }
                    } catch (setSessionErr) {
                        console.error('[AuthContext] ❌ Exceção em setSession:', setSessionErr);
                    }
                } else if (accessToken) {
                    console.warn('[AuthContext] ⚠️ Token encontrado mas muito curto:', accessToken.length);
                }
            } catch (err) {
                console.error('[AuthContext] Erro na extração global de tokens:', err);
            }
            return null;
        };

        const initializeAuth = async () => {
            console.log('[AuthContext] 🏁 Iniciando inicialização de autenticação...');

            // 1. URL Sync
            const syncedSession = await extractAndSyncTokens();

            // 2. Auth State Listener
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
                console.log(`[AuthContext] 🔔 AuthEvent: ${event}`, {
                    hasSession: !!currentSession,
                    userId: currentSession?.user?.id
                });

                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
                    if (currentSession) {
                        setSession(currentSession);
                        setUser(currentSession.user);
                        await refreshProfile(currentSession.user);
                    }
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setPlan(null);
                    // v3.2: Reset cache refs para permitir novo fetch no próximo login
                    lastProfileUserIdRef.current = null;
                    lastProfileFetchTimeRef.current = 0;
                }
            });

            // 3. Get Current Session (as fallback or to confirm)
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            let initialSession = syncedSession || currentSession;

            console.log('[AuthContext] 🧬 Sessão inicial determinada:', {
                source: syncedSession ? 'URL' : (initialSession ? 'Storage' : 'None'),
                userId: initialSession?.user?.id
            });

            if (initialSession?.user) {
                console.log('[AuthContext] ✅ Sessão ativa confirmada. Garantindo sincronização de estado...');
                setSession(initialSession);
                setUser(initialSession.user);
                await refreshProfile(initialSession.user);

                if (localStorage.getItem('force_onboarding_reset') === 'true') {
                    localStorage.removeItem('force_onboarding_reset');
                    // IMPORTANTE: Realmente resetar o onboarding no store!
                    useAppStore.getState().resetOnboarding();
                    console.log('[AuthContext] ✅ Onboarding reset executado com sucesso!');
                }
            } else {
                console.log('[AuthContext] ℹ️ Nenhuma sessão ativa encontrada no início.');
            }

            console.log('[AuthContext] 🏁 Inicialização concluída.', {
                initializedUser: !!initialSession?.user
            });

            setLoading(false);
            setInitialized(true);
            (window as any).__authSubscription = subscription;
        };

        initializeAuth();

        return () => {
            const sub = (window as any).__authSubscription;
            if (sub) sub.unsubscribe();
        };
    }, []);

    useEffect(() => {
        console.log('🔄 [Dashboard-UpdateService] Iniciando monitoramento...');
        UpdateService.initialize({
            currentVersion: '4.0.0',
            apiUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000',
        });

        const unbindUpdate = UpdateService.onUpdateAvailable((event: UpdateAvailableEvent) => {
            console.log('✨ [Dashboard-Update] Nova versão detectada:', event.newVersion);
            setNewVersion(event.newVersion);
            setShowUpdateBanner(true);
        });

        UpdateService.startPolling(120000);

        return () => {
            unbindUpdate();
            UpdateService.stopPolling();
        };
    }, []);

    const signOut = async () => {
        console.log('[DashboardAuth] Iniciando logout...');
        try {
            // Limpa explicitamente as chaves
            localStorage.removeItem('sb-dashboard-auth');

            if (supabase) await supabase.auth.signOut();

            // Limpa estados
            setProfile(null);
            setUser(null);
            setSession(null);
            setPlan(null);

            console.log('[DashboardAuth] Logout concluído.');

            // Opcional: Redirecionar para o site principal após logout no dashboard
            // window.location.href = 'http://localhost:8080/';
        } catch (err) {
            console.error('[DashboardAuth] Erro ao deslogar:', err);
            localStorage.removeItem('sb-dashboard-auth');
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            plan,
            loading,
            initialized,
            profile,
            onboardingCompleted,
            refreshProfile,
            signOut,
            setPlanName
        }}>
            {children}
            {showUpdateBanner && (
                <UpdateBanner
                    version={newVersion}
                    onClose={() => setShowUpdateBanner(false)}
                    onUpdate={() => UpdateService.forceUpdate()}
                />
            )}
        </AuthContext.Provider>
    );
};

function UpdateBanner({ version, onClose, onUpdate }: { version: string; onClose: () => void; onUpdate: () => void }) {
    return (
        <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center gap-4 max-w-sm">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                </div>
                <div className="flex-1">
                    <h4 className="text-white font-semibold text-sm">Atualização disponível!</h4>
                    <p className="text-slate-400 text-xs mt-1">Versão {version} pronta para uso.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onUpdate}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                    >
                        Atualizar
                    </button>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white text-[10px] uppercase font-bold text-center"
                    >
                        Depois
                    </button>
                </div>
            </div>
        </div>
    );
}

export const useDashboardAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useDashboardAuth must be used within DashboardAuthProvider');
    return context;
};
