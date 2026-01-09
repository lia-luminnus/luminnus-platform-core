// ======================================================================
// 📜 EVENTS CONTRACT - Tipos compartilhados para eventos da LIA
// ======================================================================

/**
 * Estados de conexão WebSocket
 */
export enum ConnectionState {
    IDLE = 'IDLE',
    CONNECTING = 'CONNECTING',
    OPEN = 'OPEN',
    CLOSING = 'CLOSING',
    CLOSED = 'CLOSED',
    ERROR = 'ERROR'
}

/**
 * Tipos de eventos emitidos pelo GeminiLiveService
 */
export type GeminiLiveEventType =
    | 'connected'
    | 'listening'
    | 'speaking'
    | 'message'
    | 'error'
    | 'end'
    | 'user-transcript'
    | 'lia-transcript'
    | 'generating-start'
    | 'generating-end'
    | 'chart-generated'
    | 'table-generated'
    | 'image-generated'
    | 'memory-saved'
    | 'tool-result'
    | 'tool-active'
    | 'update-available';

/**
 * Estrutura de evento do Gemini Live
 */
export interface GeminiLiveEvent {
    type: GeminiLiveEventType;
    data?: unknown;
    timestamp?: number;
}

/**
 * Sessão ativa do Gemini Live
 */
export interface GeminiLiveSession {
    id: string;
    isActive: boolean;
    isListening: boolean;
    isSpeaking: boolean;
}

/**
 * Configuração do LIA Runtime
 */
export interface LiaRuntimeConfig {
    /** URL base da API (ex: http://localhost:3000) */
    apiUrl: string;

    /** URL do Socket.IO */
    socketUrl?: string;

    /** Modo de operação */
    mode: 'admin' | 'client';

    /** Nome da voz Gemini (Aoede, Kore, Calliope, etc.) */
    voiceName?: string;

    /** Idioma (pt-BR, en-US, etc.) */
    languageCode?: string;

    /** Plano do usuário (Free, Pro, Enterprise) */
    userPlan?: string;

    /** ID do usuário atual */
    userId?: string;

    /** ID do tenant */
    tenantId?: string;

    /** Chave para recuperar o token do localStorage (opcional, padrão sb-dashboard-client-auth) */
    authStorageKey?: string;

    /** Token de autenticação Supabase (se fornecido, ignora localStorage) */
    authToken?: string;

    /** Callbacks opcionais */
    callbacks?: {
        onMessage?: (message: GeminiLiveEvent) => void;
        onError?: (error: Error) => void;
        onStateChange?: (state: ConnectionState) => void;
        persistMessage?: (role: string, content: string, conversationId: string) => Promise<void>;
    };
}

/**
 * Evento de atualização disponível
 */
export interface UpdateAvailableEvent {
    currentVersion: string;
    newVersion: string;
    isRequired?: boolean;
    message?: string;
}

/**
 * Resultado de execução de ferramenta
 */
export interface ToolResult {
    toolName: string;
    success: boolean;
    result?: unknown;
    error?: string;
    link?: string;
}
