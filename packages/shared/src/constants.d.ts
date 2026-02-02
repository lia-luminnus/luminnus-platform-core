export declare const PLAN_IDS: {
    readonly START: "start";
    readonly PLUS: "plus";
    readonly PRO: "pro";
};
export declare const LIA_MODES: {
    readonly CHAT: "chat";
    readonly MULTIMODAL: "multimodal";
    readonly LIVE: "live";
};
export declare const ROLES: {
    readonly OWNER: "owner";
    readonly ADMIN: "admin";
    readonly MEMBER: "member";
};
export declare const AUDIT_ACTIONS: {
    readonly AUTH_LOGIN: "auth.login";
    readonly AUTH_LOGOUT: "auth.logout";
    readonly PLAN_UPGRADE: "plan.upgrade";
    readonly PLAN_DOWNGRADE: "plan.downgrade";
    readonly FILE_UPLOAD: "file.upload";
    readonly FILE_DELETE: "file.delete";
    readonly CONFIG_CHANGE: "config.change";
    readonly MEMBER_INVITE: "member.invite";
    readonly MEMBER_REMOVE: "member.remove";
    readonly LIA_SESSION_START: "lia.session_start";
    readonly LIA_TOOL_INVOKE: "lia.tool_invoke";
};
export declare const PLAN_FEATURES: {
    readonly start: readonly ["chat", "basic_calendar"];
    readonly plus: readonly ["chat", "multimodal", "files", "calendar", "reports"];
    readonly pro: readonly ["chat", "multimodal", "live", "files", "calendar", "reports", "automations", "advanced_reports", "api_access"];
};
export declare const API_ROUTES: {
    readonly HEALTH: "/health";
    readonly VERSION: "/version";
    readonly ME: "/api/me";
    readonly AUTH: "/api/auth";
    readonly CONVERSATIONS: "/api/conversations";
    readonly MESSAGES: "/api/messages";
};
//# sourceMappingURL=constants.d.ts.map