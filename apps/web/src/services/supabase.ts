/**
 * SUPABASE CLIENT
 * Arquivo centralizado para conexao com o Supabase
 *
 * Uso: import { supabase } from "@/services/supabase";
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Re-export para compatibilidade com imports existentes
export default supabase;
