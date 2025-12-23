/**
 * Tipos TypeScript para as tabelas de métricas
 * Métricas de consumo de: OpenAI, Cartesia, Render, Cloudflare, Supabase
 */

// =====================================================
// TIPOS BASE
// =====================================================

export interface BaseMetric {
  id: string;
  data: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// OPENAI METRICS
// =====================================================

export interface MetricsOpenAI extends BaseMetric {
  empresa_id: string | null;
  usuario_id: string | null;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  custo_estimado: number;
  modelo: string;
}

export interface MetricsOpenAIInsert {
  empresa_id?: string | null;
  usuario_id?: string | null;
  tokens_input: number;
  tokens_output: number;
  custo_estimado?: number;
  modelo?: string;
  data?: string;
}

// =====================================================
// CARTESIA METRICS (TTS)
// =====================================================

export interface MetricsCartesia extends BaseMetric {
  empresa_id: string | null;
  usuario_id: string | null;
  caracteres_enviados: number;
  creditos_usados: number;
  creditos_restantes: number;
  minutos_fala: number;
  custo_estimado: number;
}

export interface MetricsCartesiaInsert {
  empresa_id?: string | null;
  usuario_id?: string | null;
  caracteres_enviados: number;
  creditos_usados?: number;
  creditos_restantes?: number;
  custo_estimado?: number;
  data?: string;
}

// =====================================================
// RENDER METRICS
// =====================================================

export type RenderStatus = 'online' | 'offline' | 'degraded';
export type RenderInstanceType = 'Starter' | 'Standard' | 'Pro' | 'Pro Plus' | 'Pro Max' | 'Pro Ultra';

export interface RenderErrorLog {
  timestamp: string;
  message: string;
  code: string | number;
  endpoint?: string;
}

export interface MetricsRender extends BaseMetric {
  status: RenderStatus;
  tempo_resposta_ms: number;
  cpu_percent: number;
  ram_percent: number;
  chamadas_dia: number;
  erros_500: number;
  erros_4xx: number;
  logs_erro: RenderErrorLog[];
  instancia_tipo: string;
  custo_mensal: number;
}

export interface MetricsRenderInsert {
  status?: RenderStatus;
  tempo_resposta_ms?: number;
  cpu_percent?: number;
  ram_percent?: number;
  chamadas_dia: number;
  erros_500?: number;
  erros_4xx?: number;
  logs_erro?: RenderErrorLog[];
  instancia_tipo?: string;
  custo_mensal?: number;
  data?: string;
}

// =====================================================
// CLOUDFLARE METRICS
// =====================================================

export type CloudflarePlan = 'free' | 'pro' | 'business' | 'enterprise';

export interface TrafegoRota {
  [rota: string]: number;
}

export interface MetricsCloudflare extends BaseMetric {
  empresa_id: string | null;
  requests_dia: number;
  tempo_execucao_ms: number;
  erros_4xx: number;
  erros_5xx: number;
  workers_executados: number;
  trafego_rota: TrafegoRota;
  custo_estimado: number;
  plano: CloudflarePlan;
}

export interface MetricsCloudflareInsert {
  empresa_id?: string | null;
  requests_dia: number;
  tempo_execucao_ms?: number;
  erros_4xx?: number;
  erros_5xx?: number;
  workers_executados?: number;
  trafego_rota?: TrafegoRota;
  custo_estimado?: number;
  plano?: CloudflarePlan;
  data?: string;
}

// =====================================================
// SUPABASE METRICS
// =====================================================

export interface ConsumoTabela {
  [tabela: string]: {
    leituras: number;
    escritas: number;
    tamanho_mb: number;
  };
}

export interface MetricsSupabase extends BaseMetric {
  leituras_segundo: number;
  escritas_segundo: number;
  consumo_tabela: ConsumoTabela;
  tamanho_banco_mb: number;
  conexoes_abertas: number;
  taxa_erros: number;
  consultas_lentas: number;
  storage_usado_mb: number;
  storage_limite_mb: number;
  custo_estimado: number;
}

export interface MetricsSupabaseInsert {
  leituras_segundo?: number;
  escritas_segundo?: number;
  consumo_tabela?: ConsumoTabela;
  tamanho_banco_mb?: number;
  conexoes_abertas?: number;
  taxa_erros?: number;
  consultas_lentas?: number;
  storage_usado_mb?: number;
  storage_limite_mb?: number;
  custo_estimado?: number;
  data?: string;
}

// =====================================================
// METRICS SUMMARY
// =====================================================

export type MetricsFonte = 'openai' | 'cartesia' | 'render' | 'cloudflare' | 'supabase';
export type MetricsPeriodo = 'diario' | 'semanal' | 'mensal';

export interface MetricsSummary extends BaseMetric {
  empresa_id: string | null;
  usuario_id: string | null;
  fonte: MetricsFonte;
  quantidade: number;
  custo: number;
  detalhes: Record<string, unknown>;
  periodo: MetricsPeriodo;
}

export interface MetricsSummaryInsert {
  empresa_id?: string | null;
  usuario_id?: string | null;
  fonte: MetricsFonte;
  quantidade: number;
  custo?: number;
  detalhes?: Record<string, unknown>;
  periodo?: MetricsPeriodo;
  data?: string;
}

// =====================================================
// METRICS ALERTS
// =====================================================

export type AlertNivel = 'info' | 'warning' | 'critical';

export interface MetricsAlert {
  id: string;
  fonte: MetricsFonte;
  tipo_alerta: string;
  mensagem: string;
  nivel: AlertNivel;
  valor_atual: number;
  valor_limite: number;
  resolvido: boolean;
  resolvido_em: string | null;
  created_at: string;
}

export interface MetricsAlertInsert {
  fonte: MetricsFonte;
  tipo_alerta: string;
  mensagem: string;
  nivel?: AlertNivel;
  valor_atual?: number;
  valor_limite?: number;
  resolvido?: boolean;
}

// =====================================================
// AGGREGATED DATA TYPES (para gráficos e tabelas)
// =====================================================

export interface DailyMetric {
  data: string;
  valor: number;
  custo?: number;
}

export interface MetricsByCompany {
  empresa_id: string;
  empresa_nome: string;
  total: number;
  custo: number;
  percentual: number;
}

export interface MetricsByUser {
  usuario_id: string;
  usuario_nome: string;
  empresa_nome?: string;
  total: number;
  custo: number;
}

export interface MonthlyProjection {
  mes: string;
  consumo_atual: number;
  projecao_final: number;
  percentual_usado: number;
  dias_restantes: number;
}

// =====================================================
// STATUS INDICATORS
// =====================================================

export type StatusIndicator = 'green' | 'yellow' | 'red';

export interface ProviderStatus {
  provider: MetricsFonte;
  status: StatusIndicator;
  message: string;
  lastUpdate: string;
}

// =====================================================
// DASHBOARD SUMMARY
// =====================================================

export interface DashboardMetricsSummary {
  openai: {
    tokens_mes: number;
    custo_mes: number;
    variacao_percentual: number;
  };
  cartesia: {
    creditos_usados: number;
    creditos_restantes: number;
    minutos_fala: number;
    custo_mes: number;
  };
  render: {
    status: RenderStatus;
    uptime_percent: number;
    chamadas_mes: number;
    custo_mes: number;
  };
  cloudflare: {
    requests_mes: number;
    workers_executados: number;
    custo_mes: number;
  };
  supabase: {
    leituras_total: number;
    escritas_total: number;
    storage_usado_percent: number;
    custo_mes: number;
  };
  custo_total_mes: number;
  projecao_fim_mes: number;
}

// =====================================================
// COST CALCULATION HELPERS
// =====================================================

export const OPENAI_PRICES = {
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000,  // $0.15 per 1M tokens
    output: 0.60 / 1_000_000, // $0.60 per 1M tokens
  },
} as const;

export const CARTESIA_CHARS_PER_MINUTE = 850;

export const RENDER_INSTANCE_PRICES: Record<string, number> = {
  'Starter': 0,
  'Standard': 7,
  'Pro': 25,
  'Pro Plus': 85,
  'Pro Max': 175,
  'Pro Ultra': 450,
};

export const CLOUDFLARE_PRICES = {
  requests_per_million: 0.50,
  free_tier_requests: 100_000,
};

export const SUPABASE_PRICES = {
  storage_per_gb: 0.021, // $0.021/GB per month
  bandwidth_per_gb: 0.09,
};

// =====================================================
// ALERT THRESHOLDS
// =====================================================

export const ALERT_THRESHOLDS = {
  openai: {
    monthly_70_percent: 0.70,
    monthly_90_percent: 0.90,
    monthly_100_percent: 1.00,
  },
  cartesia: {
    credits_20_percent: 0.20,
    credits_10_percent: 0.10,
    abnormal_consumption: 2.0, // 2x média diária
  },
  render: {
    instability_24h: 3, // 3+ eventos em 24h
    error_500_threshold: 5, // 5+ erros 500 por hora
  },
  cloudflare: {
    worker_limit: 100_000, // requests por dia (free tier)
    throttling_threshold: 0.95,
  },
  supabase: {
    storage_90_percent: 0.90,
    slow_query_threshold: 10, // 10+ consultas lentas por hora
  },
};
