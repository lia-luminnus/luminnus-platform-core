import express from 'express';

const router = express.Router();

// In-memory storage for development (replace with Supabase in production)
const dashConfigs = new Map();

/**
 * GET /api/dashboard/tenant/:tenantId/dashboard/active
 * Retorna o dashboard ativo do tenant
 */
router.get('/tenant/:tenantId/dashboard/active', (req, res) => {
    const { tenantId } = req.params;
    const config = dashConfigs.get(tenantId);

    if (config) {
        res.json({ success: true, config_json: config });
    } else {
        // Retornar 200 com null evita erro 404 no console e permite fallback silencioso do frontend
        console.log(`ℹ️ [Dashboard] Tenant sem config salva: ${tenantId}. Enviando sinal de fallback.`);
        res.json({ success: true, config_json: null });
    }
});

/**
 * POST /api/dashboard/tenant/:tenantId/dashboard/save-version
 * Salva uma nova versão do dashboard
 */
router.post('/tenant/:tenantId/dashboard/save-version', (req, res) => {
    const { tenantId } = req.params;
    const { config_json } = req.body;

    if (!tenantId || !config_json) {
        return res.status(400).json({ error: 'tenantId and config_json are required' });
    }

    dashConfigs.set(tenantId, config_json);
    console.log(`💾 [Dashboard] Configuração salva para tenant: ${tenantId}`);

    res.json({ success: true });
});

/**
 * POST /api/dashboard/save (Compatibilidade com versões anteriores)
 */
router.post('/save', (req, res) => {
    const { tenantId, config } = req.body;
    if (!tenantId || !config) {
        return res.status(400).json({ error: 'tenantId and config are required' });
    }

    dashConfigs.set(tenantId, config);
    res.json({ success: true });
});

/**
 * POST /api/dashboard/tenant/:tenantId/dashboard/instantiate
 * Cria um dashboard a partir de template
 */
router.post('/tenant/:tenantId/dashboard/instantiate', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { segment_key } = req.body;

        if (!tenantId || !segment_key) {
            return res.status(400).json({ error: 'tenantId e segment_key são obrigatórios' });
        }

        const { default: dashboardService } = await import('../services/dashboardService.js');
        const dashboard = await dashboardService.instantiateDashboard(tenantId, segment_key);

        res.status(201).json({
            success: true,
            dashboard_id: dashboard.id,
            version: dashboard.version
        });
    } catch (err: any) {
        console.error('[Dashboard] Erro ao instanciar:', err);
        res.status(500).json({ error: err.message });
    }
});

export function setupDashboardRoutes(app: any) {
    app.use('/api/dashboard', router);
    console.log('✅ Dashboard routes configured');
}
