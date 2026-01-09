import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
);

export const configError = (!SUPABASE_URL || !SUPABASE_ANON_KEY)
    ? `Configuração do Supabase incompleta em Dashboard-client. Verifique o arquivo .env.local neste diretório e certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidos.`
    : null;

if (configError) {
    console.warn(`⚠️ [Dashboard-client] ${configError}`);
}

// Inicializa o cliente apenas se tiver as credenciais
// Caso contrário, exportamos um objeto que não causará crash imediato mas alertará no console
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: localStorage,
            storageKey: 'sb-dashboard-client-auth',
            flowType: 'implicit'
        }
    })
    : null;
