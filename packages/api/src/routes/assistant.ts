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

        const { data, error } = await supabase
            .from('cognitive_memory')
            .select('key, content, importance')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[Assistant] Memory load error:', error);
            return res.json({ memories: [] });
        }

        const memories = (data || []).map((m: any) => ({
            key: m.key,
            content: m.content,
            importance: m.importance
        }));

        return res.json({ memories });
    } catch (err) {
        console.error('[Assistant] Memory load exception:', err);
        return res.json({ memories: [] });
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
