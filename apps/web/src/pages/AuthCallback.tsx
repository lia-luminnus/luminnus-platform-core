import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
                navigate('/login');
                return;
            }

            setMessage('Verificando seu plano...');

            try {
                // Verifica se é admin
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (roleData?.role === 'admin') {
                    console.log('[AuthCallback] Admin detectado, redirecionando para admin-dashboard');
                    navigate('/admin-dashboard');
                    return;
                }

                // Verifica se tem plano ativo
                const { data: planData } = await supabase
                    .from('planos')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'ativo')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (planData) {
                    console.log('[AuthCallback] Plano ativo encontrado, redirecionando para dashboard');
                    setMessage('Plano ativo encontrado! Redirecionando...');
                    navigate('/dashboard');
                } else {
                    console.log('[AuthCallback] Sem plano ativo, redirecionando para página de planos');
                    setMessage('Você ainda não tem um plano. Redirecionando...');
                    // Redireciona para a seção de planos na landing page
                    setTimeout(() => {
                        navigate('/#planos');
                    }, 1500);
                }
            } catch (error) {
                console.error('[AuthCallback] Erro ao verificar plano:', error);
                // Em caso de erro, vai para a home
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
