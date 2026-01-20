import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface HubKey {
    id: string;
    tenant_id: string;
    name: string;
    api_key: string;
    status: 'active' | 'revoked';
    created_at: string;
}

export interface HubWebhook {
    id: string;
    tenant_id: string;
    url: string;
    events: string[];
    secret: string;
    status: 'active' | 'disabled';
}

export interface HubEndpoint {
    id: string;
    tenant_id: string;
    name: string;
    base_url: string;
    auth_type: 'none' | 'api_key' | 'bearer' | 'basic';
    auth_config: any;
    resources: string[];
}

export interface HubMapping {
    id: string;
    tenant_id: string;
    model_type: 'lead' | 'customer' | 'order' | 'appointment' | 'ticket';
    mapping_rules: Record<string, string>;
}

export class HubService {

    // --- Keys Management ---
    static async generateKey(tenantId: string, name: string) {
        const apiKey = `ssk_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
        const { data, error } = await supabase
            .from('hub_keys')
            .insert([{ tenant_id: tenantId, name, api_key: apiKey }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async listKeys(tenantId: string) {
        const { data, error } = await supabase
            .from('hub_keys')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    static async revokeKey(tenantId: string, id: string) {
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
        const { data, error } = await supabase
            .from('hub_webhooks')
            .insert([{ tenant_id: tenantId, url, events, secret }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async listWebhooks(tenantId: string) {
        const { data, error } = await supabase
            .from('hub_webhooks')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    // --- Endpoints Management ---
    static async saveEndpoint(tenantId: string, endpoint: Partial<HubEndpoint>) {
        const { data, error } = await supabase
            .from('hub_endpoints')
            .upsert([{ ...endpoint, tenant_id: tenantId }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    static async listEndpoints(tenantId: string) {
        const { data, error } = await supabase
            .from('hub_endpoints')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    // --- Mappings Management ---
    static async saveMapping(tenantId: string, modelType: string, rules: any) {
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
        const { data, error } = await supabase
            .from('hub_mappings')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data;
    }

    // --- Logs ---
    static async listLogs(tenantId: string, limit = 50) {
        const { data, error } = await supabase
            .from('hub_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    // --- Data Normalization Logic ---
    static normalizeData(externalData: any, mapping: HubMapping) {
        const normalized: any = {};
        const rules = mapping.mapping_rules;

        for (const [externalField, internalField] of Object.entries(rules)) {
            normalized[internalField] = externalData[externalField];
        }

        return normalized;
    }
}
