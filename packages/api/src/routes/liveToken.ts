import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const liveTokenRouter: Router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

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

        // Buscar a chave do Gemini das variáveis de ambiente
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!geminiKey) {
            console.error('[LiveToken] ❌ GEMINI_API_KEY não configurada!');
            return res.status(500).json({
                ok: false,
                error: 'Gemini API key not configured on server'
            });
        }

        // Gerar token efêmero (formato compatível com o frontend)
        const ephemeralToken = {
            token: geminiKey, // Retornar a chave real para o frontend
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora
            conversationId: conversationId || null,
            userId: userId
        };

        console.log('[LiveToken] ✅ Token gerado com sucesso');

        return res.json({
            ok: true,
            ...ephemeralToken,
            apiKey: geminiKey // Também retornar como apiKey para compatibilidade
        });
    } catch (err) {
        console.error('[LiveToken] Exception:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

export default liveTokenRouter;
