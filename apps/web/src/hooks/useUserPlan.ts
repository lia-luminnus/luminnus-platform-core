import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * INTERFACE DO PLANO DO USUÁRIO
 * Define a estrutura dos dados de plano
 */
export interface UserPlan {
  id: string;
  user_id: string;
  plano_nome: 'Start' | 'Plus' | 'Pro';
  status: 'ativo' | 'inativo' | 'expirado' | 'cancelado';
  data_inicio: string;
  data_fim: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * HOOK PERSONALIZADO: useUserPlan
 *
 * Verifica se o usuário possui um plano ativo no Supabase
 *
 * @returns {Object} Objeto contendo:
 *   - userPlan: Dados do plano do usuário (ou null se não tiver)
 *   - hasActivePlan: Boolean indicando se o usuário tem plano ativo
 *   - loading: Boolean indicando se está carregando os dados
 *   - refetch: Função para recarregar os dados do plano
 *
 * @example
 * const { userPlan, hasActivePlan, loading } = useUserPlan();
 *
 * if (loading) return <div>Carregando...</div>;
 * if (hasActivePlan) {
 *   console.log('Plano:', userPlan.plan_name);
 * }
 */
export const useUserPlan = () => {
  const { user, plan: platformPlan } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * FUNÇÃO PARA BUSCAR PLANO DO USUÁRIO
   * Consulta a tabela planos no Supabase (LEGACY)
   */
  const fetchUserPlan = async () => {
    // Se o platformPlan já existe no AuthContext, use-o
    if (platformPlan) {
      setUserPlan({
        id: platformPlan.id,
        user_id: user?.id || '',
        plano_nome: (platformPlan.name.charAt(0).toUpperCase() + platformPlan.name.slice(1)) as any,
        status: 'ativo',
        data_inicio: new Date().toISOString(),
        data_fim: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    if (!user) {
      setUserPlan(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Busca o plano do usuário na tabela planos (ALIGNED WITH GENERATED TYPES)
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('status', 'ativo')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar plano do usuário:', error);
        setUserPlan(null);
      } else if (data) {
        // Mapeia o esquema para a interface legacy usada no frontend
        setUserPlan({
          id: data.id,
          user_id: user?.id || '',
          plano_nome: data.plano_nome as any,
          status: data.status as any,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
      } else {
        setUserPlan(null);
      }
    } catch (error) {
      console.error('Erro ao buscar plano do usuário:', error);
      setUserPlan(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * EFEITO: BUSCAR PLANO QUANDO O USUÁRIO OU PLATFORM PLAN MUDAR
   */
  useEffect(() => {
    fetchUserPlan();
  }, [user, platformPlan]);

  /**
   * COMPUTED: hasActivePlan
   */
  const hasActivePlan = platformPlan !== null || (userPlan !== null && userPlan.status === 'ativo');

  return {
    userPlan,
    hasActivePlan,
    loading: loading && !platformPlan,
    refetch: fetchUserPlan,
  };
};
