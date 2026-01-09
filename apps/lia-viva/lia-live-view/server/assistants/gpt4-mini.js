import OpenAI, { toFile } from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { LIA_PERSONALITY_SHORT } from "../personality/lia-personality.js";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ OPENAI_API_KEY not set in .env — set it before running.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Logs
const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const GPT_LOG = path.join(LOGS_DIR, "gpt.log");
const TTS_LOG = path.join(LOGS_DIR, "tts.log");

function appendLog(file, entry) {
  try { fs.appendFileSync(file, JSON.stringify(entry) + "\n"); }
  catch (e) { console.error("Failed write log", file, e); }
}

function appendTtsLog(entry) {
  try { fs.appendFileSync(TTS_LOG, JSON.stringify(entry) + "\n"); }
  catch (e) { console.error("❌ Falha escrevendo tts.log:", e); }
}

// Simple caches / guards
const recentRequestHashes = new Map(); // conversationId -> {hash, ts}
const concurrencyLocks = new Map(); // conversationId -> boolean

function hashText(t) {
  return crypto.createHash("sha256").update(t).digest("hex");
}

// ========================================================================
// runGpt4Mini — fast, interactive, supports function_call
// ========================================================================
export async function runGpt4Mini(userText, options = {}) {
  const conv = options.conversationId || "unknown";
  const temperature = typeof options.temperature === "number" ? options.temperature : 0.25;
  const max_tokens = options.maxTokens || 512;
  const functions = options.functions || undefined;

  const timestamp = Date.now();
  const requestHash = hashText(`${conv}:${userText}:${temperature}:${max_tokens}`);

  const last = recentRequestHashes.get(conv);
  if (last && last.hash === requestHash && (timestamp - last.ts) < 3000) {
    appendLog(GPT_LOG, { time: timestamp, conversationId: conv, event: "dedupe-skip", hash: requestHash });
    return { text: "", function_call: null, note: "dedupe-skip" };
  }
  recentRequestHashes.set(conv, { hash: requestHash, ts: timestamp });

  if (concurrencyLocks.get(conv)) {
    appendLog(GPT_LOG, { time: timestamp, conversationId: conv, event: "concurrency-block" });
    return { text: "Estou processando sua última solicitação — aguarde um momento.", function_call: null };
  }
  concurrencyLocks.set(conv, true);

  appendLog(GPT_LOG, {
    time: timestamp,
    conversationId: conv,
    event: "request",
    text: userText,
    temperature,
    max_tokens,
    functions: !!functions
  });

  try {
    const system = {
      role: "system",
      content: LIA_PERSONALITY_SHORT
    };

    // Use mensagens fornecidas ou crie uma nova
    // NOTA: Se options.messages existir, já contém a mensagem do usuário
    // Não duplicar adicionando novamente
    const messages = options.messages || [
      system,
      { role: "user", content: userText }
    ];

    // Build tools array if functions were provided (convert to tools format)
    let tools = undefined;
    if (functions && functions.length > 0) {
      tools = functions.map(f => ({
        type: "function",
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters
        }
      }));
    }

    const payload = {
      model: "gpt-4o-mini",
      messages,
      temperature,
      max_tokens,
      ...(tools ? { tools } : {})
    };

    let response;
    try {
      response = await openai.chat.completions.create(payload);
    } catch (sdkErr) {
      appendLog(GPT_LOG, { time: Date.now(), conversationId: conv, event: "sdk-error", error: String(sdkErr) });
      throw sdkErr;
    }

    const choice = response.choices?.[0];
    const message = choice?.message || null;

    // Handle both old function_call and new tool_calls formats
    let function_call = null;
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type === 'function') {
        function_call = {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments
        };
      }
    } else if (message?.function_call) {
      function_call = message.function_call;
    }

    const text = (message?.content ?? "").trim();

    appendLog(GPT_LOG, {
      time: Date.now(),
      conversationId: conv,
      event: "response",
      textPreview: text.slice(0, 400),
      function_call: function_call
        ? { name: function_call.name, argumentsPreview: (function_call.arguments || "").slice(0, 400) }
        : null
    });

    return { text, function_call };
  } catch (err) {
    console.error('❌ [runGpt4Mini] Erro na chamada OpenAI:', err);
    appendLog(GPT_LOG, { time: Date.now(), conversationId: conv, event: "error", error: String(err) });
    return { text: "Desculpe, ocorreu um erro ao processar sua solicitação.", function_call: null };
  } finally {
    concurrencyLocks.set(conv, false);
  }
}

// ========================================================================
// runGpt4Heavy — tarefas mais longas
// ========================================================================
export async function runGpt4Heavy(userText, options = {}) {
  const conv = options.conversationId || "unknown";
  appendLog(GPT_LOG, { time: Date.now(), conversationId: conv, event: "heavy-request", textPreview: userText.slice(0, 200) });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: LIA_PERSONALITY_SHORT },
        { role: "user", content: userText }
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2000
    });

    const message = response.choices?.[0]?.message;
    const text = (message?.content ?? "").trim();

    appendLog(GPT_LOG, { time: Date.now(), conversationId: conv, event: "heavy-response", textPreview: text.slice(0, 400) });

    return text;
  } catch (err) {
    appendLog(GPT_LOG, { time: Date.now(), conversationId: conv, event: "heavy-error", error: String(err) });
    return "Erro ao processar tarefa complexa.";
  }
}

// ========================================================================
// audioToText — Whisper (OpenAI SDK)
// ========================================================================
/**
 * Transcreve áudio usando OpenAI Whisper (SDK oficial)
 * Usado para: Botão "Falar para digitar" (microfone pequeno)
 * Não interfere com Realtime Voice API
 */
export async function audioToText(audioBuffer, mimeType = "audio/webm") {
  try {
    appendLog(GPT_LOG, {
      time: Date.now(),
      event: "whisper-request",
      bytes: audioBuffer.length,
      mimeType
    });

    // Use OpenAI SDK's toFile helper for proper file handling in Node.js
    const extension = mimeType.includes("wav") ? "wav" : "webm";
    const file = await toFile(audioBuffer, `audio.${extension}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "pt"
    });

    appendLog(GPT_LOG, {
      time: Date.now(),
      event: "whisper-success",
      textPreview: (transcription.text || "").slice(0, 200)
    });

    return transcription.text || null;

  } catch (err) {
    appendLog(GPT_LOG, {
      time: Date.now(),
      event: "whisper-error",
      error: String(err)
    });
    return null;
  }
}

// ========================================================================
// textToAudio — OpenAI TTS
// ========================================================================
/**
 * Converte texto em áudio usando OpenAI TTS
 * Usado para: Respostas de texto (não Realtime Voice)
 * Voz padrão: "nova"
 */
export async function textToAudio(text, voiceProfile = "nova", options = {}) {
  const conversationId = options.conversationId || "unknown";

  // Validação de tipo: garantir que text é uma string
  if (text && typeof text !== 'string') {
    // Se for um objeto, tentar extrair o texto
    if (typeof text === 'object') {
      text = text.text || text.voiceScript || text.content || text.message || JSON.stringify(text);
    } else {
      text = String(text);
    }
  }

  appendTtsLog({
    time: Date.now(),
    conversationId,
    event: "tts-request",
    chars: text ? text.length : 0
  });

  if (!text || (typeof text === 'string' && text.trim().length < 4)) {
    appendTtsLog({ time: Date.now(), conversationId, event: "tts-skip-short" });
    return null;
  }

  if (text.length > 2000) {
    text = text.slice(0, 2000);
    appendTtsLog({ time: Date.now(), conversationId, event: "tts-truncated" });
  }

  try {
    const response = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voiceProfile,
      input: text,
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    appendTtsLog({
      time: Date.now(),
      conversationId,
      event: "tts-success",
      bytes: buffer.length
    });

    return buffer;

  } catch (err) {
    appendTtsLog({
      time: Date.now(),
      conversationId,
      event: "tts-error",
      error: String(err)
    });
    throw err;
  }
}

export default {
  runGpt4Mini,
  runGpt4Heavy,
  audioToText,
  textToAudio
};
