/**
 * Padrões de texto que indicam RUÍDO (não deve ser salvo)
 */
export declare const NOISE_PATTERNS: string[];
/**
 * Padrões que indicam DURABILIDADE (pode ser salvo se outros critérios passarem)
 */
export declare const DURABILITY_SIGNALS: string[];
/**
 * Categorias válidas de memória cognitiva
 */
export declare const MEMORY_CATEGORIES: readonly ["identity", "family", "company", "business", "goals", "tools", "people", "preference", "address", "reminder", "misc"];
export type MemoryCategory = typeof MEMORY_CATEGORIES[number];
/**
 * Status possíveis de uma memória
 */
export declare const MEMORY_STATUS: readonly ["active", "deprecated", "deleted"];
export type MemoryStatus = typeof MEMORY_STATUS[number];
/**
 * Fontes possíveis de uma memória
 */
export declare const MEMORY_SOURCES: readonly ["explicit_user", "inferred", "system_admin"];
export type MemorySource = typeof MEMORY_SOURCES[number];
/**
 * Verifica se um texto contém padrões de ruído
 */
export declare function containsNoise(text: string): boolean;
/**
 * Verifica se um texto contém sinais de durabilidade
 */
export declare function hasDurabilitySignal(text: string): boolean;
/**
 * Avalia se um texto é digno de ser salvo como memória
 * Retorna: { worthy: boolean, reason: string, confidence: number }
 */
export declare function evaluateMemoryWorthiness(text: string): {
    worthy: boolean;
    reason: string;
    confidence: number;
};
/**
 * Alias para compatibilidade com código existente
 */
export declare function isMemoryWorthy(text: string): boolean;
/**
 * Extrai a key semântica de um texto (ex: "meu nome é João" → "nome_usuario")
 */
export declare function extractMemoryKey(text: string): string | null;
//# sourceMappingURL=memoryPolicy.d.ts.map