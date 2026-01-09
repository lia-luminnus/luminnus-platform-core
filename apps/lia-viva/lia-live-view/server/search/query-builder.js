// ======================================================================
// 🔍 QUERY BUILDER — Extrator inteligente de queries para busca
// ======================================================================
// Transforma comandos longos em queries curtas e eficazes.
// NUNCA rejeita por "texto grande". SEMPRE extrai a intenção.
// ======================================================================

/**
 * @typedef {'REALTIME' | 'FACT' | 'NAV' | 'UNKNOWN'} SearchIntent
 * @typedef {{ query: string, intent: SearchIntent, confidence: number, reason: string }} QueryResult
 */

// Gatilhos que indicam busca em tempo real
const REALTIME_TRIGGERS = [
    'agora', 'hoje', 'atual', 'atualizado', 'últimas', 'últimos',
    'cotação', 'preço', 'taxa', 'câmbio', 'dólar', 'euro', 'bitcoin',
    'notícias', 'noticias', 'ao vivo', 'em tempo real', 'neste momento',
    '2024', '2025', '2026', 'essa semana', 'este mês'
];

// Prefixos conversacionais para remover
const CONVERSATIONAL_PREFIXES = [
    'eu quero que você', 'eu quero que voce', 'quero que você', 'quero que voce',
    'você pode', 'voce pode', 'pode me', 'poderia me',
    'me traga', 'me traz', 'me dá', 'me da', 'me diga', 'me fala',
    'faz pra mim', 'faz para mim', 'faça pra mim', 'faça para mim',
    'pesquise', 'pesquisa', 'busque', 'busca', 'procure', 'procura',
    'verifique', 'verifica', 'confira', 'confere',
    'gostaria de saber', 'preciso saber', 'queria saber',
    'por favor', 'por gentileza'
];

// Palavras de pergunta que indicam o núcleo da query
const QUESTION_WORDS = [
    'qual', 'quais', 'quanto', 'quantos', 'quantas',
    'como', 'onde', 'quando', 'quem', 'porque', 'por que'
];

// Stopwords em português para remover na compressão
const STOPWORDS = [
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
    'para', 'pra', 'pro', 'pela', 'pelo', 'pelas', 'pelos',
    'que', 'se', 'é', 'e', 'ou', 'mas', 'com', 'sem',
    'está', 'estão', 'ser', 'sendo', 'foi', 'são',
    'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa',
    'esse', 'essa', 'este', 'esta', 'isso', 'isto',
    'aqui', 'ali', 'lá', 'cá', 'muito', 'pouco'
];

/**
 * Gera um ID de rastreamento único para logs
 * @returns {string}
 */
function generateTraceId() {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Limpa o texto removendo ruído e normalizando espaços
 * @param {string} text
 * @returns {string}
 */
function cleanText(text) {
    if (!text) return '';

    return text
        .replace(/<noise>/gi, '')
        .replace(/<[^>]+>/g, '') // Remove outras tags HTML
        .replace(/\s+/g, ' ')
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .trim();
}

/**
 * Remove prefixos conversacionais do texto
 * @param {string} text
 * @returns {string}
 */
function removeConversationalPrefixes(text) {
    let result = text.toLowerCase();

    for (const prefix of CONVERSATIONAL_PREFIXES) {
        if (result.startsWith(prefix)) {
            result = result.substring(prefix.length).trim();
        }
        // Também remove no meio se encontrar
        result = result.replace(new RegExp(`\\b${prefix}\\b`, 'gi'), ' ');
    }

    return result.replace(/\s+/g, ' ').trim();
}

/**
 * Extrai a sentença mais informativa do texto usando pontuação
 * @param {string} text
 * @returns {string}
 */
function extractKeyQuestion(text) {
    // Dividir em sentenças
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);

    if (sentences.length === 0) return text;
    if (sentences.length === 1) return sentences[0];

    // Padrões de negação/correção que indicam uma frase de contexto, não a pergunta principal
    const negationPrefixes = ['não', 'nao', 'errado', 'incorreto', 'mentira', 'falso', 'nem'];

    // Pontuar cada sentença
    const scored = sentences.map((sentence, idx) => {
        const lower = sentence.toLowerCase();
        let score = 0;

        // +3 se contiver palavra de pergunta
        if (QUESTION_WORDS.some(q => lower.includes(q))) score += 3;

        // +2 se contiver gatilho de tempo real (moeda, cotação, etc)
        if (REALTIME_TRIGGERS.some(t => lower.includes(t))) score += 2;

        // -2 se começar com negação (é uma correção, não a pergunta)
        if (negationPrefixes.some(neg => lower.startsWith(neg + ',') || lower.startsWith(neg + ' '))) score -= 2;

        // +1 para sentenças mais ao final (geralmente a pergunta principal)
        score += idx * 0.5;

        return { sentence, score };
    });

    // Ordenar por pontuação decrescente
    scored.sort((a, b) => b.score - a.score);

    return scored[0].sentence;
}

/**
 * Comprime a query para 8-14 palavras mantendo entidades e tempo
 * @param {string} text
 * @returns {string}
 */
function compressQuery(text) {
    const words = text.toLowerCase().split(/\s+/);

    // Filtrar stopwords mas manter entidades importantes
    const filtered = words.filter(word => {
        // Manter números e moedas
        if (/\d/.test(word)) return true;
        // Manter palavras capitalizadas (nomes próprios)
        if (/^[A-Z]/.test(word)) return true;
        // Manter gatilhos de tempo real
        if (REALTIME_TRIGGERS.some(t => word.includes(t))) return true;
        // Remover stopwords
        if (STOPWORDS.includes(word)) return false;
        // Manter palavras com mais de 2 caracteres
        return word.length > 2;
    });

    // Limitar a 14 palavras
    const limited = filtered.slice(0, 14);

    return limited.join(' ');
}

/**
 * Detecta a intenção da busca
 * @param {string} text
 * @returns {SearchIntent}
 */
function detectIntent(text) {
    const lower = text.toLowerCase();

    // Verificar gatilhos de tempo real
    if (REALTIME_TRIGGERS.some(t => lower.includes(t))) {
        return 'REALTIME';
    }

    // Verificar navegação (endereços, rotas)
    if (/como chegar|rota|caminho|direções|perto de|próximo/.test(lower)) {
        return 'NAV';
    }

    // Verificar fatos gerais
    if (QUESTION_WORDS.some(q => lower.includes(q))) {
        return 'FACT';
    }

    return 'UNKNOWN';
}

/**
 * Constrói uma query otimizada para busca a partir do texto do usuário
 * @param {string} userText - Texto bruto do usuário
 * @param {string} locale - Locale (padrão: 'pt')
 * @returns {QueryResult}
 */
export function buildSearchQuery(userText, locale = 'pt') {
    const traceId = generateTraceId();
    const rawLength = userText?.length || 0;

    console.log(`🔍 [SEARCH][${traceId}] raw_input_chars=${rawLength}, raw_input_preview="${(userText || '').substring(0, 80)}..."`);

    // Passo 1: Limpeza básica
    let cleaned = cleanText(userText);

    if (!cleaned) {
        console.log(`🔍 [SEARCH][${traceId}] built_query="", intent=UNKNOWN, confidence=0, reason="empty_input"`);
        return {
            query: '',
            intent: 'UNKNOWN',
            confidence: 0,
            reason: 'empty_input'
        };
    }

    // Passo 2: Remover prefixos conversacionais
    const withoutPrefixes = removeConversationalPrefixes(cleaned);

    // Passo 3: Extrair a pergunta/sentença chave
    const keyQuestion = extractKeyQuestion(withoutPrefixes);

    // Passo 4: Comprimir para query curta
    const compressed = compressQuery(keyQuestion);

    // Passo 5: Detectar intent
    const intent = detectIntent(keyQuestion);

    // Calcular confiança baseada na qualidade da extração
    let confidence = 0.5;
    let reason = 'extracted_from_text';

    if (compressed.length > 10 && compressed.split(' ').length >= 2) {
        confidence = 0.8;
        reason = 'good_extraction';
    }

    if (intent === 'REALTIME') {
        confidence = Math.min(confidence + 0.15, 1.0);
        reason = 'realtime_query';
    }

    // Se a query ficou muito curta, usar mais do texto original
    let finalQuery = compressed;
    if (compressed.split(' ').length < 2 && keyQuestion.length > 10) {
        finalQuery = keyQuestion.substring(0, 100);
        reason = 'fallback_to_key_question';
        confidence = 0.6;
    }

    console.log(`🔍 [SEARCH][${traceId}] built_query="${finalQuery}", intent=${intent}, confidence=${confidence.toFixed(2)}, reason="${reason}"`);

    return {
        query: finalQuery,
        intent,
        confidence,
        reason
    };
}

/**
 * Gera uma versão mais genérica da query para requery
 * @param {string} originalQuery
 * @returns {string}
 */
export function generateRequeryQuery(originalQuery) {
    // Remover localização e palavras de tempo para busca mais ampla
    const simplified = originalQuery
        .replace(/\b(portugal|brasil|aveiro|lisboa|são paulo|porto)\b/gi, '')
        .replace(/\b(agora|hoje|atual|atualizado)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Se ficou muito curto, manter original
    if (simplified.split(' ').length < 2) {
        return originalQuery;
    }

    return simplified;
}

export default { buildSearchQuery, generateRequeryQuery };
