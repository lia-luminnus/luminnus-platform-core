/**
 * Configuração centralizada de autenticação e permissões
 * SSOT (Single Source of Truth) para constantes de auth
 */

// Lista de emails com acesso administrativo
// Configurável via variável de ambiente VITE_ADMIN_EMAILS
export const ADMIN_EMAILS: string[] = (
    import.meta.env.VITE_ADMIN_EMAILS || "luminnus.lia.ai@gmail.com"
)
    .split(",")
    .map((e: string) => e.trim())
    .filter(Boolean);

// URLs de redirecionamento
export const AUTH_URLS = {
    DASHBOARD: import.meta.env.VITE_DASHBOARD_URL || "http://localhost:3001",
    AUTH_CALLBACK: "/auth-callback",
    ADMIN_DASHBOARD: "/admin-dashboard",
    LOGIN: "/auth",
    HOME: "/",
} as const;

// Verifica se um email tem permissão de admin
export const isAdminEmail = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

// Duração da sessão admin (em ms)
export const ADMIN_SESSION_DURATION_MS = 3600000; // 1 hora
