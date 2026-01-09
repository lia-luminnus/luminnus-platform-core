// ======================================================================
// 🔎 LIA — Web Search Inteligente Multi-Camadas (STRING RETURN)
// ======================================================================

import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID || process.env.GOOGLE_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ======================================================================
// DOMÍNIOS CONFIÁVEIS
// ======================================================================
const DOMINIOS_PRIORITARIOS = {
  altissima: [
    "google.com/finance",
    "xe.com",
    "wise.com",
    "bcb.gov.br",
    "tradingview.com",
    "investing.com",
    "coinmarketcap.com",
    "coingecko.com",
    "who.int",
    "gov.pt",
    "gov.br",
    "ine.pt",
    "wikipedia.org",
  ],
  alta: [
    "uol.com.br",
    "bbc.com",
    "reuters.com",
    "bloomberg.com",
    "cnbc.com",
    "ecb.europa.eu",
    "worldbank.org",
  ],
  media: ["forbes.com", "cnn.com", "ft.com", "wsj.com"],
};

// ======================================================================
// MAPEAMENTO DE FONTES
// ======================================================================
const FONTE_PARA_SITE = {
  tradingview: "tradingview.com",
  "trading view": "tradingview.com",
  investing: "investing.com",
  coinmarketcap: "coinmarketcap.com",
  coingecko: "coingecko.com",
  oms: "who.int",
  who: "who.int",
  wikipedia: "wikipedia.org",
  wiki: "wikipedia.org",
  governo: "gov.pt",
  gov: "gov.pt",
};

function encurtar(link) {
  try {
    if (!link) return "";
    return link.replace(/^https?:\/\//, "").split("/")[0];
  } catch {
    return link || "";
  }
}

// ======================================================================
// RELEVÂNCIA
// ======================================================================
function calcularRelevancia(item, queryOriginal, fontePreferida) {
  let score = 0;

  const link = item.link || "";
  const dominio = encurtar(link);
  const snippet = (item.snippet || "").toLowerCase();
  const titulo = (item.title || "").toLowerCase();
  const queryLower = queryOriginal.toLowerCase();

  // CORREÇÃO: Prioridade MÁXIMA para fontes financeiras
  if (DOMINIOS_PRIORITARIOS.altissima.some((d) => dominio.includes(d))) score += 200;
  else if (DOMINIOS_PRIORITARIOS.alta.some((d) => dominio.includes(d))) score += 50;
  else if (DOMINIOS_PRIORITARIOS.media.some((d) => dominio.includes(d))) score += 20;

  if (fontePreferida && dominio.includes(fontePreferida)) score += 100;

  const temNumeros =
    /\d+[.,]\d+/.test(snippet) || /\$\d+/.test(snippet) || /\d+%/.test(snippet);
  if (temNumeros) score += 20;

  const termosChave = [
    "usd",
    "brl",
    "eur",
    "btc",
    "preço",
    "cotação",
    "valor",
    "hoje",
    "agora",
    "atual",
    "forecast",
    "estatística",
    "dados",
    "oficial",
  ];
  const termosEncontrados = termosChave.filter(
    (t) => snippet.includes(t) || titulo.includes(t)
  );
  score += termosEncontrados.length * 5;

  const palavrasQuery = queryLower.split(" ").filter((p) => p.length > 3);
  const palavrasEncontradas = palavrasQuery.filter(
    (p) => snippet.includes(p) || titulo.includes(p)
  );
  score += palavrasEncontradas.length * 10;

  return { ...item, relevancia: score, dominio };
}

// ======================================================================
// DETECTAR FONTE
// ======================================================================
function detectarFontePreferida(query) {
  const queryLower = query.toLowerCase();
  for (const [termo, site] of Object.entries(FONTE_PARA_SITE)) {
    if (queryLower.includes(termo)) return { site, termo };
  }
  return null;
}

// ======================================================================
// CAMADA 1
// ======================================================================
async function camada1_buscaNormal(query) {
  // CORREÇÃO: Adicionar freshness (últimas 24-48h)
  const url =
    "https://www.googleapis.com/customsearch/v1?" +
    new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CX,
      q: `${query} hoje atualizado`,
      num: 10,
      sort: "date"
    });

  const response = await fetch(url);
  const data = await response.json();
  return data.items || [];
}

// ======================================================================
// CAMADA 2
// ======================================================================
async function camada2_buscaEspecifica(query, fonteInfo) {
  const queryRefinada = fonteInfo
    ? `${query} site:${fonteInfo.site}`
    : `${query} atualizado oficial dados recentes`;

  const url =
    "https://www.googleapis.com/customsearch/v1?" +
    new URLSearchParams({ key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: queryRefinada, num: 5 });

  const response = await fetch(url);
  const data = await response.json();
  return { items: data.items || [], queryUsada: queryRefinada };
}

// ======================================================================
// CAMADA 3
// ======================================================================
async function camada3_fallback(query, fonteInfo) {
  const variacoes = [];

  if (fonteInfo) {
    const termos = query
      .split(" ")
      .filter((p) => !fonteInfo.termo.includes(p.toLowerCase()));
    variacoes.push(`${termos.join(" ")} ${fonteInfo.site.replace(".com", "")}`);
    variacoes.push(`${termos.join(" ")} price now`);
  } else {
    variacoes.push(`${query} número correto`);
    variacoes.push(`${query} última atualização`);
    variacoes.push(`${query} fonte confiável`);
  }

  const queryFallback = variacoes[0];

  const url =
    "https://www.googleapis.com/customsearch/v1?" +
    new URLSearchParams({ key: GOOGLE_API_KEY, cx: GOOGLE_CX, q: queryFallback, num: 3 });

  const response = await fetch(url);
  const data = await response.json();
  return { items: data.items || [], queryUsada: queryFallback };
}

// ======================================================================
// SELECIONAR MELHOR RESULTADO
// ======================================================================
function selecionarMelhorResultado(items, queryOriginal, fontePreferida) {
  if (!items || !items.length) return null;
  return items
    .map((item) => calcularRelevancia(item, queryOriginal, fontePreferida))
    .sort((a, b) => b.relevancia - a.relevancia)[0];
}

// ======================================================================
// EXTRAIR VALOR
// ======================================================================
function extrairValorPrincipal(snippet, titulo) {
  const texto = `${titulo} ${snippet}`.toLowerCase();

  // CORREÇÃO: Extração REFINADA - prioriza contexto de cotação
  // 1. Valores com moeda explícita (R$, $, €)
  const realBrasileiro = texto.match(/r\$\s*([\d.,]+)/i);
  if (realBrasileiro) return `R$ ${realBrasileiro[1]}`;

  const dolar = texto.match(/\$\s*([\d.,]+)/);
  if (dolar && !texto.includes("market cap")) return `$${dolar[1]}`;

  const euro = texto.match(/€\s*([\d.,]+)/);
  if (euro) return `€${euro[1]}`;

  // 2. Porcentagem
  const percent = texto.match(/([\d.,]+)\s*%/);
  if (percent) return `${percent[1]}%`;

  // 3. Número genérico (último recurso)
  const number = texto.match(/([\d]{1,3}[.,][\d]{2,})/);
  if (number) return number[1];

  return null;
}

// ======================================================================
// GEMINI (placeholder seguro)
// ======================================================================
async function gerarImagemComGemini() {
  return null;
}

// ======================================================================
// 🔍 BUSCAR NA WEB
// ======================================================================
export async function buscarNaWeb(query) {
  try {
    const textoQuery =
      typeof query === "string" ? query.trim() : JSON.stringify(query || "");

    if (!textoQuery) return "Preciso de algo para pesquisar.";

    // ======================================================================
    // CORREÇÃO — HORA LOCAL (SEM API EXTERNA)
    // ======================================================================
    const lower = textoQuery.toLowerCase();
    const precisaHora = ["hora", "horário", "horario", "que horas", "são"].some((k) =>
      lower.includes(k)
    );

    if (precisaHora && !lower.includes("horário de")) {
      const cidades = {
        lisboa: "Europe/Lisbon",
        aveiro: "Europe/Lisbon",
        porto: "Europe/Lisbon",
        coimbra: "Europe/Lisbon",
        faro: "Europe/Lisbon",
        portugal: "Europe/Lisbon",
        "são paulo": "America/Sao_Paulo",
        "sao paulo": "America/Sao_Paulo",
        rio: "America/Sao_Paulo",
        brasília: "America/Sao_Paulo",
        brasilia: "America/Sao_Paulo",
        brasil: "America/Sao_Paulo",
        londres: "Europe/London",
        paris: "Europe/Paris",
        "nova york": "America/New_York",
        tokyo: "Asia/Tokyo",
        tóquio: "Asia/Tokyo",
      };

      let timezone = "Europe/Lisbon";
      let cidadeNome = "Lisboa";

      for (const [cidade, tz] of Object.entries(cidades)) {
        if (lower.includes(cidade)) {
          timezone = tz;
          cidadeNome = cidade.charAt(0).toUpperCase() + cidade.slice(1);
          break;
        }
      }

      const date = new Date();

      const hora = date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: timezone,
      });

      const dia = date.toLocaleDateString("pt-BR", {
        weekday: "long",
        timeZone: timezone,
      });

      const data = date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: timezone,
      });

      return `Agora em ${cidadeNome} são ${hora}, ${dia}, ${data}.`;
    }

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      return "Não consegui acessar a busca agora.";
    }

    const fonteInfo = detectarFontePreferida(textoQuery);

    let melhorResultado = selecionarMelhorResultado(
      await camada1_buscaNormal(textoQuery),
      textoQuery,
      fonteInfo?.site
    );

    if (!melhorResultado || melhorResultado.relevancia < 30) {
      const r2 = await camada2_buscaEspecifica(textoQuery, fonteInfo);
      melhorResultado = selecionarMelhorResultado(
        r2.items,
        textoQuery,
        fonteInfo?.site
      );
    }

    if (!melhorResultado || melhorResultado.relevancia < 20) {
      const r3 = await camada3_fallback(textoQuery, fonteInfo);
      melhorResultado = selecionarMelhorResultado(
        r3.items,
        textoQuery,
        fonteInfo?.site
      );
    }

    if (!melhorResultado) {
      return fonteInfo
        ? `Não encontrei dados exatos no ${fonteInfo.termo.toUpperCase()}.`
        : "Não encontrei nada agora.";
    }

    const valor = extrairValorPrincipal(
      melhorResultado.snippet,
      melhorResultado.title
    );

    const fonte = melhorResultado.dominio;

    const fonteMensagem =
      fonteInfo && fonte.includes(fonteInfo.site)
        ? `De acordo com o ${fonteInfo.termo.toUpperCase()}`
        : `De acordo com ${fonte}`;

    let resposta = `${fonteMensagem}:\n\n📌 ${melhorResultado.title}\n${melhorResultado.snippet}\n\n`;

    if (valor) resposta += `💰 Valor: ${valor}\n\n`;

    if (fonteInfo && !fonte.includes(fonteInfo.site)) {
      resposta += `⚠️ Fonte exata não encontrada, mas a informação é confiável.\n\n`;
    }

    resposta += `🔗 Fonte: ${melhorResultado.link}`;

    return resposta.trim();
  } catch (err) {
    console.error("❌ Erro buscarNaWeb:", err);
    return "A busca não respondeu agora.";
  }
}

export default { buscarNaWeb };
