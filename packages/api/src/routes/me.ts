import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { getEntitlements } from '../middleware/entitlements.js';

export const meRouter: Router = Router();

meRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { user, company, plan } = req;

        if (!user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get entitlements for the user's company plan
        const entitlements = company && plan
            ? await getEntitlements(plan.id)
            : [];

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url
            },
            company: company ? {
                id: company.id,
                name: company.name,
                plan_id: company.plan_id
            } : null,
            plan: plan ? {
                id: plan.id,
                name: plan.name,
                modes: plan.modes
            } : null,
            entitlements
        });
    } catch (error) {
        console.error('[/api/me] Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
