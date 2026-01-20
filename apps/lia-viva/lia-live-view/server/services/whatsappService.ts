/**
 * WhatsApp Service
 * Encapsula comunicação com a Meta Cloud API e gestão de tokens
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

interface MetaCredentials {
    phone_number_id: string;
    waba_id: string;
    access_token: string;
    verify_token: string;
    app_secret?: string;
}

export const WhatsAppService = {
    /**
     * Busca credenciais de um tenant no banco
     */
    async getCredentials(tenantId: string): Promise<MetaCredentials | null> {
        try {
            const { data, error } = await supabase
                .from('whatsapp_connections')
                .select('config_json')
                .eq('tenant_id', tenantId)
                .eq('provider', 'meta')
                .single();

            if (error || !data) return null;
            return data.config_json as unknown as MetaCredentials;
        } catch (err) {
            console.error(`❌ [WhatsAppService] Erro ao buscar credenciais para ${tenantId}:`, err);
            return null;
        }
    },

    /**
     * Envia mensagem de texto via Meta API
     */
    async sendMessage(tenantId: string, to: string, text: string) {
        const creds = await this.getCredentials(tenantId);
        if (!creds || !creds.phone_number_id || !creds.access_token) {
            throw new Error('Credenciais do WhatsApp não configuradas para este tenant');
        }

        const url = `https://graph.facebook.com/v21.0/${creds.phone_number_id}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: { body: text }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${creds.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json() as any;
                throw new Error(errorData.error?.message || response.statusText);
            }

            const data = await response.json() as any;
            console.log(`✅ [WhatsAppService] Mensagem enviada para ${to}: ${data.messages[0].id}`);
            return data;
        } catch (error: any) {
            console.error(`❌ [WhatsAppService] Erro ao enviar mensagem:`, error.message);
            throw new Error(`Erro Meta API: ${error.message}`);
        }
    },

    /**
     * Valida assinatura do webhook (X-Hub-Signature-256)
     */
    validateSignature(payload: string, signature: string, appSecret: string): boolean {
        if (!signature || !appSecret) return false;

        const elements = signature.split('=');
        const signatureHash = elements[1];

        const expectedHash = crypto
            .createHmac('sha256', appSecret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(Buffer.from(signatureHash), Buffer.from(expectedHash));
    },

    /**
     * Download de mídia do WhatsApp
     */
    async downloadMedia(tenantId: string, mediaId: string): Promise<{ buffer: Buffer, mimeType: string } | null> {
        const creds = await this.getCredentials(tenantId);
        if (!creds || !creds.access_token) return null;

        try {
            // 1. Obter URL da mídia
            const metadataResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
                headers: { 'Authorization': `Bearer ${creds.access_token}` }
            });

            if (!metadataResponse.ok) throw new Error(`Metadata error: ${metadataResponse.statusText}`);
            const metadata = await metadataResponse.json() as any;

            const mediaUrl = metadata.url;
            const mimeType = metadata.mime_type;

            // 2. Baixar buffer
            const mediaResponse = await fetch(mediaUrl, {
                headers: { 'Authorization': `Bearer ${creds.access_token}` }
            });

            if (!mediaResponse.ok) throw new Error(`Media download error: ${mediaResponse.statusText}`);
            const arrayBuffer = await mediaResponse.arrayBuffer();

            return {
                buffer: Buffer.from(arrayBuffer),
                mimeType
            };
        } catch (error) {
            console.error(`❌ [WhatsAppService] Erro ao baixar mídia ${mediaId}:`, error);
            return null;
        }
    }
};

export default WhatsAppService;
