import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
);

export const configError = (!SUPABASE_URL || !SUPABASE_ANON_KEY)
    ? `[Dashboard] Configuração do Supabase incompleta. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no seu .env.local.`
    : null;

if (configError) {
    console.error(configError);
}

// Enterprise Hardening: explicit auth options for token handoff
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // We handle parsing in AuthBridge
            storage: localStorage,
            storageKey: 'sb-dashboard-auth',
            flowType: 'implicit' // MUST be implicit for token handoff from Admin
        }
    })
    : null as any; // No placeholders! UI handles null via configError.
