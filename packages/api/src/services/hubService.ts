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

    // --- Synchronization & Ingestion ---
    static async findKeyByToken(token: string) {
        const { data, error } = await supabase
            .from('hub_keys')
            .select('*')
            .eq('api_key', token)
            .eq('status', 'active')
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    static async processSync(tenantId: string, type: string, externalData: any) {
        try {
            // 1. Log the incoming sync request
            const { data: logEntry, error: logError } = await supabase
                .from('hub_logs')
                .insert([{
                    tenant_id: tenantId,
                    source: 'webhook',
                    event_type: `sync_${type}`,
                    payload: externalData,
                    status: 'pending'
                }])
                .select()
                .single();

            if (logError) throw logError;

            // 2. Resolve Mapping (Optional: check if there's a custom mapping)
            const { data: mapping } = await supabase
                .from('hub_mappings')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('model_type', type)
                .maybeSingle();

            const finalData = mapping ? this.normalizeData(externalData, mapping) : externalData;

            // 3. Update Database based on type
            let result;
            if (type === 'product' || type === 'products') {
                const products = Array.isArray(finalData) ? finalData : [finalData];
                const dbData = products.map(p => ({
                    ...p,
                    tenant_id: tenantId,
                    updated_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from('products')
                    .upsert(dbData, { onConflict: 'id' });
                if (error) throw error;
                result = { count: dbData.length };
            } else if (type === 'property' || type === 'properties') {
                const properties = Array.isArray(finalData) ? finalData : [finalData];
                const dbData = properties.map(p => ({
                    ...p,
                    tenant_id: tenantId,
                    updated_at: new Date().toISOString()
                }));

                const { error } = await supabase
                    .from('properties')
                    .upsert(dbData, { onConflict: 'id' });
                if (error) throw error;
                result = { count: dbData.length };
            }

            // 4. Update Log status
            await supabase
                .from('hub_logs')
                .update({ status: 'success' })
                .eq('id', logEntry.id);

            return { success: true, result };

        } catch (error: any) {
            console.error(`❌ [HubService] Sync Error:`, error.message);
            return { success: false, error: error.message };
        }
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
