/**
 * Sanitiza texto para TTS, removendo:
 * - Expressões entre asteriscos (*sorriso*)
 * - Expressões entre parênteses ((sorrindo))
 * - Descrições de emojis ("Rosto piscando")
 * - Metadados técnicos ("Emotion:", "Intensity:")
 * - Emojis unicode
 */
export declare function sanitizeForTTS(text: string): string;
//# sourceMappingURL=ttsSanitizer.d.ts.map