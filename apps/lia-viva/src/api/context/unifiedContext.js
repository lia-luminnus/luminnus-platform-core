// ==========================================================
// LIA — UNIFIED CONTEXT MODULE (VERSÃO CORRIGIDA)
// Agora retorna: instruções + memórias + histórico completo
// Para ser usado no Realtime e no Chat comum
// ==========================================================

import {
    loadImportantMemories,
    loadRecentMessages
} from "../../../config/supabase.js";

import { getInstructions } from "../../../config/personality.js";

const unifiedContext = {
    async getUnifiedContext(conversationId, userId) {
        try {
            // ------------------------------
            // MEMÓRIAS IMPORTANTES
            // ------------------------------
            const memories = await loadImportantMemories(userId).catch(() => []);

            const memoryBlock =
                memories.length > 0
                    ? memories
                        .map((m) => `• ${m.key.replace(/_/g, " ")}: ${m.value}`)
                        .join("\n")
                    : "Nenhuma memória registrada.";

            // ------------------------------
            // HISTÓRICO RECENTE
            // Carrega 50 mensagens para performance otimizada
            // ------------------------------
            const history = await loadRecentMessages(conversationId, 50).catch(() => []);

            const formattedHistory = history.map((h) => ({
                role: h.role,
                content: h.content
            }));

            // ------------------------------
            // SYSTEM INSTRUCTION COM PERSONALIDADE COMPLETA
            // ------------------------------
            const basePersonality = getInstructions('gpt4-mini');

            const systemInstruction = `${basePersonality}

MEMÓRIAS IMPORTANTES DO USUÁRIO:
${memoryBlock}
`.trim();

            // ------------------------------
            // MENSAGENS FINAIS
            // ------------------------------
            const messages = [
                {
                    role: "system",
                    content: systemInstruction
                },
                ...formattedHistory
            ];

            return {
                systemInstruction,
                memoryBlock,
                history: formattedHistory,
                messages
            };

        } catch (error) {
            console.error("❌ Erro getUnifiedContext:", error);

            return {
                systemInstruction: "Você é a LIA — modo seguro.",
                memoryBlock: "",
                history: [],
                messages: [
                    { role: "system", content: "Você é a LIA — modo seguro." }
                ]
            };
        }
    }
};

export default unifiedContext;
