import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router: Router = Router();

// Telegram Bot Webhook Handler
// This allows the LominousManagerBot to receive messages (/start, /myid, reports etc)
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
    try {
        const body = req.body;
        console.log('[Telegram Webhook] Received:', JSON.stringify(body, null, 2));

        if (!body.message) {
            res.status(200).send('OK');
            return;
        }

        const chatId = body.message.chat.id;
        const text = body.message.text;

        if (text === '/myid') {
            // Reply pointing out their CHAT ID
            await sendTelegramMessage(chatId, `Seu Chat ID é: *${chatId}*\n\nCopie este número e cole no painel do LIA E-Manager para vincular sua conta.`);
            res.status(200).send('OK');
            return;
        }

        if (text === '/start') {
            await sendTelegramMessage(chatId, `Olá! Sou a LIA E-Manager 🧠\n\nEstou aqui para gerenciar os bastidores do seu negócio. Para me vincular ao seu painel, digite /myid e eu te informarei o seu código de acesso.`);
            res.status(200).send('OK');
            return;
        }

        const { data: linkData, error: linkError } = await supabase
            .from('user_integrations')
            .select('user_id')
            .eq('provider', 'telegram_manager')
            .eq('status', 'active')
            .contains('config', { telegram_chat_id: String(chatId) })
            .single();

        if (linkData?.user_id) {
            console.log(`[Telegram Webhook] Received message from known manager: ${linkData.user_id}`);

            // Forward the message to the LIA cognitive engine (lia-chat Edge Function)
            try {
                // Using internal route to unified memory and chat logic
                const port = process.env.PORT || 3000;
                const localApiUrl = `http://127.0.0.1:${port}/api/chat`;
                const conversationId = `telegram_admin_${linkData.user_id}`;

                const liaResponse = await fetch(localApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: text,
                        conversationId: conversationId,
                        userId: linkData.user_id, // Identifica o admin dono
                        tenantId: linkData.user_id, // Admins operam no próprio tenant
                        liaMode: 'DIAGNOSTIC',    // Permite uso de todos os super-comandos
                        admin_diagnostic_mode: true
                    })
                });

                if (liaResponse.ok) {
                    const liaData = await liaResponse.json() as any;
                    const replyText = liaData.reply || liaData.response || 'Não consegui processar sua solicitação no momento.';
                    await sendTelegramMessage(chatId, replyText);
                } else {
                    console.error('[Telegram->LIA Error]', await liaResponse.text());
                    await sendTelegramMessage(chatId, `⚠️ Erro ao comunicar com a LIA Engine.`);
                }
            } catch (err) {
                console.error('[Telegram->LIA Exception]', err);
                await sendTelegramMessage(chatId, `⚠️ Falha interna ao processar pelo E-Manager.`);
            }

        } else {
            await sendTelegramMessage(chatId, `Desculpe, este chat não está vinculado a nenhuma conta administrativa LIA. Digite /myid para vincular.`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('[Telegram Webhook Error]:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper function to send telegram messages outward
export async function sendTelegramMessage(chatId: number | string, text: string) {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
        console.error('[sendTelegramMessage] Missing TELEGRAM_BOT_TOKEN');
        return;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error('[sendTelegramMessage] HTTP Error:', response.status, await response.text());
        }

    } catch (error) {
        console.error('[sendTelegramMessage] Exception:', error);
    }
}

export default router;
