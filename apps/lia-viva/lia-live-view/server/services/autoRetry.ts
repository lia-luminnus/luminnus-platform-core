/**
 * ==============================================
 * AUTO RETRY SERVICE
 * Re-prompt automático com lista de erros
 * ==============================================
 */

import { SchemaValidator } from './schemaValidator.js';
import { OutputContracts, ContractType } from './outputContracts.js';

interface RetryResult {
    text: string;
    attempts: number;
    success: boolean;
    errors: string[];
    secretsDetected: boolean;
    secretsMasked: string[];
}

/**
 * Serviço de Auto-Retry para correção de respostas
 */
export class AutoRetry {

    private static MAX_RETRIES = 2;

    /**
     * Gera prompt de correção baseado nos erros
     */
    static buildCorrectionPrompt(originalResponse: string, errors: string[], contractType: ContractType): string {
        return `A resposta anterior contém erros que precisam ser corrigidos.

ERROS DETECTADOS:
${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

RESPOSTA COM PROBLEMAS:
\`\`\`
${originalResponse.slice(0, 2000)}${originalResponse.length > 2000 ? '...[truncado]' : ''}
\`\`\`

REGRAS DE CORREÇÃO (${contractType.toUpperCase()}):
${OutputContracts.getContract(contractType).outputRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Retorne APENAS a versão corrigida. Se for JSON, retorne SOMENTE o JSON válido.`;
    }

    /**
     * Executa retry com validação até MAX_RETRIES
     */
    static async execute(
        initialResponse: string,
        contractType: ContractType,
        retryFunction: (prompt: string) => Promise<string>,
        jsonOnly: boolean = false
    ): Promise<RetryResult> {

        let currentText = initialResponse;
        let attempts = 0;
        let lastErrors: string[] = [];
        let secretsDetected = false;
        let secretsMasked: string[] = [];

        for (let i = 0; i <= this.MAX_RETRIES; i++) {
            // Validar resposta atual
            const validation = SchemaValidator.validate(currentText, { jsonOnly });

            // Atualizar info de segredos
            if (validation.secretsDetected) {
                secretsDetected = true;
                secretsMasked = [...new Set([...secretsMasked, ...validation.secretsMasked])];
            }

            // Se válido, retornar
            if (validation.valid) {
                // Reconstruir texto com JSON sanitizado se necessário
                if (validation.sanitizedData) {
                    if (jsonOnly) {
                        currentText = JSON.stringify(validation.sanitizedData, null, 2);
                    } else {
                        // Substituir JSON no texto original
                        currentText = currentText.replace(
                            /```(?:json)?\s*[\s\S]*?```|\{[\s\S]*\}/,
                            '```json\n' + JSON.stringify(validation.sanitizedData, null, 2) + '\n```'
                        );
                    }
                }

                return {
                    text: secretsDetected ? SchemaValidator.maskSecrets(currentText).masked : currentText,
                    attempts,
                    success: true,
                    errors: [],
                    secretsDetected,
                    secretsMasked
                };
            }

            // Se atingiu máximo de retries, retornar com erros
            if (i === this.MAX_RETRIES) {
                lastErrors = validation.errors;
                break;
            }

            // Gerar prompt de correção e executar retry
            attempts++;
            console.log(`🔧 [AutoRetry] Tentativa ${attempts}/${this.MAX_RETRIES}. Erros: ${validation.errors.length}`);

            const correctionPrompt = this.buildCorrectionPrompt(currentText, validation.errors, contractType);

            try {
                currentText = await retryFunction(correctionPrompt);
            } catch (err) {
                console.error('❌ [AutoRetry] Erro no retry:', err);
                lastErrors = [...validation.errors, 'Falha no retry: ' + String(err)];
                break;
            }
        }

        // Retornar melhor esforço com erros
        return {
            text: secretsDetected ? SchemaValidator.maskSecrets(currentText).masked : currentText,
            attempts,
            success: false,
            errors: lastErrors,
            secretsDetected,
            secretsMasked
        };
    }
}
