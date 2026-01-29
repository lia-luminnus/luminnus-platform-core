import { AuditService } from './auditService.js';

export interface AssuranceAuditResult {
    passed: boolean;
    violations: string[];
    riskScore: number; // 0-100
}

/**
 * GOVERNOR ASSURANCE SERVICE (v1.0)
 * Medida de segurança e avaliação para garantir integridade e SSOT.
 */
export class GovernorAssurance {

    private static PROHIBITED_PATTERNS = [
        /\[(link|planilha|arquivo|doc|aqui|clique)[^\]]*?\](?!\()/, // Placeholders sem link
        /link_aqui/i,
        /veja aqui/i
    ];

    /**
     * Realiza auditoria completa de uma transação AI
     */
    static async audit(context: {
        userId: string;
        tenantId: string;
        prompt: string;
        response: string;
        intent: string;
        toolsCalled: string[];
    }): Promise<AssuranceAuditResult> {
        const violations: string[] = [];
        let riskScore = 0;

        console.log(`🛡️ [GovernorAssurance] Iniciando auditoria para intent: ${context.intent}`);

        // 1. Verificar Placeholders Probidos
        for (const pattern of this.PROHIBITED_PATTERNS) {
            if (pattern.test(context.response)) {
                violations.push(`ALUCINAÇÃO: Placeholder detectado (${pattern.source})`);
                riskScore += 40;
            }
        }

        // 2. Verificar Consistência de Intenção vs Ferramentas
        // v9.0: Ferramentas de busca/análise são permitidas para qualquer intenção
        const researchTools = ['searchWeb', 'getWeather', 'getLocation', 'getDirections', 'listGmailMessages', 'searchGmail', 'listCalendarEvents', 'getBusinessMetrics'];
        const workspaceTools = context.toolsCalled.filter(t => 
            (t.startsWith('createGoogle') || t.startsWith('updateGoogle')) && 
            !researchTools.includes(t)
        );

        if (context.intent === 'CREATE' || context.intent === 'CORRECT') {
            const hasWorkspaceTool = workspaceTools.length > 0;

            if (!hasWorkspaceTool && context.toolsCalled.length > 0) {
                // Se chamou apenas ferramentas de pesquisa/análise, não é violação
                const onlyResearchTools = context.toolsCalled.every(t => researchTools.includes(t));
                
                if (!onlyResearchTools) {
                    riskScore += 30;
                    violations.push(`CONFORMIDADE: Intenção '${context.intent}' sem chamada de ferramenta correspondente.`);
                }
            }
        }

        // 3. Verificar se a resposta está vazia
        if (!context.response || context.response.trim().length < 5) {
            violations.push(`INTEGRIDADE: Resposta excessivamente curta ou vazia.`);
            riskScore += 50;
        }

        const passed = riskScore < 70;

        // Registrar no AuditService
        await AuditService.log(
            context.userId,
            context.tenantId,
            'LIA_GOVERNOR',
            'governor_audit',
            passed ? 'success' : 'error',
            `Auditoria de segurança ${passed ? 'passou' : 'falhou'} para intent ${context.intent}`,
            {
                intent: context.intent,
                riskScore,
                violations,
                toolsCalled: context.toolsCalled
            }
        );

        if (!passed) {
            console.error(`⚠️ [GovernorAssurance] Auditoria FALHOU (Score: ${riskScore}). Violações:`, violations);
        } else if (violations.length > 0) {
            console.warn(`⚠️ [GovernorAssurance] Auditoria passou com ressalvas (Score: ${riskScore}). Violações:`, violations);
        } else {
            console.log(`✅ [GovernorAssurance] Auditoria PASSOU.`);
        }

        return {
            passed,
            violations,
            riskScore
        };
    }
}
