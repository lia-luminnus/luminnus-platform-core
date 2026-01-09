import './config/envLoader.js';
// ===========================================================
// LIA UNIFIED SERVER - Port 3000
// Frontend (Vite) + Backend (Express + Socket.io + WebRTC)
// ===========================================================




import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import OpenAI from 'openai';
import fs from 'fs';
import { execSync } from 'child_process';

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
          try { execSync(`taskkill /F /PID ${pid}`); } catch (e) { }
        }
      });
    }
  } catch (e) { /* porta livre */ }
}

// Initial Cleanup
const PORT = process.env.PORT || 3000;
cleanPort(PORT);

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
import { setupImageRoutes } from './routes/image.js';
import { setupConversationRoutes } from './routes/conversations.js';
import { setupEmotionRoutes } from './routes/emotion.js';
import { setupAvatarRoutes } from './routes/avatar.js';
import { setupFilesRoutes } from './routes/files.js';
import { setupVersionRoutes } from './routes/version.js';
import adminRoutes from './routes/admin.js';

// Realtime
import { setupRealtime } from './realtime/realtime.js';
import { setupRealtimeVoiceAPI } from './realtime/realtime-voice-api.js';

// Auth Middleware para Socket.IO
import { socketAuth, socketAuthDev } from './middleware/socketAuth.js';

// ===========================================================
// CORS DINÂMICO VIA ENV (PRODUÇÃO-READY)
// ===========================================================

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
];

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

// CORS Dinâmico via ENV
app.use(corsHandler);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===========================================================
// HEALTH CHECK (READINESS PROBE)
// ===========================================================

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true, timestamp: Date.now() });
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

// Compartilhar io com as rotas via app.set
app.set('io', io);

// Auth Middleware: Usar auth real em produção, fallback dev em desenvolvimento
const isDev = process.env.NODE_ENV !== 'production';
io.use(isDev ? socketAuthDev : socketAuth);

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
  apiKey: process.env.OPENAI_API_KEY
});

// ===========================================================
// SESSION STATE (In-Memory + Supabase)
// ===========================================================

import { loadImportantMemories } from './config/supabase.js';

// Map de sessões ativas keyed por conversationId ou userId
export const activeSessions = new Map<string, any>();

export async function ensureSession(userId: string = '00000000-0000-0000-0000-000000000001', conversationId?: string) {
  const finalConvId = conversationId || `session_${userId.split('-')[0]}_${Date.now()}`;

  if (!activeSessions.has(finalConvId)) {
    console.log(`✅ Nova sessão criada para user ${userId}: ${finalConvId}`);
    console.log(`🔍 Carregando memórias do Supabase...`);

    let memoriesFromDB = [];

    try {
      const dbMemories = await loadImportantMemories(userId);

      // Convert Supabase format to session format
      memoriesFromDB = (dbMemories || []).map((mem: any) => ({
        id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: `${mem.key || 'Dato'}: ${mem.content || mem.value}`,
        category: 'imported',
        timestamp: Date.now(),
        key: mem.key,
        value: mem.content || mem.value
      }));

      console.log(`💾 ${memoriesFromDB.length} memórias carregadas do Supabase para user ${userId}`);

    } catch (err) {
      console.error('❌ Erro ao carregar memórias do Supabase:', err);
    }

    const session = {
      conversationId: finalConvId,
      userId,
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

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'LIA Server Online',
      version: '4.0.0',
      port: 3000,
      timestamp: new Date().toISOString()
    });
  });

  // API Routes
  setupSessionRoutes(app);
  setupChatRoutes(app, openai);
  setupMemoryRoutes(app);
  setupSearchRoutes(app);
  setupTranscribeRoutes(app);
  setupSpeechRoutes(app);  // Google Cloud Speech-to-Text
  setupMetricsRoutes(app);
  setupVisionRoutes(app);
  setupDocumentRoutes(app);
  setupMultimodalRoutes(app);
  setupToolRoutes(app);  // Weather, Places, Directions, Translate
  setupImageRoutes(app); // Image generation (Nano Banana + DALL-E)
  setupConversationRoutes(app); // Conversation history management
  setupEmotionRoutes(app);       // Emotion decode for Avatar
  setupAvatarRoutes(app, openai); // Avatar Studio test API
  setupFilesRoutes(app); // Files management API (v2.0)
  setupVersionRoutes(app); // System Version & Update Broadcast

  // Admin Diagnostic Routes (Admin-Only, protected by adminGate)
  app.use('/api/admin', adminRoutes);

  console.log('✅ Core LIA Functions loaded');

  // ===========================================================
  // OAUTH CALLBACK REDIRECT (Port 3000 -> Frontend 8080)
  // ===========================================================
  // Google Cloud Console is configured with redirect_uri = http://localhost:3000/api/auth/google/callback
  // This handler just redirects to the frontend's OAuthCallback page, passing along the query params.
  // The frontend will then POST to the backend (port 5000) which has the .env with Google credentials.
  app.get('/api/auth/google/callback', (req, res) => {
    const query = req.query as any;
    const state = query.state;
    let redirectUrl = 'http://localhost:8080/oauth-callback'; // Fallback admin

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

    console.log(`[OAuth Redirect] Redirecting: ${finalRedirect}`);
    res.redirect(finalRedirect);
  });

  // ===========================================================
  // REALTIME SETUP (Socket.io + WebRTC)
  // ===========================================================

  setupRealtime(io);
  setupRealtimeVoiceAPI(app, openai);

  // v4.1: Inicializar serviço de diagnóstico para transmissão de pensamentos
  const { diagnosticService } = await import('./services/diagnosticService.js');
  diagnosticService.init(io);

  console.log('✅ Realtime Systems active');

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
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
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
  const PORT = process.env.PORT || 3000;

  httpServer.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`🚀 LIA Unified Server ready on http://127.0.0.1:${PORT} [${process.env.NODE_ENV || 'dev'}]`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Porta ${PORT} ocupada. Tentando limpeza...`);
      cleanPort(PORT);
      setTimeout(() => httpServer.listen(Number(PORT), '127.0.0.1'), 1500);
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
    console.log('✅ [Server] Porta 3000 liberada. Saindo...');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 [Server] Recebido SIGTERM. Fechando conexões...');
  io.close();
  httpServer.close(() => {
    console.log('✅ [Server] Porta 3000 liberada. Saindo...');
    process.exit(0);
  });
});

export { app, httpServer, io };
