// ============================================================
// LUMINNUS PLATFORM CORE - Shared Types (Local Copy)
// ============================================================
// NOTE: This is a local copy of types from @luminnus/shared
// to enable standalone frontend deployment.
// When the monorepo build is fixed, imports can be reverted 
// to use @luminnus/shared directly.

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

// Plans & Entitlements
export type LiaMode = 'chat' | 'multimodal' | 'live';

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
