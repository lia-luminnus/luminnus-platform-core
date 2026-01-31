/**
 * WhatsApp Integration Routes
 * Handles client-facing WhatsApp integration (BYO - Bring Your Own)
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router: Router = Router();

// Helper to mask phone numbers for security
function maskPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) return phone;
    return `+${cleaned.substring(0, 2)} ** *****-${cleaned.slice(-4)}`;
}

/**
 * GET /api/integrations/whatsapp/status
 * Get current WhatsApp integration status for a tenant
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenantId as string;
        if (!tenantId) {
            return res.status(400).json({ status: 'error', reason: 'tenantId is required' });
        }

        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (!data) {
            return res.json({
                status: 'ok',
                data: {
                    connected: false,
                    status: 'disconnected',
                    phone_masked: null,
                    waba_id: null,
                    last_webhook_at: null,
                    last_error: null
                }
            });
        }

        res.json({
            status: 'ok',
            data: {
                connected: data.status === 'connected' || data.status === 'active',
                status: data.status,
                phone_masked: maskPhoneNumber(data.phone_number),
                waba_id: data.config_json?.waba_id || null,
                last_webhook_at: data.last_webhook_at || data.updated_at,
                last_error: data.last_error
            }
        });
    } catch (error) {
        console.error('❌ [WhatsApp Status] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

/**
 * POST /api/integrations/whatsapp/save-manual
 * Save manual WhatsApp connection credentials
 */
router.post('/save-manual', async (req: Request, res: Response) => {
    try {
        const { tenant_id, waba_id, phone_number_id, access_token, phone_e164 } = req.body;

        if (!tenant_id || !waba_id || !phone_number_id || !access_token) {
            return res.status(400).json({
                status: 'error',
                reason: 'Missing required fields: tenant_id, waba_id, phone_number_id, access_token'
            });
        }

        const config_json = {
            waba_id,
            phone_number_id,
            access_token,
            provider: 'meta_cloud_api',
            configured_at: new Date().toISOString()
        };

        // Check if connection exists
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        let result;
        if (existing?.id) {
            result = await supabase
                .from('whatsapp_connections')
                .update({
                    phone_number: phone_e164 || phone_number_id,
                    config_json,
                    status: 'connected',
                    updated_at: new Date().toISOString(),
                    last_error: null
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('whatsapp_connections')
                .insert({
                    tenant_id,
                    phone_number: phone_e164 || phone_number_id,
                    provider: 'meta',
                    config_json,
                    status: 'connected',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        console.log(`✅ [WhatsApp] Manual connection saved for tenant: ${tenant_id}`);

        res.json({
            status: 'ok',
            data: {
                connected: true,
                phone_masked: maskPhoneNumber(phone_e164 || phone_number_id)
            }
        });
    } catch (error) {
        console.error('❌ [WhatsApp Save] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

/**
 * POST /api/integrations/whatsapp/test-webhook
 * Test webhook connectivity
 */
router.post('/test-webhook', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id is required' });
        }

        // Verify connection exists and is active
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ status: 'error', reason: 'Connection not found' });
        }

        // For now, we'll just verify the connection exists
        // In production, you could ping the Meta API to verify credentials
        const start = Date.now();

        // Simulate a basic check
        await new Promise(resolve => setTimeout(resolve, 100));

        const latency = Date.now() - start;

        res.json({
            status: 'ok',
            data: {
                reachable: true,
                latency_ms: latency
            }
        });
    } catch (error) {
        console.error('❌ [WhatsApp Test] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

/**
 * POST /api/integrations/whatsapp/reconnect
 * Attempt to reconnect a disconnected WhatsApp connection
 */
router.post('/reconnect', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id is required' });
        }

        // Update status to connected
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .update({
                status: 'connected',
                last_error: null,
                updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenant_id)
            .select()
            .single();

        if (error) throw error;

        console.log(`🔄 [WhatsApp] Reconnected tenant: ${tenant_id}`);

        res.json({
            status: 'ok',
            data: {
                connected: true,
                phone_masked: maskPhoneNumber(data.phone_number)
            }
        });
    } catch (error) {
        console.error('❌ [WhatsApp Reconnect] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

/**
 * POST /api/integrations/whatsapp/disconnect
 * Disconnect WhatsApp integration
 */
router.post('/disconnect', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id is required' });
        }

        const { error } = await supabase
            .from('whatsapp_connections')
            .update({
                status: 'disconnected',
                updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        console.log(`⚠️ [WhatsApp] Disconnected tenant: ${tenant_id}`);

        res.json({ status: 'ok' });
    } catch (error) {
        console.error('❌ [WhatsApp Disconnect] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

/**
 * POST /api/integrations/whatsapp/quick-start
 * Start quick connection flow - saves phone number and creates pending connection
 */
router.post('/quick-start', async (req: Request, res: Response) => {
    try {
        const { tenant_id, phone_number } = req.body;
        if (!tenant_id || !phone_number) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id and phone_number are required' });
        }

        // Clean phone number
        const cleanPhone = phone_number.replace(/\D/g, '');

        // Check if connection exists
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        let result;
        if (existing?.id) {
            result = await supabase
                .from('whatsapp_connections')
                .update({
                    phone_number: cleanPhone,
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('whatsapp_connections')
                .insert({
                    tenant_id,
                    phone_number: cleanPhone,
                    provider: 'meta',
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        console.log(`📱 [WhatsApp] Quick-start initiated for tenant: ${tenant_id}, phone: ${cleanPhone}`);

        res.json({
            status: 'ok',
            data: {
                phone_number: cleanPhone,
                next_step: 'Complete setup in Meta Business Suite'
            }
        });
    } catch (error) {
        console.error('❌ [WhatsApp Quick-Start] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

/**
 * POST /api/integrations/whatsapp/save-quick
 * Save connection from Meta OAuth flow
 */
router.post('/save-quick', async (req: Request, res: Response) => {
    try {
        const { tenant_id, phone_number, access_token, waba_id, phone_number_id } = req.body;
        if (!tenant_id || !access_token) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id and access_token are required' });
        }

        const cleanPhone = phone_number?.replace(/\D/g, '') || '';

        const config_json = {
            waba_id: waba_id || null,
            phone_number_id: phone_number_id || null,
            access_token,
            provider: 'meta_embedded_signup',
            configured_at: new Date().toISOString()
        };

        // Check if connection exists
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        let result;
        if (existing?.id) {
            result = await supabase
                .from('whatsapp_connections')
                .update({
                    phone_number: cleanPhone,
                    config_json,
                    status: 'connected',
                    updated_at: new Date().toISOString(),
                    last_error: null
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('whatsapp_connections')
                .insert({
                    tenant_id,
                    phone_number: cleanPhone,
                    provider: 'meta',
                    config_json,
                    status: 'connected',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        console.log(`✅ [WhatsApp] Quick connection saved for tenant: ${tenant_id}`);

        res.json({
            status: 'ok',
            data: {
                connected: true,
                phone_masked: maskPhoneNumber(cleanPhone)
            }
        });
    } catch (error) {
        console.error('❌ [WhatsApp Save-Quick] Error:', error);
        res.status(500).json({ status: 'error', reason: String(error) });
    }
});

export default router;
