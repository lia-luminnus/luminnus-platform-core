// ======================================================================
// 🧹 TTS SANITIZER - Remove metadados e emojis do texto para voz
// ======================================================================

/**
 * Sanitiza texto para TTS, removendo:
 * - Expressões entre asteriscos (*sorriso*)
 * - Expressões entre parênteses ((sorrindo))
 * - Descrições de emojis ("Rosto piscando")
 * - Metadados técnicos ("Emotion:", "Intensity:")
 * - Emojis unicode
 */
export function sanitizeForTTS(text: string): string {
    if (!text) return '';

    let sanitized = text;

    // 1. Remove bloco "Chave que abre ... Chave que fecha"
    sanitized = sanitized.replace(
        /Chave\s+que\s+abre[\s\S]*?Chave\s+que\s+fecha[.,!?]?\s*/gi,
        ''
    );

    // 2. Remove expressões entre asteriscos (*sorriso*, *pensando*)
    sanitized = sanitized.replace(/\*[^*]+\*/g, '');

    // 3. Remove expressões entre parênteses relacionadas a gestos
    sanitized = sanitized.replace(/\([^)]*sorri[^)]*\)/gi, '');
    sanitized = sanitized.replace(/\([^)]*pisca[^)]*\)/gi, '');
    sanitized = sanitized.replace(/\([^)]*acena[^)]*\)/gi, '');

    // 4. Remove descrições literais de emojis
    sanitized = sanitized.replace(/Rosto\s+(piscando|sorrindo|feliz|triste|pensando|bravo)[.,!?]?\s*/gi, '');
    sanitized = sanitized.replace(/Carinha\s+(feliz|triste|sorrindo|piscando)[.,!?]?\s*/gi, '');
    sanitized = sanitized.replace(/Emoji\s+de\s+\w+[.,!?]?\s*/gi, '');
    sanitized = sanitized.replace(/Expressão\s+(de\s+)?\w+[.,!?]?\s*/gi, '');
    sanitized = sanitized.replace(/Olho\s+piscando[.,!?]?\s*/gi, '');
    sanitized = sanitized.replace(/Sorriso\s+largo[.,!?]?\s*/gi, '');

    // 5. Remove palavras isoladas de metadados
    sanitized = sanitized.replace(/\b(Sorriso|Piscando|Expressão|Emotion|Intensity|Should Blink|Should Speak)\b[.,!?]?\s*/gi, '');

    // 6. Remove metadados técnicos
    sanitized = sanitized
        .replace(/Emotion[,:]?\s*\w+[.,]?\s*/gi, '')
        .replace(/Intensity[,:]?\s*[\d.]+[.,]?\s*/gi, '')
        .replace(/Should\s*Speak[,:]?\s*\w+[.,]?\s*/gi, '')
        .replace(/Should\s*Blink[,:]?\s*\w+[.,]?\s*/gi, '');

    // 7. Remove emojis unicode
    sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]/gu, ''); // Emoticons
    sanitized = sanitized.replace(/[\u{1F300}-\u{1F5FF}]/gu, ''); // Misc Symbols
    sanitized = sanitized.replace(/[\u{1F680}-\u{1F6FF}]/gu, ''); // Transport
    sanitized = sanitized.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, ''); // Flags
    sanitized = sanitized.replace(/[\u{2600}-\u{26FF}]/gu, '');   // Misc symbols
    sanitized = sanitized.replace(/[\u{2700}-\u{27BF}]/gu, '');   // Dingbats

    // 8. Limpar espaços extras
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
}

