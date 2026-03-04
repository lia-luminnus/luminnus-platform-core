// ============================================================
// LUMINNUS PLATFORM CORE - Constants
// ============================================================

export const PLAN_IDS = {
    START: 'start',
    PLUS: 'plus',
    PRO: 'pro'
} as const;

export const LIA_MODES = {
    CHAT: 'chat',
    MULTIMODAL: 'multimodal',
    LIVE: 'live'
} as const;

export const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member'
} as const;

export const AUDIT_ACTIONS = {
    AUTH_LOGIN: 'auth.login',
    AUTH_LOGOUT: 'auth.logout',
    PLAN_UPGRADE: 'plan.upgrade',
    PLAN_DOWNGRADE: 'plan.downgrade',
    FILE_UPLOAD: 'file.upload',
    FILE_DELETE: 'file.delete',
    CONFIG_CHANGE: 'config.change',
    MEMBER_INVITE: 'member.invite',
    MEMBER_REMOVE: 'member.remove',
    LIA_SESSION_START: 'lia.session_start',
    LIA_TOOL_INVOKE: 'lia.tool_invoke'
} as const;

// Feature flags per plan (v2.0 — sem WhatsApp, foco leads)
export const PLAN_FEATURES = {
    [PLAN_IDS.START]: ['chat', 'web_widget', 'telegram', 'crm', 'basic_calendar'],
    [PLAN_IDS.PLUS]: ['chat', 'web_widget', 'telegram', 'crm', 'multimodal', 'files', 'calendar', 'reports', 'automations'],
    [PLAN_IDS.PRO]: [
        'chat', 'web_widget', 'telegram', 'crm',
        'multimodal', 'live',
        'files', 'calendar', 'reports',
        'automations', 'advanced_reports', 'api_access',
        'team', 'financial'
    ]
} as const;

// API Routes
export const API_ROUTES = {
    HEALTH: '/health',
    VERSION: '/version',
    ME: '/api/me',
    AUTH: '/api/auth',
    CONVERSATIONS: '/api/conversations',
    MESSAGES: '/api/messages'
} as const;
