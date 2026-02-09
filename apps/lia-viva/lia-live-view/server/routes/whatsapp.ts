import { Express } from 'express';
import multer from 'multer';
import { WhatsAppController } from '../controllers/WhatsAppController.js';
import { asyncErrorWrapper } from '../middleware/asyncErrorWrapper.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { whatsappSchemas } from '../validators/whatsapp.schema.ts';

const upload = multer({ storage: multer.memoryStorage() });
const controller = new WhatsAppController();

export function setupWhatsAppRoutes(app: Express) {
    // GET /api/whatsapp/settings - Retorna configurações do agente por tenant
    app.get('/api/whatsapp/settings',
        validateRequest(whatsappSchemas.getSettings),
        asyncErrorWrapper(controller.getSettings.bind(controller))
    );

    // POST /api/whatsapp/settings - Salva/Atualiza configurações do agente
    app.post('/api/whatsapp/settings',
        validateRequest(whatsappSchemas.saveSettings),
        asyncErrorWrapper(controller.saveSettings.bind(controller))
    );

    // POST /api/whatsapp/config - Salva credenciais da Meta Cloud API
    app.post('/api/whatsapp/config',
        validateRequest(whatsappSchemas.saveConfig),
        asyncErrorWrapper(controller.saveConfig.bind(controller))
    );

    // GET /api/whatsapp/connections - Lista conexões do tenant
    app.get('/api/whatsapp/connections', asyncErrorWrapper(controller.listConnections.bind(controller)));

    // POST /api/whatsapp/playbooks/upload - Upload e extração de texto para playbooks
    app.post('/api/whatsapp/playbooks/upload', upload.single('file'), asyncErrorWrapper(controller.uploadPlaybook.bind(controller)));

    // POST /api/whatsapp/playbooks/recommend - Sugestão de playbook via IA
    app.post('/api/whatsapp/playbooks/recommend', asyncErrorWrapper(controller.recommendPlaybook.bind(controller)));

    // POST /api/whatsapp/reconnect - Reconectar sessão do WhatsApp
    app.post('/api/whatsapp/reconnect', asyncErrorWrapper(controller.reconnect.bind(controller)));

    // POST /api/whatsapp/send - Enviar mensagem manualmente pela UI (Agente)
    app.post('/api/whatsapp/send',
        validateRequest(whatsappSchemas.sendMessage),
        asyncErrorWrapper(controller.sendMessage.bind(controller))
    );

    // POST /api/whatsapp/webhook/test - Testar webhook com mensagem simulada
    app.post('/api/whatsapp/webhook/test', asyncErrorWrapper(controller.testWebhook.bind(controller)));

    // GET /api/whatsapp/conversations - Lista conversas do tenant
    app.get('/api/whatsapp/conversations', asyncErrorWrapper(controller.listConversations.bind(controller)));

    // GET /api/whatsapp/conversations/:id - Detalhe da conversa + mensagens
    app.get('/api/whatsapp/conversations/:id',
        validateRequest(whatsappSchemas.getConversation),
        asyncErrorWrapper(controller.getConversation.bind(controller))
    );

    // POST /api/whatsapp/conversations/:id/copilot - Toggle Copiloto
    app.post('/api/whatsapp/conversations/:id/copilot', asyncErrorWrapper(controller.toggleCopilot.bind(controller)));

    // GET /api/whatsapp/summaries - Lista resumos do tenant
    app.get('/api/whatsapp/summaries', asyncErrorWrapper(controller.listSummaries.bind(controller)));

    // POST /api/whatsapp/summaries/:conversationId/generate - Gera/Atualiza resumo
    app.post('/api/whatsapp/summaries/:conversationId/generate', asyncErrorWrapper(controller.generateSummary.bind(controller)));

    // GET /api/whatsapp/kanban - Lista leads agrupados por stage
    app.get('/api/whatsapp/kanban', asyncErrorWrapper(controller.listKanban.bind(controller)));

    // POST /api/whatsapp/leads/:id/move - Move lead para outro stage
    app.post('/api/whatsapp/leads/:id/move',
        validateRequest(whatsappSchemas.moveLead),
        asyncErrorWrapper(controller.moveLead.bind(controller))
    );

    // GET /api/whatsapp/leads - Lista todos os leads
    app.get('/api/whatsapp/leads', asyncErrorWrapper(controller.listLeads.bind(controller)));

    // GET /api/whatsapp/audio-inbox - Lista áudios com transcrição
    app.get('/api/whatsapp/audio-inbox', asyncErrorWrapper(controller.listAudioInbox.bind(controller)));

    // POST /api/whatsapp/audio/:id/transcribe - Dispara transcrição de áudio
    app.post('/api/whatsapp/audio/:id/transcribe', asyncErrorWrapper(controller.transcribeAudio.bind(controller)));

    // GET /api/briefings/rules - Lista regras de briefing
    app.get('/api/briefings/rules', asyncErrorWrapper(controller.listBriefingRules.bind(controller)));

    // POST /api/briefings/rules - Criar/atualizar regra de briefing
    app.post('/api/briefings/rules', asyncErrorWrapper(controller.saveBriefingRule.bind(controller)));

    // POST /api/briefings/run - Executar briefing manualmente
    app.post('/api/briefings/run',
        validateRequest(whatsappSchemas.runBriefing),
        asyncErrorWrapper(controller.runBriefing.bind(controller))
    );

    // GET /api/whatsapp/kpis - Retorna KPIs agregados
    app.get('/api/whatsapp/kpis', asyncErrorWrapper(controller.getKPIs.bind(controller)));
}

// ==========================================================
// INTEGRATION MANAGEMENT ENDPOINTS (for Hub de Integrações)
// ==========================================================

export function setupWhatsAppIntegrationRoutes(app: Express) {
    // GET /api/integrations/whatsapp/status - Retorna status da integração do tenant
    app.get('/api/integrations/whatsapp/status',
        validateRequest(whatsappSchemas.integrationStatus),
        asyncErrorWrapper(controller.getIntegrationStatus.bind(controller))
    );

    // POST /api/integrations/whatsapp/save-manual - Salva credenciais manuais
    app.post('/api/integrations/whatsapp/save-manual',
        validateRequest(whatsappSchemas.saveManualConfig),
        asyncErrorWrapper(controller.saveManualConfig.bind(controller))
    );

    // POST /api/integrations/whatsapp/test-webhook - Testa webhook
    app.post('/api/integrations/whatsapp/test-webhook',
        validateRequest(whatsappSchemas.testWebhookIntegration),
        asyncErrorWrapper(controller.testWebhookIntegration.bind(controller))
    );

    // POST /api/integrations/whatsapp/reconnect - Reconecta integração
    app.post('/api/integrations/whatsapp/reconnect',
        validateRequest(whatsappSchemas.testWebhookIntegration), // Reutiliza schema de tenant_id
        asyncErrorWrapper(controller.reconnectIntegration.bind(controller))
    );

    // GET /api/integrations/whatsapp/logs - Lista logs de eventos
    app.get('/api/integrations/whatsapp/logs',
        validateRequest(whatsappSchemas.integrationLogs),
        asyncErrorWrapper(controller.listIntegrationLogs.bind(controller))
    );
}

