import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * INTERFACE DO PLANO DO USUÁRIO
 */
export interface UserPlan {
  id: string;
  user_id: string;
  tenant_id: string;
  tenant_name?: string;
  plano_nome: 'Start' | 'Plus' | 'Pro';
  status: 'ativo' | 'inativo' | 'expirado' | 'cancelado' | 'past_due' | 'incomplete';
  data_inicio: string;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
  payment_type?: 'monthly' | 'annual_12x' | 'annual_full';
  commitment_end_date?: string | null;
  commitment_months?: number;
  stripe_subscription_id?: string | null;
}

export const useUserPlan = () => {
  const { user, plan: platformPlan } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserPlan = async () => {
    if (!user) {
      setUserPlan(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Tentar buscar Membership
      const { data: membership } = await (supabase
        .from('tenant_members' as any) as any)
        .select('tenant_id, tenants(name)')
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
        setUserPlan({
          id: stripeData.id,
          user_id: stripeData.user_id,
          tenant_id: stripeData.tenant_id || 'no-tenant',
          tenant_name: (membership?.tenants as any)?.name,
          plano_nome: stripeData.plan_name as any,
          status: (stripeData.status === 'active' ? 'ativo' : stripeData.status) as any,
          data_inicio: stripeData.current_period_start || stripeData.created_at,
          data_fim: stripeData.current_period_end,
          created_at: stripeData.created_at,
          updated_at: stripeData.updated_at,
        });
        setLoading(false);
        return;
      }

      // 3. FALLBACK PROFUNDO: Verificar profiles.plan_type
      // Este é o "Safety Lock" - se o perfil diz que tem plano, o botão DEVE aparecer.
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('plan_type')
        .eq('id', user.id)
        .maybeSingle();

      const profile = profileRaw as { plan_type: string } | null;
      const validPlanTypes = ['start', 'plus', 'pro', 'cliente'];

      if (profile?.plan_type && validPlanTypes.includes(profile.plan_type.toLowerCase())) {
        setUserPlan({
          id: 'profile-fixed-' + user.id,
          user_id: user.id,
          tenant_id: membership?.tenant_id || 'no-tenant',
          plano_nome: (profile.plan_type === 'cliente' ? 'Start' : profile.plan_type.charAt(0).toUpperCase() + profile.plan_type.slice(1)) as any,
          status: 'ativo',
          data_inicio: new Date().toISOString(),
          data_fim: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      setUserPlan(null);
    } catch (error) {
      console.error('Erro ao buscar plano do usuário:', error);
      setUserPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPlan();
  }, [user, platformPlan]);

  // ADMIN BYPASS: Administradores SEMPRE têm acesso
  const adminEmails = ['luminnus.lia.ai@gmail.com'];
  const isAdmin = user?.email && adminEmails.some(e => e.toLowerCase() === user.email?.toLowerCase());

  // hasActivePlan é verdadeiro se:
  // 1. For admin, OU
  // 2. Tiver platformPlan, OU
  // 3. Qualquer detecção de plano funcionou
  const hasActivePlan = isAdmin || platformPlan !== null || (userPlan !== null && (userPlan.status === 'ativo' || userPlan.status === 'past_due'));

  return {
    userPlan,
    hasActivePlan,
    loading: loading && !platformPlan && !isAdmin,
    refetch: fetchUserPlan,
  };
};
