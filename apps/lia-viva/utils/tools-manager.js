// ======================================================================
// 🔧 GERENCIADOR DE TOOLS DO ASSISTANT
// ======================================================================

import { OpenAI } from "openai";
import dotenv from "dotenv";
import { ASSISTANT_ID } from "../config/assistants-config.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

let cachedTools = null;
let cachedToolsFunctions = null;

/**
 * Busca todas as tools/functions do assistant do OpenAI
 * e converte para formato compatível com GPT-4
 */
export async function getAssistantTools() {
    // Cache para evitar buscar toda vez
    if (cachedTools) {
        return cachedTools;
    }

    try {
        console.log("📦 Buscando tools do assistant...");
        const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);

        if (!assistant.tools || assistant.tools.length === 0) {
            console.warn("⚠️ Assistant não tem tools configuradas");
            return [];
        }

        // Filtrar apenas functions (não file_search, code_interpreter, etc)
        const functions = assistant.tools
            .filter(tool => tool.type === 'function')
            .map(tool => ({
                type: 'function',
                function: tool.function
            }));

        cachedTools = functions;
        console.log(`✅ ${functions.length} functions carregadas do assistant`);

        return functions;

    } catch (error) {
        console.error("❌ Erro ao buscar tools do assistant:", error.message);
        return [];
    }
}

/**
 * Busca apenas as definições das functions (sem "type": "function")
 * Útil para mapear nome → função executável
 */
export async function getAssistantFunctionDefinitions() {
    if (cachedToolsFunctions) {
        return cachedToolsFunctions;
    }

    const tools = await getAssistantTools();
    const functionsMap = {};

    tools.forEach(tool => {
        if (tool.function && tool.function.name) {
            functionsMap[tool.function.name] = tool.function;
        }
    });

    cachedToolsFunctions = functionsMap;
    return functionsMap;
}

/**
 * Limpa o cache de tools (útil se o assistant for atualizado)
 */
export function clearToolsCache() {
    cachedTools = null;
    cachedToolsFunctions = null;
    console.log("🔄 Cache de tools limpo");
}

/**
 * Adiciona a tool de busca web customizada que temos
 * (pois pode não estar no assistant ou ter descrição diferente)
 */
export function getWebSearchTool() {
    return {
        type: "function",
        function: {
            name: "buscarNaWeb",
            description: `OBRIGATÓRIO usar quando o usuário perguntar sobre:
- Cotações: "cotação", "quanto está", "valor do", "preço do" (dólar, euro, bitcoin, etc)
- Clima: "tempo", "clima", "temperatura"
- Notícias: "notícias", "últimas", "aconteceu"
- Horários: "que horas", "horário"
- Dados atuais: "hoje", "agora", "atual"

NUNCA invente. SEMPRE busque. Não peça permissão.`,
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Consulta. Seja específico: 'cotação euro real', 'clima Aveiro'"
                    },
                },
                required: ["query"],
            },
        },
    };
}

/**
 * Retorna TODAS as tools disponíveis (assistant + customs)
 */
export async function getAllAvailableTools() {
    const assistantTools = await getAssistantTools();
    const webSearchTool = getWebSearchTool();

    // Verificar se buscarNaWeb já está no assistant
    const hasWebSearch = assistantTools.some(
        tool => tool.function?.name === "buscarNaWeb"
    );

    if (hasWebSearch) {
        return assistantTools;
    } else {
        return [webSearchTool, ...assistantTools];
    }
}
