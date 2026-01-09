// ======================================================================
// 🔧 SESSION-CONFIG API (WebRTC + Memória + Histórico)
// Fornece instruções, memória e histórico recente para o RealtimeVoiceClient
// ======================================================================

import {
    loadImportantMemories,
    loadRecentMessages
} from "../../../config/supabase.js";

import { getInstructions } from "../../../config/personality.js";

const FIXED_USER_ID = "00000000-0000-0000-0000-000000000001";

export default async function sessionConfigHandler(req, res) {
    try {
        const { conversationId } = req.query;

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId é obrigatório" });
        }

        const memories = await loadImportantMemories(FIXED_USER_ID).catch(() => []);

        const memoryMessages =
            memories.length > 0
                ? memories.map((m) => ({
                    role: "system",
                    content: `${m.key.replace(/_/g, " ")}: ${m.value}`
                }))
                : [];

        const recentMessages = await loadRecentMessages(conversationId, 50).catch(() => []);
        const history =
            recentMessages.length > 0
                ? recentMessages.map((m) => ({
                    role: m.role,
                    content: m.content
                }))
                : [];

        // ⚠️ MODO CHATGPT VOICE RELAY:
        // Realtime NÃO recebe personalidade - apenas histórico
        // Backend aplica personalidade via /chat

        return res.json({
            success: true,
            systemInstruction: "",  // ✅ Vazio - Realtime é passivo
            messages: history,       // ✅ Apenas histórico (SEM system/memories)
            conversationId
        });

    } catch (error) {
        console.error("❌ Erro session-config:", error);
        return res.status(500).json({ error: "Erro interno no session-config" });
    }
}

