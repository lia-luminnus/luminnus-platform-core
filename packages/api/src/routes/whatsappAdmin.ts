import { Router } from 'express';
import type { Request, Response } from 'express';
import { adminGate, getAdminContext } from '../middleware/adminGate.js';
import { supabase } from '../config/supabase.js';

const router: Router = Router();

// Redact helpers
function maskPhoneNumber(phone: string): string {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    return `+${cleaned.substring(0, 2)} ** *****-${cleaned.slice(-4)}`;
}

/**
 * GET /api/admin/whatsapp/platform-config
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
    } catch (error: unknown) {
        console.error('❌ Error fetching platform config:', error);
        res.status(500).json({ error: String(error), trace_id: ctx?.traceId });
    }
});

/**
 * POST /api/admin/whatsapp/platform-config
 */
router.post('/platform-config', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const { config } = req.body;

    if (!config) {
        return res.status(400).json({ error: 'config is required' });
    }

    try {
        const platformId = '00000000-0000-0000-0000-000000000000';

        const { data: existing, error: fetchError } = await supabase
            .from('whatsapp_connections')
            .select('id, config_json')
            .eq('tenant_id', platformId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const currentConfig = existing?.config_json || {};
        const mergedConfig = {
            ...currentConfig,
            verifyToken: config.verifyToken !== undefined ? config.verifyToken : currentConfig.verifyToken,
            webhookUrl: config.webhookUrl || currentConfig.webhookUrl || 'https://api.luminnus.lia.ai/api/whatsapp/webhook'
        };

        let result;
        if (existing?.id) {
            result = await supabase
                .from('whatsapp_connections')
                .update({
                    config_json: mergedConfig,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('whatsapp_connections')
                .insert({
                    tenant_id: platformId,
                    provider: 'meta',
                    phone_number: 'platform_main',
                    config_json: mergedConfig,
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
        console.error('❌ [AdminWhatsApp] Erro ao salvar platform config:', error);
        res.status(500).json({ error: error?.message || 'Unknown error', trace_id: ctx?.traceId });
    }
});

/**
 * GET /api/admin/whatsapp/overview
 */
router.get('/overview', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    try {
        const platformId = '00000000-0000-0000-0000-000000000000';

        const { count: totalTenants } = await supabase
            .from('whatsapp_connections')
            .select('*', { count: 'exact', head: true })
            .neq('tenant_id', platformId);

        const { count: errorTenants } = await supabase
            .from('whatsapp_connections')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'error')
            .neq('tenant_id', platformId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: messagesToday } = await supabase
            .from('whatsapp_messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today.toISOString());

        const templatesToday = Math.floor((messagesToday || 0) * 0.15);

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
            messagesToday: messagesToday && messagesToday > 1000 ? `${(messagesToday / 1000).toFixed(1)}k` : String(messagesToday || 0),
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
 */
router.get('/tenants', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);
    const searchRaw = req.query.search;
    const search = typeof searchRaw === 'string' ? searchRaw : undefined;

    try {
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .neq('tenant_id', '00000000-0000-0000-0000-000000000000')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        const tenants = (data || []).map(conn => ({
            id: conn.tenant_id,
            name: conn.tenant_id,
            phone: maskPhoneNumber(conn.phone_number || ''),
            status: conn.status === 'active' || conn.status === 'connected' ? 'online' : 'offline',
            quality: conn.status === 'error' ? 'red' : 'green',
            webhook: conn.status === 'error' ? 'error' : 'connected',
            lastWebhook: conn.updated_at,
            configured: !!(conn.config_json?.phone_number_id && conn.config_json?.access_token)
        }));

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

export default router;
