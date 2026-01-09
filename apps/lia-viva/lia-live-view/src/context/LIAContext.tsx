// ======================================================================
// 🧠 LIA Context - MENTE ÚNICA CENTRALIZADA
// ======================================================================
// A LIA existe UMA ÚNICA VEZ para todos os painéis
// Os painéis são apenas interfaces diferentes para a mesma mente
// ======================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { socketService } from '../services/socketService';
import { backendService, Memory } from '../services/backendService';
import { geminiLiveService, GeminiLiveSession, GeminiLiveEvent, UpdateService, UpdateAvailableEvent } from '../services/geminiLiveService';
import { dynamicContentManager, DynamicContainer } from '../services/dynamicContentManager';
import { AvatarOrchestrator } from '../components/FullBody/AvatarOrchestrator';

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
export type DynamicContentType = 'empty' | 'report' | 'chart' | 'table' | 'image' | 'pdf' | 'custom' | 'json' | 'analysis' | 'text' | 'none';

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
  createConversation: (mode: 'chat' | 'multimodal' | 'live') => Conversation;
  switchConversation: (id: string, mode?: 'chat' | 'multimodal' | 'live') => void;
  renameConversation: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
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
  isTyping: boolean; // LEGADO - global, mantido para compatibilidade

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
  isSearching: boolean; // v5.2: Ativo quando LIA está pesquisando/processando ferramenta
  isLiveActive: boolean; // Gemini Live ativo

  // Memórias
  memories: Memory[];

  // Conteúdo Dinâmico (gráficos, tabelas, etc)
  dynamicContent: DynamicContent | null;
  setDynamicContent: (content: DynamicContent | null) => void;
  isProcessingUpload: boolean;
  setIsProcessingUpload: (processing: boolean) => void;

  // Múltiplos Containers Dinâmicos
  dynamicContainers: DynamicContainer[];
  addDynamicContainer: (type: any, data: any) => string;
  removeDynamicContainer: (id: string) => void;
  clearDynamicContainers: () => void;

  // Métodos de Mensagem
  addMessage: (message: Message, scopeKey?: string) => void;
  sendTextMessage: (text: string, mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
  sendMessageWithFiles: (text: string, files: { file: File; preview?: string }[], mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
  sendAudioMessage: (audioBlob: Blob, mode?: 'chat' | 'multimodal' | 'live') => Promise<void>;
  transcribeAndFillInput: (audioBlob: Blob) => Promise<string | null>;
  analyzeFile: (file: File) => Promise<void>;

  // Métodos de Voz
  setVoicePersonality: (personality: 'clara' | 'viva' | 'firme') => void;
  startListening: () => void;
  stopListening: () => void;

  // Métodos Live (Gemini Live)
  startVoice: () => Promise<void>;
  stopVoice: () => Promise<void>;
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
  const [isSearching, setIsSearching] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);

  // Sync isSearching with AvatarOrchestrator
  useEffect(() => {
    AvatarOrchestrator.onSearching(isSearching);
  }, [isSearching]);

  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [dynamicContent, setDynamicContent] = useState<DynamicContent | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [dynamicContainers, setDynamicContainers] = useState<DynamicContainer[]>([]);

  // Refs para controle de áudio e modo
  const isLiveActiveRef = useRef(false);
  const activeModeRef = useRef<'chat' | 'multimodal' | 'live'>('chat');
  const audioPlayingRef = useRef<HTMLAudioElement | null>(null);

  // Estado do Usuário
  const [userId, setUserId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const tenantIdRef = useRef<string | null>(null);
  const lastLocationSentAtRef = useRef<number>(0);

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
  messagesRef.current = messages;

  // v2.8: Controle de registro de conversa para evitar rooms duplicadas/stale
  const lastRegisteredConversationIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<{ [id: string]: Conversation }>({});
  const currentIdRef = useRef<string | null>(null);
  const activeIdsByModeRef = useRef<Record<'chat' | 'multimodal' | 'live', string | null>>({ chat: null, multimodal: null, live: null });
  const messagesByScopeRef = useRef<Record<string, Message[]>>({});
  const activeScopeRef = useRef<string | null>(null);

  // Sincronizar Refs com Estados reativos
  useEffect(() => {
    isLiveActiveRef.current = isLiveActive;
  }, [isLiveActive]);

  useEffect(() => {
    const mode = activeScope?.split(':')[0] as any;
    if (mode) activeModeRef.current = mode;
  }, [activeScope]);

  // CRITICAL: Refs for functions to stabilize useEffect dependencies
  // v2.6: Sistema de Updates (Fase 8)
  useEffect(() => {
    console.log('🔄 [UpdateService] Iniciando monitoramento centralizado (v4.0.0)...');
    UpdateService.initialize({
      currentVersion: '4.0.0',
      apiUrl: import.meta.env.VITE_API_URL || '',
    });

    const unbindUpdate = UpdateService.onUpdateAvailable((event: UpdateAvailableEvent) => {
      console.log('✨ [Update] Nova versão detectada:', event.newVersion);
      setNewVersion(event.newVersion);
      setShowUpdateBanner(true);
    });

    UpdateService.startPolling(120000); // 2 minutos para não sobrecarregar

    return () => {
      unbindUpdate();
      UpdateService.stopPolling();
    };
  }, []);

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
      const storedAuth = localStorage.getItem('supabase.auth.token');
      if (storedAuth) {
        try {
          const authData = JSON.parse(storedAuth);
          const uId = authData.user?.id || null;
          const userPlan = authData.user?.app_metadata?.plan || null;
          if (uId) {
            setUserId(uId);
            setTenantId(uId); // Em dev usamos o mesmo ID para tenant
            setPlan(userPlan);
            console.log('👤 [LIAContext] Usuário sincronizado:', uId, 'Plano:', userPlan);

            // Sincronizar com o socket para voz/realtime
            import('@/services/socketService').then(({ socketService }) => {
              if (currentIdRef.current) {
                socketService.registerConversation(currentIdRef.current, uId, uId);
              }
            });
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

  // ======================================================================
  // API DE MENSAGENS POR ESCOPO
  // ======================================================================

  // v4.4: SCOPE UNIFICADO - O escopo é apenas o ID da conversa (mente única)
  const getScopeKey = useCallback((_mode: 'chat' | 'multimodal' | 'live', convId: string): string => {
    return convId;
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

  // Carregar conversas do localStorage (v4 - Suporte a Modos Isolados) + Supabase (v5)
  useEffect(() => {
    const loadConversations = async () => {
      try {
        // 1. Primeiro carrega do localStorage (cache local para UX rápido)
        const stored = localStorage.getItem('lia_conversations_v4');
        let localConvs: { [id: string]: Conversation } = {};
        let localActiveIds: Record<'chat' | 'multimodal' | 'live', string | null> = { chat: null, multimodal: null, live: null };
        let localCurrentId: string | null = null;

        if (stored) {
          const parsed = JSON.parse(stored);
          localConvs = parsed.conversations || {};
          localActiveIds = parsed.activeIdsByMode || { chat: null, multimodal: null, live: null };
          localCurrentId = parsed.currentId || localActiveIds.chat || null;
          console.log(`📋 ${Object.keys(localConvs).length} conversas carregadas do localStorage`);
        }

        // 2. Depois carrega do Supabase (fonte primária com isolamento por user_id)
        const dbConversations = await backendService.loadConversationsFromDB();

        if (dbConversations.length > 0) {
          // Converter formato do DB para formato do estado
          const dbConvs: { [id: string]: Conversation } = {};
          dbConversations.forEach(conv => {
            dbConvs[conv.id] = {
              id: conv.id,
              mode: (conv.mode as 'chat' | 'multimodal' | 'live') || 'chat',
              title: conv.title || 'Conversa',
              messages: [], // Mensagens são carregadas sob demanda
              createdAt: new Date(conv.created_at).getTime(),
              updatedAt: new Date(conv.updated_at).getTime()
            };
          });

          // Mesclar: priorizar dados do banco (mais atualizados) mas manter mensagens do localStorage
          const mergedConvs = { ...localConvs };
          Object.keys(dbConvs).forEach(id => {
            if (mergedConvs[id]) {
              // Conversa existe em ambos - manter mensagens locais, atualizar metadados do DB
              mergedConvs[id] = {
                ...mergedConvs[id],
                title: dbConvs[id].title,
                updatedAt: dbConvs[id].updatedAt
              };
            } else {
              // Conversa só existe no DB - adicionar
              mergedConvs[id] = dbConvs[id];
            }
          });

          localConvs = mergedConvs;
          console.log(`✅ ${dbConversations.length} conversas do Supabase mescladas. Total: ${Object.keys(localConvs).length}`);
        }

        // Harmonizar IDs ao carregar
        if (localActiveIds.chat && !localActiveIds.multimodal) {
          localActiveIds.multimodal = localActiveIds.chat;
        }
        if (localActiveIds.chat && !localActiveIds.live) {
          localActiveIds.live = localActiveIds.chat;
        }

        setConversations(localConvs);
        setActiveConversationIdByMode(localActiveIds);
        setCurrentConversationId(localCurrentId);

        conversationsRef.current = localConvs;
        activeIdsByModeRef.current = localActiveIds;
        currentIdRef.current = localCurrentId;

        // Carregar mensagens de cada conversa para os escopos
        const initialScopes: Record<string, Message[]> = {};
        Object.values(localConvs).forEach(conv => {
          if (conv.messages && conv.messages.length > 0) {
            const scopeKey = conv.id;
            initialScopes[scopeKey] = conv.messages;
          }
        });
        setMessagesByScope(initialScopes);
        messagesByScopeRef.current = initialScopes;

      } catch (error) {
        console.error('Erro ao carregar conversas:', error);
        // Fallback para v3 se existir
        try {
          const v3 = localStorage.getItem('lia_conversations_v3');
          if (v3) {
            const parsed = JSON.parse(v3);
            const loadedConvs = parsed.conversations || {};
            const loadedCurrentId = parsed.currentId || null;
            setConversations(loadedConvs);
            setCurrentConversationId(loadedCurrentId);
            setActiveConversationIdByMode({ chat: loadedCurrentId, multimodal: null, live: null });
          }
        } catch (e) {
          console.error('Falha no fallback v3:', e);
        }
      }
    };

    loadConversations();
  }, []);

  // Função para salvar no localStorage
  const saveToStorage = useCallback((
    convs: { [id: string]: Conversation },
    currentId: string | null,
    activeIds: Record<'chat' | 'multimodal' | 'live', string | null>
  ) => {
    try {
      localStorage.setItem('lia_conversations_v4', JSON.stringify({
        conversations: convs,
        currentId: currentId,
        activeIdsByMode: activeIds
      }));
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
        // v4.4: O escopo agora é apenas o ID da conversa (mente única)
        const scopeKey = convId;
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
  const createConversation = useCallback((mode: 'chat' | 'multimodal' | 'live') => {
    // Salvar conversa atual do modo (se houver)
    saveCurrentConversation(mode);

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

    // v4.4: MENTE ÚNICA SSOT - Todas as conversas orbitam o ID principal
    // Se criamos em qualquer modo, ele se torna o ID para todos
    setActiveConversationIdByMode(prev => {
      const updated = {
        chat: newConv.id,
        multimodal: newConv.id,
        live: newConv.id
      };

      activeIdsByModeRef.current = updated;
      setCurrentConversationId(newConv.id);
      currentIdRef.current = newConv.id;

      return updated;
    });

    // Registrar no socket
    socketService.registerConversation(newConv.id, userIdRef.current || undefined, tenantIdRef.current || undefined);

    // v4.4: SCOPE UNIFICADO - Usar apenas o ID como chave (sem prefixo de modo)
    const scopeKey = newConv.id;
    setActiveScope(scopeKey);

    saveToStorage(updatedConvs, newConv.id, activeIdsByModeRef.current);

    // v5.0: Persistir no Supabase para sincronização multi-dispositivo e isolamento por user_id
    backendService.createConversationInDB(newConv.id, mode, newConv.title).catch(err => {
      console.warn('⚠️ Falha ao persistir conversa no Supabase (continuando com localStorage):', err);
    });

    console.log(`✅ Nova conversa unificada criada: ${newConv.title}`);

    return newConv;
  }, [saveCurrentConversation, saveToStorage, setActiveScope]);

  // Trocar de conversa
  const switchConversation = useCallback((id: string, mode?: 'chat' | 'multimodal' | 'live') => {
    const conv = conversationsRef.current[id];
    if (!conv) return;

    const targetMode = mode || conv.mode;

    // PRIMEIRO: Salvar conversa atual do modo
    saveCurrentConversation(targetMode);

    setActiveConversationIdByMode(prev => {
      const updated = { ...prev, [targetMode]: id };
      activeIdsByModeRef.current = updated;

      // v2.6: SENPRE atualizar ID atual/global para que outros serviços (como Gemini Live)
      // saibam qual é a conversa visível na tela no momento
      setCurrentConversationId(id);
      currentIdRef.current = id;

      return updated;
    });

    const scopeKey = id;
    setActiveScope(scopeKey);

    // Registrar no socket
    socketService.registerConversation(id, userIdRef.current || undefined, tenantIdRef.current || undefined);

    saveToStorage(conversationsRef.current, id, activeIdsByModeRef.current);

    // v2.6: Sincronizar com o serviço Gemini Live se ele estiver ativo
    geminiLiveService.setSessionConversationId(id);
    geminiLiveService.setUIMode(targetMode);

    console.log(`📖 Conversa trocada: ${conv.title} | ID: ${id}`);

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

    // v4.5: SSOT - Se já existe alguma conversa (especialmente chat), usá-la.
    const unifiedId = activeIds.chat || activeIds.multimodal || activeIds.live;

    if (unifiedId) {
      if (!activeIds[mode]) {
        console.log(`🔗 [SSOT] Sincronizando modo ${mode} com conversa existente: ${unifiedId}`);
        setActiveConversationIdByMode(prev => {
          const updated = { ...prev, [mode]: unifiedId };
          activeIdsByModeRef.current = updated;
          return updated;
        });
      }
      return unifiedId;
    }

    // Se não há NENHUMA conversa, criar uma unificada
    console.log(`📝 AUTO-CREATE: Criando conversa unificada para ${mode}...`);
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

    setActiveConversationIdByMode(_prev => {
      const updated = {
        chat: newConv.id,
        multimodal: newConv.id,
        live: newConv.id
      };
      activeIdsByModeRef.current = updated;
      return updated;
    });

    saveToStorage(updatedConvs, newConv.id, activeIdsByModeRef.current);
    console.log(`✅ Conversa AUTO-CRIADA e UNIFICADA: ${newConv.title}`);
    return newConv.id;
  }, [saveToStorage]);

  // Refs
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
      // Se paramos a voz manualmente ou mudamos de aba/perfil, ignorar novos áudios que cheguem atrasados
      if (activeModeRef.current === 'multimodal' && !isLiveActiveRef.current && !localStorage.getItem('lia_voice_active')) {
        // Nota: lia_voice_active é um sinal extra para garantir que não toquemos se o usuário fechou o microfone
        // console.log('🔇 [LIAContext] Ignorando áudio pois a sessão de voz não está ativa no modo multimodal.');
        // return;
      }

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

  const stopTalking = useCallback(() => {
    console.log('🔇 [LIAContext] Interrompendo fala da LIA...');
    if (audioPlayingRef.current) {
      audioPlayingRef.current.pause();
      audioPlayingRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Helper para adicionar mensagem a um escopo específico ou ao ativo
  const addToScope = useCallback((message: Message, mode?: 'chat' | 'multimodal' | 'live', id?: string) => {
    // v5.4: PRIORIDADE ao escopo ativo (o que o usuário está vendo)
    // Isso garante que respostas apareçam no mesmo escopo que a pergunta
    const scopeKey = activeScopeRef.current || id || currentIdRef.current || 'default';

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
  // SYNC: Sincroniza memórias com o GeminiLiveService (Memória Cognitiva v3.0)
  // ======================================================================
  useEffect(() => {
    // v2.8: Só sincroniza automaticamente se o modo atual for LIVE
    // Para outros modos, o sync ocorre sob demanda no startLiveMode
    if (memories.length > 0 && activeModeRef.current === 'live') {
      const formattedMemories = memories.map((m: any) => ({
        key: m.key || m.type || 'info',
        value: m.value || m.content || ''
      }));
      geminiLiveService.setMemoriesCache(formattedMemories);
      console.log(`🧠 [LIAContext] Memórias sincronizadas com GeminiLive (Real-time): ${formattedMemories.length}`);
    }
  }, [memories]);

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
    const socket = socketService.getSocket();

    // Eventos de conexão
    const handleConnect = () => {
      console.log('✅ LIAContext: Socket conectado');
      setIsConnected(true);
      const convId = socketService.getConversationId();
      setConversationId(convId);

      // Capturar localização ao conectar (Throttled: 2 minutos)
      const now = Date.now();
      if (now - lastLocationSentAtRef.current > 120000) {
        lastLocationSentAtRef.current = now;
        backendService.captureAndSendLocation(convId || undefined, userIdRef.current || undefined).catch(console.error);
      }

      // Carregar memórias ao conectar (using ref to avoid unstable deps)
      if (loadMemoriesRef.current) loadMemoriesRef.current();
    };

    const handleDisconnect = () => {
      console.log('❌ LIAContext: Socket desconectado');
      setIsConnected(false);
    };

    // Eventos da LIA via Socket.IO - agora com typing por escopo
    const handleLIATyping = () => {
      const scopeKey = activeScopeRef.current;
      if (scopeKey) {
        setTypingByScope(prev => ({ ...prev, [scopeKey]: true }));
      }
      setIsTyping(true); // Global para compatibilidade
      console.log(`💬 [lia-typing] Scope: ${scopeKey}`);
    };

    const handleLIAStopTyping = () => {
      const scopeKey = activeScopeRef.current;
      if (scopeKey) {
        setTypingByScope(prev => ({ ...prev, [scopeKey]: false }));
      }
      setIsTyping(false);
    };

    /**
     * v2.7: PROCESSADOR ÚNICO DE MENSAGENS LIA
     * Centraliza parsing, lousa (dynamicContentManager) e chat
     */
    const processLIAResponse = (payload: any) => {
      const scopeKey = activeScopeRef.current;
      if (scopeKey) {
        setTypingByScope(prev => ({ ...prev, [scopeKey]: false }));
      }
      setIsTyping(false);
      setIsSpeaking(false);

      const text = typeof payload === 'string' ? payload : (payload.text || payload.reply || '');
      const convId = payload.conversationId || payload.convId || null;
      const mode = payload.mode || null;
      const audio = payload.audio || null;

      if (!text && !audio) return;

      // 0. Tocar áudio se presente (MESMO sem texto)
      if (audio && audio.length > 0 && playAudioRef.current) {
        console.log('🔊 [LIAContext] Reproduzindo áudio recebido...');
        playAudioRef.current(audio);
      }

      // Se não tem texto e não tem attachments, não cria bolha de chat
      if (!text && !payload.attachments) {
        console.log('ℹ️ [LIAContext] Resposta apenas com áudio ou vazia - ignorando geração de bolha');
        return;
      }

      console.log(`💬 [LIAContext] Processando resposta (${mode || 'socket'}):`, text.substring(0, 50) + '...');

      // 1. Tentar detectar JSON estruturado (Lousa)
      const parsedContent = tryParseStructuredContent(text);
      let attachments: Message['attachments'] = undefined;
      let finalContent = text;

      if (parsedContent) {
        console.log('📊 Conteúdo estruturado detectado!', parsedContent.type);

        // Adicionar ao DynamicContentManager (Lousa Real)
        dynamicContentManager.addDynamicContent(parsedContent.type as any, parsedContent.data);

        // Atualizar estado legado para compatibilidade
        setDynamicContent(parsedContent);

        // Se for imagem, configurar miniaturas e limpar texto do chat
        if (parsedContent.type === 'image') {
          const imageData = parsedContent.data as any;
          finalContent = '🖼️ Imagem gerada com sucesso! Clique para ver detalhes.';
          attachments = [{
            name: imageData.prompt || 'Imagem gerada',
            type: 'image',
            url: imageData.url
          }];
        } else {
          finalContent = parsedContent.title ||
            (parsedContent.type === 'chart' ? '📊 Gráfico gerado!' :
              parsedContent.type === 'table' ? '📋 Tabela gerada!' : '✅ Conteúdo gerado!');
        }
      }

      // 2. Adicionar ao chat se não for duplicado
      const newMessage: Message = {
        id: `lia_${Date.now()}`,
        type: 'lia',
        content: finalContent,
        timestamp: Date.now(),
        attachments
      };

      // Evitar duplicidade exata no mesmo escopo (comum entre lia-message e audio-response)
      const currentScopeMessages = messagesByScopeRef.current[scopeKey || ''] || [];
      const lastMsg = currentScopeMessages[currentScopeMessages.length - 1];

      if (!lastMsg || lastMsg.content !== finalContent || attachments) {
        if (addToScopeRef.current) {
          addToScopeRef.current(newMessage, mode, convId);
        }
      }
    };

    const handleLIAMessage = (payload: any) => processLIAResponse(payload);
    const handleAudioResponse = (payload: any) => processLIAResponse(payload);
    const handleAudioAck = () => {
      console.log('✅ Áudio recebido pelo servidor');
    };

    const handleUserTranscript = (text: string) => {
      console.log('🗣️ [user-transcript] Recebido:', text);
      const scopeKey = activeScopeRef.current;
      if (scopeKey) {
        const userMessage: Message = {
          id: `user_${Date.now()}`,
          type: 'user',
          content: text,
          timestamp: Date.now()
        };
        if (addToScopeRef.current) {
          // No escopo unificado, mode é irrelevante para a chave mas mantemos por compatibilidade
          addToScopeRef.current(userMessage, 'multimodal', scopeKey);
        }
      }
    };

    // Registrar eventos
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('lia-typing', handleLIATyping);
    socket.on('lia-stop-typing', handleLIAStopTyping);
    socket.on('lia-message', handleLIAMessage);
    socket.on('audio-response', handleAudioResponse);
    socket.on('user-transcript', handleUserTranscript);
    socket.on('audio-ack', handleAudioAck);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('lia-typing', handleLIATyping);
      socket.off('lia-stop-typing', handleLIAStopTyping);
      socket.off('lia-message', handleLIAMessage);
      socket.off('audio-response', handleAudioResponse);
      socket.off('user-transcript', handleUserTranscript);
      socket.off('audio-ack', handleAudioAck);
    };
  }, []); // CRITICAL: Empty deps - handlers use refs internally

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
      setIsProcessingUpload(true);

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
      setIsProcessingUpload(false);
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

    // v5.4: Scope unificado - usar o activeScope diretamente (que já é o convId)
    // Se o activeScopeRef.current existir, usamos ele. Senão, usamos o do chat.
    let scopeKey = activeScopeRef.current;

    if (!scopeKey) {
      // Fallback: usar conversa ativa do chat como fonte de verdade
      scopeKey = activeIdsByModeRef.current.chat || activeIdsByModeRef.current.multimodal;
    }

    if (!scopeKey) {
      // Último recurso: criar nova conversa
      scopeKey = ensureConversationExists('chat');
    }

    console.log(`📤 [sendTextMessage] Modo: ${mode || 'auto'}, Scope: ${scopeKey}`);

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
      // v5.4: Usar scopeKey como conversationId (escopo unificado)
      socketService.registerConversation(scopeKey, userIdRef.current || undefined, tenantIdRef.current || undefined);
      socketService.sendTextMessage(fullText, scopeKey, userIdRef.current || undefined, tenantIdRef.current || undefined);
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
    const scopeKey = convId; // v4.4: Scope unificado = conversationId (sem modo)

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
   * Handler de eventos do Gemini Live
   * VERSÃO LIMPA - apenas atualiza estados, sem salvamento automático
   */
  const handleGeminiLiveEvent = useCallback((event: GeminiLiveEvent) => {
    switch (event.type) {
      case 'tool-active' as any:
        console.log(`🔎 [Live] Tool Activity: ${event.data}`);
        setIsSearching(!!event.data);
        break;

      case 'connected':
        console.log('✅ Conectado ao Gemini Live');
        break;

      case 'listening':
        setIsListening(true);
        setIsSpeaking(false);
        break;

      case 'speaking':
        setIsSpeaking(true);
        setIsListening(false);
        break;

      // ======================================================================
      // TRANSCRIÇÕES VOZ→CHAT - Recebidas do GeminiLiveService
      // Agora usa sistema de escopo para isolamento entre modos
      // ======================================================================
      case 'user-transcript':
        if (event.data) {
          // v4.4: SSOT - Usar sempre o ID da conversa sem modo para o scope
          const convId = currentIdRef.current || 'default';
          const scopeKey = convId;

          console.log(`🎤 TRANSCRIPT_RECEIVED {conversationId: "${convId}", length: ${(event.data as string).length}, source: "gemini"}`);

          const userMsg: Message = {
            id: `user_live_${Date.now()}`,
            type: 'user',
            content: event.data as string,
            timestamp: Date.now(),
          };

          if (addToScopeRef.current) {
            console.log(`   ✅ Adicionando ao escopo unificado: convId=${convId}`);
            addToScopeRef.current(userMsg, 'live', convId);

            // v2.4: PERSISTÊNCIA - Salvar transcrição no banco
            try {
              if (convId) {
                backendService.saveMessage(convId, 'user', event.data as string, 'voice');
                console.log(`💾 MESSAGE_SAVED {conversationId: "${convId}", modality: "voice", role: "user"}`);
              }
            } catch (err) {
              console.warn('⚠️ [Live] Falha ao persistir transcrição do usuário:', err);
            }
          } else {
            console.warn('⚠️ [user-transcript] addToScopeRef.current não definido!');
          }

          // v2.3: AUTO-MEMÓRIA - Tentar extrair memórias da fala do usuário automaticamente
          try {
            backendService.saveMemory(event.data as string).catch(err => {
              console.warn('⚠️ [Auto-Memory] Falha ao processar transcrição para memória:', err);
            });
          } catch (err) {
            // Ignorar erros silenciosamente (não-crítico)
          }
        }
        break;

      case 'lia-transcript':
        if (event.data) {
          const convId = currentIdRef.current || 'default';
          const scopeKey = convId;
          console.log(`🤖 TRANSCRIPT_RECEIVED {conversationId: "${convId}", length: ${(event.data as string).length}, source: "lia"}`);

          const liaMsg: Message = {
            id: `lia_live_${Date.now()}`,
            type: 'lia',
            content: event.data as string,
            timestamp: Date.now(),
          };

          if (addToScopeRef.current) {
            console.log(`   ✅ Adicionando ao escopo unificado: convId=${convId}`);
            addToScopeRef.current(liaMsg, 'live', convId);

            // v2.4: PERSISTÊNCIA - Salvar transcrição da LIA no banco
            try {
              if (convId) {
                backendService.saveMessage(convId, 'assistant', event.data as string, 'voice');
                console.log(`💾 MESSAGE_SAVED {conversationId: "${convId}", modality: "voice", role: "assistant"}`);
              }
            } catch (err) {
              console.warn('⚠️ [Live] Falha ao persistir transcrição da LIA:', err);
            }
          } else {
            console.warn('⚠️ [lia-transcript] addToScopeRef.current não definido!');
          }
        }
        break;

      case 'generating-start':
        setIsTyping(true);
        break;

      case 'image-generated':
      case 'chart-generated':
      case 'table-generated':
        if (event.data) {
          const scopeKey = activeScopeRef.current || 'live:default';
          const typeEmoji = event.type === 'chart-generated' ? '📊' : event.type === 'table-generated' ? '📋' : '🖼️';
          const typeName = event.type === 'chart-generated' ? 'Gráfico' : event.type === 'table-generated' ? 'Tabela' : 'Imagem';

          let attachments: Message['attachments'] = undefined;
          const edata = event.data as any;
          if (event.type === 'image-generated' && edata?.url) {
            attachments = [{
              name: 'Imagem gerada',
              type: 'image',
              url: edata.url
            }];
            // ATUALIZAR LOUSA
            dynamicContentManager.addDynamicContent('image', {
              url: edata.url,
              prompt: edata.prompt || 'Imagem gerada'
            });
          } else if (event.type === 'chart-generated' || event.type === 'table-generated') {
            // Atualizar lousa
            dynamicContentManager.addDynamicContent(
              (event.type === 'chart-generated' ? 'chart' : 'table') as any,
              edata
            );
          }

          const convId = currentIdRef.current || 'default';
          if (addToScopeRef.current) {
            console.log(`   ✅ Visual gerado adicionado ao escopo unificado: convId=${convId}`);
            addToScopeRef.current({
              id: `lia_live_${Date.now()}`,
              type: 'lia',
              content: `${typeEmoji} ${typeName} gerado com sucesso! Clique para ver detalhes.`,
              timestamp: Date.now(),
              attachments
            }, 'live', convId);
          }
        }
        break;

      case 'generating-end':
        setIsTyping(false);
        break;


      case 'message':
        {
          const convId = currentIdRef.current || 'default';
          const edata = event.data as any;

          if (edata?.type === 'image-generated') {
            const imageUrl = edata.content?.url;
            const imagePrompt = edata.content?.prompt;
            const imageCaption = edata.content?.caption;

            setDynamicContent({
              type: 'image',
              data: { url: imageUrl, alt: imagePrompt, caption: imageCaption }
            });

            const liaImgMsg: Message = {
              id: `lia_img_${Date.now()}`,
              type: 'lia',
              content: imageCaption || `🖼️ Imagem gerada: "${imagePrompt?.substring(0, 50)}..."`,
              timestamp: Date.now(),
              attachments: [{ name: imageCaption || 'Imagem gerada', type: 'image', url: imageUrl }]
            };
            if (addToScopeRef.current) addToScopeRef.current(liaImgMsg, 'live', convId);

          } else if (edata?.type === 'chart-generated') {
            setDynamicContent({ type: 'chart', data: edata.content });
            const liaChartMsg: Message = {
              id: `lia_chart_${Date.now()}`,
              type: 'lia',
              content: '📊 Gráfico gerado! Veja no painel de conteúdo dinâmico.',
              timestamp: Date.now()
            };
            if (addToScopeRef.current) addToScopeRef.current(liaChartMsg, 'live', convId);

          } else if (edata?.type === 'table-generated') {
            setDynamicContent({ type: 'table', data: edata.content });
            const liaTableMsg: Message = {
              id: `lia_table_${Date.now()}`,
              type: 'lia',
              content: '📋 Tabela gerada! Veja no painel de conteúdo dinâmico.',
              timestamp: Date.now()
            };
            if (addToScopeRef.current) addToScopeRef.current(liaTableMsg, 'live', convId);
          }
        }
        break;

      case 'error':
        console.error('❌ Erro Gemini Live:', event.data);
        setIsLiveActive(false);
        setIsListening(false);
        setIsSpeaking(false);
        break;

      case 'end':
        console.log('🔌 Sessão Gemini Live encerrada');
        setIsLiveActive(false);
        setIsListening(false);
        setIsSpeaking(false);
        break;
    }
  }, []);

  /**
   * Scenario 1: MULTIMODAL VOICE (Backend-driven)
   * Captura áudio e envia via Socket.IO em tempo real
   */
  const voiceRecorderRef = useRef<{ stream: MediaStream | null; context: AudioContext | null; node: ScriptProcessorNode | null }>({ stream: null, context: null, node: null });

  const startVoice = useCallback(async () => {
    try {
      console.log('🎤 Iniciando Voz Multimodal (Backend-driven)...');
      stopTalking(); // v4.1: Interrompe a LIA imediatamente ao começar a falar

      // 1. Garantir conversationId (MESMA DO CHAT)
      let activeId = activeIdsByModeRef.current.multimodal || activeIdsByModeRef.current.chat || '';
      if (!activeId || activeId === 'default') {
        const newConv = createConversation('multimodal');
        activeId = newConv.id;
      }

      // 2. Registrar no Socket.IO (SSOT: Garante room correta antes do fluxo de áudio)
      if (lastRegisteredConversationIdRef.current !== activeId) {
        console.log(`🔌 [Socket] Registrando conversa no modoMultimodal: ${activeId}`);
        socketService.registerConversation(activeId);
        lastRegisteredConversationIdRef.current = activeId;
      }

      // 3. Captura mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext({ sampleRate: 16000 });
      const source = context.createMediaStreamSource(stream);
      const node = context.createScriptProcessor(4096, 1, 1);

      // v2.7: Detecção de Silêncio para "Real-time" feel
      let lastVoiceTime = Date.now();
      let hasChunks = false;
      const SILENCE_THRESHOLD = 0.050; // Sensibilidade reduzida (era 0.015) para evitar ruído fantasma
      const SILENCE_DURATION = 2000; // 2.0 segundos de silêncio para processar (era 1.5)

      node.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);

        // Calcular volume (RMS)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);

        if (rms > SILENCE_THRESHOLD) {
          lastVoiceTime = Date.now();
          hasChunks = true;
        } else {
          // Se silêncio persistir por SILENCE_DURATION, processar o que temos
          if (hasChunks && Date.now() - lastVoiceTime > SILENCE_DURATION) {
            console.log('🤫 Silêncio detectado - processando áudio automaticamente...');
            socketService.sendAudioEnd();
            hasChunks = false; // Resetar para o próximo bloco de fala
            lastVoiceTime = Date.now();
          }
        }

        // Converter Float32 -> Int16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        socketService.sendAudioChunk(new Uint8Array(pcm16.buffer), activeId);
      };

      source.connect(node);
      node.connect(context.destination);

      voiceRecorderRef.current = { stream, context, node };
      // NÃO definir isLiveActive como true aqui se estivermos em modo Multimodal Socket
      // isLiveActive deve ser apenas para o Gemini Live real (Scenario 2)
      // Usar isListening para indicar que o mic está aberto
      setIsListening(true);

      // v4.4: Scope unificado = conversationId
      const scopeKey = activeId;
      activeScopeRef.current = scopeKey;
      setActiveScope(scopeKey);

      console.log(`✅ Voz ativada no escopo unificado: ${activeId}`);
    } catch (err) {
      console.error('❌ Erro ao iniciar voz:', err);
      setIsLiveActive(false);
    }
  }, [createConversation, setActiveScope]);

  const stopVoice = useCallback(async () => {
    console.log('🛑 Parando Voz Multimodal...');
    stopTalking(); // Interrompe qualquer áudio atual
    const { stream, context, node } = voiceRecorderRef.current;

    if (node) node.disconnect();
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (context) await context.close();

    voiceRecorderRef.current = { stream: null, context: null, node: null };
    setIsLiveActive(false);
    setIsListening(false);
    setIsSpeaking(false);

    // Sinalizar fim de áudio para o backend processar
    socketService.sendAudioEnd();
  }, [stopTalking]);

  /**
   * Scenario 2: LIVE MODE (Gemini Live)
   * Inicia modo live REAL com Gemini Live API
   * Streaming bidirecional contínuo - hands-free
   */
  const startLiveMode = useCallback(async () => {
    try {
      // v4.5: SSOT - SEMPRE usar o ID do Chat. Chat é a mente.
      const unifiedConvId = activeIdsByModeRef.current.chat || '';

      if (!unifiedConvId || unifiedConvId === 'default') {
        console.log('📝 Nenhuma conversa de chat ativa - criando nova mente unificada...');
        const autoConv = createConversation('chat');
        // createConversation já atualiza activeIdsByModeRef.current e SSOT
      }

      const activeId = currentIdRef.current || '';
      console.log(`🚀 VOICE_START {engine: "gemini", conversationId: "${activeId}", userIdPresent: ${!!userIdRef.current}, tenantIdPresent: ${!!tenantIdRef.current}}`);

      // v3.1: GARANTIR que memórias estão carregadas antes de sincronizar
      // Buscar diretamente do backend para garantir dados frescos
      let freshMemories = memories;
      try {
        const loaded = await backendService.getMemories();
        if (loaded && loaded.length > 0) {
          freshMemories = loaded;
          console.log(`🔄 [LIAContext] Memórias frescas carregadas: ${loaded.length}`);
        }
      } catch (e) {
        console.warn('⚠️ [LIAContext] Falha ao recarregar memórias, usando cache:', e);
      }

      // v2.8: Sincronizar memórias EXPLICITAMENTE ao iniciar o Live Mode
      if (freshMemories.length > 0) {
        const formattedMemories = freshMemories.map((m: any) => ({
          key: m.key || m.type || 'info',
          value: m.value || m.content || ''
        }));
        geminiLiveService.setMemoriesCache(formattedMemories);
        console.log(`🧠 [LIAContext] Memórias sincronizadas para Gemini Live:`, formattedMemories);
      } else {
        console.warn('⚠️ [LIAContext] ATENÇÃO: Nenhuma memória encontrada! O Gemini vai operar sem contexto pessoal.');
        console.warn('⚠️ [LIAContext] Verifique se as memórias estão salvas no Supabase para o userId correto.');
      }

      // Sincronizar com o serviço de voz usando o ID unificado
      geminiLiveService.setConversationId(activeId);
      geminiLiveService.addEventListener(handleGeminiLiveEvent);
      await geminiLiveService.startSession();

      // v3.1: SSOT - O escopo é apenas o ID
      const scopeKey = activeId;
      activeScopeRef.current = scopeKey;
      setActiveScope(scopeKey);

      setIsLiveActive(true);
      setIsListening(true);

      console.log(`✅ Gemini Live ativado com contexto unificado`);
      console.log(`   📦 Scope ativo: ${scopeKey}`);
      console.log(`   🎯 ConversationId: ${unifiedConvId}`);
    } catch (error: any) {
      console.error('❌ Erro ao iniciar Gemini Live:', error);
      setIsLiveActive(false);
      geminiLiveService.removeEventListener(handleGeminiLiveEvent);
      alert(`Erro ao iniciar Live Mode: ${error.message}`);
    }
  }, [handleGeminiLiveEvent, createConversation, memories]);

  /**
   * Para modo live
   */
  const stopLiveMode = useCallback(async () => {
    try {
      console.log('🛑 Parando Gemini Live...');

      // Remover handler e parar sessão
      geminiLiveService.removeEventListener(handleGeminiLiveEvent);
      await geminiLiveService.stopSession();

      setIsLiveActive(false);
      setIsListening(false);
      setIsSpeaking(false);

      console.log('✅ Gemini Live encerrado');
    } catch (error) {
      console.error('❌ Erro ao parar Gemini Live:', error);
    }
  }, [handleGeminiLiveEvent]);

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
    getCurrentMessages,

    // Métodos de Voz
    startVoice,
    stopVoice,
    startLiveMode,
    stopLiveMode,

    // Sistema de Mensagens por Escopo
    activeScope,
    messagesByScope,
    getMessagesForScope,
    addMessageToScope,
    clearScopeMessages,
    setActiveScope,
    getScopeKey,

    messages,
    isTyping,

    // Estados por Escopo
    typingByScope,
    isGeneratingImageByScope,
    getTypingForScope,
    setTypingForScope,
    setGeneratingImageForScope,

    voicePersonality,
    isSpeaking,
    isListening,
    isSearching,
    isLiveActive,
    memories,
    dynamicContent,
    setDynamicContent,
    isProcessingUpload,
    setIsProcessingUpload,
    dynamicContainers,
    addDynamicContainer,
    removeDynamicContainer,
    clearDynamicContainers,
    sendTextMessage,
    addMessage,
    sendMessageWithFiles,
    sendAudioMessage,
    transcribeAndFillInput,
    analyzeFile,
    setVoicePersonality,
    startListening,
    stopListening,
    loadMemories,
    saveMemory,
    deleteMemory,
    userId,
    tenantId,
    plan,
    clearMessages,
  };

  return (
    <LIAContext.Provider value={value}>
      {children}
      {showUpdateBanner && (
        <UpdateBanner
          version={newVersion}
          onClose={() => setShowUpdateBanner(false)}
          onUpdate={() => UpdateService.forceUpdate()}
        />
      )}
    </LIAContext.Provider>
  );
}

/**
 * 📢 Componente de Banner de Atualização
 */
function UpdateBanner({ version, onClose, onUpdate }: { version: string; onClose: () => void; onUpdate: () => void }) {
  return (
    <div className="fixed top-6 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center gap-4 max-w-sm">
        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
        </div>
        <div className="flex-1">
          <h4 className="text-white font-semibold text-sm">Atualização disponível!</h4>
          <p className="text-slate-400 text-xs mt-1">Versão {version} pronta para uso.</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onUpdate}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
          >
            Atualizar
          </button>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white text-[10px] uppercase font-bold text-center"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  );
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
