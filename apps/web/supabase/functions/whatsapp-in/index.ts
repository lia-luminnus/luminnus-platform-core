import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SUPABASE EDGE FUNCTION: whatsapp-in
 *
 * Endpoint mock para receber mensagens do WhatsApp
 * Este endpoint será integrado futuramente com a API do WhatsApp Business
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { phone_number, message_content } = body;

    if (!phone_number || !message_content) {
      return new Response(JSON.stringify({
        error: 'phone_number e message_content são obrigatórios'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Recebendo mensagem do WhatsApp:', {
      user_id: user.id,
      phone_number,
      message_content
    });

    // Salvar mensagem recebida no banco de dados
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: user.id,
        direction: 'inbound',
        phone_number,
        message_content,
        status: 'delivered',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar mensagem:', saveError);
      return new Response(JSON.stringify({ error: 'Erro ao salvar mensagem' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Simular processamento da mensagem (futuro: chamar IA para responder)
    // Por enquanto, apenas confirmar recebimento
    return new Response(JSON.stringify({
      success: true,
      message: 'Mensagem recebida com sucesso',
      data: {
        id: savedMessage.id,
        phone_number: savedMessage.phone_number,
        message_content: savedMessage.message_content,
        received_at: savedMessage.created_at,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
