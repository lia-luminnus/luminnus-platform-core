/**
 * Módulo de gerenciamento de conversas e histórico com a LIA
 * Integração com Supabase para persistência de conversas e mensagens
 *
 * Funcionalidades:
 * - Criar e gerenciar múltiplas conversas
 * - Salvar e carregar histórico de mensagens
 * - Sistema de abas para organizar conversas
 */

import { supabase } from '@/integrations/supabase/client';

// Tipos e interfaces
export interface Message {
  id?: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

/**
 * Cria uma nova conversa
 * @param userId - ID do usuário
 * @param title - Título opcional da conversa
 * @returns Promise com a conversa criada
 */
export async function createConversation(
  userId: string,
  title?: string
): Promise<Conversation> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert([
        {
          user_id: userId,
          title: title || `Conversa ${new Date().toLocaleDateString('pt-BR')}`,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[Conversations] Erro ao criar conversa:', error);
      throw new Error('Erro ao criar conversa');
    }

    console.log('[Conversations] Conversa criada:', data);
    return data;
  } catch (error) {
    console.error('[Conversations] Erro ao criar conversa:', error);
    throw error;
  }
}

/**
 * Lista todas as conversas de um usuário
 * @param userId - ID do usuário
 * @returns Promise com array de conversas
 */
export async function listConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Conversations] Erro ao listar conversas:', error);
      throw new Error('Erro ao listar conversas');
    }

    console.log('[Conversations] Conversas listadas:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('[Conversations] Erro ao listar conversas:', error);
    throw error;
  }
}

/**
 * Obtém uma conversa específica com todas as mensagens
 * @param conversationId - ID da conversa
 * @returns Promise com a conversa e suas mensagens
 */
export async function getConversation(
  conversationId: string
): Promise<ConversationWithMessages | null> {
  try {
    // Buscar conversa
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('[Conversations] Erro ao buscar conversa:', convError);
      throw new Error('Erro ao buscar conversa');
    }

    // Buscar mensagens
    const { data: messages, error: msgError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('[Conversations] Erro ao buscar mensagens:', msgError);
      throw new Error('Erro ao buscar mensagens');
    }

    console.log('[Conversations] Conversa carregada com', messages?.length || 0, 'mensagens');

    return {
      ...conversation,
      messages: (messages || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant'
      })),
    };
  } catch (error) {
    console.error('[Conversations] Erro ao obter conversa:', error);
    throw error;
  }
}

/**
 * Salva uma mensagem em uma conversa
 * @param conversationId - ID da conversa
 * @param role - Papel da mensagem (user ou assistant)
 * @param content - Conteúdo da mensagem
 * @returns Promise com a mensagem salva
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          conversation_id: conversationId,
          role,
          content,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[Conversations] Erro ao salvar mensagem:', error);
      throw new Error('Erro ao salvar mensagem');
    }

    console.log('[Conversations] Mensagem salva:', role);
    return {
      ...data,
      role: data.role as 'user' | 'assistant'
    };
  } catch (error) {
    console.error('[Conversations] Erro ao salvar mensagem:', error);
    throw error;
  }
}

/**
 * Atualiza o título de uma conversa
 * @param conversationId - ID da conversa
 * @param title - Novo título
 * @returns Promise com a conversa atualizada
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<Conversation> {
  try {
    const { data, error } = await supabase
      .from('chat_conversations')
      .update({ title } as any)
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('[Conversations] Erro ao atualizar título:', error);
      throw new Error('Erro ao atualizar título');
    }

    console.log('[Conversations] Título atualizado:', title);
    return data;
  } catch (error) {
    console.error('[Conversations] Erro ao atualizar título:', error);
    throw error;
  }
}

/**
 * Deleta uma conversa e todas as suas mensagens
 * @param conversationId - ID da conversa
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('[Conversations] Erro ao deletar conversa:', error);
      throw new Error('Erro ao deletar conversa');
    }

    console.log('[Conversations] Conversa deletada:', conversationId);
  } catch (error) {
    console.error('[Conversations] Erro ao deletar conversa:', error);
    throw error;
  }
}

/**
 * Limpa todas as mensagens de uma conversa
 * @param conversationId - ID da conversa
 */
export async function clearConversationMessages(conversationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('[Conversations] Erro ao limpar mensagens:', error);
      throw new Error('Erro ao limpar mensagens');
    }

    console.log('[Conversations] Mensagens limpas:', conversationId);
  } catch (error) {
    console.error('[Conversations] Erro ao limpar mensagens:', error);
    throw error;
  }
}

/**
 * Gera um título automático para a conversa baseado na primeira mensagem
 * @param firstMessage - Primeira mensagem da conversa
 * @returns Título sugerido
 */
export function generateConversationTitle(firstMessage: string): string {
  // Limita o título a 50 caracteres
  const maxLength = 50;
  let title = firstMessage.trim();

  if (title.length > maxLength) {
    title = title.substring(0, maxLength) + '...';
  }

  return title;
}

/**
 * Obtém ou cria uma conversa ativa para o usuário
 * Se não existir nenhuma conversa, cria uma nova
 * @param userId - ID do usuário
 * @returns Promise com a conversa ativa
 */
export async function getOrCreateActiveConversation(
  userId: string
): Promise<Conversation> {
  try {
    // Busca a conversa mais recente
    const conversations = await listConversations(userId);

    if (conversations.length > 0) {
      return conversations[0];
    }

    // Se não houver conversas, cria uma nova
    return await createConversation(userId);
  } catch (error) {
    console.error('[Conversations] Erro ao obter/criar conversa ativa:', error);
    throw error;
  }
}

/**
 * Carrega mensagens de uma conversa de forma paginada
 * @param conversationId - ID da conversa
 * @param limit - Número de mensagens por página
 * @param offset - Offset para paginação
 * @returns Promise com array de mensagens
 */
export async function loadMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Conversations] Erro ao carregar mensagens:', error);
      throw new Error('Erro ao carregar mensagens');
    }

    console.log('[Conversations] Mensagens carregadas:', data?.length || 0);
    return (data || []).map(msg => ({
      ...msg,
      role: msg.role as 'user' | 'assistant'
    }));
  } catch (error) {
    console.error('[Conversations] Erro ao carregar mensagens:', error);
    throw error;
  }
}

/**
 * Obtém estatísticas da conversa
 * @param conversationId - ID da conversa
 * @returns Promise com estatísticas
 */
export async function getConversationStats(conversationId: string): Promise<{
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
}> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('[Conversations] Erro ao obter estatísticas:', error);
      throw new Error('Erro ao obter estatísticas');
    }

    const stats = {
      totalMessages: data?.length || 0,
      userMessages: data?.filter(m => m.role === 'user').length || 0,
      assistantMessages: data?.filter(m => m.role === 'assistant').length || 0,
    };

    console.log('[Conversations] Estatísticas:', stats);
    return stats;
  } catch (error) {
    console.error('[Conversations] Erro ao obter estatísticas:', error);
    throw error;
  }
}
