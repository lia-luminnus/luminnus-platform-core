import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { plans as staticPlans } from '@/data/plansData';

/**
 * Interface do Plano (compatível com plan_configs do Supabase)
 */
export interface PlanFromDB {
  id: string;
  plan_name: string;
  price: string;
  annual_price?: string;
  description: string;
  max_channels: string;
  max_conversations: string;
  max_messages: string;
  features: string[];
  is_popular?: boolean;
  gradient_start?: string;
  gradient_end?: string;
  discount?: number;
  lia_quote?: string;
  custom_cta_text?: string;
  custom_cta_action?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface do Plano para uso no frontend
 */
export interface Plan {
  id?: string; // ID do plano no banco de dados
  name: string;
  price: string;
  annualPrice: string;
  period: string;
  description: string;
  features: string[];
  color: string;
  popular: boolean;
  discount: number;
  liaQuote: string;
  maxChannels: string | number;
  maxConversations: string | number;
  maxMessages: string | number;
  customCTA?: {
    text: string;
    action: string;
  };
}

// Ordem fixa dos planos: Start=1, Plus=2, Pro=3
const PLAN_ORDER: Record<string, number> = {
  'Start': 1,
  'Plus': 2,
  'Pro': 3,
};

function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    const orderA = PLAN_ORDER[a.name] || 99;
    const orderB = PLAN_ORDER[b.name] || 99;
    return orderA - orderB;
  });
}

/**
 * Converte plano do formato do banco para o formato do frontend
 */
function convertPlanFromDB(dbPlan: PlanFromDB): Plan {
  const gradientStart = dbPlan.gradient_start || '262.1 83.3% 57.8%';
  const gradientEnd = dbPlan.gradient_end || '330.4 81.2% 60.4%';

  // Função auxiliar para tratar preços com separadores europeus e brasileiros
  const parsePrice = (priceStr: string | undefined): number => {
    if (!priceStr) return 0;

    // Remove tudo que não é dígito, ponto ou vírgula
    let clean = priceStr.replace(/[^0-9.,]/g, '');

    // Se não tiver nada, retorna 0
    if (!clean) return 0;

    // Detectar formato europeu: ponto como separador de milhar
    // Ex: "1.411" onde o ponto é milhar (resultado: 1411)
    // Mas "1.5" onde o ponto é decimal (resultado: 1.5)

    // Se tiver vírgula E ponto: vírgula é decimal, pontos são milhares
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    // Se tiver apenas vírgula: é decimal
    else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    // Se tiver apenas ponto: verificar se é milhar ou decimal
    else if (clean.includes('.')) {
      // Ponto seguido de exatamente 3 dígitos no final = milhar (ex: 1.411, 9.564)
      // Ponto seguido de 1-2 dígitos no final = decimal (ex: 1.5, 27.99)
      const parts = clean.split('.');
      const lastPart = parts[parts.length - 1];

      if (lastPart.length === 3) {
        // É milhar - remove os pontos
        clean = clean.replace(/\./g, '');
      }
      // Se for 1-2 dígitos, mantém como decimal (padrão do parseFloat)
    }

    return parseFloat(clean) || 0;
  };

  const numericPrice = parsePrice(dbPlan.price);
  const numericAnnualPrice = dbPlan.annual_price ? parsePrice(dbPlan.annual_price) : numericPrice * 12;

  // Desconto = ((Mensal * 12) - Anual) / (Mensal * 12) * 100
  const expectedAnnual = numericPrice * 12;
  const calculatedDiscount = expectedAnnual > 0
    ? Math.round(((expectedAnnual - numericAnnualPrice) / expectedAnnual) * 100)
    : 0;

  return {
    id: dbPlan.id,
    name: dbPlan.plan_name,
    price: dbPlan.price,
    annualPrice: dbPlan.annual_price || `€${Math.round(numericPrice * 12)}`,
    period: '/mês',
    description: dbPlan.description,
    features: dbPlan.features || [],
    color: `from-[hsl(${gradientStart})] to-[hsl(${gradientEnd})]`,
    popular: dbPlan.is_popular || false,
    discount: calculatedDiscount > 0 ? calculatedDiscount : 20, // Default 20% se não houver desconto configurado
    liaQuote: dbPlan.lia_quote || '',
    maxChannels: dbPlan.max_channels,
    maxConversations: dbPlan.max_conversations,
    maxMessages: dbPlan.max_messages,
    customCTA: dbPlan.custom_cta_text && dbPlan.custom_cta_action ? {
      text: dbPlan.custom_cta_text,
      action: dbPlan.custom_cta_action
    } : undefined
  };
}

/**
 * Hook para buscar planos do Supabase
 * Fallback para dados estáticos se não houver dados no banco
 */
export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(staticPlans);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    let pollingInterval: NodeJS.Timeout;

    // Timeout de segurança - CORRIGIDO
    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        console.log('[usePlans] Timeout atingido - usando dados estáticos');
        setPlans(staticPlans);
        setLoading(false);
      }
    }, 5000);

    // Carregamento inicial
    loadPlans(true).finally(() => {
      if (isMounted) {
        clearTimeout(timeoutId);
      }
    });

    // 🔄 POLLING: Atualizar planos a cada 10 segundos para sincronização com admin
    pollingInterval = setInterval(() => {
      if (isMounted) {
        console.log('🔄 [usePlans] Polling - Verificando atualizações...');
        loadPlans();
      }
    }, 10000); // 10 segundos

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      clearInterval(pollingInterval);
    };
  }, []);

  const loadPlans = async (showLoading = false) => {
    console.log('🔍 [usePlans] Iniciando carregamento de planos...');
    try {
      if (showLoading) setLoading(true);
      setError(null);

      console.log('📡 [usePlans] Consultando Supabase...');
      // Buscar planos do Supabase
      const { data, error: fetchError } = await supabase
        .from('plan_configs')
        .select('*')
        .order('created_at', { ascending: true });

      console.log('📊 [usePlans] Resultado da query:', { data, fetchError });

      if (fetchError) {
        console.error('❌ [usePlans] Erro ao carregar planos do Supabase:', fetchError);
        // Usar dados estáticos como fallback
        setPlans(staticPlans);
        setError(fetchError);
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ [usePlans] ${data.length} planos encontrados no banco`);
        // Converter e ordenar planos
        const convertedPlans = data.map(convertPlanFromDB);
        setPlans(sortPlans(convertedPlans)); // Ordenar Start, Plus, Pro
      } else {
        // Se não houver planos no banco, usar dados estáticos
        console.log('⚠️ [usePlans] Nenhum plano encontrado no Supabase, usando dados estáticos');
        setPlans(staticPlans);
      }
    } catch (err) {
      console.error('💥 [usePlans] Erro ao carregar planos:', err);
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      // Usar dados estáticos como fallback
      setPlans(staticPlans);
    } finally {
      // CRÍTICO: Sempre define loading como false
      console.log('🏁 [usePlans] Carregamento finalizado');
      setLoading(false);
    }
  };

  const refetch = () => {
    loadPlans();
  };

  return {
    plans,
    loading,
    error,
    refetch
  };
}
