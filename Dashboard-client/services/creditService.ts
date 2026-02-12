import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export interface CreditTransaction {
    id: string;
    tipo: 'debit' | 'credit' | 'recharge' | 'plan_reset' | 'rollover' | 'referral';
    creditos: number;
    saldo_apos: number;
    acao: string;
    descricao: string;
    created_at: string;
}

export interface CreditPackage {
    id: string;
    nome: string;
    creditos: number;
    preco_eur: number;
    stripe_price_id: string | null;
    destaque: string | null;
    ativo: boolean;
}

/**
 * Busca saldo de créditos via RPC do Supabase (direto)
 */
export async function getCreditBalance(tenantId: string): Promise<CreditBalance | null> {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase.rpc('get_credit_balance', {
            p_tenant_id: tenantId,
        });

        if (error) {
            console.error('[CreditService] Erro ao buscar saldo:', error);
            return null;
        }

        return data as CreditBalance;
    } catch (err) {
        console.error('[CreditService] Exceção ao buscar saldo:', err);
        return null;
    }
}

/**
 * Busca histórico de transações via API REST
 */
export async function getCreditTransactions(
    tenantId: string,
    limit: number = 20
): Promise<CreditTransaction[]> {
    try {
        const res = await fetch(`${API_URL}/api/credits/transactions?tenantId=${tenantId}&limit=${limit}`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.transactions || [];
    } catch (err) {
        console.error('[CreditService] Erro ao buscar transações:', err);
        return [];
    }
}

/**
 * Busca pacotes de recarga disponíveis via API REST
 */
export async function getCreditPackages(): Promise<CreditPackage[]> {
    try {
        const res = await fetch(`${API_URL}/api/credits/packages`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.packages || [];
    } catch (err) {
        console.error('[CreditService] Erro ao buscar pacotes:', err);
        return [];
    }
}

/**
 * Busca tabela de custos por ação
 */
export async function getCreditCosts(): Promise<Record<string, number>> {
    try {
        const res = await fetch(`${API_URL}/api/credits/costs`);
        if (!res.ok) return {};
        const data = await res.json();
        return data.costs || {};
    } catch (err) {
        console.error('[CreditService] Erro ao buscar custos:', err);
        return {};
    }
}
