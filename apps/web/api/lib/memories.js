import supabase from './supabaseClient.js';

/**
 * Carrega memórias importantes do usuário
 */
export async function loadImportantMemories(userId) {
    if (!supabase) return [];

    console.log(`🔍 [Memories] Buscando memórias para: ${userId}`);

    try {
        const { data, error } = await supabase
            .from("memories")
            .select("key, content")
            .eq("user_id", userId)
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(15);

        if (error) {
            console.error("❌ [Memories] Erro:", error);
            return [];
        }

        const DEFAULT_ID = "00000000-0000-0000-0000-000000000001";
        if ((!data || data.length === 0) && userId !== DEFAULT_ID) {
            const { data: fallbackData } = await supabase
                .from("memories")
                .select("key, content")
                .eq("user_id", DEFAULT_ID)
                .eq("status", "active")
                .order("updated_at", { ascending: false })
                .limit(10);

            return fallbackData || [];
        }

        return data || [];
    } catch (err) {
        console.error("❌ [Memories] Exceção:", err);
        return [];
    }
}
