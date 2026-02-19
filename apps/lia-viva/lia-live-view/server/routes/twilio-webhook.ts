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
        console.log(`${TAG} 📥 POST v15.8! From: ${req.body.From} | To: ${receivedAtFull}`);

        try {
            const payload = req.body as TwilioWebhookPayload;
            const receivedAt = receivedAtFull;

            // Responder imediatamente (Twilio espera 200 rápido)
            res.status(200).send('<Response></Response>');

            // 1. Extrair dados básicos
            const accountSid = payload.AccountSid;
            const from = payload.From?.replace('whatsapp:', '') || '';
            const to = payload.To?.replace('whatsapp:', '') || '';
            const body = payload.Body || '';
            const profileName = payload.ProfileName || '';
            const messageSid = payload.MessageSid;
            const numMedia = parseInt(payload.NumMedia || '0');

            console.log(`${TAG} Dados extraídos: From=${from}, To=${to}, Body='${body.slice(0, 20)}...', AccountSid=${accountSid}`);

            // 2. Identificar o Tenant e o Número de Destino Real
            // Prioridade: Tentar casar SID + Fone. Se não der, confiar no SID e usar o Fone do banco.
            let subaccount = await TwilioRepository.getByAccountSidAndPhone(accountSid, to);

            if (!subaccount) {
                // Fallback: Busca apenas pelo SID (cenário onde o 'To' vem zoado do Twilio ou Sandbox)
                subaccount = await TwilioRepository.getByAccountSid(accountSid);
            }

            if (!subaccount) {
                console.warn(`${TAG} 🛑 Webhook ignorado: AccountSid ${accountSid} não mapeado no banco.`);
                return;
            }

            const tenantId = subaccount.tenant_id;
            const subaccountId = subaccount.id;

            // CORREÇÃO CRÍTICA v15.11: 
            // Se o 'To' do payload for diferente do número da subconta (ex: testes, sandbox, ou roteamento interno),
            // forçamos o uso do número que está NO BANCO para garantir a consistência do tenant.
            const effectiveTo = subaccount.twilio_phone_number || to;

            // 3. Isolamento do Número MASTER (Admin Oficial)
            const ADMIN_TENANT_ID = '00000000-0000-0000-0000-000000000001';
            const isMasterNumber = tenantId === ADMIN_TENANT_ID;

            console.log(`${TAG} Diagnosis: PayloadTo=${to} | EffectiveTo=${effectiveTo} | SID=${accountSid} | Tenant=${tenantId} | isMaster=${isMasterNumber}`);

            if (isMasterNumber && to === effectiveTo) {
                // Só logar como master se o número bater exatamente com o admin.
                // Caso contrário, entra no fluxo normal (ex: cliente na conta admin).
                console.log(`${TAG} ℹ️ Mensagem em canal Oficial Admin (Master).`);
            }

            // 4. Extrair mídia (se houver)
            const mediaUrls: string[] = [];
            const mediaTypes: string[] = [];
            for (let i = 0; i < numMedia; i++) {
                const url = payload[`MediaUrl${i}`];
                const type = payload[`MediaContentType${i}`];
                if (url) mediaUrls.push(url);
                if (type) mediaTypes.push(type);
            }

            // 5. Buscar ou criar contato
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
                    console.log(`${TAG} 👤 Contato encontrado: ${contactId}`);
                } else {
                    console.log(`${TAG} 🆕 Criando novo contato para ${from}...`);
                    const { data: newContact, error: insError } = await supabase
                        .from('whatsapp_contacts')
                        .insert({ tenant_id: tenantId, phone: from, name: profileName || from })
                        .select('id')
                        .single();

                    if (insError) throw insError;
                    contactId = newContact?.id || null;
                    console.log(`${TAG} 👤 Contato criado: ${contactId}`);
                }
            } catch (err: any) {
                console.error(`${TAG} ❌ Erro Crítico Contato:`, err.message);
            }

            // 6. Buscar ou criar conversa
            let conversationId: string | null = null;
            let copilotoEnabled = true;
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
                    console.log(`${TAG} 💬 Conversa ativa: ${conversationId} | IA=${copilotoEnabled}`);
                    await supabase
                        .from('whatsapp_conversations')
                        .update({ last_message_at: new Date().toISOString() })
                        .eq('id', conversationId);
                } else {
                    console.log(`${TAG} 🆕 Abrindo nova conversa para ${from}...`);
                    const { data: newConv, error: convError } = await supabase
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

                    if (convError) throw convError;
                    conversationId = newConv?.id || null;
                    copilotoEnabled = true;
                    console.log(`${TAG} 💬 Conversa criada: ${conversationId}`);
                }
            } catch (err: any) {
                console.error(`${TAG} ❌ Erro Crítico Conversa:`, err.message);
            }

            // 7. Registrar mensagem inbound no banco (Novo Esquema)
            try {
                const { error: dbErr } = await supabase.from('whatsapp_messages').insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    direction: 'inbound',
                    from_number: from,
                    to_number: effectiveTo,
                    body_text: body,
                    media_url: mediaUrls.length > 0 ? mediaUrls[0] : null,
                    external_id: messageSid,
                    provider: 'twilio',
                    status: 'received',
                    metadata: {
                        is_master: isMasterNumber,
                        profile_name: profileName,
                        num_media: numMedia,
                        media_urls: mediaUrls,
                        twilio_account_sid: accountSid,
                    },
                });

                if (dbErr) {
                    console.error(`${TAG} ❌ Erro de Banco (Insert):`, dbErr.message);
                } else {
                    console.log(`${TAG} 💾 Mensagem inbound salva.`);
                }
            } catch (dbErr: any) {
                console.error(`${TAG} ❌ Erro Fatal DB:`, dbErr.message);
            }

            // 8. Atualizar contador de uso
            TwilioRepository.upsertUsage({
                tenant_id: tenantId,
                subaccount_id: subaccountId,
                messages_received: 1,
            }).catch((err) => console.warn(`${TAG} Erro ao atualizar uso:`, err.message));

            // 9. Processar com IA (Se IA estiver ativa e NÃO for o número master estrito)
            // Se for o tenant Admin, só silencia se for O NÚMERO MASTER MESMO.
            const shouldSilenceIA = isMasterNumber && effectiveTo === subaccount.twilio_phone_number;

            if (!copilotoEnabled || !body.trim() || shouldSilenceIA) {
                console.log(`${TAG} IA ignorada: Copiloto=${copilotoEnabled}, Texto=${!!body.trim()}, SilencedMaster=${shouldSilenceIA}`);
                return;
            }

            // Buscar configurações do agente
            let agentSettings: any = null;
            try {
                const { data } = await supabase
                    .from('whatsapp_agent_settings')
                    .select('profile_json, playbooks_json')
                    .eq('tenant_id', tenantId)
                    .maybeSingle();
                agentSettings = data;
            } catch (err: any) {
                console.warn(`${TAG} Sem configurações de agente:`, err.message);
            }

            // Buscar histórico
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
                    console.warn(`${TAG} Erro Histórico:`, err.message);
                }
            }

            const profile = agentSettings?.profile_json || {};
            const playbooksList = agentSettings?.playbooks_json || [];
            const agentName = profile.agent_name || 'LIA';
            const agentMode = profile.objective || 'vendas';
            const language = profile.language || 'pt-BR';
            const activePlaybook = playbooksList.find((p: any) => p.name.toLowerCase().includes(agentMode.toLowerCase())) || playbooksList[0];
            const rules = activePlaybook?.content || profile.rules_instructions || '';

            const systemPrompt = `Você é ${agentName}, um assistente de WhatsApp inteligente da Luminnus.\nModo: ${agentMode}\nIdioma: ${language}\n${rules ? `\nRegras:\n${rules}` : ''}\n\nINST: Natural, sem markdown, 2-3 frases.`;

            console.log(`${TAG} 🧠 IA Gerando resposta...`);
            let aiResponse = '';
            try {
                const result = await OpenAIService.chat(body, [{ role: 'system', content: systemPrompt }, ...history]);
                aiResponse = result.text?.trim() || '';
            } catch (aiErr: any) {
                console.error(`${TAG} ❌ Erro IA:`, aiErr.message);
                aiResponse = "Desculpe, tive um problema técnico. Pode repetir?";
            }

            if (!aiResponse) return;

            // 10. Enviar via Twilio
            console.log(`${TAG} 📤 Enviando para ${from} via ${receivedAt}...`);
            const sendResult = await TwilioMessageService.sendMessage(tenantId, from, aiResponse, [], receivedAt);

            if (sendResult.success) {
                console.log(`${TAG} ✅ Enviado SID: ${sendResult.messageSid}`);
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
            } else {
                console.error(`${TAG} ❌ Falha Twilio:`, sendResult.error);
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
            console.error(`❌ ${TAG} Erro Status:`, error);
        }
    });

    console.log('✅ [Routes] Twilio Webhook v15.8 (Direct Mount) registered.');
}

export default setupTwilioWebhookRoutes;
