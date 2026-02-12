import { z } from 'zod';

/**
 * Twilio Module Validation Schemas
 * v1.0.0
 */

export const twilioSchemas = {
    // POST /api/twilio/onboard/new-number
    onboardNewNumber: z.object({
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
            country_code: z.string().length(2).default('BR'),
            friendly_name: z.string().optional(),
        }),
    }),

    // POST /api/twilio/onboard/byon/start
    onboardByonStart: z.object({
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
            friendly_name: z.string().optional(),
        }),
    }),

    // POST /api/twilio/subaccount/:action (suspend, reactivate)
    subaccountAction: z.object({
        params: z.object({
            action: z.enum(['suspend', 'reactivate']),
        }),
        body: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
        }),
    }),

    // GET /api/twilio/subaccount/status
    subaccountStatus: z.object({
        query: z.object({
            tenant_id: z.string().uuid('Invalid tenant_id format'),
        }),
    }),

    // GET /api/admin/twilio/subaccounts
    listSubaccounts: z.object({
        query: z.object({
            status: z.enum(['active', 'suspended', 'failed', 'provisioning']).optional(),
            limit: z.string().regex(/^\d+$/).transform(Number).default(50),
            offset: z.string().regex(/^\d+$/).transform(Number).default(0),
        }),
    }),

    // GET /api/admin/twilio/top-consumers
    topConsumers: z.object({
        query: z.object({
            hours: z.string().regex(/^\d+$/).transform(Number).default(24),
            limit: z.string().regex(/^\d+$/).transform(Number).default(10),
        }),
    }),
};
