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
    isAdmin: boolean; // SSOT: Admin sempre passa pelo onboarding, cliente só 1x
    onboardingCompleted: boolean;
    refreshProfile: (initialUser?: User | null, force?: boolean) => Promise<void>;
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
    const [isAdmin, setIsAdmin] = useState(false);
    const [dismissedVersion, setDismissedVersion] = useState<string | null>(localStorage.getItem('luminnus_update_dismissed'));

    // 🔒 SSOT: Controlar se já carregamos um plano real (evitar regressão para Start)
    const planLoadedRef = React.useRef<boolean>(false);
    const refreshInProgressRef = React.useRef<boolean>(false);
    const lastPlanRef = React.useRef<{ name: string; id: string } | null>(null);

    // Verificar onboarding também no estado local (permite funcionar sem autenticação)
    const localOnboardingCompleted = useAppStore((state) => state.onboarding_completed);

    // 🔑 SSOT: Lógica de Onboarding CORRIGIDA
    // - Admin: Passa pelo onboarding UMA vez por sessão (resetado no refreshProfile)
    // - Cliente: Passa APENAS UMA VEZ na vida - respeita o banco de dados (profile) ou localStorage
    const onboardingCompleted = isAdmin
        ? localOnboardingCompleted  // Admin respeita apenas o estado local (que resetamos por sessão)
        : (profile?.onboarding_completed || localOnboardingCompleted || false);  // Cliente respeita DB

    const refreshProfile = async (initialUser?: User | null) => {
        console.log('[DashboardAuth] Iniciando refreshProfile...');

        // Evitar refresh concorrente
        if (refreshInProgressRef.current) {
            console.log('[DashboardAuth] ⏭️ Refresh já em andamento, ignorando chamada duplicada');
            return;
        }
        refreshInProgressRef.current = true;

        if (!supabase) {
            console.warn('[DashboardAuth] Supabase não disponível no refreshProfile');
            refreshInProgressRef.current = false;
            return;
        }

        try {
            let currentUser = initialUser;
            if (!currentUser) {
                const { data: userData } = await supabase.auth.getUser();
                currentUser = userData?.user;
            }

            if (!currentUser) {
                console.log('[DashboardAuth] Sem usuário para carregar perfil');
                setProfile(null);
                refreshInProgressRef.current = false;
                return;
            }

            // 🛡️ GUARDRAIL CRÍTICO (CORRIGIDO): 
            // Agora comparamos strings reais, não Promises. Isso evita o loop infinito de requests.
            if (profile && profile.id === currentUser.id) {
                console.log('[DashboardAuth] 🛑 Perfil já carregado para este usuário. Ignorando refresh.');
                refreshInProgressRef.current = false;
                return;
            }


            // ⚡ DETECÇÃO PRECOCE DE ADMIN (evita loops de onboarding)
            const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || 'luminnus.lia.ai@gmail.com';
            const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase());
            const isAdminByEmail = adminEmails.includes(currentUser.email?.toLowerCase() || '');
            if (isAdminByEmail) {
                console.log('[DashboardAuth] ⚡ Admin detectado precocemente via email');
                setIsAdmin(true);

                // Reset imediato do onboarding para admins
                const sessionKey = `admin_session_${currentUser.id}`;
                if (!sessionStorage.getItem(sessionKey)) {
                    console.log('[DashboardAuth] 🔄 Admin - Resetando onboarding (Sincronamente)');
                    useAppStore.getState().resetOnboarding();
                    sessionStorage.setItem(sessionKey, 'active');
                }
            }

            console.log('[DashboardAuth] Carregando perfil do banco...');

            let userProfile;
            let profileLoadedFromDb = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 1; // v7.1: Reduzido para 1 (cache + timeout menor = não precisa retry)

            while (attempts < MAX_ATTEMPTS && !profileLoadedFromDb) {
                attempts++;
                try {
                    console.log(`[DashboardAuth] Tentativa ${attempts}/${MAX_ATTEMPTS}...`);

                    // v7.1: Timeout reduzido para 10s (profileService já tem 8s)
                    const profilePromise = getOrCreateProfile(currentUser.id, currentUser.email || '');
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 10000)
                    );

                    userProfile = await Promise.race([profilePromise, timeoutPromise]) as UserProfile;
                    profileLoadedFromDb = true;
                    console.log('[DashboardAuth] Perfil carregado com sucesso do banco');
                } catch (pErr: any) {
                    console.warn(`[DashboardAuth] Falha na tentativa ${attempts}:`, pErr.message);

                    // Se falhou por timeout ou erro, mas já sabemos que é admin pelo email, setar flag antecipadamente
                    const isAdminByEmail = adminEmails.includes(currentUser.email?.toLowerCase() || '');
                    if (isAdminByEmail && !isAdmin) {
                        console.log('[DashboardAuth] ⚡ Admin detectado via email durante falha de carga');
                        setIsAdmin(true);
                    }

                    if (attempts >= MAX_ATTEMPTS) {
                        console.error('[DashboardAuth] Máximo de tentativas atingido. Usando fallback de resiliência.');

                        // 🔒 CRÍTICO: Respeitar o estado REAL do localStorage E cache (evitar regressão de onboarding)
                        let isCompletedLocally = localOnboardingCompleted || false;
                        let storedSegment = null;
                        let storedModules = null;
                        let storedPlan = null;

                        try {
                            // 1. Verificar localStorage (Zustand persists)
                            const storedData = localStorage.getItem('luminnus-storage');
                            if (storedData) {
                                const parsed = JSON.parse(storedData);
                                if (parsed?.state?.onboarding_completed) {
                                    isCompletedLocally = true;
                                    console.log('[DashboardAuth] ✅ Onboarding encontrado no localStorage');
                                }
                                storedSegment = parsed?.state?.businessType || null;
                                storedModules = parsed?.state?.activeModules || null;
                                storedPlan = parsed?.state?.planType || null; // v9.8: Recuperar plano do storage
                            }

                            // 2. Verificar cache de perfil (pode ter dados mais recentes que localStorage)
                            const cacheKey = `profile_cache_${currentUser.id}`;
                            const cachedProfile = localStorage.getItem(cacheKey);
                            if (cachedProfile) {
                                const { data, timestamp } = JSON.parse(cachedProfile);
                                const age = Date.now() - timestamp;
                                const TTL = 2 * 60 * 1000; // 2min

                                if (age < TTL && data?.onboarding_completed) {
                                    isCompletedLocally = true;
                                    storedSegment = storedSegment || data.segment;
                                    storedModules = storedModules || data.modules;
                                    storedPlan = storedPlan || data.plan_type; // v9.8: Recuperar plano do cache
                                    console.log('[DashboardAuth] ✅ Onboarding encontrado no cache de perfil');
                                }
                            }
                        } catch (parseErr) {
                            console.warn('[DashboardAuth] Erro ao ler localStorage/cache:', parseErr);
                        }

                        userProfile = {
                            id: currentUser.id,
                            email: currentUser.email || '',
                            onboarding_completed: isCompletedLocally, // Respeita localStorage
                            onboarding_integrations_done: isCompletedLocally, // Se onboarding ok, integrações tb
                            segment: storedSegment,
                            modules: storedModules,
                            plan_type: storedPlan, // v9.8: Injetar plano recuperado
                            role: isAdminByEmail ? 'admin' : 'client' // v6.1: Fallback deve respeitar Admin por email!
                        } as any;

                        console.log('[DashboardAuth] 📦 Usando perfil de fallback:', {
                            id: userProfile.id,
                            onboarding: isCompletedLocally,
                            plan: userProfile.plan_type
                        });
                    } else {
                        // Backoff exponencial (2s, 4s, 8s...)
                        const delay = Math.min(Math.pow(2, attempts) * 1000, 10000);
                        console.log(`[DashboardAuth] Aguardando ${delay}ms antes da próxima tentativa...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            setProfile(userProfile);

            // 🔄 ADMIN ONBOARDING: Apenas admins passam pelo onboarding TODA sessão
            // Clientes (não-admin) passam APENAS UMA VEZ - valor resgatado do banco ou localStorage
            if (isAdmin) {
                const sessionKey = `admin_session_${currentUser.id}`;
                const currentSession = sessionStorage.getItem(sessionKey);
                if (!currentSession) {
                    console.log('[DashboardAuth] 🔄 Admin - Resetando onboarding para esta sessão');
                    useAppStore.getState().resetOnboarding();
                    sessionStorage.setItem(sessionKey, 'active');
                }
            }

            // 🔑 SSOT: Sincronizar estado completo do onboarding e perfil para o localStorage
            if (profileLoadedFromDb && userProfile) {
                // v9.6: Usar a nova action inteligente syncWithProfile
                useAppStore.getState().syncWithProfile(userProfile);
            }

            // Buscar Plano (Fontes: 1. profile.plan_type do banco, 2. app_metadata, 3. plano atual no estado)
            const metadata = currentUser.app_metadata || {};
            const dbPlanType = userProfile?.plan_type || null;

            // 🔒 POLÍTICA DE PLANO (SSOT): Evitar regressão para Start
            setPlan((prev: any) => {
                let newPlan: { name: string; id: string } | null = null;

                // 1. Admin: manter Pro ou override
                if (isAdmin) {
                    const adminPlan = prev?.name || "Pro";
                    newPlan = { name: adminPlan, id: adminPlan.toLowerCase() + "-plan" };
                }
                // 2. Perfil real do DB (ou fallback recuperado) carregou: usar ele
                else if (dbPlanType) {
                    planLoadedRef.current = true;
                    const planName = dbPlanType.charAt(0).toUpperCase() + dbPlanType.slice(1).toLowerCase();
                    console.log('[DashboardAuth] ✅ Plano do DB/Fallback:', planName);
                    newPlan = { name: planName, id: planName.toLowerCase() + "-plan" };
                }
                // 3. Metadata do JWT
                else if (metadata.plan || metadata.claims?.plan) {
                    const jwtPlan = (metadata.plan || metadata.claims?.plan) as string;
                    const planName = jwtPlan.charAt(0).toUpperCase() + jwtPlan.slice(1).toLowerCase();
                    planLoadedRef.current = true;
                    console.log('[DashboardAuth] ✅ Plano do JWT:', planName);
                    newPlan = { name: planName, id: planName.toLowerCase() + "-plan" };
                }
                // 4. Timeout/fallback: NÃO regredir se já temos plano válido
                else if (!profileLoadedFromDb && prev?.name && planLoadedRef.current) {
                    console.log('[DashboardAuth] 🔒 Mantendo plano atual (timeout, plano já carregado):', prev.name);
                    return prev;
                }
                // 5. Primeiro carregamento sem dados: fallback Start
                else {
                    console.log('[DashboardAuth] ⚠️ Fallback Start (primeira carga sem dados)');
                    newPlan = { name: "Start", id: "start-plan" };
                }

                // 🚫 APENAS ATUALIZAR SE REALMENTE MUDOU (evitar re-renders desnecessários)
                if (newPlan && JSON.stringify(newPlan) === JSON.stringify(lastPlanRef.current)) {
                    console.log('[DashboardAuth] ⏭️ Plano não mudou, mantendo estado atual');
                    return prev;
                }

                lastPlanRef.current = newPlan;
                return newPlan;
            });

            console.log('[DashboardAuth] Perfil e Plano inicializados');
        } catch (error) {
            console.error('[DashboardAuth] Erro fatal no refreshProfile:', error);
        } finally {
            refreshInProgressRef.current = false;
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

        // 🏠 Função utilitária para limpar tokens da URL e restaurar a rota correta
        const cleanUrlAfterSync = () => {
            const hash = window.location.hash;
            const search = window.location.search;
            const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : (hash.substring(1) || search));
            const redirectTo = params.get('redirect_to');
            const routePath = redirectTo ? `/${redirectTo.replace(/^\//, '')}` : (hash.split('?')[0] || '/');
            const finalHash = routePath.startsWith('#') ? routePath : `#${routePath}`;

            console.log('[DashboardAuth] 🏠 Limpando URL e aplicando hash final:', finalHash);
            window.history.replaceState({}, document.title, window.location.pathname + finalHash);
        };

        // 🔑 EXTRAÇÃO DE TOKENS DA URL (para receber sessão do DashboardRedirect)
        const extractAndSyncTokensFromUrl = async () => {
            const hash = window.location.hash;
            const search = window.location.search;
            const hasTokens = hash.includes('access_token=') || search.includes('access_token=');

            if (!hasTokens) {
                console.log('[DashboardAuth] 📭 Nenhum token na URL');
                return null;
            }

            let accessToken: string | null = null;
            let refreshToken: string | null = null;
            let redirectTo: string | null = null;

            // Método 1: HashRouter com query após a rota (ex: /#/?access_token=...)
            if (hash.includes('access_token=')) {
                const searchPart = hash.includes('?') ? hash.split('?')[1] : hash.substring(1);
                const params = new URLSearchParams(searchPart);
                accessToken = params.get('access_token');
                refreshToken = params.get('refresh_token');
                redirectTo = params.get('redirect_to');
                console.log('[DashboardAuth] 📌 Tokens encontrados no hash');
            }

            // Método 2: Query string normal (ex: ?access_token=...)
            if (!accessToken && search.includes('access_token=')) {
                const params = new URLSearchParams(search);
                accessToken = params.get('access_token');
                refreshToken = params.get('refresh_token');
                redirectTo = params.get('redirect_to');
                console.log('[DashboardAuth] 📌 Tokens encontrados na query string');
            }

            if (accessToken && accessToken.length > 100) {
                console.log('[DashboardAuth] 🔐 Sincronizando sessão via tokens da URL...');
                try {
                    // v4.5: timeout de 10s para evitar travamento infinito no SubscriptionGate
                    const syncPromise = supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || ''
                    });

                    // v6.0: Timeout aumentado para 20s (handshake + rede instável)
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('SYNC_TIMEOUT')), 20000)
                    );

                    const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;

                    if (!error && data.session) {
                        console.log('[DashboardAuth] ✅ Sessão sincronizada, aguardando aplicação no estado...');
                        return data.session;
                    } else if (error) {
                        console.error('[DashboardAuth] ❌ Erro ao sincronizar sessão:', error.message);
                        if (error.status === 403) {
                            console.error('[DashboardAuth] 🚨 Erro 403 detectado. Verifique se o VITE_SUPABASE_URL no cliente corresponde ao projeto que gerou este token.');
                        }
                    }
                } catch (err: any) {
                    console.error('[DashboardAuth] ❌ Exceção ao sincronizar sessão:', err.message || err);
                }
            } else {
                console.warn('[DashboardAuth] ⚠️ Token inválido ou muito curto');
            }
            return null;
        };

        const initializeAuth = async () => {
            // 1. Configurar listener de auth PRIMEIRO para capturar o setSession subsequente
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
                console.log(`[DashboardAuth] 🔔 AuthEvent: ${event}`, { hasSession: !!currentSession });

                // 🛡️ IGNORAR eventos irrelevantes para refresh de perfil
                if (event === 'TOKEN_REFRESHED') {
                    // Apenas atualiza sessão, não recarrega perfil (muito custoso)
                    setSession(currentSession);
                    return;
                }

                // v7.6: FIX CRÍTICO - Evitar refresh duplicado em SIGNED_IN (F5 reload)
                // Se o perfil já está carregado para este usuário, não recarregar
                if (event === 'SIGNED_IN' && currentSession?.user && profile?.id === currentSession.user.id) {
                    console.log('[DashboardAuth] 🛑 SIGNED_IN ignorado - perfil já carregado para este usuário');
                    setSession(currentSession);
                    setUser(currentSession.user);
                    setLoading(false);
                    setInitialized(true);
                    return;
                }

                setSession(currentSession);
                setUser(currentSession?.user || null);

                if (currentSession?.user) {
                    await refreshProfile(currentSession.user);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    setPlan(null);
                }

                setLoading(false);
                setInitialized(true);
            });

            // 2. Tentar extrair tokens da URL (DashboardRedirect)
            // Agora o listener acima já estará pronto para reagir ao setSession
            const urlSession = await extractAndSyncTokensFromUrl();

            // 3. Fallback: tentar getSession() se não veio da URL ou se o listener ainda não disparou
            if (!urlSession) {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                if (initialSession?.user) {
                    setSession(initialSession);
                    setUser(initialSession.user);
                    await refreshProfile(initialSession.user);
                }

                // Se tinha tokens na URL mas o sync falhou (urlSession null), limpamos mesmo assim
                const hash = window.location.hash;
                const search = window.location.search;
                if (hash.includes('access_token=') || search.includes('access_token=')) {
                    console.warn('[DashboardAuth] 🧼 Falha na sincronização, limpando tokens da URL para evitar hang...');
                    cleanUrlAfterSync();
                }
            } else if (urlSession) {
                // Garantir que o estado local seja atualizado com a sessão da URL
                setSession(urlSession);
                setUser(urlSession.user);
                await refreshProfile(urlSession.user);

                // 🏠 Limpar tokens da URL APÓS o estado estar garantido
                cleanUrlAfterSync();
            }

            setLoading(false);
            setInitialized(true);

            // Guardar subscription para cleanup
            (window as any).__dashboardAuthSubscription = subscription;
        };

        initializeAuth();

        return () => {
            const sub = (window as any).__dashboardAuthSubscription;
            if (sub) sub.unsubscribe();
        };
    }, []);

    // v2.6: Sistema de Updates (Fase 8)
    // REMOVIDO: Lógica centralizada no App.tsx para evitar duplicidade de banners

    const signOut = async () => {
        console.log('[DashboardAuth] Executando logout...');

        try {
            if (supabase) {
                // Adicionamos um timeout para evitar que o logout trave se o Supabase demorar
                await Promise.race([
                    supabase.auth.signOut(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2000))
                ]);
            }
        } catch (error) {
            console.warn('[DashboardAuth] Erro ou timeout no signOut do Supabase:', error);
        }

        // SEMPRE limpar o estado local, independente do sucesso do signOut remoto
        setProfile(null);
        setUser(null);
        setSession(null);
        setPlan(null);

        // Limpar storage explicitamente
        localStorage.removeItem('sb-dashboard-auth');
        localStorage.removeItem('luminnus-storage');

        // v4.5: Limpar histórico e estado da LIA para evitar "ghost messages" entre sessões
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('lia_')) {
                localStorage.removeItem(key);
            }
        });

        // v4.1: Garantir que o estado de onboarding também seja resetado se necessário
        // (Isso força o sistema a re-inicializar do zero no próximo login)

        // Redirecionamento para o site principal/admin
        const landingPage = import.meta.env.VITE_LANDING_PAGE_URL || 'http://localhost:8080';
        console.log('[DashboardAuth] Redirecionando para:', landingPage);

        // Pequeno delay para garantir que os estados do React foram aplicados
        setTimeout(() => {
            window.location.href = landingPage;
        }, 100);
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            plan,
            loading,
            initialized,
            profile,
            isAdmin,
            onboardingCompleted,
            refreshProfile,
            signOut,
            setPlanName
        }}>
            {children}
            {showUpdateBanner && (
                <UpdateBanner
                    version={newVersion}
                    onClose={() => {
                        setShowUpdateBanner(false);
                        localStorage.setItem('luminnus_update_dismissed', newVersion);
                    }}
                    onUpdate={() => UpdateService.forceUpdate()}
                />
            )}
        </AuthContext.Provider>
    );
};

/**
 * 📢 Componente de Banner de Atualização
 */
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
