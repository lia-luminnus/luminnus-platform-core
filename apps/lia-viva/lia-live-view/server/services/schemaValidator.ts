/**
 * ==============================================
 * SCHEMA VALIDATOR SERVICE
 * Validação JSON Schema (AJV) + Hard Rules
 * ==============================================
 */

interface ValidationResult {
    valid: boolean;
    errors: string[];
    sanitizedData: any;
    secretsDetected: boolean;
    secretsMasked: string[];
}

interface HardRule {
    name: string;
    pattern: RegExp;
    message: string;
    severity: 'block' | 'mask';
}

/**
 * Serviço de Validação de Schema e Regras de Segurança
 */
export class SchemaValidator {

    // Padrões de segredos para detecção e bloqueio
    private static SECRET_PATTERNS: HardRule[] = [
        { name: 'jwt', pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/gi, message: 'JWT token detectado', severity: 'mask' },
        { name: 'openai_key', pattern: /sk-[A-Za-z0-9]{20,}/gi, message: 'OpenAI API key detectada', severity: 'mask' },
        { name: 'google_key', pattern: /AIza[A-Za-z0-9_-]{35}/gi, message: 'Google API key detectada', severity: 'mask' },
        { name: 'aws_key', pattern: /AKIA[A-Z0-9]{16}/gi, message: 'AWS Access Key detectada', severity: 'mask' },
        { name: 'private_key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi, message: 'Private key detectada', severity: 'mask' },
        { name: 'bearer_token', pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/gi, message: 'Bearer token detectado', severity: 'mask' },
        { name: 'supabase_key', pattern: /sbp_[A-Za-z0-9]{40,}/gi, message: 'Supabase key detectada', severity: 'mask' },
        { name: 'github_token', pattern: /ghp_[A-Za-z0-9]{36}/gi, message: 'GitHub token detectado', severity: 'mask' },
        { name: 'stripe_key', pattern: /sk_live_[A-Za-z0-9]{24,}/gi, message: 'Stripe key detectada', severity: 'mask' },
    ];

    // Padrões env_ref malformados
    private static ENV_REF_PATTERNS: HardRule[] = [
        { name: 'env_ref_colon', pattern: /"[^"]*env_ref:[^"]*"/gi, message: 'env_ref: em string (usar campo *_env_ref)', severity: 'block' },
        { name: 'env_ref_dot', pattern: /"[^"]*env_ref\.[^"]*"/gi, message: 'env_ref. em string', severity: 'block' },
        { name: 'env_ref_slash', pattern: /"[^"]*env_ref\/[^"]*"/gi, message: 'env_ref/ em string', severity: 'block' },
    ];

    // Campos que devem ser sempre *_env_ref
    private static SENSITIVE_FIELDS = [
        'api_key', 'apikey', 'api-key',
        'client_secret', 'clientsecret',
        'client_id', 'clientid',
        'secret_key', 'secretkey',
        'access_token', 'accesstoken',
        'refresh_token', 'refreshtoken',
        'anon_key', 'anonkey',
        'service_role', 'servicerole',
        'private_key', 'privatekey',
        'password', 'senha'
    ];

    /**
     * Detecta e mascara segredos em texto
     */
    static maskSecrets(text: string): { masked: string; found: string[] } {
        let masked = text;
        const found: string[] = [];

        for (const rule of this.SECRET_PATTERNS) {
            const matches = text.match(rule.pattern);
            if (matches) {
                found.push(`${rule.name}: ${matches.length} ocorrência(s)`);
                masked = masked.replace(rule.pattern, `[${rule.name.toUpperCase()}_MASKED]`);
            }
        }

        return { masked, found };
    }

    /**
     * Valida um objeto JSON contra regras hard
     */
    static validateHardRules(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const jsonString = JSON.stringify(data, null, 2);

        // Verificar padrões env_ref malformados
        for (const rule of this.ENV_REF_PATTERNS) {
            if (rule.pattern.test(jsonString)) {
                errors.push(rule.message);
            }
        }

        // Verificar campos sensíveis com valores reais
        this.checkSensitiveFields(data, '', errors);

        // Verificar campos vazios obrigatórios
        this.checkEmptyFields(data, '', errors);

        // Verificar pricing format
        if (data.providers || data.pricing) {
            this.checkPricingFormat(data, errors);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Verifica campos sensíveis que deveriam ser *_env_ref
     */
    private static checkSensitiveFields(obj: any, path: string, errors: string[]): void {
        if (!obj || typeof obj !== 'object') return;

        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            const lowerKey = key.toLowerCase().replace(/[-_]/g, '');

            // Se for campo sensível e tiver valor real (não env_ref)
            if (this.SENSITIVE_FIELDS.some(f => lowerKey.includes(f.replace(/[-_]/g, '')))) {
                if (!key.endsWith('_env_ref') && typeof value === 'string' && value.length > 0) {
                    // Verificar se não é um placeholder válido
                    if (!value.startsWith('[') && !value.endsWith('_MASKED]')) {
                        errors.push(`Campo "${currentPath}" deveria ser "${key}_env_ref" com nome da variável de ambiente`);
                    }
                }
            }

            // Recursão
            if (typeof value === 'object' && value !== null) {
                this.checkSensitiveFields(value, currentPath, errors);
            }
        }
    }

    /**
     * Verifica campos vazios obrigatórios
     */
    private static checkEmptyFields(obj: any, path: string, errors: string[]): void {
        if (!obj || typeof obj !== 'object') return;

        const requiredNonEmpty = ['client_id_env_ref', 'client_secret_env_ref', 'api_key_env_ref', 'anon_key_env_ref'];

        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;

            if (requiredNonEmpty.includes(key) && (value === '' || value === null)) {
                errors.push(`Campo obrigatório "${currentPath}" não pode estar vazio`);
            }

            if (typeof value === 'object' && value !== null) {
                this.checkEmptyFields(value, currentPath, errors);
            }
        }
    }

    /**
     * Verifica formato de pricing (input_per_1M, output_per_1M)
     */
    private static checkPricingFormat(data: any, errors: string[]): void {
        const checkPricing = (obj: any, path: string) => {
            if (!obj || typeof obj !== 'object') return;

            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;

                if (key === 'pricing' && typeof value === 'object') {
                    const pricing = value as any;

                    // Verificar case sensitivity RIGOROSA
                    const keys = Object.keys(pricing);
                    if (keys.includes('inputper1m') || keys.includes('inputPer1M')) {
                        errors.push(`${currentPath}: usar exatamente "input_per_1M"`);
                    }
                    if (keys.includes('outputper1m') || keys.includes('outputPer1M')) {
                        errors.push(`${currentPath}: usar exatamente "output_per_1M"`);
                    }

                    // Verificar se são números
                    if (pricing.input_per_1M !== undefined && typeof pricing.input_per_1M !== 'number') {
                        errors.push(`${currentPath}.input_per_1M: deve ser número`);
                    }
                    if (pricing.output_per_1M !== undefined && typeof pricing.output_per_1M !== 'number') {
                        errors.push(`${currentPath}.output_per_1M: deve ser número`);
                    }
                }

                if (typeof value === 'object' && value !== null) {
                    checkPricing(value, currentPath);
                }
            }
        };

        checkPricing(data, '');
    }

    /**
     * Sanitiza JSON aplicando todas as correções automáticas possíveis
     */
    static sanitize(data: any): any {
        if (!data || typeof data !== 'object') return data;

        const result = Array.isArray(data) ? [] : {};

        for (const [key, value] of Object.entries(data)) {
            let newKey = key;
            let newValue = value;

            // Converter camelCase pricing keys
            if (key.toLowerCase() === 'inputper1m') newKey = 'input_per_1M';
            if (key.toLowerCase() === 'outputper1m') newKey = 'output_per_1M';

            // Converter para snake_case se não for uma exceção conhecida
            if (/[A-Z]/.test(key) && !key.includes('_') && newKey !== 'input_per_1M' && newKey !== 'output_per_1M') {
                newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            }

            // Converter strings numéricas para números em pricing
            if ((newKey === 'input_per_1M' || newKey === 'output_per_1M') && typeof newValue === 'string') {
                const parsed = parseFloat(newValue);
                if (!isNaN(parsed)) newValue = parsed;
            }

            // Converter scopes string para array
            if (newKey === 'scopes' && typeof newValue === 'string') {
                newValue = newValue.split(/[,\s]+/).filter(Boolean);
            }

            // Recursão
            if (typeof newValue === 'object' && newValue !== null) {
                newValue = this.sanitize(newValue);
            }

            (result as any)[newKey] = newValue;
        }

        return result;
    }

    /**
     * Validação completa: hard rules + sanitização + mascaramento
     * @param text Texto a ser validado
     * @param options Opções de validação (jsonOnly: se a saída DEVE ser apenas JSON)
     */
    static validate(text: string, options: { jsonOnly?: boolean } = {}): ValidationResult {
        const errors: string[] = [];
        let secretsDetected = false;
        let secretsMasked: string[] = [];
        let sanitizedData: any = null;

        // Extrair JSON do texto
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

        // REGRA DE OURO: Se JSON NÃO foi solicitado, mas está presente de forma dominante
        // Só bloquear se o JSON for REALMENTE invasivo (>70% da resposta) e parecer técnico
        if (!options.jsonOnly && jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const jsonRatio = jsonStr.length / text.length;
            const isJsonOnlyResponse = text.trim().startsWith('{') || text.trim().startsWith('[');
            const hasNoHumanText = !text.replace(jsonStr, '').trim().match(/[a-zA-Zá-úÁ-Úà-ùÀ-Ù]{10,}/); // Menos de 10 letras fora do JSON

            // Só bloquear se realmente for só JSON sem explicação humana
            if (jsonRatio > 0.7 && isJsonOnlyResponse && hasNoHumanText) {
                errors.push('JSON indesejado detectado. Por favor, converta este conteúdo técnico em uma resposta amigável e humanizada em Português do Brasil, sem exibir estruturas de dados.');
            }
        }

        if (!jsonMatch) {
            return { valid: errors.length === 0, errors, sanitizedData: null, secretsDetected: false, secretsMasked: [] };
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];

        // Detectar segredos antes de parsear
        const secretCheck = this.maskSecrets(jsonStr);
        if (secretCheck.found.length > 0) {
            secretsDetected = true;
            secretsMasked = secretCheck.found;
        }

        // Tentar parsear
        try {
            let parsed = JSON.parse(jsonStr);

            // Sanitizar
            sanitizedData = this.sanitize(parsed);

            // Validar hard rules
            const hardRulesResult = this.validateHardRules(sanitizedData);
            errors.push(...hardRulesResult.errors);

        } catch (e) {
            errors.push('JSON inválido: ' + (e as Error).message);
        }

        return {
            valid: errors.length === 0,
            errors,
            sanitizedData,
            secretsDetected,
            secretsMasked
        };
    }
}
