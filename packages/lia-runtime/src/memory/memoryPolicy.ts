// ======================================================================
// 🧠 MEMORY POLICY - Regras de Memória Cognitiva (SSOT)
// ======================================================================
// Single Source of Truth para Admin e Dashboard-client
// Centraliza todas as regras de validação de memória
// ======================================================================

/**
 * Padrões de texto que indicam RUÍDO (não deve ser salvo)
 */
export const NOISE_PATTERNS = [
    // Confirmações
    'ok', 'blz', 'beleza', 'certo', 'entendi', 'entendido', 'combinado',
    'tá bom', 'ta bom', 'legal', 'show', 'perfeito', 'valeu', 'vlw',
    // Small talk
    'bom dia', 'boa tarde', 'boa noite', 'olá', 'oi', 'e aí', 'eai',
    'tudo bem', 'como vai', 'como você está',
    // Esperas
    'estou esperando', 'tô esperando', 'aguardando', 'pode continuar',
    // Fillers
    'hmm', 'hum', 'uhum', 'aham', 'né', 'tipo',
];

/**
 * Padrões que indicam DURABILIDADE (pode ser salvo se outros critérios passarem)
 */
export const DURABILITY_SIGNALS = [
    'sempre', 'nunca', 'prefiro', 'gosto de', 'não gosto de', 'odeio', 'amo',
    'meu nome', 'minha empresa', 'minha esposa', 'minha família', 'meu', 'minha',
    'nosso processo', 'nossa regra', 'prazo', 'política', 'padrão',
    'trabalho com', 'trabalho na', 'moro em', 'moro na', 'nasci em',
    'meu cargo', 'sou', 'tenho', 'fundei', 'criei',
];

/**
 * Categorias válidas de memória cognitiva
 */
export const MEMORY_CATEGORIES = [
    'identity',      // Nome, estilo, fuso (antigo personal)
    'family',        // Família
    'company',       // Info da empresa
    'business',      // Regras de negócio, segmento
    'goals',         // Metas e KPIs
    'tools',         // Sistemas e integrações
    'people',        // Contatos e papéis
    'preference',    // Gostos e restrições
    'address',       // Endereços
    'reminder',      // Lembretes
    'misc',          // Outros
] as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[number];

/**
 * Status possíveis de uma memória
 */
export const MEMORY_STATUS = ['active', 'deprecated', 'deleted'] as const;
export type MemoryStatus = typeof MEMORY_STATUS[number];

/**
 * Fontes possíveis de uma memória
 */
export const MEMORY_SOURCES = ['explicit_user', 'inferred', 'system_admin'] as const;
export type MemorySource = typeof MEMORY_SOURCES[number];

/**
 * Verifica se um texto contém padrões de ruído
 */
export function containsNoise(text: string): boolean {
    const lowerText = text.toLowerCase().trim();
    return NOISE_PATTERNS.some(pattern => {
        // Match exato ou como parte de frase curta
        return lowerText === pattern ||
            (lowerText.length < 30 && lowerText.includes(pattern));
    });
}

/**
 * Verifica se um texto contém sinais de durabilidade
 */
export function hasDurabilitySignal(text: string): boolean {
    const lowerText = text.toLowerCase();
    return DURABILITY_SIGNALS.some(signal => lowerText.includes(signal));
}

/**
 * Avalia se um texto é digno de ser salvo como memória
 * Retorna: { worthy: boolean, reason: string, confidence: number }
 */
export function evaluateMemoryWorthiness(text: string): {
    worthy: boolean;
    reason: string;
    confidence: number;
} {
    const trimmed = text.trim();

    // Regra 1: Texto muito curto
    if (trimmed.length < 20) {
        return { worthy: false, reason: 'too_short', confidence: 0 };
    }

    // Regra 2: É ruído
    if (containsNoise(trimmed)) {
        return { worthy: false, reason: 'noise_pattern', confidence: 0 };
    }

    // Regra 3: É pergunta
    const lowerText = trimmed.toLowerCase();
    if (trimmed.includes('?') ||
        lowerText.startsWith('qual') ||
        lowerText.startsWith('quem') ||
        lowerText.startsWith('onde') ||
        lowerText.startsWith('quando') ||
        lowerText.startsWith('como') ||
        lowerText.startsWith('o que')) {
        return { worthy: false, reason: 'question', confidence: 0 };
    }

    // Regra 4: Tem sinal de durabilidade → Alta confiança
    if (hasDurabilitySignal(trimmed)) {
        return { worthy: true, reason: 'durability_signal', confidence: 0.9 };
    }

    // Regra 5: Texto médio sem sinais claros → Baixa confiança (perguntar ao usuário)
    if (trimmed.length >= 40 && trimmed.length < 100) {
        return { worthy: true, reason: 'medium_text', confidence: 0.4 };
    }

    // Regra 6: Texto longo sem sinais → Média confiança
    if (trimmed.length >= 100) {
        return { worthy: true, reason: 'long_text', confidence: 0.6 };
    }

    // Default: Não salvar
    return { worthy: false, reason: 'no_clear_signal', confidence: 0.2 };
}

/**
 * Alias para compatibilidade com código existente
 */
export function isMemoryWorthy(text: string): boolean {
    return evaluateMemoryWorthiness(text).worthy;
}

/**
 * Extrai a key semântica de um texto (ex: "meu nome é João" → "nome_usuario")
 */
export function extractMemoryKey(text: string): string | null {
    const lowerText = text.toLowerCase();

    const keyPatterns: [RegExp, string][] = [
        [/meu nome (?:é|e|eh) /i, 'nome_usuario'],
        [/me chamo /i, 'nome_usuario'],
        [/minha empresa (?:é|e|eh|se chama) /i, 'empresa'],
        [/trabalho n[ao] /i, 'empresa'],
        [/fundei a? /i, 'empresa'],
        [/moro em /i, 'localizacao'],
        [/moro n[ao] /i, 'localizacao'],
        [/minha esposa /i, 'familia_esposa'],
        [/meu marido /i, 'familia_marido'],
        [/tenho \d+ anos/i, 'idade'],
        [/nasci em /i, 'nascimento'],
        [/meu cargo /i, 'cargo'],
        [/sou /i, 'cargo'],
        [/meu email /i, 'email_usuario'],
        [/meu telefone /i, 'telefone'],
        [/prefiro /i, 'preferencia'],
        [/não gosto de /i, 'restricao'],
        [/odeio /i, 'restricao'],
    ];

    for (const [pattern, key] of keyPatterns) {
        if (pattern.test(lowerText)) {
            return key;
        }
    }

    return null;
}
