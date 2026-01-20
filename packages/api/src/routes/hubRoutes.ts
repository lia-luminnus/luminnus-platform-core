import { Router } from 'express';
import { HubService } from '../services/hubService.js';

const router: Router = Router();

// --- API Keys ---
router.get('/keys', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const keys = await HubService.listKeys(tenantId);
        res.json(keys);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/keys', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const { name } = req.body;
        const key = await HubService.generateKey(tenantId, name);
        res.json(key);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/keys/:id', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        await HubService.revokeKey(tenantId, req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Webhooks ---
router.get('/webhooks', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const webhooks = await HubService.listWebhooks(tenantId);
        res.json(webhooks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/webhooks', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const { url, events } = req.body;
        const webhook = await HubService.createWebhook(tenantId, url, events);
        res.json(webhook);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Endpoints ---
router.get('/endpoints', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const endpoints = await HubService.listEndpoints(tenantId);
        res.json(endpoints);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/endpoints', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const endpoint = await HubService.saveEndpoint(tenantId, req.body);
        res.json(endpoint);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Mappings ---
router.get('/mappings', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const mappings = await HubService.getMappings(tenantId);
        res.json(mappings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/mappings', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const { modelType, rules } = req.body;
        const mapping = await HubService.saveMapping(tenantId, modelType, rules);
        res.json(mapping);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Logs & Diagnostics ---
router.get('/logs', async (req: any, res) => {
    try {
        const tenantId = req.user?.id;
        const logs = await HubService.listLogs(tenantId);
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
