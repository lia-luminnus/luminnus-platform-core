/**
 * ==============================================
 * OUTPUT GOVERNANCE - ORQUESTRADOR UNIFICADO
 * Camada central para todos os modos
 * ==============================================
 */

import { OutputContracts, ContractType } from './outputContracts.js';
import { SchemaValidator } from './schemaValidator.js';
import { AutoRetry } from './autoRetry.js';
import { ResponseFormatter } from './responseFormatter.js';

interface GovernanceResult {
    // Conteúdo final
    text: string;
    markdown: string;

    // Para LiveMode
    voiceScript: string;
    detailPayload: any;

    // Metadata de governança
    contractType: ContractType;
    jsonOnly: boolean;
    valid: boolean;
    retryAttempts: number;
    errors: string[];

    // Segurança
    secretsDetected: boolean;
    secretsMasked: string[];

    // Audit
    audit: GovernanceAudit;
}

interface GovernanceAudit {
    contractType: ContractType;
    jsonOnly: boolean;
    validationPassed: boolean;
    retryAttempts: number;
    secretsDetected: boolean;
    errorsFound: string[];
    timestamp: number;
    durationMs: number;
}

/**
 * Orquestrador de Output Governance
 * Centraliza todas as validações e formatações
 */
export class OutputGovernance {

    /**
     * Pipeline principal de governança
     * Aplica contratos, validação, retry e formatação
     */
    static async apply(
        rawResponse: string,
        prompt: string,
        retryFunction: (prompt: string) => Promise<string>,
        options?: {
            files?: { type: string }[];
            mode?: 'chat' | 'multimodal' | 'live';
        }
    ): Promise<GovernanceResult> {

        const startTime = Date.now();

        // 1. Detectar intenção e contrato
        const contractType = OutputContracts.detectIntent(
            prompt,
            !!options?.files?.length,
            options?.files?.map(f => f.type)
        );

        const jsonOnly = OutputContracts.isJsonRequested(prompt);

        console.log(`📋 [OutputGovernance] Contrato: ${contractType}, JSON Only: ${jsonOnly}`);

        // 2. Executar auto-retry com validação
        const retryResult = await AutoRetry.execute(
            rawResponse,
            contractType,
            retryFunction,
            jsonOnly
        );

        // 3. Formatar resposta
        const formatted = ResponseFormatter.format(
            retryResult.text,
            contractType,
            { secretsDetected: retryResult.secretsDetected, jsonOnly }
        );

        // 4. Gerar audit
        const audit: GovernanceAudit = {
            contractType,
            jsonOnly,
            validationPassed: retryResult.success,
            retryAttempts: retryResult.attempts,
            secretsDetected: retryResult.secretsDetected,
            errorsFound: retryResult.errors,
            timestamp: Date.now(),
            durationMs: Date.now() - startTime
        };

        // 5. Log de governança
        console.log(`✅ [OutputGovernance] Completo em ${audit.durationMs}ms. Retry: ${audit.retryAttempts}, Válido: ${audit.validationPassed}, Segredos: ${audit.secretsDetected}`);

        return {
            text: retryResult.text,
            markdown: formatted.markdown,
            voiceScript: formatted.voiceScript,
            detailPayload: formatted.detailPayload,
            contractType,
            jsonOnly,
            valid: retryResult.success,
            retryAttempts: retryResult.attempts,
            errors: retryResult.errors,
            secretsDetected: retryResult.secretsDetected,
            secretsMasked: retryResult.secretsMasked,
            audit
        };
    }

    /**
     * Aplica governança para ChatMode
     */
    static async forChat(
        rawResponse: string,
        prompt: string,
        retryFunction: (prompt: string) => Promise<string>
    ): Promise<GovernanceResult> {
        return this.apply(rawResponse, prompt, retryFunction, { mode: 'chat' });
    }

    /**
     * Aplica governança para Multi-Modal
     */
    static async forMultiModal(
        rawResponse: string,
        prompt: string,
        retryFunction: (prompt: string) => Promise<string>,
        files?: { type: string }[]
    ): Promise<GovernanceResult> {
        return this.apply(rawResponse, prompt, retryFunction, { mode: 'multimodal', files });
    }

    /**
     * Aplica governança para LiveMode
     * Retorna voice_script separado do payload
     */
    static async forLive(
        rawResponse: string,
        prompt: string,
        retryFunction: (prompt: string) => Promise<string>
    ): Promise<{
        voiceScript: string;
        chatPayload: string;
        jsonData: any | null;
        audit: GovernanceAudit;
    }> {
        const result = await this.apply(rawResponse, prompt, retryFunction, { mode: 'live' });

        return {
            voiceScript: result.voiceScript,
            chatPayload: result.markdown,
            jsonData: result.detailPayload?.jsonData || null,
            audit: result.audit
        };
    }

    /**
     * Gera prompt enriquecido com instruções de contrato
     */
    static enrichPrompt(prompt: string, files?: { type: string }[]): string {
        const contractType = OutputContracts.detectIntent(
            prompt,
            !!files?.length,
            files?.map(f => f.type)
        );

        const jsonOnly = OutputContracts.isJsonRequested(prompt);
        const isIncident = OutputContracts.isIncident(prompt);
        const contractPrompt = OutputContracts.buildContractPrompt(contractType, jsonOnly, isIncident);

        return `${contractPrompt}\n\n=== PEDIDO DO USUÁRIO ===\n${prompt}`;
    }
}
