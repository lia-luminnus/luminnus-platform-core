// Helper para identificar tipo de modelo
import { ASSISTANT_ID } from "../config/assistants-config.js";

export function getModelType(assistantId) {
    // ✅ CORRIGIDO: Agora temos apenas um assistant (GPT-4o-mini)
    // Retorna sempre 'gpt4-mini' pois é o único modelo
    return 'gpt4-mini';
}

// Função auxiliar para validar se é o assistant correto
export function isValidAssistant(assistantId) {
    return assistantId === ASSISTANT_ID;
}