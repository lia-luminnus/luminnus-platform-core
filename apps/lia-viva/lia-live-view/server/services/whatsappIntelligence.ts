/**
 * WhatsApp Intelligence
 * Orquestrador que conecta a LIA ao WhatsApp
 */

import eventBus from './eventBusService.js';
import { WhatsAppService } from './whatsappService.js';
import { OpenAIService } from './openAIService.js';
import { getContext } from './memoryService.js';
import { ToolService } from './toolService.js';
import { supabase } from '../config/supabase.js';
import { AutomationRunner } from './automationRunner.js';
import { AutomationService } from './automationService.js';
import { AudioService } from './audioService.js';

export const WhatsAppIntelligence = {
    /**
     * Inicializa os listeners do WhatsApp
     */
    init() {
        console.log('🤖 [WhatsAppIntelligence] Sistema de Inteligência ativo');

        // Escutar mensagens recebidas
        eventBus.onEvent('message_received', async (event) => {
            try {
                await this.handleIncomingMessage(event);
            } catch (err) {
                console.error('❌ [WhatsAppIntelligence] Erro ao processar mensagem:', err);
            }
        });

        // Escutar áudios recebidos
        eventBus.onEvent('audio_received', async (event) => {
            try {
                const { tenantId, payload } = event;
                await AudioService.processIncomingAudio(tenantId, payload.audioAssetId, payload.mediaUrl);
            } catch (err) {
                console.error('❌ [WhatsAppIntelligence] Erro ao processar áudio:', err);
            }
        });
    },

    /**
     * Processa mensagem recebida e decide se responde
     */
    async handleIncomingMessage(event: any) {
        const { tenantId, conversationId, contactId, payload } = event;
        const messageText = payload.body;

        if (!messageText) return; // Por enquanto só responde texto

        // 1. Verificar modo da conversa
        const { data: conversation } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('id', conversationId)
            .single();

        if (!conversation) return;

        // Se o copiloto_enabled for false ou modo for 'human', não responde automaticamente
        if (!conversation.copiloto_enabled || conversation.mode === 'human') {
            console.log(`👤 [WhatsAppIntelligence] Resposta automática desativada para conv ${conversationId}. LIA em silêncio.`);
            return;
        }

        // 2. Obter contexto da LIA
        const context = await getContext(conversationId, tenantId, messageText);

        // 3. Verificar se existe automação ativa para este evento
        try {
            const automations = await AutomationService.listAutomations(tenantId);
            const activeAutomation = automations.find(a =>
                a.is_enabled &&
                a.status === 'active' &&
                (a.trigger_type === 'event' || a.trigger_type === 'keyword')
            );

            if (activeAutomation) {
                console.log(`⚡ [WhatsAppIntelligence] Disparando automação: ${activeAutomation.name}`);
                await AutomationRunner.trigger(activeAutomation.id, tenantId, {
                    vars: { message: messageText, contactId, conversationId },
                    context: { conversationId, contactId, messageText }
                }, 'webhook');
                return; // O AutomationRunner cuidará da resposta
            }
        } catch (err) {
            console.warn('⚠️ [WhatsAppIntelligence] Erro ao buscar automações, seguindo com fluxo padrão:', err);
        }

        // 4. Fluxo Padrão: Chamar "Cérebro" (OpenAI)
        const response = await OpenAIService.chat(
            messageText,
            context.history,
            'gpt-4o-mini',
            ToolService.getTools()
        );

        // 5. Se houver chamada de ferramenta, executar e gerar nova resposta
        if (response.function_call) {
            console.log(`🔧 [WhatsAppIntelligence] Executando ferramenta: ${response.function_call.name}`);
            const toolResult = await ToolService.execute(
                response.function_call.name,
                JSON.parse(response.function_call.arguments),
                { userId: tenantId, tenantId }
            );

            // Segunda chamada com o resultado da ferramenta
            const finalResponse = await OpenAIService.chat(
                `Resultado da ferramenta ${response.function_call.name}: ${JSON.stringify(toolResult)}`,
                [...context.history, { role: 'assistant', content: null, function_call: response.function_call }],
                'gpt-4o-mini'
            );

            await this.sendResponse(tenantId, conversationId, conversation.external_id, finalResponse.text);
        } else {
            // 6. Enviar resposta direta
            await this.sendResponse(tenantId, conversationId, conversation.external_id, response.text);
        }
    },

    /**
     * Envia a resposta final para o WhatsApp e registra no banco
     */
    async sendResponse(tenantId: string, conversationId: string, to: string, text: string) {
        if (!text) return;

        try {
            // Enviar via Meta
            await WhatsAppService.sendMessage(tenantId, to, text);

            // Salvar no banco
            await supabase
                .from('whatsapp_messages')
                .insert({
                    tenant_id: tenantId,
                    conversation_id: conversationId,
                    direction: 'outbound',
                    type: 'text',
                    body_text: text
                });

            // Emitir evento de mensagem enviada
            await eventBus.emitEvent({
                type: 'message_sent',
                tenantId,
                conversationId,
                payload: { body: text, to }
            });

            console.log(`🤖 [WhatsAppIntelligence] Resposta enviada para ${to}`);
        } catch (err) {
            console.error(`❌ [WhatsAppIntelligence] Erro ao enviar resposta:`, err);
        }
    }
};

export default WhatsAppIntelligence;
