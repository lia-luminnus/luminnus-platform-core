/**
 * Cliente de API para métricas do backend
 * Agora unificado para consultar diretamente o Supabase
 */

import { supabase } from "@/integrations/supabase/client";

// =====================================================
// TIPOS
// =====================================================

export interface ProviderMetric {
  provider: string;
  tokens_input: number;
  tokens_output: number;
  audio_minutes: number;
  requests: number;
  storage_mb: number;
  writes: number;
  reads: number;
  cost: number;
}

export interface ProviderStatus {
  provider: string;
  online: boolean;
  latency_ms: number;
  last_check: string;
  error_message?: string;
}

export interface MonthlyProjection {
  total: number;
  byProvider: Record<string, number>;
}

export interface MetricsHistoryItem {
  date: string;
  openai: { tokens: number; cost: number };
  gemini: { tokens: number; cost: number };
  render: { requests: number; cost: number };
  cloudflare: { requests: number; cost: number };
  supabase: { storage_mb: number; reads: number; writes: number; cost: number };
  total_cost: number;
}

export interface ProviderConfig {
  provider: string;
  config: Record<string, unknown>;
  updated_at: string;
}

// =====================================================
// FUNÇÕES DA API (Consultando Supabase Diretamente)
// =====================================================

/**
 * Buscar métricas agregadas de todos os provedores
 */
export async function getProvidersMetrics(
  days: number = 30
): Promise<ProviderMetric[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("provider_metrics")
    .select("*")
    .gte("date", startDate.toISOString().split("T")[0]);

  if (error) throw error;

  // Agrupar por provedor
  const aggregated: Record<string, ProviderMetric> = {};

  (data || []).forEach(m => {
    if (!aggregated[m.provider]) {
      aggregated[m.provider] = {
        provider: m.provider,
        tokens_input: 0,
        tokens_output: 0,
        audio_minutes: 0,
        requests: 0,
        storage_mb: 0,
        writes: 0,
        reads: 0,
        cost: 0
      };
    }
    const target = aggregated[m.provider];
    target.tokens_input += m.tokens_input || 0;
    target.tokens_output += m.tokens_output || 0;
    target.requests += m.requests || 0;
    target.reads += m.reads || 0;
    target.writes += m.writes || 0;
    target.cost += m.cost || 0;
    target.storage_mb = Math.max(target.storage_mb, m.storage_mb || 0);
  });

  return Object.values(aggregated);
}

/**
 * Buscar métricas detalhadas de um provedor específico
 */
export async function getProviderMetrics(
  provider: string,
  days: number = 30
): Promise<Record<string, unknown>[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await (supabase as any)
    .from("provider_metrics")
    .select("*")
    .eq("provider", provider)
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) throw error;
  return data as any[];
}

/**
 * Buscar status de todos os provedores
 */
export async function getProvidersStatus(): Promise<ProviderStatus[]> {
  const { data, error } = await (supabase as any)
    .from("provider_status")
    .select("*")
    .order("provider", { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as ProviderStatus[];
}

/**
 * Buscar projeção mensal de custos
 */
export async function getMonthlyProjection(): Promise<MonthlyProjection> {
  const { data, error } = await (supabase as any)
    .from("provider_metrics")
    .select("provider, cost, date")
    .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  if (error || !data) return { total: 0, byProvider: {} };

  const dailyAverages: Record<string, number> = {};
  const dayCounts: Record<string, Set<string>> = {};

  data.forEach(row => {
    if (!dailyAverages[row.provider]) {
      dailyAverages[row.provider] = 0;
      dayCounts[row.provider] = new Set();
    }
    dailyAverages[row.provider] += row.cost || 0;
    dayCounts[row.provider].add(row.date);
  });

  const projection: Record<string, number> = {};
  let total = 0;

  Object.keys(dailyAverages).forEach(provider => {
    const days = dayCounts[provider].size || 1;
    const avg = dailyAverages[provider] / days;
    const monthly = avg * 30;
    projection[provider] = monthly;
    total += monthly;
  });

  return { total, byProvider: projection };
}

/**
 * Buscar métricas de hoje
 */
export async function getTodayMetrics(): Promise<ProviderMetric[]> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await (supabase as any)
    .from("provider_metrics")
    .select("*")
    .eq("date", today);

  if (error) throw error;
  return (data || []) as unknown as ProviderMetric[];
}

/**
 * Buscar histórico de métricas para gráficos
 */
export async function getMetricsHistory(
  days: number = 30,
  provider?: string
): Promise<MetricsHistoryItem[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = (supabase as any)
    .from("provider_metrics")
    .select("*")
    .gte("date", startDate.toISOString().split("T")[0]);

  if (provider) {
    query = query.eq("provider", provider);
  }

  const { data, error } = await query.order("date", { ascending: true });

  if (error) throw error;

  const historyMap: Record<string, MetricsHistoryItem> = {};

  (data || []).forEach(m => {
    if (!historyMap[m.date]) {
      historyMap[m.date] = {
        date: m.date,
        openai: { tokens: 0, cost: 0 },
        gemini: { tokens: 0, cost: 0 },
        render: { requests: 0, cost: 0 },
        cloudflare: { requests: 0, cost: 0 },
        supabase: { storage_mb: 0, reads: 0, writes: 0, cost: 0 },
        total_cost: 0
      };
    }

    const item = historyMap[m.date];
    item.total_cost += m.cost || 0;

    if (m.provider === 'openai') {
      item.openai.tokens += (m.tokens_input || 0) + (m.tokens_output || 0);
      item.openai.cost += m.cost || 0;
    } else if (m.provider === 'gemini') {
      item.gemini.tokens += (m.tokens_input || 0) + (m.tokens_output || 0);
      item.gemini.cost += m.cost || 0;
    } else if (m.provider === 'render') {
      item.render.requests += m.requests || 0;
      item.render.cost += m.cost || 0;
    } else if (m.provider === 'cloudflare') {
      item.cloudflare.requests += m.requests || 0;
      item.cloudflare.cost += m.cost || 0;
    } else if (m.provider === 'supabase') {
      item.supabase.storage_mb = Math.max(item.supabase.storage_mb, m.storage_mb || 0);
      item.supabase.reads += m.reads || 0;
      item.supabase.writes += m.writes || 0;
      item.supabase.cost += m.cost || 0;
    }
  });

  return Object.values(historyMap);
}

/**
 * Atualizar métricas manualmente
 */
export async function refreshMetrics(): Promise<{
  success: boolean;
  message: string;
}> {
  return {
    success: true,
    message: "Métricas atualizadas via Supabase Realtime",
  };
}

/**
 * Buscar configurações dos provedores
 */
export async function getProvidersConfig(): Promise<ProviderConfig[]> {
  const { data, error } = await (supabase as any)
    .from("lia_configurations")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return [
    {
      provider: "lia_global",
      config: data as any,
      updated_at: data?.updated_at || new Date().toISOString()
    }
  ];
}

/**
 * Atualizar configuração de um provedor
 */
export async function updateProviderConfig(
  provider: string,
  config: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  // Buscar a primeira configuração
  const { data: current } = await (supabase as any).from("lia_configurations").select("id").limit(1).maybeSingle();

  if (!current) throw new Error("Configuração não encontrada");

  const { error } = await (supabase as any)
    .from("lia_configurations")
    .update(config)
    .eq("id", current.id);

  if (error) throw error;

  return { success: true, message: "Configuração atualizada com sucesso" };
}
