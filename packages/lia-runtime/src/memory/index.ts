// ======================================================================
// 🧠 MEMORY MODULE - Exports
// ======================================================================

export {
    // Policy
    NOISE_PATTERNS,
    DURABILITY_SIGNALS,
    MEMORY_CATEGORIES,
    MEMORY_STATUS,
    MEMORY_SOURCES,
    containsNoise,
    hasDurabilitySignal,
    evaluateMemoryWorthiness,
    isMemoryWorthy,
    extractMemoryKey,
} from './memoryPolicy.js';

export type {
    MemoryCategory,
    MemoryStatus,
    MemorySource,
} from './memoryPolicy.js';
