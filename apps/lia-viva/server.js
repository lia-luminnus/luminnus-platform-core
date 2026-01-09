import 'dotenv/config'; // Carrega variáveis do .env
import { createClient } from "@supabase/supabase-js";

// ===========================================================
// CONFIG SUPABASE — BACKEND (5000) + FRONTEND (3000)
// ===========================================================
let supabaseUrl = null;
let supabaseKey = null;

// 1) Ambiente Node (server.js / porta 5000)
if (
  typeof process !== "undefined" &&
  process.env &&
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY
) {
  supabaseUrl = process.env.SUPABASE_URL;
  supabaseKey = process.env.SUPABASE_ANON_KEY;
}

// 2) Ambiente Frontend (Vite / Next / Browser)
if ((!supabaseUrl || !supabaseKey) && typeof window !== "undefined") {
  const env = import.meta?.env || process.env || {};

  supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  supabaseKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    supabaseKey;
}

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️  SUPABASE_URL e SUPABASE_ANON_KEY não estão definidas");
} else {
  console.log("✅ Supabase configurado");
}

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// ===========================================================
// MENSAGENS
// ===========================================================
export async function saveMessage(conversationId, role, content, origin = "text") {
  if (!supabase) return;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    origin,
  });
  if (error) throw new Error(`Error saving message: ${error.message}`);
}

export async function loadRecentMessages(conversationId, limit = 6) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error loading recent messages: ${error.message}`);

  return (data || []).reverse();
}

export async function loadConversation(conversationId, limit = 10) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Error loading conversation: ${error.message}`);
  return data || [];
}

// ===========================================================
// MEMÓRIAS
// ===========================================================
export async function saveMemory(userId, key, value, isImportant = true) {
  if (!supabase) {
    console.warn("⚠️ Supabase não configurado - memória não salva");
    return null;
  }

  console.log(`💾 [saveMemory] Salvando: key="${key}", value="${value}", userId=${userId}`);

  const typeMap = {
    nome_usuario: "personal_info",
    idade: "personal_info",
    localizacao: "personal_info",
    empresa: "work",
    cargo: "work",
    nome_filho: "family",
    detalhes_filho: "family",
    nome_esposa: "family",
    nome_marido: "family",
    nome_cachorro: "family",
    nome_gato: "family",
    nome_pet: "family",
    preferencia: "preferences",
    hobby: "preferences",
    rotina_domingo: "habits",
    relacao_lia: "relationships",
    info_importante: "general",
  };

  const importanceMap = {
    nome_usuario: 5,
    empresa: 4,
    cargo: 4,
    localizacao: 3,
    idade: 3,
    nome_filho: 4,
    nome_esposa: 4,
    nome_marido: 4,
    preferencia: 2,
    hobby: 2,
    info_importante: 3,
    rotina_domingo: 2,
  };

  const type = typeMap[key] || "other";
  const importance = isImportant ? importanceMap[key] || 3 : 1;

  try {
    const { data: existing } = await supabase
      .from("memories_v2")
      .select("key")
      .eq("user_id", userId)
      .eq("key", key)
      .single();

    const status = existing ? "updated" : "created";

    const { error } = await supabase.from("memories_v2").upsert(
      {
        user_id: userId,
        key,
        value,
        type,
        content: `${key}: ${value}`,
        importance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,key" }
    );

    if (error) throw new Error(`Error saving memory: ${error.message}`);

    console.log(`✅ [saveMemory] Memória ${status}: ${key} = ${value}`);
    return { key, value, status };
  } catch (err) {
    console.error("❌ [saveMemory] Exceção:", err);
    throw err;
  }
}

export async function loadImportantMemories(userId) {
  if (!supabase) return [];

  console.log(`🔍 [loadImportantMemories] Buscando memórias para userId: ${userId}`);

  const { data, error } = await supabase
    .from("memories_v2")
    .select("key, value")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(15);

  if (error) throw new Error(`Error loading memories: ${error.message}`);

  return data || [];
}

export async function detectAndSaveMemory(text, userId) {
  const lowerText = text.toLowerCase();
  const savedMemories = [];

  // NOME DO USUÁRIO
  if (
    lowerText.includes("meu nome é") ||
    lowerText.includes("me chamo") ||
    lowerText.includes("sou o") ||
    lowerText.includes("sou a") ||
    lowerText.includes("eu sou o") ||
    lowerText.includes("eu sou a") ||
    lowerText.includes("pode me chamar")
  ) {
    const match = text.match(
      /(?:meu nome é|me chamo|(?:eu )?sou (?:o|a)|pode me chamar de?)\s+([A-Za-zÀ-ÿ\s]+?)(?:\.|,|$| e | que | fundador| criador)/i
    );
    if (match && match[1].trim().length > 2) {
      const nome = match[1].trim();
      const result = await saveMemory(userId, "nome_usuario", nome);
      if (result) savedMemories.push(result);
    }
  }

  // IDADE
  if (lowerText.includes("tenho") && lowerText.includes("anos")) {
    const match = text.match(/tenho\s+(\d+)\s+anos/i);
    if (match) {
      const idade = match[1];
      const result = await saveMemory(userId, "idade", idade);
      if (result) savedMemories.push(result);
    }
  }

  // LOCALIZAÇÃO
  if (
    lowerText.includes("moro em") ||
    lowerText.includes("vivo em") ||
    lowerText.includes("estou em") ||
    lowerText.includes("sou de")
  ) {
    const match = text.match(
      /(?:moro|vivo|estou|sou)\s+(?:em|de)\s+([A-Za-zÀ-ÿ\s]+?)(?:\.|,|$| e )/i
    );
    if (match && match[1].trim().length > 2) {
      const localizacao = match[1].trim();
      const result = await saveMemory(userId, "localizacao", localizacao);
      if (result) savedMemories.push(result);
    }
  }

  // PREFERÊNCIAS / HOBBIES
  if (
    lowerText.includes("gosto de") ||
    lowerText.includes("adoro") ||
    lowerText.includes("amo") ||
    lowerText.includes("prefiro")
  ) {
    const match = text.match(/(?:gosto de|adoro|amo|prefiro)\s+(.+?)(?:\.|,|$| e )/i);
    if (match && match[1].trim().length > 3) {
      const preferencia = match[1].trim();
      const result = await saveMemory(userId, "preferencia", preferencia);
      if (result) savedMemories.push(result);
    }
  }

  // EMPRESA / FUNÇÃO
  if (
    lowerText.includes("fundador") ||
    lowerText.includes("criador") ||
    lowerText.includes("dono") ||
    lowerText.includes("ceo") ||
    lowerText.includes("desenvolvedor") ||
    lowerText.includes("trabalho")
  ) {
    const empresaMatch = text.match(
      /(?:fundador|criador|dono|ceo|desenvolvedor|trabalho)\s+(?:da|do|de|na|no)\s+([A-Za-zÀ-ÿ0-9\s]+?)(?:\.|,|$| e | que)/i
    );

    if (empresaMatch) {
      const empresaResult = await saveMemory(userId, "empresa", empresaMatch[1].trim());
      if (empresaResult) savedMemories.push(empresaResult);

      const cargo = lowerText.includes("desenvolvedor") ? "desenvolvedor" : "fundador";
      const cargoResult = await saveMemory(userId, "cargo", cargo);
      if (cargoResult) savedMemories.push(cargoResult);
    }
  }

  // RELAÇÃO COM A LIA
  if (
    (lowerText.includes("desenvolvi você") ||
      lowerText.includes("construí você") ||
      lowerText.includes("criei você") ||
      lowerText.includes("quem te criou") ||
      lowerText.includes("quem te desenvolveu")) &&
    (lowerText.includes("eu sou") ||
      lowerText.includes("sou quem") ||
      lowerText.includes("fui eu") ||
      lowerText.includes("eu te"))
  ) {
    const result = await saveMemory(userId, "relacao_lia", "desenvolvedor e criador da LIA");
    if (result) savedMemories.push(result);
  }

  // FILHO
  const filhoRegex = /(tenho um filho chamado|meu filho se chama)\s+([A-Za-zÀ-ÿ]+)\s+(.*)/i;
  const filhoMatch = text.match(filhoRegex);

  if (filhoMatch) {
    const nomeFilho = filhoMatch[2].trim();
    const detalhes = filhoMatch[3].trim();

    const r1 = await saveMemory(userId, "nome_filho", nomeFilho);
    if (r1) savedMemories.push(r1);

    if (detalhes.length > 5) {
      const r2 = await saveMemory(userId, "detalhes_filho", detalhes);
      if (r2) savedMemories.push(r2);
    }
  }

  // ESPOSA
  if (lowerText.includes("esposa") || lowerText.includes("sou casado")) {
    const match = text.match(
      /(?:minha esposa|sou casado com|esposa se chama)\s+([A-Za-zÀ-ÿ]+)/i
    );
    if (match) {
      const result = await saveMemory(userId, "nome_esposa", match[1].trim());
      if (result) savedMemories.push(result);
    }
  }

  // MARIDO
  if (lowerText.includes("marido") || lowerText.includes("sou casada")) {
    const match = text.match(
      /(?:meu marido|sou casada com|marido se chama)\s+([A-Za-zÀ-ÿ]+)/i
    );
    if (match) {
      const result = await saveMemory(userId, "nome_marido", match[1].trim());
      if (result) savedMemories.push(result);
    }
  }

  // PETS
  if (lowerText.includes("cachorro") || lowerText.includes("gato") || lowerText.includes("pet")) {
    const match = text.match(
      /(?:tenho um|meu)\s+(cachorro|gato|pet)\s+(?:chamado|de nome|que se chama)\s+([A-Za-zÀ-ÿ]+)/i
    );
    if (match) {
      const tipoPet = match[1].toLowerCase();
      const nomePet = match[2].trim();
      const result = await saveMemory(userId, `nome_${tipoPet}`, nomePet);
      if (result) savedMemories.push(result);
    }
  }

  // INFO IMPORTANTE
  if (
    lowerText.includes("guarda") ||
    lowerText.includes("lembra") ||
    lowerText.includes("salva") ||
    lowerText.includes("memoriza")
  ) {
    const infoMatch = text.match(/(?:guarda|lembra|salva|memoriza)\s*:?\s*(.+?)(?:\.|$)/i);

    if (infoMatch && infoMatch[1].trim().length > 10) {
      const result = await saveMemory(userId, "info_importante", infoMatch[1].trim());
      if (result) savedMemories.push(result);
    }
  }

  return savedMemories;
}
