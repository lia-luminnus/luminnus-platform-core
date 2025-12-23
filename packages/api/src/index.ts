import './config/env.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health.js';
import { versionRouter } from './routes/version.js';
import { meRouter } from './routes/me.js';
import { authRouter } from './routes/auth.js';
import { integrationsRouter } from './routes/integrations.js';
import { errorHandler } from './middleware/error.js';
import { setupWebSocket } from './ws/gateway.js';
import http from 'http';

const app: express.Express = express();
const PORT = process.env.PORT || 5000;

// Logs de debug no boot
console.log('[ENV] PORT:', PORT);
console.log('[ENV] APP_URL:', process.env.APP_URL);
console.log('[ENV] GOOGLE_CLIENT_ID loaded:', !!process.env.GOOGLE_CLIENT_ID);
console.log('[ENV] SUPABASE_URL loaded:', !!process.env.SUPABASE_URL);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/version', versionRouter);
app.use('/api/me', meRouter);
app.use('/api/auth', authRouter);
app.use('/api/integrations', integrationsRouter);

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
║  Health: http://localhost:${PORT}/health${' '.repeat(27 - String(PORT).length)}║
║  Version: http://localhost:${PORT}/version${' '.repeat(26 - String(PORT).length)}║
╚════════════════════════════════════════════════════════╝
  `);
});

export { app, server };
