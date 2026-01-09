// ======================================================================
// 🧪 TESTE AUTOMATIZADO - Funções da Lia
// ======================================================================

import fetch from "node-fetch";
import dotenv from "dotenv";
import { buscarNaWeb } from "./tools/search.js";

dotenv.config();

const BASE_URL = "http://localhost:5000";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ======================================================================
// 🔍 TESTE 1: Busca Web Direta
// ======================================================================
async function testBuscaWeb() {
    console.log("\n🧪 TESTE 1: Busca Web Direta");
    console.log("=".repeat(60));

    try {
        const resultado = await buscarNaWeb("cotação euro real hoje");
        console.log("✅ Busca funcionou!");
        console.log("📊 Resultado:", resultado.substring(0, 200) + "...");
        return true;
    } catch (err) {
        console.error("❌ Erro na busca:", err.message);
        return false;
    }
}

// ======================================================================
// 🤖 TESTE 2: Chat com Function Calling
// ======================================================================
async function testChatComFuncao() {
    console.log("\n🧪 TESTE 2: Chat com Function Calling");
    console.log("=".repeat(60));

    const webSearchTool = {
        type: "function",
        function: {
            name: "buscarNaWeb",
            description: "SEMPRE use esta função para buscar informações atualizadas e em tempo real na internet. Use para: cotações (dólar, euro, bitcoin), notícias, clima, placares de jogos, horários, eventos atuais, preços, dados que mudam frequentemente. OBRIGATÓRIO para qualquer informação que precise estar atualizada.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "A consulta de pesquisa. Seja específico e direto."
                    },
                },
                required: ["query"],
            },
        },
    };

    try {
        // Primeira chamada ao GPT
        console.log("📤 Enviando pergunta ao GPT...");
        let response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Você é a LIA. Você TEM acesso à internet através da função 'buscarNaWeb'. SEMPRE use essa função quando o usuário pedir informações atuais como cotações, clima, notícias, etc. NÃO diga que não tem acesso à internet - você TEM através da função buscarNaWeb. Use-a SEMPRE para dados em tempo real!"
                    },
                    {
                        role: "user",
                        content: "Qual a cotação do euro para o real hoje?"
                    }
                ],
                tools: [webSearchTool],
                tool_choice: "auto"
            }),
        });

        let data = await response.json();
        let message = data.choices?.[0]?.message;

        console.log("📥 Resposta do GPT recebida");
        console.log("🔧 Tool calls:", message.tool_calls ? "SIM" : "NÃO");

        if (message.tool_calls) {
            console.log("✅ GPT decidiu usar a função buscarNaWeb!");
            console.log("📋 Argumentos:", message.tool_calls[0].function.arguments);

            // Executar a função
            const args = JSON.parse(message.tool_calls[0].function.arguments);
            const resultado = await buscarNaWeb(args.query);

            console.log("✅ Busca executada com sucesso!");
            console.log("📊 Resultado:", resultado.substring(0, 200) + "...");

            // Segunda chamada com o resultado
            console.log("\n📤 Enviando resultado de volta ao GPT...");
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "Você é a LIA. Você TEM acesso à internet através da função 'buscarNaWeb'."
                        },
                        {
                            role: "user",
                            content: "Qual a cotação do euro para o real hoje?"
                        },
                        message,
                        {
                            tool_call_id: message.tool_calls[0].id,
                            role: "tool",
                            name: "buscarNaWeb",
                            content: resultado,
                        }
                    ],
                }),
            });

            data = await response.json();
            const finalMessage = data.choices?.[0]?.message;

            console.log("✅ Resposta final do GPT:");
            console.log("💬", finalMessage.content);

            return true;
        } else {
            console.log("❌ GPT NÃO usou a função buscarNaWeb!");
            console.log("💬 Resposta:", message.content);
            return false;
        }

    } catch (err) {
        console.error("❌ Erro no teste:", err.message);
        return false;
    }
}

// ======================================================================
// 🚀 EXECUTAR TODOS OS TESTES
// ======================================================================
async function runAllTests() {
    console.log("\n" + "=".repeat(60));
    console.log("🧪 INICIANDO TESTES AUTOMATIZADOS DA LIA");
    console.log("=".repeat(60));

    const results = {
        buscaWeb: await testBuscaWeb(),
        chatComFuncao: await testChatComFuncao()
    };

    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO DOS TESTES");
    console.log("=".repeat(60));
    console.log(`Busca Web Direta: ${results.buscaWeb ? "✅ PASSOU" : "❌ FALHOU"}`);
    console.log(`Chat com Function: ${results.chatComFuncao ? "✅ PASSOU" : "❌ FALHOU"}`);
    console.log("=".repeat(60) + "\n");

    const allPassed = Object.values(results).every(r => r === true);

    if (allPassed) {
        console.log("🎉 TODOS OS TESTES PASSARAM!");
    } else {
        console.log("⚠️ ALGUNS TESTES FALHARAM - Verifique os logs acima");
    }

    process.exit(allPassed ? 0 : 1);
}

// Executar
runAllTests();
