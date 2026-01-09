import {
  GoogleGenAI,
  Modality,
  FunctionDeclaration,
  Type,
} from "@google/genai";
import { getApiKey } from "./configService";
import { LIA_GEMINI_LIVE_PERSONALITY } from "../server/personality/lia-personality.js";

// ==============================
// GLOBAIS DE ÁUDIO
// ==============================
let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let inputNode: ScriptProcessorNode | null = null;
let outputNode: GainNode | null = null;
let mediaStream: MediaStream | null = null;

let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

// ==============================
// FUNCTION DECLARATIONS (TOOLS)
// ==============================
const visualToolDeclaration: FunctionDeclaration = {
  name: "update_visual_interface",
  description: "Atualiza a interface visual com conteúdo dinâmico",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: { type: Type.STRING, enum: ["show_image", "show_text", "render_chart"] },
      title: { type: Type.STRING },
      url: { type: Type.STRING },
      text: { type: Type.STRING },
      chartType: { type: Type.STRING, enum: ["bar", "line", "area"] },
      chartData: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            value: { type: Type.NUMBER }
          }
        }
      }
    },
    required: ["action"]
  }
};

const generateMediaToolDeclaration: FunctionDeclaration = {
  name: "generate_media",
  description: "Gera mídia (imagens ou vídeos) sob demanda",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mediaType: { type: Type.STRING, enum: ["video", "image"] },
      prompt: { type: Type.STRING }
    },
    required: ["mediaType", "prompt"]
  }
};

const searchToolDeclaration: FunctionDeclaration = {
  name: "search_grounding",
  description: "Realiza buscas no Google",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING }
    },
    required: ["query"]
  }
};

const mapToolDeclaration: FunctionDeclaration = {
  name: "map_grounding",
  description: "Busca localizações no Google Maps",
  parameters: {
    type: Type.OBJECT,
    properties: {
      locationQuery: { type: Type.STRING }
    },
    required: ["locationQuery"]
  }
};

// ==============================
// CALLBACKS
// ==============================
export interface LiveServiceCallbacks {
  onVisualEvent: (action: string, payload: any) => void;
  onToolCall: (name: string, args: any) => void;
  onStatusChange: (isConnected: boolean) => void;
  onAudioVolume: (volume: number) => void;
  onAgentTalking: (isTalking: boolean) => void;
  onError: (error: string) => void;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onUserSpeech?: (transcript: string) => void;
  onAssistantThinking?: () => void;
  onAssistantSpeakingStart?: () => void;
  onAssistantSpeakingEnd?: () => void;
  onUserTranscription?: (transcript: string) => void;
  onConnectionStateChange?: (state: string) => void;
}

// ==============================
// GEMINI LIVE SERVICE
// ==============================
export class GeminiLiveService {
  private ai: GoogleGenAI | null = null;
  private session: any = null;
  private callbacks: LiveServiceCallbacks;

  private isConnecting = false;
  private isConnected = false;
  private isProcessingAudio = false;

  private currentTranscript = "";

  constructor(callbacks: LiveServiceCallbacks) {
    this.callbacks = callbacks;
  }

  // ==============================
  // HARD RESET
  // ==============================
  private hardReset() {
    try {
      console.log("[LIA] 🧹 Hard reset - cleaning all resources...");

      this.isProcessingAudio = false;
      this.isConnected = false;
      this.isConnecting = false;

      // Limpar inputNode
      if (inputNode) {
        try {
          inputNode.disconnect();
          inputNode.onaudioprocess = null;
        } catch (e) { }
        inputNode = null;
      }

      // Limpar mediaStream
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => {
          try { t.stop(); } catch (e) { }
        });
        mediaStream = null;
      }

      // Limpar outputNode
      if (outputNode) {
        try { outputNode.disconnect(); } catch (e) { }
        outputNode = null;
      }

      // Limpar sources
      sources.forEach((s) => {
        try { s.stop(); } catch (e) { }
      });
      sources.clear();
      nextStartTime = 0;

      // Fechar AudioContexts
      if (inputAudioContext && inputAudioContext.state !== "closed") {
        inputAudioContext.close().catch(() => { });
      }
      if (outputAudioContext && outputAudioContext.state !== "closed") {
        outputAudioContext.close().catch(() => { });
      }

      inputAudioContext = null;
      outputAudioContext = null;

      if (this.session) {
        try { this.session.close?.(); } catch (e) { }
        this.session = null;
      }

      console.log("[LIA] ✅ Hard reset complete");
    } catch (err) {
      console.error("[LIA] ❌ Error in hardReset:", err);
    }
  }

  // ==============================
  // CONNECT
  // ==============================
  async connect(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      console.log("[LIA] 🔌 Connecting to Gemini Live...");

      this.hardReset();
      await new Promise((r) => setTimeout(r, 300));

      this.callbacks.onConnectionStateChange?.("connecting");

      this.validateBrowserSupport();

      const apiKey = await getApiKey();
      this.ai = new GoogleGenAI({ apiKey });

      await this.initializeAudioContexts();

      const liveConfig: any = {
        model: "gemini-2.0-flash-exp",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } }
          },
          systemInstruction: LIA_GEMINI_LIVE_PERSONALITY,
          tools: [
            {
              functionDeclarations: [
                visualToolDeclaration,
                generateMediaToolDeclaration,
                searchToolDeclaration,
                mapToolDeclaration
              ]
            }
          ]
        }
      };

      console.log("[LIA] 📡 Establishing Live API connection...");
      this.session = await this.ai.live.connect(liveConfig);

      console.log("[LIA] ✅ Connected successfully");
      this.isConnected = true;

      this.setupSessionHandlers();
      this.startAudioProcessing();

      this.callbacks.onStatusChange(true);
      this.callbacks.onConnectionStateChange?.("connected");
      this.callbacks.onStartListening?.();

    } catch (error: any) {
      console.error("[LIA] ❌ Connection failed:", error);
      this.callbacks.onError(error?.message || "Failed to connect");
      this.callbacks.onConnectionStateChange?.("error");
      this.hardReset();
    } finally {
      this.isConnecting = false;
    }
  }

  // ==============================
  // SESSION HANDLERS
  // ==============================
  private setupSessionHandlers() {
    if (!this.session) return;

    console.log("[LIA] 🎧 Setting up session handlers...");

    this.session.onmessage = async (message: any) => {
      if (!this.isConnected) return;

      try {
        // ÁUDIO
        const audioData = message?.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (audioData) {
          console.log("[LIA] 🔊 Incoming audio chunk");
          this.playAudioChunk(audioData);
          this.callbacks.onAssistantSpeakingStart?.();
        }

        // TRANSCRIÇÃO DO USUÁRIO
        const userTranscript = message?.serverContent?.userContent?.parts?.[0]?.text;
        if (userTranscript) {
          this.callbacks.onUserTranscription?.(userTranscript);
          this.callbacks.onUserSpeech?.(userTranscript);
        }

        const assistantText = message?.serverContent?.outputTranscription?.text;
        if (assistantText) {
          this.currentTranscript += assistantText;
        }

        if (message?.toolCall) {
          this.handleToolCall(message.toolCall);
        }

        if (message?.serverContent?.turnComplete) {
          if (this.currentTranscript) {
            this.callbacks.onVisualEvent("show_text", { text: this.currentTranscript });
            this.currentTranscript = "";
          }
          this.callbacks.onAgentTalking(false);
          this.callbacks.onAssistantSpeakingEnd?.();
        }

      } catch (err) {
        console.error("[LIA] ❌ Error in message handler:", err);
      }
    };

    this.session.onclose = () => {
      this.callbacks.onStatusChange(false);
      this.callbacks.onConnectionStateChange?.("disconnected");
      this.hardReset();
    };

    this.session.onerror = (error: any) => {
      const msg = error instanceof Error ? error.message : "Live API Error";
      this.callbacks.onError(msg);
      this.callbacks.onConnectionStateChange?.("error");
      this.disconnect();
    };
  }

  // ==============================
  // INITIALIZE AUDIO CONTEXTS
  // ==============================
  private async initializeAudioContexts() {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;

    inputAudioContext = new AC({ sampleRate: 16000 });
    outputAudioContext = new AC({ sampleRate: 24000 });

    outputNode = outputAudioContext.createGain();
    outputNode.connect(outputAudioContext.destination);

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    if (inputAudioContext.state === "suspended") await inputAudioContext.resume();
    if (outputAudioContext.state === "suspended") await outputAudioContext.resume();

    console.log("[LIA] ✅ Microphone ready");
  }

  // ==============================
  // START AUDIO PROCESSING
  // ==============================
  private startAudioProcessing() {
    if (!inputAudioContext || !mediaStream || !this.session) return;

    console.log("[LIA] 🎙️ Starting audio processing...");

    const source = inputAudioContext.createMediaStreamSource(mediaStream);
    inputNode = inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.isProcessingAudio = true;

    inputNode.onaudioprocess = (e) => {
      if (!this.isConnected || !this.session || !this.isProcessingAudio) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // RMS
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks.onAudioVolume(Math.min(rms * 100, 100));

      try {
        const rate = inputAudioContext?.sampleRate || 48000;

        const pcm16 = this.downsampleAndConvertToPCM16(inputData, rate, 16000);
        const base64Audio = this.arrayBufferToBase64(pcm16.buffer);

        // CORREÇÃO FINAL — FORMATO CORRETO DO GEMINI LIVE
        this.session.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
          }
        });

      } catch { }
    };

    source.connect(inputNode);
    inputNode.connect(inputAudioContext.destination);

    console.log("[LIA] ✅ Streaming PCM to Gemini...");
  }

  // ==============================
  // TOOL CALL
  // ==============================
  private handleToolCall(toolCall: any) {
    this.callbacks.onAssistantThinking?.();

    const responses =
      (toolCall.functionCalls || []).map((fc: any) => {
        if (fc.name === "update_visual_interface") {
          this.callbacks.onVisualEvent(fc.args.action, fc.args);
        } else {
          this.callbacks.onToolCall(fc.name, fc.args);
        }
        return {
          id: fc.id,
          name: fc.name,
          response: { result: "OK" }
        };
      });

    if (responses.length && this.session) {
      this.session.sendToolResponse({ functionResponses: responses });
    }
  }

  // ==============================
  // PLAY AUDIO CHUNK
  // ==============================
  private playAudioChunk(base64Audio: string) {
    if (!outputAudioContext || !outputNode) return;

    this.callbacks.onAgentTalking(true);

    try {
      const bin = atob(base64Audio);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

      const buffer = outputAudioContext.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = outputAudioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(outputNode);

      if (nextStartTime < outputAudioContext.currentTime)
        nextStartTime = outputAudioContext.currentTime;

      source.start(nextStartTime);
      nextStartTime += buffer.duration;

      sources.add(source);

      source.onended = () => {
        sources.delete(source);
        if (sources.size === 0) {
          this.callbacks.onAgentTalking(false);
          this.callbacks.onAssistantSpeakingEnd?.();
        }
      };

    } catch (err) {
      console.error("[LIA] ❌ Error playing audio:", err);
    }
  }

  // ==============================
  // PCM CONVERSIONS
  // ==============================
  private downsampleAndConvertToPCM16(
    buffer: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Int16Array {
    if (fromSampleRate === toSampleRate) {
      const res = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        const s = Math.max(-1, Math.min(1, buffer[i]));
        res[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return res;
    }

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Int16Array(newLength);
    let offset = 0;
    let pos = 0;

    while (pos < newLength) {
      const nextOffset = Math.round((pos + 1) * ratio);

      let sum = 0;
      let count = 0;

      for (let i = offset; i < nextOffset && i < buffer.length; i++) {
        sum += buffer[i];
        count++;
      }

      const sample = count > 0 ? sum / count : 0;
      const s = Math.max(-1, Math.min(1, sample));

      result[pos++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      offset = nextOffset;
    }

    return result;
  }

  private arrayBufferToBase64(buffer: ArrayBufferLike): string {
    let bin = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  // ==============================
  // SEND TEXT MESSAGE
  // ==============================
  sendTextMessage(text: string) {
    if (!this.session) return;

    this.session.send({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true
      }
    });
  }

  // ==============================
  // DISCONNECT
  // ==============================
  disconnect() {
    if (this.isConnected) {
      this.callbacks.onStopListening?.();
      this.callbacks.onConnectionStateChange?.("disconnected");
      this.callbacks.onStatusChange(false);
    }

    this.hardReset();
  }

  // ==============================
  // VALIDATE BROWSER SUPPORT
  // ==============================
  private validateBrowserSupport() {
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error("Browser does not support getUserMedia");

    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) throw new Error("Browser does not support Web Audio API");
  }
}
