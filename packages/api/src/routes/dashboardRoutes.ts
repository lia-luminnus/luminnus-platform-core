/**
 * Dashboard Routes
 * 
 * API endpoints para gerenciamento de dashboards
 */

import { Router, Request, Response } from 'express';
import dashboardService from '../services/dashboardService';

const router = Router();

/**
 * GET /api/tenant/:tenantId/dashboard/active
 * Get the active dashboard for a tenant
 */
router.get('/tenant/:tenantId/dashboard/active', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;

        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        // Try to get merged config (with inheritance)
        let config = await dashboardService.getMergedConfig(tenantId);

        // If no merged config, try to get raw dashboard
        if (!config) {
            const dashboard = await dashboardService.getActiveDashboard(tenantId);
            config = dashboard?.config_json || null;
        }

        if (!config) {
            return res.status(404).json({
                error: 'Dashboard not found',
                message: 'Nenhum dashboard ativo encontrado. Complete o onboarding para criar um.'
            });
        }

        return res.json({ config_json: config });
    } catch (err) {
        console.error('[DashboardRoutes] Get active error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/tenant/:tenantId/dashboard/instantiate
 * Create a dashboard from template for a tenant
 */
router.post('/tenant/:tenantId/dashboard/instantiate', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { segment_key } = req.body;

        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        if (!segment_key) {
            return res.status(400).json({ error: 'segment_key is required' });
        }

        const dashboard = await dashboardService.instantiateDashboard(tenantId, segment_key);

        if (!dashboard) {
            return res.status(500).json({
                error: 'Failed to instantiate dashboard',
                message: 'Não foi possível criar o dashboard. Verifique se o template existe.'
            });
        }

        return res.status(201).json({
            success: true,
            dashboard_id: dashboard.id,
            version: dashboard.version,
            segment_key: dashboard.segment_key,
        });
    } catch (err) {
        console.error('[DashboardRoutes] Instantiate error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/tenant/:tenantId/dashboard/save-version
 * Save a new version of the dashboard
 */
router.post('/tenant/:tenantId/dashboard/save-version', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { config_json, description } = req.body;
        const userId = req.headers['x-user-id'] as string | undefined;

        if (!tenantId) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        if (!config_json) {
            return res.status(400).json({ error: 'config_json is required' });
        }

        const result = await dashboardService.saveVersion(tenantId, config_json, description, userId);

        if (!result.success) {
            return res.status(500).json({
                error: 'Failed to save version',
                message: 'Não foi possível salvar a versão do dashboard.'
            });
        }

        return res.json({
            success: true,
            version: result.version,
        });
    } catch (err) {
        console.error('[DashboardRoutes] Save version error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/tenant/:tenantId/dashboard/versions
 * Get version history for the active dashboard
 */
router.get('/tenant/:tenantId/dashboard/versions', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;

        const dashboard = await dashboardService.getActiveDashboard(tenantId);

        if (!dashboard) {
            return res.status(404).json({ error: 'No active dashboard' });
        }

        const versions = await dashboardService.getVersionHistory(dashboard.id, limit);

        return res.json({ versions });
    } catch (err) {
        console.error('[DashboardRoutes] Get versions error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/tenant/:tenantId/dashboard/restore
 * Restore a specific version
 */
router.post('/tenant/:tenantId/dashboard/restore', async (req: Request, res: Response) => {
    try {
        const { tenantId } = req.params;
        const { version_id } = req.body;

        if (!version_id) {
            return res.status(400).json({ error: 'version_id is required' });
        }

        const success = await dashboardService.restoreVersion(tenantId, version_id);

        if (!success) {
            return res.status(500).json({
                error: 'Failed to restore version',
                message: 'Não foi possível restaurar a versão.'
            });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error('[DashboardRoutes] Restore version error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
