/**
 * TwilioMessageService
 *
 * Serviço de envio de mensagens WhatsApp via Twilio.
 * REGRA CRÍTICA: Usa SEMPRE as credenciais da SUBCONTA do tenant.
 * Nunca usar credenciais da master para envio — isso quebraria o isolamento de custos.
 */

import Twilio from 'twilio';
import { TwilioRepository } from '../repositories/TwilioRepository.js';
import { decryptToken } from './twilioEncryption.js';
import type { TwilioMessageResult, TwilioSubaccount } from '../types/twilio.types.js';

// Cache de clientes Twilio por tenant (evitar instanciar a cada mensagem)
const clientCache = new Map<string, { client: Twilio.Twilio; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Limpar cache expirado (chamado periodicamente)
 */
function cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of clientCache.entries()) {
        if (entry.expiresAt < now) {
            clientCache.delete(key);
        }
    }
}

// Limpar cache a cada 5 minutos
setInterval(cleanExpiredCache, 5 * 60 * 1000);

export class TwilioMessageService {
    // ========================================================
    // CLIENT MANAGEMENT
    // ========================================================

    /**
     * Obter um cliente Twilio autenticado com as credenciais da SUBCONTA.
     * Usa cache para evitar lookup no banco a cada mensagem.
     */
    static async getSubaccountClient(tenantId: string): Promise<Twilio.Twilio> {
        const TAG = '[TwilioMessage.getClient]';

        // Verificar cache
        const cached = clientCache.get(tenantId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.client;
        }

        // v15.2: Suporte para Master Account (Admin Tenant)
        const ADMIN_TENANT = '00000000-0000-0000-0000-000000000001';
        if (tenantId === ADMIN_TENANT) {
            const masterSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
            const masterToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();

            if (!masterSid || !masterToken) {
                throw new Error(`${TAG} Credenciais Master ausentes no process.env`);
            }

            console.log(`${TAG} 👑 Usando Cliente MASTER para Admin Tenant`);
            const client = Twilio(masterSid, masterToken);

            clientCache.set(tenantId, {
                client,
                expiresAt: Date.now() + CACHE_TTL_MS,
            });

            return client;
        }

        // Buscar subconta no banco
        const sub = await TwilioRepository.getByTenantId(tenantId);

        // Desencriptar auth token
        const authToken = decryptToken(sub.twilio_auth_token_encrypted);

        // Criar cliente Twilio da subconta
        const client = Twilio(sub.twilio_account_sid, authToken);

        // Cachear
        clientCache.set(tenantId, {
            client,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });

        return client;
    }

    /**
     * Obter dados da subconta (para uso no webhook, sem instanciar cliente)
     */
    static async getSubaccountData(tenantId: string): Promise<TwilioSubaccount | null> {
        return TwilioRepository.getByTenantId(tenantId);
    }

    /**
     * Buscar subconta pelo AccountSid (para roteamento de webhook)
     */
    static async getSubaccountByAccountSid(accountSid: string): Promise<TwilioSubaccount | null> {
        return TwilioRepository.getByAccountSid(accountSid);
    }

    /**
     * Invalidar cache para um tenant (ex: após rotação de credenciais)
     */
    static invalidateCache(tenantId: string): void {
        clientCache.delete(tenantId);
    }

    // ========================================================
    // SEND MESSAGES
    // ========================================================

    /**
     * Enviar mensagem de texto simples via WhatsApp.
     *
     * @param tenantId - ID do tenant
     * @param to - Número destinatário no formato E.164 (ex: +351912345678)
     * @param body - Texto da mensagem
     * @param mediaUrls - URLs de mídia opcionais
     */
    static async sendMessage(
        tenantId: string,
        to: string,
        body: string,
        mediaUrls?: string[],
        fromOverride?: string
    ): Promise<TwilioMessageResult> {
        const TAG = '[TwilioMessage.send]';

        try {
            // v15.2: Obter número 'From'
            const ADMIN_TENANT = '00000000-0000-0000-0000-000000000001';
            let fromNumber = '';

            if (fromOverride) {
                fromNumber = fromOverride;
                console.log(`${TAG} ℹ️ Usando remetente forçado pelo webhook: ${fromNumber}`);
            } else if (tenantId === ADMIN_TENANT) {
                // Para o Admin/Master no Sandbox, geralmente é o número configurado no sandbox.
                // Como não temos isso fácil no DB para a master, tentaremos inferir ou usar um padrão.
                // Idealmente, o webhook deveria passar o 'To' original.
                // Por agora, buscaremos uma variável de ambiente ou usaremos o que o sub-repósitorio disser (se houver).
                const sub = await TwilioRepository.getByTenantId(tenantId);
                fromNumber = sub?.twilio_phone_number || process.env.TWILIO_MASTER_PHONE || '';

                if (!fromNumber) {
                    console.error(`${TAG} ❌ Erro: Número Master (TWILIO_MASTER_PHONE) não configurado e nenhum remetente forçado.`);
                    return { success: false, error: 'Número Master (TWILIO_MASTER_PHONE) não configurado' };
                }
            } else {
                const sub = await TwilioRepository.getByTenantId(tenantId);
                if (!sub?.twilio_phone_number) {
                    return { success: false, error: 'Número WhatsApp não configurado para este tenant' };
                }
                fromNumber = sub.twilio_phone_number;
            }

            // v15.2: Formatar números para o formato WhatsApp da Twilio
            // Se fromOverride tiver 'whatsapp:', preservamos. Senão adicionamos.
            const fromWhatsApp = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
            const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

            const messageParams: any = {
                from: fromWhatsApp,
                to: toWhatsApp,
                body,
            };

            // Adicionar mídia se fornecida
            if (mediaUrls && mediaUrls.length > 0) {
                messageParams.mediaUrl = mediaUrls;
            }

            const client = await TwilioMessageService.getSubaccountClient(tenantId);
            console.log(`${TAG} Enviando mensagem: ${fromNumber} → ${to.slice(-4)}***`);

            const message = await client.messages.create(messageParams);

            console.log(`✅ ${TAG} Mensagem enviada: ${message.sid} (status: ${message.status})`);

            // 6. Atualizar contador de uso
            try {
                // Se for Master Account, podemos não ter subaccount id real no DB
                const sub = (tenantId === ADMIN_TENANT) ? null : await TwilioRepository.getByTenantId(tenantId);
                const subId = sub?.id || 'master';

                TwilioRepository.upsertUsage({
                    tenant_id: tenantId,
                    subaccount_id: subId,
                    messages_sent: 1,
                }).catch((err) => console.warn(`${TAG} Erro ao atualizar uso:`, err.message));
            } catch (usageErr) {
                console.warn(`${TAG} Usage update skipped`);
            }

            return {
                success: true,
                messageSid: message.sid,
                status: message.status,
            };
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro ao enviar mensagem:`, err.message);
            return {
                success: false,
                error: err.message,
            };
        }
    }

    /**
     * Enviar mensagem usando um Content Template da Twilio.
     * Templates são pré-aprovados e permitem enviar mensagens fora da janela de 24h.
     *
     * @param tenantId - ID do tenant
     * @param to - Número destinatário E.164
     * @param contentSid - SID do template Twilio (ex: HXxxx)
     * @param contentVariables - Variáveis do template como JSON string
     */
    static async sendTemplateMessage(
        tenantId: string,
        to: string,
        contentSid: string,
        contentVariables?: Record<string, string>
    ): Promise<TwilioMessageResult> {
        const TAG = '[TwilioMessage.sendTemplate]';

        try {
            const client = await TwilioMessageService.getSubaccountClient(tenantId);
            const sub = await TwilioRepository.getByTenantId(tenantId);

            if (!sub?.twilio_phone_number) {
                return {
                    success: false,
                    error: 'Número WhatsApp não configurado',
                };
            }

            const fromWhatsApp = `whatsapp:${sub.twilio_phone_number}`;
            const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

            const messageParams: any = {
                from: fromWhatsApp,
                to: toWhatsApp,
                contentSid,
            };

            if (contentVariables) {
                messageParams.contentVariables = JSON.stringify(contentVariables);
            }

            console.log(`${TAG} Enviando template ${contentSid}: ${sub.twilio_phone_number} → ${to.slice(-4)}***`);

            const message = await client.messages.create(messageParams);

            console.log(`✅ ${TAG} Template enviado: ${message.sid}`);

            // Atualizar uso
            TwilioRepository.upsertUsage({
                tenant_id: tenantId,
                subaccount_id: sub.id,
                messages_sent: 1,
            }).catch((err) => console.warn(`${TAG} Erro ao atualizar uso:`, err.message));

            return {
                success: true,
                messageSid: message.sid,
                status: message.status,
            };
        } catch (err: any) {
            console.error(`❌ ${TAG} Erro ao enviar template:`, err.message);
            return {
                success: false,
                error: err.message,
            };
        }
    }

    // ========================================================
    // WEBHOOK VALIDATION
    // ========================================================

    /**
     * Validar assinatura de webhook Twilio.
     * Usa o auth token da SUBCONTA para validar (cada subconta tem seu próprio token).
     *
     * @param twilioSignature - Valor do header X-Twilio-Signature
     * @param url - URL completa do webhook
     * @param params - Body da requisição (form-encoded params)
     * @param authToken - Auth token da subconta
     */
    static validateWebhookSignature(
        twilioSignature: string,
        url: string,
        params: Record<string, string>,
        authToken: string
    ): boolean {
        try {
            return Twilio.validateRequest(authToken, twilioSignature, url, params);
        } catch (err: any) {
            console.error('[TwilioMessage.validateSignature] Erro:', err.message);
            return false;
        }
    }

    // ========================================================
    // MESSAGE STATUS
    // ========================================================

    /**
     * Buscar status de uma mensagem enviada.
     */
    static async getMessageStatus(
        tenantId: string,
        messageSid: string
    ): Promise<{
        sid: string;
        status: string;
        dateCreated: Date | null;
        dateUpdated: Date | null;
        errorCode: number | null;
        errorMessage: string | null;
    } | null> {
        try {
            const client = await TwilioMessageService.getSubaccountClient(tenantId);
            const message = await client.messages(messageSid).fetch();

            return {
                sid: message.sid,
                status: message.status,
                dateCreated: message.dateCreated,
                dateUpdated: message.dateUpdated,
                errorCode: message.errorCode,
                errorMessage: message.errorMessage,
            };
        } catch (err: any) {
            console.error('[TwilioMessage.getStatus] Erro:', err.message);
            return null;
        }
    }
}
