/**
 * LIA Action Policy v3.0 (SSOT)
 * 
 * Centralized registry and logic for filtering available actions based on:
 * 1. Tool Availability (Must exist in registry)
 * 2. User Role (Admin vs Client)
 * 3. Scope & Domain Relevance
 * 4. Plan Permissions
 */

export type UserRole = 'admin' | 'client' | 'owner' | 'ceo' | 'enterprise';
export type ActionDomain = 'email' | 'calendar' | 'file' | 'finance' | 'system' | 'debug' | 'dashboard' | 'crm' | 'support';

export interface ActionDefinition {
    id: string;
    label: string;
    toolName: string;
    icon: string;
    scope: 'client' | 'admin' | 'both';
    domain: ActionDomain;
    minPlan?: 'free' | 'plus' | 'pro' | 'enterprise';
    requiresTool?: boolean;
    description?: string;
}

/**
 * SSOT ACTION REGISTRY
 * Only these actions can be rendered as buttons/CTAs.
 */
export const ACTION_REGISTRY: ActionDefinition[] = [
    // --- EMAIL DOMAIN ---
    { id: 'email.preview', label: 'Ver prévia', toolName: 'email.preview', icon: 'file', scope: 'both', domain: 'email' },
    { id: 'email.send', label: 'Enviar e-mail', toolName: 'sendGmail', icon: 'send', scope: 'both', domain: 'email', minPlan: 'plus' },
    { id: 'email.resend', label: 'Reenviar e-mail', toolName: 'email.resend', icon: 'mail', scope: 'both', domain: 'email', minPlan: 'plus' },
    { id: 'email.status', label: 'Status do envio', toolName: 'email.status', icon: 'activity', scope: 'both', domain: 'email' },

    // --- CALENDAR DOMAIN ---
    { id: 'calendar.create', label: 'Agendar reunião', toolName: 'createCalendarEvent', icon: 'activity', scope: 'both', domain: 'calendar' },
    { id: 'calendar.send_invite', label: 'Enviar convite', toolName: 'calendar.send_invite', icon: 'send', scope: 'both', domain: 'calendar' },

    // --- FILE / DOCS DOMAIN ---
    { id: 'file.generate_corrected', label: 'Gerar versão corrigida', toolName: 'docs.generate_corrected', icon: 'zap', scope: 'both', domain: 'file' },
    { id: 'file.export_report', label: 'Exportar relatório', toolName: 'docs.export_report', icon: 'list', scope: 'both', domain: 'file' },
    { id: 'file.export_sheets', label: 'Exportar para Sheets', toolName: 'createGoogleSheet', icon: 'list', scope: 'both', domain: 'file', minPlan: 'plus' },
    { id: 'file.download', label: 'Baixar arquivo', toolName: 'ui.download_file', icon: 'download', scope: 'both', domain: 'file' },
    { id: 'file.compare', label: 'Comparar versões', toolName: 'file.compare_versions', icon: 'refresh-cw', scope: 'both', domain: 'file' },

    // --- DASHBOARD DOMAIN ---
    { id: 'dashboard.add_widget', label: 'Adicionar ao Dashboard', toolName: 'dashboardAddWidget', icon: 'zap', scope: 'both', domain: 'dashboard' },
    { id: 'dashboard.snapshot', label: 'Ver Snapshot', toolName: 'dashboardGetSnapshot', icon: 'activity', scope: 'both', domain: 'dashboard' },

    // --- CRM / OPS DOMAIN ---
    { id: 'crm.create_lead', label: 'Criar Lead', toolName: 'crmCreateLead', icon: 'zap', scope: 'both', domain: 'crm', minPlan: 'plus' },

    // --- ADMIN / DEBUG DOMAIN (PROHIBITED FOR CLIENTS) ---
    { id: 'debug.get_logs', label: 'Ver logs internos', toolName: 'getSystemLogs', icon: 'terminal', scope: 'admin', domain: 'debug' },
    { id: 'debug.health', label: 'Healthcheck', toolName: 'getSystemHealth', icon: 'activity', scope: 'admin', domain: 'debug' },
    { id: 'debug.test_endpoint', label: 'Testar endpoint', toolName: 'debug.testEndpoint', icon: 'zap', scope: 'admin', domain: 'debug' },
    { id: 'email.validate_domain', label: 'Validar DKIM/DNS', toolName: 'email.validateDomain', icon: 'shield', scope: 'admin', domain: 'email' },

    // --- SUPPORT DOMAIN (Only in support flow) ---
    { id: 'support.open_ticket', label: 'Falar com suporte', toolName: 'createSupportTicket', icon: 'mail', scope: 'both', domain: 'support' },
];

export interface ActionFilterOptions {
    userRole: string;
    userPlan?: string;
    domain?: ActionDomain;
}

/**
 * Determines if a specific action is allowed for a user.
 */
export function isActionAllowed(actionIdOrToolName: string, options: ActionFilterOptions): boolean {
    const { userRole, userPlan = 'free' } = options;
    const role = userRole.toLowerCase();
    const isAdmin = ['admin', 'owner', 'ceo', 'enterprise'].includes(role);

    // Find action in registry
    const action = ACTION_REGISTRY.find(a => a.id === actionIdOrToolName || a.toolName === actionIdOrToolName);

    if (!action) {
        console.warn(`🛑 [ActionPolicy] Ação não encontrada no registro (NÃO RENDERIZADA): ${actionIdOrToolName}`);
        return false;
    }

    // 1. Scope Check
    if (action.scope === 'admin' && !isAdmin) {
        console.warn(`🛑 [ActionPolicy] Acesso NEGADO (Admin Only): ${action.id} para role ${userRole}`);
        return false;
    }

    // 2. Client-only restrictions
    if (action.scope === 'client' && isAdmin) {
        // Usually admins can see client tools, but we could restrict here if needed
    }

    // 3. Plan Check (Simulated for now)
    // if (action.minPlan && !hasPlanAccess(userPlan, action.minPlan)) return false;

    return true;
}

/**
 * Returns the full definition for an action if allowed.
 */
export function getActionDefinition(id: string, options: ActionFilterOptions): ActionDefinition | null {
    if (isActionAllowed(id, options)) {
        return ACTION_REGISTRY.find(a => a.id === id || a.toolName === id) || null;
    }
    return null;
}

export default {
    ACTION_REGISTRY,
    isActionAllowed,
    getActionDefinition
};
