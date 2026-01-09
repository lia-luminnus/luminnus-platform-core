// ======================================================================
// 📌 LIA MEMORY ENGINE – Memória Permanente com Supabase + Embeddings
// ======================================================================

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// ----------------------------------------------------------------------
// 📝 LOG FILE
// ----------------------------------------------------------------------
const LOG_FILE = path.join(process.cwd(), "logs", "memory-debug.log");
if (!fs.existsSync(path.dirname(LOG_FILE))) {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

function logToFile(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
    console.log(message); // Also log to console
}

// ----------------------------------------------------------------------
// 🔑 SUPABASE
// ----------------------------------------------------------------------
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ----------------------------------------------------------------------
// 🔑 OPENAI
// ----------------------------------------------------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----------------------------------------------------------------------
// 🧠 Regras da Memória
// ----------------------------------------------------------------------
//
// LIA só grava memórias quando:
// 1) São informações estáveis (nome, empresa, preferências, projetos etc.)
// 2) São úteis no futuro
// 3) Não são temporárias ("estou com fome", "estou no carro", etc.)
// ----------------------------------------------------------------------

const MEMORY_PROMPT = `
Você é responsável por identificar informações importantes que devem ser salvas
como memórias permanentes.

Extraia *apenas* memórias úteis para conversas futuras, como:

- Nome da pessoa
- Nome da empresa
- Preferências
- Objetivos
- Projetos em andamento
- Dados que serão úteis depois

NÃO salve:
- Emoções momentâneas
- Situações temporárias
- Reclamações incidentais
- Frases soltas sem valor futuro

Retorne em formato JSON:
{
  "should_write_memory": boolean,
  "memory_to_write": string
}
`;

// ----------------------------------------------------------------------
// 🧠 Função: Extrair memória da fala do usuário
// ----------------------------------------------------------------------
async function extractMemory(text) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 200,
        messages: [
            { role: "system", content: MEMORY_PROMPT },
            { role: "user", content: text }
        ]
    });

    try {
        return JSON.parse(response.choices[0].message.content);
    } catch (err) {
        console.error("Erro ao interpretar memória:", err);
        return { should_write_memory: false };
    }
}

// ----------------------------------------------------------------------
// 🧠 Função: Classificar tipo de memória
// ----------------------------------------------------------------------
async function classifyMemoryType(memoryText) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 50,
        messages: [
            {
                role: "system",
                content: `Classifique a memória em UMA categoria: personal, family, preference, business, company, address, reminder, misc.
Responda APENAS com a categoria.`
            },
            { role: "user", content: memoryText }
        ]
    });

    const type = response.choices[0].message.content.trim().toLowerCase();
    const validTypes = ['personal', 'family', 'preference', 'business', 'company', 'address', 'reminder', 'misc'];

    return validTypes.includes(type) ? type : 'misc';
}

// ----------------------------------------------------------------------
// 🧠 Função: Salvar memória no Supabase
// ----------------------------------------------------------------------
async function saveMemory(userId, memoryText, memoryType = 'misc', rawInput = '') {
    return supabase.from("memories").insert({
        user_id: userId,
        type: memoryType,
        content: memoryText,
        raw_input: rawInput,
        importance: 1
    });
}

// ----------------------------------------------------------------------
// 🧠 Função: Retornar memórias existentes
// ----------------------------------------------------------------------
async function loadMemories(userId) {
    const { data } = await supabase
        .from("memories")
        .select("type, content, importance")
        .eq("user_id", userId)
        .order("importance", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(50);

    return data?.map(m => `[${m.type}] ${m.content}`) || [];
}

// ----------------------------------------------------------------------
// 🧠 Função principal usada pelo realtime.js
// ----------------------------------------------------------------------
export async function runChatWithMemory(conversationId, text, history = []) {
    const userId = "00000000-0000-0000-0000-000000000001"; // DEV FIXO

    try {
        logToFile("🧠 === INICIANDO CHAT COM MEMÓRIA ===");
        logToFile(`   ConversationID: ${conversationId}`);
        logToFile(`   UserID: ${userId}`);
        logToFile(`   Texto: ${text}`);

        // 1) Carregar memórias permanentes
        logToFile("📚 Carregando memórias...");
        const memories = await loadMemories(userId);
        logToFile(`   ${memories.length} memórias carregadas`);
        if (memories.length > 0) {
            memories.forEach((m, i) => logToFile(`     ${i + 1}. ${m}`));
        }

        // 2) Extrair possível memória do texto novo
        logToFile("🔍 Detectando informações importantes...");
        const extracted = await extractMemory(text);
        logToFile(`   Resultado detecção: ${JSON.stringify(extracted)}`);

        if (extracted.should_write_memory) {
            logToFile(`🧠 Nova memória: ${extracted.memory_to_write}`);

            // Classificar tipo de memória
            const memoryType = await classifyMemoryType(extracted.memory_to_write);
            logToFile(`   Tipo: ${memoryType}`);

            const saveResult = await saveMemory(userId, extracted.memory_to_write, memoryType, text);
            logToFile(`   Salvo no Supabase: ${JSON.stringify(saveResult)}`);
        }

        // 3) Criar contexto para resposta
        const contextBlock = memories.length
            ? `Memórias relevantes do usuário:\n- ${memories.join("\n- ")}`
            : "Sem memórias permanentes registradas.";

        logToFile("🤖 Chamando GPT com contexto e ferramentas...");

        // 🔥 ADICIONAR FERRAMENTAS DE BUSCA
        const tools = [
            {
                type: "function",
                function: {
                    name: "buscarNaWeb",
                    description: "Busca informações atualizadas na web usando Google Custom Search. Use SEMPRE para: cotações de moedas/crypto, clima/tempo, notícias recentes, informações em tempo real, eventos atuais, ou qualquer dado que mude frequentemente.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "Termo de busca em português. Exemplo: 'cotação euro real hoje' ou 'clima em Lisboa'"
                            }
                        },
                        required: ["query"]
                    }
                }
            }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 400,
            messages: [
                {
                    role: "system",
                    content:
                        "Você é a LIA da Luminnus. Seja natural, humana, direta e profissional. SEMPRE use a ferramenta buscarNaWeb quando o usuário perguntar sobre informações atualizadas, cotações, notícias, clima, ou qualquer dado em tempo real."
                },
                {
                    role: "system",
                    content: contextBlock
                },
                ...history,
                { role: "user", content: text }
            ],
            tools: tools,
            tool_choice: "auto"
        });

        const message = response.choices[0].message;

        // 🔥 PROCESSAR TOOL CALLS
        if (message.tool_calls && message.tool_calls.length > 0) {
            logToFile(`🔧 Tool call detectado: ${message.tool_calls[0].function.name}`);

            const toolCall = message.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            logToFile(`   Argumentos: ${JSON.stringify(functionArgs)}`);

            // Executar a função
            let functionResult = "";
            if (functionName === "buscarNaWeb") {
                // Importar dinamicamente para evitar problemas circulares
                const { buscarNaWeb } = await import("../tools/search.js");
                functionResult = await buscarNaWeb(functionArgs.query);
                logToFile(`   Resultado busca: ${functionResult.substring(0, 100)}...`);
            }

            // Chamar GPT novamente com o resultado da função
            logToFile("🔄 Chamando GPT com resultado da ferramenta...");
            const secondResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                max_tokens: 400,
                messages: [
                    {
                        role: "system",
                        content: "Você é a LIA da Luminnus. Seja natural, humana, direta e profissional."
                    },
                    {
                        role: "system",
                        content: contextBlock
                    },
                    ...history,
                    { role: "user", content: text },
                    message, // Mensagem original com tool_call
                    {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: functionResult
                    }
                ]
            });

            const finalText = secondResponse.choices[0].message.content;
            logToFile(`✅ Resposta final gerada: ${finalText.substring(0, 50)}...`);
            return finalText;
        }

        // Sem tool calls, retornar resposta direta
        const responseText = message.content;
        logToFile(`✅ Resposta gerada: ${responseText.substring(0, 50)}...`);

        return responseText;

    } catch (error) {
        logToFile("❌ ERRO CRÍTICO em runChatWithMemory:");
        logToFile(`   Mensagem: ${error.message}`);
        logToFile(`   Stack: ${error.stack}`);
        return "Desculpe, ocorreu um erro ao processar sua mensagem.";
    }
}
