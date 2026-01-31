import React, { useEffect, useState } from 'react';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';
import { supabase } from '../lib/supabase';

interface SubscriptionGateProps {
    children: React.ReactNode;
}

/**
 * SubscriptionGate - Componente de Segurança que bloqueia acesso ao Dashboard
 * para usuários que não possuem um plano ativo.
 * 
 * Verifica:
 * 1. Email de administrador (bypass imediato)
 * 2. Tabela `subscriptions` para planos ativos
 * 3. Tabela `profiles` para plan_type existente
 * 4. Metadata do JWT (app_metadata.plan)
 * 
 * IMPORTANTE: Em caso de erro de conexão/RLS, permite acesso por padrão
 * para não bloquear usuários legítimos.
 */
export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
    const { user, loading: authLoading, initialized, plan: contextPlan, profile } = useDashboardAuth();
    const [checking, setChecking] = useState(true);
    const [hasAccess, setHasAccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const checkSubscription = async () => {
            // Detectar se há tokens na URL (sessão sendo sincronizada)
            const hash = window.location.hash;
            const search = window.location.search;
            const hasTokensInUrl = hash.includes('access_token=') || search.includes('access_token=');

            if (!initialized || authLoading) return;

            // Se não há usuário MAS há tokens na URL, a sessão está sendo sincronizada
            // Aguardar mais para evitar redirecionamento prematuro
            if (!user && hasTokensInUrl) {
                console.log('[SubscriptionGate] ⏳ Tokens na URL, aguardando sync...');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Tentar obter sessão diretamente
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    console.log('[SubscriptionGate] ❌ Sessão não sincronizada após espera');
                    setChecking(false);
                    setHasAccess(false);
                    return;
                }
                // Se chegou aqui, a sessão foi sincronizada. O useEffect será re-executado pelo contexto.
                console.log('[SubscriptionGate] ✅ Sessão sincronizada:', session.user.email);
                return;
            }

            // Se não há usuário, não precisa checar (vai para login)
            if (!user) {
                setChecking(false);
                setHasAccess(false);
                return;
            }

            console.log('[SubscriptionGate] Verificando acesso para:', user.email);

            // BYPASS 1: Administradores por Email ou Role
            const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS || 'luminnus.lia.ai@gmail.com';
            const adminEmails = adminEmailsEnv.split(',').map((e: string) => e.trim().toLowerCase());
            const isAdminEmail = adminEmails.includes(user.email?.toLowerCase() || '');
            const isAdminRole = (profile as any)?.role === 'admin';

            if (isAdminEmail || isAdminRole) {
                console.log('[SubscriptionGate] ✅ Admin bypass - acesso liberado', { isAdminEmail, isAdminRole });
                setHasAccess(true);
                setChecking(false);
                return;
            }

            // BYPASS 3: Verificar se o contexto/JWT já diz que tem plano
            // REMOVIDO 'cliente' e 'free' - agora apenas planos pagos dão acesso
            const validPlanNames = ['Start', 'Plus', 'Pro', 'start', 'plus', 'pro'];

            const contextPlanName = contextPlan?.name?.toLowerCase();
            const profilePlanType = profile?.plan_type?.toLowerCase();
            const jwtPlan = (user.app_metadata?.plan || user.user_metadata?.plan)?.toLowerCase();

            if (
                (contextPlanName && validPlanNames.includes(contextPlanName)) ||
                (profilePlanType && validPlanNames.includes(profilePlanType)) ||
                (jwtPlan && validPlanNames.includes(jwtPlan))
            ) {
                console.log('[SubscriptionGate] ✅ Acesso liberado (Plano encontrado no Contexto/JWT/Perfil)');
                setHasAccess(true);
                setChecking(false);
                return;
            }

            // Se nenhum bypass funcionou, tentar verificar no banco (Query profunda)
            if (!supabase) {
                console.warn('[SubscriptionGate] ⚠️ Supabase não disponível - permitindo acesso');
                setHasAccess(true);
                setChecking(false);
                return;
            }

            try {
                // 1. Tentar buscar Membership/Tenant (pode não existir em alguns ambientes)
                let tenantId: string | null = null;
                try {
                    console.log('[SubscriptionGate] Buscando vínculo com empresa...');
                    const { data: membership, error: memberError } = await (supabase
                        .from('tenant_members' as any) as any)
                        .select('tenant_id')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (memberError) {
                        // Silenciar erro 404/400 (tabela pode não existir)
                        if (memberError.code !== 'PGRST204' && !memberError.message?.includes('does not exist')) {
                            console.warn('[SubscriptionGate] tenant_members indisponível:', memberError.code);
                        }
                    } else {
                        tenantId = membership?.tenant_id || null;
                    }
                } catch (tenantErr) {
                    // Silenciar - tabela pode não existir
                }

                // 2. Tentar buscar Assinatura (pode não existir em alguns ambientes)
                try {
                    console.log('[SubscriptionGate] Buscando assinatura ativa...');
                    let query = supabase
                        .from('subscriptions' as any)
                        .select('id, status, plan_name')
                        .in('status', ['active', 'past_due', 'trialing', 'incomplete']);

                    if (tenantId) {
                        query = query.or(`user_id.eq.${user.id},tenant_id.eq.${tenantId}`);
                    } else {
                        query = query.eq('user_id', user.id);
                    }

                    const { data: subscription, error: subError } = await query.maybeSingle();

                    if (subError) {
                        // Silenciar erro 404/400 (tabela pode não existir)
                        if (subError.code !== 'PGRST204' && !subError.message?.includes('does not exist')) {
                            console.warn('[SubscriptionGate] subscriptions indisponível:', subError.code);
                        }
                    } else if (subscription) {
                        console.log('[SubscriptionGate] ✅ Assinatura ativa encontrada');
                        setHasAccess(true);
                        setChecking(false);
                        return;
                    }
                } catch (subErr) {
                    // Silenciar - tabela pode não existir
                }

                // 3. Fallback final: Verificar profiles.plan_type direto no DB
                console.log('[SubscriptionGate] Consultando profiles (DB)');
                const { data: dbProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('plan_type, role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error('[SubscriptionGate] Erro ao verificar profile:', profileError);
                    setHasAccess(true);
                    setChecking(false);
                    return;
                }

                if (
                    (dbProfile?.plan_type && validPlanNames.includes(dbProfile.plan_type.toLowerCase())) ||
                    (dbProfile as any)?.role === 'admin'
                ) {
                    console.log('[SubscriptionGate] ✅ Acesso liberado via DB profile');
                    setHasAccess(true);
                    setChecking(false);
                    return;
                }

                // 4. Verificar se é plano 'free' ou 'cliente' (sem acesso)
                const noAccessPlans = ['free', 'cliente'];
                if (dbProfile?.plan_type && noAccessPlans.includes(dbProfile.plan_type.toLowerCase())) {
                    console.log('[SubscriptionGate] ❌ Acesso negado: usuário sem plano pago (', dbProfile.plan_type, ')');
                    setHasAccess(false);
                    setErrorMessage('Você precisa de um plano ativo para acessar o Dashboard. Escolha um plano em nosso site.');
                    setChecking(false);
                    return;
                }

                // Nenhum plano encontrado - BLOQUEAR ACESSO
                console.log('[SubscriptionGate] ❌ Acesso negado: nenhum plano ativo encontrado');
                setHasAccess(false);
                setErrorMessage('Você não possui um plano ativo para acessar o Dashboard da LIA.');
            } catch (error) {
                console.error('[SubscriptionGate] Exceção na verificação:', error);
                setHasAccess(true); // Falha aberta por segurança
            } finally {
                setChecking(false);
            }
        };

        checkSubscription();
    }, [user, authLoading, initialized, contextPlan, profile]);

    // Detectar tokens na URL para evitar redirecionamento prematuro
    const hash = window.location.hash;
    const search = window.location.search;
    const hasTokensInUrl = hash.includes('access_token=') || search.includes('access_token=');

    // Loading state - também espera se há tokens na URL esperando sincronização
    if (authLoading || !initialized || checking || (hasTokensInUrl && !user)) {
        return (
            <div className="min-h-screen bg-[#0A0A10] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-white/60">
                        {hasTokensInUrl ? 'Sincronizando sessão...' : 'Verificando acesso...'}
                    </p>
                </div>
            </div>
        );
    }

    // Sem usuário - redirecionar para login (somente se não há tokens na URL)
    if (!user && !hasTokensInUrl) {
        const isProd = import.meta.env.PROD;
        const loginUrl = import.meta.env.VITE_LANDING_PAGE_URL || (isProd ? 'https://luminnus.ai' : 'http://localhost:8080');
        window.location.href = loginUrl;
        return null;
    }

    // Sem acesso - mostrar tela de bloqueio
    if (!hasAccess) {
        const isProd = import.meta.env.PROD;
        const landingBase = import.meta.env.VITE_LANDING_PAGE_URL || (isProd ? 'https://luminnus.ai' : 'http://localhost:8080');
        const pricingUrl = landingBase + '/pricing';

        const signOut = async () => {
            await supabase.auth.signOut();
            window.location.href = landingBase;
        };

        return (
            <div className="min-h-screen bg-[#0A0A10] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
                    <p className="text-slate-400 mb-6">
                        {errorMessage || 'Você precisa de um plano ativo para acessar o Dashboard da LIA.'}
                    </p>
                    <div className="space-y-3">
                        <a
                            href={pricingUrl}
                            className="block w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all"
                        >
                            Ver Planos
                        </a>
                        <button
                            onClick={signOut}
                            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
                        >
                            Sair da Conta
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-6">
                        Logado como: {user.email}
                    </p>
                </div>
            </div>
        );
    }

    // Acesso concedido
    return <>{children}</>;
};
