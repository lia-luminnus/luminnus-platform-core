/**
 * Twilio Onboarding Routes
 * Gerencia o ciclo de vida de subcontas Twilio para multi-tenancy
 *
 * Namespace: /api/twilio/*
 */

import { Router, Request, Response } from 'express';
import { TwilioOnboardingService } from '../services/twilioOnboardingService.js';
import { TwilioRepository } from '../repositories/TwilioRepository.js';
import type {
    OnboardNewNumberRequest,
    OnboardByonRequest,
    SearchNumbersRequest,
} from '../types/twilio.types.js';

const router: Router = Router();

// ==========================================================
// ONBOARDING FLOW A: NÚMERO NOVO
// ==========================================================

/**
 * POST /api/twilio/onboard/new-number
 * Inicia o fluxo completo de provisioning com número novo.
 *
 * Body: { tenant_id, country_code, billing_mode?, friendly_name? }
 */
router.post('/onboard/new-number', async (req: Request, res: Response) => {
    try {
        const { tenant_id, country_code, billing_mode, friendly_name } = req.body as OnboardNewNumberRequest;

        if (!tenant_id || !country_code) {
            return res.status(400).json({
                ok: false,
                error: 'tenant_id e country_code são obrigatórios',
            });
        }

        // Verificar se já existe subconta ativa
        const existing = await TwilioRepository.getByTenantId(tenant_id);
        if (existing && existing.onboarding_status === 'active') {
            return res.status(409).json({
                ok: false,
                error: 'Tenant já possui subconta Twilio ativa',
                data: {
                    status: existing.onboarding_status,
                    phone: existing.twilio_phone_number,
                },
            });
        }

        console.log(`🚀 [Twilio Onboarding] Iniciando provisioning para ${tenant_id} (${country_code})`);

        // Executar provisioning (async mas esperamos resultado)
        const result = await TwilioOnboardingService.provisionNewNumber(
            tenant_id,
            country_code,
            { friendlyName: friendly_name, billingMode: billing_mode }
        );

        if (result.success) {
            res.json({
                ok: true,
                data: {
                    subaccount_sid: result.subaccountSid,
                    phone_number: result.phoneNumber,
                    webhook_url: result.webhookUrl,
                    steps: result.steps,
                },
            });
        } else {
            res.status(500).json({
                ok: false,
                error: result.error,
                steps: result.steps,
            });
        }
    } catch (error: any) {
        console.error('❌ [Twilio Onboarding] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ==========================================================
// ONBOARDING FLOW B: BYON (Bring Your Own Number)
// ==========================================================

/**
 * POST /api/twilio/onboard/byon/start
 * Inicia o fluxo BYON — cria subconta e aguarda associação do número.
 *
 * Body: { tenant_id, billing_mode?, friendly_name? }
 */
router.post('/onboard/byon/start', async (req: Request, res: Response) => {
    try {
        const { tenant_id, billing_mode, friendly_name } = req.body as OnboardByonRequest;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        console.log(`📱 [Twilio BYON] Iniciando para ${tenant_id}`);

        const result = await TwilioOnboardingService.initByonFlow(tenant_id, {
            friendlyName: friendly_name,
            billingMode: billing_mode,
        });

        if (result.success) {
            res.json({
                ok: true,
                data: {
                    subaccount_sid: result.subaccountSid,
                    message: result.message,
                    next_step: 'Associate your number via the callback endpoint',
                },
            });
        } else {
            res.status(500).json({ ok: false, error: result.error });
        }
    } catch (error: any) {
        console.error('❌ [Twilio BYON Start] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/twilio/onboard/byon/callback
 * Callback para finalizar o BYON — recebe o número associado.
 *
 * Body: { tenant_id, phone_number, phone_sid? }
 */
router.post('/onboard/byon/callback', async (req: Request, res: Response) => {
    try {
        const {
            tenant_id,
            phone_number,
            phone_sid,
            meta_waba_id,
            meta_phone_number_id,
            meta_business_id
        } = req.body;

        if (!tenant_id || !phone_number) {
            return res.status(400).json({
                ok: false,
                error: 'tenant_id e phone_number são obrigatórios',
            });
        }

        console.log(`📞 [Twilio BYON Callback] Tenant: ${tenant_id}, Phone: ${phone_number}`);

        await TwilioOnboardingService.handleByonCallback(
            tenant_id,
            phone_number,
            phone_sid,
            {
                metaWabaId: meta_waba_id,
                metaPhoneNumberId: meta_phone_number_id,
                metaBusinessId: meta_business_id
            }
        );

        res.json({
            ok: true,
            data: {
                status: 'active',
                phone_number,
            },
        });
    } catch (error: any) {
        console.error('❌ [Twilio BYON Callback] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ==========================================================
// NUMBER MANAGEMENT
// ==========================================================

/**
 * GET /api/twilio/numbers/search
 * Buscar números disponíveis para compra.
 *
 * Query: country_code (obrigatório), area_code, contains, limit
 */
router.get('/numbers/search', async (req: Request, res: Response) => {
    try {
        const country_code = req.query.country_code as string;

        if (!country_code) {
            return res.status(400).json({ ok: false, error: 'country_code é obrigatório' });
        }

        const numbers = await TwilioOnboardingService.searchAvailableNumbers({
            countryCode: country_code,
            areaCode: req.query.area_code as string,
            contains: req.query.contains as string,
            smsEnabled: true,
            limit: parseInt(req.query.limit as string) || 10,
        });

        res.json({
            ok: true,
            data: {
                numbers,
                count: numbers.length,
                country: country_code,
            },
        });
    } catch (error: any) {
        console.error('❌ [Twilio Numbers] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ==========================================================
// SUBACCOUNT STATUS
// ==========================================================

/**
 * GET /api/twilio/subaccount/status
 * Obter status do onboarding de um tenant.
 *
 * Query: tenant_id (obrigatório)
 */
router.get('/subaccount/status', async (req: Request, res: Response) => {
    try {
        const tenant_id = req.query.tenant_id as string;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        const sub = await TwilioRepository.getByTenantId(tenant_id);

        if (!sub) {
            return res.json({
                ok: true,
                data: {
                    has_subaccount: false,
                    tenant_id,
                },
            });
        }

        res.json({
            ok: true,
            data: {
                has_subaccount: true,
                tenant_id: sub.tenant_id,
                onboarding_status: sub.onboarding_status,
                onboarding_flow: sub.onboarding_flow,
                phone_number: sub.twilio_phone_number,
                billing_mode: sub.billing_mode,
                webhook_configured: !!sub.webhook_configured_at,
                activated_at: sub.activated_at,
                error: sub.onboarding_error,
                steps: sub.onboarding_steps_json,
            },
        });
    } catch (error: any) {
        console.error('❌ [Twilio Status] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ==========================================================
// SUBACCOUNT ACTIONS
// ==========================================================

/**
 * POST /api/twilio/subaccount/suspend
 * Suspender subconta de um tenant.
 *
 * Body: { tenant_id }
 */
router.post('/subaccount/suspend', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        await TwilioOnboardingService.suspendSubaccount(tenant_id);

        res.json({ ok: true, data: { status: 'suspended' } });
    } catch (error: any) {
        console.error('❌ [Twilio Suspend] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/twilio/subaccount/reactivate
 * Reativar subconta suspensa.
 *
 * Body: { tenant_id }
 */
router.post('/subaccount/reactivate', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        await TwilioOnboardingService.reactivateSubaccount(tenant_id);

        res.json({ ok: true, data: { status: 'active' } });
    } catch (error: any) {
        console.error('❌ [Twilio Reactivate] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/twilio/subaccount/disconnect
 * Desconectar subconta de um tenant (fecha na Twilio + marca como closed no DB).
 * Permite reconectar com outro número no futuro.
 *
 * Body: { tenant_id }
 */
router.post('/subaccount/disconnect', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        await TwilioOnboardingService.disconnectSubaccount(tenant_id);

        res.json({ ok: true, data: { status: 'closed' } });
    } catch (error: any) {
        console.error('❌ [Twilio Disconnect] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

/**
 * POST /api/twilio/subaccount/sync
 * Sincroniza automaticamente os dados técnicos (Phone SID) da subconta.
 *
 * Body: { tenant_id }
 */
router.post('/subaccount/sync', async (req: Request, res: Response) => {
    try {
        const { tenant_id } = req.body;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        await TwilioOnboardingService.syncNumberStatus(tenant_id);

        res.json({ ok: true, message: 'Sincronização concluída' });
    } catch (error: any) {
        console.error('❌ [Twilio Sync] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ==========================================================
// ONBOARDING LOGS
// ==========================================================

/**
 * GET /api/twilio/logs
 * Buscar logs de onboarding de um tenant.
 *
 * Query: tenant_id (obrigatório), limit?
 */
router.get('/logs', async (req: Request, res: Response) => {
    try {
        const tenant_id = req.query.tenant_id as string;
        const limit = parseInt(req.query.limit as string) || 50;

        if (!tenant_id) {
            return res.status(400).json({ ok: false, error: 'tenant_id é obrigatório' });
        }

        const logs = await TwilioRepository.getLogs(tenant_id, limit);

        res.json({ ok: true, data: { logs, count: logs.length } });
    } catch (error: any) {
        console.error('❌ [Twilio Logs] Erro:', error);
        res.status(500).json({ ok: false, error: error.message });
    }
});

// ==========================================================
// EXPORT SETUP
// ==========================================================


export function setupTwilioOnboardingRoutes(app: any): void {
    app.use('/api/twilio', router);
    console.log('✅ [Routes] Twilio Onboarding routes registered at /api/twilio/*');
}

export default router;
