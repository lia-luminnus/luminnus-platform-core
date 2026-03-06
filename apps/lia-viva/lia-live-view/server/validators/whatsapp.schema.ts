import { z } from 'zod';

/**
 * v1.0: WhatsApp Module Validation Schemas
 */

export const whatsappSchemas = {
    // GET /api/whatsapp/settings
    getSettings: z.object({
        query: z.object({
            tenantId: z.string().uuid('Invalid tenantId format'),
            channel: z.string().optional()
        })
    }),

    // POST /api/whatsapp/settings
    saveSettings: z.object({
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
            channel: z.string().optional(),
            profile_json: z.record(z.any()).optional(),
            playbooks_json: z.array(z.any()).optional(),
            knowledge_items_json: z.array(z.any()).optional(),
            segment_key: z.string().optional()
        })
    }),

    // POST /api/whatsapp/config
    saveConfig: z.object({
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
            phone_number: z.string().min(5).max(20).optional(),
            config_json: z.object({
                phone_number_id: z.string(),
                whatsapp_business_account_id: z.string(),
                access_token: z.string()
            })
        })
    }),

    // POST /api/whatsapp/send
    sendMessage: z.object({
        body: z.object({
            tenantId: z.string().uuid('Invalid tenantId format'),
            to: z.string().min(5).max(30),
            text: z.string().min(1),
            conversationId: z.string().uuid().optional()
        })
    }),

    // POST /api/whatsapp/run-briefing
    runBriefing: z.object({
        body: z.object({
            rule_id: z.string().uuid('Invalid rule_id format'),
            tenant_id: z.string().uuid('Invalid tenant_id format')
        })
    }),

    // GET /api/whatsapp/conversations/:id
    getConversation: z.object({
        params: z.object({
            id: z.string().uuid('Invalid conversation id format')
        })
    }),

    // POST /api/whatsapp/move-lead/:id
    moveLead: z.object({
        params: z.object({
            id: z.string().uuid('Invalid lead id format')
        }),
        body: z.object({
            stage: z.enum(['NEW', 'QUALIFIED_BY_LIA', 'WAITING_HUMAN', 'SCHEDULED', 'WON', 'LOST']),
            notes: z.string().optional()
        })
    }),

    // GET /api/integrations/whatsapp/status
    integrationStatus: z.object({
        query: z.object({
            tenantId: z.string().uuid('Invalid tenantId format')
        })
    }),

    // POST /api/integrations/whatsapp/save-manual
    saveManualConfig: z.object({
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
            waba_id: z.string().min(1),
            phone_number_id: z.string().min(1),
            access_token: z.string().min(1),
            phone_e164: z.string().optional()
        })
    }),

    // POST /api/integrations/whatsapp/test-webhook
    testWebhookIntegration: z.object({
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format')
        })
    }),

    // GET /api/integrations/whatsapp/logs
    integrationLogs: z.object({
        query: z.object({
            tenantId: z.string().uuid('Invalid tenantId format'),
            limit: z.string().regex(/^\d+$/).transform(Number).optional()
        })
    })
};

