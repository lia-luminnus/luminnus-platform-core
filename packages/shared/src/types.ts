// ============================================================
// LUMINNUS PLATFORM CORE - Shared Types
// ============================================================

// User & Auth
export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
}

export interface Session {
    user: User;
    company: Company | null;
    plan: Plan | null;
    entitlements: string[];
}

// Multi-tenant
export interface Company {
    id: string;
    name: string;
    slug?: string;
    plan_id: string;
    owner_id?: string;
    logo_url?: string;
    is_active: boolean;
}

export interface Membership {
    id: string;
    user_id: string;
    company_id: string;
    role: 'owner' | 'admin' | 'member';
}

// Plans & Entitlements
export interface Plan {
    id: string;
    name: string;
    description?: string;
    price_monthly: number;
    price_yearly?: number;
    modes: LiaMode[];
    max_users: number;
    max_storage_mb: number;
}

export type LiaMode = 'chat' | 'multimodal' | 'live';

export interface Entitlement {
    id: string;
    plan_id: string;
    feature: string;
    description?: string;
    limits?: Record<string, unknown>;
}

// Conversations
export interface Conversation {
    id: string;
    user_id: string;
    company_id: string;
    mode: LiaMode;
    title?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, unknown>;
    attachments?: Attachment[];
    created_at: string;
}

export interface Attachment {
    type: 'image' | 'file' | 'audio' | 'video';
    url: string;
    name?: string;
    size?: number;
    mime_type?: string;
}

// Audit
export interface AuditLog {
    id: string;
    user_id: string;
    company_id: string;
    action: string;
    resource?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    created_at: string;
}

// Tool Invocations (LIA)
export interface ToolInvocation {
    id: string;
    conversation_id?: string;
    user_id: string;
    company_id: string;
    tool_name: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    status: 'pending' | 'success' | 'error';
    duration_ms?: number;
    created_at: string;
}

// API Responses
export interface ApiMeResponse {
    user: User;
    company: Company | null;
    plan: Plan | null;
    entitlements: string[];
}

export interface HealthResponse {
    status: 'ok' | 'degraded' | 'error';
    env: string;
    timestamp: string;
    checks: Array<{
        name: string;
        status: 'ok' | 'error';
        message?: string;
    }>;
}

export interface VersionResponse {
    version: string;
    env: string;
    buildTimestamp: string;
    apiName: string;
}
