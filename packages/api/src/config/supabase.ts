import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Priorizar SERVICE_KEY para o backend poder ler/escrever ignorando RLS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.error('[Supabase] ❌ Erro: SUPABASE_URL não configurada.');
}

if (!supabaseKey) {
    console.error('[Supabase] ❌ Erro: Nenhuma chave (SERVICE ou ANON) encontrada.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Log informativo ultra-visível
if (supabaseKey === process.env.SUPABASE_SERVICE_KEY && supabaseKey) {
    console.log('--------------------------------------------------');
    console.log('✅ [Supabase] CLIENTE INICIALIZADO COM SERVICE_ROLE');
    console.log('🚀 (Bypass RLS habilitado para o backend)');
    console.log('--------------------------------------------------');
} else {
    console.warn('--------------------------------------------------');
    console.warn('⚠️  [Supabase] CLIENTE USANDO ANON_KEY OU CHAVE AUSENTE');
    console.warn('❌ (O backend pode sofrer bloqueio de RLS no banco)');
    console.warn('--------------------------------------------------');
}
