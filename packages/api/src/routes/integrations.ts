import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';

export const integrationsRouter: Router = Router();

// Supabase helper para garantir client com service role se disponível
const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('[API-Integrations] Erro: SUPABASE_URL ou KEY não configurados no ambiente.');
        return null;
    }

    return createClient(supabaseUrl, supabaseKey);
};

integrationsRouter.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { user } = req;
        if (!user) {
            return res.status(401).json({ error: 'Não autenticado' });
        }

        const supabase = getSupabase();
        if (!supabase) {
            return res.status(500).json({ error: 'Serviço de banco de dados não disponível' });
        }

        console.log(`[API-Integrations] 🌉 Servindo como ponte para o usuário: ${user.id}`);

        // Busca integrações
        const { data: integrations, error: fetchError } = await supabase
            .from('user_integrations')
            .select('id, provider, services, provider_email, status, connected_at')
            .eq('user_id', user.id);

        if (fetchError) {
            console.error('[API-Integrations] Erro ao buscar integrações:', fetchError);
            throw fetchError;
        }

        // Busca logs
        const { data: logs, error: logsError } = await supabase
            .from('integration_activity_log')
            .select('id, provider, action, status, message, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (logsError) {
            console.warn('[API-Integrations] Erro ao buscar logs:', logsError);
        }

        console.log(`[API-Integrations] ✅ Retornando ${integrations?.length || 0} integrações.`);

        res.json({
            integrations: integrations || [],
            logs: logs || []
        });
    } catch (error: any) {
        console.error('[API-Integrations] Erro fatal:', error.message);
        res.status(500).json({ error: 'Erro interno ao processar integrações' });
    }
});
