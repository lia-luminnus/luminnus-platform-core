import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

export const conversationRouter: Router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/conversations
 * Lista todas as conversas do usuário
 */
conversationRouter.get('/', async (req: Request, res: Response) => {
    try {
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ ok: false, error: 'Unauthorized: userId required' });
        }

        console.log(`[Conversations] Listando conversas para: ${userId}`);

        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[Conversations] Supabase list error:', error);
            return res.status(500).json({ ok: false, error: error.message });
        }

        return res.json({
            ok: true,
            conversations: data || []
        });
    } catch (err) {
        console.error('[Conversations] List exception:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

/**
 * Auxiliar: Extrair userId do token ou da query
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
    // 1. Tentar JWT
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (!error && user) return user.id;
        } catch (e) {
            console.warn('[Conversations] JWT auth error (continuando para fallback):', e);
        }
    }

    // 2. Fallback para query/body
    const userId = (req.query.userId as string) || req.body.userId || null;
    if (userId === 'null' || userId === 'undefined') return null;
    return userId;
}

/**
 * POST /api/conversations
 * Cria uma nova conversa
 */
conversationRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { mode, title, tenantId } = req.body;
        const userId = await getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({ ok: false, error: 'Unauthorized: userId required' });
        }

        console.log(`[Conversations] Criando conversa: mode=${mode}, user=${userId}`);

        // Inserir no Supabase (tabela conversations)
        const insertData: any = {
            user_id: userId,
            mode: mode || 'chat',
            title: title || `Conversa ${new Date().toLocaleString('pt-BR')}`,
            updated_at: new Date().toISOString()
        };

        // Adicionar tenant_id opcional (será criado por migration se faltar)
        if (tenantId) insertData.tenant_id = tenantId;

        const { data, error } = await supabase
            .from('conversations')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('[Conversations] Supabase insert error:', error);

            // Fallback: Tentar novamente sem tenant_id se o erro for de coluna inexistente
            if (error.message.includes('tenant_id') || error.code === '42703') {
                console.log('[Conversations] Retrying without tenant_id column...');
                delete insertData.tenant_id;
                const retry = await supabase
                    .from('conversations')
                    .insert(insertData)
                    .select()
                    .single();

                if (!retry.error) {
                    return res.json({
                        ok: true,
                        conversationId: retry.data.id,
                        conversation: retry.data
                    });
                }
            }

            return res.status(500).json({ ok: false, error: error.message });
        }

        // Dual format return for production compatibility
        return res.json({
            ok: true,
            conversationId: data.id,
            conversation: {
                id: data.id,
                mode: data.mode,
                title: data.title,
                updatedAt: data.updated_at
            }
        });
    } catch (err) {
        console.error('[Conversations] Exception:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

/**
 * GET /api/conversations/active
 * Retorna a conversa ativa do usuário por modo
 */
conversationRouter.get('/active', async (req: Request, res: Response) => {
    try {
        const mode = req.query.mode as string || 'chat';
        const userId = await getUserIdFromRequest(req);

        if (!userId) {
            return res.status(401).json({ ok: false, error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', userId)
            .eq('mode', mode)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('[Conversations] Active lookup error:', error);
            return res.status(500).json({ ok: false, error: error.message });
        }

        return res.json({
            ok: true,
            conversation: data || null
        });
    } catch (err) {
        console.error('[Conversations] Active exception:', err);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});
