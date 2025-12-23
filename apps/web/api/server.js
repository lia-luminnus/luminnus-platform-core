import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import cron from "node-cron";
import {
  runMetricsCollection,
  trackOpenAIUsage,
  trackGeminiUsage,
  trackRenderRequest,
  trackSupabaseOperation,
  getProviderMetrics,
  getProviderStatus,
  getMonthlyProjection,
  getTodaySummary,
  fetchProviderStatus,
} from "./lib/metricsCollector.js";
import supabase from "./lib/supabaseClient.js";
import crypto from "crypto";

const app = express();

// CORS configurado para aceitar todas as origens (desenvolvimento)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// =====================================================
// MIDDLEWARE: Log de requisições e tracking do Render
// =====================================================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);

  // Tracking de requisições do Render
  if (req.path !== "/health" && req.path !== "/") {
    trackRenderRequest();
  }

  next();
});

// =====================================================
// MIDDLEWARE: Autenticação Admin (para rotas sensíveis)
// =====================================================
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Token inválido" });
    }

    // Verificar se é admin
    if (user.email !== "luminnus.lia.ai@gmail.com") {
      return res.status(403).json({ error: "Acesso negado. Apenas admin." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("[Auth] Erro:", err);
    res.status(500).json({ error: "Erro de autenticação" });
  }
}

// =====================================================
// ROTAS BÁSICAS
// =====================================================

app.get("/", (req, res) => res.send("LIA Chat API ativa!"));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "API está online",
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// ROTAS DE CHAT (OpenAI)
// =====================================================

app.post("/chat", async (req, res) => {
  try {
    console.log("[API] Nova requisição /chat recebida");

    const { message } = req.body;
    if (!message) {
      console.error("[API] Mensagem não fornecida");
      return res.status(400).json({ error: "Mensagem não fornecida." });
    }

    console.log("[API] Enviando para OpenAI:", message);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é a LIA, uma assistente virtual inteligente e prestativa da plataforma Luminnus." },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[API] Erro OpenAI:", response.status, response.statusText);
      return res.status(response.status).json({
        error: `Erro da OpenAI: ${response.statusText}`
      });
    }

    const data = await response.json();
    console.log("[API] Resposta da OpenAI recebida");

    // Track de tokens
    if (data.usage) {
      trackOpenAIUsage(
        data.usage.prompt_tokens || 0,
        data.usage.completion_tokens || 0
      );
    }

    const reply = data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    console.log("[API] Enviando resposta ao cliente");
    res.json({ reply });
  } catch (error) {
    console.error("[API] Erro:", error);
    res.status(500).json({
      error: "Erro interno no servidor.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// =====================================================
// ROTAS DE VOZ (OpenAI Realtime)
// =====================================================

app.post("/session", async (req, res) => {
  try {
    console.log("[Realtime] Solicitando ephemeral token...");

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: "Você é a LIA, uma assistente virtual inteligente e prestativa da plataforma Luminnus. Responda de forma clara, simpática e objetiva.",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Realtime] Erro ao obter token:", response.status, errorText);
      return res.status(response.status).json({
        error: "Erro ao criar sessão de voz",
        details: errorText
      });
    }

    const data = await response.json();
    console.log("[Realtime] Token efêmero criado com sucesso");

    res.json({
      client_secret: data.client_secret.value,
      expires_at: data.expires_at
    });
  } catch (error) {
    console.error("[Realtime] Erro:", error);
    res.status(500).json({
      error: "Erro ao criar sessão",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post("/proxy-realtime", async (req, res) => {
  try {
    console.log("[Proxy Realtime] Recebendo requisição SDP...");

    const { sdp, client_secret } = req.body;

    if (!sdp || !client_secret) {
      console.error("[Proxy Realtime] SDP ou client_secret ausente");
      return res.status(400).json({
        error: "SDP e client_secret são obrigatórios"
      });
    }

    console.log("[Proxy Realtime] Enviando SDP para OpenAI...");

    const response = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${client_secret}`,
          "Content-Type": "application/sdp",
        },
        body: sdp,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Proxy Realtime] Erro da OpenAI:", response.status, errorText);
      return res.status(response.status).json({
        error: "Erro ao conectar WebRTC com OpenAI",
        details: errorText
      });
    }

    const answerSdp = await response.text();
    console.log("[Proxy Realtime] SDP answer recebido com sucesso");

    res.setHeader('Content-Type', 'application/sdp');
    res.send(answerSdp);
  } catch (error) {
    console.error("[Proxy Realtime] Erro:", error);
    res.status(500).json({
      error: "Erro interno ao processar WebRTC",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Rota de TTS desativada (Cartesia removida)
app.post("/tts", async (req, res) => {
  res.status(410).json({ error: "Serviço de TTS da Cartesia desativado. Use OpenAI ou Gemini." });
});

// =====================================================
// ROTAS DE MÉTRICAS (requerem autenticação admin)
// =====================================================

// GET /api/metrics/providers - Retorna consumo total
app.get("/api/metrics/providers", requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const metrics = await getProviderMetrics(null, days);

    // Agregar por provedor
    const aggregated = {};
    for (const row of metrics) {
      if (!aggregated[row.provider]) {
        aggregated[row.provider] = {
          provider: row.provider,
          tokens_input: 0,
          tokens_output: 0,
          audio_minutes: 0,
          requests: 0,
          storage_mb: 0,
          writes: 0,
          reads: 0,
          cost: 0,
        };
      }
      aggregated[row.provider].tokens_input += parseFloat(row.tokens_input) || 0;
      aggregated[row.provider].tokens_output += parseFloat(row.tokens_output) || 0;
      aggregated[row.provider].audio_minutes += parseFloat(row.audio_minutes) || 0;
      aggregated[row.provider].requests += parseFloat(row.requests) || 0;
      aggregated[row.provider].storage_mb = parseFloat(row.storage_mb) || 0; // Último valor
      aggregated[row.provider].writes += parseFloat(row.writes) || 0;
      aggregated[row.provider].reads += parseFloat(row.reads) || 0;
      aggregated[row.provider].cost += parseFloat(row.cost) || 0;
    }

    res.json({
      success: true,
      data: Object.values(aggregated),
      period: `${days} days`,
    });
  } catch (error) {
    console.error("[API] Erro /api/metrics/providers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/metrics/provider/:id - Retorna dados completos de um provedor
app.get("/api/metrics/provider/:id", requireAdmin, async (req, res) => {
  try {
    const provider = req.params.id;
    const days = parseInt(req.query.days) || 30;

    if (!["openai", "cartesia", "render", "cloudflare", "supabase"].includes(provider)) {
      return res.status(400).json({ success: false, error: "Provedor inválido" });
    }

    const metrics = await getProviderMetrics(provider, days);

    res.json({
      success: true,
      provider,
      data: metrics,
      period: `${days} days`,
    });
  } catch (error) {
    console.error(`[API] Erro /api/metrics/provider/${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/metrics/monthly - Projeção mensal
app.get("/api/metrics/monthly", requireAdmin, async (req, res) => {
  try {
    const projection = await getMonthlyProjection();

    res.json({
      success: true,
      data: projection,
    });
  } catch (error) {
    console.error("[API] Erro /api/metrics/monthly:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/metrics/status - Status e latência dos provedores
app.get("/api/metrics/status", requireAdmin, async (req, res) => {
  try {
    const status = await getProviderStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[API] Erro /api/metrics/status:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/metrics/today - Resumo do dia
app.get("/api/metrics/today", requireAdmin, async (req, res) => {
  try {
    const summary = await getTodaySummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("[API] Erro /api/metrics/today:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/metrics/refresh - Atualização manual
app.post("/api/metrics/refresh", requireAdmin, async (req, res) => {
  try {
    console.log("[API] Atualização manual de métricas solicitada");
    const result = await runMetricsCollection();

    res.json({
      success: result.success,
      message: result.success ? "Métricas atualizadas com sucesso" : "Erro ao atualizar métricas",
      data: result,
    });
  } catch (error) {
    console.error("[API] Erro /api/metrics/refresh:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/metrics/history - Histórico para gráficos
app.get("/api/metrics/history", requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const provider = req.query.provider;

    const metrics = await getProviderMetrics(provider, days);

    // Agrupar por data
    const byDate = {};
    for (const row of metrics) {
      if (!byDate[row.date]) {
        byDate[row.date] = {
          date: row.date,
          openai: { tokens: 0, cost: 0 },
          gemini: { tokens: 0, cost: 0 },
          render: { requests: 0, cost: 0 },
          cloudflare: { requests: 0, cost: 0 },
          supabase: { storage_mb: 0, reads: 0, writes: 0, cost: 0 },
          total_cost: 0,
        };
      }

      const d = byDate[row.date];
      const cost = parseFloat(row.cost) || 0;

      switch (row.provider) {
        case "openai":
          d.openai.tokens = (parseFloat(row.tokens_input) || 0) + (parseFloat(row.tokens_output) || 0);
          d.openai.cost = cost;
          break;
        case "gemini":
          d.gemini.tokens = (parseFloat(row.tokens_input) || 0) + (parseFloat(row.tokens_output) || 0);
          d.gemini.cost = cost;
          break;
        case "render":
          d.render.requests = parseFloat(row.requests) || 0;
          d.render.cost = cost;
          break;
        case "cloudflare":
          d.cloudflare.requests = parseFloat(row.requests) || 0;
          d.cloudflare.cost = cost;
          break;
        case "supabase":
          d.supabase.storage_mb = parseFloat(row.storage_mb) || 0;
          d.supabase.reads = parseFloat(row.reads) || 0;
          d.supabase.writes = parseFloat(row.writes) || 0;
          d.supabase.cost = cost;
          break;
      }

      d.total_cost += cost;
    }

    // Ordenar por data
    const history = Object.values(byDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      success: true,
      data: history,
      period: `${days} days`,
    });
  } catch (error) {
    console.error("[API] Erro /api/metrics/history:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// ROTAS DE CONFIGURAÇÃO DE PROVEDORES
// =====================================================

// GET /api/providers/config - Buscar configurações
app.get("/api/providers/config", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("provider_config")
      .select("*");

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("[API] Erro /api/providers/config:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/providers/config/:provider - Atualizar configuração
app.put("/api/providers/config/:provider", requireAdmin, async (req, res) => {
  try {
    const { provider } = req.params;
    const { config } = req.body;

    if (!["openai", "cartesia", "render", "cloudflare", "supabase"].includes(provider)) {
      return res.status(400).json({ success: false, error: "Provedor inválido" });
    }

    const { error } = await supabase
      .from("provider_config")
      .upsert({
        provider,
        config,
        updated_at: new Date().toISOString(),
      }, { onConflict: "provider" });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: "Configuração atualizada" });
  } catch (error) {
    console.error(`[API] Erro /api/providers/config/${req.params.provider}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// ROTAS OAUTH GOOGLE WORKSPACE
// =====================================================

// Scopes disponíveis por serviço
const GOOGLE_SCOPES = {
  gmail: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify'
  ],
  calendar: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ],
  meet: [
    'https://www.googleapis.com/auth/calendar.events' // Meet usa Calendar API
  ],
  drive: [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file'
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/spreadsheets'
  ],
  docs: [
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/documents'
  ],
  slides: [
    'https://www.googleapis.com/auth/presentations.readonly',
    'https://www.googleapis.com/auth/presentations'
  ],
  maps: [
    'https://www.googleapis.com/auth/userinfo.profile' // Maps usa API key, não OAuth
  ]
};

// GET /api/auth/google - Iniciar fluxo OAuth
app.get("/api/auth/google", async (req, res) => {
  try {
    const { services, redirect_uri, user_id } = req.query;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        error: "Google OAuth não configurado",
        details: "GOOGLE_CLIENT_ID não encontrado nas variáveis de ambiente"
      });
    }

    // Construir lista de scopes baseado nos serviços selecionados
    const selectedServices = services ? services.split(',') : Object.keys(GOOGLE_SCOPES);
    const scopes = new Set(['openid', 'email', 'profile']); // Scopes básicos

    selectedServices.forEach(service => {
      if (GOOGLE_SCOPES[service]) {
        GOOGLE_SCOPES[service].forEach(scope => scopes.add(scope));
      }
    });

    // State para segurança (inclui user_id e serviços)
    const state = Buffer.from(JSON.stringify({
      user_id: user_id || 'anonymous',
      services: selectedServices,
      timestamp: Date.now()
    })).toString('base64');

    // Construir URL de autorização do Google
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirect_uri || `${process.env.APP_URL || 'http://localhost:3000'}/#/oauth/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', Array.from(scopes).join(' '));
    authUrl.searchParams.set('access_type', 'offline'); // Para obter refresh_token
    authUrl.searchParams.set('prompt', 'consent'); // Sempre pedir consentimento
    authUrl.searchParams.set('state', state);

    console.log(`[OAuth Google] Iniciando fluxo para serviços: ${selectedServices.join(', ')}`);
    console.log(`[OAuth Google] Scopes: ${Array.from(scopes).length}`);

    // Redirecionar ou retornar URL
    if (req.query.redirect === 'true') {
      res.redirect(authUrl.toString());
    } else {
      res.json({
        success: true,
        authUrl: authUrl.toString(),
        services: selectedServices,
        scopeCount: scopes.size
      });
    }
  } catch (error) {
    console.error("[OAuth Google] Erro ao iniciar:", error);
    res.status(500).json({ error: "Erro ao iniciar OAuth", details: error.message });
  }
});

// POST /api/auth/google/callback - Trocar código por tokens
app.post("/api/auth/google/callback", async (req, res) => {
  try {
    const { code, state, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Código de autorização não fornecido" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "Google OAuth não configurado",
        details: "Credenciais não encontradas"
      });
    }

    // Decodificar state
    let stateData = {};
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      } catch (e) {
        console.warn("[OAuth Google] State inválido:", e);
      }
    }

    // Trocar código por tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri || `${process.env.APP_URL || 'http://localhost:3000'}/#/oauth/callback`,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[OAuth Google] Erro ao trocar código:", errorData);
      return res.status(400).json({
        error: "Erro ao obter tokens",
        details: errorData
      });
    }

    const tokens = await tokenResponse.json();

    // Buscar informações do usuário Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${tokens.access_token}` }
    });

    const googleUser = userInfoResponse.ok ? await userInfoResponse.json() : null;

    console.log(`[OAuth Google] Tokens obtidos para: ${googleUser?.email || 'desconhecido'}`);
    console.log(`[OAuth Google] Serviços conectados: ${stateData.services?.join(', ') || 'todos'}`);

    // Salvar tokens no Supabase (se tiver user_id)
    if (stateData.user_id && stateData.user_id !== 'anonymous') {
      const { error: saveError } = await supabase
        .from('user_integrations')
        .upsert({
          id: crypto.randomUUID(),
          user_id: stateData.user_id,
          provider: 'google_workspace',
          services: stateData.services || Object.keys(GOOGLE_SCOPES),
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          provider_email: googleUser?.email,
          connected_at: new Date().toISOString()
        }, { onConflict: 'user_id,provider' });

      if (saveError) {
        console.error("[OAuth Google] Erro ao salvar tokens:", saveError);
        // Continuar mesmo com erro - tokens ainda são válidos
      }
    }

    res.json({
      success: true,
      message: "Google Workspace conectado com sucesso!",
      services: stateData.services || Object.keys(GOOGLE_SCOPES),
      googleEmail: googleUser?.email,
      expiresIn: tokens.expires_in
    });
  } catch (error) {
    console.error("[OAuth Google] Erro no callback:", error);
    res.status(500).json({ error: "Erro no callback OAuth", details: error.message });
  }
});

// POST /api/auth/google/refresh - Renovar access_token
app.post("/api/auth/google/refresh", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id obrigatório" });
    }

    // Buscar refresh_token do Supabase
    const { data: integration, error: fetchError } = await supabase
      .from('user_integrations')
      .select('refresh_token')
      .eq('user_id', user_id)
      .eq('provider', 'google_workspace')
      .single();

    if (fetchError || !integration?.refresh_token) {
      return res.status(404).json({ error: "Integração não encontrada ou sem refresh_token" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Renovar token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("[OAuth Google] Erro ao renovar token:", errorData);
      return res.status(400).json({ error: "Erro ao renovar token", details: errorData });
    }

    const tokens = await tokenResponse.json();

    // Atualizar no Supabase
    await supabase
      .from('user_integrations')
      .update({
        access_token: tokens.access_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      })
      .eq('user_id', user_id)
      .eq('provider', 'google_workspace');

    console.log(`[OAuth Google] Token renovado para user: ${user_id}`);

    res.json({
      success: true,
      expiresIn: tokens.expires_in
    });
  } catch (error) {
    console.error("[OAuth Google] Erro ao renovar:", error);
    res.status(500).json({ error: "Erro ao renovar token", details: error.message });
  }
});

// DELETE /api/auth/google - Desconectar Google Workspace
app.delete("/api/auth/google", async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: "user_id obrigatório" });
    }

    // Buscar token para revogar
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'google_workspace')
      .single();

    // Revogar token no Google (opcional, mas recomendado)
    if (integration?.access_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${integration.access_token}`, {
        method: 'POST'
      });
    }

    // Remover do Supabase
    const { error: deleteError } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', user_id)
      .eq('provider', 'google_workspace');

    if (deleteError) {
      console.error("[OAuth Google] Erro ao desconectar:", deleteError);
      return res.status(500).json({ error: "Erro ao desconectar" });
    }

    console.log(`[OAuth Google] Desconectado para user: ${user_id}`);

    res.json({ success: true, message: "Google Workspace desconectado" });
  } catch (error) {
    console.error("[OAuth Google] Erro ao desconectar:", error);
    res.status(500).json({ error: "Erro ao desconectar", details: error.message });
  }
});

// GET /api/auth/google/status - Verificar status da conexão
app.get("/api/auth/google/status", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: "user_id obrigatório" });
    }

    const { data: integration, error } = await supabase
      .from('user_integrations')
      .select('services, google_email, expires_at, connected_at')
      .eq('user_id', user_id)
      .eq('provider', 'google_workspace')
      .single();

    if (error || !integration) {
      return res.json({ connected: false });
    }

    const isExpired = new Date(integration.expires_at) < new Date();

    res.json({
      connected: true,
      services: integration.services,
      googleEmail: integration.google_email,
      connectedAt: integration.connected_at,
      isExpired,
      needsRefresh: isExpired
    });
  } catch (error) {
    console.error("[OAuth Google] Erro ao verificar status:", error);
    res.status(500).json({ error: "Erro ao verificar status", details: error.message });
  }
});

// =====================================================
// CRON JOB: Coleta de métricas a cada 5 minutos
// =====================================================

// Executar a cada 5 minutos
cron.schedule("*/5 * * * *", async () => {
  console.log("[Cron] Executando coleta de métricas programada...");
  await runMetricsCollection();
});

// Verificar status a cada 1 minuto
cron.schedule("*/1 * * * *", async () => {
  console.log("[Cron] Verificando status dos provedores...");
  await fetchProviderStatus();
});

// =====================================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`\n🚀 Servidor LIA ativo na porta ${PORT}`);
  console.log(`📊 Cron de métricas: a cada 5 minutos`);
  console.log(`🔍 Cron de status: a cada 1 minuto`);
  console.log(`📅 Iniciado em: ${new Date().toISOString()}\n`);

  // Executar coleta inicial de status
  console.log("[Init] Executando verificação inicial de status...");
  await fetchProviderStatus();
  console.log("[Init] Verificação inicial concluída\n");
});
