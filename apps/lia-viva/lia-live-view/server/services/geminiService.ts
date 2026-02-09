import fs from 'fs';
import { AuditService } from './auditService.js';
import { CostTracker } from './costTracker.js';

/**
 * Serviço especializado para interações diretas com o Google Gemini
 */
export class GeminiService {
    private static API_KEY = process.env.GEMINI_API_KEY;
    private static BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

    /**
     * Analisa um arquivo usando Gemini 2.0 ou 2.5 com suporte a ferramentas
     */
    static async analyzeFile(
        file: { mimetype: string; data: string; name: string },
        prompt: string,
        model: string = 'gemini-2.5-flash',
        tools: any[] = []
    ) {
        if (!this.API_KEY) throw new Error('GEMINI_API_KEY não configurada');

        const startTime = Date.now();

        // Converter ferramentas para o formato Gemini de forma recursiva (v4.0)
        const convertSchema = (schema: any): any => {
            if (!schema) return undefined;

            const type = (schema.type || 'object').toUpperCase();
            const result: any = { type };

            if (schema.description) result.description = schema.description;
            if (schema.enum) result.format = 'enum', result.enum = schema.enum;

            if (type === 'OBJECT') {
                result.properties = Object.entries(schema.properties || {}).reduce((acc: any, [k, v]: [string, any]) => {
                    acc[k] = convertSchema(v);
                    return acc;
                }, {});
                if (schema.required) result.required = schema.required;
            } else if (type === 'ARRAY') {
                result.items = convertSchema(schema.items);
            }

            return result;
        };

        const geminiTools = tools.length > 0 ? [{
            functionDeclarations: tools.map(f => ({
                name: f.name,
                description: f.description,
                parameters: convertSchema(f.parameters)
            }))
        }] : undefined;

        // v6.0: Detect creation intent to force tool calling
        const creationPatterns = [
            /\b(cri[ea]r?|gera?r?|faz(?:er)?|produz(?:ir)?)\b.*\b(doc|documento|planilha|sheet|arquivo|relatório|carta)\b/i,
            /\bno\s+google\s+(docs?|sheets?|drive)\b/i,
            /\b(corrig[aei]|ajust[aei]).*\b(e|depois).*\b(cri[ea]|gera|salva)\b/i,
            /\bgere\s+(esse|este|um|o)\s+(arquivo|doc)/i,
            /\b(cria|gerar?)\s+(uma?\s+)?(nova?\s+)?(planilha|documento)/i,
        ];
        const hasCreationIntent = creationPatterns.some(p => p.test(prompt));

        if (hasCreationIntent) {
            console.log(`🎯 [GeminiService] Intenção de CRIAÇÃO detectada - forçando tool calling`);
        }

        // Build tool config - force tool calling if creation intent detected
        const toolConfig = geminiTools && hasCreationIntent ? {
            functionCallingConfig: {
                mode: 'ANY' // Forces the model to call at least one function
            }
        } : undefined;

        const response = await fetch(
            `${this.BASE_URL}/${model}:generateContent?key=${this.API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                inline_data: {
                                    mime_type: file.mimetype,
                                    data: file.data
                                }
                            },
                            { text: prompt }
                        ]
                    }],
                    tools: geminiTools,
                    toolConfig: toolConfig, // v6.0: Force tool calling when creation detected
                    generationConfig: {
                        temperature: 0.2, // Reduzido para maior precisão em tool calling
                        maxOutputTokens: 8192,
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.find((p: any) => p.text)?.text || '';

        // Extrair chamadas de função
        const function_calls = candidate?.content?.parts
            ?.filter((p: any) => p.functionCall)
            ?.map((p: any) => ({
                name: p.functionCall.name,
                arguments: p.functionCall.args
            })) || [];

        return {
            text,
            function_calls,
            model,
            durationMs: Date.now() - startTime
        };
    }
}
