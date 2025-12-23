import { createClient } from '@supabase/supabase-js';

// Plan entitlements configuration
// This maps plan IDs to their entitled features
const PLAN_ENTITLEMENTS: Record<string, string[]> = {
    start: ['chat', 'basic_calendar'],
    plus: ['chat', 'multimodal', 'files', 'calendar', 'reports'],
    pro: [
        'chat',
        'multimodal',
        'live',
        'files',
        'calendar',
        'reports',
        'automations',
        'advanced_reports',
        'api_access'
    ]
};

/**
 * Get entitlements for a given plan
 * First tries to fetch from database, falls back to static config
 */
export async function getEntitlements(planId: string): Promise<string[]> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // Fallback to static entitlements
        return PLAN_ENTITLEMENTS[planId.toLowerCase()] || [];
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: entitlements, error } = await supabase
            .from('entitlements')
            .select('feature')
            .eq('plan_id', planId);

        if (error || !entitlements?.length) {
            // Fallback to static entitlements
            return PLAN_ENTITLEMENTS[planId.toLowerCase()] || [];
        }

        return entitlements.map(e => e.feature);
    } catch {
        return PLAN_ENTITLEMENTS[planId.toLowerCase()] || [];
    }
}

/**
 * Check if a user has a specific entitlement
 */
export function hasEntitlement(entitlements: string[], feature: string): boolean {
    return entitlements.includes(feature);
}

/**
 * Middleware factory to require specific entitlements
 */
export function requireEntitlement(...features: string[]) {
    return (req: any, res: any, next: any) => {
        const userEntitlements = req.entitlements || [];

        const hasAll = features.every(f => userEntitlements.includes(f));

        if (!hasAll) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: features,
                upgrade_url: '/pricing'
            });
        }

        next();
    };
}
