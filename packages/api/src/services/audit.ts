import { createClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
    user_id: string;
    company_id: string;
    action: string;
    resource: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
}

// Actions that should be audited
export const AUDIT_ACTIONS = {
    // Auth
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    PASSWORD_CHANGE: 'auth.password_change',

    // Plans
    PLAN_UPGRADE: 'plan.upgrade',
    PLAN_DOWNGRADE: 'plan.downgrade',

    // Files
    FILE_UPLOAD: 'file.upload',
    FILE_DELETE: 'file.delete',

    // Config
    CONFIG_CHANGE: 'config.change',

    // Members
    MEMBER_INVITE: 'member.invite',
    MEMBER_REMOVE: 'member.remove',
    MEMBER_ROLE_CHANGE: 'member.role_change',

    // LIA
    LIA_SESSION_START: 'lia.session_start',
    LIA_TOOL_INVOKE: 'lia.tool_invoke',

    // Data
    DATA_EXPORT: 'data.export',
    DATA_DELETE: 'data.delete'
} as const;

/**
 * Audit service for logging sensitive actions
 */
export class AuditService {
    private supabase: any;

    private getSupabase() {
        if (this.supabase) return this.supabase;

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.warn('[AuditService] Supabase credentials missing.');
            return null;
        }

        this.supabase = createClient(url, key);
        return this.supabase;
    }

    constructor() {
        // Inicialização lazy agora
    }

    /**
     * Log an action to the audit log
     */
    async logAction(entry: AuditLogEntry): Promise<void> {
        const logEntry = {
            ...entry,
            timestamp: new Date().toISOString()
        };

        // Always log to console in development
        if (process.env.NODE_ENV === 'development') {
            const safeLog = { ...logEntry };
            console.log('[AUDIT]', JSON.stringify(safeLog, null, 2));
        }

        const supabase = this.getSupabase();
        // Persist to database if available
        if (supabase) {
            try {
                await supabase.from('audit_logs').insert({
                    user_id: entry.user_id,
                    company_id: entry.company_id,
                    action: entry.action,
                    resource: entry.resource,
                    details: entry.details || {},
                    ip_address: entry.ip_address,
                    user_agent: entry.user_agent,
                    created_at: new Date().toISOString()
                });
            } catch (error) {
                console.error('[AuditService] Failed to log action:', error);
            }
        }
    }

    /**
     * Get audit log entries for a company
     */
    async getCompanyLogs(
        companyId: string,
        options: { limit?: number; offset?: number; action?: string } = {}
    ) {
        const supabase = this.getSupabase();
        if (!supabase) {
            return { data: [], error: 'Database not configured' };
        }

        const { limit = 50, offset = 0, action } = options;

        let query = supabase
            .from('audit_logs')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (action) {
            query = query.eq('action', action);
        }

        return query;
    }
}

// Singleton instance
export const auditService = new AuditService();
