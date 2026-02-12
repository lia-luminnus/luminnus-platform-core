import { supabase } from '../config/supabase.js';
import { CreditAlertService } from './creditAlertService.js';

// ============================================================
// CREDIT COSTS PER ACTION
// Maps each action type to its credit cost
// ============================================================
export const CREDIT_COSTS: Record<string, number> = {
    message: 1,           // 1 crédito por mensagem
    voice_min: 5,         // 5 créditos por minuto de voz
    marketing: 3,         // 3 créditos por disparo marketing
    stt: 2,               // 2 créditos por transcrição
    doc_analysis: 5,      // 5 créditos por análise de doc
    scheduling: 2,        // 2 créditos por agendamento
    image_gen: 10,        // 10 créditos por imagem gerada
    web_search: 1,        // 1 crédito por busca web
};

// Plan credit allocations
export const PLAN_CREDITS: Record<string, number> = {
    start: 1000,
    plus: 12000,
    pro: 40000,
};

export interface CreditResult {
    success: boolean;
    saldo_restante: number;
    creditos_debitados: number;
    percentual_uso: number;
    excedente: boolean;
    error?: string;
}

export interface CreditBalance {
    creditos_totais: number;
    creditos_plano: number;
    creditos_usados: number;
    creditos_bonus: number;
    creditos_restantes: number;
    percentual_uso: number;
    plano: string;
    periodo: string;
}

/**
 * CreditService — Gerencia débitos e consultas de créditos
 * Chama as RPCs do Supabase para operações atômicas
 */
export class CreditService {

    /**
     * Debita créditos por uma ação
     */
    static async debit(
        tenantId: string,
        userId: string,
        action: string,
        description?: string,
        metadata?: Record<string, any>
    ): Promise<CreditResult> {
        if (!supabase) {
            console.warn('⚠️ [CreditService] Supabase não configurado — créditos não debitados.');
            return {
                success: true,
                saldo_restante: 999999,
                creditos_debitados: 0,
                percentual_uso: 0,
                excedente: false,
            };
        }

        const credits = CREDIT_COSTS[action] || 1;

        try {
            const { data, error } = await supabase.rpc('debit_credits', {
                p_tenant_id: tenantId,
                p_user_id: userId,
                p_creditos: credits,
                p_acao: action,
                p_descricao: description || action,
                p_metadata: metadata || {},
            });

            if (error) {
                console.error(`❌ [CreditService] Erro ao debitar: ${error.message}`);
                // Não bloquear o usuário por erro de créditos
                return {
                    success: true,
                    saldo_restante: -1,
                    creditos_debitados: credits,
                    percentual_uso: -1,
                    excedente: false,
                    error: error.message,
                };
            }

            const result = data as CreditResult;
            console.log(`💳 [CreditService] Debitado: ${credits} créditos (${action}) | Saldo: ${result.saldo_restante}`);

            // Non-blocking alert check
            if (result.percentual_uso >= 0) {
                CreditAlertService.checkAndNotify(tenantId, result.percentual_uso, result.saldo_restante)
                    .catch(err => console.error('❌ [CreditService] Alert check failed:', err));
            }

            return result;
        } catch (err: any) {
            console.error(`❌ [CreditService] Exceção ao debitar:`, err);
            return {
                success: true,
                saldo_restante: -1,
                creditos_debitados: credits,
                percentual_uso: -1,
                excedente: false,
                error: err.message,
            };
        }
    }

    /**
     * Consulta o saldo de créditos do tenant
     */
    static async getBalance(tenantId: string): Promise<CreditBalance | null> {
        if (!supabase) {
            console.warn('⚠️ [CreditService] Supabase não configurado.');
            return null;
        }

        try {
            const { data, error } = await supabase.rpc('get_credit_balance', {
                p_tenant_id: tenantId,
            });

            if (error) {
                console.error(`❌ [CreditService] Erro ao consultar saldo: ${error.message}`);
                return null;
            }

            return data as CreditBalance;
        } catch (err: any) {
            console.error(`❌ [CreditService] Exceção ao consultar saldo:`, err);
            return null;
        }
    }

    /**
     * Adiciona créditos de recarga
     */
    static async addRecharge(
        tenantId: string,
        userId: string,
        credits: number,
        packageName: string,
        metadata?: Record<string, any>
    ): Promise<{ success: boolean; novo_saldo?: number; error?: string }> {
        if (!supabase) {
            return { success: false, error: 'Supabase não configurado' };
        }

        try {
            const { data, error } = await supabase.rpc('add_recharge_credits', {
                p_tenant_id: tenantId,
                p_user_id: userId,
                p_creditos: credits,
                p_package_name: packageName,
                p_metadata: metadata || {},
            });

            if (error) {
                console.error(`❌ [CreditService] Erro ao adicionar recarga: ${error.message}`);
                return { success: false, error: error.message };
            }

            const result = data as any;
            console.log(`🔋 [CreditService] Recarga: +${credits} créditos | Novo saldo: ${result.novo_saldo}`);
            return { success: true, novo_saldo: result.novo_saldo };
        } catch (err: any) {
            console.error(`❌ [CreditService] Exceção na recarga:`, err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Lista transações de crédito do tenant
     */
    static async getTransactions(
        tenantId: string,
        limit: number = 20
    ): Promise<any[]> {
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error(`❌ [CreditService] Erro ao buscar transações: ${error.message}`);
                return [];
            }

            return data || [];
        } catch (err: any) {
            console.error(`❌ [CreditService] Exceção ao buscar transações:`, err);
            return [];
        }
    }

    /**
     * Lista pacotes de recarga disponíveis
     */
    static async getPackages(): Promise<any[]> {
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from('credit_packages')
                .select('*')
                .eq('ativo', true)
                .order('ordem', { ascending: true });

            if (error) {
                console.error(`❌ [CreditService] Erro ao buscar pacotes: ${error.message}`);
                return [];
            }

            return data || [];
        } catch (err: any) {
            console.error(`❌ [CreditService] Exceção ao buscar pacotes:`, err);
            return [];
        }
    }

    /**
     * Resolve tenantId a partir de userId
     * Usa a tabela tenant_users para encontrar o tenant
     */
    static async resolveTenantId(userId: string): Promise<string | null> {
        if (!supabase || !userId) return null;

        try {
            // Primeiro tenta tenant_users
            const { data, error } = await supabase
                .from('tenant_users')
                .select('tenant_id')
                .eq('user_id', userId)
                .limit(1)
                .maybeSingle();

            if (data?.tenant_id) return data.tenant_id;

            // Fallback: tenants onde o owner é o userId
            const { data: ownerData } = await supabase
                .from('tenants')
                .select('id')
                .eq('owner_user_id', userId)
                .limit(1)
                .maybeSingle();

            if (ownerData?.id) return ownerData.id;

            // Fallback último: userId como tenantId (single-tenant mode)
            return userId;
        } catch (err: any) {
            console.error(`❌ [CreditService] Erro ao resolver tenantId:`, err);
            return userId; // Fallback seguro
        }
    }
}
