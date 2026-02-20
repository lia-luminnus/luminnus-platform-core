/**
 * WhatsApp Twilio Onboarding Routes (SSOT)
 * Fluxo de Onboarding via Twilio como Single Source of Truth
 */

import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
// Se precisarmos usar um serviço real na Twilio para gerar Auth URL (Embedded Signup da Twilio), importaríamos aqui.
// Pela requisição do usuário, a plataforma inicia o onboarding retornando uma URL do fluxo da Twilio.

const router: Router = Router();

/**
 * Helper: Gerar URL de Onboarding (Fake/Placehoder por enquanto até integrarmos o SDK exacto)
 * Em prod, usaria Twilio SDK para gerar o link do onboarding ou direcionar para OAuth da Twilio.
 */
function getTwilioOnboardingUrl(tenant_id: string) {
    // Retorna URL fictícia se não tiver um endpoint OAuth Twilio configurado.
    // Depende de como o "Twilio Embedded Signup" está configurado na sua app Twilio
    return `https://www.twilio.com/console/whatsapp/onboarding?state=${tenant_id}`;
}

/**
 * POST /api/whatsapp/twilio/start
 * Inicia onboarding via Twilio
 * Cria registro PENDING na tabela
 * Retorna URL do fluxo
 */
router.post('/start', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;
        if (!tenant_id) {
            return res.status(400).json({ status: 'error', reason: 'tenant_id é obrigatório' });
        }

        // Criar ou atualizar como PENDING
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

        const url = getTwilioOnboardingUrl(tenant_id);

        res.json({ status: 'ok', data: { url } });
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
