import type { GeminiLiveEvent, GeminiLiveSession, LiaRuntimeConfig, ConnectionState } from '../contracts/events.contract.js';
export declare class GeminiLiveService {
    private config;
    private genAI;
    private liveSession;
    private audioContext;
    private mediaStream;
    private currentSession;
    private eventListeners;
    private audioQueue;
    private currentAudioSource;
    private isPlayingAudio;
    private connectionState;
    private isSessionActive;
    private scriptProcessorNode;
    private audioWorkletNode;
    private currentConversationId;
    private memoriesCache;
    private accumulatedUserText;
    private accumulatedLiaText;
    private hasReceivedAudioThisTurn;
    private outputTranscriptionText;
    private watchdogTimer;
    private responseSent;
    private isWaitingForTool;
    private toolCallCount;
    private static SEARCH_TRIGGERS;
    private static WEATHER_TRIGGERS;
    private static TIME_TRIGGERS;
    private static DIRECTION_TRIGGERS;
    private static PLACES_TRIGGERS;
    private forcedActionDone;
    constructor(config: LiaRuntimeConfig);
    /**
     * Atualiza configuração em runtime
     */
    updateConfig(newConfig: Partial<LiaRuntimeConfig>): void;
    /**
     * Adiciona listener de eventos
     */
    addEventListener(callback: (event: GeminiLiveEvent) => void): void;
    /**
     * Remove listener de eventos
     */
    removeEventListener(callback: (event: GeminiLiveEvent) => void): void;
    /**
     * Emite evento para todos os listeners
     */
    private emitEvent;
    /**
     * v4.32: Sanitiza transcrição da LIA para remover thinking text / meta-análise
     * Usado quando modo é AUDIO - prioriza outputAudioTranscription limpo
     */
    private sanitizeTranscriptPTBR;
    /**
     * v4.32: Normaliza transcrição do usuário para remover fragmentação
     * Corrige: "p r e c i s a n d o" → "precisando"
     */
    private normalizeUserTranscript;
    /**
     * Atualiza estado de conexão
     */
    private setState;
    /**
     * Define ID da conversa atual
     */
    setConversationId(id: string): void;
    /**
     * Define token de autenticação para as requisições
     */
    setAuthToken(token: string): void;
    private getEphemeralToken;
    /**
     * Inicia sessão Gemini Live
     */
    startSession(): Promise<GeminiLiveSession>;
    private buildSystemInstruction;
    /**
     * Configura captura de áudio do microfone
     * v5.0: Migração de ScriptProcessor → AudioWorkletNode
     *
     * AudioWorkletNode roda em thread separada (Audio Worklet Global Scope),
     * resolvendo problema de áudio "rádio mal sintonizado" causado quando
     * ScriptProcessor competia com UI/render na main thread.
     */
    private audioChunkCount;
    private lastAudioLogTime;
    private setupAudioCapture;
    /**
     * Processa mensagens do Gemini
     */
    private handleGeminiMessage;
    /**
     * Executa function call via Tool Proxy
     * v4.18: SEMPRE envia resposta ao Gemini, mesmo em erro, para evitar hang
     */
    private handleFunctionCall;
    /**
     * v4.29: Detecta se precisamos for\u00e7ar uma busca
     * Retorna true se o usu\u00e1rio pediu algo que precisa de busca e o Gemini n\u00e3o fez
     */
    private shouldForceSearch;
    /**
     * v5.3: Detecta qual ferramenta forçar se o Gemini hesitar
     * v5.5: Desabilitado busca forçada para cotações - Gemini tem Google Search Grounding nativo
     */
    private detectForcedTool;
    private executeForcedWeather;
    private executeForcedTime;
    private injectToGemini;
    /**
     * v4.29: Força uma busca e injeta o resultado na conversa
     * v5.0: Adiciona limpeza de query no frontend antes de enviar
     */
    private executeForcedSearch;
    private executeForcedDirections;
    private executeForcedPlaces;
    private executeForcedDashboard;
    /**
     * Reproduz fila de áudio
     */
    private playAudioQueue;
    /**
     * Limpa fila de áudio (usado em interrupções)
     */
    private clearAudioQueue;
    /**
     * Encerra sessão
     */
    stopSession(): Promise<void>;
    /**
     * Retorna a sessão atual
     */
    getSession(): GeminiLiveSession | null;
    /**
     * Retorna estado de conexão
     */
    getConnectionState(): ConnectionState;
    /**
     * Atualiza cache de memórias
     */
    setMemoriesCache(memories: Array<{
        key: string;
        value: string;
    }>): void;
    /**
     * Inicia Timer de Watchdog (v4.23)
     */
    private startWatchdog;
    /**
     * Para Timer de Watchdog
     */
    private stopWatchdog;
    /**
     * Envia Resposta de Fallback (v4.23)
     */
    private sendFallbackResponse;
}
/**
 * Cria instância do GeminiLiveService com configuração
 */
export declare function createGeminiLiveService(config: LiaRuntimeConfig): GeminiLiveService;
//# sourceMappingURL=geminiLiveService.d.ts.map