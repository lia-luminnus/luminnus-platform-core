// ======================================================================
// 🔎 LIA — Web Search Inteligente v5.0 (QueryBuilder + Requery + Never Silent)
// ======================================================================
// 1. Usa QueryBuilder para extrair queries limpas de comandos longos
// 2. Requery automático se zero results
// 3. NUNCA deixa usuário sem resposta
// ======================================================================

import fetch from "node-fetch";
import dotenv from "dotenv";
import { buildSearchQuery, generateRequeryQuery } from "./query-builder.js";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CX;

console.log('🔍 [Search v5.0] Inicializando busca web:', {
  hasKey: !!GOOGLE_API_KEY,
  hasCX: !!GOOGLE_CX,
  engineType: "GoogleCustomSearch"
});

// ======================================================================
// HELPERS
// ======================================================================

function generateTraceId() {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

// Encurtador (mostra só domínio)
function encurtar(link) {
  try {
    if (!link) return "";
    return link.replace(/^https?:\/\//, "").split("/")[0];
  } catch {
    return link || "";
  }
}

// ======================================================================
// DETECÇÃO DE HORA/HORÁRIO (mantida do original)
// ======================================================================
function handleTimeQuery(queryLower) {
  const horaKeywords = ['hora', 'horário', 'horario', 'que horas', 'são'];
  const needsTime = horaKeywords.some(k => queryLower.includes(k) && !queryLower.includes('cotação'));

  if (!needsTime || queryLower.includes('horário de')) {
    return null;
  }

  const cidades = {
    'lisboa': 'Europe/Lisbon',
    'aveiro': 'Europe/Lisbon',
    'porto': 'Europe/Lisbon',
    'coimbra': 'Europe/Lisbon',
    'faro': 'Europe/Lisbon',
    'portugal': 'Europe/Lisbon',
    'são paulo': 'America/Sao_Paulo',
    'sao paulo': 'America/Sao_Paulo',
    'rio': 'America/Sao_Paulo',
    'rio de janeiro': 'America/Sao_Paulo',
    'brasília': 'America/Sao_Paulo',
    'brasilia': 'America/Sao_Paulo',
    'brasil': 'America/Sao_Paulo',
    'londres': 'Europe/London',
    'paris': 'Europe/Paris',
    'nova york': 'America/New_York',
    'new york': 'America/New_York',
    'tóquio': 'Asia/Tokyo',
    'tokyo': 'Asia/Tokyo'
  };

  let timezone = 'Europe/Lisbon';
  let cidadeNome = 'Lisboa';

  for (const [cidade, tz] of Object.entries(cidades)) {
    if (queryLower.includes(cidade)) {
      timezone = tz;
      cidadeNome = cidade.charAt(0).toUpperCase() + cidade.slice(1);
      break;
    }
  }

  try {
    const now = new Date();
    const hora = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: timezone
    });
    const diaSemana = now.toLocaleDateString('pt-BR', {
      weekday: 'long', timeZone: timezone
    });
    const dataCompleta = now.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: timezone
    });
    console.log(`🕐 Hora obtida via Intl API: ${hora} em ${cidadeNome}`);
    return `Agora em ${cidadeNome} são exatamente ${hora}, ${diaSemana}, ${dataCompleta}.`;
  } catch (err) {
    console.error("Erro ao formatar hora:", err);
    const now = new Date();
    return `Agora são ${now.toLocaleTimeString('pt-BR')} (horário do servidor).`;
  }
}

// ======================================================================
// CHAMADA GOOGLE SEARCH (isolada para reuso em requery)
// ======================================================================
async function executeGoogleSearch(query, traceId) {
  const url = "https://www.googleapis.com/customsearch/v1?" +
    new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CX,
      q: query,
      num: 3
    });

  console.log(`🌐 [SEARCH][${traceId}] provider=GoogleCSE, query="${query}"`);

  const response = await fetch(url);
  const data = await response.json();

  // Log de status
  const resultsCount = data.items?.length || 0;
  const status = response.ok ? 'OK' : `ERROR_${response.status}`;
  console.log(`🌐 [SEARCH][${traceId}] status=${status}, results_count=${resultsCount}`);

  // Verificar erros de API (quota, auth, etc)
  if (data.error) {
    console.error(`❌ [SEARCH][${traceId}] API_ERROR:`, data.error.message);
    return { success: false, error: data.error.message, items: [] };
  }

  return { success: true, items: data.items || [], raw: data };
}

// ======================================================================
// 🔍 FUNÇÃO PRINCIPAL
// NUNCA retorna vazio. SEMPRE responde com algo útil.
// ======================================================================
export async function buscarNaWeb(rawQuery) {
  const traceId = generateTraceId();

  try {
    // Input
    const textoQuery = typeof rawQuery === "string" ? rawQuery.trim() : JSON.stringify(rawQuery || "");

    if (!textoQuery) {
      console.log(`🔍 [SEARCH][${traceId}] final_strategy=ASK_CLARIFY, reason=empty_input`);
      return "Preciso de algo para pesquisar. Pode me dizer o que você quer saber?";
    }

    // Normalizar erros de voz
    let normalizedQuery = textoQuery.toLowerCase()
      .replace(/contração/g, 'cotação')
      .replace(/ave o/g, 'aveiro')
      .replace(/oiá/g, 'oiã');

    // Verificar se é pergunta de hora
    const timeResponse = handleTimeQuery(normalizedQuery);
    if (timeResponse) {
      console.log(`🔍 [SEARCH][${traceId}] final_strategy=TIME_API`);
      return timeResponse;
    }

    // Verificar chaves de API
    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      console.warn(`⚠️ [SEARCH][${traceId}] API_KEYS_MISSING`);
      console.log(`🔍 [SEARCH][${traceId}] final_strategy=FALLBACK, reason=no_api_keys`);
      return (
        "Não consegui acessar a busca em tempo real agora, mas posso responder com base no meu conhecimento. " +
        "O que exatamente você quer saber sobre isso?"
      );
    }

    // =============================================
    // PASSO 1: Usar QueryBuilder para limpar query
    // =============================================
    const queryResult = buildSearchQuery(textoQuery);
    let searchQuery = queryResult.query;

    if (!searchQuery || searchQuery.length < 3) {
      console.log(`🔍 [SEARCH][${traceId}] final_strategy=ASK_CLARIFY, reason=query_too_short`);
      return "Não entendi bem o que você quer pesquisar. Pode reformular de forma mais direta?";
    }

    // =============================================
    // PASSO 2: Primeira tentativa de busca
    // =============================================
    let result = await executeGoogleSearch(searchQuery, traceId);

    // =============================================
    // PASSO 3: Requery se zero results
    // =============================================
    if (result.success && result.items.length === 0) {
      console.log(`🔄 [SEARCH][${traceId}] fallback_requery=YES`);

      const requery = generateRequeryQuery(searchQuery);
      if (requery !== searchQuery) {
        console.log(`🔄 [SEARCH][${traceId}] requery="${requery}"`);
        result = await executeGoogleSearch(requery, traceId);
      }
    }

    // =============================================
    // PASSO 4: Formatar resposta ou fallback
    // =============================================
    if (result.success && result.items.length > 0) {
      console.log(`🔍 [SEARCH][${traceId}] final_strategy=TOOL`);

      let texto = `Encontrei informações atualizadas:\n\n`;
      result.items.forEach((item) => {
        texto += `📌 ${item.title || "Sem título"}\n`;
        texto += `${item.snippet || "Sem descrição."}\n\n`;
      });
      return texto.trim();
    }

    // Sem resultados mesmo após requery
    console.log(`🔍 [SEARCH][${traceId}] final_strategy=FALLBACK, reason=zero_results`);
    return (
      `Não encontrei resultados diretos para "${queryResult.query}" na web agora. ` +
      `Posso responder com base no meu conhecimento geral sobre o assunto, ou você pode reformular a pergunta de outra forma?`
    );

  } catch (err) {
    console.error(`❌ [SEARCH][${traceId}] EXCEPTION:`, err);
    console.log(`🔍 [SEARCH][${traceId}] final_strategy=FALLBACK, reason=exception`);

    return (
      "Tive um problema técnico ao fazer a busca agora. " +
      "Mas posso tentar te ajudar com o que eu sei. O que você quer saber?"
    );
  }
}

export default { buscarNaWeb };
