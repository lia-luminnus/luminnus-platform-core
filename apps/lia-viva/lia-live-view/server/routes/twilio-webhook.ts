/**
 * Twilio Webhook Routes — Roteador Inteligente com Pipeline de IA
 *
 * Endpoint centralizado que recebe TODAS as mensagens WhatsApp via Twilio.
 * Identifica o tenant pelo AccountSid da subconta, processa com IA (LIA)
 * e responde automaticamente quando o copiloto estiver ativo.
 *
 * SEPARADO do webhook Meta (/api/whatsapp/webhook)
 * Este endpoint: /api/twilio/webhook
 */

import { Router, Request, Response } from 'express';
import { TwilioMessageService } from '../services/twilioMessageService.js';
import { TwilioRepository } from '../repositories/TwilioRepository.js';
import { decryptToken } from '../services/twilioEncryption.js';
import { supabase } from '../config/supabase.js';
import { OpenAIService } from '../services/openAIService.js';
import type { TwilioWebhookPayload, TwilioStatusCallback } from '../types/twilio.types.js';

export function setupTwilioWebhookRoutes(app: any): void {
    const TAG = '[Twilio Webhook Setup]';

    // Rota Principal de Mensagem (Inbound)
    app.post(['/api/twilio/webhook', '/api/twilio/webhook/'], async (req: Request, res: Response) => {
        const TAG = '[Twilio Webhook]';
        const receivedAtFull = req.body.To || '';
        console.log(`${TAG} 📥 POST v15.7! From: ${req.body.From} | To: ${receivedAtFull}`);

        try {
            const payload = req.body as TwilioWebhookPayload;
            // v15.7: Mantemos o prefixo whatsapp: para o fromOverride
            const receivedAt = receivedAtFull;

            // Responder imediatamente (Twilio espera 200 rápido)
            res.status(200).send('<Response></Response>');

            // Log do payload básico para debug
            console.log(`${TAG} Payload recebido: From=${payload.From}, AccountSid=${payload.AccountSid}`);

            // 1. Identificar o Tenant pelo Sid da Conta Twilio
            const accountSid = payload.AccountSid;
            const MASTER_SID = (process.env.TWILIO_ACCOUNT_SID || '').trim();
            const ADMIN_TENANT = '00000000-0000-0000-0000-000000000001';

            let tenantId: string | undefined;
            let subaccountId = '';

            if (accountSid === MASTER_SID) {
                console.log(`${TAG} 👑 MASTER ACCOUNT detectada. Mapeando para Admin Tenant.`);
                tenantId = ADMIN_TENANT;
            } else {
                const subaccount = await TwilioRepository.getByAccountSid(accountSid);
                tenantId = subaccount?.tenant_id;
                subaccountId = subaccount?.id || '';
            }

            const from = payload.From?.replace('whatsapp:', '') || '';
            const to = payload.To?.replace('whatsapp:', '') || '';
            const body = payload.Body || '';
            const profileName = payload.ProfileName || '';
            const messageSid = payload.MessageSid;
            const numMedia = parseInt(payload.NumMedia || '0');

            console.log(`${TAG} Recebido: From=${from}, To=${to}, AccountSid=${accountSid}, Tenant=${tenantId || 'NÃO ENCONTRADO'}`);

            if (!tenantId) {
                console.warn(`${TAG} 🛑 Webhook ignorado: AccountSid ${accountSid} não está vinculado a nenhum tenant no banco.`);
                return;
            }

            // 2. Extrair mídia (se houver)
            const mediaUrls: string[] = [];
            const mediaTypes: string[] = [];
            for (let i = 0; i < numMedia; i++) {
                const url = payload[`MediaUrl${i}`];
                const type = payload[`MediaContentType${i}`];
                if (url) mediaUrls.push(url);
                if (type) mediaTypes.push(type);
            }

            // 3. Buscar ou criar contato
            let contactId: string | null = null;
            try {
                const { data: existingContact } = await supabase
                    .from('whatsapp_contacts')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .eq('phone', from)
                    .maybeSingle();

                if (existingContact) {
                    contactId = existingContact.id;
                } else {
                    const { data: newContact } = await supabase
                        .from('whatsapp_contacts')
                        .insert({ tenant_id: tenantId, phone: from, name: profileName || from })
                        .select('id')
                        .single();
                    contactId = newContact?.id || null;
                }
            } catch (err: any) {
                console.warn(`${TAG} Erro ao buscar/criar contato:`, err.message);
            }

            // 4. Buscar ou criar conversa
            let conversationId: string | null = null;
            let copilotoEnabled = true; // Por padrão, IA ativa
            try {
                const { data: existingConv } = await supabase
                    .from('whatsapp_conversations')
                    .select('id, copiloto_enabled')
                    .eq('tenant_id', tenantId)
                    .eq('external_id', from)
                    .eq('status', 'open')
                    .maybeSingle();

                if (existingConv) {
                    conversationId = existingConv.id;
                    copilotoEnabled = existingConv.copiloto_enabled ?? true;
                    await supabase
                        .from('whatsapp_conversations')
                        .update({ last_message_at: new Date().toISOString() })
                        .eq('id', conversationId);
                } else {
                    const { data: newConv } = await supabase
                        .from('whatsapp_conversations')
                        .insert({
                            tenant_id: tenantId,
                            external_id: from,
                            contact_id: contactId,
                            status: 'open',
                            copiloto_enabled: true,
                            last_message_at: new Date().toISOString(),
                            metadata: { provider: 'twilio', profile_name: profileName }
                        })
                        .select('id')
                        .single();
                    conversationId = newConv?.id || null;
                    copilotoEnabled = true;
                }
            } catch (err: any) {
                console.warn(`${TAG} Erro ao buscar/criar conversa:`, err.message);
            }

            // 5. Registrar mensagem inbound no banco
            try {
                await supabase.from('whatsapp_messages').insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    direction: 'inbound',
                    from_number: from,
                    to_number: to,
                    body_text: body,
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

            // 6. Atualizar contador de uso
            TwilioRepository.upsertUsage({
                tenant_id: tenantId,
                subaccount_id: subaccountId,
                messages_received: 1,
            }).catch((err) => console.warn(`${TAG} Erro ao atualizar uso:`, err.message));

            // 7. Processar com IA (apenas se copiloto estiver ativo e houver texto)
            if (!copilotoEnabled) {
                console.log(`${TAG} Copiloto desativado para conversa ${conversationId} — aguardando atendimento humano`);
                return;
            }

            if (!body.trim()) {
                console.log(`${TAG} Mensagem sem texto (apenas mídia) — ignorando processamento de IA`);
                return;
            }

            // Buscar configurações do agente (playbook, regras, nome)
            let agentSettings: any = null;
            try {
                const { data } = await supabase
                    .from('whatsapp_agent_settings')
                    .select('profile_json, playbooks_json')
                    .eq('tenant_id', tenantId)
                    .maybeSingle();
                agentSettings = data;
            } catch (err: any) {
                console.warn(`${TAG} Sem configurações de agente para tenant ${tenantId}:`, err.message);
            }

            // Buscar histórico recente da conversa (últimas 10 mensagens para contexto)
            let history: { role: string; content: string }[] = [];
            if (conversationId) {
                try {
                    const { data: msgs } = await supabase
                        .from('whatsapp_messages')
                        .select('direction, body_text')
                        .eq('conversation_id', conversationId)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    if (msgs) {
                        history = msgs.reverse().map((m: any) => ({
                            role: m.direction === 'inbound' ? 'user' : 'assistant',
                            content: m.body_text || ''
                        })).filter((m) => m.content);
                    }
                } catch (err: any) {
                    console.warn(`${TAG} Erro ao buscar histórico:`, err.message);
                }
            }

            // Montar system prompt com as regras do agente (Extraídas do JSON)
            const profile = agentSettings?.profile_json || {};
            const playbooksList = agentSettings?.playbooks_json || [];

            const agentName = profile.agent_name || 'LIA';
            const agentMode = profile.objective || 'vendas';
            const language = profile.language || 'pt-BR';

            const activePlaybook = playbooksList.find((p: any) =>
                p.name.toLowerCase().includes(agentMode.toLowerCase())
            ) || playbooksList[0];

            const rules = activePlaybook?.content || profile.rules_instructions || '';

            const systemPrompt = `Você é ${agentName}, um assistente de WhatsApp inteligente da Luminnus.
Modo de operação: ${agentMode}
Idioma: ${language}
${rules ? `\nRegras e instruções atuais:\n${rules}` : ''}

INSTRUÇÕES DE FORMATO:
- Responda de forma natural, concisa e amigável.
- NÃO use markdown (sem asteriscos, sem #, sem negrito).
- Mantenha respostas curtas (máximo 2-3 frases), adequadas para WhatsApp.
- Nome do cliente: ${profileName || 'Cliente'}`;

            // Chamar OpenAI com histórico da conversa e system prompt
            // 4. Integrar com IA (LIA)
            console.log(`${TAG} 🧠 Gerando resposta IA para: ${body.slice(0, 30)}...`);
            let aiResponse = '';
            try {
                const historyWithSystem = [
                    { role: 'system', content: systemPrompt },
                    ...history
                ];

                const result = await OpenAIService.chat(
                    body,
                    historyWithSystem
                );
                aiResponse = result.text?.trim() || '';
                console.log(`${TAG} ✨ IA respondeu (${aiResponse.length} chars)`);
            } catch (aiErr: any) {
                console.error(`${TAG} ❌ Erro na IA:`, aiErr.message);
                aiResponse = "Desculpe, tive um problema técnico agora. Pode repetir?";
            }

            if (!aiResponse) {
                console.warn(`${TAG} ⚠️ IA retornou resposta vazia`);
                return;
            }

            // 5. Enviar resposta via Twilio
            // v15.7: Usamos a variável receivedAt já definida no topo
            console.log(`${TAG} 📤 Enviando resposta para ${from} (via ${receivedAtFull})...`);

            const sendResult = await TwilioMessageService.sendMessage(
                tenantId,
                from,
                aiResponse,
                [],
                receivedAt
            );

            if (!sendResult.success) {
                console.error(`${TAG} ❌ Falha no envio Twilio:`, sendResult.error);
            } else {
                console.log(`${TAG} ✅ Resposta enviada com sucesso! (SID: ${sendResult.messageSid})`);
            }

            if (sendResult.success) {
                console.log(`✅ ${TAG} IA respondeu para ${from.slice(-4)}*** | tenant=${tenantId}`);

                try {
                    await supabase.from('whatsapp_messages').insert({
                        tenant_id: tenantId,
                        conversation_id: conversationId,
                        direction: 'outbound',
                        from_number: to,
                        to_number: from,
                        body_text: aiResponse,
                        external_id: sendResult.messageSid,
                        provider: 'twilio',
                        status: 'sent',
                        metadata: { generated_by: 'lia_ai', agent_mode: agentMode }
                    });
                } catch (saveErr: any) {
                    console.warn(`${TAG} Erro ao salvar resposta outbound:`, saveErr.message);
                }
            } else {
                console.error(`❌ ${TAG} Falha ao enviar resposta: ${sendResult.error}`);
            }

        } catch (error: any) {
            console.error(`❌ ${TAG} Erro fatal:`, error);
        }
    });

    // Rota de Status Callback
    app.post('/api/twilio/webhook/status', async (req: Request, res: Response) => {
        const TAG = '[Twilio Status]';
        try {
            res.sendStatus(200);
            const callback = req.body as TwilioStatusCallback;
            if (callback.MessageSid) {
                await supabase
                    .from('whatsapp_messages')
                    .update({ status: callback.MessageStatus, updated_at: new Date().toISOString() })
                    .eq('external_id', callback.MessageSid);
            }
        } catch (error: any) {
            console.error(`❌ ${TAG} Erro:`, error);
        }
    });

    console.log('✅ [Routes] Twilio Webhook registered at /api/twilio/webhook (Direct Mount)');
}

export default setupTwilioWebhookRoutes;
