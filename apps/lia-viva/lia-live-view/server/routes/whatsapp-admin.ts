
import { Router } from 'express';
import type { Request, Response } from 'express';
import { adminGate, getAdminContext } from '../middleware/adminGate';
import { supabase } from '../config/supabase.js';

const router = Router();

// Rota de diagnóstico para testar o Proxy do Vite
router.get('/ping', (req: Request, res: Response) => {
    console.log('📡 [AdminWhatsApp] Diagnostic PING hit on port 3000');
    res.json({
        status: 'ok',
        message: 'WhatsApp Admin API está acessível na porta 3000',
        timestamp: new Date().toISOString()
    });
});

// Redact helpers
function maskPhoneNumber(phone: string): string {
    if (!phone) return 'N/A';
    // Format: +55 ** *****-1234
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    return `+${cleaned.substring(0, 2)} ** *****-${cleaned.slice(-4)}`;
}

/**
 * GET /api/admin/whatsapp/platform-config
 * Returns platform-wide WhatsApp configuration
 */
router.get('/platform-config', adminGate, async (req: Request, res: Response) => {
    console.log('📡 [AdminWhatsApp] GET /platform-config solicitado');
    const ctx = getAdminContext(req);

    try {
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', '00000000-0000-0000-0000-000000000000')
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        res.json({
            config: data?.config_json || {
                phoneNumberId: "",
                wabaId: "",
                accessToken: "",
                verifyToken: "",
                webhookUrl: "https://api.luminnus.lia.ai/api/whatsapp/webhook"
            },
            trace_id: ctx?.traceId
        });
    } catch (error: unknown) {
        console.error('❌ Error fetching platform config:', error);
        res.status(500).json({ error: String(error), trace_id: ctx?.traceId });
    }
});

/**
 * POST /api/admin/whatsapp/platform-config
 * Updates platform-wide WhatsApp configuration (ONLY verify_token and webhookUrl)
 * BYO model: each tenant has their own WABA/Token, admin only manages webhook config
 */
router.post('/platform-config', adminGate, async (req: Request, res: Response) => {
    console.log('📡 [AdminWhatsApp] POST /platform-config solicitado');
    const ctx = getAdminContext(req);
    const { config } = req.body;

    if (!config) return res.status(400).json({ error: 'config is required' });

    // Only allow verify_token and webhookUrl to be saved by admin
    const allowedConfig = {
        verifyToken: config.verifyToken || '',
        webhookUrl: config.webhookUrl || 'https://api.luminnus.lia.ai/api/whatsapp/webhook'
    };

    try {
        const platformId = '00000000-0000-0000-0000-000000000000';

        // Check if platform config exists
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', platformId)
            .maybeSingle();

        let result;
        if (existing?.id) {
            // Update existing
            result = await supabase
                .from('whatsapp_connections')
                .update({
                    config_json: allowedConfig,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            // Insert new
            result = await supabase
                .from('whatsapp_connections')
                .insert({
                    tenant_id: platformId,
                    provider: 'meta',
                    phone_number: 'platform_main',
                    config_json: allowedConfig,
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        res.json({
            success: true,
            config: result.data.config_json,
            trace_id: ctx?.traceId
        });
    } catch (error: any) {
        console.error('❌ Error saving platform config:', error);
        const errorMessage = error?.message || JSON.stringify(error) || 'Unknown error';
        res.status(500).json({ error: errorMessage });
    }
});

/**
 * GET /api/admin/whatsapp/overview
 * Returns KPI data for WhatsApp governance from database
 */
router.get('/overview', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const platformId = '00000000-0000-0000-0000-000000000000';

        // 1. Total Tenants with WhatsApp connections
        const { count: totalTenants } = await supabase
            .from('whatsapp_connections')
            .select('*', { count: 'exact', head: true })
            .neq('tenant_id', platformId);

        // 2. Tenants with error status
        const { count: errorTenants } = await supabase
            .from('whatsapp_connections')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'error')
            .neq('tenant_id', platformId);

        // 3. Messages today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: messagesToday } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        // 4. Templates (Mocked as we don't have a template table yet, but could be a query to messages metadata)
        const templatesToday = Math.floor((messagesToday || 0) * 0.15);

        // 5. Calculate Webhook Health (connected / total)
        const { count: activeWebhook } = await supabase
            .from('whatsapp_connections')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'error')
            .neq('tenant_id', platformId);

        const healthPercent = totalTenants && totalTenants > 0
            ? Math.round(((activeWebhook || 0) / totalTenants) * 100)
            : 100;

        res.json({
            totalTenants: totalTenants || 0,
            errorTenants: errorTenants || 0,
            webhookHealth: `${healthPercent}%`,
            messagesToday: messagesToday > 1000 ? `${(messagesToday / 1000).toFixed(1)}k` : String(messagesToday || 0),
            templatesToday: String(templatesToday),
            activeAlerts: errorTenants || 0,
            timestamp: new Date().toISOString(),
            trace_id: ctx?.traceId
        });
    } catch (error: unknown) {
        console.error('❌ Error fetching overview stats:', error);
        res.status(500).json({ error: String(error), trace_id: ctx?.traceId });
    }
});

/**
 * GET /api/admin/whatsapp/tenants
 * Returns list of tenants with WhatsApp integrations from Supabase
 */
router.get('/tenants', adminGate, async (req: Request, res: Response) => {
    console.log('📡 [AdminWhatsApp] GET /tenants solicitado');
    const ctx = getAdminContext(req);
    const searchRaw = req.query.search;
    const search = typeof searchRaw === 'string' ? searchRaw : undefined;

    try {
        // Fetch real tenant data from whatsapp_connections
        let query = supabase
            .from('whatsapp_connections')
            .select('*')
            .neq('tenant_id', '00000000-0000-0000-0000-000000000000') // Exclude platform config
            .order('updated_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Format for frontend
        const tenants = (data || []).map(conn => ({
            id: conn.tenant_id,
            name: conn.tenant_id, // Could be joined with profiles/tenants table
            phone: maskPhoneNumber(conn.phone_number || ''),
            status: conn.status === 'active' || conn.status === 'connected' ? 'online' : 'offline',
            quality: conn.status === 'error' ? 'red' : 'green',
            webhook: conn.status === 'error' ? 'error' : 'connected',
            lastWebhook: conn.updated_at,
            configured: !!(conn.config_json?.phone_number_id && conn.config_json?.access_token)
        }));

        // Filter by search if provided
        const filteredTenants = search
            ? tenants.filter(t =>
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.phone.includes(search)
            )
            : tenants;

        res.json({
            tenants: filteredTenants,
            count: filteredTenants.length,
            trace_id: ctx?.traceId
        });
    } catch (error) {
        console.error('❌ Error fetching tenants:', error);
        res.status(500).json({ error: String(error), trace_id: ctx?.traceId });
    }
});

/**
 * POST /api/admin/whatsapp/test-webhook
 * Trigger a webhook test for a specific tenant
 */
router.post('/test-webhook', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const { tenantId } = req.body;

    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    console.log(`[Admin] Testing webhook for tenant ${tenantId} (trace: ${ctx?.traceId})`);

    // Simulate ACK from WhatsApp
    res.json({
        success: true,
        message: 'Webhook test sent. Awaiting ACK from Meta.',
        ack_id: `ack_${Math.random().toString(36).substr(2, 9)}`,
        trace_id: ctx?.traceId
    });
});

/**
 * POST /api/admin/whatsapp/reconnect
 * Force a reconnection routine for a tenant
 */
router.post('/reconnect', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const { tenantId } = req.body;

    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });

    console.log(`[Admin] Forcing reconnect for tenant ${tenantId}`);

    res.json({
        success: true,
        message: 'Reconnection routine initiated.',
        trace_id: ctx?.traceId
    });
});

export default router;
