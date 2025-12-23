/**
 * Cliente de API para métricas do backend
 * Integração com o sistema de coleta de métricas dos provedores
 */

import { supabase } from "@/integrations/supabase/client";

// URL base da API do backend
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://lia-chat-api.onrender.com";

/**
 * Função auxiliar para fazer requisições autenticadas
 */
async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Usuário não autenticado");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// =====================================================
// TIPOS
// =====================================================

export interface ProviderMetric {
  provider: "openai" | "cartesia" | "render" | "cloudflare" | "supabase";
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
  byProvider: {
    openai?: number;
    cartesia?: number;
    render?: number;
    cloudflare?: number;
    supabase?: number;
  };
}

export interface MetricsHistoryItem {
  date: string;
  openai: { tokens: number; cost: number };
  cartesia: { minutes: number; cost: number };
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// =====================================================
// FUNÇÕES DA API
// =====================================================

/**
 * Buscar métricas agregadas de todos os provedores
 */
export async function getProvidersMetrics(
  days: number = 30
): Promise<ProviderMetric[]> {
  const response = await fetchWithAuth<ApiResponse<ProviderMetric[]>>(
    `/api/metrics/providers?days=${days}`
  );
  return response.data || [];
}

/**
 * Buscar métricas detalhadas de um provedor específico
 */
export async function getProviderMetrics(
  provider: string,
  days: number = 30
): Promise<Record<string, unknown>[]> {
  const response = await fetchWithAuth<ApiResponse<Record<string, unknown>[]>>(
    `/api/metrics/provider/${provider}?days=${days}`
  );
  return response.data || [];
}

/**
 * Buscar status de todos os provedores
 */
export async function getProvidersStatus(): Promise<ProviderStatus[]> {
  const response = await fetchWithAuth<ApiResponse<ProviderStatus[]>>(
    `/api/metrics/status`
  );
  return response.data || [];
}

/**
 * Buscar projeção mensal de custos
 */
export async function getMonthlyProjection(): Promise<MonthlyProjection> {
  const response = await fetchWithAuth<ApiResponse<MonthlyProjection>>(
    `/api/metrics/monthly`
  );
  return response.data || { total: 0, byProvider: {} };
}

/**
 * Buscar métricas de hoje
 */
export async function getTodayMetrics(): Promise<ProviderMetric[]> {
  const response = await fetchWithAuth<ApiResponse<ProviderMetric[]>>(
    `/api/metrics/today`
  );
  return response.data || [];
}

/**
 * Buscar histórico de métricas para gráficos
 */
export async function getMetricsHistory(
  days: number = 30,
  provider?: string
): Promise<MetricsHistoryItem[]> {
  let url = `/api/metrics/history?days=${days}`;
  if (provider) {
    url += `&provider=${provider}`;
  }
  const response = await fetchWithAuth<ApiResponse<MetricsHistoryItem[]>>(url);
  return response.data || [];
}

/**
 * Atualizar métricas manualmente
 */
export async function refreshMetrics(): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetchWithAuth<{
    success: boolean;
    message: string;
    data?: unknown;
  }>(`/api/metrics/refresh`, {
    method: "POST",
  });
  return {
    success: response.success,
    message: response.message || "Métricas atualizadas",
  };
}

/**
 * Buscar configurações dos provedores
 */
export async function getProvidersConfig(): Promise<ProviderConfig[]> {
  const response = await fetchWithAuth<ApiResponse<ProviderConfig[]>>(
    `/api/providers/config`
  );
  return response.data || [];
}

/**
 * Atualizar configuração de um provedor
 */
export async function updateProviderConfig(
  provider: string,
  config: Record<string, unknown>
): Promise<{ success: boolean; message: string }> {
  const response = await fetchWithAuth<{ success: boolean; message: string }>(
    `/api/providers/config/${provider}`,
    {
      method: "PUT",
      body: JSON.stringify({ config }),
    }
  );
  return response;
}
