// ======================================================================
// 🎧 LIA Realtime – Fluxo de STT/TTS otimizado para WebRTC (PCM chunks)
// ======================================================================

import { buscarNaWeb } from "../search/web-search.js";
import { textToAudio } from "../assistants/gpt4-mini.js";
import { runGemini } from "../assistants/gemini.js";
import fetch from "node-fetch";
import { getOpenAIVoice } from "../config/openai-voices.js";
import FormData from "form-data";
import dotenv from "dotenv";
import fs from "fs";
import { setupMultimodalEvents } from "./multimodal-events.js";
import path from "path";
import { OutputContracts } from "../services/outputContracts.js";
import { getLiaGreeting } from "@luminnus/lia-runtime";
import { getUserProfile } from "../config/supabase.js";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

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

function pcmToWav(pcmBuffer, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8; // 2 bytes

  const dataSize = pcmBuffer.length;
  const byteRate = sampleRate * numChannels * bytesPerSample; // 32000 para 16kHz mono 16-bit
  const blockAlign = numChannels * bytesPerSample; // 2

  const wavBuffer = Buffer.alloc(44 + dataSize);
  let pos = 0;

  // RIFF chunk descriptor
  wavBuffer.write("RIFF", pos); pos += 4;
  wavBuffer.writeUInt32LE(36 + dataSize, pos); pos += 4;  // ChunkSize = 36 + SubChunk2Size
  wavBuffer.write("WAVE", pos); pos += 4;

  // fmt sub-chunk
  wavBuffer.write("fmt ", pos); pos += 4;
  wavBuffer.writeUInt32LE(16, pos); pos += 4;              // Subchunk1Size (16 for PCM)
  wavBuffer.writeUInt16LE(1, pos); pos += 2;               // AudioFormat (1 for PCM)
  wavBuffer.writeUInt16LE(numChannels, pos); pos += 2;     // NumChannels
  wavBuffer.writeUInt32LE(sampleRate, pos); pos += 4;      // SampleRate
  wavBuffer.writeUInt32LE(byteRate, pos); pos += 4;        // ByteRate
  wavBuffer.writeUInt16LE(blockAlign, pos); pos += 2;      // BlockAlign
  wavBuffer.writeUInt16LE(bitsPerSample, pos); pos += 2;   // BitsPerSample

  // data sub-chunk
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

// ----------------------------------------------------------------------
// Substituir descrições de emoji por emojis REAIS no chat
// "Sorriso!" -> 😊, "Rosto piscando" -> 😉, etc.
// ----------------------------------------------------------------------
function replaceEmojiDescriptions(text) {
  if (typeof text !== 'string') return text;

  const replacements = [
    // Sorriso e variações
    [/\bSorriso!?\b/gi, '😊'],
    [/\bsorrindo\b/gi, '😊'],
    [/\bcarinha sorrindo\b/gi, '😊'],
    [/\brosto sorrindo\b/gi, '😊'],
    [/\bsmiling face\b/gi, '😊'],
    // Piscando e variações
    [/\bRosto piscando\b/gi, '😉'],
    [/\bpiscando\b/gi, '😉'],
    [/\bwinking face\b/gi, '😉'],
    [/\bcarinha piscando\b/gi, '😉'],
    // Risada
    [/\brisada\b/gi, '😄'],
    [/\brindo\b/gi, '😄'],
    [/\bgargalhada\b/gi, '😂'],
    // Pensando
    [/\bpensando\b/gi, '🤔'],
    [/\brosto pensativo\b/gi, '🤔'],
    // Outros
    [/\bpolegar para cima\b/gi, '👍'],
    [/\bcoração\b/gi, '❤️'],
    [/\bfoguinho\b/gi, '🔥'],
    [/\bfogo\b/gi, '🔥'],
    [/\bestrela\b/gi, '⭐'],
    [/\bestrelinhas\b/gi, '✨'],
    [/\bfoguete\b/gi, '🚀'],
    [/\babracinho\b/gi, '🤗'],
    [/\babraço\b/gi, '🤗'],
  ];

  let cleaned = text;
  replacements.forEach(([pattern, emoji]) => {
    cleaned = cleaned.replace(pattern, emoji);
  });

  // Limpar espaços duplicados (preservando quebras de linha)
  return cleaned.replace(/[ \t]{2,}/g, ' ');
}

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
// Run Chat with Tools (GPT + Web Search + Memórias)
// ----------------------------------------------------------------------

import { loadImportantMemories, detectAndSaveMemory } from "../config/supabase.js";
import { LIA_PERSONALITY_SHORT } from "../personality/lia-personality.js";

/**
 * v8.0: Execução com retry automático e idempotência.
 */
async function runChatWithTools(conversationId, userMessage, contextOptions = {}, origin = "voice", clientMessageId = null) {
  let attempt = 0;
  const maxAttempts = 3;
  const backoff = 1000;

  while (attempt < maxAttempts) {
    try {
      const userId = contextOptions.userId;
      const tenantId = contextOptions.tenantId || userId;

      if (!userId) {
        console.warn("⚠️ [runChatWithTools] Chamado sem userId! Usando ID padrão.");
      }

      console.log(`🤖 [runChatWithTools] Conv: ${conversationId} | User: ${userId} | Origin: ${origin}`);

      // v1.1.2: Carregar contexto completo via MemoryService
      const { getContext, updateSummaryIfNeeded } = await import("../services/memoryService.js");
      const { saveMessage } = await import("../config/supabase.js");

      const context = await getContext(conversationId, userId, userMessage, contextOptions.userLocation);

      // v7.0: Idempotência Enterprise com UUID real
      const responseMessageId = clientMessageId ? crypto.randomUUID() : crypto.randomUUID();

      // Personalidade v4.0 Centralizada (SSOT)
      const admin_diagnostic_mode = contextOptions.admin_diagnostic_mode === true;
      const basePersona = getLiaGreeting(admin_diagnostic_mode);

      // Build messages array with system context + history + CURRENT message
      // CRITICAL FIX: Include context.systemInstruction which contains ALL MEMORIES!
      const messages = [
        { role: "system", content: basePersona + '\n\n' + (context.systemInstruction || '') + (contextOptions.userLocation ? `\n\n[Localização Atual: ${contextOptions.userLocation}]` : '') },
        ...context.history.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })),
        // CRITICAL: Incluir a mensagem ATUAL do usuário
        { role: "user", content: userMessage }
      ];

      // =====================================================
      // OUTPUT GOVERNANCE v1.3 - Enriquecer prompt
      // =====================================================
      const { OutputGovernance } = await import("../services/outputGovernance.js");
      const enrichedPrompt = OutputGovernance.enrichPrompt(userMessage, [], contextOptions.userPlan);

      console.log(`🤖 [runChatWithTools] Executando com prompt enriquecido`);

      // =====================================================
      // TOOL CENTRALIZATION v1.0
      // =====================================================
      const { ToolService } = await import("../services/toolService.js");
      const functions = ToolService.getTools();

      // v7.0: PROTOCOLO LIA EXECUTA - Gemini 2.0 Flash assume o Cérebro Principal
      const geminiResponse = await runGemini(enrichedPrompt, {
        conversationId,
        functions: functions.map(f => f),
        messages,
        temperature: 0.2 // Rigidez para execução de ferramentas
      });

      let finalReply = geminiResponse.text;
      let turnCalls = geminiResponse.function_calls || [];

      // v4.0 Ciclo Agêntico para Voz
      let turnCount = 0;
      const MAX_TURNS = 3;
      let finalDashboardAction = null;
      let finalImagePayload = null;
      let forceFinalReplyFromTools = null;

      while (turnCalls.length > 0 && turnCount < MAX_TURNS) {
        turnCount++;
        console.log(`🔄 [Realtime] Turno ${turnCount}: ${turnCalls.length} ferramentas`);

        let criticalActionHandled = false;

        for (const call of turnCalls) {
          console.log(`🔧 [Realtime] Executando: ${call.name}`);
          const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments || "{}") : call.arguments;

          let function_result;
          try {
            function_result = await ToolService.execute(call.name, args, {
              userId,
              tenantId,
              userRole: contextOptions.userRole,
              userLocation: contextOptions.userLocation,
              userPrompt: userMessage
            });

            if (!function_result || function_result.error) {
              throw new Error(function_result?.error || 'Retorno vazio da ferramenta');
            }
          } catch (toolError) {
            console.error(`❌ [Realtime] Erro na ferramenta ${call.name}:`, toolError.message);
            // ANTI-LOOP GUARDRAIL: falha direta sem travar em A/B
            finalReply = `Falhou ao executar ${call.name}. Motivo: ${toolError.message}. Vou tentar uma alternativa automática na próxima tentativa.`;
            turnCalls = []; // Abortar loop agêntico
            break;
          }

          // TRATAMENTO CRÍTICO: ações reais devem responder com retorno factual da ferramenta
          if (["sendGmail", "createCalendarEvent", "updateCalendarEvent", "deleteCalendarEvent"].includes(call.name)) {
            const toolSuccess = !!function_result?.success;
            const toolMessage = function_result?.message || "";
            const calendarLink = function_result?.link || function_result?.event?.link || "";
            const meetLink = function_result?.meetLink || "";

            if (toolSuccess) {
              const confirmations = [toolMessage];
              if (calendarLink) confirmations.push(`Link do evento: ${calendarLink}`);
              if (meetLink) confirmations.push(`Link do Meet: ${meetLink}`);
              forceFinalReplyFromTools = confirmations.filter(Boolean).join("\n");
            } else {
              forceFinalReplyFromTools = toolMessage || `Não consegui concluir ${call.name} nesta tentativa.`;
            }

            messages.push({ role: "assistant", content: null, function_call: call });
            messages.push({ role: "function", name: call.name, content: JSON.stringify(function_result) });
            turnCalls = [];
            criticalActionHandled = true;
            break;
          }

          // TRATAMENTO: generateImage
          if (call.name === 'generateImage' && function_result?.url) {
            finalImagePayload = {
              type: 'image',
              title: 'Imagem gerada',
              data: {
                url: function_result.url,
                prompt: function_result.prompt || args.prompt,
                alt: function_result.prompt || args.prompt,
                caption: function_result.prompt || args.prompt
              },
              timestamp: Date.now()
            };
            break;
          }

          // TRATAMENTO: Dashboard Actions (Add/Replace/Reorganize)
          if (call.name.startsWith('dashboard') && call.name !== 'dashboardGetSnapshot' && function_result?.action) {
            finalDashboardAction = {
              name: function_result.action,
              arguments: JSON.stringify(function_result.params || {}),
              message: function_result.message
            };
            // Historico
            messages.push({ role: "assistant", content: null, function_call: call });
            messages.push({ role: "function", name: call.name, content: JSON.stringify(function_result) });
            break;
          }

          // TRATAMENTO ESPECIAL: Gmail Tools (Preservar links formatados)
          // v4.9 - Previne que o segundo call do GPT reformate e perca os URLs
          if ((call.name === 'listGmailMessages' || call.name === 'searchGmail') && function_result?.message) {
            console.log(`📧 [Realtime] Gmail tool detectado - usando resposta pré-formatada`);
            finalReply = function_result.message; // Usar a mensagem já formatada com links
            turnCalls = []; // Encerrar o loop agêntico - não precisa de segundo call
            messages.push({ role: "assistant", content: null, function_call: call });
            messages.push({ role: "function", name: call.name, content: JSON.stringify(function_result) });
            break;
          }

          // Historico para o proximo turno
          messages.push({ role: "assistant", content: null, function_call: call });
          messages.push({ role: "function", name: call.name, content: JSON.stringify(function_result) });
        }

        if (criticalActionHandled) {
          if (forceFinalReplyFromTools) finalReply = forceFinalReplyFromTools;
          break;
        }

        if (finalImagePayload || finalDashboardAction) break;

        // Chama AI de novo com o mesmo provedor para manter consistência entre chat e voz
        const nextCall = await runGemini("Continue a conversa com base nos resultados.", {
          conversationId,
          temperature: 0.3,
          messages
        });

        finalReply = nextCall.text || finalReply;
        turnCalls = nextCall.function_calls || (nextCall.function_call ? [nextCall.function_call] : []);
      }

      if (forceFinalReplyFromTools) {
        finalReply = forceFinalReplyFromTools;
      }

      // v6.0: Stable response ID based on client ID (if available) for assistant idempotency (ALREADY DECLARED)

      // Retornos Especiais
      if (finalImagePayload) {
        const naturalReply = `Gerei a imagem que você pediu sobre ${finalImagePayload.data.prompt}.`;

        // v6.0: Idempotência nas mensagens automáticas
        await saveMessage(conversationId, "user", userMessage, origin, [], clientMessageId);
        await saveMessage(conversationId, "assistant", naturalReply, origin, finalImagePayload.data?.url ? [{ name: 'Imagem gerada', type: 'image', url: finalImagePayload.data.url }] : [], responseMessageId);

        return {
          id: responseMessageId, // v6.0: Retornar ID para o frontend
          voiceScript: naturalReply,
          chatPayload: JSON.stringify(finalImagePayload),
          dynamicContent: finalImagePayload,
          text: JSON.stringify(finalImagePayload),
          mode: "voice",
          isStructured: true
        };
      }

      if (finalDashboardAction) {
        const naturalReply = finalDashboardAction.message || "Dashboard atualizado!";

        // v6.0: Idempotência nas mensagens de ação
        await saveMessage(conversationId, "user", userMessage, origin, [], clientMessageId);
        await saveMessage(conversationId, "assistant", naturalReply, origin, [], responseMessageId);

        return {
          id: responseMessageId, // v6.0: Retornar ID para o frontend
          voiceScript: naturalReply,
          chatPayload: naturalReply,
          text: naturalReply,
          mode: "voice",
          action: { name: finalDashboardAction.name, arguments: finalDashboardAction.arguments }
        };
      }



      // =====================================================
      // OUTPUT GOVERNANCE v1.3 - LiveMode (Voice + Chat)
      // =====================================================
      let voiceScript = finalReply;
      let chatPayload = finalReply;

      try {
        const { OutputGovernance } = await import("../services/outputGovernance.js");
        const { OpenAIService } = await import("../services/openAIService.js");

        const governed = await OutputGovernance.forLive(
          finalReply,
          userMessage,
          async (retryPrompt) => {
            const retryResult = await runGemini(retryPrompt, { temperature: 0.3 });
            return retryResult.text;
          },
          contextOptions.userPlan // v1.3.5: Suporte a permissões no LiveMode
        );

        voiceScript = governed.voiceScript;
        chatPayload = governed.chatPayload;

        if (governed.audit.retryAttempts > 0 || governed.audit.secretsDetected) {
          console.log(`📋 [OutputGovernance] LiveMode: ${governed.audit.contractType}, Retries: ${governed.audit.retryAttempts}`);
        }

        // Se detectou segredos, avisar na voz
        if (governed.audit.secretsDetected && !voiceScript.includes('sensíveis')) {
          voiceScript = 'Atenção: removi alguns dados sensíveis por segurança. ' + voiceScript;
        }
      } catch (govError) {
        console.warn('⚠️ [OutputGovernance] Erro na governança LiveMode:', govError);
      }

      // v1.1.2: Persistir mensagens no banco (usa chatPayload, não voiceScript curto)
      // v6.0: Idempotência Enterprise (responseMessageId ALREADY DECLARED)

      await saveMessage(conversationId, "user", userMessage, origin, [], clientMessageId);
      await saveMessage(conversationId, "assistant", chatPayload, origin, [], responseMessageId);
      console.log(`💾 Mensagem persistida (${origin}) para conv ${conversationId} | Idempotency Key: ${clientMessageId || 'N/A'}`);

      // v1.2: Disparar atualização de resumo incremental (Enterprise)
      if (typeof updateSummaryIfNeeded === 'function') {
        const totalMsgs = (context.history?.length || 0) + 2;
        updateSummaryIfNeeded(conversationId, totalMsgs);
      }

      // Retornar objeto com voice script separado do payload completo
      return {
        id: responseMessageId, // v6.0: Retornar ID para garantir que o frontend faça o de-dupe
        voiceScript, // Para TTS (curto, falável)
        chatPayload, // Para chat/log (completo)
        text: chatPayload, // FIX: text deve ser o conteúdo completo para a UI
        mode: origin
      };

    } catch (error) {
      attempt++;
      console.error(`❌ [Realtime] Erro runChatWithTools (tentativa ${attempt}/${maxAttempts}):`, error.message);
      if (attempt >= maxAttempts) {
        return "Desculpe, a LIA está passando por dificuldades técnicas agora. Por favor, tente novamente em alguns instantes.";
      }
      await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, attempt)));
    }
  }
}

// ----------------------------------------------------------------------
// Setup Realtime (Socket.io) 
// ----------------------------------------------------------------------
export function setupRealtime(io, ensureSession) {
  io.on("connection", socket => {
    console.log("🟢 Cliente conectado:", socket.id);

    let chatAtivo = false;
    socket.audioBuffer = [];
    socket.chunkCount = 0;
    socket.voicePersonality = "viva";

    // -----------------------------
    // Identidade da conversa
    // -----------------------------
    socket.on("register-conversation", payload => {
      const { conversationId, userId: payloadUserId, tenantId: payloadTenantId, admin_diagnostic_mode } = typeof payload === "string"
        ? { conversationId: payload, userId: null, tenantId: null, admin_diagnostic_mode: false }
        : (payload || {});

      // Contexto já extraído e validado pelo middleware socketAuth
      const auth = socket.data.auth || {};

      // PRIORIDADE: payloadUserId (enviado pelo frontend) se auth.userId for o padrão ou nulo
      const isDefaultDevId = auth.userId === "5d626893-2cdb-4a75-a84e-360713f65026" || auth.userId === "00000000-0000-0000-0000-000000000001";

      socket.conversationId = conversationId || auth.conversationId;
      socket.userId = (isDefaultDevId && payloadUserId) ? payloadUserId : (auth.userId || payloadUserId);
      socket.tenantId = payloadTenantId || auth.tenantId;
      socket.admin_diagnostic_mode = admin_diagnostic_mode || false;

      if (socket.conversationId) socket.join(`conv:${socket.conversationId}`);
      if (socket.tenantId) socket.join(`tenant:${socket.tenantId}`);

      console.log("📋 [Socket] ID Vinculado -> Conv:", socket.conversationId, "| User:", socket.userId, "| Tenant:", socket.tenantId);
    });

    // Setup multimodal events
    setupMultimodalEvents(socket);

    // -----------------------------
    // Personalidade da voz
    // -----------------------------
    socket.on("set-voice-personality", p => {
      if (["clara", "viva", "firme"].includes(p)) {
        socket.voicePersonality = p;
        socket.emit("lia-message", `Voz alterada para modo ${p}.`);
      }
    });

    // ------------------------------------------------------------------
    // Chat texto (Novo Protocolo ACK Transacional)
    // ------------------------------------------------------------------
    async function handleTextMessage(payload) {
      const startTime = Date.now();
      let text = "";
      let convId = socket.conversationId || payload?.conversationId;
      const messageId = payload?.messageId || uuidv4();

      if (typeof payload === "string") text = payload;
      else if (payload && typeof payload === "object") {
        text = payload.text ?? "";
        if (payload.conversationId) {
          convId = payload.conversationId;
          socket.conversationId = convId;
        }
      }

      if (!text.trim()) return;

      // 1. ACK Imediato (Estabilização do Frontend)
      socket.emit("chat:ack", { messageId, conversationId: convId, status: "processing" });

      try {
        socket.emit("lia-typing");

        const auth = socket.data.auth || {};
        const currentUserId = socket.userId || auth.userId;
        const currentTenantId = socket.tenantId || auth.tenantId;

        const session = await ensureSession(currentUserId, convId);
        const profile = await getUserProfile(currentUserId);
        const userPlan = profile?.plan || profile?.plan_level || 'free';
        const userRole = profile?.role || 'client';

        const contextOptions = {
          userId: currentUserId,
          tenantId: currentTenantId,
          userPlan: userPlan,
          userRole: userRole,
          userLocation: session?.userLocation,
          admin_diagnostic_mode: socket.admin_diagnostic_mode
        };

        const resposta = await runChatWithTools(convId, text, contextOptions, "text", messageId);

        if (contextOptions.userId) {
          detectAndSaveMemory(text, contextOptions.userId).catch(e => console.error('⚠️ [Realtime] Erro auto-memória:', e));
        }

        socket.emit("lia-stop-typing");
        const respostaFiltrada = typeof resposta === 'string'
          ? replaceEmojiDescriptions(resposta)
          : (resposta.text ? { ...resposta, text: replaceEmojiDescriptions(resposta.text) } : resposta);

        if (resposta && typeof resposta === 'object') {
          if (resposta.action) socket.emit("lia-dashboard-action", resposta.action);
          if (resposta.table) socket.emit("lia:render-table", resposta.table);
        }

        // 2. Resposta Final (Sucesso)
        socket.emit("chat:reply", {
          messageId,
          conversationId: convId,
          text: (typeof respostaFiltrada === 'string' ? respostaFiltrada : respostaFiltrada.text),
          payload: respostaFiltrada,
          latency: Date.now() - startTime
        });

        // Legado (Compatibilidade) - manter conversationId para render imediato no frontend
        socket.emit("lia-message", {
          text: (typeof respostaFiltrada === 'string' ? respostaFiltrada : respostaFiltrada.text),
          conversationId: convId,
          mode: 'chat',
          payload: respostaFiltrada
        });

      } catch (err) {
        console.error("❌ [Realtime] Erro chat:send:", err);
        socket.emit("chat:reply", { messageId, error: "Erro ao processar.", status: "failed" });
        socket.emit("lia-message", {
          text: "Erro ao processar.",
          conversationId: convId,
          mode: 'chat'
        });
      }
    }

    socket.on("chat:send", handleTextMessage);
    socket.on("text-message", handleTextMessage); // Legado

    // ------------------------------------------------------------------
    // WebRTC: recebendo chunks PCM
    // ------------------------------------------------------------------

    socket.on("audio-chunk", ({ conversationId, chunk }) => {
      try {
        if (!chunk) return;
        if (conversationId && !socket.conversationId)
          socket.conversationId = conversationId;

        socket.audioBuffer.push(Buffer.from(chunk));
        socket.chunkCount++;
        if (socket.chunkCount % 50 === 0) {
          console.log(`📦 Chunks recebidos: ${socket.chunkCount} para conv ${conversationId}`);
        }
      } catch (err) {
        console.error("Erro audio-chunk:", err);
      }
    });

    // ------------------------------------------------------------------
    // WebRTC: fim da captura do cliente
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // WebRTC: fim da captura do cliente (v8.0 ACK Transacional)
    // ------------------------------------------------------------------
    async function handleVoiceEnd({ conversationId, messageId }) {
      const startTime = Date.now();
      const convId = conversationId || socket.conversationId;
      const finalMessageId = messageId || uuidv4();

      console.log(`🎤 [Realtime] PROCESSANDO ÁUDIO (Conv: ${convId}, ID: ${finalMessageId})`);

      if (processingLocks.get(convId)) {
        console.log("⚠️ Já processando áudio, ignorado.");
        socket.emit("voice:ack", { messageId: finalMessageId, status: "ignored", reason: "already_processing" });
        return;
      }

      processingLocks.set(convId, true);

      try {
        if (!socket.audioBuffer || socket.audioBuffer.length === 0) {
          socket.emit("voice:ack", { messageId: finalMessageId, status: "failed", reason: "empty_audio" });
          socket.emit("lia-message", { text: "Áudio vazio.", conversationId: convId, mode: 'live' });
          processingLocks.delete(convId);
          return;
        }

        // 1. ACK Imediato (Status: Transcrevendo)
        socket.emit("voice:ack", { messageId: finalMessageId, conversationId: convId, status: "transcribing" });

        const fullBuffer = Buffer.concat(socket.audioBuffer);
        socket.audioBuffer = [];
        socket.chunkCount = 0;

        if (fullBuffer.length < 5000) { // Reduzido de 10k para ser mais sensível
          console.warn(`⚠️ Áudio muito curto: ${fullBuffer.length} bytes.`);
          socket.emit("voice:ack", { messageId: finalMessageId, status: "failed", reason: "too_short" });
          socket.emit("lia-message", { text: "Áudio muito curto.", conversationId: convId, mode: 'live' });
          processingLocks.delete(convId);
          return;
        }

        // WAV para Whisper
        const wavBuffer = pcmToWav(fullBuffer, 16000);
        const formData = new FormData();
        formData.append("file", wavBuffer, { filename: "audio.wav", contentType: "audio/wav" });
        formData.append("model", "whisper-1");
        formData.append("language", "pt");

        const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, ...formData.getHeaders() },
          body: formData
        });

        const data = await resp.json();
        const texto = data?.text?.trim();

        if (!texto) {
          socket.emit("voice:ack", { messageId: finalMessageId, status: "failed", reason: "stt_failed" });
          socket.emit("lia-message", { text: "Não entendi o áudio.", conversationId: convId, mode: 'live' });
          processingLocks.delete(convId);
          return;
        }

        // ACK: Transcrito -> Processando Resposta
        socket.emit("voice:ack", { messageId: finalMessageId, status: "processing", transcript: texto });
        socket.emit("user-transcript", texto);

        const currentUserId = socket.userId;
        const currentTenantId = socket.tenantId;

        const session = await ensureSession(currentUserId, convId);
        const profile = await getUserProfile(currentUserId);

        const contextOptions = {
          userId: currentUserId,
          tenantId: currentTenantId,
          userPlan: profile?.plan || 'free',
          userRole: profile?.role || 'client',
          userLocation: session?.userLocation
        };

        const resposta = await runChatWithTools(convId, texto, contextOptions, "voice", finalMessageId);

        // Extrair scripts
        const voiceScript = typeof resposta === 'string' ? resposta : (resposta.voiceScript || resposta.text);
        const chatText = typeof resposta === 'string' ? resposta : (resposta.text || resposta.chatPayload);

        // TTS
        const openaiVoice = getOpenAIVoice(socket.voicePersonality);
        const audioBuffer = await textToAudio(voiceScript, openaiVoice, { conversationId: convId });

        // 2. Resposta Final (Sucesso)
        socket.emit("voice:reply", {
          messageId: finalMessageId,
          conversationId: convId,
          text: chatText,
          audio: audioBuffer ? Array.from(audioBuffer) : null,
          latency: Date.now() - startTime
        });

        // Legado
        if (audioBuffer) {
          socket.emit("audio-response", { audio: Array.from(audioBuffer), text: chatText, conversationId: convId });
        } else {
          socket.emit("lia-message", { text: chatText, conversationId: convId, mode: 'live' });
        }

      } catch (err) {
        console.error("❌ [Realtime] Erro voice:send:", err);
        socket.emit("voice:ack", { messageId: finalMessageId, status: "failed", reason: "error" });
        socket.emit("lia-message", { text: "Erro ao processar áudio.", conversationId: convId, mode: 'live' });
      } finally {
        processingLocks.delete(convId);
      }
    }

    socket.on("voice:send", handleVoiceEnd);
    socket.on("audio-end", handleVoiceEnd); // Legado





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
