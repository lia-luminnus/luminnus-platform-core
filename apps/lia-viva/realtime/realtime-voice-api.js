import OpenAI from "openai";
import dotenv from "dotenv";
import unifiedContext from "../src/api/context/unifiedContext.js";
import { getInstructions } from "../config/personality.js";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY não encontrada");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Logs
const LOGS_DIR = path.join(process.cwd(), "logs");
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const REALTIME_LOG = path.join(LOGS_DIR, "realtime-voice.log");

function appendRealtimeLog(entry) {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(REALTIME_LOG, JSON.stringify({ timestamp, ...entry }) + "\n");
  } catch (e) {
    console.error("❌ Falha escrevendo realtime-voice.log:", e);
  }
}

// ======================================================================
// 🎙️ CRIAR SESSÃO REALTIME
// ======================================================================

export async function createRealtimeSession(conversationId) {
  try {
    console.log(`🔧 Criando sessão OpenAI Realtime para conversa: ${conversationId}...`);

    // Carregar contexto unificado
    const userId = "00000000-0000-0000-0000-000000000001"; // DEV USER ID
    const context = await unifiedContext.getUnifiedContext(conversationId, userId);

    // Instruções COMPLETAS com personalidade + memórias
    const basePersonality = getInstructions('gpt4-mini');

    const instructions = `${basePersonality}

MEMÓRIAS IMPORTANTES DO USUÁRIO:
${context.memoryBlock}

IMPORTANTE: Você tem acesso ao histórico completo da conversa que será fornecido separadamente. Use essas memórias e o histórico para manter continuidade nas respostas.`;

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer",
        instructions,
        modalities: ["text", "audio"],
        temperature: 0.8,
        max_response_output_tokens: 4096,
        turn_detection: {
          type: "server_vad",
          threshold: 0.6,              // Era 0.5, aumentado para evitar cortes
          prefix_padding_ms: 500,      // Era 300, aumentado para buffer maior
          silence_duration_ms: 700     // Era 500, aguarda mais antes de cortar
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro ao criar sessão Realtime:", errorText);
      appendRealtimeLog({ event: "session-error", error: errorText });
      throw new Error(`Realtime API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Sessão Realtime criada:", data.id);

    appendRealtimeLog({ event: "session-created", sessionId: data.id });

    return data;
  } catch (error) {
    console.error("❌ Erro createRealtimeSession:", error);
    appendRealtimeLog({ event: "session-creation-failed", error: String(error) });
    throw error;
  }
}

export async function generateEphemeralToken(conversationId) {
  const session = await createRealtimeSession(conversationId);

  return {
    client_secret: session.client_secret?.value || session.client_secret,
    session_id: session.id,
    expires_at: session.expires_at
  };
}

// ======================================================================
// Setup rotas WebRTC
// ======================================================================
export function setupRealtimeVoiceAPI(app, openai) {
  console.log("🎙️ Configurando WebRTC Realtime Voice API...");

  // POST /webrtc/token
  app.post("/webrtc/token", async (req, res) => {
    try {
      const { conversationId } = req.body;

      console.log(`📞 /webrtc/token chamado para conversa: ${conversationId}`);
      appendRealtimeLog({ event: "token-request", conversationId });

      const tokenData = await generateEphemeralToken(conversationId);

      res.json({
        success: true,
        token: tokenData.client_secret,
        session_id: tokenData.session_id,
        expires_at: tokenData.expires_at
      });

      console.log("✅ Token enviado para cliente");
    } catch (error) {
      console.error("❌ Erro /webrtc/token:", error);
      appendRealtimeLog({ event: "token-endpoint-error", error: String(error) });

      res.status(500).json({
        success: false,
        error: "Erro ao gerar token efêmero",
        detail: String(error)
      });
    }
  });

  // GET /webrtc/status
  app.get("/webrtc/status", (req, res) => {
    res.json({
      success: true,
      status: "WebRTC Realtime Voice API ativo",
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "shimmer",
      timestamp: new Date().toISOString()
    });
  });

  console.log("✅ WebRTC Realtime Voice API configurado");
  appendRealtimeLog({ event: "api-initialized" });
}

export default {
  setupRealtimeVoiceAPI,
  createRealtimeSession,
  generateEphemeralToken
};
