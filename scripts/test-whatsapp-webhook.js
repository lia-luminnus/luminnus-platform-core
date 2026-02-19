const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testWhatsAppWebhook() {
    const webhookUrl = 'http://localhost:10000/api/whatsapp/webhook';

    // Simular mensagem de um usuário externo para a LIA MASTER
    // Nota: Precisamos do AccountSid da LIA MASTER para o roteamento funcionar
    const payload = new URLSearchParams();
    payload.append('SmsSid', 'SM' + Math.random().toString(36).substr(2, 10));
    payload.append('Body', 'Olá LIA, você está funcionando agora?');
    payload.append('From', 'whatsapp:+5511999999999'); // Usuário de teste
    payload.append('To', 'whatsapp:+551139560936');   // Número da LIA MASTER
    payload.append('AccountSid', 'AC_TEST_LIA_MASTER');
    payload.append('MessageSid', 'MM' + Math.random().toString(36).substr(2, 10));

    console.log('🚀 Enviando simulação de webhook...');

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Twilio-Signature': 'simulated_signature' // Nosso webhook pula validação se em dev ou com flag específica
            },
            body: payload.toString()
        });

        const result = await response.text();
        console.log('✅ Resposta do Webhook:', response.status);
        console.log('📄 Conteúdo:', result);
    } catch (error) {
        console.error('❌ Erro no teste:', error);
    }
}

testWhatsAppWebhook();
