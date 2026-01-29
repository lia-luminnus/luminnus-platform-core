import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isAdminEmail, AUTH_URLS } from '@/config/auth';

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
                }

                // 3. FALLBACK: Verificar profiles.plan_type
                if (!hasActivePlan) {
                    const { data: profileRaw } = await supabase
                        .from('profiles')
                        .select('plan_type')
                        .eq('id', user.id)
                        .maybeSingle();

                    const profile = profileRaw as { plan_type: string } | null;
                    const validPlanTypes = ['start', 'plus', 'pro', 'cliente'];

                    if (profile?.plan_type && validPlanTypes.includes(profile.plan_type.toLowerCase())) {
                        console.log('[AuthCallback] Plano encontrado no perfil:', profile.plan_type);
                        hasActivePlan = true;
                    }
                }

                if (hasActivePlan) {
                    console.log('[AuthCallback] Plano ativo encontrado, redirecionando para Dashboard');
                    const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3001';
                    setMessage('Redirecionando para o seu Dashboard...');
                    setTimeout(() => {
                        window.location.href = DASHBOARD_URL;
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
