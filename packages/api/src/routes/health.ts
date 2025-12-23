import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const healthRouter: Router = Router();

interface HealthCheck {
    name: string;
    status: 'ok' | 'error';
    message?: string;
}

async function checkSupabase(): Promise<HealthCheck> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return {
            name: 'supabase',
            status: 'error',
            message: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY'
        };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Simple connectivity check - just verify we can reach Supabase
        const { error } = await supabase.from('_health_check_dummy').select('*').limit(0);

        // Error code PGRST116 = table not found, which is expected and means connection works
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
            return {
                name: 'supabase',
                status: 'error',
                message: 'Connection failed'
            };
        }

        return { name: 'supabase', status: 'ok' };
    } catch {
        return {
            name: 'supabase',
            status: 'error',
            message: 'Connection failed'
        };
    }
}

healthRouter.get('/', async (_req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const env = process.env.NODE_ENV || 'development';

    const checks: HealthCheck[] = [
        { name: 'api', status: 'ok' },
        await checkSupabase()
    ];

    const overallStatus = checks.every(c => c.status === 'ok') ? 'ok' : 'degraded';

    res.json({
        status: overallStatus,
        env,
        timestamp,
        checks: checks.map(c => ({
            name: c.name,
            status: c.status,
            ...(c.message && { message: c.message })
        }))
    });
});
