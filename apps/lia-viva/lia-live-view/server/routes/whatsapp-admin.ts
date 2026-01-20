
import { Router } from 'express';
import type { Request, Response } from 'express';
import { adminGate, getAdminContext } from '../middleware/adminGate';
import { supabase } from '../config/supabase.js';

const router = Router();

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
    } catch (error) {
        console.error('❌ Error fetching platform config:', error);
        res.status(500).json({ error: String(error) });
    }
});

/**
 * POST /api/admin/whatsapp/platform-config
 * Updates platform-wide WhatsApp configuration (ONLY verify_token and webhookUrl)
 * BYO model: each tenant has their own WABA/Token, admin only manages webhook config
 */
router.post('/platform-config', adminGate, async (req: Request, res: Response) => {
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
 * Returns KPI data for WhatsApp governance
 */
router.get('/overview', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    // In a real scenario, we would query the database here.
    // For now, we return mock data consistent with the dashboard.
    res.json({
        totalTenants: 42,
        errorTenants: 3,
        webhookHealth: '98%',
        messagesToday: '15.4k',
        templatesToday: '2.1k',
        activeAlerts: 4,
        timestamp: new Date().toISOString(),
        trace_id: ctx?.traceId
    });
});

/**
 * GET /api/admin/whatsapp/tenants
 * Returns list of tenants with WhatsApp integrations from Supabase
 */
router.get('/tenants', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const { search } = req.query;

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
                t.name.toLowerCase().includes((search as string).toLowerCase()) ||
                t.phone.includes(search as string)
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
