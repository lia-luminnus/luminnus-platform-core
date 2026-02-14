// ======================================================================
// 🎙️ GEMINI LIVE SERVICE - Serviço compartilhado de voz em tempo real
// ======================================================================
// Single Source of Truth para Admin e Dashboard-client
// ======================================================================

import { GoogleGenAI } from '@google/genai';
import { sanitizeForTTS } from '../utils/ttsSanitizer.js';
import type {
    GeminiLiveEvent,
    GeminiLiveSession,
    LiaRuntimeConfig,
    ConnectionState,
    ToolResult,
} from '../contracts/events.contract.js';
import { ConnectionState as ConnState } from '../contracts/events.contract.js';
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
    const bytes = new Uint8Array(int16Array.buffer);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i];
        const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
        base64 += alphabet[b1 >> 2];
        base64 += alphabet[((b1 & 3) << 4) | (b2 >> 4)];
        base64 += i + 1 < bytes.length ? alphabet[((b2 & 15) << 2) | (b3 >> 6)] : '=';
        base64 += i + 2 < bytes.length ? alphabet[b3 & 63] : '=';
    }
    return base64;
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
    private scriptProcessorNode: ScriptProcessorNode | null = null; // deprecated - migrar para audioWorkletNode
    private audioWorkletNode: AudioWorkletNode | null = null; // v5.0: substituindo ScriptProcessor
    private currentConversationId: string | null = null;
    private memoriesCache: Array<{ key: string; value: string }> = [];

    // v4.21: Acumuladores para transcrição em streaming
    // Gemini envia transcrições em fragmentos - acumulamos até turnComplete
    private accumulatedUserText: string = '';
    private accumulatedLiaText: string = '';

    // v4.32: Separar outputAudioTranscription de modelTurn.text para evitar thinking text
    private hasReceivedAudioThisTurn: boolean = false;
    private outputTranscriptionText: string = ''; // Transcrição limpa de outputAudioTranscription

    // v4.23: Fail-safe & Watchdog
    private watchdogTimer: any = null;
    private responseSent: boolean = false;
    private reconnectAttempts: number = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private isWaitingForTool: boolean = false;
    private toolCallCount: number = 0;

    // v4.29 & v5.3: Gatilhos para Forçar Tool Call quando Gemini não decide
    private static SEARCH_TRIGGERS = [
        'cotação', 'preço', 'valor', 'quanto custa', 'quanto está',
        'euro', 'dólar', 'bitcoin', 'real', 'libra', 'iene',
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
     * v4.32: Sanitiza transcrição da LIA para remover thinking text / meta-análise
     * Usado quando modo é AUDIO - prioriza outputAudioTranscription limpo
     */
    private sanitizeTranscriptPTBR(text: string): string {
        if (!text) return '';

        // Remover thinking tokens (entre **)
        text = text.replace(/\*\*[\s\S]*?\*\*/g, '');

        // Remover meta-análise em inglês (I've confirmed, confidence, checks)
        const metaPatterns = [
            /I've\s+(confirmed|determined|analyzed|checked|processed|iterated|selected|maintained)[\s\S]*?\./gi,
            /confidence\s+score[\s\S]*?\./gi,
            /maintaining\s+my\s+professional[\s\S]*?\./gi,
            /all\s+checks\s+were[\s\S]*?\./gi,
            /after\s+considering[\s\S]*?\./gi,
            /I\s+have\s+confirmed[\s\S]*?\./gi,
            /I\s+need\s+to[\s\S]*?\./gi,
            /I\s+will\s+(acknowledge|focus|use|confirm)[\s\S]*?\./gi,
        ];

        for (const pattern of metaPatterns) {
            text = text.replace(pattern, '');
        }

        // Limpar espaços extras e normalizar
        text = text.replace(/\s{2,}/g, ' ').trim();

        // Se o texto restante ainda for majoritariamente em inglês, ignorar
        // v5.8: Aumentado limiar de 30% → 60% para permitir português com termos técnicos
        const englishWords = (text.match(/\b(I've|I'm|I will|The|Based on|Here's|Let me|which|that|and|the|for|with|this|have|been|are|was|were)\b/gi) || []).length;
        const totalWords = text.split(/\s+/).length;
        const englishRatio = totalWords > 0 ? (englishWords / totalWords) : 0;

        if (totalWords > 0 && englishRatio > 0.6) {
            console.warn(
                `⚠️ [Sanitize] Transcrição descartada (${Math.round(englishRatio * 100)}% inglês):`,
                text.substring(0, 80) + (text.length > 80 ? '...' : '')
            );
            return '';
        }

        if ((window as any).DEBUG_LIA_LOGS && englishWords > 0) {
            console.log(`🔍 [Sanitize] Texto aceito (${Math.round(englishRatio * 100)}% inglês, limiar 60%)`);
        }

        return text;
    }

    /**
     * v4.32: Normaliza transcrição do usuário para remover fragmentação
     * Corrige: "p r e c i s a n d o" → "precisando", "vo cê" → "você"
     */
    private normalizeUserTranscript(text: string): string {
        if (!text) return '';

        // v9.5: CORREÇÕES ESPECÍFICAS DE FRAGMENTAÇÃO PT-BR
        const corrections = [
            { pattern: /\bvo\s+cê\b/gi, replacement: 'você' },
            { pattern: /\bes\s+tá\b/gi, replacement: 'está' },
            { pattern: /\bda\s+dos\b/gi, replacement: 'dados' },
            { pattern: /\bá\s+udio\b/gi, replacement: 'áudio' },
            { pattern: /\bco\s+nhe\s+cer\b/gi, replacement: 'conhecer' },
            { pattern: /\bex\s+a\s+ta\s+men\s+te\b/gi, replacement: 'exatamente' },
            { pattern: /\bre\s+fe\s+rên\s+cia\b/gi, replacement: 'referência' },
            { pattern: /\bcor\s+re\s+ta\s+men\s+te\b/gi, replacement: 'corretamente' },
            { pattern: /\bcha\s+man\s+do\b/gi, replacement: 'chamando' },
            { pattern: /\ble\s+ta\b/gi, replacement: 'leta' } // Para "coleta"
        ];

        let normalized = text;
        corrections.forEach(({ pattern, replacement }) => {
            normalized = normalized.replace(pattern, replacement);
        });

        // Detectar e corrigir espaçamento entre letras (min 3 chars consecutivos com espaço)
        // Padrão: letra + espaço + letra, repetido 3+ vezes
        // Ex: "p r e c i s a" → "precisa"
        normalized = normalized.replace(/(\p{L})\s+(?=\p{L}\s+\p{L})/gu, '$1');

        // v9.6: Colapsar sílabas fragmentadas em blocos longos ("lo ca li za ção" → "localização")
        // sem afetar preposições curtas legítimas.
        normalized = normalized.replace(/\b(?:\p{L}{1,2}\s+){2,}\p{L}{1,3}\b/gu, (match) => {
            const compact = match.replace(/\s+/g, '');
            return compact.length >= 6 ? compact : match;
        });

        // Segunda passada mais agressiva para casos como "á udio" → "áudio"
        // MAS CUIDADO: Não juntar "de a", "e o", "é a"
        // Lista de palavras curtas válidas que não devem ser fundidas
        const validShortWords = new Set(['e', 'a', 'o', 'é', 'à', 'de', 'da', 'do', 'em', 'na', 'no', 'se', 'já', 'lá', 'só', 'eu', 'tu', 'ele', 'nós', 'vós', 'eles', 'me', 'te', 'se', 'nos', 'vos', 'lhe']);

        normalized = normalized.replace(/(\p{L})\s(\p{L})(?=\s|$)/gu, (match, p1, p2) => {
            const potentialWord = (p1 + p2).toLowerCase();
            // Se p1 ou p2 forem palavras válidas isoladas, não juntar
            if (validShortWords.has(p1.toLowerCase()) || validShortWords.has(p2.toLowerCase())) {
                return match;
            }
            return p1 + p2;
        });

        // Colapsar múltiplos espaços
        normalized = normalized.replace(/\s{2,}/g, ' ').trim();

        // Remover fragmentos muito curtos isolados se não forem palavras válidas
        if (normalized.length < 2 && !validShortWords.has(normalized.toLowerCase())) return '';

        return normalized;
    }

    private isExplicitListRequest(userText: string): boolean {
        if (!userText) return false;
        return /(em\s+\d+\s+passos|passo\s+a\s+passo|liste|listar|t[oó]picos|itens|numerad[oa]|checklist)/i.test(userText);
    }

    private normalizeVoiceStyle(text: string, userText: string): string {
        if (!text) return '';
        if (this.isExplicitListRequest(userText)) return text;

        let normalized = text;

        // Remove títulos rígidos de template para fala natural.
        normalized = normalized
            .replace(/\*\*\s*PARTE\s*\d+\s*-[^*]+\*\*/gi, '')
            .replace(/\b(Achado principal|Evid[eê]ncia|Causa raiz(?: prov[aá]vel)?|Corre[cç][aã]o m[ií]nima|Valida[cç][aã]o)\s*[:-]\s*/gi, '');

        // Quebra enumerações inline para facilitar normalização.
        normalized = normalized.replace(/\s+(\d+[).])\s+/g, '\n$1 ');

        const lines = normalized
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        const numberedLines = lines.filter(line => /^\d+[).]\s+/.test(line));
        if (numberedLines.length >= 2 && numberedLines.length >= Math.ceil(lines.length * 0.5)) {
            normalized = numberedLines
                .map(line => line.replace(/^\d+[).]\s+/, '').trim())
                .filter(Boolean)
                .join('. ');
        }

        normalized = normalized.replace(/\s{2,}/g, ' ').trim();
        return normalized;
    }

    /**
     * Atualiza estado de conexão
     */
    private shouldTryReconnect(eventCode: number): boolean {
        return (eventCode === 1006 || eventCode === 1008) && this.reconnectAttempts < 1;
    }

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

            // 3. AudioContext - v5.8: CRÍTICO
            // Remover sampleRate fixo de 16000. Deixar o navegador usar a taxa nativa (48kHz/44.1kHz).
            // O AudioWorklet fará o downsampling correto para 16kHz.
            // Isso evita artefatos de resampling do navegador e "voz de robô".
            this.audioContext = new AudioContext();

            // 4. Microfone
            // NOTA: Browser sempre entrega 48kHz (hardware padrão), ignora sampleRate request
            // AudioContext automaticamente faz resampling 48kHz → 16kHz CORRETAMENTE
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
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

            console.log(`🚀 VOICE_START {engine: "gemini", conversationId: "${this.currentConversationId}", userIdPresent: ${!!this.config.userId}, tenantIdPresent: ${!!this.config.tenantId}}`);
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

            // ✅ CORREÇÃO: Usar SOMENTE token efêmero (backend já tem config completa)
            // v5.7: CRÍTICO - Adicionar model explícito (SDK exige mesmo com token efêmero)
            this.liveSession = await liveClient.connect({
                model: 'gemini-2.0-flash-exp', // OBRIGATÓRIO: SDK valida este parâmetro antes do handshake. NOTA: Gemini Live NÃO suporta 2.5-flash!
                callbacks: {
                    onopen: () => {
                        console.log('✅ Conectado ao Gemini Live (v2.0-flash-exp)');
                        this.setState(ConnState.OPEN);
                        this.reconnectAttempts = 0;
                        if (this.reconnectTimer) {
                            clearTimeout(this.reconnectTimer);
                            this.reconnectTimer = null;
                        }
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

                        // v4.31: Diagnóstico detalhado de erro 1008 (Operation not supported)
                        if (event.code === 1008) {
                            console.error('❌ [Erro 1008] Operação não suportada. Verificar modelo e tools.');
                        } else if (event.code === 1006) {
                            console.error('❌ [Erro 1006] Conexão perdida inesperadamente.');
                        } else if (event.code === 1007) {
                            console.error('❌ [Erro 1007] Dados inválidos recebidos.');
                        }

                        const shouldTryReconnect = this.shouldTryReconnect(event.code);

                        // O socket já foi encerrado pelo servidor.
                        // Evitar close() redundante para não gerar "WebSocket is already in CLOSING or CLOSED state".
                        this.stopSession({ skipLiveSessionClose: true });
                        this.emitEvent({ type: 'end', data: `WebSocket closed: ${event.code}` });

                        // v9.6: Recuperação automática (1 tentativa) em fechamentos anormais/unsupported.
                        if (shouldTryReconnect) {
                            this.reconnectAttempts += 1;
                            console.warn(`♻️ [GeminiLive] Tentando reconectar automaticamente (tentativa ${this.reconnectAttempts})...`);
                            this.reconnectTimer = setTimeout(() => {
                                this.startSession().catch((reconnectErr) => {
                                    console.error('❌ [GeminiLive] Falha ao reconectar automaticamente:', reconnectErr);
                                });
                            }, 1200);
                        }
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

        // Adicionar info de modo e Usuário
        const userName = this.config.userName || 'Usuário';
        instruction += `\n\n## CONTEXTO:\n- Modo: ${this.config.mode}\n- Plano: ${this.config.userPlan || 'Free'}\n- Usuário: ${userName}`;

        return instruction;
    }

    /**
     * Configura captura de áudio do microfone
     * v5.0: Migração de ScriptProcessor → AudioWorkletNode
     * 
     * AudioWorkletNode roda em thread separada (Audio Worklet Global Scope),
     * resolvendo problema de áudio "rádio mal sintonizado" causado quando
     * ScriptProcessor competia com UI/render na main thread.
     */
    private audioChunkCount = 0;
    private lastAudioLogTime = 0;

    private async setupAudioCapture(): Promise<void> {
        if (!this.audioContext || !this.mediaStream) return;

        this.audioChunkCount = 0;
        this.lastAudioLogTime = Date.now();

        try {
            // Criar processador de áudio inline (via Blob URL)
            const processorCode = `
// Downsampling 48kHz → 16kHz
function downsample(input, fromRate, toRate) {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outputLength = Math.floor(input.length / ratio);
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i++) {
        output[i] = input[Math.floor(i * ratio)];
    }
    return output;
}

// Float32 → Int16 PCM
function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
}

// Int16 → Base64 (Compatível com AudioWorklet)
function int16ToBase64(buffer) {
    const bytes = new Uint8Array(buffer.buffer);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i];
        const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
        base64 += alphabet[b1 >> 2];
        base64 += alphabet[((b1 & 3) << 4) | (b2 >> 4)];
        base64 += i + 1 < bytes.length ? alphabet[((b2 & 15) << 2) | (b3 >> 6)] : '=';
        base64 += i + 2 < bytes.length ? alphabet[b3 & 63] : '=';
    }
    return base64;
}

class GeminiLiveAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.chunkCount = 0;
        this.lastLogTime = 0;
        // Buffer para acumular samples brutos antes do downsample
        // 4096 samples @ 48kHz ~= 85ms. @ 44.1kHz ~= 92ms.
        this.bufferSize = 4096;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const inputData = input[0]; // mono channel
        const inputLength = inputData.length;

        // Se o input for maior que o espaço restante, processar o que der
        let sourceIndex = 0;
        
        while (sourceIndex < inputLength) {
            const spaceInBuff = this.bufferSize - this.bufferIndex;
            const toCopy = Math.min(inputLength - sourceIndex, spaceInBuff);
            
            this.buffer.set(inputData.subarray(sourceIndex, sourceIndex + toCopy), this.bufferIndex);
            
            this.bufferIndex += toCopy;
            sourceIndex += toCopy;

            // Se buffer cheio, envia
            if (this.bufferIndex >= this.bufferSize) {
                this.flush();
            }
        }

        return true;
    }

    flush() {
        if (this.bufferIndex === 0) return;

        const dataToProcess = this.buffer; // Processar buffer cheio
        const maxAmplitude = Math.max(...Array.from(dataToProcess).map(Math.abs));

        // Downsample e conversão
        // sampleRate é global do AudioWorkletGlobalScope
        const downsampled = downsample(dataToProcess, sampleRate, 16000);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64 = int16ToBase64(pcm16);

        this.port.postMessage({
            type: 'audio-chunk',
            data: base64,
            mimeType: 'audio/pcm;rate=16000',
            amplitude: maxAmplitude,
            chunkCount: ++this.chunkCount
        });

        // Reset buffer
        this.bufferIndex = 0;
        // Otimização: não recriar buffer, apenas sobrescrever na próxima iteração
        // mas precisamos garantir que não processamos lixo se flushar parcial (não deve ocorrer no while loop acima para buffer cheio, mas safety first)
    }
}

registerProcessor('gemini-live-processor', GeminiLiveAudioProcessor);
`;

            const blob = new Blob([processorCode], { type: 'application/javascript' });
            const processorUrl = URL.createObjectURL(blob);

            // Registrar AudioWorklet
            await this.audioContext.audioWorklet.addModule(processorUrl);
            URL.revokeObjectURL(processorUrl);

            // Criar nó do worklet
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'gemini-live-processor');

            // Escutar mensagens do worklet
            this.audioWorkletNode.port.onmessage = (event) => {
                if (event.data.type === 'audio-chunk') {
                    // Enviar áudio para Gemini Live
                    if (!this.isSessionActive || !this.liveSession || this.connectionState !== ConnState.OPEN) {
                        return;
                    }

                    try {
                        // Verificar WebSocket
                        const ws = (this.liveSession as any)._ws || (this.liveSession as any).ws;
                        if (ws && ws.readyState !== 1) { // 1 = OPEN
                            console.log('⚠️ [GeminiLive] WebSocket fechando/fechado, ignorando chunk');
                            return;
                        }

                        this.liveSession.sendRealtimeInput({
                            audio: {
                                data: event.data.data,
                                mimeType: event.data.mimeType
                            }
                        });

                        this.audioChunkCount++;
                    } catch (e: any) {
                        if (e.message?.includes('CLOSED') || e.message?.includes('CLOSING')) {
                            console.warn('⚠️ [GeminiLive] Sessão encerrada durante envio de áudio');
                        } else {
                            console.error('❌ [GeminiLive] Erro ao enviar áudio:', e);
                        }
                        this.isSessionActive = false;
                    }
                } else if (event.data.type === 'log' && (window as any).DEBUG_LIA_LOGS) {
                    console.log(event.data.message);
                }
            };

            // Conectar
            source.connect(this.audioWorkletNode);
            this.audioWorkletNode.connect(this.audioContext.destination);

            console.log('🎤 Captura de áudio configurada (AudioWorkletNode)');
        } catch (error) {
            console.warn('⚠️ AudioWorklet não suportado, usando ScriptProcessor (fallback):', error);

            if (!this.audioContext || !this.mediaStream) {
                console.error('❌ [GeminiLive] AudioContext ou MediaStream perdido no fallback');
                return;
            }

            // Fallback para ScriptProcessor (navegadores antigos)
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.scriptProcessorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.scriptProcessorNode.onaudioprocess = (event) => {
                if (!this.isSessionActive || !this.liveSession || this.connectionState !== ConnState.OPEN) {
                    return;
                }

                try {
                    const ws = (this.liveSession as any)._ws || (this.liveSession as any).ws;
                    if (ws && ws.readyState !== 1) {
                        console.log('⚠️ [GeminiLive] WebSocket fechando/fechado, ignorando chunk');
                        return;
                    }

                    const inputData = event.inputBuffer.getChannelData(0);
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
                } catch (e: any) {
                    if (!e.message?.includes('CLOSED') && !e.message?.includes('CLOSING')) {
                        console.error('❌ [GeminiLive] Erro ao enviar áudio:', e);
                    }
                    this.isSessionActive = false;
                }
            };

            source.connect(this.scriptProcessorNode);
            this.scriptProcessorNode.connect(this.audioContext.destination);

            console.log('🎤 Captura de áudio configurada (ScriptProcessor - fallback)');
        }
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

                // v7.0: Emitir generating-start para feedback visual imediato ("Penseira")
                this.emitEvent({ type: 'generating-start', data: 'processing' });

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
            const nonLatinRegex = /[^\x20-\x7F\u00C0-\u024F\u1E00-\u1EFF]/g;
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

            // v9.6: NÃO inserir espaços artificiais entre chunks.
            // O stream do Gemini pode quebrar no meio da palavra e o espaço forçado
            // causava textos como "lo caliza ção" e "en de re ço".
            this.accumulatedUserText += inputText;
        }

        // v4.21: Transcrição da LIA - ACUMULAR em vez de emitir imediatamente
        const outputTransc = sc.outputTranscription || sc.outputAudioTranscription || sc.output_audio_transcription;
        const outputText = typeof outputTransc === 'string' ? outputTransc : outputTransc?.text;

        if (outputText) {
            this.responseSent = true;
            this.stopWatchdog();
            // v4.32: Guardar outputAudioTranscription SEPARADAMENTE para priorização
            // Esta é a transcrição "limpa" do que foi realmente falado (sem thinking)
            this.outputTranscriptionText += outputText;
            // Manter também em accumulatedLiaText para compatibilidade
            this.accumulatedLiaText += outputText;

            if ((window as any).DEBUG_LIA_LOGS) {
                console.log('📝 [Chunk] LIA (outputTranscription):', outputText);
            }
        } else if (sc.model_turn?.parts || sc.modelTurn?.parts) {
            const parts = sc.model_turn?.parts || sc.modelTurn?.parts;
            const textPart = parts.find((p: any) => p.text);
            if (textPart?.text) {
                this.responseSent = true;
                this.stopWatchdog();
                // v4.32: NÃO adicionar modelTurn.text ao outputTranscriptionText
                // Este texto contém thinking/reasoning interno - vai apenas para accumulatedLiaText como fallback
                this.accumulatedLiaText += textPart.text;
                if ((window as any).DEBUG_LIA_LOGS) {
                    console.log('📝 [Chunk] LIA (model_turn - PODE SER THINKING):', textPart.text.substring(0, 50));
                }
            }
        }

        // Processar parts (áudio)
        const modelTurn = sc.model_turn || sc.modelTurn;
        if (modelTurn?.parts) {
            // Contar parts de áudio
            const audioParts = modelTurn.parts.filter((p: any) =>
                (p.inline_data || p.inlineData)?.mimeType?.includes('audio')
            );
            if (audioParts.length > 0) {
                // v4.32: Marcar que recebemos áudio neste turno - priorizar outputTranscriptionText
                this.hasReceivedAudioThisTurn = true;
            }

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
            // v4.32: Adicionada normalização para corrigir fragmentação ("p r e c i s a n d o")
            const userTextForTrigger = this.normalizeUserTranscript(this.accumulatedUserText);

            if (userTextForTrigger) {
                console.log('🗣️ Usuário:', userTextForTrigger.substring(0, 50) + (userTextForTrigger.length > 50 ? '...' : ''));
                this.emitEvent({ type: 'user-transcript', data: userTextForTrigger });

                if (this.config.callbacks?.persistMessage && this.currentConversationId) {
                    // v4.32: Bloquear atualização de memória/nome com transcrições curtas do Live
                    // Evita que fragmentos como "a", "o", "sim" contaminem o perfil
                    const isValidForMemory = userTextForTrigger.length >= 8 &&
                        /(meu nome é|pode me chamar de|sou o|sou a|me chamo)\s+/i.test(userTextForTrigger);

                    if (!isValidForMemory) {
                        console.log('⚠️ [Memory] Texto curto/sem trigger - skipMemoryUpdate');
                    }

                    this.config.callbacks.persistMessage('user', userTextForTrigger, this.currentConversationId);
                }
                this.accumulatedUserText = ''; // Reset acumulador
            }

            // v4.32: PRIORIZAÇÃO DE TRANSCRIÇÃO
            // Se recebemos áudio, usar APENAS outputTranscriptionText (transcrição limpa da fala)
            // Se não recebemos áudio, usar accumulatedLiaText (pode conter thinking como fallback)
            let liaText = '';

            if (this.hasReceivedAudioThisTurn && this.outputTranscriptionText.trim()) {
                // MODO ÁUDIO: usar transcrição limpa do que foi REALMENTE falado
                const originalText = this.outputTranscriptionText.trim();
                const sanitized = this.sanitizeTranscriptPTBR(originalText);

                // v5.8: FALLBACK - se sanitização removeu tudo, usar original
                if (!sanitized && originalText) {
                    console.warn('⚠️ [Live] Sanitização removeu tudo, usando texto original como fallback');
                    liaText = originalText;
                } else {
                    liaText = sanitized;
                }

                console.log('🎵 [Live] Usando outputTranscriptionText (modo áudio)');
            } else if (this.accumulatedLiaText.trim()) {
                // MODO TEXTO/FALLBACK: usar accumulatedLiaText sanitizado
                const originalText = this.accumulatedLiaText.trim();
                const sanitized = this.sanitizeTranscriptPTBR(originalText);

                // v5.8: FALLBACK - se sanitização removeu tudo, usar original
                if (!sanitized && originalText) {
                    console.warn('⚠️ [Live] Sanitização removeu tudo, usando texto original como fallback');
                    liaText = originalText;
                } else {
                    liaText = sanitized;
                }

                console.log('📝 [Live] Usando accumulatedLiaText (fallback/texto)');
            }

            // Se ainda tiver thinking text residual após sanitização, limpar
            if (liaText && (liaText.length < 10 || /^(I've|I'm|The|Based on|Here's|Let me|I will|I need)/i.test(liaText))) {
                console.log('⚠️ [Filtro] Transcrição residual parece ser thinking text, ignorando');
                liaText = '';
            }

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
            } else if (forcedTool === 'dashboard') {
                console.log('📊 [Forçando] Detectado gatilho de dashboard, forçando snapshot...');
                await this.executeForcedDashboard();
            } else if (liaText) {
                const naturalLiaText = this.normalizeVoiceStyle(liaText, userTextForTrigger);
                const sanitizedLia = sanitizeForTTS(naturalLiaText);
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
            // v4.32: Resetar novas variáveis de rastreamento
            this.hasReceivedAudioThisTurn = false;
            this.outputTranscriptionText = '';

            if (this.currentSession) {
                this.currentSession.isSpeaking = false;
                this.currentSession.isListening = true;
            }

            // v7.0: Finalizar indicador de geração
            this.emitEvent({ type: 'generating-end', data: 'turn_complete' });

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
     * v5.5: Desabilitado busca forçada para cotações - Gemini tem Google Search Grounding nativo
     */
    private detectForcedTool(userText: string, liaResponse: string, geminiCalledTool: boolean): 'search' | 'weather' | 'time' | 'directions' | 'places' | 'dashboard' | null {
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

        // v5.5: DESABILITADO - Gemini tem Google Search Grounding nativo habilitado (googleSearch: {})
        // Busca forçada via backend causava resultados irrelevantes (iPhone, EUR-Lex, etc.)
        // Apenas forçar busca se for sobre notícias genéricas (não cotações, que o Grounding resolve melhor)
        const isCotacaoQuery = ['euro', 'dólar', 'dollar', 'bitcoin', 'cotação', 'preço', 'valor', 'real'].some(t => lowerText.includes(t));
        if (GeminiLiveService.SEARCH_TRIGGERS.some(t => lowerText.includes(t)) && isGeneric && !isCotacaoQuery && !lowerText.includes('dashboard') && !lowerText.includes('gráfico')) return 'search';

        if ((lowerText.includes('dashboard') || lowerText.includes('gráfico') || lowerText.includes('widget') || lowerText.includes('tabela')) && isGeneric) return 'dashboard';

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
        if (!this.liveSession || this.connectionState !== ConnState.OPEN) {
            console.warn('⚠️ [GeminiLive] Tentativa de injeção sem sessão ativa/aberta');
            return;
        }

        const session = this.liveSession as any;
        const ws = session?._ws || session?.ws;
        if (ws && ws.readyState !== 1) {
            console.warn('⚠️ [GeminiLive] WebSocket não está OPEN, injeção cancelada');
            return;
        }

        const payload = {
            turns: [{ role: 'user', parts: [{ text }] }],
            turnComplete: true,
        };

        try {
            if (session.sendClientContent) {
                await session.sendClientContent(payload);
                return;
            }

            if (session.send_client_content) {
                await session.send_client_content({
                    turns: [{ role: 'user', parts: [{ text }] }],
                    turn_complete: true,
                });
                return;
            }

            console.warn('⚠️ [GeminiLive] SDK sem método sendClientContent/send_client_content');
        } catch (error) {
            console.error('❌ [GeminiLive] Falha ao injetar conteúdo na sessão:', error);
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
            const query = userQuery.toLowerCase()
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

    private async executeForcedDashboard(): Promise<void> {
        this.forcedActionDone = true;
        this.isWaitingForTool = true;
        this.emitEvent({ type: 'tool-active', data: true });
        this.emitEvent({ type: 'lia-transcript', data: "Vou verificar seu dashboard agora..." });

        try {
            const response = await fetch(`${this.config.apiUrl}/api/tools/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolName: 'dashboardGetSnapshot',
                    args: {},
                    userId: this.config.userId,
                    tenantId: this.config.tenantId,
                }),
            });

            const result = await response.json();
            const data = result.data || result.result;
            const message = data?.layout_summary
                ? `Dashboard verificado. Atualmente você tem ${data.widgets.length} widgets: ${data.layout_summary}.`
                : "Dashboard verificado. As alterações foram aplicadas.";

            this.emitEvent({ type: 'lia-transcript', data: message });

            if (this.config.callbacks?.persistMessage && this.currentConversationId) {
                this.config.callbacks.persistMessage('assistant', message, this.currentConversationId);
            }

            await this.injectToGemini(`[SISTEMA: Dashboard atualizado: ${JSON.stringify(data)}]`);
        } catch (err) {
            console.error('❌ Erro no forçador de dashboard:', err);
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
    async stopSession(options: { skipLiveSessionClose?: boolean } = {}): Promise<void> {
        // v4.32: Idempotência - evitar fechar duas vezes (especialmente em dev/StrictMode)
        if (this.connectionState === ConnState.IDLE) {
            console.log('⚠️ [GeminiLiveService] Tentativa de parar sessão inexistente (IDLE)');
            return;
        }
        if (this.connectionState === ConnState.CLOSING || this.connectionState === ConnState.CLOSED) {
            console.log('⚠️ [GeminiLiveService] Sessão já está fechando/fechada');
            return;
        }

        console.log('🛑 Encerrando sessão...');
        this.isSessionActive = false;
        this.setState(ConnState.CLOSING);

        this.clearAudioQueue();

        if (this.scriptProcessorNode) {
            this.scriptProcessorNode.disconnect();
            this.scriptProcessorNode = null;
        }

        if (this.audioWorkletNode) {
            this.audioWorkletNode.disconnect();
            this.audioWorkletNode.port.close();
            this.audioWorkletNode = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => {
                track.stop();
                console.log(`🎤 Track parada: ${track.label}`);
            });
            this.mediaStream = null;
        }

        if (this.liveSession && !options.skipLiveSessionClose) {
            try {
                await this.liveSession.close();
            } catch (e) { /* ignore */ }
            this.liveSession = null;
        } else if (this.liveSession && options.skipLiveSessionClose) {
            console.log('ℹ️ [GeminiLiveService] Pulando close() explícito da liveSession (onclose já ocorreu)');
            this.liveSession = null;
        }

        if (this.audioContext) {
            try {
                await this.audioContext.close();
            } catch (e) { /* ignore */ }
            this.audioContext = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
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
