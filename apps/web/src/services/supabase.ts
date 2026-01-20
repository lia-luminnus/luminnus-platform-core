/**
 * SUPABASE CLIENT
 * Arquivo centralizado para conexao com o Supabase
 *
 * Uso: import { supabase } from "@/services/supabase";
 */
// v4.6: Re-exportando do cliente unificado para evitar duplicidade de sessions
import { supabase } from "@/integrations/supabase/client";
export { supabase };
export default supabase;


