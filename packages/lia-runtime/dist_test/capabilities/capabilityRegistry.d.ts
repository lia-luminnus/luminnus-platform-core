/**
 * LIA Capability Registry v1.0
 * SSOT para capacidades de execução disponíveis
 */
export interface Capability {
    id: string;
    provider: string;
    action: string;
    displayName: string;
    requiresAuth: boolean;
    requiresConnection: boolean;
    scopes?: string[];
    toolHandler?: string;
    allowedPlans: ('free' | 'start' | 'plus' | 'pro' | 'admin' | 'premium' | 'enterprise' | 'ceo' | 'owner')[];
}
export declare const ADMIN_PLANS: string[];
/**
 * Registro central de capacidades disponíveis
 */
export declare const CAPABILITY_REGISTRY: Capability[];
export interface CanExecuteResult {
    canExecute: boolean;
    capability?: Capability;
    reason?: string;
}
export interface ConnectionStatus {
    gmail?: boolean;
    workspace?: boolean;
    calendar?: boolean;
}
/**
 * Verifica se uma ação pode ser executada
 */
export declare function canExecute(capabilityId: string, userPlan?: string, connections?: ConnectionStatus): CanExecuteResult;
/**
 * Extrai ActionRequest estruturado do texto do usuário
 */
export interface ActionRequest {
    provider: string;
    action: string;
    targets: string[];
    params: Record<string, any>;
    capabilityId: string;
}
export declare function extractActionRequest(userText: string): ActionRequest | null;
/**
 * Gera resposta de fallback quando não pode executar
 */
export declare function generateActionFallback(capability: Capability, reason: string): string;
//# sourceMappingURL=capabilityRegistry.d.ts.map