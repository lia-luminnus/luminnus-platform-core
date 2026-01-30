/**
 * CRMService - Sistema de CRM da LIA
 * v5.0
 * 
 * Funcionalidades:
 * - Gerenciamento de leads (criar, atualizar, converter, listar)
 * - Gerenciamento de deals (criar, atualizar, mover estágios, fechar)
 * - Notas associadas a leads e deals
 * - Pipeline de vendas
 * - Persistência em Supabase (tabelas crm_leads, crm_deals, crm_notes)
 */

import { supabase } from '../config/supabase.js';

export interface CRMLead {
    id: string;
    tenant_id: string;
    user_id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    source?: string;
    status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
    tags?: string[];
    notes?: string;
    custom_fields?: Record<string, any>;
    created_at: string;
    updated_at: string;
    converted_at?: string;
}

export interface CRMDeal {
    id: string;
    tenant_id: string;
    user_id: string;
    lead_id?: string;
    title: string;
    description?: string;
    value?: number;
    currency?: string;
    stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
    probability?: number;
    expected_close_date?: string;
    actual_close_date?: string;
    tags?: string[];
    notes?: string;
    custom_fields?: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface CRMNote {
    id: string;
    tenant_id: string;
    user_id: string;
    entity_type: 'lead' | 'deal';
    entity_id: string;
    content: string;
    created_at: string;
}

export class CRMService {
    /**
     * Cria um novo lead
     */
    static async createLead(params: {
        userId: string;
        tenantId: string;
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        position?: string;
        source?: string;
        notes?: string;
        tags?: string[];
    }): Promise<{ success: boolean; lead?: CRMLead; error?: string }> {
        try {
            const { userId, tenantId, name, email, phone, company, position, source, notes, tags } = params;

            if (!name || name.trim().length === 0) {
                return { success: false, error: 'Nome do lead é obrigatório' };
            }

            const leadData: Partial<CRMLead> = {
                tenant_id: tenantId,
                user_id: userId,
                name: name.trim(),
                email: email?.trim(),
                phone: phone?.trim(),
                company: company?.trim(),
                position: position?.trim(),
                source: source?.trim(),
                status: 'new',
                notes: notes?.trim(),
                tags: tags || []
            };

            const { data, error } = await supabase
                .from('crm_leads')
                .insert([leadData])
                .select()
                .single();

            if (error) {
                console.error('[CRMService] Erro ao criar lead:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ [CRMService] Lead criado: ${data.id} - "${name}"`);
            return { success: true, lead: data as CRMLead };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Atualiza um lead existente
     */
    static async updateLead(params: {
        leadId: string;
        userId: string;
        tenantId: string;
        updates: {
            name?: string;
            email?: string;
            phone?: string;
            company?: string;
            position?: string;
            source?: string;
            status?: CRMLead['status'];
            notes?: string;
            tags?: string[];
        };
    }): Promise<{ success: boolean; lead?: CRMLead; error?: string }> {
        try {
            const { leadId, userId, tenantId, updates } = params;

            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name.trim();
            if (updates.email !== undefined) updateData.email = updates.email?.trim();
            if (updates.phone !== undefined) updateData.phone = updates.phone?.trim();
            if (updates.company !== undefined) updateData.company = updates.company?.trim();
            if (updates.position !== undefined) updateData.position = updates.position?.trim();
            if (updates.source !== undefined) updateData.source = updates.source?.trim();
            if (updates.status !== undefined) {
                updateData.status = updates.status;
                if (updates.status === 'converted') {
                    updateData.converted_at = new Date().toISOString();
                }
            }
            if (updates.notes !== undefined) updateData.notes = updates.notes?.trim();
            if (updates.tags !== undefined) updateData.tags = updates.tags;

            const { data, error } = await supabase
                .from('crm_leads')
                .update(updateData)
                .eq('id', leadId)
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (error) {
                console.error('[CRMService] Erro ao atualizar lead:', error);
                return { success: false, error: error.message };
            }

            if (!data) {
                return { success: false, error: 'Lead não encontrado ou sem permissão' };
            }

            console.log(`✅ [CRMService] Lead atualizado: ${leadId}`);
            return { success: true, lead: data as CRMLead };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lista leads do usuário
     */
    static async listLeads(params: {
        userId: string;
        tenantId: string;
        filter?: {
            status?: CRMLead['status'] | CRMLead['status'][];
            source?: string;
        };
    }): Promise<{ success: boolean; leads?: CRMLead[]; error?: string }> {
        try {
            const { userId, tenantId, filter } = params;

            let query = supabase
                .from('crm_leads')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (filter?.status) {
                if (Array.isArray(filter.status)) {
                    query = query.in('status', filter.status);
                } else {
                    query = query.eq('status', filter.status);
                }
            }

            if (filter?.source) {
                query = query.eq('source', filter.source);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[CRMService] Erro ao listar leads:', error);
                return { success: false, error: error.message };
            }

            console.log(`📋 [CRMService] Listados ${data.length} leads`);
            return { success: true, leads: data as CRMLead[] };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cria um novo deal
     */
    static async createDeal(params: {
        userId: string;
        tenantId: string;
        leadId?: string;
        title: string;
        description?: string;
        value?: number;
        currency?: string;
        expectedCloseDate?: string;
        probability?: number;
        notes?: string;
        tags?: string[];
    }): Promise<{ success: boolean; deal?: CRMDeal; error?: string }> {
        try {
            const { userId, tenantId, leadId, title, description, value, currency, expectedCloseDate, probability, notes, tags } = params;

            if (!title || title.trim().length === 0) {
                return { success: false, error: 'Título do deal é obrigatório' };
            }

            const dealData: Partial<CRMDeal> = {
                tenant_id: tenantId,
                user_id: userId,
                lead_id: leadId,
                title: title.trim(),
                description: description?.trim(),
                value,
                currency: currency || 'BRL',
                stage: 'prospecting',
                expected_close_date: expectedCloseDate,
                probability,
                notes: notes?.trim(),
                tags: tags || []
            };

            const { data, error } = await supabase
                .from('crm_deals')
                .insert([dealData])
                .select()
                .single();

            if (error) {
                console.error('[CRMService] Erro ao criar deal:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ [CRMService] Deal criado: ${data.id} - "${title}"`);
            return { success: true, deal: data as CRMDeal };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Atualiza um deal existente
     */
    static async updateDeal(params: {
        dealId: string;
        userId: string;
        tenantId: string;
        updates: {
            title?: string;
            description?: string;
            value?: number;
            stage?: CRMDeal['stage'];
            probability?: number;
            expectedCloseDate?: string;
            actualCloseDate?: string;
            notes?: string;
            tags?: string[];
        };
    }): Promise<{ success: boolean; deal?: CRMDeal; error?: string }> {
        try {
            const { dealId, userId, tenantId, updates } = params;

            const updateData: any = {};
            if (updates.title !== undefined) updateData.title = updates.title.trim();
            if (updates.description !== undefined) updateData.description = updates.description?.trim();
            if (updates.value !== undefined) updateData.value = updates.value;
            if (updates.stage !== undefined) {
                updateData.stage = updates.stage;
                if (updates.stage === 'closed_won' || updates.stage === 'closed_lost') {
                    updateData.actual_close_date = new Date().toISOString().split('T')[0];
                }
            }
            if (updates.probability !== undefined) updateData.probability = updates.probability;
            if (updates.expectedCloseDate !== undefined) updateData.expected_close_date = updates.expectedCloseDate;
            if (updates.actualCloseDate !== undefined) updateData.actual_close_date = updates.actualCloseDate;
            if (updates.notes !== undefined) updateData.notes = updates.notes?.trim();
            if (updates.tags !== undefined) updateData.tags = updates.tags;

            const { data, error } = await supabase
                .from('crm_deals')
                .update(updateData)
                .eq('id', dealId)
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (error) {
                console.error('[CRMService] Erro ao atualizar deal:', error);
                return { success: false, error: error.message };
            }

            if (!data) {
                return { success: false, error: 'Deal não encontrado ou sem permissão' };
            }

            console.log(`✅ [CRMService] Deal atualizado: ${dealId}`);
            return { success: true, deal: data as CRMDeal };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lista deals do usuário
     */
    static async listDeals(params: {
        userId: string;
        tenantId: string;
        filter?: {
            stage?: CRMDeal['stage'] | CRMDeal['stage'][];
            leadId?: string;
        };
    }): Promise<{ success: boolean; deals?: CRMDeal[]; error?: string }> {
        try {
            const { userId, tenantId, filter } = params;

            let query = supabase
                .from('crm_deals')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (filter?.stage) {
                if (Array.isArray(filter.stage)) {
                    query = query.in('stage', filter.stage);
                } else {
                    query = query.eq('stage', filter.stage);
                }
            }

            if (filter?.leadId) {
                query = query.eq('lead_id', filter.leadId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[CRMService] Erro ao listar deals:', error);
                return { success: false, error: error.message };
            }

            console.log(`📋 [CRMService] Listados ${data.length} deals`);
            return { success: true, deals: data as CRMDeal[] };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Adiciona nota a um lead ou deal
     */
    static async addNote(params: {
        userId: string;
        tenantId: string;
        entityType: 'lead' | 'deal';
        entityId: string;
        content: string;
    }): Promise<{ success: boolean; note?: CRMNote; error?: string }> {
        try {
            const { userId, tenantId, entityType, entityId, content } = params;

            if (!content || content.trim().length === 0) {
                return { success: false, error: 'Conteúdo da nota é obrigatório' };
            }

            const noteData: Partial<CRMNote> = {
                tenant_id: tenantId,
                user_id: userId,
                entity_type: entityType,
                entity_id: entityId,
                content: content.trim()
            };

            const { data, error } = await supabase
                .from('crm_notes')
                .insert([noteData])
                .select()
                .single();

            if (error) {
                console.error('[CRMService] Erro ao adicionar nota:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ [CRMService] Nota adicionada ao ${entityType}: ${entityId}`);
            return { success: true, note: data as CRMNote };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtém pipeline de vendas (resumo por estágio)
     */
    static async getPipeline(params: {
        userId: string;
        tenantId: string;
    }): Promise<{ success: boolean; pipeline?: any; error?: string }> {
        try {
            const { userId, tenantId } = params;

            const { data, error } = await supabase
                .from('crm_deals')
                .select('stage, value, currency')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            if (error) {
                console.error('[CRMService] Erro ao obter pipeline:', error);
                return { success: false, error: error.message };
            }

            // Agrupar por estágio
            const pipeline: Record<string, { count: number; total_value: number }> = {};
            data.forEach(deal => {
                if (!pipeline[deal.stage]) {
                    pipeline[deal.stage] = { count: 0, total_value: 0 };
                }
                pipeline[deal.stage].count++;
                pipeline[deal.stage].total_value += deal.value || 0;
            });

            console.log(`📊 [CRMService] Pipeline obtido com ${data.length} deals`);
            return { success: true, pipeline };
        } catch (error: any) {
            console.error('[CRMService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }
}
