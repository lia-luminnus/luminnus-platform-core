/**
 * Twilio Webhook Routes — Roteador Inteligente
 *
 * Endpoint centralizado que recebe TODAS as mensagens WhatsApp via Twilio.
 * Identifica o tenant pelo AccountSid da subconta e roteia para o processamento.
 *
 * SEPARADO do webhook Meta (/api/whatsapp/webhook)
 * Este endpoint: /api/twilio/webhook
 */

import { Router, Request, Response } from 'express';
import { TwilioMessageService } from '../services/twilioMessageService.js';
import { TwilioRepository } from '../repositories/TwilioRepository.js';
import { decryptToken } from '../services/twilioEncryption.js';
import { supabase } from '../config/supabase.js';
import type { TwilioWebhookPayload, TwilioStatusCallback } from '../types/twilio.types.js';

const router: Router = Router();

// ==========================================================
// MAIN WEBHOOK: Receber mensagens WhatsApp
// ==========================================================

/**
 * POST /api/twilio/webhook
 * Recebe mensagens de WhatsApp de TODAS as subcontas.
 * O AccountSid no payload identifica qual subconta/tenant enviou.
 */
router.post('/', async (req: Request, res: Response) => {
    const TAG = '[Twilio Webhook]';

    try {
        const payload = req.body as TwilioWebhookPayload;

        // Responder imediatamente (Twilio espera 200 rápido)
        res.status(200).send('<Response></Response>');

        // 1. Identificar tenant pelo AccountSid
        const accountSid = payload.AccountSid;
        if (!accountSid) {
            console.error(`${TAG} Payload sem AccountSid — ignorando`);
            return;
        }

        const sub = await TwilioMessageService.getSubaccountByAccountSid(accountSid);
        if (!sub) {
            console.error(`${TAG} Subconta não encontrada para SID: ${accountSid}`);
            return;
        }

        const tenantId = sub.tenant_id;
        console.log(`${TAG} Mensagem recebida: tenant=${tenantId}, from=${payload.From}, sid=${payload.MessageSid}`);

        // 2. Validar assinatura (segurança)
        const twilioSignature = req.headers['x-twilio-signature'] as string;
        if (twilioSignature && sub.twilio_auth_token_encrypted) {
            const authToken = decryptToken(sub.twilio_auth_token_encrypted);
            const fullUrl = `${process.env.TWILIO_WEBHOOK_BASE_URL || 'https://api.luminnus.ai/api/twilio/webhook'}`;

            const isValid = TwilioMessageService.validateWebhookSignature(
                twilioSignature,
                fullUrl,
                req.body,
                authToken
            );

            if (!isValid) {
                console.warn(`${TAG} ⚠️ Assinatura inválida para tenant ${tenantId}`);
                // Em produção, poderia rejeitar. Por enquanto, apenas logamos.
            }
        }

        // 3. Extrair dados da mensagem
        const from = payload.From?.replace('whatsapp:', '') || '';
        const to = payload.To?.replace('whatsapp:', '') || '';
        const body = payload.Body || '';
        const profileName = payload.ProfileName || '';
        const messageSid = payload.MessageSid;
        const numMedia = parseInt(payload.NumMedia || '0');

        // Extrair mídia (se houver)
        const mediaUrls: string[] = [];
        const mediaTypes: string[] = [];
        for (let i = 0; i < numMedia; i++) {
            const url = payload[`MediaUrl${i}`];
            const type = payload[`MediaContentType${i}`];
            if (url) mediaUrls.push(url);
            if (type) mediaTypes.push(type);
        }

        // 4. Registrar mensagem no banco de dados
        try {
            await supabase.from('whatsapp_messages').insert({
                tenant_id: tenantId,
                conversation_id: null, // Será preenchido pelo processador de conversas
                direction: 'inbound',
                from_number: from,
                to_number: to,
                body: body,
                media_url: mediaUrls.length > 0 ? mediaUrls[0] : null,
                media_type: mediaTypes.length > 0 ? mediaTypes[0] : null,
                external_id: messageSid,
                provider: 'twilio',
                status: 'received',
                metadata: {
                    profile_name: profileName,
                    num_media: numMedia,
                    media_urls: mediaUrls,
                    media_types: mediaTypes,
                    twilio_account_sid: accountSid,
                },
            });
        } catch (dbErr: any) {
            console.error(`${TAG} Erro ao salvar mensagem no DB:`, dbErr.message);
        }

        // 5. Atualizar contador de uso (não-bloqueante)
        TwilioRepository.upsertUsage({
            tenant_id: tenantId,
            subaccount_id: sub.id,
            messages_received: 1,
        }).catch((err) => console.warn(`${TAG} Erro ao atualizar uso:`, err.message));

        // 6. Processar mensagem com IA (PLACEHOLDER)
        // TODO: Integrar com o motor de IA da LIA
        // Aqui seria chamado o mesmo pipeline que processa mensagens WhatsApp:
        // - Buscar configurações do agente
        // - Buscar contexto de conversa
        // - Processar com IA
        // - Responder via TwilioMessageService
        console.log(`📨 ${TAG} Mensagem processada para tenant ${tenantId}: "${body.substring(0, 50)}..."`);

        // EXEMPLO de resposta automática (descomente para testar):
        // await TwilioMessageService.sendMessage(
        //     tenantId,
        //     from,
        //     `Olá ${profileName}! Sua mensagem foi recebida. Um agente responderá em breve.`
        // );

    } catch (error: any) {
        console.error(`❌ ${TAG} Erro:`, error);
        // Não re-enviar erro — já respondemos 200
    }
});

// ==========================================================
// STATUS CALLBACK: Atualizações de status de mensagens
// ==========================================================

/**
 * POST /api/twilio/webhook/status
 * Recebe atualizações de status (delivered, read, failed, etc.)
 */
router.post('/status', async (req: Request, res: Response) => {
    const TAG = '[Twilio Status]';

    try {
        res.sendStatus(200); // Responder imediatamente

        const callback = req.body as TwilioStatusCallback;

        console.log(`📊 ${TAG} Update: ${callback.MessageStatus} for ${callback.MessageSid}`);

        // Atualizar status da mensagem no banco
        if (callback.MessageSid) {
            try {
                await supabase
                    .from('whatsapp_messages')
                    .update({
                        status: callback.MessageStatus,
                        metadata: supabase.rpc ? undefined : {
                            error_code: callback.ErrorCode,
                            error_message: callback.ErrorMessage,
                        },
                        updated_at: new Date().toISOString(),
                    })
                    .eq('external_id', callback.MessageSid);
            } catch (dbErr: any) {
                console.warn(`${TAG} Erro ao atualizar status no DB:`, dbErr.message);
            }
        }

        // Se a mensagem falhou, logar para investigação
        if (callback.MessageStatus === 'failed' || callback.MessageStatus === 'undelivered') {
            console.error(`❌ ${TAG} Falha na entrega: ${callback.MessageSid} | ` +
                `Error: ${callback.ErrorCode} - ${callback.ErrorMessage}`);
        }
    } catch (error: any) {
        console.error(`❌ ${TAG} Erro:`, error);
    }
});

// ==========================================================
// EXPORT
// ==========================================================

export function setupTwilioWebhookRoutes(app: any): void {
    app.use('/api/twilio/webhook', router);
    console.log('✅ [Routes] Twilio Webhook registered at /api/twilio/webhook');
}

export default router;
