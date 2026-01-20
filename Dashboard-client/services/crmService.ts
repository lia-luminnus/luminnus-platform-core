/**
 * CRM Service - CRUD operations for deals
 * Connects to Supabase for persistent storage
 */

import { supabase } from '../lib/supabase';
import { Deal } from '../types';

// Map frontend Deal to database columns
const mapDealToDb = (deal: Partial<Deal>) => ({
    title: deal.clientName,
    contact_name: deal.clientName,
    contact_email: deal.email,
    phone: deal.phone,
    stage: deal.stage,
    amount: deal.value,
    priority: deal.priority || 'medium',
    probability: deal.probability || 0,
    expected_close_date: deal.expectedCloseDate,
    source: deal.source || 'manual',
    tags: deal.tags || [],
    notes: deal.notes,
    owner_user_id: deal.assignedTo,
    last_contact_at: deal.lastContact ? new Date().toISOString() : null,
    metadata: { company: deal.company }
});

// Map database row to frontend Deal
const mapDbToDeal = (row: any): Deal => ({
    id: row.id,
    clientName: row.contact_name || row.title,
    company: row.metadata?.company || '',
    value: parseFloat(row.amount) || 0,
    stage: row.stage || 'lead',
    email: row.contact_email || '',
    phone: row.phone || '',
    lastContact: row.last_contact_at ? formatRelativeTime(row.last_contact_at) : 'Nunca',
    priority: row.priority || 'medium',
    probability: row.probability || 0,
    expectedCloseDate: row.expected_close_date,
    source: row.source || 'manual',
    tags: row.tags || [],
    notes: row.notes || '',
    assignedTo: row.owner_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// Format relative time (e.g., "2 days ago")
const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    return date.toLocaleDateString('pt-BR');
};

export interface DealFilters {
    stage?: string;
    priority?: string;
    minValue?: number;
    maxValue?: number;
    search?: string;
}

export interface DealSort {
    field: 'value' | 'created_at' | 'probability' | 'updated_at';
    direction: 'asc' | 'desc';
}

export const crmService = {
    /**
     * List all deals for a tenant with optional filters and sorting
     */
    async listDeals(tenantId: string, filters?: DealFilters, sort?: DealSort): Promise<Deal[]> {
        try {
            let query = supabase
                .from('deals')
                .select('*')
                .eq('tenant_id', tenantId);

            // Apply filters
            if (filters?.stage) {
                query = query.eq('stage', filters.stage);
            }
            if (filters?.priority) {
                query = query.eq('priority', filters.priority);
            }
            if (filters?.minValue !== undefined) {
                query = query.gte('amount', filters.minValue);
            }
            if (filters?.maxValue !== undefined) {
                query = query.lte('amount', filters.maxValue);
            }
            if (filters?.search) {
                query = query.or(`title.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`);
            }

            // Apply sorting
            if (sort) {
                const dbField = sort.field === 'value' ? 'amount' : sort.field;
                query = query.order(dbField, { ascending: sort.direction === 'asc' });
            } else {
                query = query.order('updated_at', { ascending: false });
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ [CRM] Erro ao listar deals:', error);
                return [];
            }

            return (data || []).map(mapDbToDeal);
        } catch (err) {
            console.error('❌ [CRM] Erro inesperado ao listar deals:', err);
            return [];
        }
    },

    /**
     * Get a single deal by ID
     */
    async getDeal(id: string): Promise<Deal | null> {
        try {
            const { data, error } = await supabase
                .from('deals')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                console.error('❌ [CRM] Erro ao buscar deal:', error);
                return null;
            }

            return mapDbToDeal(data);
        } catch (err) {
            console.error('❌ [CRM] Erro inesperado ao buscar deal:', err);
            return null;
        }
    },

    /**
     * Create a new deal
     */
    async createDeal(tenantId: string, deal: Partial<Deal>): Promise<Deal | null> {
        try {
            const dbData = {
                tenant_id: tenantId,
                ...mapDealToDb(deal)
            };

            const { data, error } = await supabase
                .from('deals')
                .insert(dbData)
                .select()
                .single();

            if (error) {
                console.error('❌ [CRM] Erro ao criar deal:', error);
                return null;
            }

            return mapDbToDeal(data);
        } catch (err) {
            console.error('❌ [CRM] Erro inesperado ao criar deal:', err);
            return null;
        }
    },

    /**
     * Update an existing deal
     */
    async updateDeal(id: string, deal: Partial<Deal>): Promise<Deal | null> {
        try {
            const dbData = {
                ...mapDealToDb(deal),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('deals')
                .update(dbData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('❌ [CRM] Erro ao atualizar deal:', error);
                return null;
            }

            return mapDbToDeal(data);
        } catch (err) {
            console.error('❌ [CRM] Erro inesperado ao atualizar deal:', err);
            return null;
        }
    },

    /**
     * Update only the stage of a deal (for drag-and-drop)
     */
    async updateDealStage(id: string, stage: Deal['stage']): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('deals')
                .update({ stage, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                console.error('❌ [CRM] Erro ao atualizar estágio:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('❌ [CRM] Erro inesperado ao atualizar estágio:', err);
            return false;
        }
    },

    /**
     * Delete a deal
     */
    async deleteDeal(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('deals')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('❌ [CRM] Erro ao excluir deal:', error);
                return false;
            }

            return true;
        } catch (err) {
            console.error('❌ [CRM] Erro inesperado ao excluir deal:', err);
            return false;
        }
    }
};

export default crmService;
