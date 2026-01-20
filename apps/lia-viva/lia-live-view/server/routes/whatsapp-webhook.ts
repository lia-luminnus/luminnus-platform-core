/**
 * WhatsApp Webhook Routes
 * Recebe eventos da Meta Cloud API e processa mensagens
 */

import { Express, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import eventBus from '../services/eventBusService.js';
import { WhatsAppService } from '../services/whatsappService.js';

// ============================================
// TIPOS
// ============================================
interface MetaWebhookEntry {
    id: string;
    changes: Array<{
        value: {
            messaging_product: string;
            metadata: {
                display_phone_number: string;
                phone_number_id: string;
            };
            contacts?: Array<{
                profile: { name: string };
                wa_id: string;
            }>;
            messages?: Array<{
                from: string;
                id: string;
                timestamp: string;
                type: 'text' | 'audio' | 'image' | 'document' | 'location' | 'sticker';
                text?: { body: string };
                audio?: { id: string; mime_type: string };
                image?: { id: string; mime_type: string; caption?: string };
                document?: { id: string; filename: string; mime_type: string };
            }>;
            statuses?: Array<{
                id: string;
                status: 'sent' | 'delivered' | 'read' | 'failed';
                timestamp: string;
                recipient_id: string;
            }>;
        };
        field: string;
    }>;
}

// ============================================
// SETUP ROUTES
// ============================================
export function setupWhatsAppWebhookRoutes(app: Express) {

    /**
     * GET /api/whatsapp/webhook
     * Verificação do webhook (challenge da Meta)
     */
    app.get('/api/whatsapp/webhook', async (req: Request, res: Response) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // 1. Tentar token de ambiente
        let verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'luminnus_whatsapp_token';

        // 2. Se não bater, tentar buscar do banco (Configuração da Plataforma no Admin)
        if (token !== verifyToken) {
            try {
                const { data } = await supabase
                    .from('whatsapp_connections')
                    .select('config_json')
                    .eq('tenant_id', '00000000-0000-0000-0000-000000000000')
                    .maybeSingle();

                if (data?.config_json?.verifyToken) {
                    verifyToken = data.config_json.verifyToken;
                }
            } catch (err) {
                console.error('❌ [Webhook] Erro ao buscar token do banco:', err);
            }
        }

        if (mode === 'subscribe' && token === verifyToken) {
            console.log('✅ [Webhook] Verificação do WhatsApp bem-sucedida');
            res.status(200).send(challenge);
        } else {
            console.warn('⚠️ [Webhook] Verificação falhou', {
                mode,
                receivedToken: token,
                expectedToken: verifyToken
            });
            res.sendStatus(403);
        }
    });

    /**
     * POST /api/whatsapp/webhook
     * Recebe mensagens e eventos da Meta Cloud API
     */
    app.post('/api/whatsapp/webhook', async (req: Request, res: Response) => {
        try {
            const body = req.body;

            // Validar que é um evento do WhatsApp
            if (body.object !== 'whatsapp_business_account') {
                return res.sendStatus(404);
            }

            // 1. Validar Assinatura (Segurança v6.0)
            const signature = req.headers['x-hub-signature-256'] as string;
            if (signature) {
                const phoneNumberId = body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
                if (phoneNumberId) {
                    const creds = await getCredentialsByPhoneNumberId(phoneNumberId);
                    if (creds?.app_secret) {
                        const rawBody = JSON.stringify(req.body);
                        const isValid = WhatsAppService.validateSignature(rawBody, signature, creds.app_secret);
                        if (!isValid) {
                            console.warn('⚠️ [Webhook] Assinatura inválida detectada!');
                            return res.sendStatus(401);
                        }
                    }
                }
            }

            // Responder imediatamente (Meta exige resposta rápida)
            res.sendStatus(200);

            // Processar entries em background
            for (const entry of body.entry as MetaWebhookEntry[]) {
                await processWebhookEntry(entry);
            }

        } catch (error) {
            console.error('❌ [Webhook] Erro ao processar:', error);
            res.sendStatus(500);
        }
    });

    console.log('✅ [Routes] WhatsApp Webhook configurado');
}

// ============================================
// PROCESSAMENTO DE EVENTOS
// ============================================

async function processWebhookEntry(entry: MetaWebhookEntry): Promise<void> {
    for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata.phone_number_id;

        // Buscar tenant pela conexão do WhatsApp
        const tenantId = await getTenantByPhoneNumberId(phoneNumberId);
        if (!tenantId) {
            console.warn('⚠️ [Webhook] Tenant não encontrado para phone_number_id:', phoneNumberId);
            continue;
        }

        // Processar contatos
        if (value.contacts) {
            for (const contact of value.contacts) {
                await upsertContact(tenantId, contact);
            }
        }

        // Processar mensagens
        if (value.messages) {
            for (const message of value.messages) {
                await processIncomingMessage(tenantId, message);
            }
        }

        // Processar status updates
        if (value.statuses) {
            for (const status of value.statuses) {
                await processStatusUpdate(tenantId, status);
            }
        }
    }
}

// ============================================
// HELPERS
// ============================================

async function getTenantByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    const { data } = await supabase
        .from('whatsapp_connections')
        .select('tenant_id')
        .eq('config_json->>phone_number_id', phoneNumberId)
        .single();

    return data?.tenant_id || null;
}

async function getCredentialsByPhoneNumberId(phoneNumberId: string): Promise<any | null> {
    const { data } = await supabase
        .from('whatsapp_connections')
        .select('config_json')
        .eq('config_json->>phone_number_id', phoneNumberId)
        .single();

    return data?.config_json || null;
}

async function upsertContact(
    tenantId: string,
    contact: { profile: { name: string }; wa_id: string }
): Promise<string> {
    const { data, error } = await supabase
        .from('whatsapp_contacts')
        .upsert({
            tenant_id: tenantId,
            external_id: contact.wa_id,
            phone: contact.wa_id,
            name: contact.profile.name,
            updated_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,external_id' })
        .select('id')
        .single();

    if (error) {
        console.error('❌ [Webhook] Erro ao upsert contato:', error);
        throw error;
    }

    return data.id;
}

async function getOrCreateConversation(
    tenantId: string,
    contactId: string,
    externalId: string
): Promise<string> {
    // Tentar buscar conversa existente
    const { data: existing } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('external_id', externalId)
        .single();

    if (existing) {
        // Atualizar last_message_at
        await supabase
            .from('whatsapp_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', existing.id);
        return existing.id;
    }

    // Criar nova conversa
    const { data: newConv, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
            tenant_id: tenantId,
            external_id: externalId,
            contact_id: contactId,
            status: 'active',
            mode: 'agent',
            agent_mode: 'SDR',
            last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (error) {
        console.error('❌ [Webhook] Erro ao criar conversa:', error);
        throw error;
    }

    // Emitir evento de nova conversa
    await eventBus.emitEvent({
        type: 'conversation_started',
        tenantId,
        conversationId: newConv.id,
        contactId,
        payload: { externalId }
    });

    // Auto-criar lead para nova conversa
    await createLeadFromConversation(tenantId, newConv.id, contactId);

    return newConv.id;
}

async function createLeadFromConversation(
    tenantId: string,
    conversationId: string,
    contactId: string
): Promise<void> {
    // Buscar dados do contato
    const { data: contact } = await supabase
        .from('whatsapp_contacts')
        .select('name, phone')
        .eq('id', contactId)
        .single();

    const { data: lead, error } = await supabase
        .from('leads')
        .insert({
            tenant_id: tenantId,
            contact_id: contactId,
            conversation_id: conversationId,
            source: 'whatsapp',
            stage: 'NEW',
            contact_name: contact?.name,
            contact_phone: contact?.phone,
            last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (error) {
        console.error('❌ [Webhook] Erro ao criar lead:', error);
        return;
    }

    // Emitir evento
    await eventBus.emitLeadCreated(tenantId, lead.id, contactId, 'NEW');
}

async function processIncomingMessage(
    tenantId: string,
    message: any
): Promise<void> {
    console.log(`📩 [Webhook] Mensagem recebida: ${message.type} de ${message.from}`);

    // Upsert contato
    const contactId = await upsertContact(tenantId, {
        profile: { name: message.from },
        wa_id: message.from
    });

    // Get or create conversation
    const conversationId = await getOrCreateConversation(
        tenantId,
        contactId,
        message.from // usar phone como external_id da conversa
    );

    // Extrair conteúdo da mensagem
    let bodyText = '';
    let mediaId = '';
    let mediaUrl = '';

    switch (message.type) {
        case 'text':
            bodyText = message.text?.body || '';
            break;
        case 'audio':
            mediaId = message.audio?.id || '';
            break;
        case 'image':
            mediaId = message.image?.id || '';
            bodyText = message.image?.caption || '';
            break;
        case 'document':
            mediaId = message.document?.id || '';
            bodyText = message.document?.filename || '';
            break;
    }

    // Salvar mensagem
    const { data: savedMessage, error } = await supabase
        .from('whatsapp_messages')
        .insert({
            tenant_id: tenantId,
            conversation_id: conversationId,
            direction: 'inbound',
            type: message.type,
            body_text: bodyText,
            media_id: mediaId,
            media_url: mediaUrl
        })
        .select('id')
        .single();

    if (error) {
        console.error('❌ [Webhook] Erro ao salvar mensagem:', error);
        return;
    }

    // Emitir evento
    await eventBus.emitMessageReceived(tenantId, conversationId, contactId, {
        type: message.type,
        body: bodyText,
        mediaId
    });

    // Se for áudio, criar audio_asset para transcrição
    if (message.type === 'audio' && savedMessage) {
        await createAudioAsset(tenantId, savedMessage.id, conversationId, contactId, mediaId);
    }

    // Atualizar last_message_at do lead
    await supabase
        .from('leads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('conversation_id', conversationId);
}

async function createAudioAsset(
    tenantId: string,
    messageId: string,
    conversationId: string,
    contactId: string,
    mediaId: string
): Promise<void> {
    const { data, error } = await supabase
        .from('audio_assets')
        .insert({
            tenant_id: tenantId,
            message_id: messageId,
            conversation_id: conversationId,
            contact_id: contactId,
            media_id: mediaId,
            status: 'pending'
        })
        .select('id')
        .single();

    if (error) {
        console.error('❌ [Webhook] Erro ao criar audio_asset:', error);
        return;
    }

    // Emitir evento para processamento assíncrono
    await eventBus.emitAudioReceived(tenantId, conversationId, data.id, mediaId);
}

async function processStatusUpdate(
    tenantId: string,
    status: { id: string; status: string; timestamp: string; recipient_id: string }
): Promise<void> {
    console.log(`📊 [Webhook] Status update: ${status.status} para ${status.recipient_id}`);

    // Aqui poderia atualizar o status da mensagem no banco
    // e emitir evento para atualizar UI em real-time
}

export default { setupWhatsAppWebhookRoutes };
