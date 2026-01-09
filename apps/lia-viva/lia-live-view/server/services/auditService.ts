import { supabase } from '../config/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Eventos de auditoria suportados pela especificação v1.1
 */
export type AuditEvent =
    | 'file_ingested'
    | 'file_parsed'
    | 'execution_requested'
    | 'execution_success'
    | 'execution_failed'
    | 'permission_denied';

export class AuditService {
    /**
     * Registra um evento de auditoria no Supabase
     */
    static async log(userId: string, tenantId: string, provider: string, action: AuditEvent, status: 'success' | 'error' | 'denied', message?: string, metadata: any = {}) {
        const client = supabase as unknown as SupabaseClient;
        if (!client) {
            console.warn('[AuditService] Supabase not available, skipping log.');
            return;
        }

        try {
            const { error } = await client.from('integration_activity_log').insert({
                user_id: userId,
                tenant_id: tenantId,
                provider,
                action,
                status,
                message: message || `Ação ${action} realizada com ${status}`,
                metadata: metadata || {},
                created_at: new Date().toISOString()
            });


            if (error) {
                console.error('[AuditService] Failed to save log:', error);
            } else {
                console.log(`[AuditService] Event logged: ${action} (${status}) for user ${userId}`);
            }
        } catch (err) {
            console.error('[AuditService] Exception while logging:', err);
        }
    }
}
