// ======================================================================
// 🎧 LIA Realtime – Fluxo de STT/TTS otimizado para WebRTC (PCM chunks)
// ======================================================================

import { buscarNaWeb } from "../tools/search.js";
import { textToAudio, runGpt4Mini } from "../assistants/gpt4-mini.js";
import fetch from "node-fetch";
import { getOpenAIVoice } from "../config/openai-voices.js";
import {
  loadImportantMemories,
  detectAndSaveMemory,
  saveMessage
} from "../config/supabase.js";
import unifiedContext from "../src/api/context/unifiedContext.js";
import FormData from "form-data";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// ----------------------------------------------------------------------
// Logs
// ----------------------------------------------------------------------

const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

const AUDIO_LOG = path.join(LOGS_DIR, "audio.log");

function appendAudioLog(entry) {
  try {
    fs.appendFileSync(AUDIO_LOG, JSON.stringify(entry) + "\n");
  } catch (e) {
    console.error("log write fail", e);
  }
}

// ----------------------------------------------------------------------
// PCM → WAV converter (para Whisper)
// ----------------------------------------------------------------------

function pcmToWav(pcmBuffer, sampleRate = 48000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = 2;

  const dataSize = pcmBuffer.length;
  const fileSize = 36 + dataSize;

  const wavBuffer = Buffer.alloc(44 + dataSize);
  let pos = 0;

  wavBuffer.write("RIFF", pos); pos += 4;
  wavBuffer.writeUInt32LE(fileSize, pos); pos += 4;
  wavBuffer.write("WAVE", pos); pos += 4;

  wavBuffer.write("fmt ", pos); pos += 4;
  wavBuffer.writeUInt32LE(16, pos); pos += 4;
  wavBuffer.writeUInt16LE(1, pos); pos += 2;
  wavBuffer.writeUInt16LE(numChannels, pos); pos += 2;
  wavBuffer.writeUInt32LE(sampleRate, pos); pos += 4;
  wavBuffer.writeUInt32LE(sampleRate * bytesPerSample * numChannels, pos); pos += 4;
  wavBuffer.writeUInt16LE(bytesPerSample * numChannels, pos); pos += 2;
  wavBuffer.writeUInt16LE(bitsPerSample, pos); pos += 2;

  wavBuffer.write("data", pos); pos += 4;
  wavBuffer.writeUInt32LE(dataSize, pos); pos += 4;

  pcmBuffer.copy(wavBuffer, pos);

  return wavBuffer;
}

// ----------------------------------------------------------------------
// Históricos, locks e caches
// ----------------------------------------------------------------------

const conversationHistories = new Map();
const processingLocks = new Map();
const lastTranscriptionCache = new Map();

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const FIXED_USER_ID = "00000000-0000-0000-0000-000000000001";

// ----------------------------------------------------------------------
// Web Search Tool Definition
// ----------------------------------------------------------------------

const webSearchTool = {
  type: "function",
  function: {
    name: "buscarNaWeb",
    description: "Use esta função para buscar informações atualizadas na web.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" }
      },
      required: ["query"]
    }
  }
};

// ----------------------------------------------------------------------
// Run Chat with Tools (GPT + Web Search + MEMÓRIA)
// AGORA USA UNIFIED CONTEXT (memórias + histórico completo do Supabase)
// ----------------------------------------------------------------------
async function runChatWithTools(conversationId, userMessage) {
  try {
    // Carregar contexto unificado (memórias + histórico completo)
    const context = await unifiedContext.getUnifiedContext(conversationId, FIXED_USER_ID);

    // Usar messages do unified context como base
    const previousMessages = [...context.messages];

    // 1ª chamada GPT com tools
    const firstResponse = await runGpt4Mini(userMessage, {
      conversationId,
      functions: [webSearchTool.function],
      temperature: 0.7,
      maxTokens: 800,
      previousMessages
    });

    // Se quiser usar ferramenta
    if (firstResponse.function_call && firstResponse.function_call.name === "buscarNaWeb") {
      const args = JSON.parse(firstResponse.function_call.arguments || "{}");
      const query = args.query || userMessage;

      console.log(`🔍 Executando busca: "${query}"`);
      const searchResults = await buscarNaWeb(query);

      // Adicionar contexto da busca
      const searchContext = [
        ...previousMessages,
        { role: "user", content: userMessage },
        {
          role: "assistant",
          content: null,
          function_call: firstResponse.function_call
        },
        {
          role: "function",
          name: "buscarNaWeb",
          content: searchResults
        }
      ];

      const secondResponse = await runGpt4Mini(
        `Com base nos resultados da busca, responda ao usuário:\n\n${userMessage}\n\nResultados:\n${searchResults}`,
        {
          conversationId,
          temperature: 0.7,
          maxTokens: 800,
          previousMessages: searchContext
        }
      );

      return secondResponse.text;
    }

    // Sem tool: apenas resposta direta
    return firstResponse.text;

  } catch (error) {
    console.error("❌ Erro runChatWithTools:", error);
    return "Desculpe, ocorreu um erro ao processar sua mensagem.";
  }
}

// ----------------------------------------------------------------------
// Setup Realtime (Socket.io) 
// ----------------------------------------------------------------------
export function setupRealtime(io) {
  io.on("connection", socket => {
    console.log("🟢 Cliente conectado:", socket.id);

    let chatAtivo = false;
    socket.audioBuffer = [];
    socket.voicePersonality = "viva";

    // -----------------------------
    // Identidade da conversa
    // -----------------------------
    socket.on("register-conversation", conversationId => {
      socket.conversationId = conversationId;
      socket.join(conversationId);
      console.log("📋 ConversationID registrado:", conversationId);
    });

    // -----------------------------
    // Personalidade da voz
    // -----------------------------
    socket.on("set-voice-personality", p => {
      if (["clara", "viva", "firme"].includes(p)) {
        socket.voicePersonality = p;
        socket.emit("lia-message", `Voz alterada para modo ${p}.`);
      }
    });

    // -----------------------------
    // Chat texto
    // -----------------------------
    socket.on("text-message", async payload => {
      try {
        let text = "";
        let convId = socket.conversationId;

        if (typeof payload === "string") text = payload;
        else if (payload && typeof payload === "object") {
          text = payload.text ?? "";
          if (payload.conversationId) {
            convId = payload.conversationId;
            socket.conversationId = convId;
          }
        }

        if (!text.trim()) return;

        // Salvar mensagem + detectar memória
        await saveMessage(convId, "user", text, "text");
        const memories = await detectAndSaveMemory(text, FIXED_USER_ID);

        // Notificar frontend sobre memórias salvas
        if (memories && memories.length > 0) {
          memories.forEach(mem => {
            socket.emit("memory-saved", mem);
          });
        }

        socket.emit("lia-typing");
        await wait(300);

        const resposta = await runChatWithTools(convId, text);

        socket.emit("lia-stop-typing");
        socket.emit("lia-message", resposta);

        await saveMessage(convId, "assistant", resposta, "text");

      } catch (err) {
        console.error("text-message error", err);
        socket.emit("lia-message", "Erro ao processar.");
      }
    });

    // ------------------------------------------------------------------
    // WebRTC: recebendo chunks PCM
    // ------------------------------------------------------------------

    socket.on("audio-chunk", ({ conversationId, chunk }) => {
      try {
        if (!chunk) return;
        if (conversationId && !socket.conversationId)
          socket.conversationId = conversationId;

        socket.audioBuffer.push(Buffer.from(chunk));
      } catch (err) {
        console.error("Erro audio-chunk:", err);
      }
    });

    // ------------------------------------------------------------------
    // WebRTC: fim da captura do cliente
    // ------------------------------------------------------------------

    socket.on("audio-end", async ({ conversationId }) => {
      const convId = conversationId || socket.conversationId;
      console.log("🎤 PROCESSANDO ÁUDIO via WebRTC");

      if (processingLocks.get(convId)) {
        console.log("⚠️ Já processando áudio, ignorado.");
        appendAudioLog({ time: Date.now(), conversationId: convId, event: "audio-end-ignored" });
        return;
      }

      processingLocks.set(convId, true);

      try {
        if (!socket.audioBuffer || socket.audioBuffer.length === 0) {
          socket.emit("lia-message", "Áudio vazio.");
          return;
        }

        const fullBuffer = Buffer.concat(socket.audioBuffer);
        socket.audioBuffer = [];

        appendAudioLog({
          time: Date.now(),
          conversationId: convId,
          event: "audio-end-received",
          bytes: fullBuffer.length
        });

        if (fullBuffer.length < 10000) {
          socket.emit("lia-message", "Áudio muito curto.");
          return;
        }

        // Ack imediato
        socket.emit("audio-ack", { conversationId: convId });

        // WAV para Whisper
        const wavBuffer = pcmToWav(fullBuffer, 48000);

        const formData = new FormData();
        formData.append("file", wavBuffer, { filename: "audio.wav", contentType: "audio/wav" });
        formData.append("model", "whisper-1");
        formData.append("language", "pt");

        const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            ...formData.getHeaders()
          },
          body: formData
        });

        const data = await resp.json();
        appendAudioLog({
          time: Date.now(),
          conversationId: convId,
          event: "whisper-response",
          data
        });

        if (!data?.text || !data.text.trim()) {
          socket.emit("lia-message", "Não entendi o áudio.");
          return;
        }

        const texto = data.text.trim();
        console.log(`🔊 Transcrição: "${texto}"`);

        // Salvar mensagem + memória
        await saveMessage(convId, "user", texto, "voice");
        const memories = await detectAndSaveMemory(texto, FIXED_USER_ID);

        // Notificar frontend sobre memórias salvas
        if (memories && memories.length > 0) {
          memories.forEach(mem => {
            socket.emit("memory-saved", mem);
          });
        }

        // Deduplicação
        if (lastTranscriptionCache.get(convId) === texto) {
          const resposta = await runChatWithTools(convId, texto);
          socket.emit("lia-message", resposta);
          processingLocks.set(convId, false);
          return;
        }

        lastTranscriptionCache.set(convId, texto);

        const respostaTexto = await runChatWithTools(convId, texto);

        await saveMessage(convId, "assistant", respostaTexto, "voice");

        // TTS - map personality to OpenAI voice
        try {
          const openaiVoice = getOpenAIVoice(socket.voicePersonality);
          const audioResp = await textToAudio(respostaTexto, openaiVoice, { conversationId: convId });

          if (!audioResp) {
            socket.emit("lia-message", respostaTexto);
            return;
          }

          socket.emit("audio-response", {
            audio: Array.from(audioResp),
            text: respostaTexto
          });

          console.log("✅ Resposta enviada");

        } catch (ttsErr) {
          console.error("Erro TTS:", ttsErr);
          socket.emit("lia-message", respostaTexto);
        }

      } catch (err) {
        console.error("Erro no audio-end:", err);
        socket.emit("lia-message", "Erro ao processar áudio.");
      } finally {
        processingLocks.set(convId, false);
      }
    });

    // ------------------------------------------------------------------
    // Disconnect
    // ------------------------------------------------------------------
    socket.on("disconnect", () => {
      console.log("🔴 Cliente desconectado:", socket.id);
      if (socket.conversationId) {
        conversationHistories.delete(socket.conversationId);
        processingLocks.delete(socket.conversationId);
        lastTranscriptionCache.delete(socket.conversationId);
      }
    });

  });
}
