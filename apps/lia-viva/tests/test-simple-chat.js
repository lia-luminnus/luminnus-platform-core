import dotenv from 'dotenv';
dotenv.config();

async function testSimpleChat() {
    console.log("🧪 Testando chat simples...\n");

    const messages = [
        {
            role: "system",
            content: "Você é a LIA, assistente amigável."
        },
        {
            role: "user",
            content: "oi"
        }
    ];

    console.log("📤 Enviando requisição...");
    console.log("Mensagens:", JSON.stringify(messages, null, 2));

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages
            }),
        });

        console.log("\n📥 Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Erro:", errorText);
            return;
        }

        const data = await response.json();
        console.log("\n✅ Resposta completa:");
        console.log(JSON.stringify(data, null, 2));

        const message = data.choices?.[0]?.message;
        console.log("\n💬 Mensagem:");
        console.log("  Role:", message?.role);
        console.log("  Content:", message?.content);

    } catch (err) {
        console.error("❌ Erro:", err);
    }
}

testSimpleChat();
