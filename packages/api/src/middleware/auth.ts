import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
}

export interface Company {
    id: string;
    name: string;
    plan_id: string;
}

export interface Plan {
    id: string;
    name: string;
    modes: string[];
}

export interface AuthenticatedRequest extends Request {
    user?: User;
    company?: Company;
    plan?: Plan;
    entitlements?: string[];
}

/**
 * Authentication middleware
 * Resolves user from Supabase auth token
 * Loads company and plan data
 */
export async function authMiddleware(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> {
    // 1. Fully public routes bypass
    if (req.path === '/health' || req.path === '/version') {
        return next();
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        // For development/testing without auth - return mock data if enabled
        if (process.env.NODE_ENV === 'development' && process.env.MOCK_AUTH === 'true') {
            req.user = { id: 'mock-user-id', email: 'dev@luminnus.com.br', name: 'Dev User' };
            req.company = { id: 'mock-company-id', name: 'Luminnus Dev', plan_id: 'pro' };
            req.plan = { id: 'pro', name: 'Pro', modes: ['chat', 'multimodal', 'live'] };
            return next();
        }

        res.status(401).json({ error: 'Falta o token de autorização (Bearer)' });
        return;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseKey && process.env.NODE_ENV === 'development') {
        supabaseKey = process.env.SUPABASE_ANON_KEY;
    }

    if (!supabaseUrl || !supabaseKey) {
        res.status(500).json({ error: 'Configuração de servidor incompleta (Supabase)' });
        return;
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Verify token and get user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !authUser) {
            res.status(401).json({ error: 'Sessão inválida ou expirada' });
            return;
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

        req.user = {
            id: authUser.id,
            email: authUser.email || '',
            name: profile?.name || authUser.email?.split('@')[0] || 'User',
            avatar_url: profile?.avatar_url
        };

        // Get user's company membership
        const { data: membership } = await (supabase as any)
            .from('memberships')
            .select(`
                company_id,
                role,
                companies (
                    id,
                    name,
                    plan_id,
                    plans (
                        id,
                        name,
                        modes
                    )
                )
            `)
            .eq('user_id', authUser.id)
            .single();

        if (membership?.companies) {
            const company = membership.companies as any;
            req.company = {
                id: company.id,
                name: company.name,
                plan_id: company.plan_id
            };

            if (company.plans) {
                req.plan = {
                    id: company.plans.id,
                    name: company.plans.name,
                    modes: company.plans.modes || []
                };
            }
        }

        next();
    } catch (error) {
        console.error('[authMiddleware] Erro:', error);
        res.status(500).json({ error: 'Falha interna na autenticação' });
    }
}
