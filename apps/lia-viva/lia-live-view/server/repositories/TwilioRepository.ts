/**
 * Twilio Repository
 * CRUD para tabelas twilio_subaccounts, twilio_onboarding_logs, twilio_usage_daily
 */

import { supabase } from '../config/supabase.js';
import type {
    TwilioSubaccount,
    OnboardingLog,
    TwilioUsageDaily,
    OnboardingStatus,
    ConsumerReport,
} from '../types/twilio.types.js';

export class TwilioRepository {
    // ========================================================
    // SUBACCOUNTS
    // ========================================================

    /**
     * Criar novo registro de subconta
     */
    static async createSubaccount(data: {
        tenant_id: string;
        twilio_account_sid: string;
        twilio_auth_token_encrypted: string;
        friendly_name?: string;
        onboarding_flow?: string;
        billing_mode?: string;
    }): Promise<TwilioSubaccount> {
        const { data: sub, error } = await supabase
            .from('twilio_subaccounts')
            .insert({
                tenant_id: data.tenant_id,
                twilio_account_sid: data.twilio_account_sid,
                twilio_auth_token_encrypted: data.twilio_auth_token_encrypted,
                friendly_name: data.friendly_name || `Luminnus-${data.tenant_id.slice(0, 8)}`,
                onboarding_flow: data.onboarding_flow || 'new_number',
                billing_mode: data.billing_mode || 'start_plan',
                onboarding_status: 'provisioning',
            })
            .select()
            .single();

        if (error) throw new Error(`[TwilioRepo] Erro ao criar subconta: ${error.message}`);
        return sub as TwilioSubaccount;
    }

    /**
     * Buscar subconta por tenant_id
     */
    static async getByTenantId(tenantId: string): Promise<TwilioSubaccount | null> {
        const { data, error } = await supabase
            .from('twilio_subaccounts')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error) throw new Error(`[TwilioRepo] Erro ao buscar subconta: ${error.message}`);
        return data as TwilioSubaccount | null;
    }

    /**
     * Buscar subconta por Twilio Account SID (para webhook routing)
     */
    static async getByAccountSid(sid: string): Promise<TwilioSubaccount | null> {
        const { data, error } = await supabase
            .from('twilio_subaccounts')
            .select('*')
            .eq('twilio_account_sid', sid)
            .maybeSingle();

        if (error) throw new Error(`[TwilioRepo] Erro ao buscar subconta por SID: ${error.message}`);
        return data as TwilioSubaccount | null;
    }

    /**
     * Buscar subconta por Account SID e Telefone (Resolução de conflitos)
     */
    static async getByAccountSidAndPhone(sid: string, phone: string): Promise<TwilioSubaccount | null> {
        const { data, error } = await supabase
            .from('twilio_subaccounts')
            .select('*')
            .eq('twilio_account_sid', sid)
            .eq('twilio_phone_number', phone)
            .maybeSingle();

        if (error) throw new Error(`[TwilioRepo] Erro ao buscar subconta por SID e Fone: ${error.message}`);
        return data as TwilioSubaccount | null;
    }

    /**
     * Atualizar subconta
     */
    static async update(tenantId: string, updates: Partial<TwilioSubaccount>): Promise<TwilioSubaccount> {
        const { data, error } = await supabase
            .from('twilio_subaccounts')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenantId)
            .select()
            .single();

        if (error) throw new Error(`[TwilioRepo] Erro ao atualizar subconta: ${error.message}`);
        return data as TwilioSubaccount;
    }

    /**
     * Atualizar status via RPC (com log automático)
     */
    static async updateStatusViaRPC(
        tenantId: string,
        newStatus: OnboardingStatus,
        action: string,
        details: Record<string, any> = {},
        errorMsg?: string
    ): Promise<TwilioSubaccount> {
        const { data, error } = await supabase.rpc('update_onboarding_status', {
            p_tenant_id: tenantId,
            p_new_status: newStatus,
            p_action: action,
            p_details: details,
            p_error: errorMsg || null,
        });

        if (error) throw new Error(`[TwilioRepo] Erro ao atualizar status: ${error.message}`);
        return data as TwilioSubaccount;
    }

    /**
     * Listar todas subcontas (admin)
     */
    static async listAll(options?: {
        status?: OnboardingStatus;
        limit?: number;
        offset?: number;
    }): Promise<{ subaccounts: TwilioSubaccount[]; count: number }> {
        let query = supabase
            .from('twilio_subaccounts')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (options?.status) {
            query = query.eq('onboarding_status', options.status);
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.range(options.offset, (options.offset + (options.limit || 20)) - 1);
        }

        const { data, error, count } = await query;
        if (error) throw new Error(`[TwilioRepo] Erro ao listar subcontas: ${error.message}`);
        return {
            subaccounts: (data || []) as TwilioSubaccount[],
            count: count || 0,
        };
    }

    /**
     * Contar subcontas ativas
     */
    static async countActive(): Promise<number> {
        const { count, error } = await supabase
            .from('twilio_subaccounts')
            .select('*', { count: 'exact', head: true })
            .eq('onboarding_status', 'active');

        if (error) throw new Error(`[TwilioRepo] Erro ao contar subcontas: ${error.message}`);
        return count || 0;
    }

    // ========================================================
    // ONBOARDING LOGS
    // ========================================================

    /**
     * Registrar log de onboarding
     */
    static async logAction(data: {
        tenant_id: string;
        subaccount_id?: string;
        action: string;
        status: 'pending' | 'success' | 'failed' | 'rolled_back';
        details?: Record<string, any>;
        error_message?: string;
    }): Promise<OnboardingLog> {
        const { data: log, error } = await supabase
            .from('twilio_onboarding_logs')
            .insert({
                tenant_id: data.tenant_id,
                subaccount_id: data.subaccount_id,
                action: data.action,
                status: data.status,
                details_json: data.details || {},
                error_message: data.error_message,
            })
            .select()
            .single();

        if (error) throw new Error(`[TwilioRepo] Erro ao registrar log: ${error.message}`);
        return log as OnboardingLog;
    }

    /**
     * Buscar logs de um tenant
     */
    static async getLogs(tenantId: string, limit = 50): Promise<OnboardingLog[]> {
        const { data, error } = await supabase
            .from('twilio_onboarding_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(`[TwilioRepo] Erro ao buscar logs: ${error.message}`);
        return (data || []) as OnboardingLog[];
    }

    // ========================================================
    // USAGE
    // ========================================================

    /**
     * Atualizar ou inserir uso diário (upsert)
     */
    static async upsertUsage(data: {
        tenant_id: string;
        subaccount_id: string;
        messages_sent?: number;
        messages_received?: number;
        cost_usd?: number;
    }): Promise<TwilioUsageDaily> {
        const today = new Date().toISOString().split('T')[0];

        // Tentar buscar registro do dia
        const { data: existing } = await supabase
            .from('twilio_usage_daily')
            .select('*')
            .eq('tenant_id', data.tenant_id)
            .eq('date', today)
            .maybeSingle();

        if (existing) {
            const { data: updated, error } = await supabase
                .from('twilio_usage_daily')
                .update({
                    messages_sent: (existing.messages_sent || 0) + (data.messages_sent || 0),
                    messages_received: (existing.messages_received || 0) + (data.messages_received || 0),
                    cost_usd: (existing.cost_usd || 0) + (data.cost_usd || 0),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw new Error(`[TwilioRepo] Erro ao atualizar uso: ${error.message}`);
            return updated as TwilioUsageDaily;
        }

        const { data: inserted, error } = await supabase
            .from('twilio_usage_daily')
            .insert({
                tenant_id: data.tenant_id,
                subaccount_id: data.subaccount_id,
                date: today,
                messages_sent: data.messages_sent || 0,
                messages_received: data.messages_received || 0,
                cost_usd: data.cost_usd || 0,
            })
            .select()
            .single();

        if (error) throw new Error(`[TwilioRepo] Erro ao inserir uso: ${error.message}`);
        return inserted as TwilioUsageDaily;
    }

    /**
     * Top consumers via RPC
     */
    static async getTopConsumers(hours = 24, limit = 10): Promise<ConsumerReport[]> {
        const { data, error } = await supabase.rpc('get_twilio_top_consumers', {
            p_hours: hours,
            p_limit: limit,
        });

        if (error) {
            console.warn(`[TwilioRepo] RPC get_twilio_top_consumers falhou, usando fallback: ${error.message}`);
            return [];
        }

        return (data || []) as ConsumerReport[];
    }

    // ========================================================
    // WHATSAPP_CONNECTIONS BRIDGE
    // ========================================================

    /**
     * Vincular subconta Twilio a uma whatsapp_connection existente
     */
    static async linkToConnection(tenantId: string, subaccountId: string): Promise<void> {
        const { error } = await supabase
            .from('whatsapp_connections')
            .update({
                twilio_subaccount_id: subaccountId,
                provider_type: 'twilio',
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenantId);

        if (error) {
            console.warn(`[TwilioRepo] Aviso: não foi possível vincular connection: ${error.message}`);
        }
    }
}
