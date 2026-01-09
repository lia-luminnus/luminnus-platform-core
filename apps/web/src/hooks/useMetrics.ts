/**
 * Hook personalizado para buscar e gerenciar métricas
 * Integração com Supabase para OpenAI, Cartesia, Render, Cloudflare e Supabase
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MetricsOpenAI,
  MetricsOpenAIInsert,
  MetricsGemini,
  MetricsGeminiInsert,
  MetricsRender,
  MetricsRenderInsert,
  MetricsCloudflare,
  MetricsCloudflareInsert,
  MetricsSupabase,
  MetricsSupabaseInsert,
  MetricsSummary,
  MetricsAlert,
  MetricsAlertInsert,
  DashboardMetricsSummary,
  MetricsByCompany,
  MetricsByUser,
  DailyMetric,
  OPENAI_PRICES,
  GEMINI_PRICES,
  RenderErrorLog,
  TrafegoRota,
  ConsumoTabela,
} from "@/types/metrics";

// =====================================================
// FUNÇÕES DE CÁLCULO DE CUSTO
// =====================================================

export const calcularCustoOpenAI = (tokensInput: number, tokensOutput: number): number => {
  const custoInput = tokensInput * OPENAI_PRICES['gpt-4o-mini'].input;
  const custoOutput = tokensOutput * OPENAI_PRICES['gpt-4o-mini'].output;
  return custoInput + custoOutput;
};

// Cartesia removida

// =====================================================
// HOOK: MÉTRICAS OPENAI
// =====================================================

export const useMetricsOpenAI = (days: number = 30) => {
  return useQuery({
    queryKey: ["metrics_openai", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("provider_metrics")
        .select("*")
        .eq("provider", "openai")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        data: item.date,
        tokens_total: (item.tokens_input || 0) + (item.tokens_output || 0),
        custo_estimado: item.cost || 0,
        modelo: 'gpt-4o-mini'
      })) as unknown as MetricsOpenAI[];
    },
  });
};

export const useMetricsOpenAIByCompany = () => {
  return useQuery({
    queryKey: ["metrics_openai_by_company"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { data: metrics, error: metricsError } = await supabase
        .from("provider_metrics")
        .select("empresa_id, tokens_input, tokens_output, cost")
        .eq("provider", "openai")
        .gte("date", startOfMonth.toISOString().split("T")[0]);

      if (metricsError) throw metricsError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, company_name, full_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const aggregated = new Map<string, MetricsByCompany>();

      let totalTokens = 0;
      metrics?.forEach(m => {
        totalTokens += (m.tokens_input || 0) + (m.tokens_output || 0);
      });

      metrics?.forEach(m => {
        const empresaId = m.empresa_id || 'sem_empresa';
        const profile = m.empresa_id ? profileMap.get(m.empresa_id) : null;

        if (!aggregated.has(empresaId)) {
          aggregated.set(empresaId, {
            empresa_id: empresaId,
            empresa_nome: profile?.company_name || 'Sem empresa',
            total: 0,
            custo: 0,
            percentual: 0,
          });
        }

        const current = aggregated.get(empresaId)!;
        current.total += (m.tokens_input || 0) + (m.tokens_output || 0);
        current.custo += (m as any).cost || 0;
      });

      aggregated.forEach(item => {
        item.percentual = totalTokens > 0 ? (item.total / totalTokens) * 100 : 0;
      });

      return Array.from(aggregated.values()).sort((a, b) => b.total - a.total);
    },
  });
};

export const useMetricsOpenAIByUser = () => {
  return useQuery({
    queryKey: ["metrics_openai_by_user"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { data: metrics, error: metricsError } = await supabase
        .from("provider_metrics")
        .select("usuario_id, tokens_input, tokens_output, cost")
        .eq("provider", "openai")
        .gte("date", startOfMonth.toISOString().split("T")[0]);

      if (metricsError) throw metricsError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const aggregated = new Map<string, MetricsByUser>();

      metrics?.forEach(m => {
        const userId = m.usuario_id || 'sem_usuario';
        const profile = m.usuario_id ? profileMap.get(m.usuario_id) : null;

        if (!aggregated.has(userId)) {
          aggregated.set(userId, {
            usuario_id: userId,
            usuario_nome: profile?.full_name || 'Sem nome',
            empresa_nome: profile?.company_name || undefined,
            total: 0,
            custo: 0,
          });
        }

        const current = aggregated.get(userId)!;
        current.total += (m.tokens_input || 0) + (m.tokens_output || 0);
        current.custo += (m as any).cost || 0;
      });

      return Array.from(aggregated.values()).sort((a, b) => b.total - a.total);
    },
  });
};

// =====================================================
// HOOK: MÉTRICAS GEMINI
// =====================================================

export const useMetricsGemini = (days: number = 30) => {
  return useQuery({
    queryKey: ["metrics_gemini", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Usar a tabela unificada provider_metrics
      const { data, error } = await supabase
        .from("provider_metrics")
        .select("*")
        .eq("provider", "gemini")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        data: item.date,
        tokens_total: (item.tokens_input || 0) + (item.tokens_output || 0),
        custo_estimado: item.cost || 0,
        modelo: 'gemini-1.5-flash'
      })) as unknown as MetricsGemini[];
    },
  });
};

export const useMetricsGeminiByCompany = () => {
  return useQuery({
    queryKey: ["metrics_gemini_by_company"],
    queryFn: async () => {
      // Por enquanto, Gemini não tem quebra por empresa no backend unificado
      // Retornar lista vazia ou implementar agregação se necessário
      return [] as MetricsByCompany[];
    },
  });
};

// Cartesia removida

// =====================================================
// HOOK: MÉTRICAS RENDER
// =====================================================

export const useMetricsRender = (days: number = 30) => {
  return useQuery({
    queryKey: ["metrics_render", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await (supabase as any)
        .from("provider_metrics")
        .select("*")
        .eq("provider", "render")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        logs_erro: (item.logs_erro as unknown as RenderErrorLog[]) || [],
      })) as MetricsRender[];
    },
  });
};

export const useMetricsRenderLatest = () => {
  return useQuery({
    queryKey: ["metrics_render_latest"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("provider_metrics")
        .select("*")
        .eq("provider", "render")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        ...data,
        logs_erro: (data.logs_erro as unknown as RenderErrorLog[]) || [],
      } as MetricsRender;
    },
  });
};

// =====================================================
// HOOK: MÉTRICAS CLOUDFLARE
// =====================================================

export const useMetricsCloudflare = (days: number = 30) => {
  return useQuery({
    queryKey: ["metrics_cloudflare", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("provider_metrics")
        .select("*")
        .eq("provider", "cloudflare")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        data: item.date,
        requests_dia: item.requests || 0,
        custo_estimado: item.cost || 0,
        trafego_rota: {} as TrafegoRota,
        plano: 'free'
      })) as unknown as MetricsCloudflare[];
    },
  });
};

export const useMetricsCloudflareByCompany = () => {
  return useQuery({
    queryKey: ["metrics_cloudflare_by_company"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { data: metrics, error: metricsError } = await supabase
        .from("provider_metrics")
        .select("empresa_id, requests, cost")
        .eq("provider", "cloudflare")
        .gte("date", startOfMonth.toISOString().split("T")[0]);

      if (metricsError) throw metricsError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, company_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const aggregated = new Map<string, MetricsByCompany>();

      let totalRequests = 0;
      metrics?.forEach(m => {
        totalRequests += (m as any).requests || 0;
      });

      metrics?.forEach(m => {
        const empresaId = m.empresa_id || 'sem_empresa';
        const profile = m.empresa_id ? profileMap.get(m.empresa_id) : null;

        if (!aggregated.has(empresaId)) {
          aggregated.set(empresaId, {
            empresa_id: empresaId,
            empresa_nome: profile?.company_name || 'Sem empresa',
            total: 0,
            custo: 0,
            percentual: 0,
          });
        }

        const current = aggregated.get(empresaId)!;
        current.total += m.requests || 0;
        current.custo += m.cost || 0;
      });

      aggregated.forEach(item => {
        item.percentual = totalRequests > 0 ? (item.total / totalRequests) * 100 : 0;
      });

      return Array.from(aggregated.values()).sort((a, b) => b.total - a.total);
    },
  });
};

// =====================================================
// HOOK: MÉTRICAS SUPABASE
// =====================================================

export const useMetricsSupabase = (days: number = 30) => {
  return useQuery({
    queryKey: ["metrics_supabase", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("provider_metrics")
        .select("*")
        .eq("provider", "supabase")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        data: item.date,
        leituras_segundo: item.reads || 0,
        escritas_segundo: item.writes || 0,
        storage_usado_mb: item.storage_mb || 0,
        custo_estimado: item.cost || 0,
        consumo_tabela: {} as ConsumoTabela,
      })) as unknown as MetricsSupabase[];
    },
  });
};

export const useMetricsSupabaseLatest = () => {
  return useQuery({
    queryKey: ["metrics_supabase_latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_metrics")
        .select("*")
        .eq("provider", "supabase")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        ...data,
        data: data.date,
        leituras_segundo: data.reads || 0,
        escritas_segundo: data.writes || 0,
        storage_usado_mb: data.storage_mb || 0,
        custo_estimado: data.cost || 0,
        consumo_tabela: {} as ConsumoTabela,
      } as unknown as MetricsSupabase;
    },
  });
};

// =====================================================
// HOOK: ALERTAS
// =====================================================

export const useMetricsAlerts = (resolved: boolean = false) => {
  return useQuery({
    queryKey: ["metrics_alerts", resolved],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_alerts")
        .select("*")
        .eq("resolvido", resolved)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MetricsAlert[];
    },
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("metrics_alerts")
        .update({
          resolvido: true,
          resolvido_em: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_alerts"] });
    },
  });
};

// =====================================================
// HOOK: DASHBOARD SUMMARY
// =====================================================

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ["dashboard_metrics"],
    queryFn: async (): Promise<DashboardMetricsSummary> => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const startDateStr = startOfMonth.toISOString().split("T")[0];

      // Buscar todas as métricas do mês em paralelo
      const [openaiRes, geminiRes, renderRes, cloudflareRes, supabaseRes] = await Promise.all([
        (supabase as any)
          .from("provider_metrics")
          .select("tokens_input, tokens_output, cost")
          .eq("provider", "openai")
          .gte("date", startDateStr),
        (supabase as any)
          .from("provider_metrics")
          .select("tokens_input, tokens_output, cost")
          .eq("provider", "gemini")
          .gte("date", startDateStr),
        (supabase as any)
          .from("provider_metrics")
          .select("requests, cost")
          .eq("provider", "render")
          .gte("date", startDateStr),
        (supabase as any)
          .from("provider_metrics")
          .select("requests, cost")
          .eq("provider", "cloudflare")
          .gte("date", startDateStr),
        (supabase as any)
          .from("provider_metrics")
          .select("reads, writes, storage_mb, cost")
          .eq("provider", "supabase")
          .gte("date", startDateStr),
      ]);

      // Calcular totais OpenAI
      const openaiMetrics = (openaiRes.data || []) as any[];
      const openaiTokens = openaiMetrics.reduce(
        (acc, m) => acc + (m.tokens_input || 0) + (m.tokens_output || 0),
        0
      );
      const openaiCusto = openaiMetrics.reduce((acc, m) => acc + (m.cost || 0), 0);

      // Calcular totais Gemini
      const geminiMetrics = (geminiRes.data || []) as any[];
      const geminiTokensInput = geminiMetrics.reduce((acc, m) => acc + (m.tokens_input || 0), 0);
      const geminiTokensOutput = geminiMetrics.reduce((acc, m) => acc + (m.tokens_output || 0), 0);
      const geminiCusto = geminiMetrics.reduce((acc, m) => acc + (m.cost || 0), 0);

      // Render status
      const renderLatest = renderRes.data?.[0];
      const renderChamadas = (renderRes.data || []).reduce(
        (acc, m) => acc + (m.requests || 0),
        0
      );

      // Cloudflare totais
      const cloudflareMetrics = cloudflareRes.data || [];
      const cloudflareRequests = cloudflareMetrics.reduce(
        (acc, m) => acc + (m.requests || 0),
        0
      );
      const cloudflareWorkers = 0; // Campo não existe na tabela unificada
      const cloudflareCusto = cloudflareMetrics.reduce(
        (acc, m) => acc + (m.cost || 0),
        0
      );

      // Supabase status
      const supabaseLatest = supabaseRes.data?.[0];

      // Calcular custo total
      const custoTotal =
        openaiCusto +
        geminiCusto +
        (renderRes.data?.[0]?.cost || 0) +
        cloudflareCusto +
        (supabaseLatest?.cost || 0);

      // Projeção para fim do mês
      const hoje = new Date();
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const diasPassados = hoje.getDate();
      const projecao = diasPassados > 0 ? (custoTotal / diasPassados) * diasNoMes : 0;

      return {
        openai: {
          tokens_mes: openaiTokens,
          custo_mes: openaiCusto,
          variacao_percentual: 0, // Calcular comparando com mês anterior
        },
        gemini: {
          tokens_input: geminiTokensInput,
          tokens_output: geminiTokensOutput,
          custo_mes: geminiCusto,
        },
        render: {
          status: (renderLatest?.status as 'online' | 'offline' | 'degraded') || 'online',
          uptime_percent: 99.9, // Calcular baseado no histórico
          chamadas_mes: renderChamadas,
          custo_mes: (renderLatest as any)?.cost || 0,
        },
        cloudflare: {
          requests_mes: cloudflareRequests,
          workers_executados: cloudflareWorkers,
          custo_mes: cloudflareCusto,
        },
        supabase: {
          leituras_total: (supabaseLatest as any)?.reads || 0,
          escritas_total: (supabaseLatest as any)?.writes || 0,
          storage_usado_percent:
            supabaseLatest && (supabaseLatest as any).storage_mb > 0
              ? (((supabaseLatest as any).storage_mb || 0) / 500) * 100 // Fallback para 500MB se limite for 0
              : 0,
          custo_mes: (supabaseLatest as any)?.cost || 0,
        },
        custo_total_mes: custoTotal,
        projecao_fim_mes: projecao,
      };
    },
  });
};

// =====================================================
// HOOK: DADOS PARA GRÁFICOS (30 DIAS)
// =====================================================

export const useChartData = (source: 'openai' | 'gemini' | 'cloudflare' | 'render' | 'supabase') => {
  return useQuery({
    queryKey: ["chart_data", source],
    queryFn: async (): Promise<DailyMetric[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      let query;
      switch (source) {
        case 'openai':
        case 'gemini':
          query = supabase
            .from("provider_metrics")
            .select("date, tokens_input, tokens_output, cost")
            .eq("provider", source)
            .gte("date", startDate.toISOString().split("T")[0])
            .order("date", { ascending: true });
          break;
        case 'cloudflare':
        case 'render':
        case 'supabase':
          query = supabase
            .from("provider_metrics")
            .select("date, storage_mb, cost, reads, writes")
            .eq("provider", source)
            .gte("date", startDate.toISOString().split("T")[0])
            .order("date", { ascending: true });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agregar por data
      const dailyMap = new Map<string, { valor: number; custo: number }>();

      data?.forEach((item: any) => {
        const dateStr = item.date as string;
        if (!dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, { valor: 0, custo: 0 });
        }

        const current = dailyMap.get(dateStr)!;
        switch (source) {
          case 'openai':
          case 'gemini':
            current.valor += (item.tokens_input || 0) + (item.tokens_output || 0);
            current.custo += item.cost || 0;
            break;
          case 'cloudflare':
          case 'render':
            current.valor += item.requests || 0;
            current.custo += item.cost || 0;
            break;
          case 'supabase':
            current.valor += (item.reads || 0) + (item.writes || 0);
            current.custo += item.cost || 0;
            break;
        }
      });

      return Array.from(dailyMap.entries()).map(([data, values]) => ({
        data,
        valor: values.valor,
        custo: values.custo,
      }));
    },
  });
};

// =====================================================
// MUTATIONS PARA INSERIR MÉTRICAS
// =====================================================

export const useInsertMetricsOpenAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricsOpenAIInsert) => {
      const custo = calcularCustoOpenAI(data.tokens_input, data.tokens_output);
      const { error } = await supabase.from("provider_metrics").insert({
        provider: "openai",
        date: data.data || new Date().toISOString().split('T')[0],
        tokens_input: data.tokens_input,
        tokens_output: data.tokens_output,
        cost: custo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_openai"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_metrics"] });
    },
  });
};

export const useInsertMetricsGemini = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricsGeminiInsert) => {
      const { error } = await supabase.from("provider_metrics").insert({
        provider: "gemini",
        date: data.data || new Date().toISOString().split('T')[0],
        tokens_input: data.tokens_input,
        tokens_output: data.tokens_output,
        cost: data.custo_estimado || 0,
        metadata: { model: data.modelo || "gemini-1.5-flash" }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_gemini"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_metrics"] });
    },
  });
};

export const useInsertMetricsRender = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricsRenderInsert) => {
      const { error } = await supabase.from("provider_metrics").insert({
        provider: "render",
        date: data.data || new Date().toISOString().split('T')[0],
        requests: data.chamadas_dia,
        cost: data.custo_mensal || 0,
        metadata: { status: data.status, instance: data.instancia_tipo }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_render"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_metrics"] });
    },
  });
};

export const useInsertMetricsCloudflare = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricsCloudflareInsert) => {
      const { error } = await supabase.from("provider_metrics").insert({
        provider: "cloudflare",
        date: data.data || new Date().toISOString().split('T')[0],
        requests: data.requests_dia,
        cost: data.custo_estimado || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_cloudflare"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_metrics"] });
    },
  });
};

export const useInsertMetricsSupabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricsSupabaseInsert) => {
      const { error } = await supabase.from("provider_metrics").insert({
        provider: "supabase",
        date: data.data || new Date().toISOString().split('T')[0],
        reads: data.leituras_segundo,
        writes: data.escritas_segundo,
        storage_mb: data.storage_usado_mb,
        cost: data.custo_estimado || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_supabase"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard_metrics"] });
    },
  });
};

export const useInsertAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MetricsAlertInsert) => {
      const { error } = await supabase.from("metrics_alerts").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metrics_alerts"] });
    },
  });
};
