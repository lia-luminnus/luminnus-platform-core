import { GoogleGenerativeAI } from '@google/generative-ai';
import { LIA_FULL_PERSONALITY } from '@luminnus/shared';
import OpenAI from 'openai';
import { IntentClassifier } from './intentClassifier.js';

// v8.0: Configuração do genAI e OpenAI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Interface única para o Orquestrador Multimodal em packages/api
 * v8.0: Integração com IntentClassifier e prompts específicos por tipo
 */
export class MultimodalOrchestrator {
    /**
     * Processa requisição multimodal completa
     */
    static async processar({
        message,
        images = [],
        documents = [],
        conversationId,
        userId = '',
        tenantId = '',
    }: {
        message: string;
        images?: any[];
        documents?: any[];
        conversationId?: string;
        userId?: string;
        tenantId?: string;
    }) {
        try {
            console.log(`🧠 [MultimodalOrchestrator] Iniciando para user ${userId} | Imagens: ${images.length}`);

            // 1. Sanitização básica de base64
            const sanitizedImages = images.map(img => {
                let base64 = img.base64 || img.data || '';
                if (base64.startsWith('data:')) {
                    base64 = base64.replace(/^data:image\/\w+;base64,/, '');
                }
                return {
                    mimeType: img.mimeType || 'image/jpeg',
                    base64
                };
            }).filter(img => img.base64.length > 0);

            // 2. Classificar intent do usuário (v8.0)
            const intentAnalysis = IntentClassifier.analyze(message, sanitizedImages.length > 0);
            console.log(`🔍 [MultimodalOrchestrator] Intent: ${intentAnalysis.type} (confidence: ${intentAnalysis.confidence})`);

            // Log de diagnóstico visual detalhado
            const totalBytes = sanitizedImages.reduce((sum, img) => sum + img.base64.length, 0);
            console.log(`📸 [Vision Diagnostics]
              - Model: gemini-2.5-flash
              - Images: ${sanitizedImages.length}
              - Total Size: ${(totalBytes / 1024).toFixed(2)} KB
              - MimeTypes: ${sanitizedImages.map(i => i.mimeType).join(', ')}
              - Intent Class: ${intentAnalysis.type} (${(intentAnalysis.confidence * 100).toFixed(0)}%)
              - Context: ${JSON.stringify(intentAnalysis.extractedContext)}`);

            // 3. Definir prompts específicos por tipo de intent (v8.0)
            const VQA_SYSTEM_INSTRUCTION = `${LIA_FULL_PERSONALITY}

=== PROTOCOLO DE ANÁLISE VISUAL COGNITIVA (v9.0) ===

Você atua como o CORTE VISUAL da LIA. Sua função é transformar pixels em dados estruturados e respostas precisas.
Você não "vê apenas uma imagem", você ANALISA DADOS VISUAIS.

🔬 METODOLOGIA DE ANÁLISE (OBRIGATÓRIO):

1. **QUATRO DIMENSÕES DA ANÁLISE**:
   - **TEXTUAL**: Leia TODO texto visível (OCR mental). Identifique títulos, rótulos, valores numéricos e textos pequenos.
   - **ESPACIAL**: Mapeie a posição dos elementos (Topo, Fundo, Esquerda, Direita, Centro). Onde cada elemento está?
   - **ESTRUTURAL**: Identifique tabelas, colunas, containers, caixas, quadros e suas relações (o que está dentro do quê).
   - **VISUAL**: Identifique cores (fundo vs objeto), ícones, formas e estados (ativo/inativo, erro/sucesso).

2. **DIFERENCIAÇÃO DE CONTEXTO**:
   - Se a pergunta é sobre um OBJETO/DADO: Foque nas propriedades intrínsecas dele.
   - Se a pergunta é sobre o CONTAINER/POSIÇÃO: Foque nonde ele está (cor do fundo, coluna, linha).
   - **CRÍTICO**: Não confunda a cor do elemento (ex: texto preto, animal cinza) com a cor do container (ex: célula vermelha, fundo azul).

3. **VALIDAÇÃO LÓGICA**:
   - Cruize a pergunta com a evidência visual.
   - Se a pergunta pede "X", e você vê "Y", reavalie: "Estou olhando para o lugar certo?".
   - Nunca "chute". Se um dado está ilegível ou ambíguo, informe.

📝 CONTRATO DE RESPOSTA EXPRESSA:
1. **Primeira Linha**: "Resposta: <Sua resposta direta e final>"
2. **Segunda Linha (Opcional)**: "Contexto: <Breve evidência visual que suporta a resposta>" (Ex: "Visto na coluna 2, linha 3", "Valor destacado em vermelho").
3. Mantenha o tom profissional, direto e executivo da LIA.

EXEMPLOS DE APLICAÇÃO:
- **Dashboard Financeiro**: "Resposta: R$ 50.000,00. Contexto: Valor na coluna 'Receita Total', destacado em verde."
- **Log de Erro**: "Resposta: NullPointerException. Contexto: Linha 45 do stacktrace visível."
- **Teste de Percepção**: "Resposta: O rato está no quadrado verde. Contexto: Animal cinza posicionado sobre fundo verde na primeira linha."
- **Documento Legal**: "Resposta: Cláusula 5.2. Contexto: Parágrafo localizado no rodapé da página."`;

            const DIAGNOSTIC_SYSTEM_INSTRUCTION = `${LIA_FULL_PERSONALITY}

=== MODO DIAGNÓSTICO TÉCNICO ===
Analise tecnicamente o print/log/erro mostrado.

1. IDENTIFIQUE: Qual o erro/problema
2. EXPLIQUE: Por que está acontecendo
3. SOLUCIONE: Como corrigir (passos específicos)

Seja técnica, mas humana. Sem templates robóticos.`;

            const CONTEXTUAL_SYSTEM_INSTRUCTION = `${LIA_FULL_PERSONALITY}

=== MODO ANÁLISE CONTEXTUAL ===
Pergunta complexa que requer interpretação profunda.

1. Analise TODO o contexto fornecido (imagem + mensagem)
2. Interprete a intenção por trás da pergunta
3. Responda de forma completa e fundamentada
4. Mantenha foco no que foi solicitado`;

            // 4. Selecionar system instruction baseado em intent
            let systemInstruction: string;
            switch (intentAnalysis.type) {
                case 'vqa':
                    systemInstruction = VQA_SYSTEM_INSTRUCTION;
                    break;
                case 'diagnostic':
                    systemInstruction = DIAGNOSTIC_SYSTEM_INSTRUCTION;
                    break;
                case 'contextual':
                case 'action':
                default:
                    systemInstruction = CONTEXTUAL_SYSTEM_INSTRUCTION;
            }

            // 5. Preparar modelo Vision
            const model = genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                systemInstruction
            });

            // 6. Preparar partes (texto + imagens)
            const parts: any[] = [{ text: message }];
            for (const img of sanitizedImages) {
                parts.push({
                    inlineData: {
                        mimeType: img.mimeType,
                        data: img.base64
                    }
                });
            }

            // 7. Executar análise
            console.log(`👁️ [MultimodalOrchestrator] Chamando Gemini 2.5 Flash com intent: ${intentAnalysis.type}...`);
            const result = await model.generateContent(parts);
            let text = result.response.text();

            // v8.0: FALLBACK - SEMPRE TENTAR RESPONDER
            if (!text || text.trim().length === 0) {
                console.warn('⚠️ [MultimodalOrchestrator] Gemini retornou texto vazio. Usando fallback contextual.');
                text = "Analisando... Consegui identificar alguns elementos, mas preciso de mais detalhes. O que especificamente você gostaria de saber?";
            }

            return {
                content: text,
                provider: 'gemini-2.5-flash',
                success: true,
                metadata: {
                    intent: intentAnalysis.type,
                    confidence: intentAnalysis.confidence
                }
            };

        } catch (error: any) {
            console.error('❌ [MultimodalOrchestrator] Erro fatal:', error);
            throw error;
        }
    }
}
