/**
 * LIA Response Gate v1.0
 * 
 * Hard validator that blocks invalid responses for MODE A/C and provides
 * re-route instructions to ensure LIA delivers actionable responses.
 * 
 * This is the second enforcement layer of the SSOT LIA File Reading Protocol.
 */

import { IntentMode, QuickAction } from './intentRouter';
import { isActionAllowed } from './actionPolicy';

console.log('🛡️ [ResponseGate] Carregado');

// ============================================
// Types
// ============================================

export interface ResponseGateInput {
    mode: IntentMode;
    liaResponse: string;
    originalUserText: string;
}

export interface ResponseGateOutput {
    isValid: boolean;
    missingElements: string[];
    rerouteInstruction: string | null;
    validationDetails: {
        hasCorrection: boolean;
        hasValidation: boolean;
        hasEvidence: boolean;
        hasCauseRoot: boolean;
        estimatedLineCount: number;
        containsProhibited: boolean;
        prohibitedTerms: string[];
    };
}

// ============================================
// Validation Patterns
// ============================================

// Required sections for MODE A (Incident)
const CORRECTION_PATTERNS = [
    /(?:correção|correcao|corrigir|fix|solução|solucao|resolver|passos?(?:\s+para)?(?:\s+corrigir)?)/i,
    /(?:como\s+corrigir|como\s+resolver|o\s+que\s+fazer)/i,
    /(?:execute|rode|aplique|modifique|altere|adicione|remova)/i,
    /(?:\d+\.\s+|\-\s+|\*\s+).*(?:corrig|fix|alter|modific|adic|remov)/i, // Bullets with action verbs
];

const VALIDATION_PATTERNS = [
    /(?:validação|validacao|validar|verificar|confirmar|testar)/i,
    /(?:como\s+(?:validar|verificar|confirmar|testar))/i,
    /(?:para\s+(?:validar|verificar|confirmar|testar))/i,
    /(?:confirme\s+que|verifique\s+se|teste\s+se)/i,
    /(?:\d+\.\s+|\-\s+|\*\s+).*(?:verific|confirm|test|valid)/i, // Bullets with validation verbs
];

const EVIDENCE_PATTERNS = [
    /(?:evidência|evidencia|erro|mensagem|log|stack|trace|status|código|codigo)/i,
    /(?:o\s+erro|a\s+mensagem|o\s+problema|o\s+sintoma)/i,
    /(?:mostra|indica|aponta|revela)/i,
    /(?:404|500|401|403|undefined|null|exception|failed)/i,
];

const CAUSE_ROOT_PATTERNS = [
    /(?:causa|motivo|razão|razao|por\s+que|porque|provavelmente|provável|problema\s+é)/i,
    /(?:isso\s+acontece|isso\s+ocorre|o\s+problema\s+(?:é|e|está))/i,
    /(?:deve-se\s+a|devido\s+a|por\s+conta\s+de)/i,
];

// Prohibited patterns (descriptions without action)
const PROHIBITED_PATTERNS = [
    /^(?:entendi!?|compreendo|ok!?|certo!?|claro!?)/i,
    /(?:vou\s+explicar|deixa\s+eu\s+explicar|basicamente)/i,
    /(?:na\s+imagem\s+(?:vemos|podemos\s+ver|há|existe))/i,
    /(?:o\s+print\s+mostra|a\s+imagem\s+mostra)/i,
    /(?:parece\s+que|aparentemente|ao\s+que\s+parece)/i, // Vague language
    /\[(?:LINK|NOME|URL|CAMINHO|ID|VALOR|DADO).*\]/i, // Placeholders
    /(?:LIA\s*\|\s*Luminnus|Equipe\s*Luminnus|Luminnus\s*Team)/i, // Signatures in diagnostics
];

// Line count estimation
function estimateLineCount(text: string): number {
    return text.split('\n').filter(line => line.trim().length > 0).length;
}

// ============================================
// Main Validation Function
// ============================================

export function validateResponse(input: ResponseGateInput): ResponseGateOutput {
    const { mode, liaResponse, originalUserText } = input;
    const response = liaResponse.toLowerCase();

    // Initialize output
    const missingElements: string[] = [];
    const prohibitedTerms: string[] = [];

    // Check for prohibited patterns
    let containsProhibited = false;
    for (const pattern of PROHIBITED_PATTERNS) {
        const match = liaResponse.match(pattern);
        if (match) {
            containsProhibited = true;
            prohibitedTerms.push(match[0]);
        }
    }

    // Check for required sections
    let hasCorrection = false;
    for (const pattern of CORRECTION_PATTERNS) {
        if (pattern.test(liaResponse)) {
            hasCorrection = true;
            break;
        }
    }

    let hasValidation = false;
    for (const pattern of VALIDATION_PATTERNS) {
        if (pattern.test(liaResponse)) {
            hasValidation = true;
            break;
        }
    }

    let hasEvidence = false;
    for (const pattern of EVIDENCE_PATTERNS) {
        if (pattern.test(liaResponse)) {
            hasEvidence = true;
            break;
        }
    }

    let hasCauseRoot = false;
    for (const pattern of CAUSE_ROOT_PATTERNS) {
        if (pattern.test(liaResponse)) {
            hasCauseRoot = true;
            break;
        }
    }

    const estimatedLineCount = estimateLineCount(liaResponse);

    // ========================================
    // MODE A Validation (Incident)
    // ========================================
    if (mode === 'A') {
        if (!hasCorrection) {
            missingElements.push('Correção mínima (bullets com passos para corrigir)');
        }
        if (!hasValidation) {
            missingElements.push('Validação (bullets com como confirmar que funcionou)');
        }
        if (containsProhibited) {
            missingElements.push(`Contém elementos proibidos (placeholder ou assinatura interna): ${prohibitedTerms.join(', ')}`);
        }
        if (estimatedLineCount > 15) {
            missingElements.push(`Resposta muito longa (${estimatedLineCount} linhas, máximo 12)`);
        }
    }

    // ========================================
    // MODE C Validation (Hybrid)
    // ========================================
    if (mode === 'C') {
        if (!hasCorrection) {
            missingElements.push('Correção mínima (PARTE 1 - Diagnóstico)');
        }
        if (!hasValidation) {
            missingElements.push('Validação (PARTE 1 - Diagnóstico)');
        }
    }

    // ========================================
    // Determine validity
    // ========================================
    const isValid = missingElements.length === 0;

    // ========================================
    // Generate re-route instruction if invalid
    // ========================================
    let rerouteInstruction: string | null = null;

    if (!isValid && (mode === 'A' || mode === 'C')) {
        rerouteInstruction = generateRerouteInstruction(mode, missingElements, originalUserText);
    }

    return {
        isValid,
        missingElements,
        rerouteInstruction,
        validationDetails: {
            hasCorrection,
            hasValidation,
            hasEvidence,
            hasCauseRoot,
            estimatedLineCount,
            containsProhibited,
            prohibitedTerms,
        },
    };
}

// ============================================
// Re-route Instruction Generator
// ============================================

function generateRerouteInstruction(
    mode: IntentMode,
    missingElements: string[],
    originalUserText: string
): string {
    const missingList = missingElements.map(e => `- ${e}`).join('\n');

    if (mode === 'A') {
        return `⚠️ RESPOSTA INCOMPLETA - REFAÇA COM FOCO EM SOLUÇÃO

**Elementos faltando:**
${missingList}

**Contexto original do usuário:** "${originalUserText}"

**Como responder (MODO A - Diagnóstico):**
Seja um engenheiro sênior explicando de forma natural:
1. Identifique o problema claramente.
2. Explique a causa com base na evidência (print, log, código).
3. Forneça a correção exata ou execute a ferramenta se disponível.
4. Indique como validar que funcionou.

⚠️ EVITE:
- Começar com "Entendi!" ou descrições longas.
- Labels rígidos como "**Achado principal**", "**Evidência**".
- Placeholders como [LINK] ou assinaturas corporativas.
- Respostas maiores que 10 linhas.

REFAÇA AGORA de forma natural e executiva.`;
    }

    if (mode === 'C') {
        return `⚠️ RESPOSTA INVÁLIDA - REESCREVA NO TEMPLATE MODO C

**Elementos faltando:**
${missingList}

**Template obrigatório (MODO C - Híbrido):**

**PARTE 1 - Diagnóstico:**
1) Achado principal (1 linha)
2) Evidência (1 linha)
3) Causa raiz provável (1 linha)
4) Correção mínima (bullets)
5) Validação (bullets)

**PARTE 2 - Conteúdo:**
Resumo/transformação solicitada.

⚠️ ORDEM FIXA: Primeiro diagnóstico, depois conteúdo.
⚠️ PROIBIDO: Placeholders ou assinaturas corporativas.

REESCREVA AGORA seguindo o template acima.`;
    }

    return '';
}

// Quick Action Suggestions (v3.0: SSOT Registry-based)
// ============================================

import { getActionDefinition, UserRole as PolicyUserRole } from './actionPolicy';

export function suggestQuickActions(
    mode: IntentMode,
    userText: string,
    contextHints: string[] = [],
    userRole: string = 'client'
): QuickAction[] {
    const actions: QuickAction[] = [];
    const text = userText.toLowerCase();
    const filterOptions = { userRole: userRole as PolicyUserRole };

    // Only suggest for MODE A (Incident) or MODE C (Hybrid)
    if (mode !== 'A' && mode !== 'C') return actions;

    // Helper to add if allowed
    const addIfAllowed = (id: string) => {
        const def = getActionDefinition(id, filterOptions);
        if (def) {
            actions.push({
                label: def.label,
                icon: def.icon,
                toolName: def.toolName,
                params: {}
            });
        }
    };

    // 1. Email-related actions
    if (text.includes('email') || text.includes('e-mail') || text.includes('enviado') ||
        text.includes('resend') || text.includes('inbox') || contextHints.includes('email')) {

        addIfAllowed('email.preview');
        addIfAllowed('email.send');

        if (text.includes('reenviar') || text.includes('resend')) {
            addIfAllowed('email.resend');
        }

        addIfAllowed('email.status');

        // Admin-only email actions (Registry already handles role check)
        addIfAllowed('email.validate_domain');
    }

    // 2. Document/File-related actions
    if (text.includes('documento') || text.includes('arquivo') || text.includes('pdf') ||
        text.includes('doc') || text.includes('valida') || text.includes('balancete') ||
        contextHints.includes('document')) {

        addIfAllowed('file.generate_corrected');
        addIfAllowed('file.export_sheets');
        addIfAllowed('file.download');
        addIfAllowed('file.compare');
    }

    // 3. Calendar-related actions
    if (text.includes('agenda') || text.includes('reunião') || text.includes('marcar') ||
        text.includes('calendário') || contextHints.includes('calendar')) {

        addIfAllowed('calendar.create');
        addIfAllowed('calendar.send_invite');
    }

    // 4. Debug/Admin (Registry already handles role check)
    if (text.includes('console') || text.includes('erro') || text.includes('log') ||
        text.includes('404') || text.includes('500') || contextHints.includes('console')) {
        addIfAllowed('debug.get_logs');
        addIfAllowed('debug.test_endpoint');
    }

    // 5. Integration-related actions
    if (text.includes('integração') || text.includes('conexão') || text.includes('google') ||
        text.includes('oauth') || contextHints.includes('integrations')) {
        // addIfAllowed('integrations.reconnect');
        // addIfAllowed('integrations.status');
    }

    // 6. Support (v3.0: Only on real errors and if no other tools found)
    const isError = text.includes('erro') || text.includes('falha') || text.includes('não consegui');
    const hasExplicitSupportRequest = text.includes('suporte') || text.includes('ajuda') || text.includes('chamado');

    if (hasExplicitSupportRequest || (isError && actions.length === 0)) {
        addIfAllowed('support.open_ticket');
    }

    // Deduplicate by toolName
    const uniqueActions = actions.filter((v, i, a) => a.findIndex(t => t.toolName === v.toolName) === i);

    // Limit to 3 contextually relevant actions
    return uniqueActions.slice(0, 3);
}

// ============================================
// Telemetry Interface (for future use)
// ============================================

export interface ResponseGateTelemetry {
    mode: IntentMode;
    isValid: boolean;
    missingElements: string[];
    timestamp: number;
    rerouteCount: number;
}

let telemetryBuffer: ResponseGateTelemetry[] = [];

export function recordTelemetry(data: Omit<ResponseGateTelemetry, 'timestamp'>): void {
    telemetryBuffer.push({
        ...data,
        timestamp: Date.now(),
    });

    // Keep only last 100 entries
    if (telemetryBuffer.length > 100) {
        telemetryBuffer = telemetryBuffer.slice(-100);
    }
}

export function getTelemetrySummary(): { total: number; failRate: number; topMissing: string[] } {
    const total = telemetryBuffer.length;
    const failed = telemetryBuffer.filter(t => !t.isValid).length;
    const failRate = total > 0 ? (failed / total) * 100 : 0;

    // Count missing elements
    const missingCounts: Record<string, number> = {};
    telemetryBuffer.forEach(t => {
        t.missingElements.forEach(e => {
            missingCounts[e] = (missingCounts[e] || 0) + 1;
        });
    });

    const topMissing = Object.entries(missingCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([key]) => key);

    return { total, failRate, topMissing };
}

// ============================================
// Export default
// ============================================

export default {
    validateResponse,
    suggestQuickActions,
    recordTelemetry,
    getTelemetrySummary,
};
