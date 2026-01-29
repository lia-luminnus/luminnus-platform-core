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
    userPlan?: string;
    verifiedLinks?: string[]; // v6.1: Links reais retornados por ferramentas
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
        if (protocolV3On) {
            // v5.0: Output Formatter (MODO EXECUÇÃO / RELATÓRIO)
            const isAdmin = ['admin', 'owner', 'ceo', 'enterprise'].includes(req.userPlan?.toLowerCase() || '');

            systemPrompt = `Você é o LIA Output Formatter v5.0 (EXECUTION REPORTER).
Sua missão: Formatar a resposta da LIA para ser direta, executiva e livre de alucinações.

**REGRAS CRÍTICAS (SSOT v5.0):**
1. **ZERO SIGNATURES:** Proibido assinar (LIA | Luminnus, Equipe Luminnus, etc). O chat deve ser limpo.
2. **ZERO PLACEHOLDERS:** Remova qualquer [Veja aqui], [Link], [Planilha]. Se não tiver link real, não mostre nada ou diga "BLOQUEIO".
3. **FORMATO DE EXECUÇÃO (Se houver ação/result):**
   ✅ **RESULTADO:** [O que foi feito em 1 linha]
   📂 **ENTREGA:** [Se tiver link real, mantenha. Se não, remova esta linha]
   🛠️ **O QUE EU FIZ:** [Bullet points curtos]
   
4. **SEM PERGUNTAS DESNECESSÁRIAS:** Não pergunte "O que você quer fazer?" se a ação já foi tomada.
   - Só pergunte se houver BLOQUEIO REAL que impeça o progresso.
   
5. **INCIDENT MODE (Se for análise de erro):**
   📋 **Diagnóstico:** [Causa raiz]
   ⚠️ **Correção:** [O que foi feito ou sugerido]
   
Mantenha o tom profissional, direto e sem "papoc" (conversa fiada).
6. **PROMPT MASTER (Google AI):** Se a resposta contiver um "🧠 **GOOGLE AI PROMPT:**", formate-o em um bloco de código ou destaque-o como a instrução mestre para o usuário usar no Workspace.`;
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
                console.log(`🧯 [FILE-QA] Resposta não passou na validação rígida.`);
            }
        }

        let truncated = false;
        const limit = intentMode === IntentMode.INCIDENT ? 800 : this.MAX_CHARS; // Limites v3.0

        // v2.0: Capturar e remover botões do texto (evitar poluição visual de [BOTÃO: ...])
        const buttonRegex = /\[BOTÃO:\s*([^\]]+)\]/g;
        const buttons: string[] = [];
        let match;
        while ((match = buttonRegex.exec(formattedText)) !== null) {
            buttons.push(match[1]);
        }

        // Limpar APENAS assinaturas legadas residuais do texto do chat
        formattedText = formattedText.replace(/LIA \| Luminnus\s*Equipe Luminnus/g, '').trim();

        // v6.0: Placeholder Blocking - Remove fake links and log when they occur
        const PLACEHOLDER_PATTERNS = [
            /\[link[_\s]*(para|do|aqui)?[^\]]*\]/gi,
            /\[LINK_DO_ARQUIVO\]/gi,
            /\[Veja\s+aqui\]/gi,
            /\[Acesse\s+aqui\]/gi,
            /\(link[_\s]*aqui\)/gi,
            /\[link_para_o[^\]]+\]/gi,
            /\[aqui\]/gi,
        ];

        let hadPlaceholders = false;
        for (const pattern of PLACEHOLDER_PATTERNS) {
            if (pattern.test(formattedText)) {
                hadPlaceholders = true;
                console.warn(`🚫 [OutputFormatter] Placeholder detectado e removido: ${pattern.source}`);
                formattedText = formattedText.replace(pattern, '');
            }
        }

        // v6.1: Active Link Scrubbing - Remove hallucinated Google links
        // Regex mais robusto para capturar links markdown do Google Workspace
        const googleLinkRegex = /\[([^\]]+)\]\((https:\/\/docs\.google\.com\/[^\s\)]+)\)/gi;
        const verifiedLinks = req.verifiedLinks || [];

        console.log(`🔍 [OutputFormatter] Scrubbing links. Verified:`, verifiedLinks);

        formattedText = formattedText.replace(googleLinkRegex, (match, title, url) => {
            const cleanUrl = url.trim();

            // Se o link contiver ellipsis "..." é 100% alucinação de truncamento
            if (cleanUrl.includes('...')) {
                console.warn(`🚫 [OutputFormatter] Link truncado/alucinado removido: ${cleanUrl}`);
                hadPlaceholders = true;
                return `[Link Inválido Sugerido: ${title}]`;
            }

            // Verificar se o link está na lista de links verificados
            // Compara URLs normalizadas (lowercase, sem query params, sem trailing slash)
            const isVerified = verifiedLinks.some(v => {
                const normalize = (u: string) => u.toLowerCase().split('?')[0].replace(/\/$/, '');
                const vClean = normalize(v);
                const urlClean = normalize(cleanUrl);
                return vClean === urlClean || vClean.includes(urlClean) || urlClean.includes(vClean);
            });

            if (!isVerified) {
                console.warn(`🚫 [OutputFormatter] Link não verificado removido: ${cleanUrl}`);
                hadPlaceholders = true;
                return `[Ação Pendente: ${title}]`;
            }

            console.log(`✅ [OutputFormatter] Link verificado mantido: ${cleanUrl}`);
            return match;
        });

        // v7.0: Quality Gate & Placeholder Detector
        // Captura padrões genéricos entre colchetes que sugerem alucinação de link (ex: [link aqui])
        // v7.2: Adicionado negative lookahead (?!\() para não capturar links markdown legítimos como [aqui](url)
        const mandatoryPlaceholderPattern = /\[(link|planilha|arquivo|doc|aqui|clique)[^\]]*?\](?!\()|\(.*?\.\.\.\)|link_aqui|veja aqui/i;
        const hasCriticalPlaceholder = mandatoryPlaceholderPattern.test(formattedText);

        // v7.1: Detector de IDs alucinados do Google
        // IDs reais do Google Docs/Sheets têm ~44 caracteres e padrões específicos
        // Se encontrar um link docs.google.com que NÃO está verificado, é alucinação
        const allGoogleLinks = formattedText.match(/https:\/\/docs\.google\.com\/(document|spreadsheets)\/d\/[a-zA-Z0-9_-]+/gi) || [];
        const hasUnverifiedGoogleLinks = allGoogleLinks.some(link => {
            const isVerified = verifiedLinks.some(v => {
                const normalize = (u: string) => u.toLowerCase().split('?')[0].split('/edit')[0].replace(/\/$/, '');
                return normalize(v) === normalize(link);
            });
            if (!isVerified) {
                console.warn(`🚫 [OutputFormatter] Link Google NÃO VERIFICADO detectado: ${link}`);
                return true;
            }
            return false;
        });

        if ((hasCriticalPlaceholder || hasUnverifiedGoogleLinks) && intentMode === IntentMode.ACTION) {
            const errorType = hasUnverifiedGoogleLinks ? 'HALLUCINATED_LINK' : 'PLACEHOLDER_DETECTED';
            console.error(`❌ [OutputFormatter] CRITICAL: Resposta continha ${errorType} em MODO AÇÃO!`);
            return {
                summary: "### 🛑 ERRO DE ENTREGA\nA IA tentou fornecer um link inexistente. Por favor, refaça o pedido. Se o problema persistir, verifique se a conexão com o Google Workspace está ativa.",
                detailPayload: {
                    rawText: req.text,
                    docType,
                    intentMode,
                    qa_ok: false,
                    error: errorType
                },
                truncated: false
            };
        }

        // v7.0: Gemini Workspace Rule - Injeta prompt mestre se for entrega de arquivo
        const hasRealLink = /https:\/\/docs\.google\.com/.test(formattedText);
        if (hasRealLink && intentMode === IntentMode.ACTION) {
            formattedText += `\n\n> 💡 **PROMPT PARA O GEMINI (WORKSPACE)**: "Analise os dados deste arquivo e crie um resumo executivo destacando os 3 principais insights acionáveis."`;
        }

        if (formattedText.length > limit) {
            formattedText = formattedText.substring(0, limit) + "\n\n...(Conteúdo longo — diga 'detalhar' para abrir a versão completa.)";
            truncated = true;
        }

        return {
            summary: formattedText,
            detailPayload: {
                rawText: req.text,
                docType,
                intentMode,
                qa_ok: protocolV3On ? validateResponse(intentMode, formattedText).ok : true,
                buttons // v2.0: Passar botões para o frontend renderizar via UI real
            },
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

