import { Router, Request, Response } from 'express';
import { CreditService, CREDIT_COSTS, PLAN_CREDITS } from '../services/creditService.js';

/**
 * Credits API Routes
 * 
 * GET  /api/credits/balance?tenantId=...        — Saldo atual
 * GET  /api/credits/transactions?tenantId=...    — Histórico de transações
 * GET  /api/credits/packages                     — Pacotes de recarga
 * GET  /api/credits/costs                        — Tabela de custos por ação
 * POST /api/credits/recharge                     — Aplicar recarga (webhook Stripe)
 */
export function setupCreditsRoutes(app: any) {
    const router = Router();

    // ============================================================
    // GET /api/credits/balance — Saldo de créditos do tenant
    // ============================================================
    router.get('/balance', async (req: Request, res: Response) => {
        try {
            const tenantId = req.query.tenantId as string;
            const userId = req.query.userId as string;

            if (!tenantId && !userId) {
                return res.status(400).json({ error: 'tenantId ou userId obrigatório' });
            }

            // Resolver tenantId se não fornecido
            const resolvedTenantId = tenantId || await CreditService.resolveTenantId(userId);
            if (!resolvedTenantId) {
                return res.status(404).json({ error: 'Tenant não encontrado' });
            }

            const balance = await CreditService.getBalance(resolvedTenantId);
            if (!balance) {
                return res.status(500).json({ error: 'Erro ao obter saldo' });
            }

            res.json(balance);
        } catch (error: any) {
            console.error('❌ [Credits API] Erro /balance:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // ============================================================
    // GET /api/credits/transactions — Histórico de transações
    // ============================================================
    router.get('/transactions', async (req: Request, res: Response) => {
        try {
            const tenantId = req.query.tenantId as string;
            const userId = req.query.userId as string;
            const limit = parseInt(req.query.limit as string) || 20;

            if (!tenantId && !userId) {
                return res.status(400).json({ error: 'tenantId ou userId obrigatório' });
            }

            const resolvedTenantId = tenantId || await CreditService.resolveTenantId(userId);
            if (!resolvedTenantId) {
                return res.status(404).json({ error: 'Tenant não encontrado' });
            }

            const transactions = await CreditService.getTransactions(resolvedTenantId, limit);
            res.json({ transactions });
        } catch (error: any) {
            console.error('❌ [Credits API] Erro /transactions:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // ============================================================
    // GET /api/credits/packages — Pacotes de recarga disponíveis
    // ============================================================
    router.get('/packages', async (_req: Request, res: Response) => {
        try {
            const packages = await CreditService.getPackages();
            res.json({ packages });
        } catch (error: any) {
            console.error('❌ [Credits API] Erro /packages:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    // ============================================================
    // GET /api/credits/costs — Tabela de custos por ação
    // ============================================================
    router.get('/costs', (_req: Request, res: Response) => {
        res.json({
            costs: CREDIT_COSTS,
            plans: PLAN_CREDITS,
        });
    });

    // ============================================================
    // POST /api/credits/recharge — Aplicar recarga manualmente
    // (em produção será chamado pelo webhook Stripe)
    // ============================================================
    router.post('/recharge', async (req: Request, res: Response) => {
        try {
            const { tenantId, userId, credits, packageName, metadata } = req.body;

            if (!tenantId || !userId || !credits) {
                return res.status(400).json({ error: 'tenantId, userId e credits obrigatórios' });
            }

            const result = await CreditService.addRecharge(
                tenantId,
                userId,
                credits,
                packageName || 'Recarga Manual',
                metadata
            );

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error: any) {
            console.error('❌ [Credits API] Erro /recharge:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    });

    app.use('/api/credits', router);
    console.log('   ✅ Credits routes (/api/credits)');
}
