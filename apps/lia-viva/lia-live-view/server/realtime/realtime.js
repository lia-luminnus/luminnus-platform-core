// ======================================================================
// 🎧 LIA Realtime – Fluxo de STT/TTS otimizado para WebRTC (PCM chunks)
// ======================================================================

import { buscarNaWeb } from "../search/web-search.js";
import { textToAudio, runGpt4Mini } from "../assistants/gpt4-mini.js";
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

async function runChatWithTools(conversationId, userMessage, contextOptions = {}, origin = "voice") {
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
    const enrichedPrompt = OutputGovernance.enrichPrompt(userMessage);

    console.log(`🤖 [runChatWithTools] Executando com prompt enriquecido`);

    // =====================================================
    // TOOL CENTRALIZATION v1.0
    // =====================================================
    const { ToolService } = await import("../services/toolService.js");
    const functions = ToolService.getTools();

    // v1.1: Usar GPT-4o-mini como cérebro principal (Híbrido v1.1.2)
    const gptResponse = await runGpt4Mini(enrichedPrompt, {
      conversationId,
      functions: functions.map(f => f),
      messages
    });

    let finalReply = gptResponse.text;
    let turnCalls = gptResponse.tool_calls || (gptResponse.function_call ? [gptResponse.function_call] : []);

    // v4.0 Ciclo Agêntico para Voz
    let turnCount = 0;
    const MAX_TURNS = 3;
    let finalDashboardAction = null;
    let finalImagePayload = null;

    while (turnCalls.length > 0 && turnCount < MAX_TURNS) {
      turnCount++;
      console.log(`🔄 [Realtime] Turno ${turnCount}: ${turnCalls.length} ferramentas`);

      for (const call of turnCalls) {
        console.log(`🔧 [Realtime] Executando: ${call.name}`);
        const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments || "{}") : call.arguments;

        let function_result;
        try {
          function_result = await ToolService.execute(call.name, args, {
            userId,
            tenantId,
            userLocation: contextOptions.userLocation
          });

          if (!function_result || function_result.error) {
            throw new Error(function_result?.error || 'Retorno vazio da ferramenta');
          }
        } catch (toolError) {
          console.error(`❌ [Realtime] Erro na ferramenta ${call.name}:`, toolError.message);
          // ANTI-LOOP GUARDRAIL: Falhou + por quê + plano B
          finalReply = `Falhou ao executar ${call.name}. Motivo: ${toolError.message}. Plano B: Vou tentar resolver de outra forma ou seguir sem essa informação. Quer que eu tente novamente por outro caminho ou prefere seguir para o próximo tópico? (A/B)`;
          turnCalls = []; // Abortar loop agêntico
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

      if (finalImagePayload || finalDashboardAction) break;

      // Chama AI de novo
      const nextCall = await runGpt4Mini("Continue a conversa com base nos resultados.", {
        conversationId,
        temperature: 0.7,
        messages
      });

      finalReply = nextCall.text || finalReply;
      turnCalls = nextCall.tool_calls || (nextCall.function_call ? [nextCall.function_call] : []);
    }

    // Retornos Especiais
    if (finalImagePayload) {
      const naturalReply = `Gerei a imagem que você pediu sobre ${finalImagePayload.data.prompt}.`;
      await saveMessage(conversationId, "user", userMessage, origin);
      await saveMessage(conversationId, "assistant", naturalReply, origin);

      return {
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
      await saveMessage(conversationId, "user", userMessage, origin);
      await saveMessage(conversationId, "assistant", naturalReply, origin);

      return {
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
        }
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
    await saveMessage(conversationId, "user", userMessage, origin);
    await saveMessage(conversationId, "assistant", chatPayload, origin);
    console.log(`💾 Mensagem persistida (${origin}) para conv ${conversationId}`);

    // v1.2: Disparar atualização de resumo incremental (Enterprise)
    if (typeof updateSummaryIfNeeded === 'function') {
      const totalMsgs = (context.history?.length || 0) + 2;
      updateSummaryIfNeeded(conversationId, totalMsgs);
    }

    // Retornar objeto com voice script separado do payload completo
    return {
      voiceScript, // Para TTS (curto, falável)
      chatPayload, // Para chat/log (completo)
      text: chatPayload, // FIX: text deve ser o conteúdo completo para a UI
      mode: "voice"
    };

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
    socket.chunkCount = 0;
    socket.voicePersonality = "viva";

    // -----------------------------
    // Identidade da conversa
    // -----------------------------
    socket.on("register-conversation", payload => {
      const { conversationId, admin_diagnostic_mode } = typeof payload === "string"
        ? { conversationId: payload, admin_diagnostic_mode: false }
        : (payload || {});

      // Contexto já extraído e validado pelo middleware socketAuth
      const auth = socket.data.auth || {};
      socket.conversationId = conversationId || auth.conversationId;
      socket.userId = auth.userId;
      socket.tenantId = auth.tenantId;
      socket.admin_diagnostic_mode = admin_diagnostic_mode || false;

      if (socket.conversationId) socket.join(`conv:${socket.conversationId}`);
      if (socket.tenantId) socket.join(`tenant:${socket.tenantId}`);

      console.log("📋 [Socket] ConversationID vinculado:", socket.conversationId, "User:", socket.userId, "Admin:", socket.admin_diagnostic_mode);
    });

    // Setup multimodal events
    setupMultimodalEvents(socket);

    // v3.0: LIA Action Protocol - Respostas do frontend às ferramentas
    socket.on("lia-action-response", async (response) => {
      console.log(`🔌 [Realtime] Resposta de ação recebida: ${response.type} para conv ${response.conversationId}`);

      if (response.type === 'DASHBOARD_SNAPSHOT') {
        const snapshot = response.data;
        const convId = response.conversationId || socket.conversationId;

        // v3.1: Awareness do Dashboard - Adicionar contexto técnico invisível no histórico
        const dashboardContext = `[CONTEXTO_SISTEMA: Widgets Atuais no Dashboard]\n${snapshot.widgets.map(w => `- ${w.title} (${w.type})`).join('\n')}\nTotal: ${snapshot.widgetCount} widgets.`;

        try {
          const { saveMessage } = await import("../config/supabase.js");
          await saveMessage(convId, "system", dashboardContext, "snapshot");
          console.log(`✅ [Realtime] Dashboard Awareness atualizado para conv: ${convId}`);
        } catch (e) {
          console.error('❌ Erro ao salvar context do dashboard:', e);
        }
      }
    });

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

        socket.emit("lia-typing");
        await wait(800); // Delay aumentado para dar tempo ao frontend de exibir o indicador

        const auth = socket.data.auth || {};
        const { ensureSession } = await import('../server.js');
        const session = await ensureSession(auth.userId || socket.userId, convId);

        const contextOptions = {
          userId: auth.userId || socket.userId,
          tenantId: auth.tenantId || socket.tenantId,
          userLocation: session?.userLocation,
          admin_diagnostic_mode: socket.admin_diagnostic_mode
        };

        const resposta = await runChatWithTools(convId, text, contextOptions, "text");

        // Auto-memória para chat realtime
        if (contextOptions.userId) {
          detectAndSaveMemory(text, contextOptions.userId).catch(e => console.error('⚠️ [Realtime] Erro auto-memória:', e));
        }

        socket.emit("lia-stop-typing");
        // Aplicar filtro de emoji (substituir "Sorriso!" por 😊, etc.)
        const respostaFiltrada = typeof resposta === 'string'
          ? replaceEmojiDescriptions(resposta)
          : (resposta.text ? { ...resposta, text: replaceEmojiDescriptions(resposta.text) } : resposta);

        // v3.1: Emitir ação de dashboard se existir (Modo Texto/Socket)
        if (resposta && typeof resposta === 'object') {
          if (resposta.action) {
            console.log(`🎯 [Realtime] Emitindo ação para o chat: ${resposta.action.name}`);
            socket.emit("lia-dashboard-action", resposta.action);
          }
          if (resposta.table) {
            console.log(`📊 [Realtime] Emitindo tabela para o chat`);
            socket.emit("lia:render-table", resposta.table);
          }
        }

        socket.emit("lia-message", respostaFiltrada);


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
        const bufferLen = fullBuffer.length;
        console.log(`🎤 PROCESSANDO ÁUDIO: ${bufferLen} bytes (${socket.chunkCount} chunks)`);
        socket.audioBuffer = [];
        socket.chunkCount = 0;

        appendAudioLog({
          time: Date.now(),
          conversationId: convId,
          event: "audio-end-received",
          bytes: fullBuffer.length
        });

        if (fullBuffer.length < 10000) {
          console.warn(`⚠️ Áudio muito curto: ${fullBuffer.length} bytes. Mínimo 10000.`);
          socket.emit("lia-message", "Áudio muito curto.");
          return;
        }

        // Ack imediato
        socket.emit("audio-ack", { conversationId: convId });

        // WAV para Whisper (16kHz para paridade com Dashboard)
        const wavBuffer = pcmToWav(fullBuffer, 16000);
        console.log(`🎵 [Whisper] WAV gerado: ${wavBuffer.length} bytes (PCM: ${fullBuffer.length})`);

        const formData = new FormData();
        formData.append("file", wavBuffer, { filename: "audio.wav", contentType: "audio/wav" });
        formData.append("model", "whisper-1");
        formData.append("language", "pt");
        formData.append("prompt", "Lia, Luminnus, inteligência artificial, assistente, Wendell, tecnologia, dashboard, gráfico de pizza, gráfico de barras, ranking, tabela de dados, faturamento, despesas, trocar widget.");

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

        // Emitir transcrição para o chat (Dashboard)
        socket.emit("user-transcript", texto);

        const auth = socket.data.auth || {};
        const { ensureSession } = await import('../server.js');
        const session = await ensureSession(auth.userId || socket.userId, convId);

        const contextOptions = {
          userId: auth.userId || socket.userId,
          tenantId: auth.tenantId || socket.tenantId,
          userLocation: session?.userLocation,
          admin_diagnostic_mode: socket.admin_diagnostic_mode
        };

        // Deduplicação
        if (lastTranscriptionCache.get(convId) === texto) {
          console.log("♻️ [Realtime] Transcrição duplicada detectada, gerando resposta rápida...");
          const resposta = await runChatWithTools(convId, texto, contextOptions, "voice");
          // Emite texto e tenta áudio
          socket.emit("lia-message", resposta);
          try {
            const openaiVoice = getOpenAIVoice(socket.voicePersonality);
            const audioResp = await textToAudio(resposta.text || resposta, openaiVoice, { conversationId: convId });
            if (audioResp) {
              socket.emit("audio-response", { audio: Array.from(audioResp), text: resposta.text || resposta, conversationId: convId, mode: "voice" });
            }
          } catch (e) { }
          return;
        }

        lastTranscriptionCache.set(convId, texto);

        // GPT
        const resposta = await runChatWithTools(convId, texto, contextOptions, "voice");

        // Extrair texto para TTS (voiceScript) e para chat (chatPayload ou text)
        const textoParaTTS = typeof resposta === 'string'
          ? resposta
          : (resposta.voiceScript || resposta.text || resposta.chatPayload || '');
        const textoParaChat = typeof resposta === 'string'
          ? resposta
          : (resposta.text || resposta.chatPayload || resposta.voiceScript || '');

        // ==============================================================
        // FUNÇÃO: Substituir descrições de emoji por emojis REAIS no chat
        // "Sorriso!" -> 😊, "Rosto piscando" -> 😉, etc.
        // ==============================================================
        const replaceEmojiDescriptionsWithEmojis = (text) => {
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
          return cleaned.replace(/[ \t]{2,}/g, ' ').trim();
        };

        const textoParaChatLimpo = replaceEmojiDescriptionsWithEmojis(textoParaChat);

        // ==============================================================
        // AJUSTE 1: Emitir TEXTO IMEDIATAMENTE (antes do áudio)
        // ==============================================================
        // v3.1: Emitir ação de dashboard se existir (Modo Voz/WebRTC)
        if (resposta && typeof resposta === 'object') {
          if (resposta.action) {
            console.log(`🎯 [Realtime] Emitindo ação para voz: ${resposta.action.name}`);
            socket.emit("lia-dashboard-action", resposta.action);
          }
          if (resposta.table) {
            console.log(`📊 [Realtime] Emitindo tabela para voz`);
            socket.emit("lia:render-table", resposta.table);
          }
        }

        socket.emit("lia-message", textoParaChatLimpo);
        console.log("📝 [Realtime] Texto emitido para o chat");


        // Auto-memória para voz
        if (socket.userId || contextOptions.userId) {
          detectAndSaveMemory(texto, socket.userId || contextOptions.userId).catch(e => console.error('⚠️ [Realtime] Erro auto-memória voz:', e));
        }

        // ==============================================================
        // AJUSTE 2: Remover descrições de emoji para TTS
        // Padrão: "carinha sorrindo", "rosto piscando", "emoji de...", etc.
        // ==============================================================
        const removeEmojiDescriptions = (text) => {
          // Remove padrões como "(carinha sorrindo)", "rosto piscando", "emoji de sorriso"
          const patterns = [
            /\(?carinha\s+\w+\)?/gi,
            /\(?rosto\s+\w+\)?/gi,
            /\(?emoji\s+de\s+\w+\)?/gi,
            /\(?face\s+\w+\)?/gi,
            /\(?sorriso\s*\)?/gi,
            /\(?piscando\s*\)?/gi,
            /\(?winking\s+face\)?/gi,
            /\(?smiling\s+face\)?/gi,
            /🙂|😊|😉|🤔|😄|😁|👍|🎉|✨|💡|🔥|❤️|👀|🚀|💪|🤗|😅/g, // Emojis são removidos do TTS
          ];

          let cleaned = text;
          patterns.forEach(pattern => {
            cleaned = cleaned.replace(pattern, '');
          });

          // Limpar espaços duplicados e pontuação solta (preservando quebras de linha para TTS se necessário, ou apenas limpando horizontal)
          return cleaned.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
        };

        const textoLimpoParaTTS = removeEmojiDescriptions(textoParaTTS);

        // TTS - map personality to OpenAI voice
        try {
          const openaiVoice = getOpenAIVoice(socket.voicePersonality);
          const audioResp = await textToAudio(textoLimpoParaTTS, openaiVoice, { conversationId: convId });

          if (!audioResp) {
            // Texto já foi emitido acima, apenas log
            console.log("⚠️ [Realtime] TTS não retornou áudio");
            return;
          }

          // Emitir áudio COM o texto para legenda (v3.5.1)
          // IMPORTANTE: conversationId e mode são OBRIGATÓRIOS para o frontend adicionar ao scope correto
          socket.emit("audio-response", {
            audio: Array.from(audioResp),
            text: textoLimpoParaTTS || textoParaChatLimpo,
            conversationId: convId,
            mode: "voice"
          });

          console.log("✅ Áudio enviado");

        } catch (ttsErr) {
          console.error("Erro TTS:", ttsErr);
          // Texto já foi emitido, não precisa enviar novamente
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