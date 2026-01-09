/**
 * ==============================================
 * JSON GOVERNANCE SERVICE
 * Validação, extração e reparo de JSON
 * ==============================================
 */

interface ValidationResult {
    valid: boolean;
    json: any | null;
    errors: string[];
    sanitizedText: string;
}

interface EnvRefRule {
    pattern: RegExp;
    transform: (key: string, envVar: string) => { newKey: string; newValue: string };
}

/**
 * Serviço de Governança de JSON para LIA
 * Garante que outputs JSON sejam válidos e sigam contratos
 */
export class JsonGovernance {

    // Regra para conversão de env_ref
    private static ENV_REF_PATTERN = /^env_ref:(.+)$/i;

    /**
     * Extrai blocos JSON de uma resposta mista (texto + JSON)
     */
    static extractJson(text: string): { found: boolean; json: any; rawJson: string; textBefore: string; textAfter: string } {
        // Tentar extrair de blocos de código markdown
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                const parsed = JSON.parse(codeBlockMatch[1].trim());
                const idx = text.indexOf(codeBlockMatch[0]);
                return {
                    found: true,
                    json: parsed,
                    rawJson: codeBlockMatch[1].trim(),
                    textBefore: text.substring(0, idx).trim(),
                    textAfter: text.substring(idx + codeBlockMatch[0].length).trim()
                };
            } catch (e) {
                // Continuar para outros métodos
            }
        }

        // Tentar extrair JSON solto (objeto ou array)
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                const idx = text.indexOf(jsonMatch[0]);
                return {
                    found: true,
                    json: parsed,
                    rawJson: jsonMatch[1],
                    textBefore: text.substring(0, idx).trim(),
                    textAfter: text.substring(idx + jsonMatch[0].length).trim()
                };
            } catch (e) {
                // JSON malformado
            }
        }

        return { found: false, json: null, rawJson: '', textBefore: text, textAfter: '' };
    }

    /**
     * Aplica o contrato de env_ref:
     * Converte "key": "env_ref:VAR_NAME" para "key_env_ref": "VAR_NAME"
     */
    static enforceEnvRefContract(obj: any): any {
        if (obj === null || obj === undefined) return obj;

        if (Array.isArray(obj)) {
            return obj.map(item => this.enforceEnvRefContract(item));
        }

        if (typeof obj === 'object') {
            const result: any = {};

            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    const match = value.match(this.ENV_REF_PATTERN);
                    if (match) {
                        // Converter para campo _env_ref
                        const envVarName = match[1];
                        const newKey = key.endsWith('_env_ref') ? key : `${key}_env_ref`;
                        result[newKey] = envVarName;
                        console.log(`🔄 [JsonGovernance] Convertido: "${key}": "env_ref:${envVarName}" → "${newKey}": "${envVarName}"`);
                    } else {
                        result[key] = value;
                    }
                } else if (typeof value === 'object') {
                    result[key] = this.enforceEnvRefContract(value);
                } else {
                    result[key] = value;
                }
            }

            return result;
        }

        return obj;
    }

    /**
     * Valida tipos básicos (strings que deveriam ser números, etc.)
     */
    static validateTypes(obj: any, path: string = ''): string[] {
        const errors: string[] = [];

        if (obj === null || obj === undefined) return errors;

        if (typeof obj === 'object' && !Array.isArray(obj)) {
            for (const [key, value] of Object.entries(obj)) {
                const currentPath = path ? `${path}.${key}` : key;

                // Detectar números como strings
                if (typeof value === 'string') {
                    // Se for um número puro (exceto campos que podem ser strings)
                    const numericExclusions = ['id', 'uuid', 'phone', 'token', 'key', 'secret', 'ref'];
                    const isNumeric = /^-?\d+(\.\d+)?$/.test(value);
                    const isLikelyNumericField = key.toLowerCase().includes('count') ||
                        key.toLowerCase().includes('limit') ||
                        key.toLowerCase().includes('amount') ||
                        key.toLowerCase().includes('month') ||
                        key.toLowerCase().includes('minute') ||
                        key.toLowerCase().includes('executions') ||
                        key.toLowerCase().includes('calls');

                    if (isNumeric && isLikelyNumericField && !numericExclusions.some(e => key.toLowerCase().includes(e))) {
                        errors.push(`Campo "${currentPath}": valor "${value}" deveria ser número, não string`);
                    }

                    // Detectar booleanos como strings
                    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
                        errors.push(`Campo "${currentPath}": valor "${value}" deveria ser boolean, não string`);
                    }

                    // Detectar negativos inválidos
                    if (/^-\d+$/.test(value) && parseInt(value) < 0) {
                        const isAllowedNegative = key.toLowerCase().includes('offset') || key.toLowerCase().includes('diff');
                        if (!isAllowedNegative) {
                            errors.push(`Campo "${currentPath}": valor negativo "${value}" pode ser inválido`);
                        }
                    }
                }

                // Recursão para objetos aninhados
                if (typeof value === 'object') {
                    errors.push(...this.validateTypes(value, currentPath));
                }
            }
        }

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                errors.push(...this.validateTypes(item, `${path}[${index}]`));
            });
        }

        return errors;
    }

    /**
     * Valida e sanitiza um texto que contém JSON
     */
    static validate(text: string): ValidationResult {
        const extraction = this.extractJson(text);

        if (!extraction.found) {
            return {
                valid: true, // Sem JSON para validar
                json: null,
                errors: [],
                sanitizedText: text
            };
        }

        const errors: string[] = [];

        // 1. Aplicar contrato env_ref
        const sanitizedJson = this.enforceEnvRefContract(extraction.json);

        // 2. Validar tipos
        const typeErrors = this.validateTypes(sanitizedJson);
        errors.push(...typeErrors);

        // 3. Reconstruir texto com JSON corrigido
        const sanitizedText = [
            extraction.textBefore,
            '```json\n' + JSON.stringify(sanitizedJson, null, 2) + '\n```',
            extraction.textAfter
        ].filter(Boolean).join('\n\n');

        return {
            valid: errors.length === 0,
            json: sanitizedJson,
            errors,
            sanitizedText
        };
    }

    /**
     * Gera um prompt de reparo para correção de erros
     */
    static buildRepairPrompt(originalPrompt: string, invalidJson: string, errors: string[]): string {
        return `O JSON abaixo contém erros que precisam ser corrigidos.

ERROS DETECTADOS:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

JSON COM PROBLEMAS:
\`\`\`json
${invalidJson}
\`\`\`

REGRAS DE CORREÇÃO:
1. Valores numéricos (counts, limits, amounts) devem ser números, não strings.
2. Booleanos devem ser true/false, não "true"/"false".
3. Valores negativos só são permitidos em campos de offset/diff.
4. Referências a variáveis de ambiente devem usar campos *_env_ref.

Retorne APENAS o JSON corrigido, sem explicações.`;
    }

    /**
     * Auto-repara JSON com até N tentativas
     */
    static async autoRepair(
        text: string,
        chatFunction: (prompt: string) => Promise<string>,
        maxRetries: number = 2
    ): Promise<{ text: string; repaired: boolean; attempts: number }> {

        let currentText = text;
        let attempts = 0;

        for (let i = 0; i < maxRetries; i++) {
            const validation = this.validate(currentText);

            if (validation.valid) {
                return {
                    text: validation.sanitizedText,
                    repaired: i > 0,
                    attempts: i
                };
            }

            attempts++;
            console.log(`🔧 [JsonGovernance] Tentativa ${attempts}/${maxRetries} de reparo. Erros: ${validation.errors.length}`);

            const extraction = this.extractJson(currentText);
            if (!extraction.found) break;

            const repairPrompt = this.buildRepairPrompt('', extraction.rawJson, validation.errors);

            try {
                const repairedText = await chatFunction(repairPrompt);
                const repairedExtraction = this.extractJson(repairedText);

                if (repairedExtraction.found) {
                    // Substituir o JSON original pelo reparado
                    currentText = [
                        extraction.textBefore,
                        '```json\n' + JSON.stringify(this.enforceEnvRefContract(repairedExtraction.json), null, 2) + '\n```',
                        extraction.textAfter
                    ].filter(Boolean).join('\n\n');
                }
            } catch (err) {
                console.error('❌ [JsonGovernance] Erro no reparo:', err);
                break;
            }
        }

        // Retornar melhor esforço após max retries
        const finalValidation = this.validate(currentText);
        return {
            text: finalValidation.sanitizedText,
            repaired: attempts > 0,
            attempts
        };
    }
}
