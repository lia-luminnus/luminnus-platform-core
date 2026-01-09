import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Priorizar SERVICE_KEY para o backend poder ler/escrever ignorando RLS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('--------------------------------------------------');
    console.error('❌ [Supabase] ERRO CRÍTICO DE CONFIGURAÇÃO');
    if (!supabaseUrl) console.error('👉 SUPABASE_URL não encontrada (verifique VITE_SUPABASE_URL também)');
    if (!supabaseKey) console.error('👉 SUPABASE_SERVICE_KEY ou SUPABASE_ANON_KEY não encontrada');
    console.error('--------------------------------------------------');

    // Se estivermos no Render, isso pode travar o boot. Vamos lançar um erro mais descritivo.
    if (!supabaseUrl && !supabaseKey) {
        throw new Error("Configuração do Supabase ausente. Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY.");
    }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder-to-avoid-crash.supabase.co', supabaseKey || 'placeholder-key', {
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
