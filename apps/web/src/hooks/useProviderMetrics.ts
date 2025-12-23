/**
 * Hook para métricas de provedores via API do backend
 * Usa o sistema de coleta real de métricas dos provedores
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProvidersMetrics,
  getProviderMetrics,
  getProvidersStatus,
  getMonthlyProjection,
  getTodayMetrics,
  getMetricsHistory,
  refreshMetrics,
  getProvidersConfig,
  updateProviderConfig,
  ProviderMetric,
  ProviderStatus,
  MonthlyProjection,
  MetricsHistoryItem,
  ProviderConfig,
} from "@/lib/api/metrics";
import { useToast } from "@/hooks/use-toast";

// =====================================================
// HOOKS DE LEITURA
// =====================================================

/**
 * Hook para buscar métricas agregadas de todos os provedores
 */
export function useProvidersMetrics(days: number = 30) {
  return useQuery({
    queryKey: ["provider_metrics", days],
    queryFn: () => getProvidersMetrics(days),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 5, // Refetch a cada 5 minutos
  });
}

/**
 * Hook para buscar métricas de um provedor específico
 */
export function useProviderMetrics(provider: string, days: number = 30) {
  return useQuery({
    queryKey: ["provider_metrics", provider, days],
    queryFn: () => getProviderMetrics(provider, days),
    staleTime: 1000 * 60 * 5,
    enabled: !!provider,
  });
}

/**
 * Hook para buscar status de todos os provedores
 */
export function useProvidersStatus() {
  return useQuery({
    queryKey: ["provider_status"],
    queryFn: getProvidersStatus,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refetch a cada 1 minuto
  });
}

/**
 * Hook para buscar projeção mensal
 */
export function useMonthlyProjection() {
  return useQuery({
    queryKey: ["monthly_projection"],
    queryFn: getMonthlyProjection,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para buscar métricas de hoje
 */
export function useTodayMetrics() {
  return useQuery({
    queryKey: ["today_metrics"],
    queryFn: getTodayMetrics,
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 2,
  });
}

/**
 * Hook para buscar histórico de métricas (para gráficos)
 */
export function useMetricsHistory(days: number = 30, provider?: string) {
  return useQuery({
    queryKey: ["metrics_history", days, provider],
    queryFn: () => getMetricsHistory(days, provider),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook para buscar configurações dos provedores
 */
export function useProvidersConfig() {
  return useQuery({
    queryKey: ["providers_config"],
    queryFn: getProvidersConfig,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para atualizar métricas manualmente
 */
export function useRefreshMetrics() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: refreshMetrics,
    onSuccess: (data) => {
      // Invalidar todas as queries de métricas
      queryClient.invalidateQueries({ queryKey: ["provider_metrics"] });
      queryClient.invalidateQueries({ queryKey: ["provider_status"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_projection"] });
      queryClient.invalidateQueries({ queryKey: ["today_metrics"] });
      queryClient.invalidateQueries({ queryKey: ["metrics_history"] });

      toast({
        title: "Sucesso",
        description: data.message || "Métricas atualizadas com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar métricas",
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para atualizar configuração de um provedor
 */
export function useUpdateProviderConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      provider,
      config,
    }: {
      provider: string;
      config: Record<string, unknown>;
    }) => updateProviderConfig(provider, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers_config"] });
      toast({
        title: "Sucesso",
        description: "Configuração atualizada com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configuração",
        variant: "destructive",
      });
    },
  });
}

// =====================================================
// HOOK COMBINADO PARA DASHBOARD
// =====================================================

/**
 * Hook combinado para o dashboard de métricas
 * Retorna todos os dados necessários em um único hook
 */
export function useProviderDashboard() {
  const metrics = useProvidersMetrics();
  const status = useProvidersStatus();
  const projection = useMonthlyProjection();
  const today = useTodayMetrics();
  const history = useMetricsHistory();
  const refreshMutation = useRefreshMetrics();

  // Calcular totais
  const totals = {
    cost: metrics.data?.reduce((acc, m) => acc + m.cost, 0) || 0,
    tokens: metrics.data?.reduce((acc, m) => acc + m.tokens_input + m.tokens_output, 0) || 0,
    audioMinutes: metrics.data?.reduce((acc, m) => acc + m.audio_minutes, 0) || 0,
    requests: metrics.data?.reduce((acc, m) => acc + m.requests, 0) || 0,
    storageMb: metrics.data?.find((m) => m.provider === "supabase")?.storage_mb || 0,
  };

  // Mapear status por provedor
  const statusByProvider: Record<string, ProviderStatus> = {};
  status.data?.forEach((s) => {
    statusByProvider[s.provider] = s;
  });

  // Verificar se todos os provedores estão online
  const allOnline = status.data?.every((s) => s.online) ?? true;
  const onlineCount = status.data?.filter((s) => s.online).length ?? 0;
  const totalProviders = status.data?.length ?? 5;

  return {
    // Dados
    metrics: metrics.data || [],
    status: status.data || [],
    statusByProvider,
    projection: projection.data || { total: 0, byProvider: {} },
    today: today.data || [],
    history: history.data || [],
    totals,

    // Status gerais
    allOnline,
    onlineCount,
    totalProviders,

    // Estados de loading/error
    isLoading: metrics.isLoading || status.isLoading || projection.isLoading,
    isError: metrics.isError || status.isError || projection.isError,
    error: metrics.error || status.error || projection.error,

    // Ações
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,

    // Refetch individual
    refetchMetrics: metrics.refetch,
    refetchStatus: status.refetch,
    refetchProjection: projection.refetch,
  };
}

// Exportar tipos
export type {
  ProviderMetric,
  ProviderStatus,
  MonthlyProjection,
  MetricsHistoryItem,
  ProviderConfig,
};
