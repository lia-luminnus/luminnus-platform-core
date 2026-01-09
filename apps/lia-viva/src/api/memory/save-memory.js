// ======================================================================
// 💾 SAVE-MEMORY API
// Salva diretamente uma memória importante no Supabase
// ======================================================================

import { detectAndSaveMemory } from "../../../config/supabase.js";

const FIXED_USER_ID = "00000000-0000-0000-0000-000000000001";

export default async function saveMemoryHandler(req, res) {
    try {
        const { text } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "Texto é obrigatório" });
        }

        await detectAndSaveMemory(text, FIXED_USER_ID);

        return res.json({
            success: true,
            saved: true
        });
    } catch (error) {
        console.error("❌ Erro save-memory:", error);
        return res.status(500).json({ error: "Erro ao salvar memória" });
    }
}
