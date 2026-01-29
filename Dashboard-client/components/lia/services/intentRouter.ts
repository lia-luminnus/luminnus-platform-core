/**
 * LIA Intent Router v1.0
 * 
 * Classifies user requests into MODE A (Incident), MODE B (Content), or MODE C (Hybrid)
 * based on the SSOT LIA File Reading Protocol (v3.0).
 * 
 * This is the first enforcement layer to ensure LIA provides actionable responses
 * when users send files/screenshots with problems.
 */

// ============================================
// Types
// ============================================

export type IntentMode = 'A' | 'B' | 'C';
export type AttachmentType = 'image' | 'document' | 'code' | 'log' | 'json' | 'spreadsheet' | 'other' | null;
export type ContextScope = 'Admin' | 'Client' | 'Backend' | 'Integrations' | 'General';

export interface QuickAction {
    label: string;
    icon: string;
    toolName: string;
    params?: Record<string, any>;
}

export interface IntentRouterInput {
    userText: string;
    hasAttachment: boolean;
    attachmentType: AttachmentType;
    attachmentName?: string;
    contextScope: ContextScope;
}

export interface IntentRouterOutput {
    mode: IntentMode;
    reason: string;
    actionRequired: boolean;
    suggestedTools: string[];
    maxResponseLines: number;
    templateRequired: 'incident' | 'content' | 'hybrid' | null;
}

// ============================================
// Error Signal Patterns (MODE A Indicators)
// ============================================

const ERROR_SIGNALS = [
    // Portuguese
    /não\s*(?:funciona|funcionou|funcionar)/i,
    /não\s*(?:foi|está|consegue|consigo)/i,
    /(?:erro|erros|falha|falhou|falhando|bugou|bug|bugs)/i,
    /(?:quebrou|quebrado|travou|travado|parou|morreu)/i,
    /(?:corrige|corrigir|conserta|consertar|arruma|arrumar|resolve|resolver)/i,
    /(?:por\s*que|pq|porque)\s*(?:isso|esse|essa|não)/i,
    /(?:o\s*que|oq)\s*(?:está|tá|ta)\s*(?:errado|acontecendo)/i,
    /(?:valida|validar|verifica|verificar|checa|checar)/i,
    /(?:era\s*pra|deveria|devia)\s*(?:ter|funcionar|acontecer)/i,
    /(?:não\s*(?:deletou|criou|atualizou|enviou|salvou|carregou))/i,
    /(?:404|500|401|403|timeout|exception|stack\s*trace)/i,
    /(?:undefined|null|nan|error|failed|failure)/i,
    // English fallback
    /(?:not\s*working|doesn't\s*work|broken|crashed|fix\s*this)/i,
];

// ============================================
// Content Signal Patterns (MODE B Indicators)
// ============================================

const CONTENT_SIGNALS = [
    /(?:transforma|transforme|converte|converta)\s*(?:em|para)\s*(?:documento|doc|texto)/i,
    /(?:resuma|resumir|resumo|sintetiza|sintetize)/i,
    /(?:melhora|melhore|melhorar|reescreva|reescrever|otimiza|otimize)/i,
    /(?:extraia|extrair|extrai|lista|listar)\s*(?:os|as|requisitos|ideias|pontos)/i,
    /(?:cria|criar|crie|gera|gerar|gere)\s*(?:um|uma)\s*(?:relatório|documento|copy|texto)/i,
    /(?:organiza|organize|organizar|estrutura|estruture)/i,
    /(?:pegue|pega|usa|use)\s*(?:esse|essa|este|esta)\s*(?:print|trecho|arquivo)/i,
];

// ============================================
// Hybrid Signal Patterns (MODE C Indicators)
// ============================================

const HYBRID_SIGNALS = [
    /(?:corrige|conserta|arruma)\s*(?:e|depois)\s*(?:resuma|resume|melhore)/i,
    /(?:resuma|resume)\s*(?:e|depois)\s*(?:corrige|conserta|arruma)/i,
    /(?:analisa|analise)\s*(?:e|depois)\s*(?:transforma|converte)/i,
];

const EMAIL_SIGNALS = [
    /(?:envia|manda|responde|cobra|encaminha|reenviar)\s*(?:o|um|os)?\s*(?:email|e-mail|correio)/i,
    /(?:agenda|marcar|marque|agenda|reunião|call|meet)/i,
    /(?:procura|busca|acha|lista|listar|ver)\s*(?:o|um|os)?\s*(?:email|e-mail|inbox)/i,
];

// ============================================
// Attachment Type Detection
// ============================================

export function detectAttachmentType(fileName: string, mimeType?: string): AttachmentType {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Images (most common for screenshots)
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
        mimeType?.startsWith('image/')) {
        return 'image';
    }

    // Documents
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
        return 'document';
    }

    // Code
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'swift', 'kt'].includes(ext)) {
        return 'code';
    }

    // Logs
    if (['log', 'out', 'err'].includes(ext) || fileName.toLowerCase().includes('log')) {
        return 'log';
    }

    // JSON/Config
    if (['json', 'env', 'yaml', 'yml', 'toml', 'xml', 'ini', 'conf', 'config'].includes(ext)) {
        return 'json';
    }

    // Spreadsheets
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
        return 'spreadsheet';
    }

    return 'other';
}

// ============================================
// Suggested Tools by Context
// ============================================

const TOOLS_BY_CONTEXT: Record<ContextScope, string[]> = {
    Admin: ['debug.get_logs', 'debug.test_endpoint', 'email.validate_domain'],
    Client: ['email.send', 'email.resend', 'email.status', 'calendar.create'],
    Backend: ['debug.get_logs', 'debug.test_endpoint', 'debug.health'],
    Integrations: ['integrations.status', 'integrations.reconnect'], // Placeholder for future
    General: ['file.generate_corrected', 'file.download', 'dashboard.snapshot'],
};

const TOOLS_FOR_EMAIL_ISSUES = ['email.send', 'email.resend', 'email.status', 'email.validate_domain'];
const TOOLS_FOR_CONSOLE_ERRORS = ['debug.get_logs', 'debug.test_endpoint', 'file.download'];

// ============================================
// Main Classification Function
// ============================================

export function classifyIntent(input: IntentRouterInput): IntentRouterOutput {
    const { userText, hasAttachment, attachmentType, attachmentName, contextScope } = input;
    const text = userText.toLowerCase();

    // Default output
    let mode: IntentMode = 'B';
    let reason = 'Sem sinais de incidente ou conteúdo detectados';
    let actionRequired = false;
    let suggestedTools: string[] = [];
    let maxResponseLines = 50; // Default for MODE B
    let templateRequired: 'incident' | 'content' | 'hybrid' | null = null;

    // ========================================
    // Step 1: Check for Hybrid signals (MODE C)
    // ========================================
    for (const pattern of HYBRID_SIGNALS) {
        if (pattern.test(text)) {
            mode = 'C';
            reason = 'Usuário solicitou diagnóstico + transformação';
            actionRequired = true;
            maxResponseLines = 20;
            templateRequired = 'hybrid';
            break;
        }
    }

    // ========================================
    // Step 2: Check for Error signals (MODE A)
    // ========================================
    if (mode !== 'C') {
        for (const pattern of ERROR_SIGNALS) {
            if (pattern.test(text)) {
                mode = 'A';
                reason = `Sinal de incidente detectado: "${text.match(pattern)?.[0] || 'erro'}"`;
                actionRequired = true;
                maxResponseLines = 12;
                templateRequired = 'incident';
                break;
            }
        }
    }

    // ========================================
    // Step 3: Check for Email signals (NEW v3.0)
    // ========================================
    if (mode !== 'C' && mode !== 'A') {
        for (const pattern of EMAIL_SIGNALS) {
            if (pattern.test(text)) {
                mode = 'B'; // Or 'A' depending on context, but let's say 'B' (Action)
                reason = `Sinal de email/agenda detectado: "${text.match(pattern)?.[0] || 'email'}"`;
                actionRequired = true;
                maxResponseLines = 30;
                templateRequired = 'content'; // Could use a specific 'email' template later
                break;
            }
        }
    }

    // ========================================
    // Step 4: Check for Content signals (MODE B)
    // ========================================
    if (mode !== 'C' && mode !== 'A' && templateRequired === null) {
        for (const pattern of CONTENT_SIGNALS) {
            if (pattern.test(text)) {
                mode = 'B';
                reason = `Sinal de conteúdo detectado: "${text.match(pattern)?.[0] || 'conteúdo'}"`;
                actionRequired = false;
                maxResponseLines = 100;
                templateRequired = 'content';
                break;
            }
        }
    }

    // ========================================
    // Step 4: Attachment-based inference (if no explicit signal)
    // ========================================
    if (hasAttachment && templateRequired === null) {
        // Images with attachments default to MODE A (SSOT § 5.1)
        if (attachmentType === 'image') {
            mode = 'A';
            reason = 'Print/imagem enviado - assumindo incidente (SSOT § 5.1)';
            actionRequired = true;
            maxResponseLines = 12;
            templateRequired = 'incident';
        }
        // Logs default to MODE A (SSOT § 5.4)
        else if (attachmentType === 'log') {
            mode = 'A';
            reason = 'Arquivo de log enviado - assumindo diagnóstico (SSOT § 5.4)';
            actionRequired = true;
            maxResponseLines = 12;
            templateRequired = 'incident';
        }
        // Code defaults to MODE A (SSOT § 5.6)
        else if (attachmentType === 'code') {
            mode = 'A';
            reason = 'Código enviado - assumindo correção (SSOT § 5.6)';
            actionRequired = true;
            maxResponseLines = 15;
            templateRequired = 'incident';
        }
        // JSON/Config defaults to MODE A (SSOT § 5.5)
        else if (attachmentType === 'json') {
            mode = 'A';
            reason = 'Config/JSON enviado - assumindo validação (SSOT § 5.5)';
            actionRequired = true;
            maxResponseLines = 12;
            templateRequired = 'incident';
        }
    }

    // ========================================
    // Step 5: Suggest tools based on context
    // ========================================
    suggestedTools = [...TOOLS_BY_CONTEXT[contextScope]];

    // Email-specific hints
    if (text.includes('email') || text.includes('e-mail') || text.includes('resend') ||
        text.includes('enviado') || text.includes('inbox')) {
        suggestedTools = [...TOOLS_FOR_EMAIL_ISSUES, ...suggestedTools];
    }

    // Console/Error-specific hints
    if (text.includes('console') || text.includes('log') || text.includes('stack') ||
        text.includes('404') || text.includes('500') || text.includes('error')) {
        suggestedTools = [...TOOLS_FOR_CONSOLE_ERRORS, ...suggestedTools];
    }

    // Deduplicate
    suggestedTools = [...new Set(suggestedTools)];

    return {
        mode,
        reason,
        actionRequired,
        suggestedTools,
        maxResponseLines,
        templateRequired,
    };
}

// ============================================
// Template Generators
// ============================================

export function getIncidentTemplateInstruction(): string {
    return `Responda EXATAMENTE no formato abaixo (MODO A - Incidente):

1) **Achado principal** (1 linha): O que está errado.
2) **Evidência** (1 linha): Trecho literal do arquivo/print que comprova.
3) **Causa raiz provável** (1 linha): Por que isso acontece.
4) **Correção mínima** (2-5 bullets): Passos para corrigir.
5) **Validação** (2-3 bullets): Como confirmar que funcionou.

⚠️ EXECUTE, DON'T DESCRIBE: Se o pedido envolve um arquivo corrigido ou e-mail, entregue-o pronto.
⚠️ PROIBIDO: 
- Começar com "Entendi!", "Na imagem vemos...", descrições longas.
- USAR PLACEHOLDERS (ex: [LINK]) ou ASSINATURAS (ex: "Equipe Luminnus").
⚠️ MÁXIMO: 12 linhas.`;
}

export function getContentTemplateInstruction(): string {
    return `Responda no formato abaixo (MODO B - Conteúdo):

1) **Objetivo do entregável**: O que você vai produzir.
2) **Extração do arquivo**: Tópicos principais extraídos.
3) **Versão final**: O artefato melhorado/transformado.
4) **Próximos passos** (opcional): Sugestões de continuidade.

⚠️ PROIBIDO: USAR PLACEHOLDERS ou ASSINATURAS CORPORATIVAS.`;
}

export function getHybridTemplateInstruction(): string {
    return `Responda no formato abaixo (MODO C - Híbrido):

**PARTE 1 - Diagnóstico (MODO A):**
1) Achado principal (1 linha)
2) Evidência (1 linha)
3) Causa raiz provável (1 linha)
4) Correção mínima (bullets)
5) Validação (bullets)

**PARTE 2 - Conteúdo (MODO B):**
1) Resumo/transformação solicitada.

⚠️ ORDEM FIXA: Primeiro diagnóstico, depois conteúdo.
⚠️ PROIBIDO: USAR PLACEHOLDERS ou ASSINATURAS CORPORATIVAS.`;
}

// ============================================
// Export default
// ============================================

export default {
    classifyIntent,
    detectAttachmentType,
    getIncidentTemplateInstruction,
    getContentTemplateInstruction,
    getHybridTemplateInstruction,
};
