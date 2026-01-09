// ======================================================================
// 🧠 LIA Context - MENTE ÚNICA CENTRALIZADA
// ======================================================================
// A LIA existe UMA ÚNICA VEZ para todos os painéis
// Os painéis são apenas interfaces diferentes para a mesma mente
// ======================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { socketService } from './services/socketService';
import { backendService, Memory } from './services/backendService';
import { geminiLiveService, GeminiLiveSession, GeminiLiveEvent } from './services/geminiLiveService';
import { dynamicContentManager, DynamicContainer } from './services/dynamicContentManager';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';

// ======================================================================
// TYPES
// ======================================================================

export interface Message {
    id: string;
    type: 'user' | 'lia';
    content: string;
    timestamp: number;
    attachments?: {
        name: string;
        type: 'image' | 'document' | 'video' | 'audio' | 'other';
        url?: string;
    }[];
}

// ======================================================================
// CONVERSATION - Cada conversa tem seu próprio contexto isolado
// ======================================================================

export interface Conversation {
    id: string;
    mode: 'chat' | 'multimodal' | 'live';
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

// Tipos para conteúdo dinâmico (gráficos, tabelas, imagens, JSON)
export type DynamicContentType = 'chart' | 'table' | 'image' | 'json' | 'text' | 'analysis' | 'none';

export interface ChartData {
    chartType: 'line' | 'bar' | 'pie' | 'area';
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color?: string;
    }[];
}

export interface TableData {
    headers: string[];
    rows: (string | number)[][];
}

export interface ImageData {
    url: string;
    caption?: string;
    alt?: string;
}

export interface AnalysisData {
    title: string;
    summary: string;
    details: string[];
    insights?: string[];
}

export interface DynamicContent {
    type: DynamicContentType;
    title?: string;
    data: ChartData | TableData | ImageData | AnalysisData | string | any;
    timestamp?: number;
}

export interface LIAState {
    // Conexão
    isConnected: boolean;
    conversationId: string | null;

    // ======================================================================
    // SISTEMA DE CONVERSAS ISOLADAS (REATORADO)
    // ======================================================================
    conversations: { [id: string]: Conversation };
    activeConversationIdByMode: Record<'chat' | 'multimodal' | 'live', string | null>;
    currentConversationId: string | null; // Mantido para compatibilidade, aponta para o modo chat por padrão

    // Funções de Conversa
    createConversation: (mode: 'chat' | 'multimodal' | 'live') => Promise<Conversation>;
    switchConversation: (id: string, mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
    renameConversation: (id: string, title: string) => void;
    deleteConversation: (id: string) => void;
    refreshConversations: () => Promise<void>;
    getCurrentMessages: () => Message[];

    // ======================================================================
    // SISTEMA DE MENSAGENS POR ESCOPO (mode:conversationId)
    // ======================================================================
    activeScope: string | null; // Formato: "live:conv_123" ou "multimodal:conv_456"
    messagesByScope: Record<string, Message[]>; // Mensagens isoladas por escopo

    // API de Mensagens por Escopo
    getMessagesForScope: (scopeKey: string) => Message[];
    addMessageToScope: (scopeKey: string, message: Message) => void;
    clearScopeMessages: (scopeKey: string) => void;
    setActiveScope: (scopeKey: string | null) => void;
    getScopeKey: (mode: 'chat' | 'multimodal' | 'live', conversationId: string) => string;

    // Mensagens (da conversa ativa - LEGADO, usar getMessagesForScope)
    messages: Message[];

    // ======================================================================
    // ESTADOS POR ESCOPO (scope = mode:conversationId)
    // ======================================================================
    typingByScope: Record<string, boolean>;
    isGeneratingImageByScope: Record<string, boolean>;
    getTypingForScope: (scopeKey: string) => boolean;
    setTypingForScope: (scopeKey: string, isTyping: boolean) => void;
    setGeneratingImageForScope: (scopeKey: string, generating: boolean) => void;

    // Voz e Estados
    voicePersonality: 'clara' | 'viva' | 'firme';
    isSpeaking: boolean;
    isListening: boolean;
    isLiveActive: boolean; // Gemini Live ativo
    isInitialLoadDone: boolean; // Sincronização inicial concluída

    // Estados de UI e Processamento
    isTyping: boolean; // Global, ativado por socket lia-typing
    isThinking: boolean; // Para animação LuminnusLoading
    isProcessingUpload: boolean;
    isProcessingDynamic: boolean;
    isCameraActive: boolean;

    // Memórias
    memories: Memory[];

    // Conteúdo Dinâmico (SISTEMA DE CONTAINERS)
    dynamicContent: DynamicContent | null;
    dynamicContainers: DynamicContainer[];
    setDynamicContent: (content: DynamicContent | null) => void;
    addDynamicContainer: (type: any, data: any) => string;
    removeDynamicContainer: (id: string) => void;
    clearDynamicContent: () => void;
    clearDynamicContainers: () => void;
    setIsProcessingUpload: (processing: boolean) => void;

    // Métodos de Mensagem
    addMessage: (message: Message, scopeKey?: string) => void;
    sendTextMessage: (text: string, mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
    sendMessageWithFiles: (text: string, files: { file: File; preview?: string }[], mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
    sendAudioMessage: (audioBlob: Blob, mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
    transcribeAndFillInput: (audioBlob: Blob) => Promise<string | null>;
    analyzeFile: (file: File) => Promise<void>;

    // Métodos de Voz e Live
    setVoicePersonality: (personality: 'clara' | 'viva' | 'firme') => void;
    startListening: () => void;
    stopListening: () => void;

    // Métodos Live (Gemini Live)
    startLiveMode: () => Promise<void>;
    stopLiveMode: () => Promise<void>;

    // Métodos de Memória
    loadMemories: () => Promise<void>;
    saveMemory: (content: string, category?: string) => Promise<void>;
    deleteMemory: (id: string) => Promise<void>;

    // Estudo do Usuário
    userId: string | null;
    tenantId: string | null;
    plan: string | null;

    // Outros
    clearMessages: () => void;
}

// ======================================================================
// CONTEXT
// ======================================================================

const LIAContext = createContext<LIAState | null>(null);

// ======================================================================
// PROVIDER
// ======================================================================

interface LIAProviderProps {
    children: ReactNode;
}

export function LIAProvider({ children }: LIAProviderProps) {
    // Estado básico
    const [isConnected, setIsConnected] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [voicePersonality, setVoicePersonalityState] = useState<'clara' | 'viva' | 'firme'>('viva');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isProcessingUpload, setIsProcessingUpload] = useState(false);
    const [isProcessingDynamic, setIsProcessingDynamic] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [dynamicContent, setDynamicContent] = useState<DynamicContent | null>(null);
    const [dynamicContainers, setDynamicContainers] = useState<DynamicContainer[]>([]);

    // Sincronizar com DynamicContentManager
    useEffect(() => {
        const updateContainers = (containers: DynamicContainer[]) => {
            setDynamicContainers(containers);
            // Atualizar dynamicContent legado se houver containers
            if (containers.length > 0) {
                const latest = containers[containers.length - 1];
                setDynamicContent({
                    type: latest.content.type as any,
                    data: latest.content.data,
                    timestamp: latest.timestamp
                });
            } else {
                setDynamicContent(null);
            }
        };

        dynamicContentManager.addListener(updateContainers);
        return () => dynamicContentManager.removeListener(updateContainers);
    }, []);

    // Estado do Usuário
    const { user, initialized: authInitialized, plan: authPlan } = useDashboardAuth();
    const [userId, setUserId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [plan, setPlanState] = useState<string | null>(null);
    const userIdRef = useRef<string | null>(null);
    const tenantIdRef = useRef<string | null>(null);

    // ======================================================================
    // ESTADOS POR ESCOPO (scope = mode:conversationId)
    // ======================================================================
    const [typingByScope, setTypingByScope] = useState<Record<string, boolean>>({});
    const [isGeneratingImageByScope, setIsGeneratingImageByScope] = useState<Record<string, boolean>>({});
    const typingByScopeRef = useRef(typingByScope);
    typingByScopeRef.current = typingByScope;

    // ======================================================================
    // SISTEMA DE CONVERSAS ISOLADAS - REATORADO
    // ======================================================================
    const [conversations, setConversations] = useState<{ [id: string]: Conversation }>({});
    const [activeConversationIdByMode, setActiveConversationIdByMode] = useState<Record<'chat' | 'multimodal' | 'live', string | null>>({
        chat: null,
        multimodal: null,
        live: null
    });
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    // ======================================================================
    // SISTEMA DE MENSAGENS POR ESCOPO (mode:conversationId)
    // ======================================================================
    const [messagesByScope, setMessagesByScope] = useState<Record<string, Message[]>>({});
    const [activeScope, setActiveScopeState] = useState<string | null>(null);

    // Refs para evitar closures desatualizadas
    const messagesRef = useRef<Message[]>([]);
    const conversationsRef = useRef<{ [id: string]: Conversation }>({});
    const currentIdRef = useRef<string | null>(null);
    const activeIdsByModeRef = useRef<Record<'chat' | 'multimodal' | 'live', string | null>>({ chat: null, multimodal: null, live: null });
    const messagesByScopeRef = useRef<Record<string, Message[]>>({});
    const activeScopeRef = useRef<string | null>(null);
    const creatingRef = useRef<Record<string, boolean>>({}); // Trava de criação concorrente

    // CRITICAL: Refs for functions to stabilize useEffect dependencies
    const addToScopeRef = useRef<((message: Message, mode?: 'chat' | 'multimodal' | 'live', convId?: string) => void) | null>(null);
    const playAudioRef = useRef<((audioData: number[]) => void) | null>(null);
    const loadMemoriesRef = useRef<(() => Promise<void>) | null>(null);

    // Sync tenant ID / User ID refs
    useEffect(() => {
        userIdRef.current = userId;
        tenantIdRef.current = tenantId;
    }, [userId, tenantId]);

    // v2.6: MENTE ÚNICA - Sincronizar Usuário e Autenticação do multi-tenant
    useEffect(() => {
        const syncUser = () => {
            const storedAuth = localStorage.getItem('sb-dashboard-client-auth');
            if (storedAuth) {
                try {
                    const authData = JSON.parse(storedAuth);
                    const uId = authData.user?.id || null;
                    const userPlan = authData.user?.app_metadata?.plan || null;
                    if (uId) {
                        setUserId(uId);
                        setTenantId(uId); // Em dev usamos o mesmo ID para tenant
                        setPlanState(userPlan);
                        console.log('👤 [LIAContext] Usuário sincronizado:', uId, 'Plano:', userPlan);

                        // Sincronizar com o socket para voz/realtime (usando import estático)
                        if (currentIdRef.current) {
                            socketService.registerConversation(currentIdRef.current);
                        }
                    }
                } catch (e) {
                    console.warn('[LIAContext] Falha ao sincronizar usuário do localStorage');
                }
            }
        };

        syncUser();
        // Listener para o evento disparado pelo LiaOS quando o handshake completa
        window.addEventListener('lia-auth-updated', syncUser);
        return () => window.removeEventListener('lia-auth-updated', syncUser);
    }, []);

    // Manter refs sincronizadas
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    useEffect(() => {
        currentIdRef.current = currentConversationId;
    }, [currentConversationId]);

    // Sync messagesByScope ref
    useEffect(() => {
        messagesByScopeRef.current = messagesByScope;
    }, [messagesByScope]);

    // Sync activeScope ref
    useEffect(() => {
        activeScopeRef.current = activeScope;
    }, [activeScope]);

    // Sync mode-specific active IDs ref
    useEffect(() => {
        activeIdsByModeRef.current = activeConversationIdByMode;
    }, [activeConversationIdByMode]);

    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    useEffect(() => {
        tenantIdRef.current = tenantId;
    }, [tenantId]);

    // ======================================================================
    // API DE MENSAGENS POR ESCOPO
    // ======================================================================

    // Criar scopeKey no formato "mode:conversationId"
    const getScopeKey = useCallback((mode: 'chat' | 'multimodal' | 'live', convId: string): string => {
        return `${mode}:${convId}`;
    }, []);

    // Obter mensagens de um escopo específico
    const getMessagesForScope = useCallback((scopeKey: string): Message[] => {
        return messagesByScopeRef.current[scopeKey] || [];
    }, []);

    // Adicionar mensagem a um escopo
    const addMessageToScope = useCallback((scopeKey: string, message: Message) => {
        setMessagesByScope(prev => {
            const scopeMessages = prev[scopeKey] || [];
            const updated = { ...prev, [scopeKey]: [...scopeMessages, message] };

            // Salvar no localStorage por escopo
            try {
                localStorage.setItem(`lia_scope_${scopeKey}`, JSON.stringify(updated[scopeKey]));
            } catch (e) {
                console.error('Erro ao salvar mensagens do escopo:', e);
            }

            return updated;
        });
        console.log(`💬 [Scope] Mensagem adicionada ao escopo: ${scopeKey}`);
    }, []);

    // Limpar mensagens de um escopo
    const clearScopeMessages = useCallback((scopeKey: string) => {
        setMessagesByScope(prev => {
            const updated = { ...prev };
            delete updated[scopeKey];

            // Limpar localStorage
            try {
                localStorage.removeItem(`lia_scope_${scopeKey}`);
            } catch (e) {
                console.error('Erro ao limpar escopo:', e);
            }

            return updated;
        });
        console.log(`🗑️ [Scope] Mensagens limpas do escopo: ${scopeKey}`);
    }, []);

    // Definir escopo ativo (modo:conversa atual)
    const setActiveScope = useCallback((scopeKey: string | null) => {
        setActiveScopeState(scopeKey);
        activeScopeRef.current = scopeKey;

        // Carregar mensagens deste escopo se existirem em localStorage
        if (scopeKey) {
            try {
                const stored = localStorage.getItem(`lia_scope_${scopeKey}`);
                if (stored) {
                    const msgs = JSON.parse(stored);
                    setMessagesByScope(prev => ({ ...prev, [scopeKey]: msgs }));
                    console.log(`📂 [Scope] ${msgs.length} mensagens carregadas do escopo: ${scopeKey}`);
                }
            } catch (e) {
                console.error('Erro ao carregar escopo:', e);
            }
        }
    }, []);

    const refreshConversations = useCallback(async () => {
        if (!userId) {
            setIsInitialLoadDone(true);
            return;
        }

        setIsInitialLoadDone(false);

        try {
            console.log('🔄 [LIAContext] Buscando conversas do servidor...');
            const serverConvs = await backendService.getConversations();

            if (serverConvs && serverConvs.length > 0) {
                const convsMap: { [id: string]: Conversation } = {};

                // Converter formato do banco para o formato do App
                serverConvs.forEach(c => {
                    convsMap[c.id] = {
                        id: c.id,
                        title: c.title,
                        mode: c.mode || 'chat',
                        messages: [], // Serão carregadas sob demanda ou já filtradas
                        createdAt: c.createdAt || Date.now(),
                        updatedAt: c.updatedAt || Date.now()
                    };
                });

                setConversations(convsMap);
                conversationsRef.current = convsMap;

                // Definir conversa ativa inicial por modo (baseado na última atualizada)
                const activeIds = { ...activeIdsByModeRef.current };
                Object.values(convsMap).forEach(c => {
                    const m = c.mode as 'chat' | 'multimodal' | 'live';
                    if (!activeIds[m] || c.updatedAt > (convsMap[activeIds[m]!]?.updatedAt || 0)) {
                        activeIds[m] = c.id;
                    }
                });

                setActiveConversationIdByMode(activeIds);
                activeIdsByModeRef.current = activeIds;

                // Se houver uma conversa de chat ativa, carregar mensagens dela
                if (activeIds.chat && !messagesByScopeRef.current[`chat:${activeIds.chat}`]) {
                    const msgs = await backendService.getMessages(activeIds.chat);
                    const scopeKey = `chat:${activeIds.chat}`;
                    const formattedMsgs: Message[] = msgs.map(m => ({
                        id: m.id,
                        type: (m.role === 'assistant' ? 'lia' : 'user') as 'lia' | 'user',
                        content: m.content,
                        timestamp: new Date(m.created_at).getTime(),
                        attachments: m.attachments
                    }));

                    setMessagesByScope(prev => ({ ...prev, [scopeKey]: formattedMsgs }));
                    messagesByScopeRef.current = { ...messagesByScopeRef.current, [scopeKey]: formattedMsgs };
                    setCurrentConversationId(activeIds.chat);
                    currentIdRef.current = activeIds.chat;
                    setActiveScope(scopeKey);
                }

                console.log(`✅ ${serverConvs.length} conversas sincronizadas do servidor.`);
            }

            // Fallback para LocalStorage se falhar ou não houver usuário (dentro do try/catch principal)
            const stored = localStorage.getItem('lia_conversations_v4');
            if (stored && Object.keys(conversationsRef.current).length === 0) {
                const parsed = JSON.parse(stored);
                // ... aplicar fallback se necessário (opcional se o backend for soberano)
            }

        } catch (error) {
            console.error('❌ Erro ao sincronizar com servidor:', error);
        } finally {
            setIsInitialLoadDone(true);
        }
    }, [userId]);

    useEffect(() => {
        refreshConversations();
    }, [refreshConversations]);

    // Função para salvar no localStorage e Backend
    const saveToStorage = useCallback(async (
        convs: { [id: string]: Conversation },
        currentId: string | null,
        activeIds: Record<'chat' | 'multimodal' | 'live', string | null>
    ) => {
        try {
            // LocalStorage (Sempre imediato)
            localStorage.setItem('lia_conversations_v4', JSON.stringify({
                conversations: convs,
                currentId: currentId,
                activeIdsByMode: activeIds
            }));

            // Backend (Opcional/Sync) - Apenas se houver ID atual e modo
            if (currentId && convs[currentId]) {
                const conv = convs[currentId];
                backendService.saveConversation({
                    id: conv.id,
                    title: conv.title,
                    mode: conv.mode as any,
                    userId: userIdRef.current || undefined
                }).catch(console.error);
            }

        } catch (error) {
            console.error('Erro ao salvar:', error);
        }
    }, []);

    // Salvar conversa atual (atualiza mensagens no objeto)
    const saveCurrentConversation = useCallback((mode?: 'chat' | 'multimodal' | 'live') => {
        const activeIds = activeIdsByModeRef.current;
        const currentConvs = conversationsRef.current;
        const messagesByScope = messagesByScopeRef.current;

        let updatedConvs = { ...currentConvs };
        let hasChanges = false;

        // Se informou modo, salvar apenas esse modo
        // Caso contrário, tenta salvar todos os ativos
        const modesToSave = mode ? [mode] : (['chat', 'multimodal', 'live'] as const);

        modesToSave.forEach(m => {
            const convId = activeIds[m];
            if (convId && currentConvs[convId]) {
                const scopeKey = `${m}:${convId}`;
                const scopeMsgs = messagesByScope[scopeKey] || [];

                updatedConvs[convId] = {
                    ...currentConvs[convId],
                    messages: scopeMsgs,
                    updatedAt: Date.now()
                };
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setConversations(updatedConvs);
            conversationsRef.current = updatedConvs;
            saveToStorage(updatedConvs, currentIdRef.current, activeIds);
            console.log(`💾 Conversas ativas salvas.`);
        }
    }, [saveToStorage]);

    // Salvar ao desmontar ou mudar de aba
    useEffect(() => {
        const handleBeforeUnload = () => {
            saveCurrentConversation();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            saveCurrentConversation();
        };
    }, [saveCurrentConversation]);

    // Criar nova conversa (Mente única, histórico isolado por modo)
    const createConversation = useCallback(async (mode: 'chat' | 'multimodal' | 'live') => {
        if (creatingRef.current[mode]) return; // Já criando este modo
        creatingRef.current[mode] = true;

        // Salvar conversa atual do modo (se houver)
        saveCurrentConversation(mode);

        const now = Date.now();
        const title = `Conversa ${new Date(now).toLocaleDateString('pt-BR')} ${new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        try {
            // Tentar criar no backend primeiro para ter persistência
            const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, title, userId: userIdRef.current })
            });

            const data = await resp.json();
            const newConvId = data.conversation?.id || `conv_${now}_${Math.random().toString(36).substr(2, 9)}`;

            const newConv: Conversation = {
                id: newConvId,
                mode,
                title: title,
                messages: [],
                createdAt: now,
                updatedAt: now
            };

            const updatedConvs = { ...conversationsRef.current, [newConv.id]: newConv };
            setConversations(updatedConvs);
            conversationsRef.current = updatedConvs;

            // Atualizar ID ativo para o modo específico
            setActiveConversationIdByMode(prev => {
                const updated = { ...prev, [mode]: newConv.id };
                activeIdsByModeRef.current = updated;

                if (mode === 'chat') {
                    setCurrentConversationId(newConv.id);
                    currentIdRef.current = newConv.id;
                }

                return updated;
            });

            // Registrar no socket
            socketService.registerConversation(newConv.id);

            const scopeKey = `${mode}:${newConv.id}`;
            setActiveScope(scopeKey);

            saveToStorage(updatedConvs, currentIdRef.current, activeIdsByModeRef.current);
            console.log(`✅ Nova conversa criada para ${mode}: ${newConv.title}`);

            return newConv;

        } catch (err) {
            console.error('❌ Erro ao criar conversa no backend:', err);
            // Fallback local se backend falhar
            const localId = `conv_${now}_${Math.random().toString(36).substr(2, 9)}`;
            const newConv: Conversation = {
                id: localId,
                mode,
                title,
                messages: [],
                createdAt: now,
                updatedAt: now
            };
            // ... resto da lógica de fallback se necessário, mas fetch acima é preferível
            return newConv;
        } finally {
            creatingRef.current[mode] = false;
        }
    }, [saveCurrentConversation, saveToStorage, setActiveScope, userId]);

    // Trocar de conversa
    const switchConversation = useCallback(async (id: string, mode?: 'chat' | 'multimodal' | 'live') => {
        const conv = conversationsRef.current[id];
        if (!conv) return;

        const targetMode = mode || conv.mode;

        // PRIMEIRO: Salvar conversa atual do modo
        saveCurrentConversation(targetMode);

        // SEGUNDO: Carregar mensagens do backend se as mensagens locais estiverem vazias
        const scopeKey = `${targetMode}:${id}`;
        if ((messagesByScopeRef.current[scopeKey] || []).length === 0) {
            try {
                console.log(`🔄 [LIAContext] Carregando histórico remoto para conversa ${id}...`);
                const msgs = await backendService.getMessages(id);
                if (msgs && msgs.length > 0) {
                    const formattedMsgs: Message[] = msgs.map(m => ({
                        id: m.id,
                        type: (m.role === 'assistant' ? 'lia' : 'user') as 'lia' | 'user',
                        content: m.content,
                        timestamp: new Date(m.created_at).getTime(),
                        attachments: m.attachments
                    }));
                    setMessagesByScope(prev => ({ ...prev, [scopeKey]: formattedMsgs }));
                    messagesByScopeRef.current = { ...messagesByScopeRef.current, [scopeKey]: formattedMsgs };
                }
            } catch (e) {
                console.error('❌ Erro ao carregar mensagens do backend na troca:', e);
            }
        }

        setActiveConversationIdByMode(prev => {
            const updated = { ...prev, [targetMode]: id };
            activeIdsByModeRef.current = updated;

            // v2.6: SENPRE atualizar ID atual/global para que outros serviços (como Gemini Live)
            // saibam qual é a conversa visível na tela no momento
            setCurrentConversationId(id);
            currentIdRef.current = id;

            return updated;
        });

        setActiveScope(scopeKey);

        // Registrar no socket
        socketService.registerConversation(id);

        saveToStorage(conversationsRef.current, currentIdRef.current, activeIdsByModeRef.current);

        // v2.6: Sincronizar com o serviço Gemini Live se ele estiver ativo
        // Isso garante que a LIA saiba que mudamos de contexto
        geminiLiveService.setSessionConversationId(id);
        geminiLiveService.setUIMode(targetMode);

        console.log(`📖 Conversa trocada em ${targetMode}: ${conv.title}`);

    }, [saveCurrentConversation, saveToStorage, setActiveScope]);

    // Renomear conversa
    const renameConversation = useCallback((id: string, title: string) => {
        const updatedConvs = {
            ...conversationsRef.current,
            [id]: { ...conversationsRef.current[id], title }
        };
        setConversations(updatedConvs);
        conversationsRef.current = updatedConvs;
        saveToStorage(updatedConvs, currentIdRef.current, activeIdsByModeRef.current);
        console.log(`✏️ Conversa renomeada: ${title}`);
    }, [saveToStorage]);

    // Deletar conversa
    const deleteConversation = useCallback((id: string) => {
        const { [id]: deleted, ...rest } = conversationsRef.current;
        setConversations(rest);
        conversationsRef.current = rest;

        // Se era a conversa ativa, limpar
        if (currentIdRef.current === id) {
            setCurrentConversationId(null);
            currentIdRef.current = null;
            setMessages([]);
            messagesRef.current = [];
        }

        // Remover dos activeIdsByMode se for o ID ativo em algum modo
        setActiveConversationIdByMode(prev => {
            let updated = { ...prev };
            let changed = false;
            for (const modeKey in updated) {
                if (updated[modeKey as keyof typeof updated] === id) {
                    updated = { ...updated, [modeKey]: null };
                    changed = true;
                }
            }
            if (changed) {
                activeIdsByModeRef.current = updated;
                return updated;
            }
            return prev;
        });

        // Limpar mensagens do escopo se existirem
        const convToDelete = deleted;
        if (convToDelete) {
            const scopeKey = `${convToDelete.mode}:${id}`;
            clearScopeMessages(scopeKey);
        }

        saveToStorage(rest, currentIdRef.current, activeIdsByModeRef.current);
        backendService.deleteConversation(id).catch(e => console.error('❌ Erro ao deletar no backend:', e));
        console.log(`🗑️ Conversa deletada: ${id}`);
    }, [saveToStorage, clearScopeMessages]);

    // Obter mensagens da conversa atual
    const getCurrentMessages = useCallback((): Message[] => {
        return messagesRef.current;
    }, [messages]);

    // ========================================
    // ENSURE CONVERSATION EXISTS - Cria automaticamente se não existir
    // Deve ser chamado ANTES de adicionar qualquer mensagem
    // ========================================
    const ensureConversationExists = useCallback((mode: 'chat' | 'multimodal' | 'live') => {
        const activeIds = activeIdsByModeRef.current;

        if (!activeIds[mode]) {
            console.log(`📝 AUTO-CREATE: Criando conversa para ${mode}...`);
            const now = Date.now();
            const newConv: Conversation = {
                id: `conv_${now}_${Math.random().toString(36).substr(2, 9)}`,
                mode,
                title: `Conversa ${new Date(now).toLocaleDateString('pt-BR')} ${new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                messages: [],
                createdAt: now,
                updatedAt: now
            };

            const updatedConvs = { ...conversationsRef.current, [newConv.id]: newConv };
            setConversations(updatedConvs);
            conversationsRef.current = updatedConvs;

            setActiveConversationIdByMode(prev => {
                const updated = { ...prev, [mode]: newConv.id };
                activeIdsByModeRef.current = updated;
                return updated;
            });

            saveToStorage(updatedConvs, currentIdRef.current, activeIdsByModeRef.current);
            console.log(`✅ Conversa AUTO-CRIADA para ${mode}: ${newConv.title}`);
            return newConv.id;
        }
        return activeIds[mode];
    }, [saveToStorage]);

    // Refs
    const audioPlayingRef = useRef<HTMLAudioElement | null>(null);
    const geminiSessionRef = useRef<GeminiLiveSession | null>(null);

    // ======================================================================

    // ======================================================================
    // DYNAMIC CONTAINERS - Múltiplos containers gerenciados
    // ======================================================================

    // Sincronizar com o dynamicContentManager
    useEffect(() => {
        const handleContainersChange = (containers: DynamicContainer[]) => {
            setDynamicContainers(containers);
        };

        // Adicionar listener
        dynamicContentManager.addListener(handleContainersChange);

        // Carregar estado inicial
        setDynamicContainers(dynamicContentManager.getAllContainers());

        // Cleanup
        return () => {
            dynamicContentManager.removeListener(handleContainersChange);
        };
    }, []);

    // Adicionar container dinâmico
    const addDynamicContainer = useCallback((type: any, data: any): string => {
        const containerId = dynamicContentManager.addDynamicContent(type, data);
        console.log(`📦 Container adicionado via LIAContext: ${containerId}`);
        return containerId;
    }, []);

    // Remover container
    const removeDynamicContainer = useCallback((id: string) => {
        dynamicContentManager.removeContainer(id);
        console.log(`🗑️ Container removido via LIAContext: ${id}`);
    }, []);

    // Limpar todos os containers
    const clearDynamicContainers = useCallback(() => {
        dynamicContentManager.clearAll();
        console.log('🧹 Todos os containers limpos');
    }, []);

    // ======================================================================
    // MÉTODOS DE MEMÓRIA (Definidos antes do Socket para evitar forward reference)
    // ======================================================================

    const loadMemories = useCallback(async () => {
        try {
            const loadedMemories = await backendService.getMemories();
            setMemories(loadedMemories);
            console.log(`💾 ${loadedMemories.length} memórias carregadas`);
        } catch (error) {
            console.error('❌ Erro ao carregar memórias:', error);
        }
    }, []);

    // ======================================================================
    // MÉTODOS DE VOZ / ÁUDIO
    // ======================================================================

    const playAudio = useCallback((audioData: number[]) => {
        try {
            setIsSpeaking(true);
            const uint8Array = new Uint8Array(audioData);
            const blob = new Blob([uint8Array], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioPlayingRef.current = audio;
            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
                audioPlayingRef.current = null;
            };
            audio.onerror = (err) => {
                console.error('❌ Erro ao tocar áudio:', err);
                setIsSpeaking(false);
                URL.revokeObjectURL(url);
                audioPlayingRef.current = null;
            };
            audio.play().catch((err) => {
                console.error('❌ Erro ao executar áudio:', err);
                setIsSpeaking(false);
            });
        } catch (err) {
            console.error('❌ Erro ao processar áudio:', err);
            setIsSpeaking(false);
        }
    }, []);

    // Helper para adicionar mensagem a um escopo específico ou ao ativo
    const addToScope = useCallback((message: Message, mode?: 'chat' | 'multimodal' | 'live', convId?: string) => {
        let scopeKey: string | null = null;
        if (mode && convId) {
            scopeKey = `${mode}:${convId}`;
        } else {
            scopeKey = activeScopeRef.current;
        }
        if (scopeKey) {
            addMessageToScope(scopeKey, message);
        } else {
            console.warn('⚠️ [Scope] Mensagem recebida mas nenhum escopo definido!');
            setMessages(prev => [...prev, message]);
        }
    }, [addMessageToScope]);

    // CRITICAL: Sync function refs to ensure socket handlers have current versions
    useEffect(() => {
        addToScopeRef.current = addToScope;
    }, [addToScope]);

    useEffect(() => {
        playAudioRef.current = playAudio;
    }, [playAudio]);

    useEffect(() => {
        loadMemoriesRef.current = loadMemories;
    }, [loadMemories]);

    // ======================================================================
    // HELPERS PARA ESTADOS POR ESCOPO
    // ======================================================================

    const getTypingForScope = useCallback((scopeKey: string): boolean => {
        return typingByScopeRef.current[scopeKey] || false;
    }, []);

    const setTypingForScope = useCallback((scopeKey: string, typing: boolean) => {
        setTypingByScope(prev => ({ ...prev, [scopeKey]: typing }));
        // Também atualiza o global para compatibilidade
        if (scopeKey === activeScopeRef.current) {
            setIsTyping(typing);
        }
        console.log(`💬 [Typing] ${scopeKey} = ${typing}`);
    }, []);

    const setGeneratingImageForScope = useCallback((scopeKey: string, generating: boolean) => {
        setIsGeneratingImageByScope(prev => ({ ...prev, [scopeKey]: generating }));
        console.log(`🎨 [ImageGen] ${scopeKey} = ${generating}`);
    }, []);

    // ======================================================================
    // DYNAMIC CONTENT PARSER
    // ======================================================================

    const tryParseStructuredContent = (text: string): DynamicContent | null => {
        if (!text) return null;
        try {
            // Padrões de JSON estruturado
            const patterns = [
                /```json\s*([\s\S]*?)\s*```/,  // JSON em bloco de código
                /```\s*([\s\S]*?)\s*```/,       // Bloco de código genérico
                /(\{[\s\S]*"type"\s*:\s*"(chart|table|analysis|image)"[\s\S]*\})/i,  // JSON inline com captura
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    const jsonStr = match[1] || match[0];
                    try {
                        const parsed = JSON.parse(jsonStr.trim());

                        // Verificar se é um formato válido de conteúdo dinâmico
                        if (parsed.type && ['chart', 'table', 'analysis', 'image', 'json'].includes(parsed.type)) {
                            return {
                                type: parsed.type,
                                title: parsed.title || (parsed.type === 'image' ? 'Imagem gerada' : 'Conteúdo Gerado'),
                                data: parsed.data || parsed,
                                timestamp: Date.now(),
                            };
                        }

                        // Formatos legados / implícitos
                        if (parsed.chartType || parsed.datasets) {
                            return {
                                type: 'chart',
                                title: parsed.title || 'Gráfico',
                                data: {
                                    chartType: parsed.chartType || 'line',
                                    labels: parsed.labels || [],
                                    datasets: parsed.datasets || [],
                                },
                                timestamp: Date.now(),
                            };
                        }

                        if (parsed.headers && parsed.rows) {
                            return {
                                type: 'table',
                                title: parsed.title || 'Tabela',
                                data: {
                                    headers: parsed.headers,
                                    rows: parsed.rows,
                                },
                                timestamp: Date.now(),
                            };
                        }
                    } catch (e) {
                        continue; // Tentar próximo padrão
                    }
                }
            }

            // Tentativa: se a string INTEIRA for um JSON válido
            if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
                try {
                    const parsed = JSON.parse(text.trim());
                    if (parsed.type || parsed.chartType || (parsed.headers && parsed.rows)) {
                        return {
                            type: parsed.type || (parsed.chartType ? 'chart' : 'table'),
                            title: parsed.title || 'Conteúdo estruturado',
                            data: parsed.data || parsed,
                            timestamp: Date.now()
                        };
                    }
                } catch (e) { }
            }
        } catch (e) {
            console.error('❌ Erro no parser de conteúdo estruturado:', e);
        }
        return null;
    };


    // ======================================================================
    // SETUP SOCKET.IO
    // ======================================================================

    // ======================================================================
    // SETUP AUTH & SYNC
    // ======================================================================
    useEffect(() => {
        const syncAuth = () => {
            const storedAuth = localStorage.getItem('supabase.auth.token');
            if (storedAuth) {
                try {
                    const authData = JSON.parse(storedAuth);
                    const uid = authData.user?.id || null;
                    // O tenantId geralmente vem do perfil ou do próprio token se for JWT customizado
                    // No nosso caso, o handshake passa userId e tenantId (assumindo tenantId igual ao userId se não informado)
                    setUserId(uid);
                    setTenantId(uid); // Fallback inicial
                    console.log('🔑 LIAContext: Auth sync - User:', uid);
                } catch (e) {
                    console.error('Erro ao parsear auth token:', e);
                }
            }
        };

        syncAuth();
        window.addEventListener('lia-auth-updated', syncAuth);
        return () => window.removeEventListener('lia-auth-updated', syncAuth);
    }, []);

    useEffect(() => {
        if (!authInitialized) return;

        const initSocket = async () => {
            const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const devGuestUUID = '00000000-0000-0000-0000-000000000001';
            const finalUserId = user?.id || (isDev ? devGuestUUID : null);

            if (!finalUserId) {
                console.log('⏳ [LIAContext] Aguardando login para conectar socket...');
                return;
            }

            console.log(`🔌 [LIAContext] Iniciando socket para ${user ? 'usuário: ' + user.email : 'GUEST (Dev Mode)'}`);

            // Tentar pegar token
            let token = '';
            try {
                const storedAuth = localStorage.getItem('supabase.auth.token') || localStorage.getItem('sb-dashboard-client-auth');
                if (storedAuth) {
                    const parsed = JSON.parse(storedAuth);
                    token = parsed.access_token || parsed.token || '';
                }
            } catch (e) { }

            const socket = await socketService.connectSocket({
                token,
                userId: finalUserId,
                tenantId: finalUserId,
                conversationId: currentIdRef.current || undefined
            });

            setUserId(finalUserId);
            setTenantId(finalUserId);
            userIdRef.current = finalUserId;
            tenantIdRef.current = finalUserId;
            if (authPlan) setPlanState(authPlan.name);

            // Sincronizar estado inicial
            setIsConnected(socket.connected);
        }

        initSocket();
    }, [authInitialized, user?.id, authPlan]);

    // Registro de eventos - Refatorado para evitar duplicação ou perda de eventos
    useEffect(() => {
        const socket = socketService.getSocket();

        // Se o socket ainda não existe, não faz sentido registrar (o initSocket cuidará disso)
        if (!socket) return;

        console.log('🔌 [LIAContext] Registrando listeners do socket...');

        // Eventos de conexão
        const handleConnect = () => {
            console.log('✅ LIAContext: Socket conectado');
            setIsConnected(true);
            const convId = socketService.getConversationId();
            setConversationId(convId);

            // Capturar localização ao conectar
            backendService.captureAndSendLocation().catch(console.error);

            // Carregar memórias ao conectar
            if (loadMemoriesRef.current) loadMemoriesRef.current();
        };

        const handleDisconnect = () => {
            console.log('❌ LIAContext: Socket desconectado');
            setIsConnected(false);
        };

        // Se o socket JÁ ESTIVER conectado no momento do registro, disparar handleConnect
        if (socket.connected) {
            handleConnect();
        }

        // Handlers de mensagem e typing
        const handleLIATyping = () => {
            const scopeKey = activeScopeRef.current;
            if (scopeKey) setTypingByScope(prev => ({ ...prev, [scopeKey]: true }));
            setIsTyping(true);
        };

        const handleLIAStopTyping = () => {
            const scopeKey = activeScopeRef.current;
            if (scopeKey) setTypingByScope(prev => ({ ...prev, [scopeKey]: false }));
            setIsTyping(false);
        };

        const processLIAResponse = (payload: any) => {
            const scopeKey = activeScopeRef.current;
            if (scopeKey) setTypingByScope(prev => ({ ...prev, [scopeKey]: false }));
            setIsTyping(false);
            setIsSpeaking(false);

            const text = typeof payload === 'string' ? payload : (payload.text || payload.reply || '');
            const convId = payload.conversationId || payload.convId || null;
            const mode = payload.mode || null;
            const audio = payload.audio || null;

            if (!text && !audio) return;

            console.log(`💬 [LIAContext] Resposta processada (${mode || 'socket'}):`, text.substring(0, 30) + '...');

            // 1. Parsing estruturado (Gráficos/Tabelas)
            const parsedContent = tryParseStructuredContent(text);
            let attachments: Message['attachments'] = undefined;
            let finalContent = text;

            if (parsedContent) {
                dynamicContentManager.addDynamicContent(parsedContent.type, parsedContent.data);
                setDynamicContent(parsedContent);

                if (parsedContent.type === 'image') {
                    const imageData = parsedContent.data as any;
                    finalContent = '🖼️ Imagem gerada com sucesso!';
                    attachments = [{ name: imageData.prompt || 'Imagem gerada', type: 'image', url: imageData.url }];
                } else {
                    finalContent = parsedContent.title || 'Conteúdo gerado!';
                }
            }

            // 2. Chat update
            const newMessage: Message = { id: `lia_${Date.now()}`, type: 'lia', content: finalContent, timestamp: Date.now(), attachments };
            const currentScopeMessages = messagesByScopeRef.current[scopeKey || ''] || [];
            const lastMsg = currentScopeMessages[currentScopeMessages.length - 1];

            if (!lastMsg || lastMsg.content !== finalContent || attachments) {
                if (addToScopeRef.current) addToScopeRef.current(newMessage, mode, convId);
            }

            // 3. Audio preview
            if (audio && audio.length > 0 && playAudioRef.current) {
                playAudioRef.current(audio);
            }
        };

        const handleLIAMessage = (payload: any) => processLIAResponse(payload);
        const handleAudioResponse = (payload: any) => processLIAResponse(payload);

        // Bind events
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('lia-typing', handleLIATyping);
        socket.on('lia-stop-typing', handleLIAStopTyping);
        socket.on('lia-message', handleLIAMessage);
        socket.on('audio-response', handleAudioResponse);
        socket.on('audio-ack', () => console.log('✅ Áudio ACK'));

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('lia-typing', handleLIATyping);
            socket.off('lia-stop-typing', handleLIAStopTyping);
            socket.off('lia-message', handleLIAMessage);
            socket.off('audio-response', handleAudioResponse);
            socket.off('audio-ack');
        };
    }, [authInitialized]); // Removido isConnected das dependências para evitar loops ou reinicializações desnecessárias

    // ======================================================================
    // EVENTOS GEMINI LIVE (PARIDADE REAL)
    // ======================================================================
    useEffect(() => {
        const handleGeminiEvent = (event: GeminiLiveEvent) => {
            // v2.6.2: ESCALABILIDADE DE ESCOPO - Extrair modo e ID do escopo ativo atual
            let scopeKey = activeScopeRef.current || 'live:' + (currentIdRef.current || 'default');
            let [mode, convId] = scopeKey.split(':');

            // Se ainda não temos uma conversa válida, usar o fallback 'live'
            if (!convId || convId === 'default' || convId === 'null') {
                mode = 'live';
                convId = currentIdRef.current || activeIdsByModeRef.current.live || 'default';
                scopeKey = `${mode}:${convId}`;
            }

            console.log(`📡 [LIAContext] Evento Gemini: ${event.type} | Escopo: ${scopeKey}`);

            switch (event.type) {
                case 'connected':
                    setIsLiveActive(true);
                    setIsConnected(true);
                    break;
                case 'end':
                    setIsLiveActive(false);
                    setIsListening(false);
                    setIsSpeaking(false);
                    break;
                case 'listening':
                    setIsListening(true);
                    setIsSpeaking(false);
                    setIsThinking(false);
                    break;
                case 'speaking':
                    setIsSpeaking(true);
                    setIsListening(false);
                    setIsThinking(false);
                    break;
                case 'generating-start':
                    setIsThinking(true);
                    setIsProcessingUpload(true);
                    break;
                case 'generating-end':
                    setIsThinking(false);
                    setIsProcessingUpload(false);
                    break;
                case 'user-transcript':
                    if (typeof event.data === 'string' && addToScopeRef.current) {
                        addToScopeRef.current({
                            id: `user_${Date.now()}`,
                            type: 'user',
                            content: event.data,
                            timestamp: Date.now()
                        }, mode as any, convId);

                        // Validar convId antes de persistir - UUIDs tem 36 chars
                        if (convId && convId.length >= 32 && convId !== 'default' && convId !== 'null') {
                            backendService.saveMessage(convId, 'user', event.data as string, 'voice').catch(e => console.error('❌ Erro ao persistir transcrição de usuário:', e));
                        } else {
                            console.warn('⚠️ [GeminiLive] Transcrição de usuário não persistida - convId inválido:', convId);
                        }
                    }
                    break;
                case 'lia-transcript':
                    if (typeof event.data === 'string' && addToScopeRef.current) {
                        addToScopeRef.current({
                            id: `lia_${Date.now()}`,
                            type: 'lia',
                            content: event.data,
                            timestamp: Date.now()
                        }, mode as any, convId);

                        // Validar convId antes de persistir
                        if (convId && convId.length >= 32 && convId !== 'default' && convId !== 'null') {
                            backendService.saveMessage(convId, 'assistant', event.data as string, 'voice').catch(e => console.error('❌ Erro ao persistir transcrição da LIA:', e));
                        } else {
                            console.warn('⚠️ [GeminiLive] Transcrição da LIA não persistida - convId inválido:', convId);
                        }
                    }
                    break;
                case 'chart-generated':
                case 'table-generated':
                case 'image-generated':
                    if (addToScopeRef.current) {
                        const typeEmoji = event.type === 'chart-generated' ? '📊' : event.type === 'table-generated' ? '📋' : '🖼️';
                        const typeName = event.type === 'chart-generated' ? 'Gráfico' : event.type === 'table-generated' ? 'Tabela' : 'Imagem';

                        const eventData = event.data as any;
                        let attachments: Message['attachments'] = undefined;
                        if (event.type === 'image-generated' && eventData?.url) {
                            attachments = [{
                                name: 'Imagem gerada',
                                type: 'image',
                                url: eventData.url
                            }];

                            dynamicContentManager.addDynamicContent('image', {
                                url: eventData.url,
                                prompt: eventData.prompt || 'Imagem gerada',
                                caption: eventData.prompt || 'Imagem gerada'
                            });
                        } else if (event.type === 'chart-generated' || event.type === 'table-generated') {
                            dynamicContentManager.addDynamicContent(
                                event.type === 'chart-generated' ? 'chart' : 'table',
                                eventData
                            );
                        }

                        const msgContent = `${typeEmoji} ${typeName} gerado com sucesso! Clique para ver detalhes.`;

                        addToScopeRef.current({
                            id: `lia_${Date.now()}`,
                            type: 'lia',
                            content: msgContent,
                            timestamp: Date.now(),
                            attachments
                        }, mode as any, convId);

                        backendService.saveMessage(convId, 'assistant', msgContent, 'voice', attachments)
                            .catch(e => console.error('❌ Erro ao persistir mensagem de conteúdo gerado:', e));
                    }
                    break;
            }
        };

        geminiLiveService.addEventListener(handleGeminiEvent);
        return () => geminiLiveService.removeEventListener(handleGeminiEvent);
    }, []);

    // ======================================================================
    // MÉTODOS DE MENSAGEM
    // ======================================================================

    /**
     * Detecta se o usuário está pedindo geração de conteúdo visual
     */
    const detectVisualRequest = (text: string): { type: string; prompt: string } | null => {
        const lowerText = text.toLowerCase();

        // Padrões para gráficos
        const chartPatterns = [
            /gera?\w* (?:um |o )?gr[aá]fico/i,
            /cria?\w* (?:um |o )?gr[aá]fico/i,
            /fa[zç]a?\w* (?:um |o )?gr[aá]fico/i,
            /mostr[ae]\w* (?:um |o )?gr[aá]fico/i,
            /gr[aá]fico de/i,
            /generate (?:a )?chart/i,
            /create (?:a )?chart/i,
            /show (?:a )?chart/i,
        ];

        // Padrões para tabelas
        const tablePatterns = [
            /gera?\w* (?:uma |a )?tabela/i,
            /cria?\w* (?:uma |a )?tabela/i,
            /fa[zç]a?\w* (?:uma |a )?tabela/i,
            /mostr[ae]\w* (?:uma |a )?tabela/i,
            /generate (?:a )?table/i,
            /create (?:a )?table/i,
        ];

        for (const pattern of chartPatterns) {
            if (pattern.test(text)) {
                return { type: 'chart', prompt: text };
            }
        }

        for (const pattern of tablePatterns) {
            if (pattern.test(text)) {
                return { type: 'table', prompt: text };
            }
        }

        return null;
    };

    /**
     * Gera conteúdo visual via API
     */
    const generateVisualContent = useCallback(async (type: string, prompt: string) => {
        try {
            console.log(`🎨 Gerando ${type} via API...`);
            setIsThinking(true);

            // v2.6: MENTE ÚNICA - Incluir token de autenticação
            const storedAuth = localStorage.getItem('supabase.auth.token');
            let authHeaders: any = { 'Content-Type': 'application/json' };
            if (storedAuth) {
                try {
                    const { access_token } = JSON.parse(storedAuth);
                    if (access_token) authHeaders['Authorization'] = `Bearer ${access_token}`;
                } catch (e) { }
            }

            const response = await fetch('/api/vision/generate', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    type,
                    prompt,
                    userId: userIdRef.current,
                    tenantId: tenantIdRef.current
                }),
            });

            if (!response.ok) {
                throw new Error('Falha ao gerar conteúdo visual');
            }

            const result = await response.json();
            console.log('✅ Conteúdo visual gerado:', result);

            // Atualizar Dynamic Content
            if (result.content) {
                setDynamicContent({
                    type: result.content.type || type,
                    title: result.content.title || `${type === 'chart' ? 'Gráfico' : 'Tabela'} gerado`,
                    data: result.content,
                    timestamp: Date.now(),
                });

                // Adicionar mensagem de confirmação
                const confirmMessage: Message = {
                    id: `lia_${Date.now()}`,
                    type: 'lia',
                    content: result.content.type === 'chart'
                        ? '📊 Gráfico gerado! Veja na área de conteúdo dinâmico.'
                        : '📋 Tabela gerada! Veja na área de conteúdo dinâmico.',
                    timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, confirmMessage]);
            }

        } catch (error: any) {
            console.error('❌ Erro ao gerar conteúdo visual:', error);

            const errorMessage: Message = {
                id: `lia_${Date.now()}`,
                type: 'lia',
                content: 'Desculpe, não consegui gerar o conteúdo visual. Tente novamente.',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    }, []);

    /**
     * Envia mensagem de texto para o backend (USANDO ESCOPO ATIVO)
     */
    /**
     * Envia mensagem de texto para o backend (ISOLADO POR MODO/CONVERSA)
     */
    const sendTextMessage = useCallback(async (text: string, mode?: 'chat' | 'multimodal' | 'live') => {
        if (!text.trim()) return;

        // Determinar modo e conversa
        const targetMode = mode || (activeScopeRef.current?.split(':')[0] as any) || 'chat';
        let convId = activeIdsByModeRef.current[targetMode as keyof typeof activeConversationIdByMode];

        // Se não houver conversa ativa para o modo, garantir uma
        if (!convId) {
            convId = ensureConversationExists(targetMode as any);
        }

        const scopeKey = `${targetMode}:${convId}`;
        console.log(`📤 [sendTextMessage] Modo: ${targetMode}, Conv: ${convId}, Scope: ${scopeKey}`);

        // Adicionar mensagem do usuário AO ESCOPO correto
        const userMessage: Message = {
            id: `user_${Date.now()}`,
            type: 'user',
            content: text,
            timestamp: Date.now(),
        };

        addMessageToScope(scopeKey, userMessage);

        // Detectar se é pedido de geração visual
        const visualRequest = detectVisualRequest(text);
        if (visualRequest) {
            setIsProcessingUpload(true); // Overlay apenas para geração visual
            await generateVisualContent(visualRequest.type, visualRequest.prompt);
            setIsProcessingUpload(false);
            return;
        }

        // Mensagem normal - enviar via Socket.IO
        // NOTA: NÃO setIsTyping aqui! O typing só é ativado pelo evento 'lia-typing' do backend

        // v4.0.0: MENTE ÚNICA - Contexto de data/hora é injetado pelo backend (memoryService)
        // Não precisamos mais injetar hardcoded no frontend.
        const fullText = text;

        try {
            // Enviar via Socket.IO com ID explícito
            socketService.registerConversation(convId!);
            socketService.sendTextMessage(fullText, convId!);
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
        }
    }, [generateVisualContent, addMessageToScope, ensureConversationExists]);

    /**
     * Adiciona uma mensagem diretamente ao chat
     */
    const addMessage = useCallback((message: Message) => {
        setMessages(prev => [...prev, message]);
    }, []);

    /**
     * Envia mensagem COM arquivos para análise multimodal
     */
    const sendMessageWithFiles = useCallback(async (
        text: string,
        files: { file: File; preview?: string }[]
    ) => {
        if (files.length === 0) {
            // Sem arquivos, envia como texto normal
            return sendTextMessage(text, 'multimodal');
        }

        // Garantir que conversa exista e obter scopeKey
        const convId = ensureConversationExists('multimodal');
        const scopeKey = `multimodal:${convId}`;

        const file = files[0]; // Por enquanto, processar primeiro arquivo
        const isImage = file.file.type.startsWith('image/');
        const prompt = text.trim() || 'Analise este arquivo em detalhes.';

        // 1. Adicionar mensagem do usuário COM attachment ao chat (ESCOPO CORRETO)
        const userMessage: Message = {
            id: `user_${Date.now()}`,
            type: 'user',
            content: prompt,
            timestamp: Date.now(),
            attachments: [{
                name: file.file.name,
                type: isImage ? 'image' : 'document',
                url: file.preview
            }]
        };
        addMessageToScope(scopeKey, userMessage);
        console.log('📎 Mensagem com attachment adicionada ao escopo:', scopeKey);

        // 2. Ativar loading para fase de UPLOAD (animação Luminnus)
        setIsProcessingUpload(true);

        try {
            // 3. Converter arquivo para base64
            const arrayBuffer = await file.file.arrayBuffer();
            const base64 = btoa(
                new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            const dataUrl = `data:${file.file.type};base64,${base64}`;

            console.log('📤 Enviando arquivo para análise:', file.file.name);

            // 4. Enviar para API de análise
            const convId = scopeKey.split(':')[1] || '';
            const formData = new FormData();
            formData.append('file', file.file);
            formData.append('prompt', prompt);
            formData.append('conversationId', convId);
            // userId e tenantId são opcionais - o backend usa defaults se não enviados


            // Desativar loading de upload, ativar typing bubbles (aguardando resposta da AI)
            setIsProcessingUpload(false);
            setTypingForScope(scopeKey, true);

            const response = await fetch('/api/vision/analyze', {
                method: 'POST',
                body: formData,
            });


            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Análise concluída:', result);

            // 5. Adicionar resposta da LIA ao chat (ESCOPO CORRETO)
            const analysisText = result.analysis?.text ||
                result.analysis?.summary ||
                result.text ||
                result.message ||
                'Análise concluída!';

            const liaMessage: Message = {
                id: `lia_${Date.now()}`,
                type: 'lia',
                content: analysisText,
                timestamp: Date.now(),
                // v2.2: NÃO incluir attachment na resposta da LIA
                // A imagem já aparece na mensagem do usuário acima
            };

            addMessageToScope(scopeKey, liaMessage);
            console.log('💬 Resposta da LIA adicionada ao escopo:', scopeKey);

            // v2.1: Atualizar a mensagem do usuário com a URL persistente
            if (result.storageUrl) {
                setMessagesByScope(prev => {
                    const scopeMessages = [...(prev[scopeKey] || [])];
                    // Encontrar a mensagem do usuário recém-adicionada
                    const userMsgIndex = scopeMessages.findIndex(m => m.id === userMessage.id);
                    if (userMsgIndex >= 0 && scopeMessages[userMsgIndex].attachments) {
                        scopeMessages[userMsgIndex] = {
                            ...scopeMessages[userMsgIndex],
                            attachments: scopeMessages[userMsgIndex].attachments?.map(att => ({
                                ...att,
                                url: result.storageUrl
                            }))
                        };
                    }
                    // Salvar no localStorage
                    try {
                        localStorage.setItem(`lia_scope_${scopeKey}`, JSON.stringify(scopeMessages));
                    } catch (e) { /* ignore */ }
                    return { ...prev, [scopeKey]: scopeMessages };
                });
                console.log('🔄 URL do attachment atualizada para storageUrl persistente');
            }


            // 6. NÃO definir DynamicContent para análises de texto
            // Análises vão direto para o chat, apenas gráficos/tabelas/imagens vão para DynamicContent


        } catch (error: any) {
            console.error('❌ Erro ao analisar arquivo:', error);

            // Adicionar mensagem de erro ao escopo
            const errorMessage: Message = {
                id: `lia_error_${Date.now()}`,
                type: 'lia',
                content: `❌ Não consegui analisar o arquivo. ${error.message || 'Tente novamente.'}`,
                timestamp: Date.now()
            };
            addMessageToScope(scopeKey, errorMessage);
        } finally {
            setTypingForScope(scopeKey, false);
            setIsProcessingUpload(false);
        }
    }, [ensureConversationExists, sendTextMessage, addMessageToScope, setTypingForScope]);


    /**
     * Envia áudio gravado para o backend (transcrição + resposta)
     */
    const sendAudioMessage = useCallback(async (audioBlob: Blob) => {
        try {
            // AUTO-CREATE: Garantir que conversa exista antes de adicionar mensagem
            ensureConversationExists('multimodal');

            // Adicionar indicador visual
            const userMessage: Message = {
                id: `user_${Date.now()}`,
                type: 'user',
                content: '🎤 Mensagem de voz...',
                timestamp: Date.now(),
                attachments: [
                    {
                        name: 'audio.webm',
                        type: 'audio',
                    },
                ],
            };
            setMessages((prev) => [...prev, userMessage]);

            // Converter para array buffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Enviar chunks via Socket.IO - typing será ativado pelo backend 'lia-typing'
            socketService.sendAudioChunk(uint8Array);
            socketService.sendAudioEnd();

            console.log('✅ Áudio enviado:', uint8Array.length, 'bytes');
        } catch (err) {
            console.error('❌ Erro ao enviar áudio:', err);
        }
    }, [ensureConversationExists]);

    /**
     * Transcreve áudio e retorna texto (para preencher input)
     * Usado em Chat Mode e Multi-Modal Mode (botão microfone comum)
     */
    const transcribeAndFillInput = useCallback(async (audioBlob: Blob): Promise<string | null> => {
        try {
            console.log('🎤 Transcrevendo áudio via backend...');

            // Converter para FormData
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');

            // Enviar para backend (que tem a chave OpenAI)
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Transcription error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            const transcription = data.text?.trim() || '';

            console.log('✅ Transcrição:', transcription);

            return transcription;
        } catch (error) {
            console.error('❌ Erro ao transcrever:', error);
            return null;
        }
    }, []);

    // ======================================================================
    // MÉTODOS DE VOZ
    // ======================================================================

    const setVoicePersonality = useCallback((personality: 'clara' | 'viva' | 'firme') => {
        setVoicePersonalityState(personality);
        socketService.setVoicePersonality(personality);
    }, []);

    const startListening = useCallback(() => {
        setIsListening(true);
    }, []);

    const stopListening = useCallback(() => {
        setIsListening(false);
    }, []);

    /**
     * Toca áudio recebido do backend
     */
    // playAudio movido para cima (MÉTODOS DE VOZ / ÁUDIO).


    // ======================================================================
    // MÉTODOS LIVE (GEMINI LIVE API REAL)
    // ======================================================================
    // Streaming bidirecional contínuo com Gemini 2.0
    // Hands-free: fale naturalmente, LIA responde em tempo real


    /**
     * Inicia modo live REAL com Gemini Live API
     * Streaming bidirecional contínuo - hands-free
     */
    const startLiveMode = useCallback(async () => {
        try {
            console.log('🚀 Iniciando Gemini Live REAL...');

            let activeId = currentIdRef.current || activeIdsByModeRef.current.live || '';
            let uiMode: any = 'live';

            if (activeScopeRef.current && activeScopeRef.current !== 'default') {
                const [mode, id] = activeScopeRef.current.split(':');
                uiMode = mode;
                activeId = id;
            }

            if (!activeId || activeId === 'default') {
                const autoConv = await createConversation('live');
                activeId = autoConv.id;
            }

            geminiLiveService.setSessionConversationId(activeId);
            geminiLiveService.setUIMode(uiMode);

            // v4.2: SSOT - Sincronizar contexto de usuário e autenticação
            geminiLiveService.updateConfig({
                userId: userIdRef.current || undefined,
                tenantId: tenantIdRef.current || undefined,
                authStorageKey: 'sb-dashboard-client-auth'
            });

            setActiveScope(`${uiMode}:${activeId}`);

            await geminiLiveService.startSession();
        } catch (error: any) {
            console.error('❌ Erro ao iniciar Gemini Live:', error);
            alert(`Erro ao iniciar Live Mode: ${error.message}`);
        }
    }, [createConversation, setActiveScope]);

    const stopLiveMode = useCallback(async () => {
        try {
            console.log('🛑 Parando Gemini Live...');
            await geminiLiveService.stopSession();
        } catch (error) {
            console.error('❌ Erro ao parar Gemini Live:', error);
        }
    }, []);

    // ======================================================================
    // MÉTODOS DE MEMÓRIA
    // ======================================================================

    // loadMemories e playAudio movidos para cima (antes do Socket setup) para evitar forward references.


    const saveMemory = useCallback(async (content: string, category: string = 'general') => {
        try {
            const success = await backendService.saveMemory(content, category);
            if (success) {
                // Recarregar memórias
                await loadMemories();
            }
        } catch (error) {
            console.error('❌ Erro ao salvar memória:', error);
        }
    }, [loadMemories]);

    const deleteMemory = useCallback(async (id: string) => {
        try {
            const success = await backendService.deleteMemory(id);
            if (success) {
                setMemories((prev) => prev.filter((m) => m.id !== id));
            }
        } catch (error) {
            console.error('❌ Erro ao deletar memória:', error);
        }
    }, []);

    // ======================================================================
    // MÉTODOS DE UPLOAD / VISION
    // ======================================================================

    /**
     * Analisa arquivo (imagem/PDF) com Gemini Vision
     */
    const analyzeFile = useCallback(async (file: File) => {
        try {
            console.log('📤 Analisando arquivo:', file.name);
            setIsProcessingUpload(true);

            // Criar FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prompt', `Analise esta imagem/documento detalhadamente.
        Se contiver gráficos ou dados numéricos, extraia-os.
        Se contiver tabelas, transcreva-as.
        Forneça insights úteis.`);

            // v2.6: MENTE ÚNICA - Incluir credenciais
            formData.append('userId', userIdRef.current || '');
            formData.append('tenantId', tenantIdRef.current || '');

            const storedAuth = localStorage.getItem('supabase.auth.token');
            let authHeaders: any = {};
            if (storedAuth) {
                try {
                    const { access_token } = JSON.parse(storedAuth);
                    if (access_token) authHeaders['Authorization'] = `Bearer ${access_token}`;
                } catch (e) { }
            }

            // Enviar para API
            const response = await fetch('/api/vision/analyze', {
                method: 'POST',
                headers: authHeaders,
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Falha ao analisar arquivo');
            }

            const result = await response.json();
            console.log('✅ Análise concluída:', result);

            // Adicionar mensagem no chat (SOMENTE chat, não DynamicContent para análises de texto)
            const analysisText = result.analysis?.summary ||
                result.analysis?.text ||
                result.text ||
                'Análise concluída!';

            const liaMsg: Message = {
                id: `lia_${Date.now()}`,
                type: 'lia',
                content: analysisText,
                timestamp: Date.now(),
            };

            if (addToScopeRef.current && activeIdsByModeRef.current.multimodal) {
                addToScopeRef.current(liaMsg, 'multimodal', activeIdsByModeRef.current.multimodal);
            }

            // Só exibir no DynamicContent se for gráfico, tabela ou imagem
            if (result.analysis && result.analysis.type && ['chart', 'table', 'image'].includes(result.analysis.type)) {
                const content: DynamicContent = {
                    type: result.analysis.type,
                    title: result.analysis.title || `Análise: ${file.name}`,
                    data: result.analysis,
                    timestamp: Date.now(),
                };
                setDynamicContent(content);
            }

        } catch (error: any) {
            console.error('❌ Erro ao analisar arquivo:', error);

            const errorMessage: Message = {
                id: `lia_${Date.now()}`,
                type: 'lia',
                content: `Erro ao analisar arquivo: ${error.message}`,
                timestamp: Date.now(),
            };
            if (addToScopeRef.current && activeIdsByModeRef.current.multimodal) {
                addToScopeRef.current(errorMessage, 'multimodal', activeIdsByModeRef.current.multimodal);
            }

        } finally {
            setIsProcessingUpload(false);
        }
    }, []);


    // ======================================================================
    // OUTROS MÉTODOS
    // ======================================================================

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    // ======================================================================
    // PROVIDER VALUE
    // ======================================================================

    const value: LIAState = {
        isConnected,
        conversationId,

        // Sistema de Conversas Isoladas
        conversations,
        activeConversationIdByMode,
        currentConversationId,
        createConversation,
        switchConversation,
        renameConversation,
        deleteConversation,
        refreshConversations,
        getCurrentMessages,

        // Sistema de Mensagens por Escopo
        activeScope,
        messagesByScope,
        getMessagesForScope,
        addMessageToScope,
        clearScopeMessages,
        setActiveScope,
        getScopeKey,

        messages,

        // Estados por Escopo
        typingByScope,
        isGeneratingImageByScope,
        getTypingForScope,
        setTypingForScope,
        setGeneratingImageForScope,

        voicePersonality,
        isSpeaking,
        isListening,
        isLiveActive,
        isInitialLoadDone,
        isThinking,
        isProcessingUpload,
        isProcessingDynamic,
        isCameraActive,
        memories,
        dynamicContent,
        setDynamicContent,
        clearDynamicContent: () => dynamicContentManager.clearAll(),
        setIsProcessingUpload,
        dynamicContainers,
        addDynamicContainer: (t, d) => dynamicContentManager.addDynamicContent(t, d),
        removeDynamicContainer: (id) => dynamicContentManager.removeContainer(id),
        clearDynamicContainers: () => dynamicContentManager.clearAll(),
        sendTextMessage,
        addMessage,
        sendMessageWithFiles,
        sendAudioMessage,
        transcribeAndFillInput,
        analyzeFile,
        setVoicePersonality,
        startListening,
        stopListening,
        startLiveMode,
        stopLiveMode,
        loadMemories,
        saveMemory,
        deleteMemory,
        userId,
        tenantId,
        plan,
        clearMessages,
        isTyping,
    };

    return <LIAContext.Provider value={value}>{children}</LIAContext.Provider>;
}

// ======================================================================
// HOOK
// ======================================================================

export function useLIA(): LIAState {
    const context = useContext(LIAContext);
    if (!context) {
        throw new Error('useLIA deve ser usado dentro de LIAProvider');
    }
    return context;
}
