import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { versionRouter } from './routes/version.js';
import { meRouter } from './routes/me.js';
import { authRouter } from './routes/auth.js';
import { integrationsRouter } from './routes/integrations.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import metricsRouter from './routes/metricsRoutes.js';
import briefingRoutes from './routes/briefingRoutes.js';
import hubRoutes from './routes/hubRoutes.js';
import whatsappAdminRouter from './routes/whatsappAdmin.js';
import whatsappWebhookRouter from './routes/whatsappWebhook.js';
import whatsappIntegrationsRouter from './routes/whatsappIntegrations.js';
import whatsappEmbeddedRouter from './routes/whatsappEmbedded.js';
import assistantRouter from './routes/assistant.js';
import adminRouter from './routes/admin.js';
import { errorHandler } from './middleware/error.js';
import { setupWebSocket } from './ws/gateway.js';
import http from 'http';

import { conversationRouter } from './routes/conversation.js';
import liveTokenRouter from './routes/liveToken.js';

const app: express.Express = express();
const PORT = process.env.PORT || 5000;

// Configuração de CORS robusta (Hardened)
const allowedOrigins = [
  'https://luminnus-dashboard.onrender.com',
  'https://luminnus.ai',
  'http://localhost:3000',
  'http://localhost:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === origin) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/version', versionRouter);
app.use('/api/me', meRouter);
app.use('/api/auth', authRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/live-token', liveTokenRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/briefing', briefingRoutes);
app.use('/api/integrations/hub', hubRoutes);
app.use('/api/whatsapp', whatsappWebhookRouter); // Meta Webhook verification
app.use('/api/integrations/whatsapp', whatsappIntegrationsRouter); // Client BYO integrations
app.use('/api/whatsapp/embedded', whatsappEmbeddedRouter); // Embedded Signup flow
app.use('/api/memory', assistantRouter);
app.use('/api/location', assistantRouter);
app.use('/api/admin/whatsapp', whatsappAdminRouter);
app.use('/api/admin', adminRouter);

// Error handler
app.use(errorHandler);

// Create HTTP server and attach WebSocket
const server: http.Server = http.createServer(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║  LUMINNUS PLATFORM CORE - API                          ║
╠════════════════════════════════════════════════════════╣
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║  Port: ${String(PORT).padEnd(47)}║
║  Health: http://localhost:${PORT}/api/health${' '.repeat(23 - String(PORT).length)}║
║  Version: http://localhost:${PORT}/api/version${' '.repeat(22 - String(PORT).length)}║
╚════════════════════════════════════════════════════════╝
  `);
});

export { app, server };
