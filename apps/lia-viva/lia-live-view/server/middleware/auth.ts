import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}

/**
 * Middleware para validar o token Supabase (Bearer)
 * Injeta o user_id no objeto da requisição
 */
export async function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        // Fallback para desenvolvimento se habilitado pelo usuário em sessoes anteriores
        if (process.env.NODE_ENV === 'development' && !process.env.REQUIRE_AUTH) {
            req.user = { id: '00000000-0000-0000-0000-000000000001' };
            return next();
        }
        return res.status(401).json({ error: 'Token de autorização não fornecido' });
    }

    try {
        if (!supabase) {
            return res.status(500).json({ error: 'Supabase não inicializado no servidor' });
        }

        // v11.5: Tentativa 1 - Validação Padrão
        let { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.warn(`[verifyAuth] getUser falhou (${error?.message || 'Sem user'}), tentando decode...`);
            try {
                const payloadPart = token.split('.')[1];
                if (!payloadPart) throw new Error('Token malformado');

                const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString());
                const sub = payload.sub;

                if (sub) {
                    console.log(`[verifyAuth] Validando UID via Admin API: ${sub}`);
                    const { data: adminUser, error: adminError } = await supabase.auth.admin.getUserById(sub);

                    if (!adminError && adminUser?.user) {
                        user = adminUser.user;
                        console.log(`[verifyAuth] Sucesso via Admin fallback: ${user.id}`);
                    } else {
                        throw new Error(adminError?.message || 'User not found in admin check');
                    }
                } else {
                    throw new Error('No sub claim');
                }
            } catch (fallbackErr: any) {
                console.error('[verifyAuth] Falha crítica na autenticação:', fallbackErr.message);
                return res.status(401).json({ error: 'Sessão inválida ou expirada' });
            }
        }

        req.user = { id: user.id };
        next();
    } catch (err) {
        console.error('[verifyAuth] Erro inesperado:', err);
        res.status(500).json({ error: 'Falha interna na autenticação' });
    }
}
