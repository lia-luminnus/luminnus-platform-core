/**
 * =============================================================================
 * 📋 CONTRATO DE EVENTOS SOCKET.IO - LIA
 * =============================================================================
 * 
 * Este arquivo define TODOS os eventos de socket usados pela LIA.
 * 
 * ⚠️ REGRAS:
 * 1. NUNCA altere eventos existentes sem criar versão (v1, v2)
 * 2. SEMPRE mantenha compatibilidade retroativa
 * 3. Qualquer mudança aqui é CORE_STABLE - exige aprovação
 * 
 * =============================================================================
 */

// =============================================================================
// VERSÃO DO CONTRATO
// =============================================================================
export const CONTRACT_VERSION = '1.0.0';

// =============================================================================
// EVENTOS DO CLIENTE → SERVIDOR
// =============================================================================

/**
 * Registro de conversa
 */
export interface RegisterConversationPayload {
    conversationId: string;
    userId?: string;
    tenantId?: string;
}
export const EVENT_REGISTER_CONVERSATION = 'register-conversation';

/**
 * Mensagem de texto
 */
export interface TextMessagePayload {
    text: string;
    conversationId: string;
    userId?: string;
    tenantId?: string;
}
export const EVENT_TEXT_MESSAGE = 'text-message';

/**
 * Chunk de áudio (WebRTC/Whisper)
 */
export interface AudioChunkPayload {
    conversationId: string;
    chunk: Uint8Array | number[];
}
export const EVENT_AUDIO_CHUNK = 'audio-chunk';

/**
 * Fim do áudio (trigger de transcrição)
 */
export interface AudioEndPayload {
    conversationId: string;
}
export const EVENT_AUDIO_END = 'audio-end';

/**
 * Alteração de personalidade de voz
 */
export interface SetVoicePersonalityPayload {
    personality: 'clara' | 'viva' | 'firme';
}
export const EVENT_SET_VOICE_PERSONALITY = 'set-voice-personality';

// =============================================================================
// EVENTOS DO SERVIDOR → CLIENTE
// =============================================================================

/**
 * Mensagem da LIA (texto)
 */
export interface LiaMessagePayload {
    text?: string;
    chatPayload?: string;
    voiceScript?: string;
    toolResults?: any[];
}
export const EVENT_LIA_MESSAGE = 'lia-message';

/**
 * Resposta de áudio (TTS)
 */
export interface AudioResponsePayload {
    audio: number[];  // Uint8Array convertido para array
    text: string;     // Texto correspondente
}
export const EVENT_AUDIO_RESPONSE = 'audio-response';

/**
 * Transcrição do usuário (STT)
 */
export type UserTranscriptPayload = string;
export const EVENT_USER_TRANSCRIPT = 'user-transcript';

/**
 * LIA está digitando
 */
export const EVENT_LIA_TYPING = 'lia-typing';

/**
 * LIA parou de digitar
 */
export const EVENT_LIA_STOP_TYPING = 'lia-stop-typing';

/**
 * Conexão confirmada
 */
export interface ConnectionConfirmedPayload {
    conversationId: string;
}
export const EVENT_CONNECTION_CONFIRMED = 'connection-confirmed';

// =============================================================================
// EVENTOS MULTIMODAIS (Gemini Live)
// =============================================================================

/**
 * Início de sessão Gemini Live
 */
export interface GeminiLiveStartPayload {
    conversationId: string;
}
export const EVENT_GEMINI_LIVE_START = 'gemini-live-start';

/**
 * Fim de sessão Gemini Live
 */
export const EVENT_GEMINI_LIVE_END = 'gemini-live-end';

/**
 * Chunk de áudio Gemini
 */
export interface GeminiAudioChunkPayload {
    chunk: Uint8Array | number[];
    conversationId?: string;
}
export const EVENT_GEMINI_AUDIO_CHUNK = 'gemini-audio-chunk';

// =============================================================================
// MAPA COMPLETO DE EVENTOS (para validação)
// =============================================================================

export const ALL_EVENTS = {
    // Cliente → Servidor
    client: {
        REGISTER_CONVERSATION: EVENT_REGISTER_CONVERSATION,
        TEXT_MESSAGE: EVENT_TEXT_MESSAGE,
        AUDIO_CHUNK: EVENT_AUDIO_CHUNK,
        AUDIO_END: EVENT_AUDIO_END,
        SET_VOICE_PERSONALITY: EVENT_SET_VOICE_PERSONALITY,
        GEMINI_LIVE_START: EVENT_GEMINI_LIVE_START,
        GEMINI_AUDIO_CHUNK: EVENT_GEMINI_AUDIO_CHUNK,
    },
    // Servidor → Cliente
    server: {
        LIA_MESSAGE: EVENT_LIA_MESSAGE,
        AUDIO_RESPONSE: EVENT_AUDIO_RESPONSE,
        USER_TRANSCRIPT: EVENT_USER_TRANSCRIPT,
        LIA_TYPING: EVENT_LIA_TYPING,
        LIA_STOP_TYPING: EVENT_LIA_STOP_TYPING,
        CONNECTION_CONFIRMED: EVENT_CONNECTION_CONFIRMED,
        GEMINI_LIVE_END: EVENT_GEMINI_LIVE_END,
    },
} as const;

// =============================================================================
// CHANGELOG
// =============================================================================
/**
 * v1.0.0 (2026-01-02)
 * - Contrato inicial documentado
 * - Eventos de chat, voz e multimodal definidos
 * - Payloads tipados
 */
