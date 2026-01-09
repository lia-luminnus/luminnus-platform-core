
import { handleFunctionCall } from './assistants/function-handlers.js';

async function testAlias() {
    console.log("🧪 Testando alias 'buscarNaWeb'...");

    const args = { query: "valor do euro hoje" };

    try {
        const result = await handleFunctionCall('buscarNaWeb', args);
        console.log("✅ Resultado:", result);
    } catch (error) {
        console.error("❌ Erro:", error);
    }
}

testAlias();
