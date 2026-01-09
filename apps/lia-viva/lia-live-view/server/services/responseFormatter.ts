/**
 * ==============================================
 * RESPONSE FORMATTER SERVICE
 * Formata respostas para UI e Voice
 * ==============================================
 */

import { ContractType } from './outputContracts.js';
import { SchemaValidator } from './schemaValidator.js';

interface FormattedResponse {
    // Para Chat/Multi-Modal (UI)
    markdown: string;

    // Para LiveMode (Voice)
    voiceScript: string;
    detailPayload: any;

    // Metadata
    hasJson: boolean;
    jsonData: any | null;
    secretsWarning: boolean;
}

/**
 * Serviço de Formatação de Respostas
 */
export class ResponseFormatter {

    /**
     * Formata resposta para todos os modos
     */
    static format(
        rawResponse: string,
        contractType: ContractType,
        options?: { secretsDetected?: boolean; jsonOnly?: boolean }
    ): FormattedResponse {

        const secretsDetected = options?.secretsDetected || false;
        const jsonOnly = options?.jsonOnly || false;

        // Extrair JSON se existir
        const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) || rawResponse.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        let jsonData: any = null;
        let hasJson = false;

        if (jsonMatch) {
            try {
                jsonData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                hasJson = true;
            } catch (e) {
                // JSON inválido, ignorar
            }
        }

        // Gerar markdown para UI
        let markdown = rawResponse;
        if (secretsDetected) {
            markdown = SchemaValidator.maskSecrets(markdown).masked;
        }

        // Gerar voice script para LiveMode
        const voiceScript = this.generateVoiceScript(rawResponse, contractType, hasJson, secretsDetected);

        // Gerar detail payload
        const detailPayload = {
            type: contractType,
            content: jsonOnly && hasJson ? jsonData : markdown,
            jsonData: hasJson ? jsonData : undefined,
            timestamp: Date.now()
        };

        return {
            markdown,
            voiceScript,
            detailPayload,
            hasJson,
            jsonData,
            secretsWarning: secretsDetected
        };
    }

    /**
     * Gera voice script curto e falável (10-25s)
     */
    private static generateVoiceScript(
        rawResponse: string,
        contractType: ContractType,
        hasJson: boolean,
        secretsDetected: boolean
    ): string {

        let script = '';

        // Aviso de segurança se necessário
        if (secretsDetected) {
            script = 'Atenção: removi alguns dados sensíveis por segurança. ';
        }

        // Se for JSON Fix, não ler o JSON
        if (hasJson && contractType === 'json_fix') {
            script += 'Pronto! Eu gerei o JSON corrigido e deixei no chat para você copiar. ';
            const changes = this.extractChangeSummary(rawResponse);
            if (changes) script += changes;
            return script.trim();
        }

        // Para outros tipos, extrair resumo falável curto
        switch (contractType) {
            case 'log_analysis':
                script += 'Analisei os logs e identifiquei a causa raiz. A correção está no chat.';
                break;
            case 'spreadsheet_analysis':
                script += 'Processei a planilha e encontrei algumas inconsistências. Veja os achados no chat.';
                break;
            case 'doc_summary':
                script += 'Resumi o documento com os pontos principais e ações recomendadas.';
                break;
            case 'visual_troubleshooting':
                script += 'Identifiquei o problema no print e detalhei a correção passo a passo.';
                break;
            case 'action_execution':
                script += 'A ação solicitada foi concluída com sucesso. Veja os detalhes no chat.';
                break;
            default:
                script += this.summarizeForVoice(rawResponse);
        }

        // Rigoroso: Limitar a ~20 segundos (~50-60 palavras)
        const words = script.split(/\s+/);
        if (words.length > 55) {
            script = words.slice(0, 50).join(' ') + '... Os detalhes completos estão no chat.';
        }

        return script.trim();
    }

    /**
     * Extrai resumo das alterações feitas no JSON
     */
    private static extractChangeSummary(response: string): string {
        const listMatch = response.match(/(?:alterações|changes|modificações|corrigido)[\s\S]*?(?:\n\n|\z)/i);
        if (listMatch) {
            const items = listMatch[0].match(/[-•]\s*([^\n]+)/g);
            if (items && items.length > 0) {
                return `Fiz ${items.length} correções principais.`;
            }
        }
        return 'Verifique as alterações no chat.';
    }

    /**
     * Resume resposta geral para voz
     */
    private static summarizeForVoice(response: string): string {
        let clean = response.replace(/```[\s\S]*?```/g, '');
        clean = clean.replace(/\{[\s\S]*\}/g, '');
        clean = clean.replace(/\[[\s\S]*\]/g, '');

        const lines = clean.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) return 'A resposta está disponível no chat.';

        let result = '';
        const wordsLimit = 45;
        for (const line of lines) {
            const combined = (result + ' ' + line).trim();
            if (combined.split(/\s+/).length > wordsLimit) break;
            result = combined;
        }

        return result || lines[0].slice(0, 150);
    }

    /**
     * Formata especificamente para LiveMode
     */
    static formatForLive(
        rawResponse: string,
        contractType: ContractType,
        secretsDetected: boolean
    ): { voiceScript: string; chatPayload: string; jsonData: any | null } {

        const formatted = this.format(rawResponse, contractType, { secretsDetected });

        return {
            voiceScript: formatted.voiceScript,
            chatPayload: formatted.markdown,
            jsonData: formatted.jsonData
        };
    }
}
