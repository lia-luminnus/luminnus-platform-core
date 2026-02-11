/**
 * Twilio Admin Routes
 * Endpoints de administração para monitoramento do ecossistema Twilio.
 *
 * Namespace: /api/admin/twilio/*
 * Protegido por adminGate middleware.
 */

import { Router, Request, Response } from 'express';
import { adminGate, getAdminContext } from '../middleware/adminGate.js';
import { TwilioOnboardingService } from '../services/twilioOnboardingService.js';
import { TwilioRepository } from '../repositories/TwilioRepository.js';
import { testEncryption } from '../services/twilioEncryption.js';

const router: Router = Router();

// ==========================================================
// HEALTH & BALANCE
// ==========================================================

/**
 * GET /api/admin/twilio/health
 * Health check da conta master Twilio.
 */
router.get('/health', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const health = await TwilioOnboardingService.healthCheck();

        res.json({
            ok: true,
            data: {
                ...health,
                encryption_ok: testEncryption(),
                timestamp: new Date().toISOString(),
            },
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error('❌ [Twilio Admin] Health check erro:', error);
        res.status(500).json({
            ok: false,
            error: error.message,
            trace_id: ctx?.traceId,
        });
    }
});

/**
 * GET /api/admin/twilio/balance
 * Saldo da conta master Twilio.
 */
router.get('/balance', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const balance = await TwilioOnboardingService.getMasterBalance();

        res.json({
            ok: true,
            data: {
                ...balance,
                account_sid: process.env.TWILIO_ACCOUNT_SID || 'N/A',
                timestamp: new Date().toISOString(),
            },
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error('❌ [Twilio Admin] Balance erro:', error);
        res.status(500).json({
            ok: false,
            error: error.message,
            trace_id: ctx?.traceId,
        });
    }
});

// ==========================================================
// TOP CONSUMERS & MONITORING
// ==========================================================

/**
 * GET /api/admin/twilio/top-consumers
 * Subcontas com maior volume de mensagens nas últimas N horas.
 *
 * Query: hours (default: 24), limit (default: 10)
 */
router.get('/top-consumers', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const hours = parseInt(req.query.hours as string) || 24;
        const limit = parseInt(req.query.limit as string) || 10;

        const consumers = await TwilioOnboardingService.getTopConsumers(hours, limit);

        res.json({
            ok: true,
            data: {
                consumers,
                count: consumers.length,
                period_hours: hours,
                timestamp: new Date().toISOString(),
            },
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error('❌ [Twilio Admin] Top consumers erro:', error);
        res.status(500).json({
            ok: false,
            error: error.message,
            trace_id: ctx?.traceId,
        });
    }
});

// ==========================================================
// SUBACCOUNTS LIST
// ==========================================================

/**
 * GET /api/admin/twilio/subaccounts
 * Listar todas subcontas Twilio.
 *
 * Query: status (filter), limit, offset
 */
router.get('/subaccounts', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const { subaccounts, count } = await TwilioRepository.listAll({
            status: req.query.status as any,
            limit: parseInt(req.query.limit as string) || 50,
            offset: parseInt(req.query.offset as string) || 0,
        });

        // Mascarar dados sensíveis
        const safeSubaccounts = subaccounts.map((sub) => ({
            id: sub.id,
            tenant_id: sub.tenant_id,
            twilio_account_sid: sub.twilio_account_sid,
            phone_number: sub.twilio_phone_number,
            friendly_name: sub.friendly_name,
            onboarding_status: sub.onboarding_status,
            onboarding_flow: sub.onboarding_flow,
            billing_mode: sub.billing_mode,
            webhook_configured: !!sub.webhook_configured_at,
            activated_at: sub.activated_at,
            created_at: sub.created_at,
            error: sub.onboarding_error,
        }));

        res.json({
            ok: true,
            data: {
                subaccounts: safeSubaccounts,
                total: count,
            },
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error('❌ [Twilio Admin] Subaccounts erro:', error);
        res.status(500).json({
            ok: false,
            error: error.message,
            trace_id: ctx?.traceId,
        });
    }
});

// ==========================================================
// OVERVIEW (AGGREGATED STATS)
// ==========================================================

/**
 * GET /api/admin/twilio/overview
 * Visão geral do ecossistema Twilio.
 */
router.get('/overview', adminGate, async (req: Request, res: Response) => {
    const ctx = getAdminContext(req);

    try {
        const [
            activeCount,
            { subaccounts: allSubs, count: totalCount },
            health,
        ] = await Promise.all([
            TwilioRepository.countActive(),
            TwilioRepository.listAll({ limit: 100 }),
            TwilioOnboardingService.healthCheck().catch(() => null),
        ]);

        const failedCount = allSubs.filter((s) => s.onboarding_status === 'failed').length;
        const suspendedCount = allSubs.filter((s) => s.onboarding_status === 'suspended').length;
        const provisioningCount = allSubs.filter(
            (s) => !['active', 'failed', 'suspended'].includes(s.onboarding_status)
        ).length;

        res.json({
            ok: true,
            data: {
                total_subaccounts: totalCount,
                active: activeCount,
                failed: failedCount,
                suspended: suspendedCount,
                provisioning: provisioningCount,
                master_healthy: health?.healthy ?? false,
                master_balance: health?.balance || null,
                encryption_ok: testEncryption(),
                timestamp: new Date().toISOString(),
            },
            trace_id: ctx?.traceId,
        });
    } catch (error: any) {
        console.error('❌ [Twilio Admin] Overview erro:', error);
        res.status(500).json({
            ok: false,
            error: error.message,
            trace_id: ctx?.traceId,
        });
    }
});

export default router;
