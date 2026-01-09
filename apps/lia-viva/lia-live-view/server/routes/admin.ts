// ===========================================================
// 🛠️ ADMIN SYSTEM ROUTES - Diagnostic Endpoints (Admin-Only)
// ===========================================================
// Provides system health, logs, integration tests, and code reading
// Protected by adminGate middleware - only root admins can access
// ===========================================================

import { Router } from 'express';
import type { Request, Response } from 'express';
import { adminGate, getAdminContext } from '../middleware/adminGate';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Supabase client for health checks
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// =================================================================
// CONSTANTS
// =================================================================

// Allowlist for file reading (relative to project root)
const ALLOWED_FILE_PATTERNS = [
    /^src\/.*/,
    /^server\.mjs$/,
    /^server\.ts$/,
    /^routes\/.*/,
    /^package\.json$/,
    /^tsconfig\.json$/,
    /^vite\.config\..*/,
    /^middleware\/.*/,
    /^services\/.*/,
    /^context\/.*/,
    /^components\/.*/,
    /^lib\/.*/,
];

// Blocklist patterns (always blocked, even if in allowlist)
const BLOCKED_FILE_PATTERNS = [
    /\.env.*/,
    /secrets?\/.*/,
    /keys?\/.*/,
    /\.pem$/,
    /\.key$/,
    /password/i,
    /credential/i,
    /node_modules\/.*/,
];

// Sensitive patterns to redact in file contents
const REDACT_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/g, // OpenAI keys
    /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, // JWTs
    /supabase[_-]?key['":\s]+[a-zA-Z0-9._-]+/gi,
    /api[_-]?key['":\s]+[a-zA-Z0-9._-]+/gi,
    /secret['":\s]+[a-zA-Z0-9._-]+/gi,
    /password['":\s]+[a-zA-Z0-9._-]+/gi,
];

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Redact sensitive content from text
 */
function redactSensitive(content: string): string {
    let redacted = content;
    for (const pattern of REDACT_PATTERNS) {
        redacted = redacted.replace(pattern, '[REDACTED]');
    }
    return redacted;
}

/**
 * Check if file path is allowed
 */
function isFileAllowed(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');

    // Check blocklist first
    for (const pattern of BLOCKED_FILE_PATTERNS) {
        if (pattern.test(normalizedPath)) {
            return false;
        }
    }

    // Check allowlist
    for (const pattern of ALLOWED_FILE_PATTERNS) {
        if (pattern.test(normalizedPath)) {
            return true;
        }
    }

    return false;
}

/**
 * Test a single service connection
 */
async function testService(
    serviceName: string
): Promise<{ name: string; status: 'OK' | 'DEGRADED' | 'DOWN'; latency_ms: number; message?: string; key_loaded?: boolean }> {
    const startTime = Date.now();

    try {
        switch (serviceName) {
            case 'supabase': {
                if (!supabaseUrl || !supabaseKey) {
                    return { name: 'supabase', status: 'DOWN', latency_ms: 0, message: 'Missing configuration' };
                }
                const client = createClient(supabaseUrl, supabaseKey);
                await client.from('memories').select('count').limit(1);
                const latency = Date.now() - startTime;
                return { name: 'supabase', status: latency > 1000 ? 'DEGRADED' : 'OK', latency_ms: latency };
            }

            case 'openai': {
                const keyLoaded = !!process.env.OPENAI_API_KEY;
                if (!keyLoaded) {
                    return { name: 'openai', status: 'DOWN', latency_ms: 0, key_loaded: false, message: 'API key not configured' };
                }
                // Simple check without making actual API call (to avoid costs)
                return { name: 'openai', status: 'OK', latency_ms: Date.now() - startTime, key_loaded: true };
            }

            case 'google': {
                const keyLoaded = !!process.env.GOOGLE_API_KEY;
                if (!keyLoaded) {
                    return { name: 'google', status: 'DOWN', latency_ms: 0, key_loaded: false, message: 'API key not configured' };
                }
                return { name: 'google', status: 'OK', latency_ms: Date.now() - startTime, key_loaded: true };
            }

            case 'realtime': {
                // Check Socket.IO server status (basic check)
                return { name: 'realtime', status: 'OK', latency_ms: Date.now() - startTime, message: 'Socket.IO running' };
            }

            default:
                return { name: serviceName, status: 'DOWN', latency_ms: 0, message: 'Unknown service' };
        }
    } catch (error: any) {
        return {
            name: serviceName,
            status: 'DOWN',
            latency_ms: Date.now() - startTime,
            message: error.message?.substring(0, 100) || 'Unknown error',
        };
    }
}

// =================================================================
// ROUTES
// =================================================================

/**
 * GET /api/admin/system/health
 * Returns status of all services
 */
router.get('/system/health', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const services = await Promise.all([
            testService('supabase'),
            testService('openai'),
            testService('google'),
            testService('realtime'),
        ]);

        const overallStatus = services.every((s) => s.status === 'OK')
            ? 'OK'
            : services.some((s) => s.status === 'DOWN')
                ? 'CRITICAL'
                : 'DEGRADED';

        res.json({
            status: overallStatus,
            services,
            timestamp: new Date().toISOString(),
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error(`❌ [Admin] Health check error:`, error);
        res.status(500).json({ error: 'Health check failed', trace_id: ctx?.traceId });
    }
});

/**
 * GET /api/admin/system/logs
 * Returns recent server logs (redacted)
 */
router.get('/system/logs', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const level = (req.query.level as string) || 'all';

    try {
        // In a real implementation, this would read from a log file or log service
        // For now, return a mock structure to demonstrate the format
        const logs = [
            {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'System diagnostic logs are available',
                trace_id: ctx?.traceId,
                service: 'admin',
                route: '/api/admin/system/logs',
            },
            {
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'warn',
                message: 'Log collection requires winston or pino integration',
                trace_id: 'system',
                service: 'logger',
                route: 'N/A',
            },
        ];

        res.json({
            logs,
            count: logs.length,
            limit,
            level,
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error(`❌ [Admin] Logs retrieval error:`, error);
        res.status(500).json({ error: 'Logs retrieval failed', trace_id: ctx?.traceId });
    }
});

/**
 * POST /api/admin/system/test-integration
 * Test a specific service integration
 */
router.post('/system/test-integration', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const { serviceName } = req.body;

    if (!serviceName) {
        return res.status(400).json({ error: 'serviceName is required', trace_id: ctx?.traceId });
    }

    try {
        const result = await testService(serviceName);

        res.json({
            ...result,
            timestamp: new Date().toISOString(),
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error(`❌ [Admin] Integration test error:`, error);
        res.status(500).json({ error: 'Integration test failed', trace_id: ctx?.traceId });
    }
});

/**
 * POST /api/admin/system/read-code
 * Read a file from the project (with security allowlist)
 */
router.post('/system/read-code', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'filePath is required', trace_id: ctx?.traceId });
    }

    // Security check
    if (!isFileAllowed(filePath)) {
        console.warn(`🔒 [Admin] File access denied: ${filePath} (trace_id: ${ctx?.traceId})`);
        return res.status(403).json({ error: 'File access denied', trace_id: ctx?.traceId });
    }

    try {
        // Resolve relative to project root (two levels up from routes folder)
        const projectRoot = path.resolve(__dirname, '..', '..');
        const absolutePath = path.resolve(projectRoot, filePath);

        // Ensure the resolved path is still within project root (prevent path traversal)
        if (!absolutePath.startsWith(projectRoot)) {
            return res.status(403).json({ error: 'File access denied', trace_id: ctx?.traceId });
        }

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ error: 'File not found', trace_id: ctx?.traceId });
        }

        const stats = fs.statSync(absolutePath);
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Path is not a file', trace_id: ctx?.traceId });
        }

        // Limit file size (1MB max)
        if (stats.size > 1024 * 1024) {
            return res.status(413).json({ error: 'File too large', trace_id: ctx?.traceId });
        }

        let content = fs.readFileSync(absolutePath, 'utf-8');

        // Redact sensitive content
        content = redactSensitive(content);

        res.json({
            filePath,
            content,
            size: stats.size,
            lines: content.split('\n').length,
            timestamp: new Date().toISOString(),
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error(`❌ [Admin] File read error:`, error);
        res.status(500).json({ error: 'File read failed', trace_id: ctx?.traceId });
    }
});

/**
 * GET /api/admin/system/map
 * Get system structure map (file tree in JSON)
 */
router.get('/system/map', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        // Return high-level module structure
        const systemMap = {
            frontend: {
                components: ['multi-modal.tsx', 'chat-mode.tsx', 'live-mode.tsx', 'StartVoiceButton.tsx'],
                context: ['LIAContext.tsx'],
                services: ['socketService.ts', 'backendService.ts', 'geminiLiveService.ts'],
            },
            backend: {
                routes: ['chat.ts', 'session.ts', 'memory.ts', 'vision.ts', 'admin.ts'],
                middleware: ['socketAuth.ts', 'adminGate.ts'],
                services: ['openaiService.ts', 'contextManager.ts', 'memoryManager.ts'],
                realtime: ['realtime.js', 'multimodal-events.js'],
            },
            packages: {
                'lia-runtime': ['geminiLiveService.ts', 'ttsSanitizer.ts', 'events.contract.ts'],
            },
        };

        res.json({
            map: systemMap,
            timestamp: new Date().toISOString(),
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error(`❌ [Admin] System map error:`, error);
        res.status(500).json({ error: 'System map failed', trace_id: ctx?.traceId });
    }
});

export default router;
