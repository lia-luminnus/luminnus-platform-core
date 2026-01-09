/**
 * SecurityService handles data masking and sensitive information protection.
 */
export class SecurityService {
    /**
     * Masks sensitive information in a string (Emails, Phones, Secrets, Keys)
     */
    static maskSensitiveData(content: string): string {
        let masked = content;

        // 1. Mask API Keys / Secrets (basic heuristic: AIza, sk-, etc)
        masked = masked.replace(/AIza[0-9A-Za-z-_]{35}/g, '[CHAVE_MASCARADA]');
        masked = masked.replace(/sk-[0-9A-Za-z]{48}/g, '[CHAVE_MASCARADA]');

        // 2. Mask Emails (keep first/last char)
        masked = masked.replace(/([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***@$2');

        // 3. Mask Phone Numbers (keep last 4 digits)
        masked = masked.replace(/(\+?\d{1,4})?[\s-]?(\(?\d{3}\)?)?[\s-]?\d{3}[\s-]?\d{4}/g, '***-***-$&'.slice(-4));

        // 4. Mask Long IDs / Hex codes (v1.1.1)
        masked = masked.replace(/\b([a-f0-9]{4})[a-f0-9]{12,}([a-f0-9]{4})\b/gi, '$1...$2');

        return masked;

    }
}
