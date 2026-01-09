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
     * Analisa um arquivo usando Gemini 2.0 ou 2.5
     */
    static async analyzeFile(file: { mimetype: string; data: string; name: string }, prompt: string, model: 'gemini-2.0-flash-exp' | 'gemini-2.5-flash' = 'gemini-2.0-flash-exp') {
        if (!this.API_KEY) throw new Error('GEMINI_API_KEY não configurada');

        const startTime = Date.now();
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
                    generationConfig: {
                        temperature: 0.4,
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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
            text,
            model,
            durationMs: Date.now() - startTime
        };
    }
}
