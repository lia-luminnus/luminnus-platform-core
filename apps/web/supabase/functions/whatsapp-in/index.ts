import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SUPABASE EDGE FUNCTION: whatsapp-in
 *
 * Endpoint Receptor Webhook da EVOLUTION API.
 * Recebe mensagens via WhatsApp Baileys (MESSAGES_UPSERT) e grava no banco LIA.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Used Service Role because webhooks are unauthenticated by users
    );

    const body = await req.json();

    // Evolution API Webhook Structure for MESSAGES_UPSERT
    // body.event === 'messages.upsert'
    // body.data.message -> contains the actual message

    if (body.event === 'messages.upsert' || body.event === 'MESSAGES_UPSERT') {
      const messageData = body.data?.message || body.data;
      const instanceName = body.instance;

      // Se for mensagem enviada por nós mesmos (ou pelo app no celular do cliente), ignoramos se não quisermos eco.
      if (messageData.key?.fromMe) {
        return new Response(JSON.stringify({ status: 'ignored_from_me' }), { headers: corsHeaders });
      }

      const remoteJid = messageData.key?.remoteJid; // Ex: 551199999999@s.whatsapp.net
      if (remoteJid?.includes('@g.us')) {
        return new Response(JSON.stringify({ status: 'ignored_group_message' }), { headers: corsHeaders });
      }

      const senderPhone = remoteJid?.split('@')[0];

      // Extracting message content from Baileys object
      let messageText = '';
      const msgType = Object.keys(messageData.message || {})[0];

      if (msgType === 'conversation') {
        messageText = messageData.message.conversation;
      } else if (msgType === 'extendedTextMessage') {
        messageText = messageData.message.extendedTextMessage.text;
      } else if (msgType === 'audioMessage') {
        // Handle audio logic here if needed (Evolution provides base64 via a separate API call or embedded)
        messageText = "[Áudio Recebido]";
      } else {
        messageText = `[Mídia/Tipo não suportado ainda: ${msgType}]`;
      }

      console.log(`[Webhook Evolution] Mensagem de ${senderPhone} na instância ${instanceName}: ${messageText}`);

      // 1. Descobrir de qual Tenant é essa instância
      // Lembra que o instanceName criamos como `lia_${tenantId}` ou salvamos em config_json
      const { data: connData, error: connError } = await supabase
        .from('whatsapp_connections')
        .select('tenant_id, id')
        .eq('provider', 'evolution')
        .contains('config_json', { instanceName })
        .single();

      if (connError || !connData) {
        console.error(`Instância não encontrada no banco LIA: ${instanceName}`);
        return new Response(JSON.stringify({ error: 'Tenant não encontrado para esta instância' }), { status: 404, headers: corsHeaders });
      }

      // 2. Salvar mensagem recebida no banco de dados da LIA
      const { data: savedMessage, error: saveError } = await supabase
        .from('whatsapp_messages')
        .insert({
          user_id: connData.tenant_id, // Atrelando a mensagem ao Workspace/Tenant da LIA
          direction: 'inbound',
          phone_number: senderPhone,
          message_content: messageText,
          status: 'delivered',
        })
        .select()
        .single();

      if (saveError) {
        console.error('Erro ao salvar mensagem no DB:', saveError);
        return new Response(JSON.stringify({ error: 'Erro ao gravar msg' }), { status: 500, headers: corsHeaders });
      }

      // 3. TODO: Disparar requisição interna ou Edge Function `process-message` ou `engine` para a LIA responder.

      return new Response(JSON.stringify({ success: true, saved_id: savedMessage.id }), { headers: corsHeaders });
    }

    // Retorno genérico para eventos que não são MESSAGES_UPSERT (ex: CONNECTION_UPDATE)
    return new Response(JSON.stringify({ status: 'event_ignored', event: body.event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error on webhook:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
