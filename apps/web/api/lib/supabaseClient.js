import { createClient } from "@supabase/supabase-js";

// Cliente Supabase para o backend (com service key para bypass de RLS)
const supabaseUrl = process.env.SUPABASE_URL || "https://byzcwpyzvywkfzpcmztr.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.warn("[Supabase] SUPABASE_SERVICE_KEY não configurada. Usando anon key.");
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || process.env.SUPABASE_ANON_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabase;
