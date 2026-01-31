/**
 * WhatsApp Webhook Routes
 * Handles Meta webhook verification and incoming messages
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router: Router = Router();

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification (challenge)
 */
router.get('/webhook', async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[WhatsApp Webhook] Verification request received:', { mode, tokenReceived: !!token, challenge: !!challenge });

    // 1. Try environment token first
    let verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'luminnus_whatsapp_verify_2026';

    // 2. If no match, try to fetch from database (Platform Config)
    if (token !== verifyToken) {
        try {
            const { data } = await supabase
                .from('whatsapp_connections')
                .select('config_json')
                .eq('tenant_id', '00000000-0000-0000-0000-000000000000')
                .maybeSingle();

            if (data?.config_json?.verifyToken) {
                verifyToken = data.config_json.verifyToken;
                console.log('[WhatsApp Webhook] Using verifyToken from database');
            }
        } catch (err) {
            console.error('❌ [Webhook] Error fetching token from database:', err);
        }
    }

    console.log('[WhatsApp Webhook] Token comparison:', { received: token, expected: verifyToken, match: token === verifyToken });

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ [WhatsApp Webhook] Verification successful');
        res.status(200).send(challenge);
    } else {
        console.warn('⚠️ [WhatsApp Webhook] Verification failed', {
            mode,
            receivedToken: token,
            expectedToken: verifyToken
        });
        res.sendStatus(403);
    }
});

/**
 * POST /api/whatsapp/webhook
 * Receives messages and events from Meta Cloud API
 */
router.post('/webhook', async (req: Request, res: Response) => {
    try {
        const body = req.body;

        // Validate WhatsApp event
        if (body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        console.log('[WhatsApp Webhook] Received event:', JSON.stringify(body).substring(0, 200) + '...');

        // Respond immediately (Meta requires fast response)
        res.sendStatus(200);

        // Process entries in background
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field !== 'messages') continue;

                const value = change.value;
                const phoneNumberId = value?.metadata?.phone_number_id;

                console.log('[WhatsApp Webhook] Processing message from phone_number_id:', phoneNumberId);

                // TODO: Forward to message processing service
                // This would typically involve:
                // 1. Finding tenant by phone_number_id
                // 2. Processing incoming messages
                // 3. Triggering AI responses if configured

                if (value.messages) {
                    for (const message of value.messages) {
                        console.log(`📩 [Webhook] Message received: ${message.type} from ${message.from}`);
                    }
                }

                if (value.statuses) {
                    for (const status of value.statuses) {
                        console.log(`📊 [Webhook] Status update: ${status.status} for ${status.recipient_id}`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ [WhatsApp Webhook] Error processing:', error);
        res.sendStatus(500);
    }
});

/**
 * GET /api/whatsapp/settings
 * Get WhatsApp agent settings for a tenant
 */
router.get('/settings', async (req: Request, res: Response) => {
    try {
        const tenantId = req.query.tenantId as string;
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenantId is required' });
        }

        const { data, error } = await supabase
            .from('whatsapp_agent_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        // Default settings if none exist
        const defaultSettings = {
            objective: 'vendas',
            toneOfVoice: 'consultivo',
            sensitiveWords: false,
            irritatedClient: true,
            legalRequest: true,
            playbooks: []
        };

        res.json({
            ok: true,
            settings: data?.settings || defaultSettings
        });
    } catch (error) {
        console.error('❌ [WhatsApp Settings] Error fetching:', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});

/**
 * POST /api/whatsapp/settings
 * Save WhatsApp agent settings for a tenant
 */
router.post('/settings', async (req: Request, res: Response) => {
    try {
        const { tenant_id, ...settings } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id is required' });
        }

        const { data: existing } = await supabase
            .from('whatsapp_agent_settings')
            .select('id')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        let result;
        if (existing?.id) {
            result = await supabase
                .from('whatsapp_agent_settings')
                .update({
                    settings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('whatsapp_agent_settings')
                .insert({
                    tenant_id,
                    settings,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        res.json({ ok: true, settings: result.data.settings });
    } catch (error) {
        console.error('❌ [WhatsApp Settings] Error saving:', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});

/**
 * POST /api/whatsapp/config
 * Save Meta Cloud API credentials for a tenant's phone number
 */
router.post('/config', async (req: Request, res: Response) => {
    try {
        const { tenant_id, phone_number, config_json } = req.body;
        if (!tenant_id || !phone_number) {
            return res.status(400).json({ ok: false, error: 'tenant_id and phone_number are required' });
        }

        // Check if connection exists
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', tenant_id)
            .eq('phone_number', phone_number)
            .maybeSingle();

        let result;
        if (existing?.id) {
            result = await supabase
                .from('whatsapp_connections')
                .update({
                    config_json,
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
                    phone_number,
                    provider: 'meta',
                    config_json,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
        }

        if (result.error) throw result.error;

        res.json({ ok: true, connection: result.data });
    } catch (error) {
        console.error('❌ [WhatsApp Config] Error saving:', error);
        res.status(500).json({ ok: false, error: String(error) });
    }
});

export default router;
