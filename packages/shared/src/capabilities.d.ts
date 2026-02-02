/**
 * Retorna as capabilities (permissões) baseadas no role e plano do usuário
 */
export declare function getCapabilities(role: string, plan?: string): {
    canSendEmail: boolean;
    canCreateDoc: boolean;
    canCreateSheet: boolean;
    canCreateEvent: boolean;
    canGenerateReport: boolean;
    canUploadFile: boolean;
    canViewFiles: boolean;
    canUseVoice: boolean;
    canUseLiveMode: boolean;
    canViewLogs: boolean;
    canTestEndpoint: boolean;
    canDebug: boolean;
    canValidateDKIM: boolean;
    canAccessAdminPanel: boolean;
    canManageUsers: boolean;
    canEditPlan: boolean;
};
/**
 * Verifica se usuário tem permissão para executar uma ação
 */
export declare function hasCapability(action: string, role: string, plan?: string): boolean;
/**
 * Filtra itens (como links de nav) baseado em capabilities
 */
export declare function filterByCapability(items: any[], role: string, plan?: string, capabilityField?: string): any[];
//# sourceMappingURL=capabilities.d.ts.map