// ======================================================================
// 💱 EXCHANGE RATE - Cotações REAIS e Atualizadas
// ======================================================================
// API: exchangerate-api.com (gratuita, 1500 requests/mês)
// Sempre retorna dados atualizados em tempo real
// ======================================================================

import fetch from "node-fetch";

const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest";

// ======================================================================
// 💱 FUNÇÃO 1: OBTER COTAÇÃO REAL
// ======================================================================
export async function getExchangeRate(fromCurrency = 'USD', toCurrency = 'BRL') {
  try {
    // Normalizar para maiúsculas
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    
    console.log(`💱 Buscando cotação: ${from} → ${to}`);
    
    // Buscar cotações baseadas na moeda de origem
    const url = `${EXCHANGE_API_URL}/${from}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Verificar se a moeda de destino existe
    if (!data.rates || !data.rates[to]) {
      return `Não encontrei a cotação de ${from} para ${to}.`;
    }
    
    const rate = data.rates[to];
    const date = new Date(data.date).toLocaleDateString('pt-BR');
    
    // Formatar resposta natural
    let response_text = '';
    
    if (from === 'USD' && to === 'BRL') {
      response_text = `O dólar está R$ ${rate.toFixed(2)} hoje (${date}).`;
    } else if (from === 'EUR' && to === 'BRL') {
      response_text = `O euro está R$ ${rate.toFixed(2)} hoje (${date}).`;
    } else if (from === 'BRL' && to === 'USD') {
      response_text = `R$ 1 vale US$ ${rate.toFixed(4)} hoje (${date}).`;
    } else {
      response_text = `1 ${from} = ${rate.toFixed(4)} ${to} (${date}).`;
    }
    
    console.log(`✅ Cotação obtida: ${response_text}`);
    return response_text;
    
  } catch (err) {
    console.error("❌ Erro ao buscar cotação:", err.message);
    return "Não consegui buscar a cotação agora. Tente de novo em alguns instantes.";
  }
}

// ======================================================================
// 💱 FUNÇÃO 2: DETECTAR MOEDAS NO TEXTO
// ======================================================================
export function detectCurrencies(text) {
  const textLower = text.toLowerCase();
  
  const currencies = {
    from: 'USD',
    to: 'BRL'
  };
  
  // Padrões comuns de perguntas sobre cotação
  const patterns = {
    // "dólar para real", "dólar em real"
    dolarParaReal: /d[óo]lar.*(para|em|pra).*(real|reais|brl)/i,
    euroParaReal: /euro.*(para|em|pra).*(real|reais|brl)/i,
    libraParaReal: /libra.*(para|em|pra).*(real|reais|brl)/i,
    
    // "quanto está o dólar", "valor do dólar"
    valorDolar: /(quanto|valor|cota[çc][ãa]o).*(d[óo]lar)/i,
    valorEuro: /(quanto|valor|cota[çc][ãa]o).*(euro)/i,
    valorLibra: /(quanto|valor|cota[çc][ãa]o).*(libra)/i,
    valorIene: /(quanto|valor|cota[çc][ãa]o).*(iene|yen)/i,
  };
  
  // Detectar padrão específico
  if (patterns.dolarParaReal.test(text) || patterns.valorDolar.test(text)) {
    currencies.from = 'USD';
    currencies.to = 'BRL';
  } 
  else if (patterns.euroParaReal.test(text) || patterns.valorEuro.test(text)) {
    currencies.from = 'EUR';
    currencies.to = 'BRL';
  } 
  else if (patterns.libraParaReal.test(text) || patterns.valorLibra.test(text)) {
    currencies.from = 'GBP';
    currencies.to = 'BRL';
  }
  else if (patterns.valorIene.test(text)) {
    currencies.from = 'JPY';
    currencies.to = 'BRL';
  }
  // Se menciona "dólar" e "euro" juntos
  else if (textLower.includes('dólar') && textLower.includes('euro')) {
    currencies.from = 'EUR';
    currencies.to = 'USD';
  }
  // Detectar moeda de origem individualmente
  else if (textLower.includes('dólar') || textLower.includes('dolar')) {
    currencies.from = 'USD';
    currencies.to = 'BRL';
  } 
  else if (textLower.includes('euro')) {
    currencies.from = 'EUR';
    currencies.to = 'BRL';
  } 
  else if (textLower.includes('libra')) {
    currencies.from = 'GBP';
    currencies.to = 'BRL';
  } 
  else if (textLower.includes('iene') || textLower.includes('yen')) {
    currencies.from = 'JPY';
    currencies.to = 'BRL';
  } 
  else if (textLower.includes('peso')) {
    currencies.from = 'ARS';
    currencies.to = 'BRL';
  }
  
  console.log(`🔍 Moedas detectadas: ${currencies.from} → ${currencies.to}`);
  return currencies;
}

// ======================================================================
// 💱 FUNÇÃO 3: BUSCAR COTAÇÃO INTELIGENTE
// ======================================================================
export async function getExchangeRateSmart(query) {
  try {
    console.log(`🤖 Processando query: "${query}"`);
    
    // Detecta as moedas automaticamente no texto
    const { from, to } = detectCurrencies(query);
    
    // Busca a cotação real
    const result = await getExchangeRate(from, to);
    
    return result;
    
  } catch (err) {
    console.error("❌ Erro na busca inteligente:", err.message);
    return "Erro ao buscar cotação.";
  }
}

// ======================================================================
// 📤 EXPORTS
// ======================================================================
export default {
  getExchangeRate,
  getExchangeRateSmart,
  detectCurrencies
};