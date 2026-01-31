import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { config } from '../config/env.js';

// Supabase admin client for token validation
const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// AUTHORIZED ROOT ADMIN IDs
const AUTHORIZED_ROOT_ADMINS = [
    '5d626893-2cdb-4a75-a84e-360713f65026', // Wendell's User ID
];

// Authorized emails as fallback
const AUTHORIZED_ADMIN_EMAILS = [
    'luminnus.lia.ai@gmail.com',
];

export interface AdminAuthContext {
    userId: string;
    email: string;
    isRootAdmin: boolean;
    traceId: string;
}

/**
 * Extract Bearer token from Authorization header
 */
function getBearer(raw?: string): string | null {
    if (!raw) return null;
    const v = raw.trim();
    if (v.toLowerCase().startsWith('bearer ')) return v.slice(7).trim();
    return v;
}

/**
 * Admin Gate Middleware
 * Validates root admin access and injects context into request
 */
export async function adminGate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const traceId = randomUUID().slice(0, 8);

    try {
        // Extract token from Authorization header
        const token = getBearer(req.headers.authorization);

        if (!token) {
            console.warn(`🔒 [AdminGate] Blocked: No token (trace_id: ${traceId})`);
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Validate token with Supabase
        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !data?.user) {
            console.warn(`🔒 [AdminGate] Blocked: Invalid token (trace_id: ${traceId})`);
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        const userId = data.user.id;
        const email = data.user.email || '';

        // Check if user is authorized root admin (Case-insensitive for emails)
        const isUserIdAuthorized = AUTHORIZED_ROOT_ADMINS.includes(userId);
        const isEmailAuthorized = AUTHORIZED_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());

        if (!isUserIdAuthorized && !isEmailAuthorized) {
            console.warn(`🔒 [AdminGate] Blocked: Not root admin (user: ${userId}, email: ${email}, trace_id: ${traceId})`);
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Build auth context
        const ctx: AdminAuthContext = {
            userId,
            email,
            isRootAdmin: true,
            traceId,
        };

        // Inject context into request
        (req as any).adminAuth = ctx;

        next();
    } catch (err) {
        console.error(`❌ [AdminGate] Error (trace_id: ${traceId}):`, err);
        res.status(403).json({ error: 'Forbidden' });
    }
}

/**
 * Helper to get admin context from request
 */
export function getAdminContext(req: Request): AdminAuthContext | null {
    return (req as any).adminAuth || null;
}
