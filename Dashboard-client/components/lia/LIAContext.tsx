// ======================================================================
// 🧠 LIA Context - MENTE ÚNICA CENTRALIZADA
// ======================================================================
// A LIA existe UMA ÚNICA VEZ para todos os painéis
// Os painéis são apenas interfaces diferentes para a mesma mente
// ======================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, useMemo } from 'react';
import { socketService } from './services/socketService';
import { backendService, Memory } from './services/backendService';
import { geminiLiveService, GeminiLiveSession, GeminiLiveEvent } from './services/geminiLiveService';
import { dynamicContentManager, DynamicContainer } from './services/dynamicContentManager';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
// LIA Action Handler - Dashboard Control Integration (NEW)
import { mapFunctionCallToLiaAction } from './services/liaDashboardPrompt';
import { detectDashboardIntent } from './services/liaIntentDetector';
// v8.2: LOCAL ANSWER SERVICE - Import estático para interceptação síncrona
import { tryLocalAnswer, isLocalQuery } from './services/localAnswerService';
// v9.0: INTENT ROUTER & RESPONSE GATE - SSOT Protocol Enforcement
import { classifyIntent, detectAttachmentType, getIncidentTemplateInstruction, getHybridTemplateInstruction, IntentMode, ContextScope, QuickAction } from './services/intentRouter';
import { validateResponse, suggestQuickActions, recordTelemetry } from './services/responseGate';


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
    metadata?: Record<string, any>;
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
    refreshConversations: () => Promise<number>;
    getCurrentMessages: () => Message[];

    // ======================================================================
    // SISTEMA DE MENSAGENS POR ESCOPO (mode:conversationId)
    // ======================================================================
    activeMode: 'chat' | 'multimodal' | 'live';
    setActiveMode: (mode: 'chat' | 'multimodal' | 'live') => void;
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
    liaStatus: string | null;
    setLiaStatus: (status: string | null) => void;

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
    userRole: string | null;

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
    const [liaStatus, setLiaStatus] = useState<string | null>(null);

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
    const { user, initialized: authInitialized, plan: authPlan, profile: authProfile } = useDashboardAuth();
    const [userId, setUserId] = useState<string | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [plan, setPlanState] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const userIdRef = useRef<string | null>(null);
    const tenantIdRef = useRef<string | null>(null);
    const userRoleRef = useRef<string | null>(null);

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
    const [activeMode, setActiveModeState] = useState<'chat' | 'multimodal' | 'live'>('chat');
    const activeModeRef = useRef<'chat' | 'multimodal' | 'live'>('chat');

    // Refs para evitar closures desatualizadas
    const messagesRef = useRef<Message[]>([]);
    const conversationsRef = useRef<{ [id: string]: Conversation }>({});
    const currentIdRef = useRef<string | null>(null);
    const activeIdsByModeRef = useRef<Record<'chat' | 'multimodal' | 'live', string | null>>({ chat: null, multimodal: null, live: null });
    const messagesByScopeRef = useRef<Record<string, Message[]>>({});
    const activeScopeRef = useRef<string | null>(null);
    const creatingRef = useRef<Record<string, boolean>>({}); // Trava de criação concorrente
    const lastMessageSentRef = useRef<{ text: string, timestamp: number } | null>(null);
    const lastIntentRef = useRef<Record<string, any | null>>({}); // v9.0: Store intents per scope
    const rerouteCountRef = useRef<Record<string, number>>({}); // v9.0: Prevent infinite loops

    // CRITICAL: Refs for functions to stabilize useEffect dependencies
    const addToScopeRef = useRef<((message: Message, mode?: 'chat' | 'multimodal' | 'live', convId?: string) => void) | null>(null);
    const playAudioRef = useRef<((audioData: number[]) => void) | null>(null);
    const loadMemoriesRef = useRef<(() => Promise<void>) | null>(null);

    // Sync tenant ID / User ID refs
    useEffect(() => {
        userIdRef.current = userId;
        tenantIdRef.current = tenantId;
        userRoleRef.current = userRole;
    }, [userId, tenantId, userRole]);

    // v2.6: MENTE ÚNICA - Sincronizar Usuário e Autenticação do multi-tenant
    useEffect(() => {
        const syncUser = () => {
            const storedAuth = localStorage.getItem('sb-dashboard-auth');
            if (storedAuth) {
                try {
                    const authData = JSON.parse(storedAuth);
                    const uId = authData.user?.id || null;
                    const userPlan = authData.user?.app_metadata?.plan || null;
                    const role = authData.user?.app_metadata?.role || authProfile?.role || 'client';
                    if (uId) {
                        const activePlan = authPlan || user?.app_metadata?.plan || userPlan;
                        setUserId(uId);
                        setTenantId(uId);
                        setPlanState(activePlan);
                        setUserRole(role);
                        console.log('👤 [LIAContext] Sincronizado via AuthContext:', uId, 'Plano:', activePlan, 'Role:', role);

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
    }, [authProfile]);

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

    const setActiveMode = useCallback((mode: 'chat' | 'multimodal' | 'live') => {
        setActiveModeState(mode);
        activeModeRef.current = mode;
        const activeId = activeIdsByModeRef.current[mode];
        if (activeId) {
            setCurrentConversationId(activeId);
            currentIdRef.current = activeId;
            setActiveScopeState(activeId);
            activeScopeRef.current = activeId;
        }
        console.log(`🎯 [LIAContext] Modo alterado para: ${mode} (Conv: ${activeId})`);
    }, []);

    // ======================================================================
    // API DE MENSAGENS POR ESCOPO
    // ======================================================================

    // ======================================================================
    // API DE MENSAGENS E PERSISTÊNCIA
    // ======================================================================

    const getScopeKey = useCallback((_mode: 'chat' | 'multimodal' | 'live', convId: string): string => convId, []);

    const getMessagesForScope = useCallback((scopeKey: string): Message[] => messagesByScopeRef.current[scopeKey] || [], []);

    const addMessageToScope = useCallback((scopeKey: string, message: Message) => {
        setMessagesByScope(prev => {
            const scopeMessages = prev[scopeKey] || [];

            // v6.0: PRIMARY - Check by ID (idempotency key)
            if (message.id && scopeMessages.some(m => m.id === message.id)) {
                console.log(`ℹ️ [Dedup] Mensagem ${message.id} já existe no escopo: ${scopeKey}`);
                return prev;
            }

            // v9.0: FALLBACK - Evitar mensagens idênticas em curto intervalo (para msgs legadas sem ID)
            const lastMsg = scopeMessages[scopeMessages.length - 1];
            const isDuplicate = lastMsg &&
                lastMsg.content === message.content &&
                lastMsg.type === message.type &&
                (Math.abs(message.timestamp - lastMsg.timestamp) < 2000);

            if (isDuplicate) {
                console.log(`♻️ [LIAContext] Ignorando duplicata no escopo ${scopeKey}:`, message.content.substring(0, 30));
                return prev;
            }

            const updated = { ...prev, [scopeKey]: [...scopeMessages, message] };
            try { localStorage.setItem(`lia_scope_${scopeKey}`, JSON.stringify(updated[scopeKey])); } catch (e) { }
            return updated;
        });
    }, []);


    // v4.4: CRITICAL FIX - Atribuir addMessageToScope à ref para os handlers de socket usarem
    useEffect(() => {
        addToScopeRef.current = (message: Message, mode?: 'chat' | 'multimodal' | 'live', convId?: string) => {
            const scopeKey = convId || activeScopeRef.current || '';
            if (scopeKey) {
                addMessageToScope(scopeKey, message);
            }
        };
    }, [addMessageToScope]);


    const clearScopeMessages = useCallback((scopeKey: string) => {
        setMessagesByScope(prev => {
            const updated = { ...prev };
            delete updated[scopeKey];
            try { localStorage.removeItem(`lia_scope_${scopeKey}`); } catch (e) { }
            return updated;
        });
    }, []);

    const saveToStorage = useCallback(async (
        convs: { [id: string]: Conversation },
        currentId: string | null,
        activeIds: Record<'chat' | 'multimodal' | 'live', string | null>,
        specificConvId?: string
    ) => {
        try {
            localStorage.setItem('lia_conversations_v4', JSON.stringify({ conversations: convs, currentId: currentId, activeIdsByMode: activeIds }));
            const targetId = specificConvId || currentId;
            const uId = userIdRef.current;
            if (targetId && convs[targetId] && uId && uId !== 'null') {
                backendService.saveConversation({ id: convs[targetId].id, title: convs[targetId].title, mode: convs[targetId].mode as any, userId: uId }).catch(() => { });
            }
        } catch (e) { }
    }, []);

    const saveCurrentConversation = useCallback((modeToSave?: 'chat' | 'multimodal' | 'live') => {
        const activeIds = activeIdsByModeRef.current;
        const currentConvs = conversationsRef.current;
        const msgsByScope = messagesByScopeRef.current;
        let updatedConvs = { ...currentConvs };
        let hasChanges = false;
        const modes = modeToSave ? [modeToSave] : (['chat', 'multimodal', 'live'] as const);

        modes.forEach(m => {
            const convId = activeIds[m];
            if (convId && currentConvs[convId]) {
                updatedConvs[convId] = { ...currentConvs[convId], messages: msgsByScope[convId] || [], updatedAt: Date.now() };
                hasChanges = true;
            }
        });

        if (hasChanges) {
            setConversations(updatedConvs);
            conversationsRef.current = updatedConvs;
            saveToStorage(updatedConvs, currentIdRef.current, activeIds);
        }
    }, [saveToStorage]);

    const hydratedFromBackendRef = useRef<Record<string, boolean>>({});

    const setActiveScope = useCallback((scopeKey: string | null) => {
        setActiveScopeState(scopeKey);
        activeScopeRef.current = scopeKey;
        if (scopeKey) {
            // Se já temos mensagens em memória OU já hidratamos do backend,
            // evitamos re-hidratar do localStorage para não duplicar histórico.
            const hasInMemory = (messagesByScopeRef.current[scopeKey] || []).length > 0;
            const hydratedFromBackend = hydratedFromBackendRef.current[scopeKey];

            if (hasInMemory || hydratedFromBackend) {
                return;
            }

            try {
                const stored = localStorage.getItem(`lia_scope_${scopeKey}`);
                if (stored) {
                    const msgs = JSON.parse(stored);
                    setMessagesByScope(prev => ({ ...prev, [scopeKey]: msgs }));
                    messagesByScopeRef.current = { ...messagesByScopeRef.current, [scopeKey]: msgs };
                }
            } catch (e) { }
        }
    }, []);

    const ensureConversationExists = useCallback(async (modeForConv: 'chat' | 'multimodal' | 'live'): Promise<string | null> => {
        const activeIds = activeIdsByModeRef.current;
        if (activeIds[modeForConv]) return activeIds[modeForConv];

        const title = `Conversa ${new Date().toLocaleString('pt-BR')}`;
        try {
            const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: modeForConv, title, userId: userIdRef.current })
            });
            const data = await resp.json();
            const newId = data.conversation?.id || `conv_${Date.now()}`;
            const newConv: Conversation = { id: newId, mode: modeForConv, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
            const updated = { ...conversationsRef.current, [newId]: newConv };
            setConversations(updated);
            conversationsRef.current = updated;
            setActiveConversationIdByMode(prev => {
                const next = { ...prev, [modeForConv]: newId };
                activeIdsByModeRef.current = next;
                return next;
            });
            socketService.registerConversation(newId);
            setActiveScope(newId);
            saveToStorage(updated, currentIdRef.current, activeIdsByModeRef.current);
            return newId;
        } catch (e) { return null; }
    }, [setActiveScope, saveToStorage]);

    const refreshConversations = useCallback(async () => {
        // v4.7: TIMING FIX - Garantir ID em Dev Mode
        const localStorageUserId = backendService.getAuthContext().userId;
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const devGuestUUID = '00000000-0000-0000-0000-000000000001';

        // Fallback robusto para Dev Mode
        let effectiveUserId = userId || localStorageUserId;
        if (!effectiveUserId && isDev) {
            effectiveUserId = devGuestUUID;
        }

        const isGuestId = effectiveUserId === devGuestUUID;
        const isValidUserId = effectiveUserId && effectiveUserId !== 'null' && (!isGuestId || isDev);

        if (!isValidUserId) {
            console.warn('⏳ [RefreshConv] Aguardando userId válido...', { stateUserId: userId, lsUserId: localStorageUserId, isDev });
            setIsInitialLoadDone(true);
            return;
        }


        console.log('📥 [RefreshConv] Iniciando com userId:', effectiveUserId);
        setIsInitialLoadDone(false);
        try {
            const serverConvs = await backendService.getConversations();
            console.log('📥 [RefreshConv] Conversas recebidas:', serverConvs?.length || 0);
            if (serverConvs?.length > 0) {

                const convsMap: { [id: string]: Conversation } = {};
                serverConvs.forEach(c => {
                    convsMap[c.id] = { id: c.id, title: c.title, mode: c.mode || 'chat', messages: [], createdAt: c.createdAt || Date.now(), updatedAt: c.updatedAt || Date.now() };
                });
                setConversations(convsMap);
                conversationsRef.current = convsMap;
                const activeIds = { ...activeIdsByModeRef.current };
                Object.values(convsMap).forEach(c => {
                    const m = c.mode as any;
                    if (!activeIds[m] || c.updatedAt > (convsMap[activeIds[m]!]?.updatedAt || 0)) activeIds[m] = c.id;
                });
                setActiveConversationIdByMode(activeIds);
                activeIdsByModeRef.current = activeIds;

                // v4.3: PERSISTÊNCIA - Carregar mensagens das conversas ativas após o refresh
                const loadPromises = Object.entries(activeIds).map(async ([mode, convId]) => {
                    if (!convId) return;
                    const scopeKey = convId; // getScopeKey simplificado
                    try {
                        const msgs = await backendService.getMessages(convId);
                        if (msgs?.length > 0) {
                            // v6.0: Deduplicação por ID ao carregar do banco
                            const seenIds = new Set<string>();
                            const formatted: Message[] = [];
                            msgs.forEach(m => {
                                if (m.id && !seenIds.has(m.id) && !m.role?.startsWith('system')) {
                                    seenIds.add(m.id);
                                    formatted.push({
                                        id: m.id,
                                        type: (m.role === 'assistant' ? 'lia' : 'user') as 'lia' | 'user',
                                        content: m.content,
                                        timestamp: new Date(m.created_at).getTime(),
                                        attachments: m.attachments || undefined
                                    });
                                }
                            });
                            setMessagesByScope(prev => ({ ...prev, [scopeKey]: formatted }));
                            messagesByScopeRef.current = { ...messagesByScopeRef.current, [scopeKey]: formatted };
                            hydratedFromBackendRef.current[scopeKey] = true;
                            console.log(`📥 [RefreshConv] Carregadas ${formatted.length} mensagens únicas para ${mode}:${convId}`);
                        }
                    } catch (e) {
                        console.warn(`⚠️ [RefreshConv] Falha ao carregar msgs de ${convId}:`, e);
                    }

                });
                await Promise.all(loadPromises);
                return serverConvs.length;
            }
            return 0;
        } catch (e) {
            console.error('❌ [RefreshConv] Erro geral:', e);
            return 0;
        }
        finally { setIsInitialLoadDone(true); }
    }, [userId]);


    const createConversation = useCallback(async (mode: 'chat' | 'multimodal' | 'live') => {
        if (creatingRef.current[mode]) return;
        creatingRef.current[mode] = true;

        // Salvar conversa atual antes de criar nova
        saveCurrentConversation(mode);

        // v4.4: FORÇAR criação de nova conversa (não reutilizar existente)
        const title = `Conversa ${new Date().toLocaleString('pt-BR')}`;
        const effectiveUserId = userId || backendService.getAuthContext().userId;

        try {
            console.log('🆕 [CreateConv] Criando nova conversa para modo:', mode);
            const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/conversations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, title, userId: effectiveUserId })
            });

            if (!resp.ok) {
                console.error('❌ [CreateConv] Falha ao criar conversa:', resp.status);
                creatingRef.current[mode] = false;
                return undefined;
            }

            const data = await resp.json();
            const newId = data.conversation?.id || `conv_${Date.now()}`;
            console.log('✅ [CreateConv] Conversa criada com ID:', newId);

            const newConv: Conversation = { id: newId, mode, title, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
            const updated = { ...conversationsRef.current, [newId]: newConv };
            setConversations(updated);
            conversationsRef.current = updated;

            setActiveConversationIdByMode(prev => {
                const next = { ...prev, [mode]: newId };
                activeIdsByModeRef.current = next;
                return next;
            });

            socketService.registerConversation(newId);
            setActiveScope(newId);
            saveToStorage(updated, newId, activeIdsByModeRef.current);

            creatingRef.current[mode] = false;
            return newConv;
        } catch (e) {
            console.error('❌ [CreateConv] Erro:', e);
            creatingRef.current[mode] = false;
            return undefined;
        }
    }, [saveCurrentConversation, userId, setActiveScope, saveToStorage]);


    const switchConversation = useCallback(async (id: string, mode?: 'chat' | 'multimodal' | 'live') => {
        const conv = conversationsRef.current[id];
        if (!conv) return;
        const targetMode = mode || conv.mode;
        saveCurrentConversation(targetMode);
        const scopeKey = getScopeKey(targetMode, id);
        if ((messagesByScopeRef.current[scopeKey] || []).length === 0) {
            try {
                const msgs = await backendService.getMessages(id);
                if (msgs?.length > 0) {
                    const formatted: Message[] = msgs.map(m => ({ id: m.id, type: (m.role === 'assistant' ? 'lia' : 'user'), content: m.content, timestamp: new Date(m.created_at).getTime() }));
                    setMessagesByScope(prev => ({ ...prev, [scopeKey]: formatted }));
                    messagesByScopeRef.current = { ...messagesByScopeRef.current, [scopeKey]: formatted };
                }
            } catch (e) { }
        }
        setActiveConversationIdByMode(prev => {
            const next = { ...prev, [targetMode]: id };
            activeIdsByModeRef.current = next;
            setCurrentConversationId(id);
            currentIdRef.current = id;
            return next;
        });
        setActiveScope(scopeKey);
        socketService.registerConversation(id);
        saveToStorage(conversationsRef.current, currentIdRef.current, activeIdsByModeRef.current);
        geminiLiveService.setSessionConversationId(id);
        geminiLiveService.setUIMode(targetMode);
    }, [saveCurrentConversation, saveToStorage, setActiveScope, getScopeKey]);

    const renameConversation = useCallback((id: string, title: string) => {
        const updated = { ...conversationsRef.current, [id]: { ...conversationsRef.current[id], title } };
        setConversations(updated);
        conversationsRef.current = updated;
        saveToStorage(updated, currentIdRef.current, activeIdsByModeRef.current, id);
    }, [saveToStorage]);

    const deleteConversation = useCallback((id: string) => {
        const { [id]: deleted, ...rest } = conversationsRef.current;
        setConversations(rest);
        conversationsRef.current = rest;
        if (currentIdRef.current === id) { setCurrentConversationId(null); currentIdRef.current = null; }
        setActiveConversationIdByMode(prev => {
            let next = { ...prev };
            for (const k in next) if (next[k as any] === id) next[k as any] = null;
            activeIdsByModeRef.current = next;
            return next;
        });
        if (deleted) clearScopeMessages(getScopeKey(deleted.mode, id));
        saveToStorage(rest, currentIdRef.current, activeIdsByModeRef.current);
        backendService.deleteConversation(id).catch(() => { });
    }, [saveToStorage, clearScopeMessages, getScopeKey]);

    const getCurrentMessages = useCallback((): Message[] => messagesRef.current, []);

    /**
     * UNIFIED ENTRYPOINT - Único ponto de entrada para texto e voz
     * v4.2 STOP THE BLEED
     */
    const handleUserInput = useCallback(async (input: string, source: 'text' | 'voice', targetModeOverride?: 'chat' | 'multimodal' | 'live'): Promise<void> => {
        const text = input.trim();
        if (!text) return;

        let targetMode: 'chat' | 'multimodal' | 'live' = targetModeOverride || activeModeRef.current || 'chat';

        let targetConvId = activeIdsByModeRef.current[targetMode];
        if (!targetConvId) targetConvId = await ensureConversationExists(targetMode) || undefined;
        if (!targetConvId) {
            console.error('❌ Não foi possível obter conversa ativa');
            return;
        }

        // v6.0: UUID-based idempotency - same ID for HTTP and Socket
        const messageId = crypto.randomUUID();

        const scopeKey = getScopeKey(targetMode, targetConvId);
        const userMsg: Message = { id: messageId, type: 'user', content: text, timestamp: Date.now() };
        addMessageToScope(scopeKey, userMsg);

        // v9.0: Intent Classification (SSOT Protocol)
        const intentOutput = classifyIntent({
            userText: text,
            hasAttachment: false,
            attachmentType: null,
            contextScope: 'General' // TODO: Detect from route
        });
        lastIntentRef.current[scopeKey] = intentOutput;
        rerouteCountRef.current[scopeKey] = 0; // Reset counter

        let messageToSocket = text;
        if (intentOutput.mode === 'A' || intentOutput.mode === 'C') {
            const instruction = intentOutput.mode === 'A'
                ? getIncidentTemplateInstruction()
                : getHybridTemplateInstruction();
            messageToSocket = `${text}\n\n[SISTEMA: PROTOCOLO DE LEITURA DE ARQUIVO ATIVADO]\n${instruction}`;
            console.log(`🛡️ [IntentRouter] Mode ${intentOutput.mode} ativado para ${scopeKey}`);
        }

        const cleanedText = text.replace(/^(lia|hey|olá|oi|ei|e|então|mas)\s+/i, '').trim();
        window.dispatchEvent(new CustomEvent('lia-request-snapshot'));
        const freshSnapshot = (window as any).__liaLastSnapshot;
        const localRes = tryLocalAnswer(cleanedText, { snapshot: freshSnapshot });

        if (localRes.answered && localRes.response) {
            addMessageToScope(scopeKey, { id: crypto.randomUUID(), type: 'lia', content: localRes.response, timestamp: Date.now() });
            if (source === 'text') return;
        }

        const intent = detectDashboardIntent(cleanedText);
        if (intent) {
            window.dispatchEvent(new CustomEvent('lia-dashboard-action', { detail: { type: intent.action, payload: intent.payload, pre_hash: freshSnapshot?.hash || '', action_id: `act_${Date.now()}` } }));
            if (targetMode === 'live' && source === 'voice' && intent.action === 'DASHBOARD_ADD_WIDGET') {
                setLiaStatus(`Adicionando ${intent.payload.type || 'widget'}...`);
                setTimeout(() => setLiaStatus(null), 3000);
            }
        }

        if (source === 'text') {
            if (lastMessageSentRef.current?.text === text && Date.now() - lastMessageSentRef.current.timestamp < 2000) return;
            lastMessageSentRef.current = { text, timestamp: Date.now() };

            // v6.0: Pass messageId to both channels for idempotency
            // Note: backendService.saveMessage is NOT called here anymore - the socket handler saves the message
            socketService.sendTextMessage(messageToSocket, targetConvId, messageId);
        }
    }, [getScopeKey, addMessageToScope, ensureConversationExists]);


    /**
     * Envia uma mensagem de texto (Legacy Wrapper)
     */
    const sendTextMessage = useCallback(async (text: string, mode?: 'chat' | 'multimodal' | 'live') => {
        await handleUserInput(text, 'text', mode);
    }, [handleUserInput]);


    // v3.5: Sync addToScopeRef for Gemini Live events
    // CRÍTICO: Usar o escopo ATIVO (definido pelo painel atual) para que mensagens apareçam no chat
    // v4.2: Blocos duplicados removidos para unificação no topo do componente

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

    // Sincronizar refs
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
            const storedAuth = localStorage.getItem('sb-dashboard-auth') || localStorage.getItem('supabase.auth.token');
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
                const storedAuth = localStorage.getItem('supabase.auth.token') || localStorage.getItem('sb-dashboard-auth');
                if (storedAuth) {
                    const parsed = JSON.parse(storedAuth);
                    token = parsed.access_token || parsed.token || '';
                }
            } catch (e) { }

            // v1.3.0: Buscar conexões do backend para plan awareness
            let connections: { gmail?: boolean; workspace?: boolean; calendar?: boolean } = {};
            try {
                const integrationsResponse = await fetch('/api/integrations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (integrationsResponse.ok) {
                    const integrationsData = await integrationsResponse.json();
                    const hasGoogle = integrationsData.integrations?.some((i: any) => i.provider === 'google' && i.status === 'active');
                    connections = { gmail: hasGoogle, workspace: hasGoogle, calendar: hasGoogle };
                    console.log('🔗 [LIAContext] Conexões carregadas:', connections);
                }
            } catch (e) {
                console.warn('⚠️ [LIAContext] Erro ao carregar conexões:', e);
            }

            // v1.3.0: Definir plano do usuário
            const userPlan = authPlan?.name || user?.app_metadata?.plan || 'free';

            // Configurar parâmetros de autenticação COM plano e conexões
            socketService.setAuthParams({
                token,
                userId: finalUserId,
                tenantId: finalUserId,
                plan: userPlan,
                connections
            });

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
            console.log('📬 [LIAContext] LIA-MESSAGE/AUDIO-RESPONSE recebido:', {
                hasPayload: !!payload,
                type: typeof payload,
                scope: activeScopeRef.current
            });

            const scopeKey = activeScopeRef.current;
            if (scopeKey) setTypingByScope(prev => ({ ...prev, [scopeKey]: false }));
            setIsTyping(false);
            setIsSpeaking(false);
            setIsThinking(false);
            setLiaStatus(null); // Limpar qualquer status pendente

            const text = typeof payload === 'string' ? payload : (payload.text || payload.reply || '');
            const convId = payload.conversationId || payload.convId || null;
            const mode = payload.mode || null;
            const audio = payload.audio || null;
            const functionCall = payload.function_call || payload.action || null;

            // ============================================
            // LIA-ACTION PROTOCOL: Dashboard Control (NEW)
            // Se o backend retornou uma função de controle, dispatch para o dashboard
            // ============================================
            if (functionCall) {
                try {
                    const liaAction = mapFunctionCallToLiaAction({
                        name: functionCall.name || 'modify_dashboard',
                        arguments: typeof functionCall.arguments === 'string'
                            ? functionCall.arguments
                            : JSON.stringify(functionCall.arguments || functionCall)
                    });

                    if (liaAction) {
                        console.log('🎯 [LIA-Action] Dispatching dashboard action:', liaAction);

                        // Feedback visual de status (APENAS SE ESTIVER EM CHAMADA DE VOZ/LIVE)
                        if (isLiveActive || isSpeaking || isListening) {
                            if (liaAction.type === 'DASHBOARD_REPLACE_WIDGET') {
                                setLiaStatus('Substituindo widget...');
                            } else if (liaAction.type === 'DASHBOARD_SET_PERIOD') {
                                setLiaStatus('Alterando período...');
                            } else if (liaAction.type === 'DASHBOARD_ADD_WIDGET') {
                                setLiaStatus('Adicionando widget...');
                            } else if (liaAction.type === 'DASHBOARD_GET_SNAPSHOT') {
                                setLiaStatus('Analisando dashboard...');
                            }
                        }

                        // Dispatch via custom event (DashboardContext escuta se estiver montado)
                        window.dispatchEvent(new CustomEvent('lia-dashboard-action', {
                            detail: liaAction
                        }));

                        // TAMBÉM enfileirar no Zustand store para cross-page (Dashboard não montado)
                        try {
                            // Acesso síncrono ao store Zustand
                            const store = (window as any).__LUMINNUS_STORE__;
                            if (store?.queueDashboardAction) {
                                store.queueDashboardAction({
                                    type: liaAction.type,
                                    payload: liaAction.payload,
                                    timestamp: Date.now()
                                });
                                console.log('📦 [LIA-Action] Ação enfileirada para Dashboard:', liaAction.type);
                            }
                        } catch (queueError) {
                            console.warn('⚠️ [LIA-Action] Falha ao enfileirar ação:', queueError);
                        }
                    }
                } catch (e) {
                    console.error('❌ [LIA-Action] Failed to dispatch:', e);
                }
            }

            if (!text && !audio) return;

            // v9.0: Response Gate Validation (SSOT Protocol)
            // DISABLED v9.1: This was causing infinite loops because the LIA response
            // doesn't contain corrections when asked for file upload but no file was received.
            // The validation layer needs redesign to ONLY validate when file context is present.
            const RESPONSE_GATE_ENABLED = false; // Feature flag - RE-ENABLE after fixing file context
            const lastIntent = lastIntentRef.current[scopeKey || ''];
            if (RESPONSE_GATE_ENABLED && lastIntent && (lastIntent.mode === 'A' || lastIntent.mode === 'C') && text) {
                const validation = validateResponse({
                    mode: lastIntent.mode,
                    liaResponse: text,
                    originalUserText: lastMessageSentRef.current?.text || ''
                });

                recordTelemetry({
                    mode: lastIntent.mode,
                    isValid: validation.isValid,
                    missingElements: validation.missingElements,
                    rerouteCount: rerouteCountRef.current[scopeKey || ''] || 0
                });

                if (!validation.isValid && validation.rerouteInstruction) {
                    const count = (rerouteCountRef.current[scopeKey || ''] || 0) + 1;
                    if (count <= 2) { // Max 2 attempts
                        console.warn(`🛡️ [ResponseGate] Resposta MODO ${lastIntent.mode} INVÁLIDA (Tentativa ${count}). Re-roteando...`);
                        rerouteCountRef.current[scopeKey || ''] = count;

                        // Enviar instrução de re-roteamento de volta para a LIA
                        if (mode === 'live' || socketService.getSocket()?.connected) {
                            socketService.sendTextMessage(validation.rerouteInstruction, convId);
                            setIsThinking(true);
                            return; // Interrompe o processamento desta resposta errada
                        }
                    } else {
                        console.error('🛡️ [ResponseGate] Máximo de tentativas de re-roteamento atingido. Liberando resposta imperfeita.');
                    }
                }
            }

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

            // v5.9: Suporte a tabelas no payload (Container visual)
            if (payload.table) {
                console.log('📋 [LIAContext] Tabela recebida no payload, renderizando...');
                dynamicContentManager.addDynamicContent('table', payload.table);
                setDynamicContent({
                    type: 'table',
                    title: payload.table.title || 'Tabela de Dados',
                    data: payload.table,
                    timestamp: Date.now()
                });
            }
            // v6.0: Descrição por Voz para Multi-Modal/Chat
            if (audio && audio.length > 0 && text) {
                setLiaStatus(`LIA: ${text}`);
                // Limpar legenda após um tempo razoável (ou quando o áudio acabar se tivéssemos o callback)
                // O playAudio define isSpeaking=false ao terminar, o que ajuda na UI
            }

            // v8.4: SNAPSHOT ROUNDTRIP CONSUMER
            // Se o conteúdo é um placeholder de análise, marcar para substituição futura
            const isPlaceholder = finalContent.includes('estou visualizando') || finalContent.includes('ver como está');

            // 2. Chat update
            const newMessage: Message = {
                id: `lia_${Date.now()}`,
                type: 'lia',
                content: finalContent,
                timestamp: Date.now(),
                attachments,
                metadata: {
                    ...(isPlaceholder ? { pending_snapshot: true } : {}),
                    // Injetar quick actions sugeridas se for MODO A
                    quickActions: lastIntent?.mode === 'A' ? suggestQuickActions(lastIntent.mode, lastMessageSentRef.current?.text || '', [], userRoleRef.current || 'client') : undefined
                }
            };
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

        // v3.0: Handler para quando o dashboard gera um snapshot (awareness)
        const handleSnapshotReady = (event: any) => {
            const snapshot = event.detail;
            console.log('📦 [LIAContext] Dashboard snapshot pronto:', snapshot);

            if (!snapshot || !snapshot.widgets) {
                console.warn('⚠️ [LIAContext] Snapshot vazio ou inválido');
                return;
            }

            // v7.4: Construir lista detalhada de widgets
            const widgetList = snapshot.widgets
                .map((w: any, i: number) => `${i + 1}. **${w.title || 'Sem título'}** (tipo: \`${w.type}\`)`)
                .join('\n');

            const factualContent = `📊 **Análise do seu Dashboard**\n\nIdentifiquei **${snapshot.widgetCount} widgets** ativos:\n\n${widgetList}\n\n---\n*Tipos ativos: ${snapshot.active_widget_types?.join(', ') || 'N/A'}*`;

            // v8.4: Tentar substituir placeholder pendente no escopo atual
            const targetScope = activeScopeRef.current
                || activeIdsByModeRef.current.multimodal
                || activeIdsByModeRef.current.chat;

            if (targetScope) {
                // v8.5: Se estiver em Multi-Modal, garantir que o targetScope seja o ID desse modo especificamente
                console.log(`📦 [LIAContext] Adicionando awareness ao escopo: ${targetScope}`);

                // Se houver placeholder, vamos substituir. Caso contrário, adiciona nova.
                const currentMsgs = messagesByScopeRef.current[targetScope] || [];
                const placeholderIdx = [...currentMsgs].reverse().findIndex(m => m.metadata?.pending_snapshot);

                if (placeholderIdx !== -1) {
                    const actualIdx = currentMsgs.length - 1 - placeholderIdx;
                    console.log('🔄 [LIAContext] Substituindo placeholder factual no índice:', actualIdx);

                    setMessagesByScope(prev => {
                        const newMsgs = [...(prev[targetScope] || [])];
                        newMsgs[actualIdx] = {
                            ...newMsgs[actualIdx],
                            id: `lia_fact_${Date.now()}`,
                            content: factualContent,
                            metadata: { ...newMsgs[actualIdx].metadata, pending_snapshot: false }
                        };
                        return { ...prev, [targetScope]: newMsgs };
                    });
                } else {
                    // Fallback: Adiciona nova mensagem
                    addMessageToScope(targetScope, {
                        id: `lia_snapshot_${Date.now()}`,
                        type: 'lia',
                        content: factualContent,
                        timestamp: Date.now(),
                    });
                }
            } else {
                console.warn('⚠️ [LIAContext] Nenhum escopo ativo para adicionar awareness');
            }

            if (socket.connected) {
                // v8.5: Usar explicitamente o convId do targetScope em vez de currentIdRef genérico
                socket.emit('lia-action-response', {
                    type: 'DASHBOARD_SNAPSHOT',
                    conversationId: targetScope,
                    data: snapshot
                });
            }
        };

        // Bind events
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('lia-typing', handleLIATyping);
        socket.on('lia-stop-typing', handleLIAStopTyping);
        socket.on('lia-message', handleLIAMessage);
        socket.on('audio-response', handleAudioResponse);
        socket.on('lia:render-table', (table: any) => {
            console.log('📊 [LIAContext] Evento lia:render-table recebido');
            processLIAResponse({ table });
        });
        socket.on('audio-ack', () => console.log('✅ Áudio ACK'));

        window.addEventListener('lia-dashboard-snapshot-ready', handleSnapshotReady);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('lia-typing', handleLIATyping);
            socket.off('lia-stop-typing', handleLIAStopTyping);
            socket.off('lia-message', handleLIAMessage);
            socket.off('audio-response', handleAudioResponse);
            socket.off('audio-ack');
            window.removeEventListener('lia-dashboard-snapshot-ready', handleSnapshotReady);
        };
    }, [authInitialized, isConnected]); // v7.0.1: trigger registration when socket becomes ready

    // ======================================================================
    // EVENTOS GEMINI LIVE (PARIDADE REAL)
    // ======================================================================
    useEffect(() => {
        const handleGeminiEvent = (event: GeminiLiveEvent) => {
            // CRÍTICO: Usar o escopo ATIVO (onde o usuário está) para que transcrições apareçam no chat correto
            const convId = activeScopeRef.current || currentIdRef.current || activeIdsByModeRef.current.multimodal || 'default';
            const scopeKey = convId; // Sem prefixo de modo - usa o escopo ativo diretamente
            const mode = 'live';

            console.log(`📡 [LIAContext] Evento Gemini: ${event.type} | Escopo Ativo: ${scopeKey}`);

            switch (event.type) {
                case 'connected':
                    setIsLiveActive(true);
                    setIsConnected(true);
                    break;
                case 'end':
                case 'error':
                    // v5.7: Sincronizar botão de voz em erros também
                    setIsLiveActive(false);
                    setIsListening(false);
                    setIsSpeaking(false);
                    setIsThinking(false);
                    setLiaStatus(null);
                    break;
                case 'listening':
                    setIsListening(true);
                    setIsSpeaking(false);
                    setIsThinking(false);
                    setLiaStatus(null); // v6.2: Limpar legenda ao começar a ouvir
                    break;
                case 'speaking':
                    setIsSpeaking(true);
                    setIsListening(false);
                    setIsThinking(false);
                    break;
                case 'generating-start':
                    setIsThinking(true);
                    setIsProcessingUpload(true);
                    // v7.0: Tool-specific status messages
                    const toolName = typeof event.data === 'string' ? event.data : '';
                    const toolStatusMap: Record<string, string> = {
                        // === GOOGLE WORKSPACE ===
                        'listCalendarEvents': '📅 Consultando Google Calendar...',
                        'searchCalendarEvents': '🔍 Pesquisando na sua agenda...',
                        'getCalendarEvent': '📅 Verificando detalhes do evento...',
                        'createCalendarEvent': '📅 Criando evento no Calendar...',
                        'updateCalendarEvent': '📅 Atualizando evento na agenda...',
                        'deleteCalendarEvent': '🗑️ Removendo evento da agenda...',
                        'listGmailMessages': '📧 Verificando seus e-mails...',
                        'searchGmail': '🔍 Pesquisando nos seus e-mails...',
                        'getGmailMessage': '📧 Lendo conteúdo do e-mail...',
                        'sendGmail': '📧 Enviando seu e-mail...',
                        'createGoogleSheet': '📊 Criando planilha no Sheets...',
                        'createGoogleDoc': '📄 Criando documento no Docs...',

                        // === SISTEMA E BUSCA ===
                        'searchWeb': '🌍 Pesquisando na internet...',
                        'getWeather': '🌦️ Verificando o clima...',
                        'getLocation': '📍 Buscando lugares próximos...',
                        'getDirections': '🚗 Calculando rota e tempo...',
                        'saveMemory': '🧠 Salvando na sua memória...',
                        'getCurrentTime': '🕒 Verificando hora atual...',
                        'processing': 'LIA está pensando...', // v7.0: Status genérico para turnos de texto
                    };
                    setLiaStatus(toolStatusMap[toolName] || (toolName !== 'processing' ? `⚙️ Executando ${toolName}...` : 'LIA está pensando...'));
                    break;
                case 'generating-end':
                    setIsThinking(false);
                    setIsProcessingUpload(false);
                    // Mantém status por 1.5s para o usuário ver que terminou
                    setTimeout(() => setLiaStatus(null), 1500);
                    break;
                // v7.0: Tool execution feedback
                case 'tool-active':
                    if (event.data === true) {
                        setIsThinking(true);
                    }
                    break;
                case 'tool-result':
                    // Exibir resultado brevemente se for sucesso
                    const result = event.data as any;
                    if (result?.success) {
                        setLiaStatus('✅ Concluído!');
                    } else if (result?.error) {
                        setLiaStatus('❌ Erro ao executar');
                    }
                    // Limpar após 2s
                    setTimeout(() => setLiaStatus(null), 2000);
                    break;
                case 'user-transcript':
                    if (typeof event.data === 'string') {
                        // v4.2: UNIFIED ENTRYPOINT para voz
                        handleUserInput(event.data, 'voice');
                    }
                    break;
                case 'lia-transcript':
                    if (typeof event.data === 'string' && addToScopeRef.current) {
                        setLiaStatus(`LIA: ${event.data}`);
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

                        // ============================================
                        // LIA-ACTION: Detectar intenções de dashboard no texto da voz
                        // Gemini Live não retorna function_call, então detectamos pelo texto
                        // ============================================
                        const detectedIntent = detectDashboardIntent(event.data as string);
                        if (detectedIntent) {
                            console.log('🎯 [LIA-Action] Intenção de voz detectada:', detectedIntent);

                            // Feedback de status
                            const statusMap: Record<string, string> = {
                                'DASHBOARD_ADD_WIDGET': 'Adicionando widget...',
                                'DASHBOARD_REMOVE_WIDGET': 'Removendo widget...',
                                'DASHBOARD_UPDATE_WIDGET': 'Atualizando widget...',
                                'DASHBOARD_REPLACE_WIDGET': 'Substituindo widget...',
                                'DASHBOARD_SET_PERIOD': 'Alterando período...',
                                'DASHBOARD_REORGANIZE': 'Reorganizando layout...'
                            };

                            setLiaStatus(statusMap[detectedIntent.action] || 'Atualizando dashboard...');
                            setTimeout(() => setLiaStatus(null), 4000);

                            window.dispatchEvent(new CustomEvent('lia-dashboard-action', {
                                detail: {
                                    type: detectedIntent.action,
                                    payload: detectedIntent.payload
                                }
                            }));
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

        // v5.8: SYNC VOZ - Recuperar estado da sessão se o componente remontar (troca de aba/app)
        const activeSession = geminiLiveService.getSession();
        if (activeSession && activeSession.isActive) {
            console.log('🔄 [LIAContext] Sessão de voz ativa detectada! Sincronizando interface...');
            setIsLiveActive(true);
            setIsListening(activeSession.isListening);
            setIsSpeaking(activeSession.isSpeaking);

            // O listener já foi atachado acima, então as transcrições serão processadas

            // Sincronizar ID da conversa se disponível
            if (activeSession.id && activeSession.id.startsWith('conv_')) {
                setCurrentConversationId(activeSession.id);
                currentIdRef.current = activeSession.id;
                setActiveScope(activeSession.id);
            }
        }

        return () => geminiLiveService.removeEventListener(handleGeminiEvent);
    }, [setActiveScope]);

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
            const storedAuth = localStorage.getItem('sb-dashboard-auth') || localStorage.getItem('supabase.auth.token');
            let authHeaders: any = { 'Content-Type': 'application/json' };
            if (storedAuth) {
                try {
                    const { access_token } = JSON.parse(storedAuth);
                    if (access_token) authHeaders['Authorization'] = `Bearer ${access_token}`;
                } catch (e) { }
            }

            // v4.5: Usar URL absoluta do backend
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/api/vision/generate`, {
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
        files: { file: File; preview?: string }[],
        mode?: 'chat' | 'multimodal' | 'live'
    ) => {
        if (files.length === 0) {
            await handleUserInput(text, 'text', mode || 'multimodal');
            return;
        }

        // Garantir que conversa exista e obter scopeKey
        const targetMode = mode || 'multimodal';
        const convId = await ensureConversationExists(targetMode);
        const scopeKey = getScopeKey(targetMode, convId!);

        const file = files[0];
        const prompt = text.trim() || 'Analise estes arquivos em detalhes.';

        const userMessage: Message = {
            id: `user_${Date.now()}`,
            type: 'user',
            content: prompt,
            timestamp: Date.now(),
            attachments: files.map(f => ({
                name: f.file.name,
                type: f.file.type.startsWith('image/') ? 'image' : 'document',
                url: f.preview
            }))
        };
        addMessageToScope(scopeKey, userMessage);
        console.log(`📎 Mensagem com ${files.length} attachment(s) adicionada ao escopo:`, scopeKey);

        // 2. Ativar loading para fase de UPLOAD (animação Luminnus)
        setIsProcessingUpload(true);
        setIsThinking(true); // v6.2: Ativar feedback de "pensando"

        try {
            console.log(`📤 Enviando ${files.length} arquivo(s) para análise`);

            const convId = scopeKey.split(':')[1] || '';
            const formData = new FormData();
            
            files.forEach(f => {
                formData.append('files', f.file);
            });

            const intentOutput = classifyIntent({
                userText: prompt,
                hasAttachment: true,
                attachmentType: files[0].file.type.startsWith('image/') ? 'image' : 'document',
                attachmentName: files[0].file.name,
                contextScope: 'General'
            });
            lastIntentRef.current[scopeKey] = intentOutput;
            rerouteCountRef.current[scopeKey] = 0;

            let finalPrompt = prompt;
            if (intentOutput.mode === 'A' || intentOutput.mode === 'C') {
                const instruction = intentOutput.mode === 'A'
                    ? getIncidentTemplateInstruction()
                    : getHybridTemplateInstruction();
                finalPrompt = `${prompt}\n\n[SISTEMA: PROTOCOLO DE LEITURA DE ARQUIVO ATIVADO]\n${instruction}`;
                console.log(`🛡️ [IntentRouter] Mode ${intentOutput.mode} (Vision) ativado para ${scopeKey}`);
            }

            formData.append('prompt', finalPrompt);
            formData.append('conversationId', convId);
            formData.append('messageId', userMessage.id);

            // v2.6: MENTE ÚNICA - Incluir credenciais explicitamente
            formData.append('userId', userIdRef.current || '');
            formData.append('tenantId', tenantIdRef.current || '');

            // Buscar token de autenticação
            const storedAuth = localStorage.getItem('sb-dashboard-auth') || localStorage.getItem('supabase.auth.token');
            let authHeaders: any = {};
            if (storedAuth) {
                try {
                    const authObj = JSON.parse(storedAuth);
                    const token = authObj.access_token || authObj.token;
                    if (token) authHeaders['Authorization'] = `Bearer ${token}`;
                } catch (e) { }
            }

            // Desativar loading de upload, ativar typing bubbles (aguardando resposta da AI)
            setIsProcessingUpload(false);
            setTypingForScope(scopeKey, true);

            const response = await fetch('/api/vision/analyze', {
                method: 'POST',
                headers: authHeaders,
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

            // v2.1: Atualizar a mensagem do usuário com as URLs persistentes
            const returnedAttachments = result.analysis?.detailPayload?.attachments;
            if (returnedAttachments && Array.isArray(returnedAttachments)) {
                setMessagesByScope(prev => {
                    const scopeMessages = [...(prev[scopeKey] || [])];
                    const userMsgIndex = scopeMessages.findIndex(m => m.id === userMessage.id);
                    if (userMsgIndex >= 0) {
                        scopeMessages[userMsgIndex] = {
                            ...scopeMessages[userMsgIndex],
                            attachments: returnedAttachments.map(att => ({
                                name: att.name,
                                type: att.type,
                                url: att.url,
                                id: att.id
                            }))
                        };
                    }
                    try {
                        localStorage.setItem(`lia_scope_${scopeKey}`, JSON.stringify(scopeMessages));
                    } catch (e) { }
                    return { ...prev, [scopeKey]: scopeMessages };
                });
                console.log('🔄 URLs dos attachments atualizadas para storageUrls persistentes');
            } else if (result.storageUrl) {
                // Fallback para arquivo único (v2.0)
                setMessagesByScope(prev => {
                    const scopeMessages = [...(prev[scopeKey] || [])];
                    const userMsgIndex = scopeMessages.findIndex(m => m.id === userMessage.id);
                    if (userMsgIndex >= 0 && scopeMessages[userMsgIndex].attachments) {
                        scopeMessages[userMsgIndex] = {
                            ...scopeMessages[userMsgIndex],
                            attachments: scopeMessages[userMsgIndex].attachments?.map(att => ({
                                ...att,
                                url: result.storageUrl,
                                id: result.fileId
                            }))
                        };
                    }
                    try {
                        localStorage.setItem(`lia_scope_${scopeKey}`, JSON.stringify(scopeMessages));
                    } catch (e) { }
                    return { ...prev, [scopeKey]: scopeMessages };
                });
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
            setIsThinking(false); // v4.12: Garantir reset do indicador de "pensando"
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
                // v5.8: Mente Única - Se o scope for um UUID, usar diretamente
                if (activeScopeRef.current.includes(':')) {
                    const [mode, id] = activeScopeRef.current.split(':');
                    uiMode = mode;
                    activeId = id;
                } else {
                    activeId = activeScopeRef.current;
                    uiMode = 'live'; // Fallback mode
                }
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
                authStorageKey: 'sb-dashboard-auth'
            });

            // v5.8: Mente Única - O escopo é apenas o ID
            setActiveScope(activeId);

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
        } finally {
            // SEMPRE resetar estados, mesmo se stopSession falhar
            // Isso garante que o botão sincronize corretamente
            setIsLiveActive(false);
            setIsListening(false);
            setIsSpeaking(false);
            setIsThinking(false);
            console.log('✅ Estados de voz resetados');
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

            const storedAuth = localStorage.getItem('sb-dashboard-auth') || localStorage.getItem('supabase.auth.token');
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

    const value: LIAState = useMemo(() => ({
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
        activeMode,
        setActiveMode,
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
        addDynamicContainer: (t: any, d: any) => dynamicContentManager.addDynamicContent(t, d),
        removeDynamicContainer: (id: string) => dynamicContentManager.removeContainer(id),
        clearDynamicContainers: () => dynamicContentManager.clearAll(),
        liaStatus,
        setLiaStatus,
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
        userRole,
        clearMessages,
        isTyping,
    }), [
        isConnected, conversationId, conversations, activeConversationIdByMode,
        currentConversationId, createConversation, switchConversation,
        renameConversation, deleteConversation, refreshConversations,
        getCurrentMessages, activeMode, setActiveMode, activeScope,
        messagesByScope, getMessagesForScope, addMessageToScope,
        clearScopeMessages, setActiveScope, getScopeKey, messages,
        typingByScope, isGeneratingImageByScope, getTypingForScope,
        setTypingForScope, setGeneratingImageForScope, voicePersonality,
        isSpeaking, isListening, isLiveActive, isInitialLoadDone,
        isThinking, isProcessingUpload, isProcessingDynamic, isCameraActive,
        memories, dynamicContent, dynamicContainers, liaStatus,
        sendTextMessage, addMessage, sendMessageWithFiles, sendAudioMessage,
        transcribeAndFillInput, analyzeFile, setVoicePersonality,
        startListening, stopListening, startLiveMode, stopLiveMode,
        loadMemories, saveMemory, deleteMemory, userId, tenantId,
        plan, userRole, clearMessages, isTyping
    ]);

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
