import fetch from "node-fetch";
import supabase from "./supabaseClient.js";

// =====================================================
// CONSTANTES E CONFIGURAÇÕES
// =====================================================

const PROVIDERS = ["openai", "gemini", "render", "cloudflare", "supabase"];

const TIMEOUT_MS = 3000; // 3 segundos de timeout para health checks

// Armazena tokens acumulados da sessão atual
const sessionMetrics = {
  openai: { tokens_input: 0, tokens_output: 0 },
  gemini: { tokens_input: 0, tokens_output: 0 },
  render: { requests: 0 },
  cloudflare: { requests: 0 },
  supabase: { reads: 0, writes: 0, storage_mb: 0 },
};

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

async function fetchWithTimeout(url, options, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getProviderConfig(provider) {
  try {
    // 1. Tentar buscar em lia_configurations (configurações globais LIA)
    const { data: liaConfig, error: liaError } = await supabase
      .from("lia_configurations")
      .select("metrics_settings")
      .limit(1)
      .maybeSingle();

    if (!liaError && liaConfig?.metrics_settings) {
      const settings = typeof liaConfig.metrics_settings === 'string'
        ? JSON.parse(liaConfig.metrics_settings)
        : liaConfig.metrics_settings;

      if (provider === "openai") {
        return {
          input_price_per_million: parseFloat(settings.openaiInputPrice) || 0.15,
          output_price_per_million: parseFloat(settings.openaiOutputPrice) || 0.60
        };
      }
      if (provider === "gemini") {
        return {
          input_price_per_million: parseFloat(settings.geminiInputPrice) || 0.075,
          output_price_per_million: parseFloat(settings.geminiOutputPrice) || 0.30
        };
      }
      if (provider === "cloudflare") {
        return {
          price_per_million_requests: parseFloat(settings.cloudflarePricePerRequest) || 0.50
        };
      }
    }

    // 2. Fallback para provider_config (antigo padrão)
    const { data, error } = await supabase
      .from("provider_config")
      .select("config")
      .eq("provider", provider)
      .single();

    if (!error && data?.config) {
      return data.config;
    }

    return null;
  } catch (err) {
    console.error(`[Metrics] Erro getProviderConfig ${provider}:`, err);
    return null;
  }
}

// =====================================================
// 1. FETCH PROVIDER STATUS
// =====================================================

export async function fetchProviderStatus() {
  console.log("[Metrics] Iniciando verificação de status dos provedores...");
  const results = [];

  // OpenAI - Test com chat/completions
  results.push(await checkOpenAI());

  // Gemini - Test with models list or simple generation
  results.push(await checkGemini());

  // Render - Health check do backend da LIA
  results.push(await checkRender());

  // Cloudflare - Verify token
  results.push(await checkCloudflare());

  // Supabase - REST API ping
  results.push(await checkSupabase());

  // Salvar todos os status no banco
  for (const status of results) {
    await saveProviderStatus(status);
  }

  console.log("[Metrics] Status dos provedores atualizado");
  return results;
}

async function checkOpenAI() {
  const provider = "openai";
  const startTime = Date.now();

  try {
    // Tentar pegar do banco primeiro
    const { data: config } = await supabase.from('lia_configurations').select('openai_api_key, metrics_settings').maybeSingle();
    let apiKey = process.env.OPENAI_API_KEY;

    if (config) {
      const settings = typeof config.metrics_settings === 'string' ? JSON.parse(config.metrics_settings) : config.metrics_settings;
      apiKey = settings?.openaiApiKey || config.openai_api_key || apiKey;
    }

    if (!apiKey) {
      return { provider, online: false, latency_ms: 0, error_message: "API key não configurada" };
    }

    const response = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: "ping" }],
          max_tokens: 1,
        }),
      }
    );

    const latency = Date.now() - startTime;
    const online = response.ok;

    return {
      provider,
      online,
      latency_ms: latency,
      error_message: online ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      provider,
      online: false,
      latency_ms: Date.now() - startTime,
      error_message: error.message,
    };
  }
}

async function checkGemini() {
  const provider = "gemini";
  const startTime = Date.now();

  try {
    // Tentar pegar do banco primeiro
    const { data: config } = await supabase.from('lia_configurations').select('metrics_settings').maybeSingle();
    let apiKey = process.env.GEMINI_API_KEY;

    if (config?.metrics_settings) {
      const settings = typeof config.metrics_settings === 'string' ? JSON.parse(config.metrics_settings) : config.metrics_settings;
      apiKey = settings?.geminiApiKey || apiKey;
    }

    if (!apiKey) {
      return { provider, online: false, latency_ms: 0, error_message: "API key não configurada" };
    }

    // Gemini simplicity test - list models
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET" }
    );

    const latency = Date.now() - startTime;
    const online = response.ok;

    return {
      provider,
      online,
      latency_ms: latency,
      error_message: online ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      provider,
      online: false,
      latency_ms: Date.now() - startTime,
      error_message: error.message,
    };
  }
}

async function checkRender() {
  const provider = "render";
  const startTime = Date.now();

  try {
    const renderUrl = process.env.RENDER_API_URL || "https://lia-chat-api.onrender.com";

    const response = await fetchWithTimeout(`${renderUrl}/health`, {
      method: "GET",
    });

    const latency = Date.now() - startTime;
    const online = response.ok;

    return {
      provider,
      online,
      latency_ms: latency,
      error_message: online ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      provider,
      online: false,
      latency_ms: Date.now() - startTime,
      error_message: error.message,
    };
  }
}

async function checkCloudflare() {
  const provider = "cloudflare";
  const startTime = Date.now();

  try {
    const apiKey = process.env.CLOUDFLARE_API_KEY;
    if (!apiKey) {
      return { provider, online: false, latency_ms: 0, error_message: "API key não configurada" };
    }

    const response = await fetchWithTimeout(
      "https://api.cloudflare.com/client/v4/user/tokens/verify",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const latency = Date.now() - startTime;
    const data = await response.json();
    const online = data.success === true;

    return {
      provider,
      online,
      latency_ms: latency,
      error_message: online ? null : data.errors?.[0]?.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      provider,
      online: false,
      latency_ms: Date.now() - startTime,
      error_message: error.message,
    };
  }
}

async function checkSupabase() {
  const provider = "supabase";
  const startTime = Date.now();

  try {
    const supabaseUrl = process.env.SUPABASE_URL || "https://byzcwpyzvywkfzpcmztr.supabase.co";
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseKey) {
      return { provider, online: false, latency_ms: 0, error_message: "API key não configurada" };
    }

    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const latency = Date.now() - startTime;
    const online = response.ok;

    return {
      provider,
      online,
      latency_ms: latency,
      error_message: online ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      provider,
      online: false,
      latency_ms: Date.now() - startTime,
      error_message: error.message,
    };
  }
}

async function saveProviderStatus(status) {
  try {
    const { error } = await supabase
      .from("provider_status")
      .upsert(
        {
          provider: status.provider,
          online: status.online,
          latency_ms: status.latency_ms,
          error_message: status.error_message,
          last_check: new Date().toISOString(),
        },
        { onConflict: "provider" }
      );

    if (error) {
      console.error(`[Metrics] Erro ao salvar status ${status.provider}:`, error.message);
    }
  } catch (err) {
    console.error(`[Metrics] Erro saveProviderStatus ${status.provider}:`, err);
  }
}

// =====================================================
// 2. FETCH PROVIDER USAGE
// =====================================================

export async function fetchProviderUsage() {
  console.log("[Metrics] Coletando uso dos provedores...");

  const usage = {
    openai: await fetchOpenAIUsage(),
    gemini: await fetchGeminiUsage(),
    render: await fetchRenderUsage(),
    cloudflare: await fetchCloudflareUsage(),
    supabase: await fetchSupabaseUsage(),
  };

  console.log("[Metrics] Uso dos provedores coletado");
  return usage;
}

async function fetchOpenAIUsage() {
  // Retorna os tokens acumulados na sessão
  // Os tokens são adicionados via trackOpenAIUsage() após cada chamada
  return {
    tokens_input: sessionMetrics.openai.tokens_input,
    tokens_output: sessionMetrics.openai.tokens_output,
  };
}

async function fetchGeminiUsage() {
  return {
    tokens_input: sessionMetrics.gemini.tokens_input,
    tokens_output: sessionMetrics.gemini.tokens_output,
  };
}

async function fetchRenderUsage() {
  // Retorna as requisições acumuladas na sessão
  return {
    requests: sessionMetrics.render.requests,
  };
}

async function fetchCloudflareUsage() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiKey = process.env.CLOUDFLARE_API_KEY;

  if (!zoneId || !apiKey) {
    return { requests: sessionMetrics.cloudflare.requests };
  }

  try {
    // Pegar analytics das últimas 24 horas
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const until = new Date().toISOString();

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/analytics/dashboard?since=${since}&until=${until}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("[Metrics] Cloudflare analytics não disponível");
      return { requests: sessionMetrics.cloudflare.requests };
    }

    const data = await response.json();
    const requests = data.result?.totals?.requests?.all || 0;

    return { requests };
  } catch (error) {
    console.error("[Metrics] Erro fetchCloudflareUsage:", error.message);
    return { requests: sessionMetrics.cloudflare.requests };
  }
}

async function fetchSupabaseUsage() {
  const projectId = process.env.SUPABASE_PROJECT_ID || "byzcwpyzvywkfzpcmztr";
  const managementKey = process.env.SUPABASE_MANAGEMENT_KEY;

  // Se não tem management key, usa métricas da sessão
  if (!managementKey) {
    return {
      reads: sessionMetrics.supabase.reads,
      writes: sessionMetrics.supabase.writes,
      storage_mb: sessionMetrics.supabase.storage_mb,
    };
  }

  try {
    // Supabase Management API para métricas de uso
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/database/usage`,
      {
        headers: {
          Authorization: `Bearer ${managementKey}`,
        },
      }
    );

    if (!response.ok) {
      console.warn("[Metrics] Supabase Management API não disponível");
      return {
        reads: sessionMetrics.supabase.reads,
        writes: sessionMetrics.supabase.writes,
        storage_mb: sessionMetrics.supabase.storage_mb,
      };
    }

    const data = await response.json();

    return {
      reads: data.db_reads || 0,
      writes: data.db_writes || 0,
      storage_mb: data.db_size_mb || 0,
    };
  } catch (error) {
    console.error("[Metrics] Erro fetchSupabaseUsage:", error.message);
    return {
      reads: sessionMetrics.supabase.reads,
      writes: sessionMetrics.supabase.writes,
      storage_mb: sessionMetrics.supabase.storage_mb,
    };
  }
}

// =====================================================
// 3. CALCULATE COSTS
// =====================================================

export async function calculateCosts(usage) {
  console.log("[Metrics] Calculando custos...");

  const costs = {};

  // OpenAI
  const openaiConfig = (await getProviderConfig("openai")) || {
    input_price_per_million: 0.15,
    output_price_per_million: 0.6,
  };
  costs.openai =
    (usage.openai.tokens_input / 1_000_000) * openaiConfig.input_price_per_million +
    (usage.openai.tokens_output / 1_000_000) * openaiConfig.output_price_per_million;

  // Gemini
  const geminiConfig = (await getProviderConfig("gemini")) || {
    input_price_per_million: 0.075,
    output_price_per_million: 0.3,
  };
  costs.gemini =
    (usage.gemini.tokens_input / 1_000_000) * geminiConfig.input_price_per_million +
    (usage.gemini.tokens_output / 1_000_000) * geminiConfig.output_price_per_million;

  // Render (custo fixo mensal / 30 dias)
  const renderConfig = (await getProviderConfig("render")) || {
    monthly_cost: 0,
  };
  costs.render = renderConfig.monthly_cost / 30;

  // Cloudflare
  const cloudflareConfig = (await getProviderConfig("cloudflare")) || {
    price_per_million_requests: 0.5,
    plan: "free",
  };
  if (cloudflareConfig.plan === "free") {
    costs.cloudflare = 0;
  } else {
    costs.cloudflare = (usage.cloudflare.requests / 1_000_000) * cloudflareConfig.price_per_million_requests;
  }

  // Supabase
  const supabaseConfig = (await getProviderConfig("supabase")) || {
    storage_price_per_gb: 0.021,
  };
  costs.supabase = (usage.supabase.storage_mb / 1024) * supabaseConfig.storage_price_per_gb;

  console.log("[Metrics] Custos calculados:", costs);
  return costs;
}

// =====================================================
// 4. SAVE METRICS
// =====================================================

export async function saveMetrics(usage, costs) {
  console.log("[Metrics] Salvando métricas...");

  const today = new Date().toISOString().split("T")[0];

  const metricsToSave = [
    {
      provider: "openai",
      date: today,
      tokens_input: usage.openai.tokens_input,
      tokens_output: usage.openai.tokens_output,
      cost: costs.openai,
    },
    {
      provider: "gemini",
      date: today,
      tokens_input: usage.gemini.tokens_input,
      tokens_output: usage.gemini.tokens_output,
      cost: costs.gemini,
    },
    {
      provider: "render",
      date: today,
      requests: usage.render.requests,
      cost: costs.render,
    },
    {
      provider: "cloudflare",
      date: today,
      requests: usage.cloudflare.requests,
      cost: costs.cloudflare,
    },
    {
      provider: "supabase",
      date: today,
      reads: usage.supabase.reads,
      writes: usage.supabase.writes,
      storage_mb: usage.supabase.storage_mb,
      cost: costs.supabase,
    },
  ];

  for (const metric of metricsToSave) {
    await upsertProviderMetric(metric);
  }

  // Resetar métricas da sessão após salvar
  resetSessionMetrics();

  console.log("[Metrics] Métricas salvas com sucesso");
}

async function upsertProviderMetric(metric) {
  try {
    // Primeiro, buscar o registro existente para o dia
    const { data: existing } = await supabase
      .from("provider_metrics")
      .select("*")
      .eq("provider", metric.provider)
      .eq("date", metric.date)
      .single();

    if (existing) {
      // Atualizar somando valores
      const updateData = {
        tokens_input: (existing.tokens_input || 0) + (metric.tokens_input || 0),
        tokens_output: (existing.tokens_output || 0) + (metric.tokens_output || 0),
        audio_minutes: (existing.audio_minutes || 0) + (metric.audio_minutes || 0),
        requests: (existing.requests || 0) + (metric.requests || 0),
        storage_mb: metric.storage_mb || existing.storage_mb || 0, // Storage não soma, usa o mais recente
        writes: (existing.writes || 0) + (metric.writes || 0),
        reads: (existing.reads || 0) + (metric.reads || 0),
        cost: (existing.cost || 0) + (metric.cost || 0),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("provider_metrics")
        .update(updateData)
        .eq("id", existing.id);

      if (error) {
        console.error(`[Metrics] Erro ao atualizar ${metric.provider}:`, error.message);
      }
    } else {
      // Inserir novo registro
      const { error } = await supabase.from("provider_metrics").insert({
        provider: metric.provider,
        date: metric.date,
        tokens_input: metric.tokens_input || 0,
        tokens_output: metric.tokens_output || 0,
        audio_minutes: metric.audio_minutes || 0,
        requests: metric.requests || 0,
        storage_mb: metric.storage_mb || 0,
        writes: metric.writes || 0,
        reads: metric.reads || 0,
        cost: metric.cost || 0,
      });

      if (error) {
        console.error(`[Metrics] Erro ao inserir ${metric.provider}:`, error.message);
      }
    }
  } catch (err) {
    console.error(`[Metrics] Erro upsertProviderMetric ${metric.provider}:`, err);
  }
}

function resetSessionMetrics() {
  sessionMetrics.openai = { tokens_input: 0, tokens_output: 0 };
  sessionMetrics.gemini = { tokens_input: 0, tokens_output: 0 };
  sessionMetrics.render = { requests: 0 };
  sessionMetrics.cloudflare = { requests: 0 };
  sessionMetrics.supabase = { reads: 0, writes: 0, storage_mb: 0 };
}

// =====================================================
// 5. TRACKING FUNCTIONS (chamadas após cada uso)
// =====================================================

export function trackOpenAIUsage(tokensInput, tokensOutput) {
  sessionMetrics.openai.tokens_input += tokensInput;
  sessionMetrics.openai.tokens_output += tokensOutput;

  // Log para debug
  console.log(`[Track] OpenAI: +${tokensInput} input, +${tokensOutput} output`);

  // Salvar log individual
  logProviderUsage("openai", "tokens", tokensInput + tokensOutput, {
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
  });
}

export function trackGeminiUsage(tokensInput, tokensOutput) {
  sessionMetrics.gemini.tokens_input += tokensInput;
  sessionMetrics.gemini.tokens_output += tokensOutput;

  console.log(`[Track] Gemini: +${tokensInput} input, +${tokensOutput} output`);

  logProviderUsage("gemini", "tokens", tokensInput + tokensOutput, {
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
  });
}

export function trackRenderRequest() {
  sessionMetrics.render.requests += 1;

  console.log(`[Track] Render: +1 request`);

  logProviderUsage("render", "request", 1, {});
}

export function trackSupabaseOperation(type, count = 1) {
  if (type === "read") {
    sessionMetrics.supabase.reads += count;
  } else if (type === "write") {
    sessionMetrics.supabase.writes += count;
  }

  console.log(`[Track] Supabase: +${count} ${type}`);

  logProviderUsage("supabase", type, count, {});
}

async function logProviderUsage(provider, metricType, value, metadata) {
  try {
    await supabase.from("provider_usage_log").insert({
      provider,
      metric_type: metricType,
      value,
      metadata,
    });
  } catch (err) {
    // Silencioso - não bloquear por erro de log
  }
}

// =====================================================
// 6. RUN ALL METRICS (Cron Job Function)
// =====================================================

export async function runMetricsCollection() {
  console.log("[Metrics] ========================================");
  console.log("[Metrics] Iniciando coleta de métricas...");
  console.log("[Metrics] ========================================");

  try {
    // 1. Verificar status dos provedores
    const status = await fetchProviderStatus();

    // 2. Coletar uso
    const usage = await fetchProviderUsage();

    // 3. Calcular custos
    const costs = await calculateCosts(usage);

    // 4. Salvar métricas
    await saveMetrics(usage, costs);

    console.log("[Metrics] ========================================");
    console.log("[Metrics] Coleta de métricas concluída com sucesso!");
    console.log("[Metrics] ========================================");

    return { success: true, status, usage, costs };
  } catch (error) {
    console.error("[Metrics] Erro na coleta de métricas:", error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// 7. GET METRICS (para API)
// =====================================================

export async function getProviderMetrics(provider = null, days = 30) {
  try {
    let query = supabase
      .from("provider_metrics")
      .select("*")
      .gte("date", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: false });

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Metrics] Erro getProviderMetrics:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[Metrics] Erro getProviderMetrics:", err);
    return [];
  }
}

export async function getProviderStatus() {
  try {
    const { data, error } = await supabase
      .from("provider_status")
      .select("*");

    if (error) {
      console.error("[Metrics] Erro getProviderStatus:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[Metrics] Erro getProviderStatus:", err);
    return [];
  }
}

export async function getMonthlyProjection() {
  try {
    // Pegar métricas dos últimos 7 dias para projeção
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("provider_metrics")
      .select("provider, cost, date")
      .gte("date", sevenDaysAgo);

    if (error || !data || data.length === 0) {
      return { total: 0, byProvider: {} };
    }

    // Calcular média diária por provedor
    const dailyAverages = {};
    const dayCounts = {};

    for (const row of data) {
      if (!dailyAverages[row.provider]) {
        dailyAverages[row.provider] = 0;
        dayCounts[row.provider] = new Set();
      }
      dailyAverages[row.provider] += parseFloat(row.cost) || 0;
      dayCounts[row.provider].add(row.date);
    }

    const projection = {};
    let total = 0;

    for (const provider of PROVIDERS) {
      const days = dayCounts[provider]?.size || 1;
      const avg = (dailyAverages[provider] || 0) / days;
      const monthly = avg * 30;
      projection[provider] = monthly;
      total += monthly;
    }

    return { total, byProvider: projection };
  } catch (err) {
    console.error("[Metrics] Erro getMonthlyProjection:", err);
    return { total: 0, byProvider: {} };
  }
}

export async function getTodaySummary() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("provider_metrics")
      .select("*")
      .eq("date", today);

    if (error) {
      console.error("[Metrics] Erro getTodaySummary:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[Metrics] Erro getTodaySummary:", err);
    return [];
  }
}

// Exportações atualizadas
export {
  runMetricsCollection,
  trackOpenAIUsage,
  trackGeminiUsage,
  trackRenderRequest, // Corrigido nome para coincidir com a declaração
  trackSupabaseOperation,
  getProviderStatus,
  sessionMetrics
};
