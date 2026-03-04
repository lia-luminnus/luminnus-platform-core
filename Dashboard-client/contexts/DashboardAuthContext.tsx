import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
export type PlanType = 'start' | 'pro' | 'plus';

interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    onboarding_completed: boolean;
    onboarding_integrations_done?: boolean;
    segment?: string; // Startup, Agência, Creator, etc.
    modules?: string[]; // Módulos ativados
    plan_type?: PlanType; // v9.5: Campo de plano no perfil
    role?: 'admin' | 'client'; // v6.1: Role based access
    tenant_id?: string; // v14.0: ID do tenant real
    company_name?: string;
    company_logo_url?: string;
    company_primary_color?: string;
    company_secondary_color?: string;
}

interface DashboardAuthContextProps {
    user: User | null;
    session: Session | null;
    plan: { name: string; id: string } | null;
    loading: boolean;
    initialized: boolean;
    profile: UserProfile | null;
    isAdmin: boolean;
    onboardingCompleted: boolean; // Atalho para profile.onboarding_completed
    refreshProfile: (user?: User | null) => Promise<void>;
    signOut: () => Promise<void>;
    setPlanName: (name: 'Start' | 'Plus' | 'Pro') => Promise<void>; // v9.5: Função exposta
    completeSessionOnboarding: () => void; // v12.0: SSOT State Action
}

const AuthContext = createContext<DashboardAuthContextProps | undefined>(undefined);

// Cache simples em memória para evitar requests repetidos na mesma sessão
const profileCache: { [key: string]: UserProfile } = {};

/**
 * 🛠️ Serviço desacoplado para buscar perfil
 * (Evita poluir o componente com lógica de fetch repetitiva)
 */
async function getOrCreateProfile(userId: string, email: string): Promise<UserProfile> {
    if (profileCache[userId]) {
        console.log('[DashboardAuth] ⚡ Cache hit para perfil:', userId);
        return profileCache[userId];
    }

    // 1. Tentar buscar perfil existente
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[DashboardAuth] Erro ao buscar perfil:', error);
        throw error;
    }

    if (data) {
        // v14.0: Buscar tenant_id vinculado na tabela tenant_members
        const { data: memberData } = await supabase
            .from('tenant_members')
            .select('tenant_id')
            .eq('user_id', userId)
            .maybeSingle();

        const profileData = {
            ...data,
            tenant_id: memberData?.tenant_id || data.id // Fallback para o ID do user se não houver member
        };

        profileCache[userId] = profileData;

        // v9.7: Salvar no localStorage também para resiliência entre refreshes
        try {
            const cacheKey = `profile_cache_${userId}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                data: profileData,
                timestamp: Date.now()
            }));
        } catch (e) { console.warn('Falha ao salvar cache key', e); }

        return profileData;
    }

    // 2. Se não existe, criar perfil básico (Silent Onboarding Start)
    console.log('[DashboardAuth] Perfil não encontrado. Criando novo...');

    // v9.8: Tentar recuperar dados do app_metadata (se houver migração)
    const { error: insertError } = await supabase
        .from('profiles')
        .insert([{
            id: userId,
            email: email,
            onboarding_completed: false, // Default: false
            plan_type: 'start' // Default plan
        }]);

    if (insertError) {
        console.error('[DashboardAuth] Erro ao criar perfil:', insertError);
        throw insertError;
    }

    // Retornar o objeto recém-criado (mock para evitar novo select)
    return {
        id: userId,
        email: email,
        onboarding_completed: false,
        plan_type: 'start'
    };
}

export const DashboardAuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [plan, setPlan] = useState<{ name: string; id: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminOnboardingDone, setAdminOnboardingDone] = useState(false); // v12.0: Internal State Machine

    // SSOT: O estado do onboarding vem do perfil
    // v12.0: Máquina de Estado para SSOT (Admin = Session, Client = DB)
    const localOnboardingCompleted = useAppStore((s) => s.onboarding_completed);

    // v12.0: Lógica centralizada de conclusão (SSOT: Protocolo Onboarding)
    const onboardingCompleted = isAdmin
        // Para Admin: Só é true se tiver a flag de sessão (resetado a cada login via url admin_access)
        ? adminOnboardingDone
        // Para Client: DB é a verdade absoluta. Se o DB diz que completou, ignoramos o local.
        : (profile?.onboarding_completed || localOnboardingCompleted || false);

    const refreshInProgressRef = useRef(false);
    // v9.9: Refs para evitar loops de atualização de plano
    const lastPlanRef = useRef<{ name: string; id: string } | null>(null);
    const planLoadedRef = useRef(false);
    // v13.0: Timestamp de última atualização de plano - bloqueia refreshProfile por 10s após setPlanName
    const planUpdateTimestampRef = useRef<number>(0);



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
            let userProfile = profile;
            let profileLoadedFromDb = false;

            if (profile && profile.id === currentUser.id) {
                console.log('[DashboardAuth] 🛑 Perfil já carregado para este usuário. Reutilizando dados.');
                profileLoadedFromDb = true;
            }

            // ⚡ DETECÇÃO PRECOCE DE ADMIN (evita loops de onboarding)
            const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || 'luminnus.lia.ai@gmail.com';
            const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase());
            const isAdminByEmail = adminEmails.includes(currentUser.email?.toLowerCase() || '');

            if (isAdminByEmail) {
                console.log('[DashboardAuth] ⚡ Admin detectado precocemente via email');
                setIsAdmin(true);

                // Reset imediato do onboarding para admins APENAS se não houver flag de sessão
                const sessionKey = `onboarding_session_done:${currentUser.id}`;
                const sessionDone = sessionStorage.getItem(sessionKey) === 'true';

                // v13.0: Verificar também se admin_access está na URL - forçar onboarding nesse caso
                const hash = window.location.hash;
                const search = window.location.search;
                const hasAdminAccessInUrl = hash.includes('admin_access=true') || search.includes('admin_access=true');

                if (hasAdminAccessInUrl) {
                    console.log('[DashboardAuth] 🔐 admin_access na URL - forçando reset de onboarding');
                    sessionStorage.removeItem(sessionKey); // Limpar imediatamente
                    useAppStore.getState().resetOnboarding();
                    setAdminOnboardingDone(false);
                } else {
                    // Admin login normal (sem admin_access): PULAR onboarding
                    console.log('[DashboardAuth] ✅ Admin login normal - pulando onboarding');
                    setAdminOnboardingDone(true);
                    sessionStorage.setItem(sessionKey, 'true');
                    useAppStore.getState().completeOnboarding();
                }
            }

            // SÓ buscar se não tiver perfil carregado
            if (!profileLoadedFromDb) {
                console.log('[DashboardAuth] Carregando perfil do banco...');

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

                        if (isAdminByEmail && !isAdmin) {
                            console.log('[DashboardAuth] ⚡ Admin detectado via email durante falha de carga');
                            setIsAdmin(true);
                        }

                        if (attempts >= MAX_ATTEMPTS) {
                            console.error('[DashboardAuth] Máximo de tentativas atingido. Usando fallback de resiliência.');

                            // 🔒 CRÍTICO: Respeitar o estado REAL do localStorage E cache
                            let isCompletedLocally = localOnboardingCompleted || false;
                            let storedSegment = null;
                            let storedModules = null;
                            let storedPlan = null;

                            try {
                                const storedData = localStorage.getItem('luminnus-storage');
                                if (storedData) {
                                    const parsed = JSON.parse(storedData);
                                    if (parsed?.state?.onboarding_completed) {
                                        isCompletedLocally = true;
                                        console.log('[DashboardAuth] ✅ Onboarding encontrado no localStorage');
                                    }
                                    storedSegment = parsed?.state?.businessType || null;
                                    storedModules = parsed?.state?.activeModules || null;
                                    storedPlan = parsed?.state?.planType || null;
                                }

                                const cacheKey = `profile_cache_${currentUser.id}`;
                                const cachedProfile = localStorage.getItem(cacheKey);
                                if (cachedProfile) {
                                    const { data, timestamp } = JSON.parse(cachedProfile);
                                    const age = Date.now() - timestamp;
                                    const TTL = 2 * 60 * 1000;

                                    if (age < TTL && data?.onboarding_completed) {
                                        isCompletedLocally = true;
                                        storedSegment = storedSegment || data.segment;
                                        storedModules = storedModules || data.modules;
                                        storedPlan = storedPlan || data.plan_type;
                                        console.log('[DashboardAuth] ✅ Onboarding encontrado no cache de perfil');
                                    }
                                }
                            } catch (parseErr) {
                                console.warn('[DashboardAuth] Erro ao ler localStorage/cache:', parseErr);
                            }

                            userProfile = {
                                id: currentUser.id,
                                email: currentUser.email || '',
                                onboarding_completed: isCompletedLocally,
                                onboarding_integrations_done: isCompletedLocally,
                                segment: storedSegment,
                                modules: storedModules,
                                plan_type: storedPlan,
                                role: isAdminByEmail ? 'admin' : 'client'
                            } as any;

                            console.log('[DashboardAuth] 📦 Usando perfil de fallback:', {
                                id: userProfile.id,
                                onboarding: isCompletedLocally,
                                plan: userProfile.plan_type
                            });
                        } else {
                            const delay = Math.min(Math.pow(2, attempts) * 1000, 10000);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
            }

            setProfile(userProfile);

            // 🔄 ADMIN ONBOARDING (Check secundário)
            if (isAdmin) {
                const sessionKey = `onboarding_session_done:${currentUser.id}`;
                const sessionDone = sessionStorage.getItem(sessionKey) === 'true';

                if (!sessionDone) {
                    // Admin login normal: marcar como done (só resetar se admin_access na URL)
                    sessionStorage.setItem(sessionKey, 'true');
                }
                setAdminOnboardingDone(true);
                useAppStore.getState().completeOnboarding();
            }

            // 🔑 SSOT: Sincronizar estado
            if (profileLoadedFromDb && userProfile) {
                useAppStore.getState().syncWithProfile(userProfile);
            }

            // Buscar Plano (Fontes: 1. profile.plan_type do banco, 2. app_metadata, 3. plano atual no estado)
            const metadata = currentUser.app_metadata || {};
            const dbPlanType = userProfile?.plan_type || null;

            // 🔒 POLÍTICA DE PLANO (SSOT): Evitar regressão para Start
            setPlan((prev: any) => {
                let newPlan: { name: string; id: string } | null = null;

                // 1. Admin: manter Pro ou override do banco
                if (isAdmin) {
                    // v13.0: Se houve uma atualização de plano nos últimos 10s, NÃO sobrescrever
                    const timeSinceUpdate = Date.now() - planUpdateTimestampRef.current;
                    if (timeSinceUpdate < 10000 && planUpdateTimestampRef.current > 0) {
                        console.log('[DashboardAuth] 🔒 Plano atualizado recentemente, protegendo contra override');
                        return prev;
                    }
                    const planFromDb = dbPlanType ? (dbPlanType.charAt(0).toUpperCase() + dbPlanType.slice(1).toLowerCase()) : null;
                    const adminPlan = planFromDb || prev?.name || "Pro";
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
                    // v13.1: Retornar lastPlanRef em vez de prev, pois prev pode estar desatualizado
                    return lastPlanRef.current;
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

    const setPlanName = async (name: 'Start' | 'Plus' | 'Pro') => {
        if (!user?.id) {
            console.error('[DashboardAuth] setPlanName: user ID inválido');
            return;
        }

        try {
            console.log('[DashboardAuth] 🔄 Alterando plano para:', name);

            // v13.0: Marcar timestamp para bloquear refreshProfile por 10s
            planUpdateTimestampRef.current = Date.now();

            // ✅ 1. Atualizar state local imediatamente (otimistic UI)
            setPlan({
                name: name,
                id: name.toLowerCase() + "-plan"
            });

            // ✅ 2. Persistir no Supabase
            const { error } = await supabase
                .from('profiles')
                .update({ plan_type: name.toLowerCase() })
                .eq('id', user.id);

            if (error) {
                console.error('[DashboardAuth] Erro ao persistir plano:', error);
                throw error;
            }

            console.log('[DashboardAuth] ✅ Plano persistido no Supabase:', name);

            // ✅ 3. CRÍTICO: Invalidar TODOS os caches antes de refresh
            // Limpar cache em memória
            delete profileCache[user.id];

            // Limpar cache do localStorage
            const cacheKey = `profile_cache_${user.id}`;
            localStorage.removeItem(cacheKey);

            console.log('[DashboardAuth] 🧹 Caches invalidados');

            // ✅ 4. Atualizar profile local diretamente (sem esperar refresh)
            setProfile(prev => prev ? { ...prev, plan_type: name.toLowerCase() as PlanType } : prev);

            // ✅ 5. Atualizar ref para evitar regressão no próximo refreshProfile
            lastPlanRef.current = { name, id: name.toLowerCase() + "-plan" };
            planLoadedRef.current = true;

            console.log('[DashboardAuth] ✅ Plano alterado com sucesso para:', name);
        } catch (err) {
            console.error('[DashboardAuth] ⚠️ Falha ao salvar plano:', err);
            // Reverter UI se falhar - buscar valor real do banco
            delete profileCache[user.id];
            await refreshProfile();
        }
    };


    // v12.0: Ação de máquina de estado para finalizar onboarding
    const completeSessionOnboarding = () => {
        if (!user) return;

        console.log('[DashboardAuth] 🏁 Finalizando sessão de onboarding (State Machine Action)');

        // 1. Atualizar Estado Interno
        setAdminOnboardingDone(true); // Se for admin, isso libera o guard

        // 2. Persistir na Sessão (SSOT para Admin)
        const sessionKey = `onboarding_session_done:${user.id}`;
        sessionStorage.setItem(sessionKey, 'true');

        // 3. Persistir no Store Global (para garantir consistência em redirects)
        useAppStore.getState().completeOnboarding();

        // 4. Se for Client, o `refreshProfile` cuidará de buscar do banco depois, 
        // mas setamos o local state para evitar flicker
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
                // v11.3: Limpeza robusta. Remove tudo antes do primeiro '?' ou antes de 'access_token='
                let searchPart = hash;
                if (hash.includes('?')) {
                    searchPart = hash.split('?')[1];
                } else {
                    const index = hash.indexOf('access_token=');
                    searchPart = hash.substring(index);
                }

                const params = new URLSearchParams(searchPart);
                accessToken = params.get('access_token');
                refreshToken = params.get('refresh_token');
                redirectTo = params.get('redirect_to');
                console.log('[DashboardAuth] 📌 Tokens encontrados no hash. Valid format:', !!accessToken);
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

                // Se tinha tokens na URL mas o sync falhou (urlSession null), 
                // NÃO limpar tokens imediatamente - deixar SubscriptionGate tentar
                // com seu próprio timeout de 8s para evitar redirect prematuro
                const hash = window.location.hash;
                const search = window.location.search;
                if (hash.includes('access_token=') || search.includes('access_token=')) {
                    console.warn('[DashboardAuth] ⚠️ Sync falhou, mas tokens mantidos na URL para retry do SubscriptionGate');
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
            setPlanName,
            completeSessionOnboarding // v12.0: Exposed Logic
        }}>
            {children}
        </AuthContext.Provider>

    );
};



export const useDashboardAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useDashboardAuth must be used within DashboardAuthProvider');
    return context;
};
