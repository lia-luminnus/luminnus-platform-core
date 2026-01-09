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
    refreshProfile: (initialUser?: User | null) => Promise<void>;
    signOut: () => Promise<void>;
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

    // Verificar onboarding também no estado local (permite funcionar sem autenticação)
    const localOnboardingCompleted = useAppStore((state) => state.onboarding_completed);

    // Para o admin (Wendell), ignoramos o flag do banco para permitir testar o onboarding
    const isAdminAccount = user?.email === "luminnus.lia.ai@gmail.com";
    const onboardingCompleted = isAdminAccount
        ? localOnboardingCompleted
        : (profile?.onboarding_completed ?? localOnboardingCompleted ?? false);

    const refreshProfile = async (initialUser?: User | null) => {
        console.log('[DashboardAuth] Iniciando refreshProfile...');
        if (!supabase) {
            console.warn('[DashboardAuth] Supabase não disponível no refreshProfile');
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
                return;
            }

            console.log('[DashboardAuth] Carregando perfil do banco...');

            // Timeout de segurança para a busca de perfil
            const profilePromise = getOrCreateProfile(currentUser.id, currentUser.email || '');
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('PROFILE_TIMEOUT')), 7000)
            );

            let userProfile;
            try {
                userProfile = await Promise.race([profilePromise, timeoutPromise]) as UserProfile;
                console.log('[DashboardAuth] Perfil carregado com sucesso');
            } catch (pErr: any) {
                console.error('[DashboardAuth] Erro ou Timeout ao carregar perfil:', pErr.message);
                // Fallback para permitir que o dashboard carregue mesmo sem perfil do banco
                userProfile = {
                    id: currentUser.id,
                    email: currentUser.email || '',
                    onboarding_completed: false
                } as any;
            }

            setProfile(userProfile);

            // Buscar Plano (Fonte Única: app_metadata ou claims no JWT do Supabase)
            const metadata = currentUser.app_metadata || {};
            const userPlanName = (metadata.plan || metadata.claims?.plan || "Start") as string;

            // Forçar Pro se for admin/tester (luminnus.lia.ai@gmail.com) conforme requisito
            const isAdmin = currentUser.email === "luminnus.lia.ai@gmail.com";
            const effectivePlan = isAdmin ? "Pro" : userPlanName;

            setPlan({
                name: effectivePlan,
                id: effectivePlan.toLowerCase() + "-plan"
            });
            console.log('[DashboardAuth] Plano configurado:', effectivePlan);
        } catch (error) {
            console.error('[DashboardAuth] Erro fatal no refreshProfile:', error);
        }
    };

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            setInitialized(true);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log(`[DashboardAuth] Auth state changed: ${event}`, currentSession?.user?.email);
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            if (currentSession?.user) {
                await refreshProfile(currentSession.user);
            } else {
                setProfile(null);
                setPlan(null);
            }
            console.log('[DashboardAuth] Finalizando inicialização (setLoading: false, setInitialized: true)');
            setLoading(false);
            setInitialized(true);
        });

        supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
            console.log('[DashboardAuth] getSession finalizado. Usuário:', initialSession?.user?.email);
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            if (initialSession?.user) {
                await refreshProfile(initialSession.user);
            }
            console.log('[DashboardAuth] Initial session sync concluído.');
            setLoading(false);
            setInitialized(true);
        }).catch(err => {
            console.error('[DashboardAuth] Erro inicial no getSession:', err);
            setLoading(false);
            setInitialized(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    // v2.6: Sistema de Updates (Fase 8)
    useEffect(() => {
        console.log('🔄 [Dashboard-UpdateService] Iniciando monitoramento...');
        UpdateService.initialize({
            currentVersion: '4.0.0', // Versão do Dashboard sincronizada com LIA Unified
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
        if (supabase) await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
        // Redirecionamento movido para o componente que chama o logout (ex: Sidebar) para maior flexibilidade
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
            signOut
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
