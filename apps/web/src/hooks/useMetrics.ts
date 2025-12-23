/**
 * Hook personalizado para buscar e gerenciar métricas
 * Integração com Supabase para OpenAI, Cartesia, Render, Cloudflare e Supabase
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  MetricsGemini,
  MetricsRender,
  MetricsCloudflare,
  MetricsSupabase,
  MetricsSummary,
  MetricsAlert,
  DashboardMetricsSummary,
  MetricsByCompany,
  MetricsByUser,
  DailyMetric,
  OPENAI_PRICES,
  GEMINI_PRICES,
  MetricsOpenAIInsert,
  MetricsGeminiInsert,
  MetricsRenderInsert,
  MetricsCloudflareInsert,
  MetricsSupabaseInsert,
  MetricsAlertInsert,
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
        .from("metrics_openai")
        .select("*")
        .gte("data", startDate.toISOString().split("T")[0])
        .order("data", { ascending: false });

      if (error) throw error;
      return (data || []) as MetricsOpenAI[];
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
        .from("metrics_openai")
        .select("empresa_id, tokens_input, tokens_output, custo_estimado")
        .gte("data", startOfMonth.toISOString().split("T")[0]);

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
        current.custo += m.custo_estimado || 0;
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
        .from("metrics_openai")
        .select("usuario_id, tokens_input, tokens_output, custo_estimado")
        .gte("data", startOfMonth.toISOString().split("T")[0]);

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
        current.custo += m.custo_estimado || 0;
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
      return (data || []) as MetricsGemini[];
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

export const useMetricsCartesiaByCompany = () => {
  return useQuery({
    queryKey: ["metrics_cartesia_by_company"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);

      const { data: metrics, error: metricsError } = await supabase
        .from("metrics_cartesia")
        .select("empresa_id, caracteres_enviados, creditos_usados, custo_estimado")
        .gte("data", startOfMonth.toISOString().split("T")[0]);

      if (metricsError) throw metricsError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, company_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const aggregated = new Map<string, MetricsByCompany>();

      let totalCreditos = 0;
      metrics?.forEach(m => {
        totalCreditos += m.creditos_usados || 0;
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
        current.total += m.creditos_usados || 0;
        current.custo += m.custo_estimado || 0;
      });

      aggregated.forEach(item => {
        item.percentual = totalCreditos > 0 ? (item.total / totalCreditos) * 100 : 0;
      });

      return Array.from(aggregated.values()).sort((a, b) => b.total - a.total);
    },
  });
};

// =====================================================
// HOOK: MÉTRICAS RENDER
// =====================================================

export const useMetricsRender = (days: number = 30) => {
  return useQuery({
    queryKey: ["metrics_render", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("metrics_render")
        .select("*")
        .gte("data", startDate.toISOString().split("T")[0])
        .order("data", { ascending: false });

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
      const { data, error } = await supabase
        .from("metrics_render")
        .select("*")
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
        .from("metrics_cloudflare")
        .select("*")
        .gte("data", startDate.toISOString().split("T")[0])
        .order("data", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        trafego_rota: (item.trafego_rota || {}) as TrafegoRota,
      })) as MetricsCloudflare[];
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
        .from("metrics_cloudflare")
        .select("empresa_id, requests_dia, custo_estimado")
        .gte("data", startOfMonth.toISOString().split("T")[0]);

      if (metricsError) throw metricsError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, company_name");

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const aggregated = new Map<string, MetricsByCompany>();

      let totalRequests = 0;
      metrics?.forEach(m => {
        totalRequests += m.requests_dia || 0;
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
        current.total += m.requests_dia || 0;
        current.custo += m.custo_estimado || 0;
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
        .from("metrics_supabase")
        .select("*")
        .gte("data", startDate.toISOString().split("T")[0])
        .order("data", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        consumo_tabela: (item.consumo_tabela || {}) as ConsumoTabela,
      })) as MetricsSupabase[];
    },
  });
};

export const useMetricsSupabaseLatest = () => {
  return useQuery({
    queryKey: ["metrics_supabase_latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_supabase")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        ...data,
        consumo_tabela: (data.consumo_tabela || {}) as ConsumoTabela,
      } as MetricsSupabase;
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
      const [openaiRes, cartesiaRes, renderRes, cloudflareRes, supabaseRes] = await Promise.all([
        supabase
          .from("metrics_openai")
          .select("tokens_input, tokens_output, custo_estimado")
          .gte("data", startDateStr),
        supabase
          .from("provider_metrics")
          .select("tokens_input, tokens_output, cost")
          .eq("provider", "gemini")
          .gte("date", startDateStr),
        supabase
          .from("metrics_render")
          .select("status, chamadas_dia, custo_mensal")
          .gte("data", startDateStr)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("metrics_cloudflare")
          .select("requests_dia, workers_executados, custo_estimado")
          .gte("data", startDateStr),
        supabase
          .from("metrics_supabase")
          .select("leituras_segundo, escritas_segundo, storage_usado_mb, storage_limite_mb, custo_estimado")
          .gte("data", startDateStr)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      // Calcular totais OpenAI
      const openaiMetrics = openaiRes.data || [];
      const openaiTokens = openaiMetrics.reduce(
        (acc, m) => acc + (m.tokens_input || 0) + (m.tokens_output || 0),
        0
      );
      const openaiCusto = openaiMetrics.reduce((acc, m) => acc + (m.custo_estimado || 0), 0);

      // Calcular totais Gemini
      const geminiMetrics = (geminiRes.data || []) as any[];
      const geminiTokensInput = geminiMetrics.reduce((acc, m) => acc + (m.tokens_input || 0), 0);
      const geminiTokensOutput = geminiMetrics.reduce((acc, m) => acc + (m.tokens_output || 0), 0);
      const geminiCusto = geminiMetrics.reduce((acc, m) => acc + (m.cost || 0), 0);

      // Render status
      const renderLatest = renderRes.data?.[0];
      const renderChamadas = (renderRes.data || []).reduce(
        (acc, m) => acc + (m.chamadas_dia || 0),
        0
      );

      // Cloudflare totais
      const cloudflareMetrics = cloudflareRes.data || [];
      const cloudflareRequests = cloudflareMetrics.reduce(
        (acc, m) => acc + (m.requests_dia || 0),
        0
      );
      const cloudflareWorkers = cloudflareMetrics.reduce(
        (acc, m) => acc + (m.workers_executados || 0),
        0
      );
      const cloudflareCusto = cloudflareMetrics.reduce(
        (acc, m) => acc + (m.custo_estimado || 0),
        0
      );

      // Supabase status
      const supabaseLatest = supabaseRes.data?.[0];

      // Calcular custo total
      const custoTotal =
        openaiCusto +
        geminiCusto +
        (renderLatest?.custo_mensal || 0) +
        cloudflareCusto +
        (supabaseLatest?.custo_estimado || 0);

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
          custo_mes: renderLatest?.custo_mensal || 0,
        },
        cloudflare: {
          requests_mes: cloudflareRequests,
          workers_executados: cloudflareWorkers,
          custo_mes: cloudflareCusto,
        },
        supabase: {
          leituras_total: supabaseLatest?.leituras_segundo || 0,
          escritas_total: supabaseLatest?.escritas_segundo || 0,
          storage_usado_percent:
            supabaseLatest && supabaseLatest.storage_limite_mb > 0
              ? (supabaseLatest.storage_usado_mb / supabaseLatest.storage_limite_mb) * 100
              : 0,
          custo_mes: supabaseLatest?.custo_estimado || 0,
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
          query = supabase
            .from("metrics_openai")
            .select("data, tokens_input, tokens_output, custo_estimado")
            .gte("data", startDate.toISOString().split("T")[0])
            .order("data", { ascending: true });
          break;
        case 'gemini':
          query = supabase
            .from("provider_metrics")
            .select("date, tokens_input, tokens_output, cost")
            .eq("provider", "gemini")
            .gte("date", startDate.toISOString().split("T")[0])
            .order("date", { ascending: true });
          break;
        case 'cloudflare':
          query = supabase
            .from("metrics_cloudflare")
            .select("data, requests_dia, custo_estimado")
            .gte("data", startDate.toISOString().split("T")[0])
            .order("data", { ascending: true });
          break;
        case 'render':
          query = supabase
            .from("metrics_render")
            .select("data, chamadas_dia, custo_mensal")
            .gte("data", startDate.toISOString().split("T")[0])
            .order("data", { ascending: true });
          break;
        case 'supabase':
          query = supabase
            .from("metrics_supabase")
            .select("data, leituras_segundo, escritas_segundo, custo_estimado")
            .gte("data", startDate.toISOString().split("T")[0])
            .order("data", { ascending: true });
          break;
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agregar por data
      const dailyMap = new Map<string, { valor: number; custo: number }>();

      data?.forEach((item: Record<string, unknown>) => {
        const dateStr = (item.data || item.date) as string;
        if (!dailyMap.has(dateStr)) {
          dailyMap.set(dateStr, { valor: 0, custo: 0 });
        }

        const current = dailyMap.get(dateStr)!;
        switch (source) {
          case 'openai':
            current.valor += ((item.tokens_input as number) || 0) + ((item.tokens_output as number) || 0);
            current.custo += (item.custo_estimado as number) || 0;
            break;
          case 'gemini':
            current.valor += ((item.tokens_input as number) || 0) + ((item.tokens_output as number) || 0);
            current.custo += (item.cost as number) || 0;
            break;
          case 'cloudflare':
            current.valor += (item.requests_dia as number) || 0;
            current.custo += (item.custo_estimado as number) || 0;
            break;
          case 'render':
            current.valor += (item.chamadas_dia as number) || 0;
            current.custo += (item.custo_mensal as number) || 0;
            break;
          case 'supabase':
            current.valor += ((item.leituras_segundo as number) || 0) + ((item.escritas_segundo as number) || 0);
            current.custo += (item.custo_estimado as number) || 0;
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
      const { error } = await supabase.from("metrics_openai").insert({
        ...data,
        custo_estimado: custo,
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
      const payload = {
        ...data,
        logs_erro: data.logs_erro as unknown as any,
      };
      const { error } = await supabase.from("metrics_render").insert([payload]);
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
      const { error } = await supabase.from("metrics_cloudflare").insert(data);
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
      const { error } = await supabase.from("metrics_supabase").insert(data);
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
