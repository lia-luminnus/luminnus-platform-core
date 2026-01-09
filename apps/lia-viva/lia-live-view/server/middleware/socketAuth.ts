// ===========================================================
// 🔐 SOCKET AUTH MIDDLEWARE - Multi-Tenant Authentication
// ===========================================================
// Valida token Supabase no handshake do Socket.IO
// Extrai userId, tenantId, plan e conversationId
// Rejeita conexões não autenticadas
// ===========================================================

import type { Socket } from "socket.io";
import { createClient } from "@supabase/supabase-js";

// ExtendedError type inline (evita import de módulo interno)
type ExtendedError = Error & { data?: any };

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_KEY!;

// Criar cliente Supabase admin (service role) para validação de tokens
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

export type SocketAuthContext = {
    userId: string;
    tenantId: string;
    plan?: string;
    conversationId?: string;
};

/**
 * Extrai Bearer token de uma string
 */
function getBearer(raw?: string): string | null {
    if (!raw) return null;
    const v = raw.trim();
    if (v.toLowerCase().startsWith("bearer ")) return v.slice(7).trim();
    return v;
}

/**
 * Middleware de autenticação para Socket.IO
 * Valida token e extrai contexto do usuário
 */
export async function socketAuth(
    socket: Socket,
    next: (err?: ExtendedError) => void
): Promise<void> {
    try {
        const auth = socket.handshake.auth || {};
        const token = getBearer(auth.token);
        const tenantId = (auth.tenantId || "").toString().trim();
        const conversationId = (auth.conversationId || "").toString().trim() || undefined;

        // Validação: token obrigatório
        if (!token) {
            console.warn("🔒 [SocketAuth] Conexão rejeitada: token ausente");
            return next(new Error("UNAUTHORIZED: missing token"));
        }

        // Validação: tenantId obrigatório
        if (!tenantId) {
            console.warn("🔒 [SocketAuth] Conexão rejeitada: tenantId ausente");
            return next(new Error("UNAUTHORIZED: missing tenantId"));
        }

        // Validar token com Supabase
        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !data?.user) {
            console.warn("🔒 [SocketAuth] Conexão rejeitada: token inválido");
            return next(new Error("UNAUTHORIZED: invalid token"));
        }

        const userId = data.user.id;
        if (!userId) {
            console.warn("🔒 [SocketAuth] Conexão rejeitada: userId ausente no token");
            return next(new Error("UNAUTHORIZED: missing userId"));
        }

        // Plan pode vir do client ou ser buscado do DB (opcional por agora)
        const plan = (auth.plan || "").toString().trim() || undefined;

        // Contexto autenticado
        const ctx: SocketAuthContext = { userId, tenantId, plan, conversationId };

        // Persistir contexto no socket.data para uso posterior
        (socket.data as any).auth = ctx;

        console.log(`✅ [SocketAuth] Usuário autenticado: ${userId} (tenant: ${tenantId})`);
        return next();

    } catch (err) {
        console.error("❌ [SocketAuth] Erro na autenticação:", err);
        return next(new Error("UNAUTHORIZED"));
    }
}

/**
 * Fallback para conexões dev/anônimas (apenas em NODE_ENV=development)
 * Use com cautela - apenas para facilitar testes locais
 */
export async function socketAuthDev(
    socket: Socket,
    next: (err?: ExtendedError) => void
): Promise<void> {
    const auth = socket.handshake.auth || {};
    const tenantId = (auth.tenantId || "default-tenant").toString().trim();

    // v2.7: Garantir que o userId seja um UUID válido (mesmo em dev) para não quebrar o banco
    const userId = (auth.userId || "5d626893-2cdb-4a75-a84e-360713f65026").toString().trim();
    const conversationId = (auth.conversationId || "").toString().trim() || undefined;

    const ctx: SocketAuthContext = { userId, tenantId, conversationId };
    (socket.data as any).auth = ctx;

    console.log(`⚠️ [SocketAuth-DEV] Conexão permitida sem validação: ${userId} (tenant: ${tenantId})`);
    return next();
}
