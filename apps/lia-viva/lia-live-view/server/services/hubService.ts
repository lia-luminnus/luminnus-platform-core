import { supabase } from '../config/supabase.js';

export class HubService {

    // --- Keys Management ---
    static async generateKey(tenantId: string, name: string) {
        const apiKey = `ssk_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

        if (!supabase) throw new Error('Supabase não disponível');

        const { data, error } = await supabase
            .from('hub_keys')
            .insert([{ tenant_id: tenantId, name, api_key: apiKey }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async listKeys(tenantId: string) {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('hub_keys')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async revokeKey(tenantId: string, id: string) {
        if (!supabase) throw new Error('Supabase não disponível');

        const { error } = await supabase
            .from('hub_keys')
            .update({ status: 'revoked' })
            .eq('id', id)
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return true;
    }

    // --- Webhooks Management ---
    static async createWebhook(tenantId: string, url: string, events: string[]) {
        const secret = `whs_${Math.random().toString(36).substring(2)}`;

        if (!supabase) throw new Error('Supabase não disponível');

        const { data, error } = await supabase
            .from('hub_webhooks')
            .insert([{ tenant_id: tenantId, url, events, secret }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async listWebhooks(tenantId: string) {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('hub_webhooks')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    // --- Endpoints Management ---
    static async saveEndpoint(tenantId: string, endpoint: any) {
        if (!supabase) throw new Error('Supabase não disponível');

        const { data, error } = await supabase
            .from('hub_endpoints')
            .upsert([{ ...endpoint, tenant_id: tenantId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async listEndpoints(tenantId: string) {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('hub_endpoints')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    // --- Mappings Management ---
    static async saveMapping(tenantId: string, modelType: string, rules: any) {
        if (!supabase) throw new Error('Supabase não disponível');

        const { data, error } = await supabase
            .from('hub_mappings')
            .upsert([{
                tenant_id: tenantId,
                model_type: modelType,
                mapping_rules: rules,
                updated_at: new Date().toISOString()
            }], {
                onConflict: 'tenant_id,model_type'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async getMappings(tenantId: string) {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('hub_mappings')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    // --- Logs ---
    static async listLogs(tenantId: string, limit = 50) {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('hub_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
}
