/**
 * IntentClassifier - Serviço de Classificação de Intenção do Usuário
 * 
 * Analisa a mensagem do usuário e classifica em:
 * - VQA (Visual Question Answering): Pergunta objetiva sobre imagem/documento
 * - Diagnostic: Análise técnica de erro/bug/problema
 * - Contextual: Interpretação complexa que requer análise profunda
 * - Action: Execução de tarefa/comando
 */

export type IntentType = 'vqa' | 'diagnostic' | 'contextual' | 'action';

export interface IntentAnalysis {
    type: IntentType;
    confidence: number;
    extractedContext: {
        subject?: string;
        action?: string;
        target?: string;
    };
    suggestedResponseFormat: 'direct' | 'technical' | 'conversational';
}

export class IntentClassifier {
    /**
     * Analisa mensagem do usuário e classifica intenção
     * @param message - Mensagem/pergunta do usuário
     * @param hasImages - Se há imagens anexadas
     * @returns Análise de intenção com tipo, confiança e contexto extraído
     */
    static analyze(message: string, hasImages: boolean): IntentAnalysis {
        const lowerMessage = message.toLowerCase();

        // Palavras-chave VQA (pergunta objetiva)
        const vqaKeywords = [
            'qual', 'quais', 'onde', 'quantos', 'quantas',
            'cor', 'cores', 'texto', 'escrito', 'escrita',
            'está', 'estão', 'tem', 'aparece', 'mostra', 'vejo'
        ];

        // Palavras-chave Diagnóstico (análise técnica)
        const diagnosticKeywords = [
            'erro', 'bug', 'console', 'stack', 'log', 'falha',
            'problema', 'exception', 'crash', 'código', 'sistema',
            'errado', 'quebrado', 'travou', 'falhou'
        ];

        // Palavras-chave Contextual (interpretação complexa)
        const contextualKeywords = [
            'significa', 'impacto', 'relaciona', 'porque', 'motivo',
            'diferença', 'comparação', 'melhor', 'pior', 'vantagem',
            'desvantagem', 'consequência', 'implica'
        ];

        // Palavras-chave Ação (executar tarefa)
        const actionKeywords = [
            'crie', 'gere', 'faça', 'envie', 'agende', 'corrija',
            'mude', 'altere', 'delete', 'remova', 'adicione', 'insira'
        ];

        // Priorização de classificação (ordem importa)

        // 1. Ação tem prioridade se houver verbo de comando claro
        if (actionKeywords.some(kw => lowerMessage.includes(kw))) {
            return {
                type: 'action',
                confidence: 0.9,
                extractedContext: this.extractActionContext(lowerMessage),
                suggestedResponseFormat: 'conversational'
            };
        }

        // 2. Diagnóstico técnico se houver keywords específicas
        if (diagnosticKeywords.some(kw => lowerMessage.includes(kw))) {
            return {
                type: 'diagnostic',
                confidence: 0.85,
                extractedContext: {},
                suggestedResponseFormat: 'technical'
            };
        }

        // 3. VQA se houver pergunta objetiva E imagens
        if (vqaKeywords.some(kw => lowerMessage.includes(kw)) && hasImages) {
            return {
                type: 'vqa',
                confidence: 0.9,
                extractedContext: this.extractVQAContext(lowerMessage),
                suggestedResponseFormat: 'direct'
            };
        }

        // 4. Contextual se houver palavras de interpretação
        if (contextualKeywords.some(kw => lowerMessage.includes(kw))) {
            return {
                type: 'contextual',
                confidence: 0.7,
                extractedContext: {},
                suggestedResponseFormat: 'conversational'
            };
        }

        // Default: se tem imagem, assumir VQA; senão, contextual
        return {
            type: hasImages ? 'vqa' : 'contextual',
            confidence: 0.5,
            extractedContext: {},
            suggestedResponseFormat: hasImages ? 'direct' : 'conversational'
        };
    }

    /**
     * Extrai contexto de pergunta VQA
     * Ex: "qual cor" → subject: "cor"
     */
    private static extractVQAContext(message: string): { subject?: string } {
        const lowerMessage = message.toLowerCase();

        // Detectar "qual X" ou "quais X"
        const qualMatch = lowerMessage.match(/qual(?:is)?\s+(\w+)/i);
        if (qualMatch) {
            return { subject: qualMatch[1] };
        }

        // Detectar "quantos X" ou "quantas X"
        const quantosMatch = lowerMessage.match(/quant(?:os|as)\s+(\w+)/i);
        if (quantosMatch) {
            return { subject: quantosMatch[1] };
        }

        return {};
    }

    /**
     * Extrai contexto de ação
     * Ex: "crie planilha" → action: "criar", target: "planilha"
     */
    private static extractActionContext(message: string): { action?: string; target?: string } {
        // Implementação simplificada - pode ser expandida no futuro
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('crie') || lowerMessage.includes('criar')) {
            return { action: 'criar' };
        }
        if (lowerMessage.includes('envie') || lowerMessage.includes('enviar')) {
            return { action: 'enviar' };
        }

        return {};
    }
}
