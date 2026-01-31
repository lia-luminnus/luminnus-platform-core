import express from 'express';
import { AutomationService } from '../services/automationService.js';
import { AutomationRunner } from '../services/automationRunner.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Middleware to extract tenantId from auth (mocked for now, assuming user.id = tenantId)
const getTenantId = (req: any) => req.headers['x-tenant-id'] || req.query.tenantId || '00000000-0000-0000-0000-000000000001';

// --- Automations CRUD ---

router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await AutomationService.listAutomations(tenantId);
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const userId = req.body.userId || tenantId;
        const data = await AutomationService.createAutomation(tenantId, userId, req.body);
        res.status(201).json({ success: true, data });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await AutomationService.getAutomation(req.params.id, tenantId);
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(404).json({ success: false, error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await AutomationService.updateAutomation(req.params.id, tenantId, req.body);
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        await AutomationService.deleteAutomation(req.params.id, tenantId);
        res.json({ success: true });
    } catch (err: any) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// --- Execution & Monitoring ---

router.post('/:id/run', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const run = await AutomationRunner.trigger(req.params.id, tenantId, req.body.payload || {}, 'user');
        res.json({ success: true, runId: run?.id });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/:id/runs', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { data, error } = await supabase
            .from('automation_runs')
            .select('*')
            .eq('automation_id', req.params.id)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/runs/:runId/logs', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { data, error } = await supabase
            .from('automation_run_logs')
            .select('*')
            .eq('run_id', req.params.runId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/stats/summary', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const data = await AutomationService.getStats(tenantId);
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export function setupAutomationRoutes(app: any) {
    app.use('/api/automations', router);
}
