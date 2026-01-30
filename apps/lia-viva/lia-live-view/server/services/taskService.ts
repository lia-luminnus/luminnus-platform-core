/**
 * TaskService - Gerenciamento de Tarefas da LIA
 * v1.0
 * 
 * Funcionalidades:
 * - Criar, atualizar, mover, listar e completar tarefas
 * - Persistência em Supabase (tabela tasks)
 * - Suporte a prioridades, categorias e datas de vencimento
 * - Multi-tenant (tenant_id + user_id)
 */

import { supabase } from '../config/supabase.js';

export interface Task {
    id: string;
    tenant_id: string;
    user_id: string;
    title: string;
    description?: string;
    due_date?: string;  // ISO string
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    category?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export class TaskService {
    /**
     * Cria uma nova tarefa
     */
    static async createTask(params: {
        userId: string;
        tenantId: string;
        title: string;
        description?: string;
        dueDate?: string;
        priority?: Task['priority'];
        category?: string;
    }): Promise<{ success: boolean; task?: Task; error?: string }> {
        try {
            const { userId, tenantId, title, description, dueDate, priority, category } = params;

            if (!title || title.trim().length === 0) {
                return { success: false, error: 'Título da tarefa é obrigatório' };
            }

            const taskData: Partial<Task> = {
                tenant_id: tenantId,
                user_id: userId,
                title: title.trim(),
                description: description?.trim(),
                due_date: dueDate,
                priority: priority || 'medium',
                status: 'pending',
                category: category?.trim(),
            };

            const { data, error } = await supabase
                .from('tasks')
                .insert([taskData])
                .select()
                .single();

            if (error) {
                console.error('[TaskService] Erro ao criar tarefa:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ [TaskService] Tarefa criada: ${data.id} - "${title}"`);
            return { success: true, task: data as Task };
        } catch (error: any) {
            console.error('[TaskService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Atualiza uma tarefa existente
     */
    static async updateTask(params: {
        taskId: string;
        userId: string;
        tenantId: string;
        updates: {
            title?: string;
            description?: string;
            dueDate?: string;
            priority?: Task['priority'];
            status?: Task['status'];
            category?: string;
        };
    }): Promise<{ success: boolean; task?: Task; error?: string }> {
        try {
            const { taskId, userId, tenantId, updates } = params;

            const updateData: any = {};
            if (updates.title !== undefined) updateData.title = updates.title.trim();
            if (updates.description !== undefined) updateData.description = updates.description?.trim();
            if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
            if (updates.priority !== undefined) updateData.priority = updates.priority;
            if (updates.status !== undefined) {
                updateData.status = updates.status;
                if (updates.status === 'completed') {
                    updateData.completed_at = new Date().toISOString();
                }
            }
            if (updates.category !== undefined) updateData.category = updates.category?.trim();

            const { data, error } = await supabase
                .from('tasks')
                .update(updateData)
                .eq('id', taskId)
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (error) {
                console.error('[TaskService] Erro ao atualizar tarefa:', error);
                return { success: false, error: error.message };
            }

            if (!data) {
                return { success: false, error: 'Tarefa não encontrada ou sem permissão' };
            }

            console.log(`✅ [TaskService] Tarefa atualizada: ${taskId}`);
            return { success: true, task: data as Task };
        } catch (error: any) {
            console.error('[TaskService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Move uma tarefa para outra data
     */
    static async moveTask(params: {
        taskId: string;
        userId: string;
        tenantId: string;
        newDueDate: string;
    }): Promise<{ success: boolean; task?: Task; error?: string }> {
        return this.updateTask({
            ...params,
            updates: { dueDate: params.newDueDate }
        });
    }

    /**
     * Lista tarefas do usuário
     */
    static async listTasks(params: {
        userId: string;
        tenantId: string;
        filter?: {
            status?: Task['status'] | Task['status'][];
            category?: string;
            dateRange?: { start: string; end: string };
            priority?: Task['priority'];
        };
    }): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
        try {
            const { userId, tenantId, filter } = params;

            let query = supabase
                .from('tasks')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId)
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('priority', { ascending: false });

            // Filtros
            if (filter?.status) {
                if (Array.isArray(filter.status)) {
                    query = query.in('status', filter.status);
                } else {
                    query = query.eq('status', filter.status);
                }
            }

            if (filter?.category) {
                query = query.eq('category', filter.category);
            }

            if (filter?.priority) {
                query = query.eq('priority', filter.priority);
            }

            if (filter?.dateRange) {
                query = query
                    .gte('due_date', filter.dateRange.start)
                    .lte('due_date', filter.dateRange.end);
            }

            const { data, error } = await query;

            if (error) {
                console.error('[TaskService] Erro ao listar tarefas:', error);
                return { success: false, error: error.message };
            }

            console.log(`📋 [TaskService] Listadas ${data.length} tarefas`);
            return { success: true, tasks: data as Task[] };
        } catch (error: any) {
            console.error('[TaskService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Marca tarefa como concluída
     */
    static async completeTask(params: {
        taskId: string;
        userId: string;
        tenantId: string;
    }): Promise<{ success: boolean; task?: Task; error?: string }> {
        return this.updateTask({
            ...params,
            updates: { status: 'completed' }
        });
    }

    /**
     * Deleta uma tarefa
     */
    static async deleteTask(params: {
        taskId: string;
        userId: string;
        tenantId: string;
    }): Promise<{ success: boolean; error?: string }> {
        try {
            const { taskId, userId, tenantId } = params;

            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId)
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            if (error) {
                console.error('[TaskService] Erro ao deletar tarefa:', error);
                return { success: false, error: error.message };
            }

            console.log(`🗑️ [TaskService] Tarefa deletada: ${taskId}`);
            return { success: true };
        } catch (error: any) {
            console.error('[TaskService] Erro inesperado:', error);
            return { success: false, error: error.message };
        }
    }
}
