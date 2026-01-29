// ======================================================================
// 🎯 Capabilities - Controle de permissões por role e plano
// ======================================================================

/**
 * Retorna as capabilities (permissões) baseadas no role e plano do usuário
 */
export function getCapabilities(role: string, plan: string = 'start') {
    // Capabilities base para clientes
    const baseClient = {
        // ✅ Permitido para clientes
        canSendEmail: true,
        canCreateDoc: true,
        canCreateSheet: true,
        canCreateEvent: true,
        canGenerateReport: true,
        canUploadFile: true,
        canViewFiles: true,
        canUseVoice: true,
        canUseLiveMode: plan.toLowerCase() === 'pro' || plan.toLowerCase() === 'enterprise',

        // ❌ Proibido para clientes (só admin)
        canViewLogs: false,
        canTestEndpoint: false,
        canDebug: false,
        canValidateDKIM: false,
        canAccessAdminPanel: false,
        canManageUsers: false,
        canEditPlan: false
    };

    // Capabilities para admin (acesso total)
    const admin = {
        ...baseClient,
        canViewLogs: true,
        canTestEndpoint: true,
        canDebug: true,
        canValidateDKIM: true,
        canAccessAdminPanel: true,
        canManageUsers: true,
        canEditPlan: true,
        canUseLiveMode: true
    };

    // Retornar baseado no role
    if (role === 'admin' || role === 'owner') {
        return admin;
    }

    return baseClient;
}

/**
 * Verifica se usuário tem permissão para executar uma ação
 */
export function hasCapability(action: string, role: string, plan: string = 'start') {
    const capabilities = getCapabilities(role, plan) as any;
    return capabilities[action] === true;
}

/**
 * Filtra itens (como links de nav) baseado em capabilities
 */
export function filterByCapability(items: any[], role: string, plan: string = 'start', capabilityField: string = 'requiredCapability') {
    const capabilities = getCapabilities(role, plan) as any;
    return items.filter(item => {
        if (!item[capabilityField]) return true;
        return capabilities[item[capabilityField]] === true;
    });
}
