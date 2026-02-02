/**
 * Assistant Routes
 * 
 * API endpoints para suporte às funcionalidades da LIA no Dashboard
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router: Router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/memory/load
 * Carrega memórias persistentes do usuário
 */
router.get('/load', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        console.log(`[Assistant] Carregando memórias para: ${userId}`);

        // Tentar carregar da view cognitive_memory (preferencial)
        let data: any[] | null = null;
        let error: any = null;

        // Attempt 1: Try cognitive_memory view
        const result1 = await supabase
            .from('cognitive_memory')
            .select('key, content, importance')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .limit(50);

        if (result1.error) {
            console.warn('[Assistant] cognitive_memory view not available:', result1.error.message);

            // Attempt 2: Try memories table directly
            const result2 = await supabase
                .from('memories')
                .select('key, content, value, importance')
                .eq('user_id', userId)
                .order('importance', { ascending: false })
                .limit(50);

            if (result2.error) {
                console.warn('[Assistant] memories table also failed:', result2.error.message);
                // Return empty gracefully - memory is optional
                return res.json({ memories: [] });
            }
            data = result2.data;
        } else {
            data = result1.data;
        }

        const memories = (data || []).map((m: any) => ({
            key: m.key || m.id,
            content: m.content || m.value || '',
            importance: m.importance || 0
        }));

        return res.json({ memories });
    } catch (err) {
        console.error('[Assistant] Memory load exception:', err);
        return res.json({ memories: [] });
    }
});

/**
 * GET /api/location
 * Retorna dados de localização/timezone para bootstrap do dashboard
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        return res.json({
            ok: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            now: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/location
 * Salva localização do usuário (mock persistente por enquanto)
 */
router.post('/location', async (req: Request, res: Response) => {
    try {
        const { userId, location } = req.body;
        console.log(`[Assistant] Localização recebida para ${userId}:`, location);

        // Em um sistema real, salvaríamos isso na sessão
        // Por enquanto, apenas confirmamos o recebimento
        return res.json({ success: true, location });
    } catch (err) {
        console.error('[Assistant] Location exception:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
