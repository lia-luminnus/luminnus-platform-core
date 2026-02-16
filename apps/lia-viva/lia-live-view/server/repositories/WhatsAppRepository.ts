import { supabase } from '../config/supabase.js';

/**
 * v1.0: WhatsApp Repository
 * Encapsula todas as interações com o Supabase para o ecossistema WhatsApp
 */
export const WhatsAppRepository = {
    // --- Settings ---
    async getSettings(tenantId: string) {
        const { data, error } = await supabase
            .from('whatsapp_agent_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    },

    async upsertSettings(settings: any) {
        const { data, error } = await supabase
            .from('whatsapp_agent_settings')
            .upsert({
                ...settings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Connections ---
    async getConnection(tenantId: string, provider: string = 'meta') {
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('provider', provider)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    },

    /**
     * Get the first active connection for a tenant, regardless of provider.
     * Prefers 'active' or 'connected' status. Falls back to any connection.
     */
    async getActiveConnection(tenantId: string) {
        // Try active/connected first
        const { data: active, error: activeErr } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenantId)
            .in('status', ['active', 'connected'])
            .limit(1)
            .maybeSingle();

        if (activeErr && activeErr.code !== 'PGRST116') throw activeErr;
        if (active) return active;

        // Fallback: any connection for this tenant
        const { data: any_conn, error: anyErr } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();

        if (anyErr && anyErr.code !== 'PGRST116') throw anyErr;
        return any_conn || null;
    },

    async upsertConnection(connection: any) {
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .upsert({
                ...connection,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,phone_number' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async listConnections(tenantId: string) {
        const { data, error } = await supabase
            .from('whatsapp_connections')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return data || [];
    },

    // --- Conversations & Messages ---
    async listConversations(tenantId: string) {
        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .select(`
                *,
                contact:whatsapp_contacts(*)
            `)
            .eq('tenant_id', tenantId)
            .order('last_message_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getConversation(id: string) {
        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .select(`
                *,
                contact:whatsapp_contacts(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async updateConversation(id: string, updates: any) {
        const { data, error } = await supabase
            .from('whatsapp_conversations')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async saveMessage(message: any) {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .insert(message)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async listMessages(conversationId: string) {
        const { data, error } = await supabase
            .from('whatsapp_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // --- Summaries ---
    async listSummaries(tenantId: string) {
        const { data, error } = await supabase
            .from('conversation_summaries')
            .select(`
                *,
                contact:whatsapp_contacts(name, phone)
            `)
            .eq('tenant_id', tenantId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async upsertSummary(summary: any) {
        const { data, error } = await supabase
            .from('conversation_summaries')
            .upsert(summary, { onConflict: 'conversation_id, summary_type' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Leads ---
    async listLeads(tenantId: string, agentMode: string = 'SDR') {
        const { data, error } = await supabase
            .from('leads')
            .select(`
                *,
                contact:whatsapp_contacts(name, phone),
                conversation:whatsapp_conversations(id, status, last_message_at)
            `)
            .eq('tenant_id', tenantId)
            .eq('agent_mode', agentMode)
            .order('urgency_score', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async updateLead(id: string, updates: any) {
        const { data, error } = await supabase
            .from('leads')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getLead(id: string) {
        const { data, error } = await supabase
            .from('leads')
            .select('stage, tenant_id')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // --- Events ---
    async createEvent(event: any) {
        const { error } = await supabase.from('whatsapp_events').insert(event);
        if (error) throw error;
    },

    async listEvents(tenantId: string, limit: number = 50) {
        const { data, error } = await supabase
            .from('whatsapp_events')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('occurred_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    // --- Audio Inbox ---
    async listAudioInbox(tenantId: string, filters: { status?: string, search?: string }) {
        let query = supabase
            .from('audio_assets')
            .select(`
                *,
                contact:whatsapp_contacts(name, phone),
                conversation:whatsapp_conversations(id, external_id)
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.search) {
            query = query.ilike('transcript_text', `%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getAudioAsset(id: string) {
        const { data, error } = await supabase
            .from('audio_assets')
            .select('tenant_id, media_url')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async updateAudioAsset(id: string, updates: any) {
        const { data, error } = await supabase
            .from('audio_assets')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- Briefings ---
    async listBriefingRules(tenantId: string) {
        const { data, error } = await supabase
            .from('briefing_rules')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getBriefingRule(id: string) {
        const { data, error } = await supabase
            .from('briefing_rules')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    async upsertBriefingRule(rule: any) {
        let query;
        if (rule.id) {
            query = supabase.from('briefing_rules').update(rule).eq('id', rule.id);
        } else {
            query = supabase.from('briefing_rules').insert(rule);
        }

        const { data, error } = await query.select().single();
        if (error) throw error;
        return data;
    },

    async createBriefingRun(run: any) {
        const { data, error } = await supabase
            .from('briefing_runs')
            .insert(run)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateBriefingRun(id: string, updates: any) {
        const { data, error } = await supabase
            .from('briefing_runs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // --- KPIs ---
    async getKPIs(tenantId: string) {
        const { data, error } = await supabase.rpc('get_whatsapp_kpis', {
            p_tenant_id: tenantId
        });

        if (error) throw error;
        return data;
    }
};
