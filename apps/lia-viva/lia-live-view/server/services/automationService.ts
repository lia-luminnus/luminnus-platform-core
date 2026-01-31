import { supabase } from '../config/supabase.js';

export interface Automation {
    id: string;
    tenant_id: string;
    user_id: string;
    name: string;
    description?: string;
    status: 'active' | 'paused' | 'error' | 'draft' | 'archived';
    trigger_type: 'schedule' | 'event' | 'keyword' | 'webhook' | 'manual';
    trigger_config: any;
    flow_definition: any;
    version: number;
    is_enabled: boolean;
    last_run_at?: string;
    next_run_at?: string;
    created_at: string;
    updated_at: string;
}

export class AutomationService {
    static async listAutomations(tenantId: string) {
        const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('tenant_id', tenantId)
            .neq('status', 'archived')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async getAutomation(id: string, tenantId: string) {
        const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();

        if (error) throw error;
        return data;
    }

    static async createAutomation(tenantId: string, userId: string | null, payload: Partial<Automation>) {
        // Validate limits
        await this.validateLimits(tenantId, 'max_automations');

        // Sanitize payload to remove non-column fields
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, userId: _ignoredUserId, ...cleanPayload } = payload as any;
        
        // Handle mock user for dev/test environment
        const finalUserId = (userId === '00000000-0000-0000-0000-000000000001') ? null : userId;

        const { data, error } = await supabase
            .from('automations')
            .insert([{
                ...cleanPayload,
                tenant_id: tenantId,
                user_id: finalUserId,
                status: payload.status || 'draft',
                version: 1
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async updateAutomation(id: string, tenantId: string, payload: Partial<Automation>) {
        const { data, error } = await supabase
            .from('automations')
            .update({
                ...payload,
                updated_at: new Date().toISOString(),
                version: payload.flow_definition ? { 'fn': 'increment', 'args': ['version'] } : undefined
            } as any)
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async deleteAutomation(id: string, tenantId: string) {
        const { error } = await supabase
            .from('automations')
            .update({ status: 'archived', is_enabled: false })
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { success: true };
    }

    static async validateLimits(tenantId: string, limitKey: 'max_automations' | 'max_runs_per_day') {
        // 1. Get company plan
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_level')
            .eq('id', tenantId)
            .single();
        
        const plan = profile?.plan_level || 'start';

        // 2. Get limits for plan
        const { data: limits } = await supabase
            .from('automation_limits')
            .select('*')
            .eq('plan', plan)
            .single();

        if (!limits) return;

        if (limitKey === 'max_automations') {
            const { count } = await supabase
                .from('automations')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .neq('status', 'archived');
            
            if (count && count >= limits.max_automations) {
                throw new Error(`Plan limit reached: Max ${limits.max_automations} automations allowed for ${plan} plan.`);
            }
        }

        // Add daily execution limits validation logic here if needed
    }

    static async getStats(tenantId: string) {
        const { data: automations } = await supabase
            .from('automations')
            .select('status')
            .eq('tenant_id', tenantId);

        const stats = {
            total: automations?.length || 0,
            active: automations?.filter(a => a.status === 'active').length || 0,
            error: automations?.filter(a => a.status === 'error').length || 0,
            paused: automations?.filter(a => a.status === 'paused').length || 0,
        };

        return stats;
    }
}
