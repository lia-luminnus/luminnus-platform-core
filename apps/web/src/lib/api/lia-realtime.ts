/**
 * Módulo de integração de voz em tempo real com LIA via WebRTC
 * Usa OpenAI Realtime API através do servidor Render
 */

interface RealtimeCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onAudioReceived?: (audio: ArrayBuffer) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

// Estado da sessão
let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let audioElement: HTMLAudioElement | null = null;
let mediaStream: MediaStream | null = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000;

let callbacks: RealtimeCallbacks = {};

/**
 * Cria fila de áudio para reprodução sequencial
 */
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000,
    });
  }

  async addToQueue(audioData: Uint8Array) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      // Converter PCM16 para AudioBuffer
      const int16Array = new Int16Array(audioData.buffer);
      const float32Array = new Float32Array(int16Array.length);
      
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 0x8000;
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('[AudioQueue] Erro ao reproduzir:', error);
      this.playNext();
    }
  }

  clear() {
    this.queue = [];
    this.isPlaying = false;
  }
}

let audioQueue: AudioQueue | null = null;

/**
 * Inicia sessão de voz em tempo real
 */
export async function startRealtimeSession(
  userCallbacks?: RealtimeCallbacks
): Promise<void> {
  console.log('[Realtime] Iniciando sessão...');
  
  callbacks = userCallbacks || {};

  try {
    // 1. Obter client_secret do servidor Render
    console.log('[Realtime] Solicitando token de sessão...');
    const sessionResponse = await fetch('https://lia-chat-api.onrender.com/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!sessionResponse.ok) {
      throw new Error(`Erro ao criar sessão: ${sessionResponse.status}`);
    }

    const { client_secret } = await sessionResponse.json();
    console.log('[Realtime] Token obtido com sucesso');

    // 2. Criar AudioContext e fila de áudio
    audioQueue = new AudioQueue();

    // 3. Obter acesso ao microfone
    console.log('[Realtime] Solicitando acesso ao microfone...');
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 24000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    console.log('[Realtime] Microfone ativado');

    // 4. Criar PeerConnection
    peerConnection = new RTCPeerConnection();

    // 5. Adicionar track de áudio
    const audioTrack = mediaStream.getAudioTracks()[0];
    peerConnection.addTrack(audioTrack, mediaStream);
    console.log('[Realtime] Track de áudio adicionado');

    // 6. Configurar recepção de áudio remoto
    peerConnection.ontrack = (event) => {
      console.log('[Realtime] Recebendo track de áudio remoto');
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
      }
      audioElement.srcObject = event.streams[0];
    };

    // 7. Criar Data Channel para mensagens
    dataChannel = peerConnection.createDataChannel('oai-events');
    
    dataChannel.onopen = () => {
      console.log('[Realtime] Data Channel aberto');
      isConnected = true;
      reconnectAttempts = 0;
      callbacks.onConnected?.();

      // Configurar sessão após data channel abrir
      const sessionUpdate = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: 'Você é a LIA, uma assistente virtual da Luminnus. Seja clara, simpática e objetiva.',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000,
          },
          temperature: 0.8,
        },
      };
      dataChannel?.send(JSON.stringify(sessionUpdate));
      console.log('[Realtime] Configuração de sessão enviada');
    };

    dataChannel.onclose = () => {
      console.log('[Realtime] Data Channel fechado');
      isConnected = false;
      callbacks.onDisconnected?.();
      
      // Tentar reconectar
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`[Realtime] Tentando reconectar (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => startRealtimeSession(callbacks), RECONNECT_DELAY);
      }
    };

    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Realtime] Mensagem recebida:', message.type);

        // Áudio delta (chunks de áudio)
        if (message.type === 'response.audio.delta') {
          const audioData = atob(message.delta);
          const bytes = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            bytes[i] = audioData.charCodeAt(i);
          }
          audioQueue?.addToQueue(bytes);
          callbacks.onAudioReceived?.(bytes.buffer);
        }

        // Transcrição
        if (message.type === 'conversation.item.input_audio_transcription.completed') {
          callbacks.onTranscript?.(message.transcript, true);
        }
        
        if (message.type === 'input_audio_buffer.speech_started') {
          callbacks.onTranscript?.('Ouvindo...', false);
        }

        // Session update confirmado
        if (message.type === 'session.updated') {
          console.log('[Realtime] Sessão configurada');
        }

      } catch (error) {
        console.error('[Realtime] Erro ao processar mensagem:', error);
      }
    };

    // 8. Criar oferta SDP
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log('[Realtime] Oferta SDP criada');

    // 9. Enviar oferta para o proxy backend no Render
    console.log('[Realtime] Enviando SDP via proxy backend...');
    const sdpResponse = await fetch(
      'https://lia-chat-api.onrender.com/proxy-realtime',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: offer.sdp,
          client_secret: client_secret,
        }),
      }
    );

    if (!sdpResponse.ok) {
      const errorData = await sdpResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(`Erro ao conectar WebRTC: ${sdpResponse.status} - ${errorData.error || errorData.details || ''}`);
    }

    const answerSdp = await sdpResponse.text();
    console.log('[Realtime] SDP de resposta recebido via proxy');

    // 10. Aplicar resposta SDP
    await peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp,
    });
    console.log('[Realtime] Conexão WebRTC estabelecida!');

  } catch (error) {
    console.error('[Realtime] Erro ao iniciar sessão:', error);
    callbacks.onError?.(error instanceof Error ? error.message : 'Erro desconhecido');
    await stopRealtimeSession();
    throw error;
  }
}

/**
 * Para a sessão de voz
 */
export async function stopRealtimeSession(): Promise<void> {
  console.log('[Realtime] Parando sessão...');

  isConnected = false;

  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  if (audioElement) {
    audioElement.pause();
    audioElement.srcObject = null;
    audioElement = null;
  }

  if (audioQueue) {
    audioQueue.clear();
    audioQueue = null;
  }

  console.log('[Realtime] Sessão encerrada');
  callbacks.onDisconnected?.();
}

/**
 * Envia texto para a LIA (modo híbrido)
 */
export function sendUserText(text: string): void {
  if (!dataChannel || !isConnected) {
    console.warn('[Realtime] Data channel não está conectado');
    return;
  }

  const message = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text,
        },
      ],
    },
  };

  dataChannel.send(JSON.stringify(message));
  dataChannel.send(JSON.stringify({ type: 'response.create' }));
  console.log('[Realtime] Texto enviado:', text);
}

/**
 * Verifica se está conectado
 */
export function isRealtimeConnected(): boolean {
  return isConnected;
}
