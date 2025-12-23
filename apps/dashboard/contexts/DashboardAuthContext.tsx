import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, configError } from '../lib/supabase';
import { getOrCreateProfile, UserProfile } from '../services/profileService';
import type { Company, Plan } from '@luminnus/shared';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    company: Company | null;
    plan: Plan | null;
    entitlements: string[];
    loading: boolean;
    initialized: boolean;
    profile: UserProfile | null;
    onboardingCompleted: boolean;
    refreshProfile: (initialUser?: User | null) => Promise<void>;
    refreshPlatformData: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Creates a fallback profile when database operations fail
 */
const createFallbackProfile = (currentUser?: User | null): UserProfile => {
    console.warn('[DashboardAuth] Using fallback profile');
    return {
        id: currentUser?.id || 'unknown',
        email: currentUser?.email || null,
        full_name: currentUser?.email?.split('@')[0] || 'User',
        role: 'client',
        segment: null,
        modules: null,
        onboarding_completed: false,
        onboarding_integrations_done: false,
        integrations_selected: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

export const DashboardAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [entitlements, setEntitlements] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const onboardingCompleted = profile?.onboarding_completed ?? false;

    /**
     * Fetch or create user profile with timeout protection
     */
    const refreshProfile = async (initialUser?: User | null) => {
        console.log('[DashboardAuth] refreshProfile called', { hasInitialUser: !!initialUser });

        if (!supabase) {
            console.error('[DashboardAuth] Supabase client not available');
            setProfile(createFallbackProfile());
            return;
        }

        let timeoutId: number | undefined;

        try {
            // Set a 15 second timeout for the entire operation
            const timeoutPromise = new Promise<void>((_, reject) => {
                timeoutId = window.setTimeout(() => {
                    reject(new Error('refreshProfile timed out after 15s'));
                }, 15000);
            });

            const mainPromise = (async () => {
                let currentUser = initialUser;

                if (!currentUser) {
                    console.log('[DashboardAuth] Getting current user...');
                    const { data: userData } = await supabase.auth.getUser();
                    currentUser = userData?.user;
                }

                if (!currentUser) {
                    console.log('[DashboardAuth] No current user');
                    setProfile(null);
                    return;
                }

                console.log('[DashboardAuth] User found:', currentUser.email);

                try {
                    console.log('[DashboardAuth] Fetching profile from database...');
                    const userProfile = await getOrCreateProfile(
                        currentUser.id,
                        currentUser.email || ''
                    );
                    setProfile(userProfile);
                    console.log('[DashboardAuth] Profile loaded:', {
                        id: userProfile.id,
                        onboardingCompleted: userProfile.onboarding_completed
                    });
                } catch (dbError: any) {
                    console.error('[DashboardAuth] Database error:', dbError.message);
                    setProfile(createFallbackProfile(currentUser));
                }
            })();

            await Promise.race([mainPromise, timeoutPromise]);

        } catch (error: any) {
            console.error('[DashboardAuth] refreshProfile error:', error.message);
            // Fallback imediato: se temos usuário, usamos o ID dele mesmo no erro
            const currentUser = initialUser || (await supabase.auth.getUser()).data.user;
            setProfile(createFallbackProfile(currentUser));
        } finally {
            if (timeoutId) window.clearTimeout(timeoutId);
        }
    };

    const refreshPlatformData = async () => {
        console.log('[DashboardAuth] refreshPlatformData called');

        if (!supabase) {
            return;
        }

        try {
            const { data: sessionData } = await supabase.auth.getSession();

            if (!sessionData?.session) {
                setCompany(null);
                setPlan(null);
                setEntitlements([]);
                return;
            }

            // API call with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            try {
                const response = await fetch('/api/me', {
                    headers: {
                        'Authorization': `Bearer ${sessionData.session.access_token}`
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    setCompany(data.company);
                    setPlan(data.plan);
                    setEntitlements(data.entitlements || []);
                }
            } catch {
                // Network error - continue without platform data
            }
        } catch (error: any) {
            console.warn('[DashboardAuth] Platform data error:', error.message);
        }
    };

    useEffect(() => {
        console.log('[DashboardAuth] Initializing...');

        if (!supabase) {
            console.error('[DashboardAuth] Supabase client is null!', configError);
            setProfile(createFallbackProfile());
            setLoading(false);
            setInitialized(true);
            return;
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('[DashboardAuth] Auth state changed:', event);
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                await refreshProfile(currentSession.user);
                await refreshPlatformData();
            } else {
                setProfile(null);
                setCompany(null);
                setPlan(null);
                setEntitlements([]);
            }
            setLoading(false);
            setInitialized(true);
        });

        // Initial load
        const init = async () => {
            try {
                console.log('[DashboardAuth] Getting initial session...');
                const { data: sessionData } = await supabase.auth.getSession();

                console.log('[DashboardAuth] Initial session:', sessionData?.session ? 'exists' : 'none');
                setSession(sessionData?.session ?? null);
                setUser(sessionData?.session?.user ?? null);

                if (sessionData?.session?.user) {
                    // Optimistic profile creation before fetching
                    setProfile(createFallbackProfile(sessionData.session.user));

                    // Fetch real profile in background
                    refreshProfile(sessionData.session.user);
                    refreshPlatformData();
                }
            } catch (error: any) {
                console.error('[DashboardAuth] Init error:', error.message);
                // Usar o user do state se disponível
                setProfile(createFallbackProfile(user));
            } finally {
                setLoading(false);
                setInitialized(true);
            }
        };

        // Add timeout to init
        const initTimeout = setTimeout(() => {
            if (!initialized) {
                console.warn('[DashboardAuth] Initialization timed out - setting fallback');
                // Tentar carregar a sessão uma última vez ou usar o que temos
                setProfile(prev => prev || createFallbackProfile(user));
                setLoading(false);
                setInitialized(true);
            }
        }, 10000); // Aumentado para 10s

        init().then(() => clearTimeout(initTimeout));

        return () => {
            clearTimeout(initTimeout);
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        console.log('[DashboardAuth] Signing out...');
        const isAdminAccess = sessionStorage.getItem('admin_access') === 'true' || profile?.role === 'admin';

        try {
            // Limpar sessionStorage ao sair
            sessionStorage.removeItem('admin_access');

            if (supabase) {
                // Timeout para evitar travar se o Supabase demorar
                await Promise.race([
                    supabase.auth.signOut(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('SignOut Timeout')), 2000))
                ]);
            }
        } catch (error) {
            console.warn('[DashboardAuth] SignOut error/timeout:', error);
        } finally {
            // Limpar estados locais independentemente de erro no server
            setProfile(null);
            setUser(null);
            setSession(null);

            console.log('[DashboardAuth] Redirecting to:', isAdminAccess ? 'admin-dashboard' : 'home');

            // Redirecionar
            if (isAdminAccess) {
                window.location.href = 'http://localhost:8080/admin-dashboard';
            } else {
                window.location.href = 'http://localhost:8080';
            }
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            company,
            plan,
            entitlements,
            loading,
            initialized,
            profile,
            onboardingCompleted,
            refreshProfile,
            refreshPlatformData,
            signOut
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
