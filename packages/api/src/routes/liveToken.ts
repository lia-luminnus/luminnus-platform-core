import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const liveTokenRouter: Router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const CORE_BACKEND_URL = process.env.LIA_CORE_API_URL || process.env.CORE_API_URL || 'http://127.0.0.1:3000';

/**
 * GET /api/live-token
 * Retorna um token efêmero para sessões de Gemini Live
 */
liveTokenRouter.get('/', async (req: Request, res: Response) => {
    try {
        const conversationId = req.query.conversationId as string;

        // Extrair userId do token de autenticação
        let userId: string | null = null;
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const { data: { user }, error } = await supabase.auth.getUser(token);
                if (!error && user) userId = user.id;
            } catch (e) {
                console.warn('[LiveToken] JWT auth error:', e);
            }
        }

        // Fallback para query param
        if (!userId) {
            userId = req.query.userId as string || null;
        }

        if (!userId) {
            return res.status(401).json({ ok: false, error: 'Unauthorized: userId required' });
        }

        console.log(`[LiveToken] Gerando token para user=${userId}, conv=${conversationId}`);

        const search = new URLSearchParams();
        if (conversationId) search.set('conversationId', conversationId);

        const upstreamUrl = `${CORE_BACKEND_URL}/api/live-token${search.toString() ? `?${search.toString()}` : ''}`;
        const upstreamRes = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
                'Authorization': req.headers.authorization || '',
                'X-User-Id': userId,
            },
        });

        const upstreamPayload: any = await upstreamRes.json().catch(() => ({}));

        if (!upstreamRes.ok) {
            console.error('[LiveToken] ❌ Falha no backend core:', upstreamPayload);
            return res.status(upstreamRes.status).json({
                ok: false,
                error: upstreamPayload?.error || 'Failed to generate ephemeral token from core backend',
            });
        }

        if (!upstreamPayload?.token) {
            return res.status(502).json({
                ok: false,
                error: 'Core backend returned invalid live token payload',
            });
        }

        console.log('[LiveToken] ✅ Token efêmero recebido do backend core');

        return res.json({
            ok: true,
            token: upstreamPayload.token,
            expiresAt: upstreamPayload.expiresAt || null,
            conversationId: conversationId || upstreamPayload.conversationId || null,
            userId,
        });
    } catch (err) {
        console.error('[LiveToken] Exception:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

export default liveTokenRouter;
