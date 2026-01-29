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

// Planos com acesso total a todas as capacidades (bypass)
export const ADMIN_PLANS = ['admin', 'pro', 'premium', 'enterprise', 'ceo', 'owner'];


/**
 * Registro central de capacidades disponíveis
 */
export const CAPABILITY_REGISTRY: Capability[] = [
    // Gmail
    {
        id: 'gmail.delete_email',
        provider: 'gmail',
        action: 'delete_email',
        displayName: 'Deletar E-mail',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.modify'],
        toolHandler: 'gmail_delete',
        allowedPlans: ['plus', 'pro']
    },
    {
        id: 'gmail.send_email',
        provider: 'gmail',
        action: 'send_email',
        displayName: 'Enviar E-mail',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.send'],
        toolHandler: 'gmail_send',
        allowedPlans: ['start', 'plus', 'pro']
    },
    {
        id: 'gmail.move_to_trash',
        provider: 'gmail',
        action: 'move_to_trash',
        displayName: 'Mover para Lixeira',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.modify'],
        toolHandler: 'gmail_trash',
        allowedPlans: ['start', 'plus', 'pro']
    },
    {
        id: 'gmail.search_email',
        provider: 'gmail',
        action: 'search_email',
        displayName: 'Buscar E-mails',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.readonly'],
        toolHandler: 'gmail_search',
        allowedPlans: ['start', 'plus', 'pro']
    },

    // Google Workspace
    {
        id: 'workspace.create_doc',
        provider: 'workspace',
        action: 'create_doc',
        displayName: 'Criar Documento',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['docs'],
        toolHandler: 'docs_create',
        allowedPlans: ['plus', 'pro']
    },
    {
        id: 'workspace.update_sheet',
        provider: 'workspace',
        action: 'update_sheet',
        displayName: 'Atualizar Planilha',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['sheets'],
        toolHandler: 'sheets_update',
        allowedPlans: ['start', 'plus', 'pro']
    },

    // Calendar
    {
        id: 'calendar.create_event',
        provider: 'calendar',
        action: 'create_event',
        displayName: 'Criar Evento',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['calendar'],
        toolHandler: 'calendar_create',
        allowedPlans: ['start', 'plus', 'pro']
    },

    // Dashboard (interno)
    {
        id: 'dashboard.add_widget',
        provider: 'dashboard',
        action: 'add_widget',
        displayName: 'Adicionar Widget',
        requiresAuth: false,
        requiresConnection: false,
        toolHandler: 'dashboard_widget',
        allowedPlans: ['free', 'start', 'plus', 'pro']
    }
];

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
export function canExecute(
    capabilityId: string,
    userPlan: string = 'free',
    connections: ConnectionStatus = {}
): CanExecuteResult {
    const capability = CAPABILITY_REGISTRY.find(c => c.id === capabilityId);

    if (!capability) {
        return { canExecute: false, reason: `Capacidade "${capabilityId}" não encontrada no registro` };
    }

    // v1.1: Admin Bypass - planos de alto nível têm acesso total
    const isAdminPlan = ADMIN_PLANS.includes(userPlan.toLowerCase());

    // Verificar plano (com bypass para admins)
    if (!isAdminPlan && !capability.allowedPlans.includes(userPlan as any)) {
        return {
            canExecute: false,
            capability,
            reason: `Essa ação requer plano ${capability.allowedPlans.join(' ou ')}. Seu plano atual é ${userPlan}.`
        };
    }


    // Verificar conexão
    if (capability.requiresConnection) {
        const isConnected = connections[capability.provider as keyof ConnectionStatus];
        if (!isConnected) {
            return {
                canExecute: false,
                capability,
                reason: `Integração com ${capability.provider} não está conectada. Conecte no painel de integrações.`
            };
        }
    }

    return { canExecute: true, capability };
}

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

export function extractActionRequest(userText: string): ActionRequest | null {
    // Normalizar texto: remover prefixes de contrato se houver
    let text = userText.toLowerCase();
    if (text.includes('=== pedido do usuário ===')) {
        text = text.split('=== pedido do usuário ===')[1].trim();
    }

    // Gmail: delete/apagar emails
    // Aumentamos a flexibilidade: se falar "deleta os e-mails" ou apenas "deleta os 2" ou "excluir novamente"
    if ((text.includes('delete') || text.includes('apag') || text.includes('exclu') || text.includes('limp')) &&
        (text.includes('email') || text.includes('e-mail') || text.includes('esses') || text.includes('eles') || text.includes('novamente') || text.includes('tudo'))) {

        // Tentar extrair quantidade
        const match = text.match(/(\d+)/);
        const count = match ? parseInt(match[1]) : 1;

        return {
            provider: 'gmail',
            action: 'delete_email',
            targets: [], // Seria preenchido com IDs reais após busca
            params: { count },
            capabilityId: 'gmail.delete_email'
        };
    }

    // Calendar: criar evento/reunião
    if ((text.includes('cri') || text.includes('agend') || text.includes('marqu')) &&
        (text.includes('evento') || text.includes('reunião') || text.includes('meet') || text.includes('compromisso') || text.includes('agenda'))) {
        return {
            provider: 'calendar',
            action: 'create_event',
            targets: [],
            params: {},
            capabilityId: 'calendar.create_event'
        };
    }

    // Gmail: enviar email
    if ((text.includes('envi') || text.includes('mand') || text.includes('escrev')) &&
        (text.includes('email') || text.includes('e-mail') || text.includes('mensagem') || text.includes('correio'))) {
        return {
            provider: 'gmail',
            action: 'send_email',
            targets: [],
            params: {},
            capabilityId: 'gmail.send_email'
        };
    }

    // Dashboard: adicionar widget
    if ((text.includes('adicion') || text.includes('insir') || text.includes('coloc')) &&
        (text.includes('widget') || text.includes('card') || text.includes('gráfico') || text.includes('painel'))) {
        return {
            provider: 'dashboard',
            action: 'add_widget',
            targets: [],
            params: {},
            capabilityId: 'dashboard.add_widget'
        };
    }

    return null;
}

/**
 * Gera resposta de fallback quando não pode executar
 */
export function generateActionFallback(capability: Capability, reason: string): string {
    return `⚠️ **Não consigo executar "${capability.displayName}" agora.**

• ${reason}
• Habilite essa integração no painel de Integrações.

💡 **Próximo passo**: Vá em Configurações → Integrações → ${capability.provider.charAt(0).toUpperCase() + capability.provider.slice(1)} e conecte sua conta.`;
}
