import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isAdminEmail, AUTH_URLS } from '@/config/auth';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * AuthCallback - Página de callback após login OAuth (Google)
 * Verifica se o usuário tem plano ativo antes de redirecionar
 */
const AuthCallback: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [message, setMessage] = useState('Verificando sua conta...');
    const processingRef = React.useRef(false);

    useEffect(() => {
        const checkUserPlanAndRedirect = async () => {
            // Aguarda o AuthContext carregar
            if (authLoading) return;

            // Evita processamento duplo
            if (processingRef.current) return;
            processingRef.current = true;

            console.log('[AuthCallback] Usuário:', user?.email);

            // Se não tem usuário logado, volta para login
            if (!user) {
                console.log('[AuthCallback] Sem usuário, redirecionando para login');
                navigate(AUTH_URLS.LOGIN);
                return;
            }

            setMessage('Verificando seu acesso...');

            try {
                // Determine redirect path consistent with AuthContext
                if (isAdminEmail(user.email)) {
                    console.log('[AuthCallback] Admin detectado');
                    navigate(AUTH_URLS.ADMIN_DASHBOARD);
                    return;
                }

                // Check for active plan - PRIMEIRO: Verificar subscriptions
                let hasActivePlan = false;

                // 1. Tentar buscar Membership
                const { data: membership } = await (supabase
                    .from('tenant_members' as any) as any)
                    .select('tenant_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                // 2. Tentar buscar Assinatura (por tenant ou por user_id)
                let stripeData = null;
                if (membership) {
                    const { data } = await (supabase
                        .from('subscriptions' as any) as any)
                        .select('*')
                        .eq('tenant_id', membership.tenant_id)
                        .in('status', ['active', 'past_due', 'incomplete'])
                        .maybeSingle();
                    stripeData = data;
                }

                if (!stripeData) {
                    const { data } = await (supabase
                        .from('subscriptions' as any) as any)
                        .select('*')
                        .eq('user_id', user.id)
                        .in('status', ['active', 'past_due', 'incomplete'])
                        .maybeSingle();
                    stripeData = data;
                }

                if (stripeData) {
                    console.log('[AuthCallback] Assinatura ativa encontrada:', stripeData.plan_name);
                    hasActivePlan = true;

                    // AUTO-SYNC: Atualizar profiles.plan_type para o plano real da assinatura
                    // Isso corrige a exibição no painel admin
                    if (stripeData.plan_name) {
                        const planNameLower = stripeData.plan_name.toLowerCase();
                        await (supabase
                            .from('profiles') as any)
                            .update({ plan_type: planNameLower })
                            .eq('id', user.id)
                            .then(({ error }) => {
                                if (!error) {
                                    console.log('[AuthCallback] Plano sincronizado no perfil:', planNameLower);
                                }
                            });
                    }
                }

                // 3. FALLBACK: Verificar profiles.plan_type e role (para admin check)
                const { data: profileRaw } = await supabase
                    .from('profiles')
                    .select('plan_type, role')
                    .eq('id', user.id)
                    .maybeSingle();

                const userProfile = profileRaw as { plan_type?: string; role?: string } | null;

                if (!hasActivePlan) {
                    // REMOVIDO 'cliente' - agora apenas planos pagos dão acesso
                    const validPlanTypes = ['start', 'plus', 'pro'];

                    if (userProfile?.plan_type && validPlanTypes.includes(userProfile.plan_type.toLowerCase())) {
                        console.log('[AuthCallback] Plano encontrado no perfil:', userProfile.plan_type);
                        hasActivePlan = true;
                    }
                }

                // 4. ADMIN BYPASS: Administradores sempre têm acesso
                const isAdmin = isAdminEmail(user.email) || userProfile?.role === 'admin';
                if (isAdmin) {
                    console.log('[AuthCallback] Admin detectado, liberando acesso total.');
                    hasActivePlan = true;
                }

                if (hasActivePlan) {
                    console.log('[AuthCallback] Plano ativo encontrado, redirecionando para Dashboard');
                    const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || (import.meta.env.PROD ? "https://luminnus-dashboard.onrender.com" : "http://localhost:3001");
                    setMessage('Redirecionando para o seu Dashboard...');

                    // v5.5: Sincronização de Sessão Cross-Origin (Local e Produção)
                    // Passamos os tokens na URL para que o Dashboard possa herdar a sessão
                    const { data: { session } } = await supabase.auth.getSession();
                    let redirectFinalUrl = DASHBOARD_URL;

                    if (session?.access_token) {
                        const tokenParams = `access_token=${session.access_token}&refresh_token=${session.refresh_token || ''}`;
                        // O Dashboard-client usa HashRouter, então os tokens devem vir após o #/
                        redirectFinalUrl = DASHBOARD_URL.endsWith('/')
                            ? `${DASHBOARD_URL}#/?${tokenParams}`
                            : `${DASHBOARD_URL}/#/?${tokenParams}`;
                    }

                    setTimeout(() => {
                        window.location.href = redirectFinalUrl;
                    }, 800);
                } else {
                    console.log('[AuthCallback] Sem plano ativo, redirecionando para o site principal');
                    setMessage('Você não possui um plano ativo.');
                    setTimeout(() => {
                        navigate('/');
                    }, 800);
                }

            } catch (error) {
                console.error('[AuthCallback] Erro no fluxo:', error);
                navigate('/');
            }
        };

        checkUserPlanAndRedirect();
    }, [user, authLoading, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 max-w-md w-full shadow-2xl text-center"
            >
                <div className="mb-6 flex justify-center">
                    <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
                </div>

                <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                    Bem-vindo!
                </h1>

                <p className="text-slate-400">
                    {message}
                </p>
            </motion.div>
        </div>
    );
};

export default AuthCallback;
