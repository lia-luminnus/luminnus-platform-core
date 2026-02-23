/**
 * WhatsApp Twilio Onboarding Routes (SSOT)
 * Fluxo de Onboarding via Twilio como Single Source of Truth
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { TwilioOnboardingService } from '../services/twilioOnboardingService.js';

const router: Router = Router();
const META_APP_ID = process.env.META_APP_ID || '885283457594424';
const META_CONFIG_ID = process.env.META_CONFIG_ID || '';
const META_REDIRECT_URI = process.env.WHATSAPP_OAUTH_REDIRECT || process.env.META_REDIRECT_URI || 'https://luminnus-platform-core.onrender.com/api/whatsapp/embedded/callback';

/**
 * POST /api/whatsapp/twilio/start
 * Inicia onboarding via Twilio (Fluxo BYON)
 * Cria subconta e retorna URL do Meta Embedded Signup
 */
router.post('/start', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id é obrigatório' });
        }

        console.log(`🚀 [Twilio SSOT] Iniciando onboarding BYON para tenant: ${tenant_id}`);

        // 1. Criar a subconta Twilio (Fluxo BYON)
        await TwilioOnboardingService.initByonFlow(tenant_id, {
            friendlyName: `LIA-${tenant_id.slice(0, 8)}`,
            billingMode: 'start_plan'
        });

        // 2. Criar ou atualizar status como PENDING na tabela whatsapp_connections
        const { data: existing } = await supabase
            .from('whatsapp_connections')
            .select('id')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        if (existing) {
            await supabase
                .from('whatsapp_connections')
                .update({ status: 'PENDING', provider: 'twilio', updated_at: new Date().toISOString() })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('whatsapp_connections')
                .insert({
                    tenant_id,
                    provider: 'twilio',
                    status: 'PENDING'
                });
        }

        // 3. Gerar state seguro para CSRF
        const state = `${tenant_id}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 15)}`;

        // 4. Salvar state no Supabase para validação no callback do Meta
        await supabase
            .from('whatsapp_signup_states')
            .upsert({
                tenant_id,
                state,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expire
            });

        // 5. Construir URL do Meta Embedded Signup
        const params = new URLSearchParams({
            client_id: META_APP_ID,
            redirect_uri: META_REDIRECT_URI,
            state,
            scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
            response_type: 'code',
            ...(META_CONFIG_ID ? { config_id: META_CONFIG_ID } : {})
        });

        const signupUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

        res.json({ status: 'ok', data: { url: signupUrl } });
    } catch (error: any) {
        console.error('❌ [WhatsApp Twilio Start] Error:', error);
        res.status(500).json({ status: 'error', reason: error.message });
    }
});

/**
 * GET/POST /api/whatsapp/twilio/callback
 * Recebe retorno da Twilio
 * Salva: phone_e164, twilio_account_sid, pn_sid, messaging_service_sid (se houver)
 * Atualiza status para ACTIVE
 */
const callbackHandler = async (req: Request, res: Response) => {
    try {
        // Aceitar tanto do body (POST) quanto da query (GET) dependendo do redirect
        const payload = req.method === 'POST' ? req.body : req.query;
        const { tenant_id, phone_e164, twilio_account_sid, pn_sid, messaging_service_sid } = payload;

        if (!tenant_id || !twilio_account_sid) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id e twilio_account_sid são obrigatórios no callback.' });
        }

        // Atualizar conexão
        const { error } = await supabase
            .from('whatsapp_connections')
            .update({
                status: 'ACTIVE',
                phone_number_e164: phone_e164 || null,
                phone_number: phone_e164 || null, // fallback mantendo old col se necessário
                twilio_account_sid,
                pn_sid: pn_sid || null,
                messaging_service_sid: messaging_service_sid || null,
                updated_at: new Date().toISOString()
            })
            .eq('tenant_id', tenant_id);

        if (error) throw error;

        // Ideal: Chamar API da Twilio aqui para setar Webhook URL para mensagens inbound apontando para https://<api>/api/twilio/whatsapp/webhook
        // await twilioClient.incomingPhoneNumbers(pn_sid).update({ smsUrl: 'https://SEUDOMINIO/api/twilio/whatsapp/webhook' });

        res.json({ status: 'ok', message: 'Conexão Twilio ativada com sucesso.' });
    } catch (error: any) {
        console.error('❌ [WhatsApp Twilio Callback] Error:', error);
        res.status(500).json({ status: 'error', reason: error.message });
    }
};

router.post('/callback', callbackHandler);
router.get('/callback', callbackHandler);

/**
 * GET /api/whatsapp/twilio/status
 * Retorna status atual da conexão
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const tenant_id = req.query.tenant_id as string;
        if (!tenant_id) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id é obrigatório' });
        }

        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenant_id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            return res.json({ status: 'ok', data: { status: 'DISCONNECTED', provider: 'twilio' } });
        }

        res.json({
            status: 'ok',
            data: {
                status: data.status,
                phone: data.phone_number_e164 || data.phone_number,
                provider: data.provider,
                twilio_account_sid: data.twilio_account_sid,
                pn_sid: data.pn_sid
            }
        });
    } catch (error: any) {
        console.error('❌ [WhatsApp Twilio Status] Error:', error);
        res.status(500).json({ status: 'error', reason: error.message });
    }
});

export function setupWhatsAppTwilioRoutes(app: any): void {
    app.use('/api/whatsapp/twilio', router);
    console.log('✅ [Routes] WhatsApp Twilio routes registered at /api/whatsapp/twilio');
}

export default router;
