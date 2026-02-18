import { config } from './config/unifiedConfig.js';

// v15.6: In-Memory Log Buffer para Bypass de Render Logs
const memoryLogs: string[] = [];
if (typeof console !== 'undefined') {
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    try {
      const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
      memoryLogs.push(line);
      if (memoryLogs.length > 200) memoryLogs.shift();
    } catch (e) { /* ignore log errors */ }
    originalLog.apply(console, args);
  };
}
import helmet from 'helmet';
const RELOAD_STAMP = "2026-01-29T16:00:00";
// ===========================================================
// LIA UNIFIED SERVER - Port 3006
// Frontend (Vite) + Backend (Express + Socket.io + WebRTC)
// ===========================================================




import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import OpenAI from 'openai';
import fs from 'fs';
import { execSync } from 'child_process';

// ===========================================================
// GLOBAL ERROR HANDLERS (v4.1.1 - Diagnosis)
// ===========================================================
process.on('uncaughtException', (err) => {
  console.error('💥 [CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});


// Port Cleaner Helper (Dev only)
function cleanPort(port: number | string) {
  if (process.env.NODE_ENV === 'production') return;
  try {
    const cmd = `netstat -ano | findstr :${port} | findstr LISTENING`;
    const output = execSync(cmd).toString().trim();
    if (output) {
      const lines = output.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && parseInt(pid) !== process.pid) {
          console.log(`⚠️ [PortCleaner] Liberando porta ${port} (PID: ${pid})...`);
          try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (e) { }
        }
      });
    }
  } catch (e) { /* porta livre */ }
}

// Initial Cleanup
// cleanPort(config.port); // Removido para evitar matar o servidor de Auth legado na porta 3000

// Routes (these import supabase.js which needs env vars)
import { setupSessionRoutes } from './routes/session.js';
import { setupChatRoutes } from './routes/chat.js';
import { setupMemoryRoutes } from './routes/memory.js';
import { setupSearchRoutes } from './routes/search.js';
import { setupTranscribeRoutes } from './routes/transcribe.js';
import { setupSpeechRoutes } from './routes/speech.js';
import { setupMetricsRoutes } from './routes/metrics.js';
import { setupVisionRoutes } from './routes/vision.js';
import { setupMultimodalRoutes } from './routes/multimodal.js';
import { setupDocumentRoutes } from './routes/documents.js';
import { setupToolRoutes } from './routes/tools.js';
import { setupIntegrationsRoutes } from './routes/integrations.js';
import { setupImageRoutes } from './routes/image.js';
import { setupConversationRoutes } from './routes/conversations.js';
import { setupEmotionRoutes } from './routes/emotion.js';
import { setupAvatarRoutes } from './routes/avatar.js';
import { setupFilesRoutes } from './routes/files.js';
import { setupVersionRoutes } from './routes/version.js';
import adminRoutes from './routes/admin.js';
import { setupWhatsAppRoutes, setupWhatsAppIntegrationRoutes } from './routes/whatsapp.js';
import { setupWhatsAppWebhookRoutes } from './routes/whatsapp-webhook.js';
import whatsappAdminRoutes from './routes/whatsapp-admin.js';
import { setupDashboardRoutes } from './routes/dashboard.js';
import { setupGoogleAuthRoutes } from './routes/google-auth.js';
import { setupAutomationRoutes } from './routes/automations.js';
import { setupCreditsRoutes } from './routes/credits.js';
import { setupTwilioOnboardingRoutes } from './routes/twilio-onboarding.js';
import { setupTwilioWebhookRoutes } from './routes/twilio-webhook.js';
import twilioAdminRoutes from './routes/twilio-admin.js';
import WhatsAppIntelligence from './services/whatsappIntelligence.js';
import { setSocketIO } from './services/eventBusService.js';
import { AutomationScheduler } from './services/scheduler.js';


// Realtime
import { setupRealtime } from './realtime/realtime.js';
import { setupRealtimeVoiceAPI } from './realtime/realtime-voice-api.js';

// Auth Middleware para Socket.IO
import { socketAuth, socketAuthDev } from './middleware/socketAuth.js';

// Diagnostic Service
import { diagnosticService } from './services/diagnosticService.js';

// ===========================================================
// CORS DINÂMICO VIA ENV (PRODUÇÃO-READY)
// ===========================================================

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://luminnus.ai',
  'https://www.luminnus.ai',
  'https://luminnus-dashboard.onrender.com',
  'https://luminnus-platform-core-dashboard.onrender.com',
  'https://dashboard.luminnus.ai', // Possível custom domain
  ...config.cors.allowedOrigins
].map(o => o?.trim()).filter(Boolean);

function corsHandler(req: any, res: any, next: any) {
  const origin = req.headers.origin;

  // Em dev ou se não há restrição, permitir tudo
  if (allowedOrigins.length === 0 || !origin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}

// ===========================================================
// EXPRESS + HTTP SERVER
// ===========================================================

const app = express();
const httpServer = createServer(app);

// v15.6: Body parsers (Crucial para Twilio POST)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Security & CORS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(corsHandler);

// Endpoint para ver os logs da memória (Bypass Render lag)
app.get('/api/diag/memory-logs', (req, res) => {
  res.send(`<html><body style="background:#111;color:#0f0;padding:20px;font-family:monospace;">
    <h2>📟 LIA Internal Memory Logs (Real-time)</h2>
    <hr/>
    <pre>${memoryLogs.join('\n')}</pre>
    <script>setTimeout(() => location.reload(), 5000);</script>
  </body></html>`);
});

// v15.6: HYPER DEBUG LOG - Unificado
app.use((req, res, next) => {
  const isTwilio = req.path.includes('twilio') || (req.headers['user-agent']?.toLowerCase().includes('twilio'));
  if (isTwilio) {
    console.log(`📡 [HYPER] ${req.method} ${req.path} | IP: ${req.ip}`);
  }
  next();
});

// v15.6: Prioridade máxima para Webhooks
setupTwilioWebhookRoutes(app);
console.log('🏁 [Twilio] Webhook priorizado no stack de rotas');

// Middleware removido daqui e movido para o topo

// ===========================================================
// API REQUEST LOGGER (Debug Helper for 404s)
// ===========================================================
app.use('/api', (req, res, next) => {
  console.log(`📥 [API] ${req.method} ${req.path} | Origin: ${req.headers.origin || 'N/A'}`);
  next();
});

// Diagnostic Route for User
app.get('/api/diag/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    env: config.env,
    allowedOrigins,
    headers: req.headers
  });
});

// v1.3.1: Profile Route - Returns user plan info
app.get('/api/profile', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const { getUserProfile } = await import('./config/supabase.js');
    const profile = await getUserProfile(userId);

    if (profile) {
      res.json({
        plan: profile.plan || profile.plan_level || 'free',
        plan_level: profile.plan_level,
        email: profile.email
      });
    } else {
      res.json({ plan: 'free' });
    }
  } catch (error) {
    console.error('❌ [API Profile] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================================================
// SOCKET.IO SETUP (COM AUTH + CORS DINÂMICO)
// ===========================================================

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

setSocketIO(io);

// Compartilhar io com as rotas via app.set
app.set('io', io);

// Auth Middleware: Usar auth real em produção, fallback dev em desenvolvimento
// Auth Middleware: Usar auth real em produção, fallback dev em desenvolvimento
io.use(config.isDev ? socketAuthDev : socketAuth);

// Rooms Multi-Tenant no Connect
io.on('connection', (socket) => {
  const ctx = (socket.data as any).auth;
  const tenantId = ctx?.tenantId;
  const conversationId = ctx?.conversationId;
  const userId = ctx?.userId;

  // Join room do tenant
  if (tenantId) {
    socket.join(`tenant:${tenantId}`);
  }

  // Join room da conversa (se fornecida)
  if (conversationId) {
    socket.join(`conv:${conversationId}`);
  }

  console.log(`🟢 [Socket] Cliente conectado: ${socket.id} (tenant: ${tenantId}, user: ${userId})`);

  socket.on('disconnect', () => {
    console.log(`🔴 [Socket] Cliente desconectado: ${socket.id}`);
  });
});


// ===========================================================
// OPENAI CLIENT
// ===========================================================

export const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// ===========================================================
// SESSION STATE (In-Memory + Supabase)
// ===========================================================

import { loadImportantMemories } from './config/supabase.js';

// Map de sessões ativas keyed por conversationId ou userId
export const activeSessions = new Map<string, any>();

export async function ensureSession(userId: string = '00000000-0000-0000-0000-000000000001', conversationId?: string) {
  // v5.4: Garantir que userId seja um UUID válido mesmo se vier null/undefined do frontend
  const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
  const finalUserId = (!userId || userId === "null" || userId === "undefined") ? DEFAULT_USER_ID : userId;

  const finalConvId = conversationId || `session_${finalUserId.split('-')[0]}_${Date.now()}`;

  if (!activeSessions.has(finalConvId)) {
    console.log(`✅ Nova sessão criada para user ${finalUserId}: ${finalConvId}`);
    console.log(`🔍 Carregando memórias do Supabase...`);

    let memoriesFromDB = [];

    try {
      const dbMemories = await loadImportantMemories(finalUserId);

      // Convert Supabase format to session format
      memoriesFromDB = (dbMemories || []).map((mem: any) => ({
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: `${mem.key || 'Dato'}: ${mem.content || mem.value}`,
        category: 'imported',
        timestamp: Date.now(),
        key: mem.key,
        value: mem.content || mem.value
      }));

      console.log(`💾 ${memoriesFromDB.length} memórias carregadas do Supabase para user ${finalUserId}`);

    } catch (err) {
      console.error('❌ Erro ao carregar memórias do Supabase:', err);
    }

    const session = {
      conversationId: finalConvId,
      userId: finalUserId,
      systemInstruction: 'Você é LIA, assistente inteligente da Luminnus.',
      messages: [],
      memories: memoriesFromDB,
      userLocation: null // Will be set by geolocation API
    };

    activeSessions.set(finalConvId, session);
  }

  return activeSessions.get(finalConvId);
}

// ===========================================================
// ASYNC SERVER INITIALIZATION
// ===========================================================

async function startServer() {
  // ===========================================================
  // ROUTES SETUP
  // ===========================================================

  // Health Check (Enhanced with env info)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'LIA Server Online',
      version: '4.0.1',
      port: config.port,
      env: config.env,
      timestamp: new Date().toISOString(),
      routes: [
        'POST /api/conversations',
        'POST /api/location',
        'POST /api/chat',
        'POST /api/vision/analyze',
        'POST /api/multimodal/analyze',
        'GET /api/health'
      ]
    });
  });

  console.log('🚀 [Server] Iniciando setup de rotas...');

  // API Routes
  setupSessionRoutes(app);
  console.log('   ✅ Session routes (includes /api/location)');

  setupChatRoutes(app, openai);
  console.log('   ✅ Chat routes');

  setupMemoryRoutes(app);
  console.log('   ✅ Memory routes');

  setupSearchRoutes(app);
  setupTranscribeRoutes(app);
  setupSpeechRoutes(app);  // Google Cloud Speech-to-Text
  setupMetricsRoutes(app);
  setupVisionRoutes(app);
  console.log('   ✅ Vision routes (/api/vision/analyze)');

  setupDocumentRoutes(app);
  setupMultimodalRoutes(app);
  console.log('   ✅ Multimodal routes (/api/multimodal/analyze)');

  setupToolRoutes(app);  // Weather, Places, Directions, Translate
  setupImageRoutes(app); // Image generation (Nano Banana + DALL-E)

  setupConversationRoutes(app);
  console.log('   ✅ Conversation routes (/api/conversations)');

  setupWhatsAppRoutes(app); // Conversation history management
  setupWhatsAppWebhookRoutes(app);
  setupEmotionRoutes(app);       // Emotion decode for Avatar
  setupAvatarRoutes(app, openai); // Avatar Studio test API
  setupFilesRoutes(app); // Files management API (v2.0)
  setupVersionRoutes(app); // System Version & Update Broadcast
  setupDashboardRoutes(app); // Dashboard engine
  setupIntegrationsRoutes(app); // Hub & Integrations
  setupWhatsAppIntegrationRoutes(app); // WhatsApp Integration Management (for Hub)
  setupGoogleAuthRoutes(app); // Google OAuth Integration
  setupAutomationRoutes(app);
  setupCreditsRoutes(app);

  console.log('✅ [Server] Todas as rotas de API registradas com sucesso');

  console.log('🚀 [Server] Rotas básicas carregadas. Inicializando inteligência...');

  // WhatsApp Intelligence Initialization
  WhatsAppIntelligence.init();

  // Initialize Automation Scheduler
  AutomationScheduler.init();

  console.log('✅ [Server] WhatsApp Intelligence inicializado');



  // Admin Diagnostic Routes (Admin-Only, protected by adminGate)
  app.use('/api/admin/whatsapp', whatsappAdminRoutes);
  app.use('/api/admin/twilio', twilioAdminRoutes);
  app.use('/api/admin', adminRoutes);

  // Twilio Multi-Tenant Routes
  setupTwilioOnboardingRoutes(app);
  console.log('   ✅ Twilio routes (/api/twilio/*)');

  console.log('✅ Core LIA Functions loaded');

  // v4.0.2: Diagnostic of startup env vars
  console.log('🔍 [Startup] Checking env vars...');
  const startupVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'OPENAI_API_KEY'];
  startupVars.forEach(v => {
    const status = process.env[v] ? '✅ LOADED' : '❌ MISSING';
    console.log(`   - ${v}: ${status}`);
  });

  console.log('🚀 [Server] Variáveis verificadas com sucesso.');


  // ===========================================================
  // OAUTH CALLBACK REDIRECT (Server -> Frontend SPA)
  // ===========================================================
  // Google Cloud Console redireciona para este servidor.
  // Este handler apenas repassa o usuário para o Frontend correto (Dashboard),
  // enviando o code e state via query params.
  app.get('/api/auth/google/callback', (req, res) => {
    const query = req.query as any;
    const state = query.state;

    // Fallback: Tenta redirecionar para o dashboard de produção se nada for achado
    const isProduction = process.env.NODE_ENV === 'production';
    let redirectUrl = isProduction
      ? 'https://luminnus-dashboard.onrender.com/#/integrations'
      : 'http://localhost:5173/#/integrations';

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        if (decoded.redirect_to) {
          redirectUrl = decoded.redirect_to;
          console.log(`[OAuth Redirect] Found custom redirect in state: ${redirectUrl}`);
        }
      } catch (e) {
        console.warn('[OAuth Redirect] Failed to decode state', e);
      }
    }

    const queryParams = new URLSearchParams(query).toString();
    const finalRedirect = redirectUrl.includes('?')
      ? `${redirectUrl}&${queryParams}`
      : `${redirectUrl}?${queryParams}`;

    console.log(`[OAuth Redirect] Redirecionando para: ${finalRedirect}`);
    res.redirect(finalRedirect);
  });


  // ===========================================================

  console.log('🚀 [Server] Configurando Realtime Systems...');

  setupRealtime(io, ensureSession);
  setupRealtimeVoiceAPI(app, openai);

  console.log('🚀 [Server] Inicializando Diagnostic Service...');


  // v4.1: Inicializar serviço de diagnóstico para transmissão de pensamentos
  // const { diagnosticService } = await import('./services/diagnosticService.js');
  diagnosticService.init(io);

  console.log('✅ Realtime Systems active (Server listening sequence starting)');


  // ===========================================================
  // VITE INTEGRATION (Development + Production)
  // ===========================================================

  // Fallback SPA: Redirecionar rotas não-API para o frontend no 8080 (ou servir se produção)
  app.get('*', (req, res, next) => {
    // Se for rota de API ou Chat, deixa passar para o próximo handler (que dará 404 se não existir)
    if (req.path.startsWith('/api') || req.path.startsWith('/chat') || req.path.startsWith('/socket.io')) {
      return next();
    }

    // Se estivermos em dev e alguém acessar port 3000/qualquer-coisa-frontend
    // Redirecionamos para o port 8080 (Vite) para que o SPA funcione
    if (!config.isProduction) {
      console.log(`[SPA Fallback] Redirecting ${req.path} to frontend dev server (5173)`);
      return res.redirect(`http://localhost:5173${req.path}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`);
    }

    // Se fosse produção, serviria o index.html (mantendo comentado para não quebrar dev)
    /*
    const distPath = path.join(__dirname, '..', 'dist');
    res.sendFile(path.join(distPath, 'index.html'));
    */
    next();
  });


  // ===========================================================
  // START SERVER
  // ===========================================================

  // Unified architecture: Single port for all services
  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 LIA Unified Server ready on http://127.0.0.1:${config.port} [${config.env}]`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Porta ${config.port} ocupada. Tentando limpeza forçada (aguardando 3s)...`);
      cleanPort(config.port);
      setTimeout(() => {
        console.log(`🔄 Tentando iniciar servidor novamente na porta ${config.port}...`);
        httpServer.listen(config.port, '0.0.0.0'); // Listen on all interfaces
      }, 3000);
    }
  });
}

// Start the server
startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Gracious shutdown for tsx watch / nodemon
process.on('SIGINT', () => {
  console.log('🛑 [Server] Recebido SIGINT. Fechando conexões...');
  io.close();
  httpServer.close(() => {
    console.log(`✅ [Server] Porta ${config.port} liberada. Saindo...`);
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 [Server] Recebido SIGTERM. Fechando conexões...');
  io.close();
  httpServer.close(() => {
    console.log(`✅ [Server] Porta ${config.port} liberada. Saindo...`);
    process.exit(0);
  });
});

export { app, httpServer, io };
