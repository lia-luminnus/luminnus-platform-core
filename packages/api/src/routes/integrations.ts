import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { supabase } from '../config/supabase.js';

export const integrationsRouter: Router = Router();

integrationsRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { user } = req;
        if (!user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        if (!supabase) {
            return res.status(500).json({ error: 'Serviço de banco de dados não disponível' });
        }

        console.log(`[Integrations-Fetch-Check] 🆔 UserID from Auth Middleware: ${user.id}`);
        console.log(`[API-Integrations] 🌉 Servindo como ponte para o usuário: ${user.id}`);

        // Busca integrações
        const { data: integrations, error: fetchError } = await supabase
            .from('integrations_connections')
            .select('id, provider, scopes, provider_email, status, created_at')
            .eq('user_id', user.id);

        if (fetchError) {
            console.error('[API-Integrations] ❌ Erro ao buscar integrações:', fetchError);
        }

        console.log(`[API-Integrations] 📦 Dados crus do Supabase (${integrations?.length || 0} encontrados):`, JSON.stringify(integrations, null, 2));

        // Busca logs
        const { data: logs } = await supabase
            .from('integration_activity_log')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        console.log(`[API-Integrations] ✅ Retornando ${integrations?.length || 0} integrações.`);

        res.json({
            integrations: (integrations || []).map(i => ({
                id: i.id,
                provider: i.provider,
                services: i.scopes || [],
                status: i.status,
                connected_at: i.created_at
            })),
            logs: (logs || []).map(l => ({
                id: l.id,
                provider: l.provider,
                action: l.action,
                status: l.status,
                message: l.message,
                created_at: l.created_at
            }))
        });
    } catch (error: any) {
        console.error('[API-Integrations] Erro fatal:', error.message);
        res.status(500).json({ error: 'Erro interno ao processar integrações' });
    }
});
