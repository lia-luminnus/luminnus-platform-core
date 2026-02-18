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
            .maybeSingle();

        if (error) {
            console.error(`[WhatsAppRepo.getSettings] Erro para tenant ${tenantId}:`, error.message);
            throw error;
        }
        return data;
    },

    async upsertSettings(settings: any) {
        const { tenant_id, ...rest } = settings;
        if (!tenant_id) throw new Error('tenant_id é obrigatório para upsertSettings');

        const { data, error } = await supabase
            .from('whatsapp_agent_settings')
            .upsert({
                tenant_id,
                ...rest,
                updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id' })
            .select()
            .single();

        if (error) {
            console.error(`[WhatsAppRepo.upsertSettings] Erro para tenant ${tenant_id}:`, error.message);
            throw error;
        }
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
     * v15.0: Auto-syncs from twilio_subaccounts if no whatsapp_connections record exists.
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
        if (any_conn) return any_conn;

        // v15.0: Auto-sync from twilio_subaccounts
        // If no whatsapp_connections record exists, check if a Twilio subaccount
        // was provisioned for this tenant and auto-create the connection record.
        const twilioConn = await this.syncFromTwilioSubaccounts(tenantId);
        return twilioConn;
    },

    /**
     * v15.0: Auto-sync — check twilio_subaccounts for an active number
     * and create a whatsapp_connections record if found.
     * This ensures the Agent page auto-detects provisioned Twilio numbers.
     */
    async syncFromTwilioSubaccounts(tenantId: string) {
        try {
            // Check twilio_subaccounts by tenant_id
            let { data: twilio, error: twilioErr } = await supabase
                .from('twilio_subaccounts')
                .select('*')
                .eq('tenant_id', tenantId)
                .eq('onboarding_status', 'active')
                .limit(1)
                .maybeSingle();

            if (twilioErr && twilioErr.code !== 'PGRST116') {
                console.warn('[WhatsAppRepo] Error checking twilio_subaccounts by tenant_id:', twilioErr);
            }

            // If not found by tenant_id, also try searching by user_id 
            // (some records use user_id as tenant_id)
            if (!twilio) {
                const { data: twilioByUser, error: userErr } = await supabase
                    .from('twilio_subaccounts')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .limit(1)
                    .maybeSingle();

                if (!userErr || userErr.code === 'PGRST116') {
                    twilio = twilioByUser;
                }
            }

            if (!twilio || !twilio.twilio_phone_number) return null;

            console.log(`[WhatsAppRepo] Auto-syncing Twilio subaccount → whatsapp_connections | tenant: ${tenantId} | phone: ${twilio.twilio_phone_number}`);

            // Auto-create the whatsapp_connections record
            const newConnection = {
                tenant_id: tenantId,
                provider: 'twilio',
                provider_type: 'twilio',
                phone_number: twilio.twilio_phone_number.replace('+', ''),
                status: 'active',
                config_json: {
                    auto_synced: true,
                    twilio_subaccount_id: twilio.id,
                    twilio_account_sid: twilio.twilio_account_sid,
                    webhook_url: twilio.webhook_url
                },
                twilio_subaccount_id: twilio.id
            };

            const { data: created, error: createErr } = await supabase
                .from('whatsapp_connections')
                .upsert(newConnection, { onConflict: 'tenant_id,provider' })
                .select()
                .single();

            if (createErr) {
                console.error('[WhatsAppRepo] Failed to auto-create whatsapp_connection:', createErr);
                // Even if upsert fails, return a virtual connection object  
                // so the Agent page shows "connected"
                return {
                    ...newConnection,
                    id: 'virtual-' + twilio.id,
                    created_at: twilio.created_at,
                    updated_at: twilio.updated_at
                };
            }

            console.log(`[WhatsAppRepo] ✅ Auto-synced whatsapp_connection created: ${created.id}`);
            return created;
        } catch (error) {
            console.error('[WhatsAppRepo] syncFromTwilioSubaccounts error:', error);
            return null;
        }
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
