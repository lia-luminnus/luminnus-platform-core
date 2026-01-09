// ======================================================================
// 🎙️ GEMINI LIVE SERVICE - Serviço compartilhado de voz em tempo real
// ======================================================================
// Single Source of Truth para Admin e Dashboard-client
// ======================================================================

import { GoogleGenAI } from '@google/genai';
import { sanitizeForTTS } from '../utils/ttsSanitizer';
import type {
    GeminiLiveEvent,
    GeminiLiveSession,
    LiaRuntimeConfig,
    ConnectionState,
    ToolResult,
} from '../contracts/events.contract';
import { ConnectionState as ConnState } from '../contracts/events.contract';
import { LIA_GEMINI_LIVE_PERSONALITY, LIA_FULL_PERSONALITY } from '@luminnus/shared';

// ======================================================================
// AUDIO UTILITIES
// ======================================================================

function floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
}

function int16ArrayToBase64(int16Array: Int16Array): string {
    const uint8Array = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function downsampleAudio(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.floor((i + 1) * ratio);
        let sum = 0;
        for (let j = start; j < end && j < input.length; j++) {
            sum += input[j];
        }
        output[i] = sum / (end - start);
    }
    return output;
}

// ======================================================================
// PERSONALIDADE PADRÃO
// ======================================================================

const DEFAULT_PERSONALITY = LIA_GEMINI_LIVE_PERSONALITY;

// ======================================================================
// SERVICE CLASS
// ======================================================================

export class GeminiLiveService {
    private config: LiaRuntimeConfig;
    private genAI: GoogleGenAI | null = null;
    private liveSession: any = null;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private currentSession: GeminiLiveSession | null = null;
    private eventListeners: ((event: GeminiLiveEvent) => void)[] = [];
    private audioQueue: ArrayBuffer[] = [];
    private currentAudioSource: AudioBufferSourceNode | null = null;
    private isPlayingAudio = false;
    private connectionState: ConnectionState = ConnState.IDLE;
    private isSessionActive = false;
    private scriptProcessorNode: ScriptProcessorNode | null = null;
    private currentConversationId: string | null = null;
    private memoriesCache: Array<{ key: string; value: string }> = [];

    // v4.21: Acumuladores para transcrição em streaming
    // Gemini envia transcrições em fragmentos - acumulamos até turnComplete
    private accumulatedUserText: string = '';
    private accumulatedLiaText: string = '';

    // v4.23: Fail-safe & Watchdog
    private watchdogTimer: any = null;
    private responseSent: boolean = false;
    private isWaitingForTool: boolean = false;
    private toolCallCount: number = 0;

    // v4.29 & v5.3: Gatilhos para Forçar Tool Call quando Gemini não decide
    private static SEARCH_TRIGGERS = [
        'cotação', 'preço', 'valor', 'quanto', 'quanto custa', 'quanto está',
        'euro', 'dólar', 'bitcoin', 'real', 'libra', 'iene',
        'hoje', 'agora', 'atual', 'atualmente', 'neste momento',
        'notícias', 'notícia', 'acontecendo', 'últimas'
    ];
    private static WEATHER_TRIGGERS = ['clima', 'tempo', 'previsão', 'temperatura', 'vai chover', 'tá frio', 'tá quente'];
    private static TIME_TRIGGERS = ['horas', 'que horas', 'que dia', 'data de hoje', 'horário'];
    private static DIRECTION_TRIGGERS = ['distância', 'distancia', 'rota', 'carro', 'tempo leva', 'quanto tempo', 'chegar', 'trajeto', 'caminho', 'como vou', 'como chegar'];
    private static PLACES_TRIGGERS = ['farmácia', 'farmacia', 'restaurante', 'mercado', 'loja', 'posto', 'banco', 'caixa', 'onde tem', 'perto de mim', 'próximo'];

    private forcedActionDone: boolean = false;

    constructor(config: LiaRuntimeConfig) {
        this.config = config;
        console.log(`✅ [GeminiLiveService] Inicializado em modo: ${config.mode}`);
    }

    /**
     * Atualiza configuração em runtime
     */
    updateConfig(newConfig: Partial<LiaRuntimeConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 [GeminiLiveService] Config atualizada');
    }

    /**
     * Adiciona listener de eventos
     */
    addEventListener(callback: (event: GeminiLiveEvent) => void): void {
        this.eventListeners.push(callback);
    }

    /**
     * Remove listener de eventos
     */
    removeEventListener(callback: (event: GeminiLiveEvent) => void): void {
        const index = this.eventListeners.indexOf(callback);
        if (index > -1) this.eventListeners.splice(index, 1);
    }

    /**
     * Emite evento para todos os listeners
     */
    private emitEvent(event: GeminiLiveEvent): void {
        // Log para debug de eventos fundamentais
        if (['connected', 'user-transcript', 'lia-transcript', 'error'].includes(event.type)) {
            console.log(`📡 [Event] ${event.type}`, event.data || '');
        }

        const eventWithTimestamp = { ...event, timestamp: Date.now() };
        this.eventListeners.forEach(cb => cb(eventWithTimestamp));
        this.config.callbacks?.onMessage?.(eventWithTimestamp);
    }

    /**
     * Atualiza estado de conexão
     */
    private setState(newState: ConnectionState): void {
        const oldState = this.connectionState;
        this.connectionState = newState;
        console.log(`🔌 [State] ${oldState} → ${newState}`);
        this.config.callbacks?.onStateChange?.(newState);
    }

    /**
     * Define ID da conversa atual
     */
    setConversationId(id: string): void {
        this.currentConversationId = id;
        console.log('🆔 [GeminiLiveService] Conversa:', id);
    }

    /**
     * Define token de autenticação para as requisições
     */
    setAuthToken(token: string): void {
        this.config.authToken = token;
        console.log('🔐 [GeminiLiveService] Auth token configurado');
    }

    private async getEphemeralToken(): Promise<string> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // PRIORIDADE 1: Token passado via config (preferível)
        if (this.config.authToken) {
            headers['Authorization'] = `Bearer ${this.config.authToken}`;
            console.log(`🔐 [GeminiLive] Token de auth via config`);
        } else {
            // PRIORIDADE 2: Token no localStorage (fallback)
            const storageKey = this.config.authStorageKey || 'supabase.auth.token';
            const storedAuth = localStorage.getItem(storageKey);

            if (storedAuth) {
                try {
                    const authData = JSON.parse(storedAuth);
                    const token = authData.access_token || authData.token;

                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                        console.log(`🔐 [GeminiLive] Token de auth via localStorage (key: ${storageKey})`);
                    }
                } catch (e) {
                    console.warn(`[GeminiLiveService] Falha ao recuperar auth da key ${storageKey}:`, e);
                }
            } else {
                console.warn(`⚠️ [GeminiLive] Nenhum auth encontrado - usando userId de fallback no backend`);
            }
        }

        // Incluir conversationId na URL para contexto unificado
        const params = new URLSearchParams();
        if (this.currentConversationId) {
            params.append('conversationId', this.currentConversationId);
        }
        const url = `${this.config.apiUrl}/api/live-token${params.toString() ? '?' + params.toString() : ''}`;
        console.log(`🌐 [GeminiLive] Buscando token para conv=${this.currentConversationId || 'nova'}`);

        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`Falha ao obter token: ${response.status}`);
        }
        const data = await response.json();
        return data.token;
    }

    /**
     * Inicia sessão Gemini Live
     */
    async startSession(): Promise<GeminiLiveSession> {
        if (this.connectionState === ConnState.OPEN && this.currentSession) {
            console.log('⚠️ [GeminiLiveService] Já conectado');
            return this.currentSession;
        }

        if (this.connectionState === ConnState.CONNECTING) {
            console.log('⚠️ [GeminiLiveService] Conexão já em andamento, aguardando...');
            // Aguardar até 5 segundos por uma transição de estado
            for (let i = 0; i < 50; i++) {
                await new Promise(resolve => setTimeout(resolve, 100));
                const currentState = this.connectionState as ConnectionState;
                if (currentState === ConnState.OPEN && this.currentSession) return this.currentSession;
                if (currentState !== ConnState.CONNECTING) break;
            }
            if (this.connectionState === ConnState.CONNECTING) {
                throw new Error('Conexão travada em estado CONNECTING');
            }
        }

        this.setState(ConnState.CONNECTING);

        try {
            // 1. Obter token
            const token = await this.getEphemeralToken();
            console.log('✅ Token obtido');

            // 2. Criar cliente Gemini
            try {
                this.genAI = new GoogleGenAI({
                    apiKey: token,
                    httpOptions: { apiVersion: 'v1alpha' }
                });
                console.log('✅ GoogleGenAI inicializado (v1alpha)');
            } catch (err) {
                console.error('[GeminiLiveService] Erro ao instanciar GoogleGenAI:', err);
                throw err;
            }

            // 3. AudioContext
            this.audioContext = new AudioContext({ sampleRate: 24000 });

            // 4. Microfone
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                    channelCount: 1,
                },
            });
            console.log('🎤 Microfone capturado');

            // 5. Sessão
            const sessionId = this.currentConversationId || `session_${Date.now()}`;
            this.currentSession = {
                id: sessionId,
                isActive: true,
                isListening: true,
                isSpeaking: false,
            };

            // v4.16: CORREÇÃO CRÍTICA - NÃO PASSAR CONFIG NA CONEXÃO
            // O token efêmero gerado pelo backend JÁ contém todas as configurações
            // (responseModalities, speechConfig, transcrição, systemInstruction).
            // Passar config duplicada aqui pode conflitar e causar desconexão imediata.
            // O frontend só precisa passar os callbacks.

            console.log(`🚀 VOICE_START {engine: \"gemini\", conversationId: \"${this.currentConversationId}\", userIdPresent: ${!!this.config.userId}, tenantIdPresent: ${!!this.config.tenantId}}`);
            console.log('📦 [GeminiLive] Conectando COM TOKEN EFÊMERO (config vem do backend)');

            // Garantir que AudioContext está rodando (Autoplay Policy)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
                console.log('▶️ AudioContext retomado (resume)');
            }

            // 7. Conectar - SEM passar config explícita
            console.log('[GeminiLiveService] Tentando conectar ao gemini-2.0-flash-exp...');
            const ai = this.genAI as any;
            const liveClient = ai.live || (ai.models && ai.models.live);

            if (!liveClient) {
                console.error('[GeminiLiveService] Objeto .live não encontrado no cliente!', Object.keys(ai));
                throw new Error('Gemini Live client not found in SDK');
            }

            this.liveSession = await liveClient.connect({
                model: 'gemini-2.0-flash-exp',
                // v4.16: config REMOVIDIO - usar apenas o do token efêmero
                callbacks: {
                    onopen: () => {
                        console.log('✅ Conectado ao Gemini Live');
                        this.setState(ConnState.OPEN);
                        this.emitEvent({ type: 'connected' });
                        this.emitEvent({ type: 'listening' });
                    },
                    onmessage: (msg: any) => this.handleGeminiMessage(msg),
                    interrupted: () => {
                        console.log('🛑 LIA interrompida');
                        this.clearAudioQueue();
                        if (this.currentSession) {
                            this.currentSession.isSpeaking = false;
                            this.currentSession.isListening = true;
                        }
                        this.emitEvent({ type: 'listening' });
                    },
                    onerror: (error: any) => {
                        console.error('❌ Erro Gemini:', error);
                        this.isSessionActive = false; // Parar captura imediatamente
                        this.setState(ConnState.ERROR);
                        this.emitEvent({ type: 'error', data: error.message });
                        this.config.callbacks?.onError?.(error);
                    },
                    onclose: (event: any) => {
                        console.log(`🔌 Conexão fechada: Code=${event.code}, Reason=${event.reason || 'Nenhum'}`);
                        this.stopSession();
                        this.emitEvent({ type: 'end', data: `WebSocket closed: ${event.code}` });
                    },
                },
            });


            // 8. Captura de áudio
            await this.setupAudioCapture();
            this.isSessionActive = true;

            console.log('✅ Sessão iniciada:', sessionId);
            return this.currentSession;

        } catch (error: any) {
            console.error('❌ Erro ao iniciar sessão:', error);
            this.setState(ConnState.ERROR);
            this.emitEvent({ type: 'error', data: error.message });

            // Cleanup imediato em caso de erro para liberar microfone
            await this.stopSession();

            throw error;
        }
    }

    private buildSystemInstruction(): string {
        // SSOT: Usar a personalidade oficial v4.0.0
        let instruction = LIA_GEMINI_LIVE_PERSONALITY;

        // Adicionar memórias se disponíveis
        if (this.memoriesCache.length > 0) {
            instruction += '\n\n## MEMÓRIAS DO USUÁRIO:\n';
            instruction += this.memoriesCache.map(m => `- ${m.key}: ${m.value}`).join('\n');
        }

        // Adicionar info de modo
        instruction += `\n\n## CONTEXTO:\n- Modo: ${this.config.mode}\n- Plano: ${this.config.userPlan || 'Free'}`;

        return instruction;
    }

    /**
     * Configura captura de áudio do microfone
     * v4.19: Logs diagnósticos para rastrear fluxo de áudio
     */
    private audioChunkCount = 0;
    private lastAudioLogTime = 0;

    private async setupAudioCapture(): Promise<void> {
        if (!this.audioContext || !this.mediaStream) return;

        this.audioChunkCount = 0;
        this.lastAudioLogTime = Date.now();

        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.scriptProcessorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

        this.scriptProcessorNode.onaudioprocess = (event) => {
            // v4.3.1: Verificação antecipada e rigorosa
            if (!this.isSessionActive || !this.liveSession || this.connectionState !== ConnState.OPEN) {
                return;
            }

            try {
                // Verificar se o WebSocket subjacente ainda está aberto
                const ws = (this.liveSession as any)._ws || (this.liveSession as any).ws;
                if (ws && ws.readyState !== 1) { // 1 = OPEN
                    console.log('⚠️ [GeminiLive] WebSocket fechando/fechado, ignorando chunk');
                    return;
                }

                const inputData = event.inputBuffer.getChannelData(0);

                // v4.19: Verificar se há dados de áudio significativos
                const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));

                const downsampled = downsampleAudio(inputData, this.audioContext!.sampleRate, 16000);
                const pcm16 = floatTo16BitPCM(downsampled);
                const base64 = int16ArrayToBase64(pcm16);

                this.liveSession.sendRealtimeInput({
                    audio: {
                        data: base64,
                        mimeType: 'audio/pcm;rate=16000'
                    }
                });

                this.audioChunkCount++;

                // v4.28: Log menos frequente (10s) e apenas com DEBUG ativo
                const now = Date.now();
                if ((window as any).DEBUG_LIA_LOGS && now - this.lastAudioLogTime > 10000) {
                    console.log(`🎤 [Audio] ${this.audioChunkCount} chunks | amp: ${maxAmplitude.toFixed(2)}`);
                    this.lastAudioLogTime = now;
                }

            } catch (e: any) {
                if (e.message?.includes('CLOSED') || e.message?.includes('CLOSING')) {
                    console.warn('⚠️ [GeminiLive] Sessão encerrada durante envio de áudio');
                } else {
                    console.error('❌ [GeminiLive] Erro ao enviar áudio:', e);
                }
                this.isSessionActive = false;
            }
        };

        source.connect(this.scriptProcessorNode);
        this.scriptProcessorNode.connect(this.audioContext.destination);

        console.log('🎤 Captura de áudio configurada');
    }

    /**
     * Processa mensagens do Gemini
     */
    private async handleGeminiMessage(message: any): Promise<void> {
        const sc = message.server_content || message.serverContent;

        // v4.28: Logs reduzidos - apenas eventos críticos sempre visíveis
        if (sc) {
            const parts = sc.model_turn?.parts || sc.modelTurn?.parts;
            const hasFunctionCall = !!(parts?.find((p: any) => p.function_call || p.functionCall));

            // Log SEMPRE para function calls (importante para debug de busca)
            if (hasFunctionCall) {
                console.log(`🛠️ [GeminiLive] FUNCTION_CALL detectada`);
            }

            // Log de Grounding (Busca Nativa) - sempre visível
            if (sc.groundingMetadata || sc.grounding_metadata) {
                console.log('🌐 [GeminiLive] GROUNDING_METADATA:', sc.groundingMetadata || sc.grounding_metadata);
            }

            // Demais logs apenas com DEBUG ativo
            if ((window as any).DEBUG_LIA_LOGS) {
                const hasInputTransc = !!(sc.inputTranscription || sc.inputAudioTranscription || sc.input_audio_transcription);
                const hasOutputTransc = !!(sc.outputTranscription || sc.outputAudioTranscription || sc.output_audio_transcription);
                if (hasInputTransc) console.log('✅ [GeminiLive] TRANSCRIÇÃO_INPUT');
                if (hasOutputTransc) console.log('✅ [GeminiLive] TRANSCRIÇÃO_OUTPUT');
                if (sc.interrupted || sc.turn_complete || sc.turnComplete) {
                    console.log(`📩 [GeminiLive] interrupted=${!!sc.interrupted}, turnComplete=${!!(sc.turn_complete || sc.turnComplete)}`);
                }
            }
        }

        if (!sc) return;

        if (sc.interrupted) {
            if ((window as any).DEBUG_LIA_LOGS) console.log('🛑 LIA interrompida');
            this.clearAudioQueue();
            if (this.currentSession) {
                this.currentSession.isSpeaking = false;
                this.currentSession.isListening = true;
            }
            this.emitEvent({ type: 'listening' });
            // v4.25: Removido 'return' precoce para permitir que turnComplete limpe acumuladores se enviado no mesmo sc
        }

        // v4.21: Transcrição do usuário - ACUMULAR em vez de emitir imediatamente
        // (inputTranscription, inputAudioTranscription, input_audio_transcription)
        // v4.28: Início do Turno - Resetar flags (log condicional)
        if (sc.turn_complete === false || sc.turnComplete === false) {
            if (!this.watchdogTimer && !this.responseSent) {
                if ((window as any).DEBUG_LIA_LOGS) console.log('🏁 [Turn] Novo turno detectado');
                this.responseSent = false;
                this.accumulatedUserText = '';
                this.accumulatedLiaText = '';
                this.startWatchdog();
            }
        }

        const inputTransc = sc.inputTranscription || sc.inputAudioTranscription || sc.input_audio_transcription;
        let inputText = typeof inputTransc === 'string' ? inputTransc : inputTransc?.text;

        // v4.30: Filtrar ruído do Gemini (<noise>, espaços extras, etc.)
        // v5.6: Filtrar transcrições com caracteres não-latinos (Hindi, Árabe, etc.)
        if (inputText) {
            inputText = inputText
                .replace(/<noise>/gi, '')
                .replace(/\s+/g, ' ')
                .trim();

            // Detectar se contém scripts não-latinos (mais de 30% = ruído)
            const nonLatinRegex = /[^\u0000-\u007F\u00C0-\u024F\u1E00-\u1EFF]/g;
            const nonLatinChars = (inputText.match(nonLatinRegex) || []).length;
            const latinRatio = 1 - (nonLatinChars / inputText.length);

            if (latinRatio < 0.7 && inputText.length > 3) {
                console.warn(`⚠️ [Ruído] Transcrição ignorada (${Math.round((1 - latinRatio) * 100)}% não-latino): "${inputText}"`);
                inputText = ''; // Ignorar completamente
            }
        }

        if (inputText) {
            // Se o usuário falar durante uma Tool Call, logamos mas o watchdog continua
            if (this.isWaitingForTool && (window as any).DEBUG_LIA_LOGS) {
                console.log('⏳ [Interrupção] Usuário falou durante Tool Call.');
            }
            // v4.32: Revertido espaço manual - Gemini já envia espaços nos fragmentos
            this.accumulatedUserText += inputText;
        }

        // v4.21: Transcrição da LIA - ACUMULAR em vez de emitir imediatamente
        const outputTransc = sc.outputTranscription || sc.outputAudioTranscription || sc.output_audio_transcription;
        const outputText = typeof outputTransc === 'string' ? outputTransc : outputTransc?.text;

        if (outputText) {
            this.responseSent = true;
            this.stopWatchdog();
            // v4.32: Revertido espaço manual para evitar "P ara te aju dar"
            this.accumulatedLiaText += outputText;

            if ((window as any).DEBUG_LIA_LOGS) {
                console.log('📝 [Chunk] LIA:', outputText);
            }
        } else if (sc.model_turn?.parts || sc.modelTurn?.parts) {
            const parts = sc.model_turn?.parts || sc.modelTurn?.parts;
            const textPart = parts.find((p: any) => p.text);
            if (textPart?.text) {
                this.responseSent = true;
                this.stopWatchdog();
                this.accumulatedLiaText += textPart.text;
                if ((window as any).DEBUG_LIA_LOGS) {
                    console.log('📝 [Chunk] LIA (model_turn):', textPart.text);
                }
            }
        }

        // Processar parts (áudio)
        const modelTurn = sc.model_turn || sc.modelTurn;
        if (modelTurn?.parts) {
            for (const part of modelTurn.parts) {
                // Áudio
                const inlineData = part.inline_data || part.inlineData;
                if (inlineData?.data) {
                    const buffer = base64ToArrayBuffer(inlineData.data);
                    this.audioQueue.push(buffer);
                    if (!this.isPlayingAudio) this.playAudioQueue();
                }

                // Function call - v4.18: Log detalhado
                const funcCall = part.function_call || part.functionCall;
                if (funcCall) {
                    this.isWaitingForTool = true;
                    this.toolCallCount++;
                    this.stopWatchdog(); // Pausa watchdog durante a execução da ferramenta

                    // v4.32: Emitir evento de atividade para feedback visual (Aura pulsando, etc)
                    this.emitEvent({ type: 'tool-active', data: true });

                    // v4.23: Agradecimento intermediário para evitar silêncio em buscas lentas
                    const ackMsg = "Deixa eu ver isso para você...";
                    console.log('🗣️ [Tool] Enviando aviso intermediário.');
                    this.emitEvent({ type: 'lia-transcript', data: ackMsg });

                    console.log(`🔧 [Handshake] FUNCTION_CALL_RECEBIDA: ${funcCall.name || 'unnamed'}`, funcCall.args);
                    await this.handleFunctionCall(funcCall);

                    // v5.3: Injeção de Memória Imediata (Cementing)
                    if (funcCall.name === 'saveMemory' && this.liveSession) {
                        const memoryContent = funcCall.args.content || funcCall.args.value;
                        const memoryKey = funcCall.args.key || funcCall.args.category;
                        this.injectToGemini(`[MEMÓRIA SALVA]: Acabei de registrar que "${memoryContent}" (${memoryKey}). Agora eu sei essa informação sobre você.`);
                    }

                    // v4.32: Finalizar indicador de atividade
                    this.emitEvent({ type: 'tool-active', data: false });

                    this.isWaitingForTool = false;
                    this.startWatchdog(4000); // Reinicia watchdog curto após a ferramenta
                }
            }
        }

        // v4.21: Turn complete - AGORA SIM emitir as transcrições acumuladas
        if (sc.turn_complete || sc.turnComplete) {
            if ((window as any).DEBUG_LIA_LOGS) console.log('🏁 TURNO_COMPLETO');

            // v4.29: Capturar texto do usuário ANTES de limpar para detectar gatilhos
            // v4.32: Adicionada normalização básica aqui também
            const userTextForTrigger = this.accumulatedUserText.trim();

            if (this.accumulatedUserText.trim()) {
                const userText = this.accumulatedUserText.trim();
                console.log('🗣️ Usuário:', userText.substring(0, 50) + (userText.length > 50 ? '...' : ''));
                this.emitEvent({ type: 'user-transcript', data: userText });

                if (this.config.callbacks?.persistMessage && this.currentConversationId) {
                    this.config.callbacks.persistMessage('user', userText, this.currentConversationId);
                }
                this.accumulatedUserText = ''; // Reset acumulador
            }

            // v5.3: Verificar se Gemini respondeu com algo útil ou se precisamos forçar ferramentas (Fail-Safe)
            const liaText = this.accumulatedLiaText.trim();
            const geminiCalledTool = this.toolCallCount > 0;

            // Detectar qual ferramenta forçar
            const forcedTool = this.detectForcedTool(userTextForTrigger, liaText, geminiCalledTool);

            if (forcedTool === 'search') {
                console.log('🔎 [Forçando] Detectado gatilho de busca, forçando searchWeb...');
                await this.executeForcedSearch(userTextForTrigger);
            } else if (forcedTool === 'weather') {
                console.log('🌦️ [Forçando] Detectado gatilho de clima, forçando getWeather...');
                await this.executeForcedWeather(userTextForTrigger);
            } else if (forcedTool === 'time') {
                console.log('🕒 [Forçando] Detectado gatilho de hora, forçando getCurrentTime...');
                await this.executeForcedTime();
            } else if (forcedTool === 'directions') {
                console.log('🚗 [Forçando] Detectado gatilho de direção, forçando getDirections...');
                await this.executeForcedDirections(userTextForTrigger);
            } else if (forcedTool === 'places') {
                console.log('📍 [Forçando] Detectado gatilho de lugares, forçando getLocation...');
                await this.executeForcedPlaces(userTextForTrigger);
            } else if (liaText) {
                const sanitizedLia = sanitizeForTTS(liaText);
                if (sanitizedLia) {
                    console.log('🤖 LIA:', sanitizedLia.substring(0, 50) + (sanitizedLia.length > 50 ? '...' : ''));
                    this.emitEvent({ type: 'lia-transcript', data: sanitizedLia });

                    if (this.config.callbacks?.persistMessage && this.currentConversationId) {
                        this.config.callbacks.persistMessage('assistant', sanitizedLia, this.currentConversationId);
                    }
                }
                this.accumulatedLiaText = ''; // Reset acumulador
            }

            this.responseSent = false;
            this.stopWatchdog();
            this.isWaitingForTool = false;
            this.forcedActionDone = false;
            this.toolCallCount = 0;
            this.accumulatedUserText = '';
            this.accumulatedLiaText = '';

            if (this.currentSession) {
                this.currentSession.isSpeaking = false;
                this.currentSession.isListening = true;
            }
            this.emitEvent({ type: 'listening' });
        }
    }

    /**
     * Executa function call via Tool Proxy
     * v4.18: SEMPRE envia resposta ao Gemini, mesmo em erro, para evitar hang
     */
    private async handleFunctionCall(functionCall: any): Promise<void> {
        const { name, args } = functionCall;
        const callId = (functionCall as any).id || (functionCall as any).call_id || `call_${Date.now()}`;

        console.log(`🔧 [Tool] EXECUTANDO: ${name} (id: ${callId})`);
        console.log(`   📥 Args:`, typeof args === 'string' ? args : JSON.stringify(args));

        this.emitEvent({ type: 'generating-start', data: name });

        let toolResult: ToolResult;
        let responsePayload: any;

        try {
            console.log(`   🌐 Chamando /api/tools/execute...`);
            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: name,
                    args: typeof args === 'string' ? JSON.parse(args) : args,
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();
            console.log(`   ✅ Resultado da API:`, JSON.stringify(result).substring(0, 200));

            toolResult = {
                toolName: name,
                success: result.success !== false,
                result: result.data || result.result || result,
                error: result.error,
                link: result.link || result.url,
            };

        } catch (error: any) {
            console.error(`   ❌ Erro na ferramenta ${name}:`, error);
            toolResult = {
                toolName: name,
                success: false,
                result: null,
                error: error.message || 'Erro desconhecido na execução da ferramenta',
            };
        }

        this.emitEvent({ type: 'tool-result', data: toolResult });

        // v4.18: SEMPRE responder ao Gemini, mesmo com erro
        // Se não respondermos, o Gemini fica esperando indefinidamente
        if (this.liveSession) {
            const session = this.liveSession as any;
            responsePayload = {
                functionResponses: [{
                    id: callId,
                    name,
                    response: { result: JSON.stringify(toolResult.success ? toolResult.result : { error: toolResult.error }) },
                }],
            };

            console.log(`   📤 Enviando resposta ao Gemini...`);

            try {
                if (session.sendToolResponse) {
                    await session.sendToolResponse(responsePayload);
                    console.log(`   ✅ Resposta enviada via sendToolResponse`);
                } else if (session.send_tool_response) {
                    await session.send_tool_response({
                        function_responses: [{
                            id: callId,
                            name,
                            response: { result: JSON.stringify(toolResult.success ? toolResult.result : { error: toolResult.error }) },
                        }]
                    });
                    console.log(`   ✅ Resposta enviada via send_tool_response`);
                } else {
                    console.warn(`   ⚠️ Nenhum método de resposta disponível no session!`);
                }
            } catch (sendErr) {
                console.error(`   ❌ Erro ao enviar resposta da ferramenta:`, sendErr);
            }
        } else {
            console.warn(`   ⚠️ liveSession não disponível para enviar resposta!`);
        }

        this.emitEvent({ type: 'generating-end', data: name });
    }

    /**
     * v4.29: Detecta se precisamos for\u00e7ar uma busca
     * Retorna true se o usu\u00e1rio pediu algo que precisa de busca e o Gemini n\u00e3o fez
     */
    private shouldForceSearch(userText: string, liaResponse: string, geminiCalledTool: boolean): boolean {
        if (!userText || geminiCalledTool || this.forcedActionDone) {
            return false;
        }

        const lowerText = userText.toLowerCase();
        const hasTrigger = GeminiLiveService.SEARCH_TRIGGERS.some(trigger => lowerText.includes(trigger));

        if (!hasTrigger) {
            return false;
        }

        // Se Gemini respondeu com algo gen\u00e9rico/incerto, for\u00e7ar busca
        const genericResponses = [
            'n\u00e3o tenho acesso',
            'n\u00e3o consigo',
            'deixa eu ver',
            'um segundo',
            'vou verificar',
            'n\u00e3o sei',
            'desculpe',
            'infelizmente'
        ];
        const liaLower = liaResponse.toLowerCase();
        const isGeneric = genericResponses.some(r => liaLower.includes(r)) || liaResponse.length < 20;

        console.log(`🔎 [Trigger] hasTrigger=${hasTrigger}, isGeneric=${isGeneric}, liaLen=${liaResponse.length}`);
        return hasTrigger && isGeneric;
    }

    /**
     * v5.3: Detecta qual ferramenta forçar se o Gemini hesitar
     */
    private detectForcedTool(userText: string, liaResponse: string, geminiCalledTool: boolean): 'search' | 'weather' | 'time' | 'directions' | 'places' | null {
        if (!userText || geminiCalledTool || this.forcedActionDone) return null;

        const lowerText = userText.toLowerCase();

        // Critério de "falha" do Gemini (respostas genéricas ou incertas)
        const genericResponses = ['não tenho acesso', 'não consigo', 'deixa eu ver', 'um segundo', 'vou verificar', 'não sei', 'desculpe', 'infelizmente', 'preciso saber sua localização', 'não me trouxe', 'mandar o link'];
        const isGeneric = genericResponses.some(r => liaResponse.toLowerCase().includes(r)) || liaResponse.length < 15;

        // Gatilhos (ordem importa: mais específicos primeiro)
        if (GeminiLiveService.DIRECTION_TRIGGERS.some(t => lowerText.includes(t)) && isGeneric) return 'directions';
        if (GeminiLiveService.PLACES_TRIGGERS.some(t => lowerText.includes(t)) && isGeneric) return 'places';
        if (GeminiLiveService.TIME_TRIGGERS.some(t => lowerText.includes(t)) && isGeneric) return 'time';
        // v5.2: Não forçar clima se for query de rota (redundante agora com directions acima mas mantemos segurança)
        if (GeminiLiveService.WEATHER_TRIGGERS.some(t => lowerText.includes(t)) && isGeneric) return 'weather';
        if (GeminiLiveService.SEARCH_TRIGGERS.some(t => lowerText.includes(t)) && isGeneric) return 'search';

        return null;
    }

    private async executeForcedWeather(userQuery: string) {
        this.forcedActionDone = true;
        this.isWaitingForTool = true;
        this.emitEvent({ type: 'tool-active', data: true });
        this.emitEvent({ type: 'lia-transcript', data: "Consultando o clima..." });

        try {
            // Extrair cidade se possível, ou usar Rio Branco como fallback (contexto do user)
            let location = "Rio Branco, AC";
            const cities = ["são paulo", "rio de janeiro", "lisboa", "aveiro", "brasília", "curitiba", "porto"];
            for (const c of cities) {
                if (userQuery.toLowerCase().includes(c)) { location = c; break; }
            }

            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: 'getWeather',
                    args: { location },
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();
            const spokenResult = result.summary || result.data?.summary || `Em ${location}, a temperatura é agradável agora.`;

            this.emitEvent({ type: 'lia-transcript', data: spokenResult });
            this.injectToGemini(`[Resultado do clima em ${location}]: ${spokenResult}`);
        } catch (e) {
            console.error("❌ Erro no clima forçado:", e);
        } finally {
            this.isWaitingForTool = false;
            this.emitEvent({ type: 'tool-active', data: false });
        }
    }

    private async executeForcedTime() {
        this.forcedActionDone = true;
        this.isWaitingForTool = true;
        this.emitEvent({ type: 'tool-active', data: true });

        try {
            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: 'getCurrentTime',
                    args: {},
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();
            const timeStr = result.currentTime || result.data?.currentTime || new Date().toLocaleTimeString('pt-BR');
            const spokenResult = `Agora são exatamente ${timeStr}.`;

            this.emitEvent({ type: 'lia-transcript', data: spokenResult });
            this.injectToGemini(`[Horário atual]: ${spokenResult}`);
        } catch (e) {
            console.error("❌ Erro na hora forçada:", e);
        } finally {
            this.isWaitingForTool = false;
            this.emitEvent({ type: 'tool-active', data: false });
        }
    }

    private async injectToGemini(text: string) {
        if (this.liveSession) {
            const session = this.liveSession as any;
            if (session.sendClientContent) {
                await session.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text }] }],
                    turnComplete: true
                });
            }
        }
    }

    /**
     * v4.29: Força uma busca e injeta o resultado na conversa
     * v5.0: Adiciona limpeza de query no frontend antes de enviar
     */
    private async executeForcedSearch(userQuery: string): Promise<void> {
        this.forcedActionDone = true;
        this.isWaitingForTool = true;
        this.emitEvent({ type: 'tool-active', data: true });
        this.emitEvent({ type: 'lia-transcript', data: "Deixa eu pesquisar isso para você..." });

        try {
            // v5.4: Extrai a última sentença que parece uma pergunta real
            // Evita que "Não, está errado. Qual o euro?" vire uma busca sobre "errado"
            const sentences = userQuery.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
            let cleanedQuery = userQuery;

            if (sentences.length > 1) {
                // Pegar a última sentença que contém gatilhos de busca
                const triggers = ['euro', 'dólar', 'cotação', 'preço', 'valor', 'bitcoin', 'clima', 'tempo', 'notícia'];
                for (let i = sentences.length - 1; i >= 0; i--) {
                    const lower = sentences[i].toLowerCase();
                    if (triggers.some(t => lower.includes(t))) {
                        cleanedQuery = sentences[i];
                        break;
                    }
                }
            }

            cleanedQuery = cleanedQuery.toLowerCase()
                .replace(/eu quero que você|quero que você|você pode|pode me|me traga|me traz|me diga|me fala|pesquise|pesquisa|busque|busca|verifique|verifica|gostaria de saber|preciso saber|por favor|contração/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (!cleanedQuery || cleanedQuery.length < 5) cleanedQuery = userQuery;

            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: 'searchWeb',
                    args: { query: cleanedQuery },
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();
            let spokenResult = '';

            if (typeof result === 'string') spokenResult = result;
            else if (result.data && typeof result.data === 'string') spokenResult = result.data;
            else if (result.result && typeof result.result === 'string') spokenResult = result.result;
            else if (result.success !== false && result.data) {
                spokenResult = result.data.summary || result.data.answer || JSON.stringify(result.data).substring(0, 300);
            }

            if (!spokenResult || spokenResult.length < 10) {
                spokenResult = "Não consegui consultar em tempo real agora. O que você quer saber especificamente?";
            }

            this.emitEvent({ type: 'lia-transcript', data: spokenResult });
            if (this.config.callbacks?.persistMessage && this.currentConversationId) {
                this.config.callbacks.persistMessage('assistant', spokenResult, this.currentConversationId);
            }
            this.injectToGemini(`[SISTEMA: Resultado da busca para "${cleanedQuery}": ${spokenResult}]`);
        } catch (error: any) {
            this.emitEvent({ type: 'lia-transcript', data: "Tive um problema técnico na busca. Tente novamente em instantes." });
        } finally {
            this.isWaitingForTool = false;
            this.emitEvent({ type: 'tool-active', data: false });
        }
    }

    private async executeForcedDirections(userQuery: string): Promise<void> {
        this.forcedActionDone = true;
        this.isWaitingForTool = true;
        this.emitEvent({ type: 'tool-active', data: true });
        this.emitEvent({ type: 'lia-transcript', data: "Vou calcular a rota para você..." });

        try {
            // v5.6: Extração melhorada de destino
            let destination = userQuery.toLowerCase()
                // Remover prefixos comuns de perguntas de rota
                .replace(/lia,?\s*/gi, '')
                .replace(/eu quero saber\s*/gi, '')
                .replace(/qual [aé] distância\s*/gi, '')
                .replace(/qual a distancia\s*/gi, '')
                .replace(/quero saber a distância\s*/gi, '')
                .replace(/como chegar (no|na|ao|à)\s*/gi, '')
                .replace(/distância (para|até|de|da)\s*/gi, '')
                .replace(/rota (para|até)\s*/gi, '')
                .replace(/ir (para|pro|pra)\s*/gi, '')
                .replace(/até (o|a)\s*/gi, '')
                .replace(/da minha casa\s*/gi, '')
                .replace(/de minha casa\s*/gi, '')
                .replace(/daqui\s*/gi, '')
                .replace(/com a distância\s*/gi, '') // "com a distância" mal transcrito
                .replace(/\s+/g, ' ')
                .trim();

            // v5.6: Mapeamento de destinos conhecidos (transcrição ruim → destino real)
            const knownDestinations: Record<string, string> = {
                'fórum de aveiro': 'Fórum de Aveiro, Portugal',
                'forum de aveiro': 'Fórum de Aveiro, Portugal',
                'forro dele': 'Fórum de Aveiro, Portugal', // Transcrição comum errada
                'forro de lei': 'Fórum de Aveiro, Portugal',
                'aeroporto': 'Aeroporto Francisco Sá Carneiro, Porto, Portugal',
                'aeroporto do porto': 'Aeroporto Francisco Sá Carneiro, Porto, Portugal',
            };

            // Verificar destinos conhecidos
            for (const [key, value] of Object.entries(knownDestinations)) {
                if (userQuery.toLowerCase().includes(key)) {
                    destination = value;
                    break;
                }
            }

            // Se destino ainda vazio ou muito curto, não conseguimos extrair
            if (!destination || destination.length < 3) {
                const errorMsg = "Não entendi o destino. Pode repetir para onde você quer ir?";
                this.emitEvent({ type: 'lia-transcript', data: errorMsg });
                return;
            }

            console.log(`🚗 [Directions] Destino extraído: "${destination}" (original: "${userQuery}")`);

            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: 'getDirections',
                    args: { origin: 'minha localização', destination },
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();

            // v5.6: Validação robusta do resultado
            if (result.success !== false && result) {
                const data = result.data || result.result || result;

                // Validar campos obrigatórios
                const distance = data.distance || 'distância não disponível';
                const duration = data.duration || 'tempo não disponível';
                const endAddr = data.end_address || destination;
                const mapsUrl = data.mapsUrl || null;

                let message = `A distância até ${endAddr} é de ${distance}, levando cerca de ${duration}.`;
                if (mapsUrl) {
                    message += ` Veja o trajeto aqui: ${mapsUrl}`;
                }

                this.emitEvent({ type: 'lia-transcript', data: message });
                if (this.config.callbacks?.persistMessage && this.currentConversationId) {
                    this.config.callbacks.persistMessage('assistant', message, this.currentConversationId);
                }
                await this.injectToGemini(`[SISTEMA: Rota calculada: ${message}]`);
            } else {
                const errorMsg = `Não consegui calcular a rota para ${destination}. O endereço pode estar incorreto.`;
                this.emitEvent({ type: 'lia-transcript', data: errorMsg });
                await this.injectToGemini(`[SISTEMA: Erro no calculo de rota: ${result.error || 'Desconhecido'}]`);
            }
        } catch (err) {
            console.error('❌ Erro no forçador de rotas:', err);
            this.emitEvent({ type: 'lia-transcript', data: "Tive um problema ao calcular a rota. Tente novamente." });
        } finally {
            this.isWaitingForTool = false;
            this.emitEvent({ type: 'tool-active', data: false });
        }
    }

    private async executeForcedPlaces(userQuery: string): Promise<void> {
        this.forcedActionDone = true;
        this.isWaitingForTool = true;
        this.emitEvent({ type: 'tool-active', data: true });
        this.emitEvent({ type: 'lia-transcript', data: "Buscando lugares próximos..." });

        try {
            let query = userQuery.toLowerCase()
                .replace(/onde tem|onde fica|onde é|tem alguma|tem algum|procure por|busca por|perto de mim|próximo/g, '')
                .trim();

            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: 'getLocation',
                    args: { query, location: 'minha localização' },
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();
            const results = result.data || result.result || result;

            if (Array.isArray(results) && results.length > 0) {
                const top = results.slice(0, 2).map((p: any) => `${p.name} em ${p.address}`).join('; ');
                const message = `Encontrei: ${top}. Quer o link de algum?`;
                this.emitEvent({ type: 'lia-transcript', data: message });
                await this.injectToGemini(`[SISTEMA: Lugares encontrados: ${top}]`);
            } else {
                const msg = `Não encontrei ${query} aqui por perto agora.`;
                this.emitEvent({ type: 'lia-transcript', data: msg });
                await this.injectToGemini(`[SISTEMA: Nenhum lugar encontrado para "${query}"]`);
            }
        } catch (err) {
            console.error('❌ Erro no forçador de lugares:', err);
        } finally {
            this.isWaitingForTool = false;
            this.emitEvent({ type: 'tool-active', data: false });
        }
    }

    /**
     * Reproduz fila de áudio
     */
    private async playAudioQueue(): Promise<void> {
        if (this.isPlayingAudio || this.audioQueue.length === 0) return;

        this.isPlayingAudio = true;

        if (this.currentSession) {
            this.currentSession.isSpeaking = true;
            this.currentSession.isListening = false;
        }
        this.emitEvent({ type: 'speaking' });

        while (this.audioQueue.length > 0) {
            const buffer = this.audioQueue.shift()!;

            try {
                if (!this.audioContext || buffer.byteLength < 2) continue;

                const audioBuffer = this.audioContext.createBuffer(1, buffer.byteLength / 2, 24000);
                const channelData = audioBuffer.getChannelData(0);
                const int16View = new Int16Array(buffer);
                for (let i = 0; i < int16View.length; i++) {
                    channelData[i] = int16View[i] / 32768;
                }

                const source = this.audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this.audioContext.destination);
                this.currentAudioSource = source;

                await new Promise<void>((resolve) => {
                    source.onended = () => {
                        if (this.currentAudioSource === source) this.currentAudioSource = null;
                        resolve();
                    };
                    source.start();
                });

            } catch (e) {
                console.warn('⚠️ Erro ao reproduzir áudio:', e);
            }
        }

        this.isPlayingAudio = false;
        if (this.currentSession) {
            this.currentSession.isSpeaking = false;
            this.currentSession.isListening = true;
        }
        this.emitEvent({ type: 'listening' });
    }

    /**
     * Limpa fila de áudio (usado em interrupções)
     */
    private clearAudioQueue(): void {
        this.audioQueue = [];
        if (this.currentAudioSource) {
            try {
                this.currentAudioSource.stop();
            } catch (e) { /* ignore */ }
            this.currentAudioSource = null;
        }
        this.isPlayingAudio = false;
    }

    /**
     * Encerra sessão
     */
    async stopSession(): Promise<void> {
        console.log('🛑 Encerrando sessão...');
        this.isSessionActive = false;
        this.setState(ConnState.CLOSING);

        this.clearAudioQueue();

        if (this.scriptProcessorNode) {
            this.scriptProcessorNode.disconnect();
            this.scriptProcessorNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => {
                track.stop();
                console.log(`🎤 Track parada: ${track.label}`);
            });
            this.mediaStream = null;
        }

        if (this.liveSession) {
            try {
                await this.liveSession.close();
            } catch (e) { /* ignore */ }
            this.liveSession = null;
        }

        if (this.audioContext) {
            try {
                await this.audioContext.close();
            } catch (e) { /* ignore */ }
            this.audioContext = null;
        }

        this.currentSession = null;
        this.setState(ConnState.CLOSED);
        console.log('✅ Sessão encerrada');
    }

    /**
     * Retorna a sessão atual
     */
    getSession(): GeminiLiveSession | null {
        return this.currentSession;
    }

    /**
     * Retorna estado de conexão
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Atualiza cache de memórias
     */
    setMemoriesCache(memories: Array<{ key: string; value: string }>): void {
        this.memoriesCache = memories;
    }

    /**
     * Inicia Timer de Watchdog (v4.23)
     */
    private startWatchdog(ms: number = 8000): void {
        this.stopWatchdog();
        this.watchdogTimer = setTimeout(() => {
            if (!this.responseSent && this.connectionState === ConnState.OPEN) {
                console.warn(`🕒 [Watchdog] Disparado após ${ms}ms sem resposta.`);
                this.sendFallbackResponse();
            }
        }, ms);
    }

    /**
     * Para Timer de Watchdog
     */
    private stopWatchdog(): void {
        if (this.watchdogTimer) {
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    }

    /**
     * Envia Resposta de Fallback (v4.23)
     */
    private sendFallbackResponse(): void {
        const fallbackMsg = "Não consegui processar isso agora. Pode tentar de novo ou prefere que eu responda com o que já sei?";
        console.log('🛡️ [Fail-Safe] Enviando resposta fallback.');

        this.emitEvent({ type: 'lia-transcript', data: fallbackMsg });

        if (this.config.callbacks?.persistMessage && this.currentConversationId) {
            this.config.callbacks.persistMessage('assistant', fallbackMsg, this.currentConversationId);
        }

        this.responseSent = true;
        this.stopWatchdog();
    }
}

// ======================================================================
// FACTORY
// ======================================================================

/**
 * Cria instância do GeminiLiveService com configuração
 */
export function createGeminiLiveService(config: LiaRuntimeConfig): GeminiLiveService {
    return new GeminiLiveService(config);
}
