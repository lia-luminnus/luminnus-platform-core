import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPlan } from './useUserPlan';

/**
 * INTERFACE: Limites de Uso
 */
export interface UsageLimits {
  id: string;
  user_id: string;
  periodo_mes: string;
  conversas_count: number;
  mensagens_count: number;
  agendamentos_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * INTERFACE: Limites do Plano
 */
export interface PlanLimits {
  conversas_max: number;
  mensagens_max: number;
  agendamentos_max: number;
  canais: number;
  integracoes_max: number;
  suporte: string;
  features: string[];
}

/**
 * CONFIGURAÇÃO DE LIMITES POR PLANO
 */
const PLAN_LIMITS: Record<'Start' | 'Plus' | 'Pro', PlanLimits> = {
  Start: {
    conversas_max: 10,
    mensagens_max: 100,
    agendamentos_max: 20,
    canais: 1,
    integracoes_max: 1,
    suporte: 'email',
    features: ['1 canal de atendimento', 'Respostas automáticas básicas', '1 integração'],
  },
  Plus: {
    conversas_max: 100,
    mensagens_max: 1000,
    agendamentos_max: 100,
    canais: 3,
    integracoes_max: -1, // ilimitado
    suporte: 'priority',
    features: ['Múltiplos canais', 'IA avançada', 'Integrações ilimitadas', 'Agendamentos automáticos'],
  },
  Pro: {
    conversas_max: -1, // ilimitado
    mensagens_max: -1, // ilimitado
    agendamentos_max: -1, // ilimitado
    canais: -1, // ilimitado
    integracoes_max: -1, // ilimitado
    suporte: '24/7',
    features: ['Tudo ilimitado', 'IA customizada', 'API dedicada', 'Suporte 24/7'],
  },
};

/**
 * HOOK PERSONALIZADO: useUserPlanLimits
 *
 * Gerencia limites de uso do usuário com base no plano contratado
 *
 * @returns {Object} Objeto contendo:
 *   - usageLimits: Dados de uso atual do usuário
 *   - planLimits: Limites do plano contratado
 *   - canUseFeature: Função para verificar se pode usar uma feature
 *   - incrementUsage: Função para incrementar contadores de uso
 *   - loading: Boolean indicando se está carregando
 *   - refetch: Função para recarregar os dados
 *
 * @example
 * const { canUseFeature, incrementUsage } = useUserPlanLimits();
 *
 * if (canUseFeature('conversas')) {
 *   // Usuário pode criar mais conversas
 *   await incrementUsage('conversas');
 * } else {
 *   // Mostrar upgrade prompt
 * }
 */
export const useUserPlanLimits = () => {
  const { user } = useAuth();
  const { userPlan } = useUserPlan();
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * FUNÇÃO: Obter limites do plano
   */
  const getPlanLimits = (): PlanLimits | null => {
    if (!userPlan) return null;
    return PLAN_LIMITS[userPlan.plano_nome] || null;
  };

  /**
   * FUNÇÃO: Carregar limites de uso
   */
  const fetchUsageLimits = async () => {
    if (!user) {
      setUsageLimits(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Obter o mês atual
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

      // Buscar limites de uso do mês atual
      const { data, error } = await supabase
        .from('usage_limits')
        .select('*')
        .eq('user_id', user.id)
        .eq('periodo_mes', currentMonth)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found
        console.error('Erro ao buscar limites de uso:', error);
        return;
      }

      if (!data) {
        // Criar registro de limites para o mês atual
        const { data: newUsageLimits, error: createError } = await supabase
          .from('usage_limits')
          .insert({
            user_id: user.id,
            periodo_mes: currentMonth,
            conversas_count: 0,
            mensagens_count: 0,
            agendamentos_count: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error('Erro ao criar limites de uso:', createError);
          return;
        }

        setUsageLimits(newUsageLimits);
      } else {
        setUsageLimits(data);
      }
    } catch (error) {
      console.error('Erro ao buscar limites de uso:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * EFEITO: Carregar limites ao montar ou quando usuário/plano mudar
   */
  useEffect(() => {
    fetchUsageLimits();
  }, [user, userPlan]);

  /**
   * FUNÇÃO: Verificar se pode usar uma feature
   */
  const canUseFeature = (feature: 'conversas' | 'mensagens' | 'agendamentos'): boolean => {
    if (!userPlan || !usageLimits) return false;

    const planLimits = getPlanLimits();
    if (!planLimits) return false;

    // Se o limite é -1, é ilimitado
    const featureLimit = planLimits[`${feature}_max`];
    if (featureLimit === -1) return true;

    // Verificar se ainda está dentro do limite
    const currentUsage = usageLimits[`${feature}_count`];
    return currentUsage < featureLimit;
  };

  /**
   * FUNÇÃO: Incrementar contador de uso
   */
  const incrementUsage = async (feature: 'conversas' | 'mensagens' | 'agendamentos'): Promise<boolean> => {
    if (!user || !usageLimits) return false;

    try {
      // Incrementar no banco de dados
      const { error } = await supabase.rpc('increment_usage_limit', {
        p_user_id: user.id,
        p_type: feature,
      });

      if (error) {
        console.error('Erro ao incrementar uso:', error);
        return false;
      }

      // Atualizar estado local
      setUsageLimits(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [`${feature}_count`]: prev[`${feature}_count`] + 1,
        };
      });

      return true;
    } catch (error) {
      console.error('Erro ao incrementar uso:', error);
      return false;
    }
  };

  /**
   * FUNÇÃO: Obter percentual de uso
   */
  const getUsagePercentage = (feature: 'conversas' | 'mensagens' | 'agendamentos'): number => {
    if (!userPlan || !usageLimits) return 0;

    const planLimits = getPlanLimits();
    if (!planLimits) return 0;

    const featureLimit = planLimits[`${feature}_max`];
    if (featureLimit === -1) return 0; // Ilimitado

    const currentUsage = usageLimits[`${feature}_count`];
    return (currentUsage / featureLimit) * 100;
  };

  /**
   * FUNÇÃO: Obter uso restante
   */
  const getRemainingUsage = (feature: 'conversas' | 'mensagens' | 'agendamentos'): number | 'unlimited' => {
    if (!userPlan || !usageLimits) return 0;

    const planLimits = getPlanLimits();
    if (!planLimits) return 0;

    const featureLimit = planLimits[`${feature}_max`];
    if (featureLimit === -1) return 'unlimited';

    const currentUsage = usageLimits[`${feature}_count`];
    return Math.max(0, featureLimit - currentUsage);
  };

  return {
    usageLimits,
    planLimits: getPlanLimits(),
    canUseFeature,
    incrementUsage,
    getUsagePercentage,
    getRemainingUsage,
    loading,
    refetch: fetchUsageLimits,
  };
};
