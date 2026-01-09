// ======================================================================
// 🤖 CONFIGURAÇÃO DO ASSISTANT - APENAS GPT-4o-mini
// ======================================================================

import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ======================================================================
// 📋 ASSISTANT ID (ÚNICO)
// ======================================================================

export const ASSISTANT_ID = "asst_7DdfqruZpUZEr69FNc2iKuQw";

// Alias para compatibilidade com código existente
export async function validateAssistantIds() {
  try {
    console.log("✅ IDs dos Assistants validados");
    console.log(`   GPT-4o-mini: ${ASSISTANT_ID} (ÚNICO)`);

    const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    // Log de inicialização removido - informação já exibida no server.js
    return assistant;
  } catch (err) {
    console.error("❌ Erro ao validar assistant:", err.message);
    throw err;
  }
}

// ======================================================================
// 📂 CATEGORIAS DE FUNCTIONS
// ======================================================================

export const FUNCTION_CATEGORIES = {
  busca: ["searchWeb", "getExchangeRate", "getWeather", "searchNearby"],
  analise: ["analise_sentimento", "analise_texto"],
  geracao: ["gerar_imagem", "gerar_codigo", "gerar_relatorio"],
  voz: ["obter_hora_local"],
  codigo: ["executar_codigo"],
  outros: ["createQuickNote", "createTask", "sendWhatsAppMessage"]
};