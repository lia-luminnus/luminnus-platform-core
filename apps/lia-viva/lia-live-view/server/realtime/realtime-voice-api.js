// ======================================================================
// 🎙️ LIA WebRTC Realtime Voice API
// OpenAI Realtime API com WebRTC para voz em tempo real
// ======================================================================

import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { LIA_FULL_PERSONALITY } from "../personality/lia-personality.js";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
// Criar sessão Realtime
// ======================================================================
async function createRealtimeSession() {
  try {
    console.log("🔧 Criando sessão OpenAI Realtime...");

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "shimmer",
        instructions: LIA_FULL_PERSONALITY + "\n\n=== REGRAS PARA VOZ REALTIME ===\n1. Responda de forma natural e conversacional.\n2. USE EMOJIS na saída de texto (transcrição), mas NUNCA descreva os emojis na fala (ex: não diga 'Rosto piscando').\n3. Mantenha as frases curtas.",
        modalities: ["text", "audio"],
        temperature: 0.8,
        max_response_output_tokens: 4096,
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
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

async function generateEphemeralToken() {
  const session = await createRealtimeSession();
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

  // ------------------------------------------------
  // POST /webrtc/token - Gerar token efêmero
  // ------------------------------------------------
  app.post("/webrtc/token", async (req, res) => {
    try {
      console.log("📞 /webrtc/token chamado");
      appendRealtimeLog({ event: "token-request" });

      const tokenData = await generateEphemeralToken();

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

  // ------------------------------------------------
  // GET /webrtc/status - Health check
  // ------------------------------------------------
  app.get("/webrtc/status", (req, res) => {
    res.json({
      success: true,
      status: "WebRTC Realtime Voice API ativo",
      model: "gpt-4o-realtime-preview-2024-12-17",
      voice: "shimmer",
      timestamp: new Date().toISOString()
    });
  });

  appendRealtimeLog({ event: "api-initialized" });
}

export default {
  setupRealtimeVoiceAPI,
  createRealtimeSession,
  generateEphemeralToken
};
