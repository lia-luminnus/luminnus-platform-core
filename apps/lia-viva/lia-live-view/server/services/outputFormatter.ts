import { OpenAIService } from './openAIService.js';
import { runGemini } from '../assistants/gemini.js';
import { SecurityService } from './securityService.js';
import { IntentMode, validateResponse, templateIncident } from '@luminnus/lia-runtime';

export type DocType = 'recibo_invoice' | 'contrato_termos' | 'relatorio_pdf' | 'planilha' | 'json_logs' | 'general';

export interface FormattingRequest {
    text: string;
    prompt: string;
    docType?: DocType;
    userIntent?: 'resumo' | 'tabela' | 'completo';
    intentMode?: IntentMode;
    protocolV3On?: boolean;
}

export interface FormattedResponse {
    summary: string;
    detailPayload: any;
    truncated: boolean;
}

/**
 * OutputFormatter: Camada de pós-processamento LIA v1.1.1
 */
export class OutputFormatter {
    private static readonly MAX_CHARS = 1200;

    /**
     * Formata o texto extraído seguindo o template profissional v1.1.1
     */
    static async format(req: FormattingRequest): Promise<FormattedResponse> {
        const docType = req.docType || await this.classifyDocType(req.text);
        const intent = req.userIntent || 'resumo';
        const intentMode = req.intentMode || IntentMode.INCIDENT;
        const protocolV3On = req.protocolV3On || false;

        let systemPrompt = '';
        if (protocolV3On && intentMode === IntentMode.INCIDENT) {
            systemPrompt = `Você é o LIA Output Formatter v3.0 (MODO INCIDENTE).
Sua missão é formatar o diagnóstico técnico seguindo RIGIDAMENTE o template oficial.

**REGRAS CRÍTICAS:**
- Resposta CURTA (máximo 12 linhas).
- Use EXATAMENTE os headers do template: 1) ACHADO, 2) EVIDÊNCIA, 3) CAUSA RAIZ, 4) CORREÇÃO MÍNIMA, 5) VALIDAÇÃO.
- Proibido descrição genérica.
- Retorne apenas o conteúdo acionável.`;
        } else {
            systemPrompt = `Você é o LIA Output Formatter v1.1.1. Sua missão é transformar extrações brutas de documentos em respostas executivas, curtas e profissionais.
... [Legacy System Prompt] ...`;
        }

        const userPrompt = `DADOS EXTRAÍDOS DO DOCUMENTO:\n\n${req.text}\n\nSOLICITAÇÃO DO USUÁRIO: "${req.prompt}"\n\nTEMPLATE OBRIGATÓRIO:\n${intentMode === IntentMode.INCIDENT ? templateIncident() : 'Formato livre estruturado'}`;

        const response = await runGemini(userPrompt, {
            messages: [{ role: 'system', content: systemPrompt } as any],
            temperature: 0.2
        });

        let formattedText = SecurityService.maskSensitiveData(response.text);

        // v3.0: Camada de QA (Response Guardrails)
        if (protocolV3On) {
            const qaResult = validateResponse(intentMode, formattedText);
            console.log(`${qaResult.ok ? '✅' : '❌'} [FILE-QA] ok=${qaResult.ok} errors=${JSON.stringify(qaResult.errors)}`);

            if (!qaResult.ok) {
                console.log(`🧯 [FILE-REPAIR] Aplicando reparo local para modo ${intentMode}...`);
                // Estratégia de Reparo Simples: se faltar seções críiticas em incidente, tenta injetar markers
                if (intentMode === IntentMode.INCIDENT) {
                    if (!formattedText.toLowerCase().includes('validação')) {
                        formattedText += '\n\n5) **VALIDAÇÃO**\n• Testar funcionalidade afetada\n• Verificar logs de sucesso';
                    }
                    if (!formattedText.toLowerCase().includes('correção mínima')) {
                        formattedText += '\n\n4) **CORREÇÃO MÍNIMA RECOMENDADA**\n• Revisar configurações de ambiente\n• Verificar conectividade';
                    }
                }
            }
        }

        let truncated = false;
        const limit = intentMode === IntentMode.INCIDENT ? 800 : this.MAX_CHARS; // Limites v3.0
        if (formattedText.length > limit) {
            formattedText = formattedText.substring(0, limit) + "\n\n...(Conteúdo longo — diga 'detalhar' para abrir a versão completa.)";
            truncated = true;
        }

        return {
            summary: formattedText,
            detailPayload: { rawText: req.text, docType, intentMode, qa_ok: protocolV3On ? validateResponse(intentMode, formattedText).ok : true },
            truncated
        };
    }

    /**
     * Classifica o tipo de documento baseado no conteúdo
     */
    private static async classifyDocType(text: string): Promise<DocType> {
        const prompt = `Classifique o tipo de documento abaixo em apenas UMA das categorias:
- recibo_invoice
- contrato_termos
- relatorio_pdf
- planilha
- json_logs
- general

TEXTO: ${text.substring(0, 1000)}`;

        const response = await runGemini(prompt, { temperature: 0.1 });
        const category = response.text.toLowerCase().trim();

        if (category.includes('recibo')) return 'recibo_invoice';
        if (category.includes('contrato')) return 'contrato_termos';
        if (category.includes('relatorio')) return 'relatorio_pdf';
        if (category.includes('planilha')) return 'planilha';
        if (category.includes('json')) return 'json_logs';

        return 'general';
    }
}

