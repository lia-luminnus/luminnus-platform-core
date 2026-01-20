import { Router, Response } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';
import { HubService } from '../services/hubService.js';

const router: Router = Router();

/**
 * GET /api/integrations
 * Lista conexões ativas do usuário
 */
router.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId || !supabase) {
            return res.status(500).json({ error: 'Contexto de autenticação ou Supabase ausente' });
        }

        // 1. Buscar conexões (Google Workspace, etc)
        const { data: integrations, error: iError } = await supabase
            .from('integrations_connections')
            .select('*')
            .eq('user_id', userId);

        if (iError) console.error('[Integrations] Erro conexões:', iError);

        // 2. Buscar logs recentes
        const { data: logs } = await supabase
            .from('integration_activity_log')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        res.json({
            integrations: (integrations || []).map(i => ({
                id: i.id,
                provider: i.provider,
                services: i.scopes || [],
                status: i.status,
                connected_at: i.created_at
            })),
            logs: (logs || []).map(l => ({
                id: l.id,
                provider: l.provider,
                action: l.action,
                status: l.status,
                message: l.message,
                created_at: l.created_at
            }))
        });
    } catch (error: any) {
        console.error('[Integrations] Erro fatal:', error);
        res.status(500).json({ error: 'Erro ao listar integrações' });
    }
});

// ============================================
// HUB ENDPOINTS
// ============================================

// --- Keys ---
router.get('/hub/keys', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const keys = await HubService.listKeys(req.user!.id);
        res.json(keys);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hub/keys', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { name } = req.body;
        const key = await HubService.generateKey(req.user!.id, name);
        res.json(key);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/hub/keys/:id', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        await HubService.revokeKey(req.user!.id, req.params.id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Webhooks ---
router.get('/hub/webhooks', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const items = await HubService.listWebhooks(req.user!.id);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hub/webhooks', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { url, events } = req.body;
        const item = await HubService.createWebhook(req.user!.id, url, events);
        res.json(item);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Endpoints ---
router.get('/hub/endpoints', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const items = await HubService.listEndpoints(req.user!.id);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hub/endpoints', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const item = await HubService.saveEndpoint(req.user!.id, req.body);
        res.json(item);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Mappings ---
router.get('/hub/mapping', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const items = await HubService.getMappings(req.user!.id);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/hub/mapping', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const { modelType, rules } = req.body;
        const item = await HubService.saveMapping(req.user!.id, modelType, rules);
        res.json(item);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- Logs ---
router.get('/hub/logs', verifyAuth, async (req: AuthenticatedRequest, res) => {
    try {
        const items = await HubService.listLogs(req.user!.id);
        res.json(items);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Setup function
 */
export function setupIntegrationsRoutes(app: any) {
    app.use('/api/integrations', router);
    console.log('✅ Integrations & Hub routes configured');
}
