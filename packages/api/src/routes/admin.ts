import { Router } from 'express';
import type { Request, Response } from 'express';
import { adminGate, getAdminContext } from '../middleware/adminGate.js';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: Router = Router();

// Test a single service connection
async function testService(
    serviceName: string
): Promise<{ name: string; status: 'OK' | 'DEGRADED' | 'DOWN'; latency_ms: number; message?: string; key_loaded?: boolean }> {
    const startTime = Date.now();

    try {
        switch (serviceName) {
            case 'supabase': {
                if (!config.supabaseUrl || !config.supabaseKey) {
                    return { name: 'supabase', status: 'DOWN', latency_ms: 0, message: 'Missing configuration' };
                }
                const client = createClient(config.supabaseUrl, config.supabaseKey);
                await client.from('profiles').select('count').limit(1);
                const latency = Date.now() - startTime;
                return { name: 'supabase', status: latency > 1000 ? 'DEGRADED' : 'OK', latency_ms: latency };
            }

            case 'openai': {
                const keyLoaded = !!process.env.OPENAI_API_KEY;
                return { name: 'openai', status: keyLoaded ? 'OK' : 'DOWN', latency_ms: Date.now() - startTime, key_loaded: keyLoaded };
            }

            case 'google': {
                const keyLoaded = !!process.env.GOOGLE_CLIENT_ID;
                return { name: 'google', status: keyLoaded ? 'OK' : 'DOWN', latency_ms: Date.now() - startTime, key_loaded: keyLoaded };
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

/**
 * GET /api/admin/system/health
 */
router.get('/system/health', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    try {
        const services = await Promise.all([
            testService('supabase'),
            testService('openai'),
            testService('google'),
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
 */
router.get('/system/logs', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    try {
        const logs = [
            {
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'System diagnostic logs - Core API',
                trace_id: ctx?.traceId,
                service: 'admin',
                route: '/api/admin/system/logs',
            }
        ];

        res.json({
            logs,
            count: logs.length,
            limit,
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error(`❌ [Admin] Logs retrieval error:`, error);
        res.status(500).json({ error: 'Logs retrieval failed', trace_id: ctx?.traceId });
    }
});

export default router;
