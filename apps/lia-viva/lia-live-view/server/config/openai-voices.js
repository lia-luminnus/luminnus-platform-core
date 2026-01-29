// ======================================================================
// 🎙️ OPENAI VOICES - Configuração das 3 Vozes Oficiais da LIA
// ======================================================================
// ✅ ATUALIZADO: Usa apenas OpenAI TTS e Realtime API
// ✅ Removido: Cartesia completamente
// ======================================================================

// ======================================================================
// 🎭 Mapeamento: Personalidades LIA → Vozes OpenAI
// ======================================================================

export const LIA_VOICE_STYLES = {
    // 🎙️ LIA Clara - Suave, acolhedora, natural
    clara: {
        name: "LIA-Clara",
        openaiVoice: "nova",  // ✅ Voz OpenAI: suave e clara
        description: "Calma, acolhedora, suave. Ideal para explicações e suporte.",
        personality: "Atenciosa, carinhosa, gentil, passa confiança",
        useCase: "Explicações, rotinas administrativas, suporte emocional"
    },

    // 🎙️ LIA Viva - Animada, simpática, motivacional
    viva: {
        name: "LIA-Viva",
        openaiVoice: "shimmer",  // ✅ Voz OpenAI: alegre e expressiva
        description: "Alegre, simpática, espontânea. Ideal para conversas diárias.",
        personality: "Energia leve, humor suave, amiga que te incentiva",
        useCase: "Conversas diárias, motivação, interações rápidas"
    },

    // 🎙️ LIA Firme - Profissional, objetiva, clara
    firme: {
        name: "LIA-Firme",
        openaiVoice: "onyx",  // ✅ Voz OpenAI: profissional e firme
        description: "Firme, objetiva, profissional. Ideal para comandos diretos.",
        personality: "Segura, confiante, sem perder cordialidade",
        useCase: "Comandos diretos, automações, feedbacks rápidos"
    }
};

// Personalidade padrão
export const DEFAULT_VOICE_STYLE = "viva";

// ======================================================================
// 🎯 Obter Voz OpenAI por Personalidade
// ======================================================================

/**
 * Retorna a voz OpenAI correspondente à personalidade LIA
 * @param {string} personality - "clara", "viva", ou "firme"
 * @returns {string} Nome da voz OpenAI ("nova", "alloy", ou "onyx")
 */
export function getOpenAIVoice(personality = DEFAULT_VOICE_STYLE) {
    const style = LIA_VOICE_STYLES[personality] || LIA_VOICE_STYLES[DEFAULT_VOICE_STYLE];
    return style.openaiVoice;
}

// ======================================================================
// 🎯 Seleção Automática de Personalidade por Contexto
// ======================================================================

/**
 * Seleciona automaticamente a personalidade baseada no tipo de mensagem
 * @param {string} messageType - Tipo da mensagem
 * @returns {string} Nome da personalidade ("clara", "viva", ou "firme")
 */
export function selectVoiceByContext(messageType) {
    switch (messageType) {
        case "explanation":
        case "support":
        case "help":
        case "tutorial":
            return "clara"; // Calma e acolhedora

        case "greeting":
        case "chat":
        case "motivation":
        case "conversation":
            return "viva"; // Alegre e simpática (padrão)

        case "command":
        case "automation":
        case "quick-response":
        case "confirmation":
            return "firme"; // Firme e objetiva

        default:
            return DEFAULT_VOICE_STYLE;
    }
}

// ======================================================================
// 📊 Informações do Sistema
// ======================================================================

export function getVoiceInfo(profile = DEFAULT_VOICE_STYLE) {
    const style = LIA_VOICE_STYLES[profile] || LIA_VOICE_STYLES[DEFAULT_VOICE_STYLE];
    return {
        profile,
        name: style.name,
        openaiVoice: style.openaiVoice,
        description: style.description,
        personality: style.personality,
        useCase: style.useCase
    };
}

export default {
    LIA_VOICE_STYLES,
    DEFAULT_VOICE_STYLE,
    getOpenAIVoice,
    selectVoiceByContext,
    getVoiceInfo
};
