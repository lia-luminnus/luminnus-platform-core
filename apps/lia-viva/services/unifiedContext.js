// ======================================================================
// UNIFIED CONTEXT SERVICE - Centraliza Memória e Histórico (Voz + Texto)
// ======================================================================

import { supabase } from '../config/supabase.js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ======================================================================
// 1. GERENCIAMENTO DE HISTÓRICO (Conversas)
// ======================================================================

/**
 * Carrega o histórico completo da conversa (Voz + Texto)
 * @param {string} conversationId - ID da conversa
 * @param {number} limit - Limite de mensagens (padrão 50)
 */
export async function loadConversation(conversationId, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;

        if (data.length === limit) {
            const { data: recentData, error: recentError } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (recentError) throw recentError;
            return recentData.reverse();
        }

        return data;
    } catch (error) {
        console.error('❌ Erro ao carregar conversa:', error);
        return [];
    }
}

/**
 * Salva uma mensagem no histórico unificado
 * @param {string} conversationId 
 * @param {string} role - 'user' | 'assistant' | 'system'
 * @param {string} content 
 * @param {string} origin - 'text' | 'voice'
 */
export async function saveMessage(conversationId, role, content, origin = 'text') {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                role,
                content,
                origin,
                metadata: { origin }
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
        return null;
    }
}

// ======================================================================
// 2. GERENCIAMENTO DE MEMÓRIA PERMANENTE
// ======================================================================

/**
 * Carrega memórias persistentes do usuário
 * @param {string} userId 
 */
export async function loadPersistentMemory(userId) {
    try {
        const { data, error } = await supabase
            .from('memories')
            .select('*')
            .eq('user_id', userId)
            .order('importance', { ascending: false })
            .limit(20);

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Erro ao carregar memórias:', error);
        return [];
    }
}

/**
 * Salva uma nova memória persistente (ou atualiza se similar)
 * @param {string} userId 
 * @param {string} type - 'personal', 'preference', etc.
 * @param {string} content 
 */
export async function savePersistentMemory(userId, type, content) {
    try {
        const { data: existing } = await supabase
            .from('memories')
            .select('id, importance')
            .eq('user_id', userId)
            .eq('type', type)
            .ilike('content', content)
            .single();

        if (existing) {
            await supabase
                .from('memories')
                .update({ importance: existing.importance + 1, updated_at: new Date() })
                .eq('id', existing.id);
            return { status: 'updated', id: existing.id };
        }

        const { data, error } = await supabase
            .from('memories')
            .insert({
                user_id: userId,
                type,
                content,
                importance: 1
            })
            .select()
            .single();

        if (error) throw error;
        return { status: 'created', data };
    } catch (error) {
        console.error('❌ Erro ao salvar memória persistente:', error);
        return null;
    }
}

// ======================================================================
// 3. CONTEXTO UNIFICADO (Helper para GPT/Realtime)
// ======================================================================

/**
 * Gera o contexto completo para injeção no prompt do sistema
 * @param {string} conversationId 
 * @param {string} userId 
 */
export async function getUnifiedContext(conversationId, userId) {
    const [history, memories] = await Promise.all([
        loadConversation(conversationId, 20),
        loadPersistentMemory(userId)
    ]);

    let memoryBlock = "";
    if (memories.length > 0) {
        memoryBlock = "🧠 MEMÓRIAS DE LONGO PRAZO (O que você sabe sobre o usuário):\n";
        memories.forEach(m => {
            memoryBlock += `- [${m.type.toUpperCase()}] ${m.content}\n`;
        });
    }

    return {
        history,
        memories,
        memoryBlock,
        systemInstruction: memoryBlock,
        previousMessages: history.map(msg => ({
            role: msg.role,
            content: msg.content
        }))
    };
}

export default {
    loadConversation,
    saveMessage,
    loadPersistentMemory,
    savePersistentMemory,
    getUnifiedContext
};
