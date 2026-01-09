/**
 * useConversations - Hook para gerenciar histórico de conversas
 * Persiste em localStorage e sincroniza com backend
 */
import { useState, useEffect, useCallback } from 'react';

export interface Conversation {
    id: string;
    title: string;
    messages: any[];
    mode: 'chat' | 'multi-modal' | 'live';
    createdAt: number;
    updatedAt: number;
}

const STORAGE_KEY = 'lia_conversations';
const ACTIVE_CONV_KEY = 'lia_active_conversation';

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Carregar do localStorage ao iniciar
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setConversations(parsed);
                console.log(`📋 ${parsed.length} conversas carregadas do localStorage`);
            }

            const activeId = localStorage.getItem(ACTIVE_CONV_KEY);
            if (activeId) {
                setActiveConversationId(activeId);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar conversas:', error);
        }
    }, []);

    // Salvar no localStorage sempre que conversas mudarem
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        } catch (error) {
            console.error('❌ Erro ao salvar conversas:', error);
        }
    }, [conversations]);

    // Salvar conversa ativa
    useEffect(() => {
        if (activeConversationId) {
            localStorage.setItem(ACTIVE_CONV_KEY, activeConversationId);
        }
    }, [activeConversationId]);

    // Obter conversa ativa
    const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

    // Criar nova conversa
    const createConversation = useCallback((mode: 'chat' | 'multi-modal' | 'live' = 'chat') => {
        const now = Date.now();
        const newConv: Conversation = {
            id: `conv_${now}_${Math.random().toString(36).substr(2, 9)}`,
            title: `Conversa de ${new Date(now).toLocaleDateString('pt-BR')} - ${new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            messages: [],
            mode,
            createdAt: now,
            updatedAt: now
        };

        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
        console.log(`✅ Nova conversa criada: ${newConv.title}`);

        return newConv;
    }, []);

    // Selecionar conversa
    const selectConversation = useCallback((id: string) => {
        const conv = conversations.find(c => c.id === id);
        if (conv) {
            setActiveConversationId(id);
            console.log(`📖 Conversa selecionada: ${conv.title}`);
        }
    }, [conversations]);

    // Renomear conversa
    const renameConversation = useCallback((id: string, title: string) => {
        setConversations(prev => prev.map(c =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
        ));
        console.log(`✏️ Conversa renomeada: ${title}`);
    }, []);

    // Excluir conversa
    const deleteConversation = useCallback((id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));

        // Se a conversa excluída era a ativa, selecionar outra
        if (activeConversationId === id) {
            const remaining = conversations.filter(c => c.id !== id);
            if (remaining.length > 0) {
                setActiveConversationId(remaining[0].id);
            } else {
                setActiveConversationId(null);
            }
        }

        console.log(`🗑️ Conversa excluída: ${id}`);
    }, [activeConversationId, conversations]);

    // Adicionar mensagem à conversa ativa
    const addMessage = useCallback((message: any) => {
        if (!activeConversationId) return;

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
                : c
        ));
    }, [activeConversationId]);

    // Atualizar mensagens da conversa ativa
    const updateMessages = useCallback((messages: any[]) => {
        if (!activeConversationId) return;

        setConversations(prev => prev.map(c =>
            c.id === activeConversationId
                ? { ...c, messages, updatedAt: Date.now() }
                : c
        ));
    }, [activeConversationId]);

    // Obter mensagens da conversa ativa
    const getActiveMessages = useCallback(() => {
        return activeConversation?.messages || [];
    }, [activeConversation]);

    return {
        conversations,
        activeConversationId,
        activeConversation,
        createConversation,
        selectConversation,
        renameConversation,
        deleteConversation,
        addMessage,
        updateMessages,
        getActiveMessages
    };
}
