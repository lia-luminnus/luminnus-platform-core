// ======================================================================
// 🎙️ LIA WebRTC Realtime Voice Client — MODO CHATGPT VOICE RELAY
// VERSÃO AJUSTADA — Realtime APENAS transcreve e toca áudio do backend
// ======================================================================

class RealtimeVoiceClient {
    constructor({ conversationId, onTranscript, onResponse, onDebug }) {
        this.conversationId = conversationId;
        this.onTranscript = onTranscript || (() => { });
        this.onResponse = onResponse || (() => { });
        this.onDebug = onDebug || console.log;

        this.peerConnection = null;
        this.dataChannel = null;
        this.localStream = null;
        this.ephemeralToken = null;
        this.waitingBackendResponse = false;
    }

    async loadSessionConfig() {
        try {
            const response = await fetch(
                `/api/session-config?conversationId=${this.conversationId}`
            );
            if (!response.ok) return null;

            const data = await response.json();

            return {
                systemInstruction: data.systemInstruction || "",
                messages: Array.isArray(data.messages) ? data.messages : []
            };
        } catch (error) {
            console.error("❌ Erro ao carregar session config:", error);
            return { systemInstruction: "", messages: [] };
        }
    }

    async start() {
        try {
            this.onDebug("🚀 Iniciando Realtime Voice...");

            const tokenResp = await fetch("/webrtc/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId: this.conversationId })
            });

            const tokenData = await tokenResp.json();
            if (!tokenData.success || !tokenData.token) {
                throw new Error("Token efêmero inválido");
            }

            this.ephemeralToken = tokenData.token;
            this.onDebug("🔑 Token efêmero obtido");

            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            this.onDebug("🎤 Microfone capturado");

            this.peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });

            this.localStream
                .getTracks()
                .forEach(track => this.peerConnection.addTrack(track, this.localStream));

            const remoteAudio = document.createElement("audio");
            remoteAudio.autoplay = true;
            document.body.appendChild(remoteAudio);

            this.peerConnection.ontrack = event => {
                this.onDebug("🔊 Áudio remoto recebido");
                remoteAudio.srcObject = event.streams[0];
            };

            this.dataChannel = this.peerConnection.createDataChannel("oai-events");
            this.setupDataChannel();

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            this.onDebug("📝 SDP Offer criado");

            const resp = await fetch("https://api.openai.com/v1/realtime", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.ephemeralToken}`,
                    "Content-Type": "application/sdp"
                },
                body: offer.sdp
            });

            const answer = await resp.text();
            await this.peerConnection.setRemoteDescription({
                type: "answer",
                sdp: answer
            });

            this.onDebug("🎉 Conexão WebRTC estabelecida!");
        } catch (error) {
            this.onDebug("❌ Erro ao iniciar voz: " + error.message);
            throw error;
        }
    }

    setupDataChannel() {
        this.dataChannel.onopen = async () => {
            this.onDebug("📨 DataChannel aberto");

            const config = await this.loadSessionConfig();

            if (!config) {
                this.onDebug("⚠️ Não foi possível carregar o contexto");
                return;
            }

            // ⚠️ Realtime só transcreve – respostas vêm do backend
            this.dataChannel.send(
                JSON.stringify({
                    type: "session.update",
                    session: {
                        modalities: ["text", "audio"],
                        instructions:
                            "Você é um transcritor. Apenas transcreva o áudio recebido. Não responda, não converse, não gere saída de texto ou áudio. Toda resposta será fornecida externamente.",
                        voice: "shimmer",
                        input_audio_format: "pcm16",
                        output_audio_format: "pcm16",
                        input_audio_transcription: { model: "whisper-1" },
                        // ✅ VAD ATIVO para gerar transcrição automática
                        turn_detection: {
                            type: "server_vad",
                            threshold: 0.6,
                            prefix_padding_ms: 500,
                            silence_duration_ms: 700
                        }
                    }
                })
            );

            // Histórico no formato correto (API 2025)
            if (Array.isArray(config.messages) && config.messages.length > 0) {
                config.messages.forEach(msg => {
                    if (!msg?.role || !msg?.content) return;

                    this.dataChannel.send(
                        JSON.stringify({
                            type: "conversation.item.create",
                            item: {
                                type: "message",
                                role: msg.role,
                                content: [{ type: "text", text: msg.content }]
                            }
                        })
                    );
                });

                this.onDebug("📚 Histórico carregado (formato API 2025)");
            }

            this.onDebug("✅ Sessão Realtime criada");
        };

        this.dataChannel.onmessage = event => {
            try {
                const message = JSON.parse(event.data);
                this.handleRealtimeEvent(message);
            } catch (e) {
                console.error("Erro ao interpretar evento:", e);
            }
        };

        this.dataChannel.onerror = error => {
            this.onDebug("❌ Erro no DataChannel:", error);
        };

        this.dataChannel.onclose = () => {
            this.onDebug("📪 DataChannel fechado");
        };
    }

    handleRealtimeEvent(event) {
        switch (event.type) {
            case "session.created":
                this.onDebug("✅ Sessão criada");
                break;

            case "session.updated":
                this.onDebug("🔄 Sessão atualizada");
                break;

            // Eventos de áudio (normais da API, silenciosos)
            case "output_audio_buffer.started":
            case "output_audio_buffer.stopped":
            case "output_audio_buffer.speech_started":
            case "output_audio_buffer.speech_stopped":
            case "output_audio_buffer.cleared":
                break;

            case "error":
                this.onDebug(
                    "❌ Erro Realtime: " +
                    (event.error?.message || JSON.stringify(event.error))
                );
                break;

            // ✅ Transcrição final da fala
            case "conversation.item.input_audio_transcription.completed": {
                const transcript = event.transcript;

                if (!transcript?.trim()) {
                    this.onDebug("⚠️ Transcrição vazia ignorada");
                    break;
                }

                this.onDebug("📝 Transcrição:", transcript);
                this.onTranscript(transcript);
                this.saveMessage("user", transcript);

                // Modo ChatGPT Voice Relay → sempre manda pro backend
                this.sendToBackend(transcript);
                break;
            }

            // ❌ Ignorar completamente saídas do Realtime
            case "response.created":
            case "response.done":
            case "response.output_item.added":
            case "response.output_item.done":
            case "response.content_part.added":
            case "response.content_part.done":
            case "response.text.delta":
            case "response.text.done":
            case "response.audio.delta":
            case "response.audio.done":
            case "response.audio_transcript.delta":
            case "response.audio_transcript.done":
            case "response.function_call_arguments.delta":
            case "response.function_call_arguments.done":
                break;

            // Eventos verbosos
            case "input_audio_buffer.speech_started":
            case "input_audio_buffer.speech_stopped":
            case "input_audio_buffer.committed":
            case "input_audio_buffer.cleared":
            case "conversation.item.created":
            case "conversation.item.truncated":
            case "rate_limits.updated":
                break;

            default:
                if (
                    !event.type.startsWith("input_audio_buffer.") &&
                    !event.type.startsWith("response.") &&
                    !event.type.startsWith("output_audio_buffer.") &&
                    !event.type.startsWith("conversation.") &&
                    !event.type.startsWith("rate_limits")
                ) {
                    console.log("📨 Evento desconhecido:", event.type, event);
                }
                break;
        }
    }

    // Bloqueia respostas do Realtime enquanto backend está falando
    disableRealtimeResponses() {
        if (!this.dataChannel || this.dataChannel.readyState !== "open") return;

        try {
            this.dataChannel.send(JSON.stringify({ type: "response.cancel" }));

            this.dataChannel.send(
                JSON.stringify({
                    type: "session.update",
                    session: {
                        turn_detection: null,
                        instructions:
                            "Você é um transcritor. Não responda, não converse, não gere nada."
                    }
                })
            );

            this.onDebug("🔒 Realtime BLOQUEADO (backend ativo)");
        } catch (e) {
            console.error("Erro ao bloquear Realtime:", e);
        }
    }

    // Reabilita VAD para próxima fala
    enableRealtimeResponses() {
        if (!this.dataChannel || this.dataChannel.readyState !== "open") return;

        try {
            this.dataChannel.send(
                JSON.stringify({
                    type: "session.update",
                    session: {
                        modalities: ["text", "audio"],
                        instructions:
                            "Você é um transcritor. Apenas transcreva o áudio recebido. Não responda, não converse, não gere saída de texto ou áudio. Toda resposta será fornecida externamente.",
                        input_audio_transcription: { model: "whisper-1" },
                        turn_detection: {
                            type: "server_vad",
                            threshold: 0.6,
                            prefix_padding_ms: 500,
                            silence_duration_ms: 700
                        }
                    }
                })
            );

            this.onDebug("🔓 Realtime pronto para próxima transcrição");
        } catch (e) {
            console.error("Erro ao reabilitar Realtime:", e);
        }
    }

    async sendToBackend(transcript) {
        this.waitingBackendResponse = true;
        this.disableRealtimeResponses();

        try {
            const response = await fetch("/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: transcript,
                    conversationId: this.conversationId
                })
            });

            const data = await response.json();

            if (!data.reply) {
                this.onDebug("⚠️ Backend retornou vazio");
                this.enableRealtimeResponses();
                return;
            }

            this.onResponse({ text: data.reply });
            this.saveMessage("assistant", data.reply);

            if (data.audio) {
                await this.playBackendAudio(data.audio);
            } else {
                this.enableRealtimeResponses();
            }
        } catch (error) {
            console.error("❌ Erro no backend:", error);
            this.onResponse({
                text: "Desculpe, tive um problema ao processar sua mensagem."
            });
            this.enableRealtimeResponses();
        } finally {
            this.waitingBackendResponse = false;
        }
    }

    async playBackendAudio(audioBase64) {
        try {
            this.onDebug("🔊 Tocando áudio backend...");

            const audioData = atob(audioBase64);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);

            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }

            const blob = new Blob([uint8Array], { type: "audio/mpeg" });
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.onDebug("✅ Áudio concluído");
                this.enableRealtimeResponses();
            };

            audio.onerror = error => {
                console.error("❌ Erro ao tocar áudio:", error);
                URL.revokeObjectURL(audioUrl);
                this.enableRealtimeResponses();
            };

            await audio.play();
        } catch (error) {
            console.error("❌ Erro ao tocar áudio:", error);
            this.enableRealtimeResponses();
        }
    }

    async saveMessage(role, content) {
        if (!content?.trim()) return;

        try {
            await fetch("/api/history/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversationId: this.conversationId,
                    role,
                    content,
                    origin: "voice"
                })
            });
        } catch (err) {
            console.error("❌ Erro ao salvar histórico:", err);
        }
    }

    stop() {
        try {
            if (this.dataChannel) this.dataChannel.close();
            if (this.peerConnection) this.peerConnection.close();
            if (this.localStream) {
                this.localStream.getTracks().forEach(t => t.stop());
            }
        } catch (e) {
            console.error("Erro ao parar cliente:", e);
        }
    }
}

window.RealtimeVoiceClient = RealtimeVoiceClient;
