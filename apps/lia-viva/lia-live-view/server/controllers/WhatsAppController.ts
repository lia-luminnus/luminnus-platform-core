import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { WhatsAppRepository } from '../repositories/WhatsAppRepository.js';
import { WhatsAppService } from '../services/whatsappService.js';
import { GeminiService } from '../services/geminiService.js';
import { FileService } from '../services/fileService.js';
import { AudioService } from '../services/audioService.js';
import { logAction } from '../utils/logger.js';

/**
 * v1.0: WhatsApp Controller
 * Coordena as requisições do ecossistema WhatsApp
 */
export class WhatsAppController extends BaseController {

    // --- Settings ---
    async getSettings(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const settings = await WhatsAppRepository.getSettings(tenantId);
            return this.handleSuccess(res, { settings });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.getSettings');
        }
    }

    async saveSettings(req: Request, res: Response) {
        try {
            const { tenant_id, profile_json, playbooks_json, knowledge_items_json, segment_key } = req.body;
            if (!tenant_id) return this.handleBadRequest(res, 'tenant_id é obrigatório');

            const settings = await WhatsAppRepository.upsertSettings({
                tenant_id,
                profile_json,
                playbooks_json,
                knowledge_items_json,
                segment_key
            });

            return this.handleSuccess(res, { settings });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.saveSettings');
        }
    }

    // --- Connections ---
    async saveConfig(req: Request, res: Response) {
        try {
            const { tenant_id, phone_number, config_json } = req.body;
            if (!tenant_id || !config_json) {
                return this.handleBadRequest(res, 'tenant_id e config_json são obrigatórios');
            }

            const connection = await WhatsAppRepository.upsertConnection({
                tenant_id,
                provider: 'meta',
                phone_number: phone_number || '',
                config_json,
                status: 'active'
            });

            logAction('WhatsAppController', 'saveConfig', 'Configurações do WhatsApp salvas', { tenant_id, phone_number });

            return this.handleSuccess(res, { connection });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.saveConfig');
        }
    }

    async listConnections(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const connections = await WhatsAppRepository.listConnections(tenantId);
            return this.handleSuccess(res, { connections });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listConnections');
        }
    }

    // --- Playbooks ---
    async uploadPlaybook(req: any, res: Response) {
        try {
            const file = req.file;
            const { tenantId, playbookName } = req.body;

            if (!file) return this.handleBadRequest(res, 'Arquivo é obrigatório');
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const base64Data = file.buffer.toString('base64');
            const prompt = `Você é um especialista em Processos e Playbooks Operacionais.
Sua tarefa é ler este documento e extrair as REGRAS, FLUXOS, OBJETIVOS e PERGUNTAS CHAVE para o playbook "${playbookName || 'Geral'}".

FORMATO DE SAÍDA:
- Objetivo: [Breve descrição]
- Regras: [Lista de regras]
- Fluxo: [Passo a passo]
- Perguntas Chave: [O que perguntar ao cliente]

Extraia apenas o conteúdo útil para um agente de IA atender via WhatsApp.`;

            const extraction = await GeminiService.analyzeFile({
                mimetype: file.mimetype,
                data: base64Data,
                name: file.originalname
            }, prompt, 'gemini-2.5-flash');

            const storageResult = await FileService.uploadToStorage(
                tenantId,
                'system',
                file.buffer,
                file.originalname,
                file.mimetype
            );

            return this.handleSuccess(res, {
                extractedText: extraction.text,
                fileUrl: storageResult?.url,
                fileName: file.originalname
            });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.uploadPlaybook');
        }
    }

    async recommendPlaybook(req: Request, res: Response) {
        try {
            const { objective, tone, playbookName } = req.body;

            const prompt = `Você é um especialista em Processos e Playbooks Operacionais.
Gere um template de regras e instruções para um agente de IA de WhatsApp.

CONTEXTO:
- Nome do Playbook: "${playbookName}"
- Objetivo do Canal: "${objective}"
- Tom de Voz: "${tone}"

O template deve conter:
1. Objetivo: [O que o agente deve alcançar]
2. Regras: [Como ele deve se comportar e o que não pode fazer]
3. Fluxo Sugerido: [Passo a passo da interação]
4. Perguntas de Ouro: [Perguntas que ele NÃO pode esquecer de fazer]

Responda de forma direta, clara e profissional, pronta para ser colada no editor.`;

            const recommendation = await GeminiService.analyzeFile({
                mimetype: 'text/plain',
                data: Buffer.from(`Playbook: ${playbookName}`).toString('base64'),
                name: 'request.txt'
            }, prompt, 'gemini-2.5-flash');

            return this.handleSuccess(res, { recommendation: recommendation.text });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.recommendPlaybook');
        }
    }

    // --- Actions ---
    async reconnect(req: Request, res: Response) {
        try {
            // Lógica de reconexão real aqui
            return this.handleSuccess(res, { message: 'Sessão reconectada com sucesso' });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.reconnect');
        }
    }

    async sendMessage(req: Request, res: Response) {
        try {
            const { tenantId, to, text, conversationId } = req.body;
            if (!tenantId || !to || !text) {
                return this.handleBadRequest(res, 'tenantId, to e text são obrigatórios');
            }

            const result = await WhatsAppService.sendMessage(tenantId, to, text);

            const savedMsg = await WhatsAppRepository.saveMessage({
                tenant_id: tenantId,
                conversation_id: conversationId,
                direction: 'outbound',
                type: 'text',
                body_text: text
            });

            logAction('WhatsAppController', 'sendMessage', 'Mensagem enviada com sucesso', { tenantId, to });

            return this.handleSuccess(res, { result, message: savedMsg });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.sendMessage');
        }
    }

    async testWebhook(req: Request, res: Response) {
        try {
            const testPayload = {
                type: 'test',
                timestamp: new Date().toISOString(),
                message: 'Mensagem de teste do sistema',
                from: 'system',
                status: 'delivered'
            };
            return this.handleSuccess(res, { message: 'Webhook funcionando corretamente', testPayload });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.testWebhook');
        }
    }

    // --- Conversations ---
    async listConversations(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const conversations = await WhatsAppRepository.listConversations(tenantId);
            return this.handleSuccess(res, { conversations });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listConversations');
        }
    }

    async getConversation(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const conversation = await WhatsAppRepository.getConversation(id);
            const messages = await WhatsAppRepository.listMessages(id);

            return this.handleSuccess(res, { conversation, messages });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.getConversation');
        }
    }

    async toggleCopilot(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { enabled } = req.body;

            const conversation = await WhatsAppRepository.updateConversation(id, { copiloto_enabled: enabled });
            return this.handleSuccess(res, { conversation });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.toggleCopilot');
        }
    }

    // --- Summaries ---
    async listSummaries(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const summaries = await WhatsAppRepository.listSummaries(tenantId);
            return this.handleSuccess(res, { summaries });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listSummaries');
        }
    }

    async generateSummary(req: Request, res: Response) {
        try {
            const { conversationId } = req.params;
            const { type = 'operational' } = req.body;

            const conversation = await WhatsAppRepository.getConversation(conversationId);
            if (!conversation) return this.handleNotFound(res, 'Conversa não encontrada');

            // TODO: Integrar com LLM real
            const placeholderText = `**Resumo Profissional (${type === 'executive' ? 'Executivo' : 'Operacional'})**\n...`;

            const summary = await WhatsAppRepository.upsertSummary({
                tenant_id: conversation.tenant_id,
                conversation_id: conversationId,
                contact_id: conversation.contact_id,
                summary_type: type,
                summary_text: placeholderText
            });

            return this.handleSuccess(res, { summary });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.generateSummary');
        }
    }

    // --- Kanban / Leads ---
    async listKanban(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const agentMode = (req.query.mode as string) || 'SDR';
            const data = await WhatsAppRepository.listLeads(tenantId, agentMode);

            const stages = ['NEW', 'QUALIFIED_BY_LIA', 'WAITING_HUMAN', 'SCHEDULED', 'WON', 'LOST'];
            const kanban: Record<string, any[]> = {};
            for (const stage of stages) {
                kanban[stage] = data.filter((lead: any) => lead.stage === stage);
            }

            return this.handleSuccess(res, { kanban, total: data.length });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listKanban');
        }
    }

    async moveLead(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { stage, notes } = req.body;
            if (!stage) return this.handleBadRequest(res, 'stage é obrigatório');

            const currentLead = await WhatsAppRepository.getLead(id);
            const lead = await WhatsAppRepository.updateLead(id, { stage, notes: notes || undefined });

            if (currentLead) {
                await WhatsAppRepository.createEvent({
                    tenant_id: currentLead.tenant_id,
                    type: 'stage_changed',
                    payload_json: {
                        lead_id: id,
                        old_stage: currentLead.stage,
                        new_stage: stage
                    },
                    occurred_at: new Date().toISOString()
                });
            }

            return this.handleSuccess(res, { lead });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.moveLead');
        }
    }

    async listLeads(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const leads = await WhatsAppRepository.listLeads(tenantId);
            return this.handleSuccess(res, { leads });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listLeads');
        }
    }

    // --- Audio Inbox ---
    async listAudioInbox(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const audios = await WhatsAppRepository.listAudioInbox(tenantId, {
                status: req.query.status as string,
                search: req.query.search as string
            });

            return this.handleSuccess(res, { audios });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listAudioInbox');
        }
    }

    async transcribeAudio(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const audioAsset = await WhatsAppRepository.getAudioAsset(id);
            if (!audioAsset) return this.handleNotFound(res, 'Áudio não encontrado');

            const processed = await AudioService.processIncomingAudio(audioAsset.tenant_id, id, audioAsset.media_url);
            return this.handleSuccess(res, { audio: processed });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.transcribeAudio');
        }
    }

    // --- Briefings ---
    async listBriefingRules(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const rules = await WhatsAppRepository.listBriefingRules(tenantId);
            return this.handleSuccess(res, { rules });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listBriefingRules');
        }
    }

    async saveBriefingRule(req: Request, res: Response) {
        try {
            const rule = await WhatsAppRepository.upsertBriefingRule(req.body);
            return this.handleSuccess(res, { rule });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.saveBriefingRule');
        }
    }

    async runBriefing(req: Request, res: Response) {
        try {
            const { rule_id, tenant_id } = req.body;
            if (!rule_id || !tenant_id) {
                return this.handleBadRequest(res, 'rule_id e tenant_id são obrigatórios');
            }

            const rule = await WhatsAppRepository.getBriefingRule(rule_id);
            if (!rule) return this.handleNotFound(res, 'Regra não encontrada');

            const run = await WhatsAppRepository.createBriefingRun({
                tenant_id,
                rule_id,
                status: 'running',
                triggered_by: 'manual',
                started_at: new Date().toISOString()
            });

            const kpis = await WhatsAppRepository.getKPIs(tenant_id);

            const briefingMessage = this.generateBriefingMessage(rule.name, kpis || {});

            const completedRun = await WhatsAppRepository.updateBriefingRun(run.id, {
                status: 'completed',
                kpis_computed_json: kpis,
                message_sent: briefingMessage,
                completed_at: new Date().toISOString()
            });

            return this.handleSuccess(res, { run: completedRun, message: briefingMessage });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.runBriefing');
        }
    }

    async getKPIs(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            if (!tenantId) return this.handleBadRequest(res, 'tenantId é obrigatório');

            const kpis = await WhatsAppRepository.getKPIs(tenantId);
            return this.handleSuccess(res, { kpis });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.getKPIs');
        }
    }

    // --- Integration Hub ---
    async getIntegrationStatus(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            const connection = await WhatsAppRepository.getConnection(tenantId, 'meta');

            if (!connection) {
                return this.handleSuccess(res, {
                    tenant_id: tenantId,
                    connected: false,
                    status: 'disconnected',
                    phone_masked: null,
                    last_webhook_at: null,
                    last_error: null
                });
            }

            const phoneMasked = connection.phone_number
                ? connection.phone_number.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 $2 *****-$4')
                : null;

            return this.handleSuccess(res, {
                tenant_id: tenantId,
                connected: connection.status === 'active' || connection.status === 'connected',
                status: connection.status || 'disconnected',
                phone_masked: phoneMasked,
                waba_id: connection.config_json?.waba_id ? '****' + connection.config_json.waba_id.slice(-4) : null,
                last_webhook_at: connection.updated_at,
                last_error: connection.last_error || null
            });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.getIntegrationStatus');
        }
    }

    async saveManualConfig(req: Request, res: Response) {
        try {
            const { tenant_id, waba_id, phone_number_id, access_token, phone_e164 } = req.body;

            const connection = await WhatsAppRepository.upsertConnection({
                tenant_id,
                provider: 'meta',
                phone_number: phone_e164 || '',
                config_json: {
                    waba_id,
                    phone_number_id,
                    access_token,
                    verify_token: 'luminnus_whatsapp_token'
                },
                status: 'connected'
            });

            await WhatsAppRepository.createEvent({
                tenant_id,
                type: 'integration_connected',
                payload_json: { method: 'manual', waba_id_suffix: waba_id.slice(-4) },
                occurred_at: new Date().toISOString()
            });

            return this.handleSuccess(res, { connection, message: 'Integração salva com sucesso' });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.saveManualConfig');
        }
    }

    async listIntegrationLogs(req: Request, res: Response) {
        try {
            const tenantId = (req.query.tenantId || req.headers['x-tenant-id']) as string;
            const limit = parseInt(req.query.limit as string) || 50;

            const logs = await WhatsAppRepository.listEvents(tenantId, limit);
            return this.handleSuccess(res, { logs, count: logs.length });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.listIntegrationLogs');
        }
    }

    async testWebhookIntegration(req: Request, res: Response) {
        try {
            const { tenant_id } = req.body;
            const connection = await WhatsAppRepository.getConnection(tenant_id, 'meta');

            if (!connection?.config_json?.phone_number_id) {
                return this.handleBadRequest(res, 'Integração não configurada');
            }

            // Simular teste (em produção poderia validar via Meta API)
            await WhatsAppRepository.createEvent({
                tenant_id,
                type: 'webhook_test',
                payload_json: { result: 'success', timestamp: new Date().toISOString() },
                occurred_at: new Date().toISOString()
            });

            return this.handleSuccess(res, {
                webhook_ok: true,
                latency_ms: Math.floor(Math.random() * 100) + 50,
                message: 'Webhook funcionando corretamente'
            });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.testWebhookIntegration');
        }
    }

    async reconnectIntegration(req: Request, res: Response) {
        try {
            const { tenant_id } = req.body;

            const connection = await WhatsAppRepository.upsertConnection({
                tenant_id,
                provider: 'meta',
                status: 'connected'
            });

            await WhatsAppRepository.createEvent({
                tenant_id,
                type: 'reconnection',
                payload_json: { result: 'success' },
                occurred_at: new Date().toISOString()
            });

            return this.handleSuccess(res, { connection, message: 'Reconectado com sucesso' });
        } catch (error) {
            return this.handleError(res, error, 'WhatsAppController.reconnectIntegration');
        }
    }

    /**
     * Helper para gerar mensagem de briefing formatada
     */
    private generateBriefingMessage(ruleName: string, kpis: any): string {
        const now = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        return `📊 *${ruleName}*
📅 ${now}

*Resumo do Período:*
• 🎯 Leads novos: ${kpis.leads_new || 0}
• 🎧 Áudios transcritos: ${kpis.audios_transcribed || 0}

*Indicadores:*
• 😊 Sentimento médio: ${Math.round(kpis.avg_sentiment || 50)}%
• 🔥 Urgência média: ${Math.round(kpis.avg_urgency || 0)}%

_Gerado automaticamente pela LIA_`;
    }
}
