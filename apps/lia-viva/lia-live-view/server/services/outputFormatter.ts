import { OpenAIService } from './openAIService.js';
import { runGemini } from '../assistants/gemini.js';
import { SecurityService } from './securityService.js';

export type DocType = 'recibo_invoice' | 'contrato_termos' | 'relatorio_pdf' | 'planilha' | 'json_logs' | 'general';

export interface FormattingRequest {
    text: string;
    prompt: string;
    docType?: DocType;
    userIntent?: 'resumo' | 'tabela' | 'completo';
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

        const systemPrompt = `Você é o LIA Output Formatter v1.1.1. Sua missão é transformar extrações brutas de documentos em respostas executivas, curtas e profissionais.

**REGRAS DE OURO:**
- NUNCA retorne "parede de texto".
- Sempre use títulos e listas com marcadores (•).
- Mascare dados sensíveis: IDs longos (ex: abc...xyz), tokens, chaves.
- O texto final deve ser curto o suficiente para leitura rápida no chat.
- Não mencione termos técnicos como "extração", "pipeline", "Gemini" ou "GPT".

**TEMPLATE OBRIGATÓRIO:**

📋 **Resumo Executivo**
(O que é o documento, contexto, resultado principal e se há problemas)

🔍 **Dados-Chave**
• Campo: Valor (mascarado se sensível)

⚠️ **Pontos de Atenção**
(Apenas se houver riscos, vencimentos ou inconsistências)

✅ **Ações Recomendadas**
(Próximos passos práticos e curtos)

---
Tipo de Documento: ${docType}
Intenção do Usuário: ${intent}`;

        const userPrompt = `DADOS EXTRAÍDOS DO DOCUMENTO:\n\n${req.text}\n\nSOLICITAÇÃO DO USUÁRIO: "${req.prompt}"`;

        const response = await runGemini(userPrompt, {
            messages: [{ role: 'system', content: systemPrompt } as any],
            temperature: 0.2
        });

        let formattedText = SecurityService.maskSensitiveData(response.text);
        let truncated = false;

        if (formattedText.length > this.MAX_CHARS) {
            formattedText = formattedText.substring(0, this.MAX_CHARS) + "\n\n...(Conteúdo longo — diga 'detalhar' para abrir a versão completa.)";
            truncated = true;
        }

        return {
            summary: formattedText,
            detailPayload: { rawText: req.text, docType },
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

